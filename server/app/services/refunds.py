from __future__ import annotations

import logging
from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.errors import (
    NotFoundError,
    RefundExceedsCapturedError,
    RefundFailedError,
    ValidationFailedError,
)
from app.core.money import quantize_money
from app.core.time import utc_now
from app.integrations.razorpay import PaymentGateway, get_payment_gateway
from app.models.orders import Booking, VendorOrder
from app.models.payments import Payment, PaymentStatus, PaymentType
from app.models.platform import OrderEvent
from app.models.social import Notification

logger = logging.getLogger("rent4fraction.refunds")


def compute_cancellation_refund(
    booking: Booking,
    cancel_date: date | None = None,
) -> Decimal:
    """
    Computes refund amount for cancelling a paid booking:
    - Deposit is 100% refundable before equipment handover.
    - Rental fees schedule (days before start_date):
        >= 7 days: 100% rental refund + 100% delivery fee
        >= 3 days: 75% rental refund + 100% delivery fee
        >= 1 day:  50% rental refund + 100% delivery fee
        < 1 day:   0% rental refund + 0% delivery fee
    - Total refund capped at booking.total_amount.
    """
    if cancel_date is None:
        cancel_date = utc_now().date()

    days_until_start = (booking.start_date - cancel_date).days

    deposit = booking.security_deposit
    delivery = booking.delivery_fee
    rental_and_tax = booking.subtotal + booking.tax - booking.discount

    if days_until_start >= 7:
        rental_refund_rate = Decimal("1.00")
        delivery_refund = delivery
    elif days_until_start >= 3:
        rental_refund_rate = Decimal("0.75")
        delivery_refund = delivery
    elif days_until_start >= 1:
        rental_refund_rate = Decimal("0.50")
        delivery_refund = delivery
    else:
        rental_refund_rate = Decimal("0.00")
        delivery_refund = Decimal("0.00")

    rental_refund = quantize_money(rental_and_tax * rental_refund_rate)
    total_refund = quantize_money(deposit + delivery_refund + rental_refund)

    # Invariant: refund cannot exceed original total amount
    return min(total_refund, booking.total_amount)


