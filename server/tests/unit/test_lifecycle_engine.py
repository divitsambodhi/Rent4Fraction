from __future__ import annotations

from decimal import Decimal
from typing import NamedTuple

import pytest

from app.core.errors import InvalidTransitionError
from app.models.fulfilment import DamageReportStatus
from app.models.orders import BookingItemStatus, BookingStatus, VendorOrderStatus
from app.services.allocation import VendorOrderShareInput, allocate_booking_totals
from app.services.lifecycle.actions import allowed_actions, assert_action_allowed
from app.services.lifecycle.settlement import (
    calculate_deposit_settlement,
    calculate_payout,
    evaluate_dispute_resolution,
)
from app.services.lifecycle.status import (
    derive_booking_status,
    map_item_status_for_order_status,
)
from app.services.lifecycle.types import LifecycleAction, LifecycleRole


class MockOrder(NamedTuple):
    vendor_order_id: int
    status: VendorOrderStatus
    fulfilment_type: str = "delivery"
    deliveries: object | None = None
    returns: object | None = None


class MockDelivery(NamedTuple):
    status: str
    scheduled_start: str | None = None


class MockReturn(NamedTuple):
    status: str
    scheduled_start: str | None = None
    items: list[object] = []


class MockItem(NamedTuple):
    total_price: Decimal
    commission_amount: Decimal
    deposit_amount: Decimal


class MockReport(NamedTuple):
    status: DamageReportStatus
    damage_cost: Decimal
    final_cost: Decimal | None
    deducted_from_deposit: int = 1


# =============================================================================
# 1. Booking Status Derivation Table Tests
# =============================================================================
@pytest.mark.unit
@pytest.mark.parametrize(
    ("statuses", "expected_booking_status"),
    [
        # Rule 1: All pending -> pending
        (["pending"], BookingStatus.pending),
        (["pending", "pending"], BookingStatus.pending),
        (["pending", "pending", "pending"], BookingStatus.pending),
        # Rule 5: Every order rejected or cancelled -> cancelled
        (["rejected"], BookingStatus.cancelled),
        (["cancelled"], BookingStatus.cancelled),
        (["rejected", "cancelled"], BookingStatus.cancelled),
        (["rejected", "rejected"], BookingStatus.cancelled),
        # Rule 4: Every order is finished (completed, rejected, cancelled) with >= 1 completed -> completed
        (["completed"], BookingStatus.completed),
        (["completed", "completed"], BookingStatus.completed),
        (["completed", "rejected"], BookingStatus.completed),
        (["completed", "cancelled"], BookingStatus.completed),
        (["completed", "rejected", "completed"], BookingStatus.completed),
        # Rule 3: Any order is dispatched, delivered, or returned (and not all finished) -> in_progress
        (["dispatched"], BookingStatus.in_progress),
        (["delivered"], BookingStatus.in_progress),
        (["returned"], BookingStatus.in_progress),
        (["accepted", "dispatched"], BookingStatus.in_progress),
        (["completed", "delivered"], BookingStatus.in_progress),
        (["pending", "dispatched"], BookingStatus.in_progress),
        (["returned", "pending"], BookingStatus.in_progress),
        # Rule 2: Any accepted and none dispatched or later -> confirmed
        (["accepted"], BookingStatus.confirmed),
        (["accepted", "accepted"], BookingStatus.confirmed),
        (["pending", "accepted"], BookingStatus.confirmed),
        (["accepted", "rejected"], BookingStatus.confirmed),
        (["accepted", "cancelled"], BookingStatus.confirmed),
        # Empty fallback
        ([], BookingStatus.pending),
    ],
)
def test_derive_booking_status_table(statuses: list[str], expected_booking_status: BookingStatus) -> None:
    orders = [MockOrder(vendor_order_id=i + 1, status=VendorOrderStatus(s)) for i, s in enumerate(statuses)]
    result = derive_booking_status(orders)
    assert result == expected_booking_status


