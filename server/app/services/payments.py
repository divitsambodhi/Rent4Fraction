from __future__ import annotations

import logging
from datetime import UTC
from typing import Any

from sqlalchemy.orm import Session

from app.core.errors import (
    BookingExpiredError,
    ConflictError,
    InvalidSignatureError,
    NotFoundError,
    PaymentGatewayRejectedError,
)
from app.core.time import utc_now
from app.integrations.razorpay import PaymentGateway, get_payment_gateway
from app.models.accounts import User
from app.models.catalog import Equipment
from app.models.orders import (
    Booking,
    BookingItem,
    BookingItemStatus,
    BookingPaymentStatus,
    BookingStatus,
    Coupon,
    VendorOrder,
    VendorOrderStatus,
)
from app.models.payments import Payment, PaymentStatus, PaymentType
from app.models.platform import OrderEvent
from app.models.social import Notification
from app.repositories.catalog import get_equipment_available_quantity
from app.schemas.checkout import (
    PaymentStatusResponse,
    PaymentVerifyResponse,
    RazorpayOrderBlock,
    RazorpayPrefill,
)

logger = logging.getLogger("rent4fraction.payments")


def finalize_payment_success(
    db: Session,
    payment: Payment,
    gateway_pay: dict[str, Any],
    gateway: PaymentGateway | None = None,
) -> None:
    """
    Finalizes a successful payment:
    - Sets payment status = success, updates transaction details.
    - If booking is pending: confirms booking, books items, places vendor orders.
    - If booking was cancelled/expired (late payment race condition):
        - Re-checks stock availability.
        - If available: reinstates booking to confirmed, books items, places orders.
        - If unavailable: issues full automated refund immediately.
    """
    if gateway is None:
        gateway = get_payment_gateway()

    now = utc_now()
    payment.status = PaymentStatus.success
    payment.transaction_id = gateway_pay.get("id") or payment.transaction_id
    payment.gateway_payment_id = gateway_pay.get("id") or payment.gateway_payment_id
    payment.payment_method = gateway_pay.get("method") or payment.payment_method or "razorpay"
    payment.captured_at = now
    payment.payment_date = now

    booking = (
        db.query(Booking).filter(Booking.booking_id == payment.booking_id).with_for_update().first()
    )
    if not booking:
        logger.error(
            "Finalize payment: booking %s not found for payment %s",
            payment.booking_id,
            payment.payment_id,
        )
        return

    # Normal Happy Path: Booking is pending
    if booking.status == BookingStatus.pending:
        booking.status = BookingStatus.confirmed
        booking.payment_status = BookingPaymentStatus.paid

        # Transition items to confirmed
        items = db.query(BookingItem).filter(BookingItem.booking_id == booking.booking_id).all()
        for item in items:
            item.status = BookingItemStatus.confirmed

        # Vendor orders stay pending for vendor fulfillment acceptance
        vendor_orders = (
            db.query(VendorOrder).filter(VendorOrder.booking_id == booking.booking_id).all()
        )
        for vo in vendor_orders:
            vo.status = VendorOrderStatus.pending

            # Notify vendor
            if vo.vendor and vo.vendor.user_id:
                db.add(
                    Notification(
                        user_id=vo.vendor.user_id,
                        title="New Order Received",
                        message=f"New order VO-{vo.vendor_order_id:04d} placed for booking BK-{booking.booking_id:04d}.",
                        type="new_order",
                    )
                )

        # Notify customer
        db.add(
            Notification(
                user_id=booking.user_id,
                title="Booking Confirmed",
                message=f"Payment received! Your booking BK-{booking.booking_id:04d} is confirmed.",
                type="new_order",
            )
        )
        # Record OrderEvent
        db.add(
            OrderEvent(
                booking_id=booking.booking_id,
                actor_role="system",
                event_type="payment_success",
                note=f"Payment captured: ₹{payment.amount} via {payment.payment_method}",
            )
        )
        logger.info(
            "Booking %s confirmed upon successful payment %s",
            booking.booking_id,
            payment.payment_id,
        )

    # Late Payment Race Condition: Booking was expired or cancelled while user was completing payment
    elif booking.status in (BookingStatus.cancelled, BookingStatus.completed):
        logger.warning(
            "Late payment received for non-pending booking %s (status=%s). Re-verifying stock availability.",
            booking.booking_id,
            booking.status.value,
        )
        items = db.query(BookingItem).filter(BookingItem.booking_id == booking.booking_id).all()

        stock_available = True
        for item in items:
            eq = db.query(Equipment).filter(Equipment.equipment_id == item.equipment_id).first()
            if not eq:
                stock_available = False
                break
            avail = get_equipment_available_quantity(
                db=db,
                equipment_id=item.equipment_id,
                total_physical_quantity=eq.quantity,
                start_date=booking.start_date,
                end_date=booking.end_date,
            )
            if avail < item.quantity:
                stock_available = False
                break

        if stock_available:
            # Reinstate booking
            booking.status = BookingStatus.confirmed
            booking.payment_status = BookingPaymentStatus.paid

            for item in items:
                item.status = BookingItemStatus.confirmed

            vendor_orders = (
                db.query(VendorOrder).filter(VendorOrder.booking_id == booking.booking_id).all()
            )
            for vo in vendor_orders:
                vo.status = VendorOrderStatus.pending

            # Re-reserve coupon if applied
            if booking.coupon_id:
                coupon = (
                    db.query(Coupon)
                    .filter(Coupon.coupon_id == booking.coupon_id)
                    .with_for_update()
                    .first()
                )
                if coupon:
                    coupon.used_count += 1

            db.add(
                OrderEvent(
                    booking_id=booking.booking_id,
                    actor_role="system",
                    event_type="payment_success_reinstated",
                    note=f"Late payment captured (₹{payment.amount}); stock verified and booking reinstated to confirmed.",
                )
            )
            db.add(
                Notification(
                    user_id=booking.user_id,
                    title="Booking Confirmed & Reinstated",
                    message=f"Late payment received. Stock was verified and your booking BK-{booking.booking_id:04d} is confirmed.",
                    type="new_order",
                )
            )
            logger.info(
                "Booking %s successfully reinstated on late payment arrival", booking.booking_id
            )

        else:
            # Stock is exhausted -> Issue immediate automated refund
            logger.warning(
                "Stock exhausted for booking %s on late payment. Initiating full automated refund.",
                booking.booking_id,
            )
            amount_paise = int((payment.amount * 100).to_integral_value())
            refund_res = gateway.refund_payment(
                payment_id=payment.transaction_id or "",
                amount_paise=amount_paise,
                notes={
                    "booking_id": str(booking.booking_id),
                    "reason": "stock_exhausted_late_payment",
                },
            )

            refund_tx_id = refund_res.get("id")
            refund_row = Payment(
                booking_id=booking.booking_id,
                user_id=booking.user_id,
                amount=payment.amount,
                currency="INR",
                type=PaymentType.refund,
                status=PaymentStatus.success,
                transaction_id=refund_tx_id,
                gateway_order_id=None,
                gateway_payment_id=payment.transaction_id,
                gateway_refund_id=refund_tx_id,
                refund_of_id=payment.payment_id,
                payment_method=payment.payment_method,
                payment_date=now,
                captured_at=now,
            )
            db.add(refund_row)

            booking.payment_status = BookingPaymentStatus.refunded
            db.add(
                OrderEvent(
                    booking_id=booking.booking_id,
                    actor_role="system",
                    event_type="refund_late_payment_exhausted",
                    note=f"Late payment arrived after hold expired; stock unavailable. Full auto-refund issued: ₹{payment.amount}",
                )
            )
            db.add(
                Notification(
                    user_id=booking.user_id,
                    title="Inventory Unavailable - Full Refund Issued",
                    message=(
                        f"Your hold for booking BK-{booking.booking_id:04d} had expired and items are no longer available. "
                        f"A full refund of ₹{payment.amount} has been initiated to your original payment method."
                    ),
                    type="refund_processed",
                )
            )


