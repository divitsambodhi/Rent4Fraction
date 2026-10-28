from __future__ import annotations

from collections.abc import Sequence
from typing import TYPE_CHECKING

from app.models.orders import BookingItemStatus, BookingStatus, VendorOrderStatus

if TYPE_CHECKING:
    from app.models.orders import VendorOrder


def derive_booking_status(vendor_orders: Sequence[VendorOrder | str]) -> BookingStatus:
    """
    Derive parent booking status from constituent vendor orders.
    Matches the frontend prototype contract in client/src/lib/lifecycle/derive-status.ts:

    Rules:
    1. All pending -> 'pending'
    2. Every order is rejected or cancelled -> 'cancelled'
    3. Every order is finished (completed, rejected, cancelled) with >= 1 completed -> 'completed'
    4. Any order is dispatched, delivered, or returned (and not all finished) -> 'in_progress'
    5. Any accepted and none dispatched or later -> 'confirmed'
    Fallback -> 'in_progress'
    """
    if not vendor_orders:
        return BookingStatus.pending

    statuses: list[str] = [
        vo.status.value if hasattr(vo, "status") and hasattr(vo.status, "value") else str(vo)
        for vo in vendor_orders
    ]

    # 1. All pending
    if all(s == "pending" for s in statuses):
        return BookingStatus.pending

    # 2. Every order is rejected or cancelled
    if all(s in ("rejected", "cancelled") for s in statuses):
        return BookingStatus.cancelled

    # 3. Every order is finished with >= 1 completed
    all_finished = all(s in ("completed", "rejected", "cancelled") for s in statuses)
    if all_finished and any(s == "completed" for s in statuses):
        return BookingStatus.completed

    # 4. Any order is dispatched, delivered, or returned
    if any(s in ("dispatched", "delivered", "returned") for s in statuses):
        return BookingStatus.in_progress

    # 5. Any accepted and none dispatched or later
    if any(s == "accepted" for s in statuses):
        return BookingStatus.confirmed

    return BookingStatus.in_progress


def map_item_status_for_order_status(order_status: VendorOrderStatus | str) -> BookingItemStatus | None:
    """
    Map vendor order transition status to constituent booking items status:
    - accepted -> confirmed
    - delivered -> delivered
    - returned -> returned
    - rejected -> cancelled
    - cancelled -> cancelled
    """
    val = order_status.value if hasattr(order_status, "value") else str(order_status)
    if val == "accepted":
        return BookingItemStatus.confirmed
    if val == "delivered":
        return BookingItemStatus.delivered
    if val == "returned":
        return BookingItemStatus.returned
    if val in ("rejected", "cancelled"):
        return BookingItemStatus.cancelled
    return None