# =============================================================================
# 2. Item Status Mapping Tests
# =============================================================================
@pytest.mark.unit
@pytest.mark.parametrize(
    ("order_status", "expected_item_status"),
    [
        ("accepted", BookingItemStatus.confirmed),
        ("delivered", BookingItemStatus.delivered),
        ("returned", BookingItemStatus.returned),
        ("rejected", BookingItemStatus.cancelled),
        ("cancelled", BookingItemStatus.cancelled),
        ("pending", None),
        ("dispatched", None),
        ("completed", None),
    ],
)
def test_map_item_status(order_status: str, expected_item_status: BookingItemStatus | None) -> None:
    assert map_item_status_for_order_status(order_status) == expected_item_status


# =============================================================================
# 3. Allowed Actions State & Role Table Tests
# =============================================================================
@pytest.mark.unit
@pytest.mark.parametrize(
    ("status", "fulfilment", "has_delivery_sched", "has_return_sched", "inspected", "has_open_damage", "role", "expected_actions"),
    [
        # Pending state
        ("pending", "delivery", False, False, False, False, "vendor", ["accept", "decline"]),
        ("pending", "delivery", False, False, False, False, "admin", ["accept", "decline", "cancel"]),
        ("pending", "delivery", False, False, False, False, "customer", ["cancel"]),
        # Accepted - delivery un-scheduled
        ("accepted", "delivery", False, False, False, False, "vendor", ["schedule_delivery"]),
        ("accepted", "delivery", False, False, False, False, "customer", ["cancel"]),
        ("accepted", "delivery", False, False, False, False, "admin", ["schedule_delivery", "cancel"]),
        # Accepted - delivery scheduled
        ("accepted", "delivery", True, False, False, False, "vendor", ["dispatch"]),
        # Accepted - pickup un-scheduled
        ("accepted", "pickup", False, False, False, False, "vendor", ["schedule_pickup"]),
        # Accepted - pickup scheduled
        ("accepted", "pickup", True, False, False, False, "vendor", ["mark_delivered"]),
        # Dispatched
        ("dispatched", "delivery", True, False, False, False, "vendor", ["mark_delivered", "delivery_failed"]),
        ("dispatched", "delivery", True, False, False, False, "customer", []),
        # Delivered - return un-scheduled
        ("delivered", "delivery", True, False, False, False, "vendor", ["schedule_return"]),
        # Delivered - return scheduled
        ("delivered", "delivery", True, True, False, False, "vendor", ["mark_returned"]),
        # Returned - un-inspected
        ("returned", "delivery", True, True, False, False, "vendor", ["inspect"]),
        # Returned - inspected, with open damage
        ("returned", "delivery", True, True, True, True, "vendor", []),
        # Returned - inspected, NO open damage
        ("returned", "delivery", True, True, True, False, "vendor", ["complete_order"]),
        # Terminal states
        ("completed", "delivery", True, True, True, False, "vendor", []),
        ("rejected", "delivery", False, False, False, False, "vendor", []),
        ("cancelled", "delivery", False, False, False, False, "vendor", []),
    ],
)
def test_allowed_actions_matrix(
    status: str,
    fulfilment: str,
    has_delivery_sched: bool,
    has_return_sched: bool,
    inspected: bool,
    has_open_damage: bool,
    role: LifecycleRole,
    expected_actions: list[LifecycleAction],
) -> None:
    deliv = MockDelivery(status="scheduled", scheduled_start="2026-11-01 10:00") if has_delivery_sched else None
    ret = MockReturn(
        status="returned",
        scheduled_start="2026-11-05 14:00" if has_return_sched else None,
        items=[object()] if inspected else [],
    )

    reports: list[MockReport] = []
    if has_open_damage:
        reports.append(MockReport(status=DamageReportStatus.reported, damage_cost=Decimal("500.00"), final_cost=None))

    order = MockOrder(
        vendor_order_id=101,
        status=VendorOrderStatus(status),
        fulfilment_type=fulfilment,
        deliveries=deliv,
        returns=ret,
    )

    actions = allowed_actions(order=order, role=role, items=[], damage_reports=reports)
    assert set(actions) == set(expected_actions)