def refund_payment(
    db: Session,
    booking_id: int,
    amount: Decimal,
    reason: str,
    gateway: PaymentGateway | None = None,
    vendor_order_id: int | None = None,
) -> Payment:
    """
    Executes a partial or full refund on a booking:
    - Validates refund cap (total refunds <= captured charges).
    - Calls Razorpay Refunds API via gateway interface.
    - Records refund Payment row linked to original charge.
    - Emits OrderEvent and customer notification.
    """
    if amount <= Decimal("0.00"):
        raise ValidationFailedError("Refund amount must be greater than zero.")

    amount = quantize_money(amount)
    from app.core.config import settings

    booking = db.query(Booking).filter(Booking.booking_id == booking_id).with_for_update().first()
    if not booking:
        raise NotFoundError("Booking", str(booking_id))

    if not settings.PAYMENTS_ONLINE_ENABLED:
        import uuid
        refund_payment_row = Payment(
            booking_id=booking_id,
            vendor_order_id=vendor_order_id,
            amount=amount,
            currency="INR",
            type=PaymentType.refund,
            status=PaymentStatus.success,
            transaction_id=f"cod_refund_{booking_id}_{uuid.uuid4().hex[:12]}",
            gateway_order_id=None,
            gateway_refund_id=None,
            method=PaymentMethod.cod,
            payment_date=utc_now(),
            captured_at=utc_now(),
        )
        db.add(refund_payment_row)
        db.flush()

        db.add(
            OrderEvent(
                booking_id=booking_id,
                actor_role="system",
                event_type="refund_issued",
                note=f"COD adjustment of ₹{amount} recorded ({reason})",
            )
        )
        db.add(
            Notification(
                user_id=booking.user_id,
                title="Deposit / Cash Settlement",
                message=f"Cash adjustment of ₹{amount} recorded for booking BK-{booking_id:04d} ({reason}).",
                type="refund_processed",
            )
        )
        return refund_payment_row

    if gateway is None:
        gateway = get_payment_gateway()

    # 1. Calculate already captured total
    successful_charges = (
        db.query(Payment)
        .filter(
            Payment.booking_id == booking_id,
            Payment.type.in_([PaymentType.full, PaymentType.advance, PaymentType.deposit]),
            Payment.status == PaymentStatus.success,
        )
        .all()
    )
    total_captured = sum((p.amount for p in successful_charges), Decimal("0.00"))

    # 2. Calculate already refunded total
    successful_refunds = (
        db.query(Payment)
        .filter(
            Payment.booking_id == booking_id,
            Payment.type == PaymentType.refund,
            Payment.status == PaymentStatus.success,
        )
        .all()
    )
    total_refunded = sum((r.amount for r in successful_refunds), Decimal("0.00"))

    if total_refunded + amount > total_captured:
        raise RefundExceedsCapturedError(
            f"Requested refund of ₹{amount} exceeds remaining refundable balance (₹{total_captured - total_refunded})."
        )

    # 3. Locate primary charge to refund against
    orig_payment = next((p for p in successful_charges if p.transaction_id), None)
    if not orig_payment or not orig_payment.transaction_id:
        raise RefundFailedError(
            "No captured gateway transaction found for this booking to refund against."
        )

    amount_paise = int((amount * 100).to_integral_value())

    # 4. Call gateway Refunds API
    refund_res = gateway.refund_payment(
        payment_id=orig_payment.transaction_id,
        amount_paise=amount_paise,
        notes={
            "booking_id": str(booking_id),
            "reason": reason,
            "vendor_order_id": str(vendor_order_id) if vendor_order_id else "",
        },
    )

    # 5. Record refund Payment row
    refund_tx_id = refund_res.get("id")
    refund_payment_row = Payment(
        booking_id=booking_id,
        vendor_order_id=vendor_order_id,
        amount=amount,
        currency="INR",
        type=PaymentType.refund,
        status=PaymentStatus.success,
        transaction_id=refund_tx_id,
        gateway_order_id=None,
        gateway_refund_id=refund_tx_id,
        refund_of_payment_id=orig_payment.payment_id,
        payment_date=utc_now(),
        captured_at=utc_now(),
    )
    db.add(refund_payment_row)
    db.flush()

    # 6. Record timeline event & notification
    db.add(
        OrderEvent(
            booking_id=booking_id,
            actor_role="system",
            event_type="refund_issued",
            note=f"Refund of ₹{amount} issued ({reason})",
        )
    )
    db.add(
        Notification(
            user_id=booking.user_id,
            title="Refund Initiated",
            message=f"A refund of ₹{amount} has been initiated for booking BK-{booking_id:04d} ({reason}).",
            type="refund_processed",
        )
    )

    return refund_payment_row


def refund_vendor_order_share(
    db: Session,
    vendor_order_id: int,
    reason: str,
    gateway: PaymentGateway | None = None,
) -> Payment:
    """
    Refunds a specific vendor order share (for cancellation/rejection by vendor).
    """
    vo = db.query(VendorOrder).filter(VendorOrder.vendor_order_id == vendor_order_id).first()
    if not vo:
        raise NotFoundError("VendorOrder", str(vendor_order_id))

    # Vendor order share = subtotal + delivery_fee
    vo_share = quantize_money(vo.subtotal + vo.delivery_fee)
    return refund_payment(
        db=db,
        booking_id=vo.booking_id,
        amount=vo_share,
        reason=f"Vendor order VO-{vendor_order_id:04d} cancelled: {reason}",
        gateway=gateway,
        vendor_order_id=vendor_order_id,
    )


def refund_deposit_for_vendor_order(
    db: Session,
    vendor_order_id: int,
    amount: Decimal,
    reason: str,
    gateway: PaymentGateway | None = None,
) -> Payment:
    """
    Refunds security deposit for a vendor order upon post-rental inspection.
    """
    vo = db.query(VendorOrder).filter(VendorOrder.vendor_order_id == vendor_order_id).first()
    if not vo:
        raise NotFoundError("VendorOrder", str(vendor_order_id))

    return refund_payment(
        db=db,
        booking_id=vo.booking_id,
        amount=amount,
        reason=f"Deposit release for VO-{vendor_order_id:04d}: {reason}",
        gateway=gateway,
        vendor_order_id=vendor_order_id,
    )
