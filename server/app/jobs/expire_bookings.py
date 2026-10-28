from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.core.time import utc_now
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
from app.models.payments import Payment, PaymentStatus
from app.models.platform import OrderEvent
from app.models.social import Notification

logger = logging.getLogger("rent4fraction.jobs.expire_bookings")


def expire_unpaid_bookings(
    db: Session,
    equipment_ids: list[int] | None = None,
) -> int:
    """
    Finds pending unpaid bookings whose hold timer has expired (expires_at <= now):
    - Sets booking.status = 'cancelled', payment_status = 'failed'.
    - Cancels booking_items and vendor_orders.
    - Releases reserved coupons (decrements used_count).
    - Fails any pending payments.
    - Emits OrderEvent and customer notification.
    - If equipment_ids is provided, limits lazy check to bookings holding those items.
    """
    now = utc_now()
    query = db.query(Booking).filter(
        Booking.status == BookingStatus.pending,
        Booking.payment_status == BookingPaymentStatus.unpaid,
        Booking.expires_at <= now,
    )

    if equipment_ids:
        query = query.join(BookingItem, Booking.booking_id == BookingItem.booking_id).filter(
            BookingItem.equipment_id.in_(equipment_ids)
        )

    expired_bookings = query.with_for_update().distinct().all()
    if not expired_bookings:
        return 0

    count = 0
    for booking in expired_bookings:
        booking.status = BookingStatus.cancelled
        booking.payment_status = BookingPaymentStatus.unpaid

        # Cancel items
        items = db.query(BookingItem).filter(BookingItem.booking_id == booking.booking_id).all()
        for item in items:
            item.item_status = BookingItemStatus.cancelled

        # Cancel vendor orders
        vendor_orders = (
            db.query(VendorOrder).filter(VendorOrder.booking_id == booking.booking_id).all()
        )
        for vo in vendor_orders:
            vo.status = VendorOrderStatus.cancelled

        # Release coupon
        if booking.coupon_id:
            coupon = (
                db.query(Coupon)
                .filter(Coupon.coupon_id == booking.coupon_id)
                .with_for_update()
                .first()
            )
            if coupon and coupon.used_count > 0:
                coupon.used_count -= 1

        # Fail pending payment attempts
        pending_payments = (
            db.query(Payment)
            .filter(
                Payment.booking_id == booking.booking_id,
                Payment.status == PaymentStatus.pending,
            )
            .all()
        )
        for pay in pending_payments:
            pay.status = PaymentStatus.failed
            pay.failure_reason = "Booking hold expired unpaid"

        # Record timeline event & notification
        db.add(
            OrderEvent(
                booking_id=booking.booking_id,
                actor_role="system",
                event_type="hold_expired",
                note="Booking hold timer expired without payment; stock released.",
            )
        )
        db.add(
            Notification(
                user_id=booking.user_id,
                title="Hold Expired",
                message=f"Hold expired for booking BK-{booking.booking_id:04d}. Equipment returned to stock.",
                type="new_order",
            )
        )
        count += 1

    db.commit()
    logger.info("Expired %d unpaid bookings past hold timer.", count)
    return count