@pytest.mark.unit
def test_assert_action_allowed_raises_409() -> None:
    order = MockOrder(vendor_order_id=1, status=VendorOrderStatus.delivered)
    with pytest.raises(InvalidTransitionError) as exc_info:
        assert_action_allowed(order=order, role="vendor", action="accept")

    err = exc_info.value
    assert err.code == "invalid_transition"
    assert err.status_code == 409
    assert "allowed_actions" in err.details


# =============================================================================
# 4. Payout Math with Awkward Rounding & Different Rates
# =============================================================================
@pytest.mark.unit
def test_payout_math_with_different_rates() -> None:
    # Item 1: gross 2499.00, rate 10% -> commission 249.90
    # Item 2: gross 1333.33, rate 15% -> commission 200.00
    # Item 3: gross 777.77, rate 7.5% -> commission 58.33
    items = [
        MockItem(total_price=Decimal("2499.00"), commission_amount=Decimal("249.90"), deposit_amount=Decimal("1000.00")),
        MockItem(total_price=Decimal("1333.33"), commission_amount=Decimal("200.00"), deposit_amount=Decimal("500.00")),
        MockItem(total_price=Decimal("777.77"), commission_amount=Decimal("58.33"), deposit_amount=Decimal("250.00")),
    ]
    gross = Decimal("4610.10")  # sum of items

    payout = calculate_payout(gross=gross, items=items)

    assert payout.gross == Decimal("4610.10")
    assert payout.commission == Decimal("508.23")
    assert payout.net == Decimal("4101.87")
    # Invariant: gross - commission == net
    assert payout.gross - payout.commission == payout.net


# =============================================================================
# 5. Deposit Settlement Math
# =============================================================================
@pytest.mark.unit
def test_deposit_settlement_no_damage() -> None:
    items = [
        MockItem(total_price=Decimal("1000.00"), commission_amount=Decimal("100.00"), deposit_amount=Decimal("2000.00")),
        MockItem(total_price=Decimal("1000.00"), commission_amount=Decimal("100.00"), deposit_amount=Decimal("3000.00")),
    ]
    res = calculate_deposit_settlement(items=items, damage_reports=[])
    assert res.deposit_share == Decimal("5000.00")
    assert res.total_deductions == Decimal("0.00")
    assert res.refund_amount == Decimal("5000.00")
    assert res.excess_deductions == Decimal("0.00")


@pytest.mark.unit
def test_deposit_settlement_partial_damage() -> None:
    items = [
        MockItem(total_price=Decimal("1000.00"), commission_amount=Decimal("100.00"), deposit_amount=Decimal("5000.00")),
    ]
    reports = [
        MockReport(status=DamageReportStatus.resolved, damage_cost=Decimal("2000.00"), final_cost=Decimal("1500.00")),
    ]
    res = calculate_deposit_settlement(items=items, damage_reports=reports)
    assert res.deposit_share == Decimal("5000.00")
    assert res.total_deductions == Decimal("1500.00")
    assert res.refund_amount == Decimal("3500.00")
    assert res.excess_deductions == Decimal("0.00")


@pytest.mark.unit
def test_deposit_settlement_excess_damage() -> None:
    items = [
        MockItem(total_price=Decimal("1000.00"), commission_amount=Decimal("100.00"), deposit_amount=Decimal("2000.00")),
    ]
    reports = [
        MockReport(status=DamageReportStatus.resolved, damage_cost=Decimal("3500.00"), final_cost=Decimal("3500.00")),
    ]
    res = calculate_deposit_settlement(items=items, damage_reports=reports)
    assert res.deposit_share == Decimal("2000.00")
    assert res.total_deductions == Decimal("2000.00")  # clamped at deposit share
    assert res.refund_amount == Decimal("0.00")
    assert res.excess_deductions == Decimal("1500.00")  # recorded excess