class PaymentService:
    def __init__(self, db: Session, gateway: PaymentGateway | None = None) -> None:
        self.db = db
        self.gateway = gateway if gateway is not None else get_payment_gateway()

    def verify_payment(
        self,
        user_id: int,
        booking_id: int | None,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> PaymentVerifyResponse:
        """
        Customer client callback verification:
        1. Cryptographic HMAC-SHA256 signature check.
        2. Match payment record for order_id & booking_id.
        3. Booking ownership check (prevents IDOR).
        4. Gateway fetch to verify amount, currency, and captured state.
        5. Finalize payment success and confirm/reinstate booking.
        """
        # 1. Cryptographic signature check
        is_valid = self.gateway.verify_payment_signature(
            order_id=razorpay_order_id,
            payment_id=razorpay_payment_id,
            signature=razorpay_signature,
        )
        if not is_valid:
            raise InvalidSignatureError("Payment signature verification failed.")

        # 2. Payment record lookup
        pay_query = self.db.query(Payment).filter(Payment.gateway_order_id == razorpay_order_id)
        if booking_id is not None:
            pay_query = pay_query.filter(Payment.booking_id == booking_id)
        payment = pay_query.with_for_update().first()
        if not payment:
            raise NotFoundError("Payment", razorpay_order_id)

        actual_booking_id = payment.booking_id

        # 3. Ownership & booking lookup
        booking = (
            self.db.query(Booking)
            .filter(Booking.booking_id == actual_booking_id)
            .with_for_update()
            .first()
        )
        if not booking or booking.user_id != user_id:
            raise NotFoundError("Booking", str(actual_booking_id))

        # If already finalized successfully, return idempotent success
        if payment.status == PaymentStatus.success:
            return PaymentVerifyResponse(
                success=True,
                booking_id=actual_booking_id,
                booking_number=f"BK-{actual_booking_id:04d}",
                status=booking.status.value,
                payment_status=booking.payment_status.value,
                message="Payment already verified successfully",
                refunded=(booking.payment_status == BookingPaymentStatus.refunded),
            )

        # 4. Gateway fetch
        gateway_pay = self.gateway.fetch_payment(razorpay_payment_id)
        actual_paise = gateway_pay.get("amount", 0)
        actual_curr = gateway_pay.get("currency", "").upper()
        expected_paise = int((payment.amount * 100).to_integral_value())

        if actual_paise != expected_paise or actual_curr != payment.currency.upper():
            raise PaymentGatewayRejectedError(
                "Payment amount or currency mismatch with gateway record."
            )

        # Handle manual capture if payment is in authorized state
        if gateway_pay.get("status") == "authorized":
            gateway_pay = self.gateway.capture_payment(
                payment_id=razorpay_payment_id,
                amount_paise=expected_paise,
                currency="INR",
            )

        # 5. Finalize payment
        finalize_payment_success(self.db, payment, gateway_pay, gateway=self.gateway)
        self.db.commit()

        return PaymentVerifyResponse(
            success=True,
            booking_id=actual_booking_id,
            booking_number=f"BK-{actual_booking_id:04d}",
            status=booking.status.value,
            payment_status=booking.payment_status.value,
            message="Payment verified and booking confirmed",
            refunded=(booking.payment_status == BookingPaymentStatus.refunded),
        )

    def get_payment_status(self, user_id: int, booking_id: int) -> PaymentStatusResponse:
        """
        Poll endpoint for client payment status.
        """
        booking = self.db.query(Booking).filter(Booking.booking_id == booking_id).first()
        if not booking or booking.user_id != user_id:
            raise NotFoundError("Booking", str(booking_id))

        latest_payment = (
            self.db.query(Payment)
            .filter(Payment.booking_id == booking_id)
            .order_by(Payment.payment_id.desc())
            .first()
        )

        now = utc_now()
        remaining_seconds = 0
        if booking.expires_at:
            exp = booking.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=UTC)
            remaining_seconds = max(0, int((exp - now).total_seconds()))

        latest_attempt_dict = None
        if latest_payment:
            latest_attempt_dict = {
                "payment_id": str(latest_payment.payment_id),
                "status": latest_payment.status.value,
                "amount": float(latest_payment.amount),
                "gateway_order_id": latest_payment.gateway_order_id,
                "gateway_payment_id": latest_payment.gateway_payment_id
                or latest_payment.transaction_id,
                "failure_reason": latest_payment.failure_reason,
            }

        return PaymentStatusResponse(
            booking_id=booking_id,
            booking_number=f"BK-{booking.booking_id:04d}",
            booking_status=booking.status.value,
            payment_status=booking.payment_status.value,
            total_amount=float(booking.total_amount),
            remaining_hold_seconds=remaining_seconds,
            latest_attempt=latest_attempt_dict,
        )

    def retry_booking_payment(self, user_id: int, booking_id: int) -> RazorpayOrderBlock:
        """
        Creates a new payment attempt for an unpaid pending booking within its hold window.
        - Supersedes any earlier pending payment attempt.
        - Preserves existing hold window expiry.
        - Generates new Razorpay Order.
        """
        booking = (
            self.db.query(Booking)
            .filter(Booking.booking_id == booking_id)
            .with_for_update()
            .first()
        )
        if not booking or booking.user_id != user_id:
            raise NotFoundError("Booking", str(booking_id))

        if booking.payment_status == BookingPaymentStatus.paid:
            raise ConflictError("Booking is already paid.", code="booking_already_paid")

        # Check hold expiry
        now = utc_now()
        is_expired = False
        if booking.status == BookingStatus.cancelled:
            is_expired = True
        elif booking.expires_at:
            exp = booking.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=UTC)
            if exp <= now:
                is_expired = True

        if is_expired:
            raise BookingExpiredError("Booking hold has expired. Please create a new booking.")

        # Supersede earlier pending payment attempts
        earlier_payments = (
            self.db.query(Payment)
            .filter(
                Payment.booking_id == booking_id,
                Payment.status == PaymentStatus.pending,
            )
            .all()
        )
        for ep in earlier_payments:
            ep.status = PaymentStatus.failed
            ep.failure_reason = "Superseded by new retry attempt"

        # Create new gateway order
        amount_paise = int((booking.total_amount * 100).to_integral_value())
        receipt = f"bk_{booking_id}_retry_{int(now.timestamp())}"
        order_res = self.gateway.create_order(
            amount_paise=amount_paise,
            currency="INR",
            receipt=receipt,
            notes={"booking_id": str(booking_id), "is_retry": "true"},
        )

        # Create new Payment row
        new_payment = Payment(
            booking_id=booking.booking_id,
            user_id=user_id,
            amount=booking.total_amount,
            currency="INR",
            type=PaymentType.full,
            status=PaymentStatus.pending,
            gateway_order_id=order_res["id"],
        )
        self.db.add(new_payment)
        self.db.commit()

        user = self.db.query(User).filter(User.user_id == user_id).first()
        return RazorpayOrderBlock(
            key_id=getattr(self.gateway, "key_id", "rzp_test_placeholder"),
            order_id=order_res["id"],
            amount=amount_paise,
            currency="INR",
            name="Rent4Fraction",
            description=f"Rental Booking BK-{booking_id:04d}",
            prefill=RazorpayPrefill(
                name=user.name if user else "Customer",
                email=user.email if user else "",
                contact=(user.phone or "") if user else "",
            ),
            notes={"booking_id": str(booking_id), "is_retry": "true"},
        )
