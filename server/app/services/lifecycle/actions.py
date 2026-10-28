from __future__ import annotations

from collections.abc import Sequence
from typing import TYPE_CHECKING, Any

from app.core.errors import InvalidTransitionError
from app.services.lifecycle.types import LifecycleAction, LifecycleRole

if TYPE_CHECKING:
    from app.models.fulfilment import DamageReport
    from app.models.orders import BookingItem, VendorOrder


def allowed_actions(
    order: VendorOrder | Any,
    role: LifecycleRole,
    items: Sequence[BookingItem | Any] = (),
    damage_reports: Sequence[DamageReport | Any] = (),
) -> list[LifecycleAction]:
    """
    Returns the list of actions the caller role may perform on this vendor order.
    Matches the reference implementation in client/src/lib/lifecycle/allowed-actions.ts.
    """
    _ = items
    is_vendor_or_admin = role in ("vendor", "admin")
    is_customer_or_admin = role in ("customer", "admin")

    status_str = (
        order.status.value
        if hasattr(order, "status") and hasattr(order.status, "value")
        else str(getattr(order, "status", "pending"))
    )

    actions: list[LifecycleAction] = []

    if status_str == "pending":
        if is_vendor_or_admin:
            actions.extend(["accept", "decline"])
        if is_customer_or_admin:
            actions.append("cancel")

    elif status_str == "accepted":
        if is_vendor_or_admin:
            fulfilment_type = getattr(order, "fulfilment_type", "delivery")
            is_pickup = fulfilment_type == "pickup"

            delivery = getattr(order, "deliveries", None)
            delivery_status = getattr(delivery, "status", None)
            if delivery_status is not None and hasattr(delivery_status, "value"):
                delivery_status = delivery_status.value

            has_delivery_schedule = bool(
                delivery and (getattr(delivery, "scheduled_start", None) or delivery_status == "scheduled")
            )

            if is_pickup:
                if not has_delivery_schedule:
                    actions.append("schedule_pickup")
                else:
                    actions.append("mark_delivered")
            else:
                if not has_delivery_schedule:
                    actions.append("schedule_delivery")
                else:
                    actions.append("dispatch")

        if is_customer_or_admin:
            actions.append("cancel")

    elif status_str == "dispatched":
        if is_vendor_or_admin:
            actions.extend(["mark_delivered", "delivery_failed"])

    elif status_str == "delivered":
        if is_vendor_or_admin:
            ret = getattr(order, "returns", None)
            has_return_schedule = bool(
                ret and (getattr(ret, "scheduled_start", None) or getattr(ret, "scheduled_window", None))
            )
            if not has_return_schedule:
                actions.append("schedule_return")
            else:
                actions.append("mark_returned")

    elif status_str == "returned":
        if is_vendor_or_admin:
            ret = getattr(order, "returns", None)
            is_inspected = False
            if ret:
                # Inspected if items exist under return or inspected flag set
                return_items = getattr(ret, "items", None)
                if return_items is not None and len(return_items) > 0:
                    is_inspected = True

            if not is_inspected:
                actions.append("inspect")
            else:
                # Check for any open damage reports (reported or disputed)
                has_open_damage = False
                for dr in damage_reports:
                    st = dr.status.value if hasattr(dr.status, "value") else str(dr.status)
                    if st in ("reported", "disputed"):
                        has_open_damage = True
                        break

                if not has_open_damage:
                    actions.append("complete_order")

    return actions


def assert_action_allowed(
    order: VendorOrder | Any,
    role: LifecycleRole,
    action: LifecycleAction,
    items: Sequence[BookingItem | Any] = (),
    damage_reports: Sequence[DamageReport | Any] = (),
) -> None:
    """
    Validates that the requested action is permitted.
    If forbidden, raises 409 InvalidTransitionError with the list of allowed actions.
    """
    allowed = allowed_actions(order=order, role=role, items=items, damage_reports=damage_reports)
    if action not in allowed:
        order_id = getattr(order, "vendor_order_id", "unknown")
        status_val = (
            order.status.value
            if hasattr(order, "status") and hasattr(order.status, "value")
            else str(getattr(order, "status", "unknown"))
        )
        raise InvalidTransitionError(
            message=f"Action '{action}' is not allowed for vendor order {order_id} in status '{status_val}' for role '{role}'.",
            allowed_actions=[str(a) for a in allowed],
            details={
                "vendor_order_id": order_id,
                "current_status": status_val,
                "requested_action": action,
                "caller_role": role,
            },
        )