# =============================================================================
# 6. Dispute Resolution Evaluation Table
# =============================================================================
@pytest.mark.unit
@pytest.mark.parametrize(
    ("claim", "deposit_share", "outcome", "proposed", "expected_valid", "expected_final"),
    [
        # Reject
        (Decimal("1000.00"), Decimal("2000.00"), "reject", None, True, Decimal("0.00")),
        # Full within deposit
        (Decimal("1000.00"), Decimal("2000.00"), "full", None, True, Decimal("1000.00")),
        # Full exceeding deposit
        (Decimal("2500.00"), Decimal("2000.00"), "full", None, False, Decimal("2500.00")),
        # Partial valid
        (Decimal("1000.00"), Decimal("2000.00"), "partial", Decimal("600.00"), True, Decimal("600.00")),
        # Partial proposed >= claim (invalid)
        (Decimal("1000.00"), Decimal("2000.00"), "partial", Decimal("1000.00"), False, Decimal("1000.00")),
        # Partial proposed <= 0 (invalid)
        (Decimal("1000.00"), Decimal("2000.00"), "partial", Decimal("0.00"), False, Decimal("0.00")),
        # Partial proposed exceeding deposit share (invalid)
        (Decimal("3000.00"), Decimal("1000.00"), "partial", Decimal("1500.00"), False, Decimal("1500.00")),
    ],
)
def test_evaluate_dispute_resolution(
    claim: Decimal,
    deposit_share: Decimal,
    outcome: str,
    proposed: Decimal | None,
    expected_valid: bool,
    expected_final: Decimal,
) -> None:
    res = evaluate_dispute_resolution(
        claim_amount=claim,
        deposit_share=deposit_share,
        outcome=outcome,
        proposed_amount=proposed,
    )
    assert res.is_valid == expected_valid
    assert res.final_amount == expected_final


# =============================================================================
# 7. Refund Amounts for Rejected Orders in Multi-Vendor Booking with Coupons
# =============================================================================
@pytest.mark.unit
def test_refund_vendor_order_share_with_coupon() -> None:
    # Booking: 2 vendors
    # Vendor 1: rent 4000.00, delivery 300.00, deposit 1000.00
    # Vendor 2: rent 6000.00, delivery 0.00, deposit 2000.00
    # Total rent: 10000.00
    # Coupon discount: 1000.00 (10%)
    # Tax: 18% on (10000 - 1000 = 9000) -> 1620.00
    v1 = VendorOrderShareInput(
        vendor_order_id=1,
        rent_subtotal=Decimal("4000.00"),
        delivery_fee=Decimal("300.00"),
        deposit=Decimal("1000.00"),
    )
    v2 = VendorOrderShareInput(
        vendor_order_id=2,
        rent_subtotal=Decimal("6000.00"),
        delivery_fee=Decimal("0.00"),
        deposit=Decimal("2000.00"),
    )

    allocation = allocate_booking_totals(
        orders=[v1, v2],
        booking_discount=Decimal("1000.00"),
        booking_tax=Decimal("1620.00"),
    )

    # Invariants
    assert allocation.total_rent == Decimal("10000.00")
    assert allocation.total_discount == Decimal("1000.00")
    assert allocation.total_tax == Decimal("1620.00")
    assert allocation.total_delivery == Decimal("300.00")
    assert allocation.total_deposit == Decimal("3000.00")
    assert allocation.grand_total == Decimal("13920.00")

    # Order 1 share:
    # Rent: 4000
    # Discount: 400
    # Taxable: 3600 -> Tax: 648
    # Delivery: 300
    # Deposit: 1000
    # Total share: 4000 - 400 + 648 + 300 + 1000 = 5548.00
    o1 = next(o for o in allocation.orders if o.vendor_order_id == 1)
    assert o1.rent == Decimal("4000.00")
    assert o1.discount == Decimal("400.00")
    assert o1.tax == Decimal("648.00")
    assert o1.delivery_fee == Decimal("300.00")
    assert o1.deposit == Decimal("1000.00")
    assert o1.total == Decimal("5548.00")

    # Order 2 share:
    # Rent: 6000
    # Discount: 600
    # Taxable: 5400 -> Tax: 972
    # Delivery: 0
    # Deposit: 2000
    # Total share: 6000 - 600 + 972 + 0 + 2000 = 8372.00
    o2 = next(o for o in allocation.orders if o.vendor_order_id == 2)
    assert o2.total == Decimal("8372.00")

    # Grand total matches sum of shares
    assert o1.total + o2.total == allocation.grand_total
