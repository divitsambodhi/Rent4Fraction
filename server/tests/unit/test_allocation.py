from __future__ import annotations

from decimal import Decimal

import pytest

from app.services.allocation import (
    VendorOrderShareInput,
    allocate_booking_totals,
    allocate_largest_remainder,
)


@pytest.mark.unit
def test_allocate_largest_remainder_basic() -> None:
    # 100 paise split between weights 30, 30, 40 -> exactly 30, 30, 40
    res = allocate_largest_remainder(100, [30, 30, 40])
    assert res == [30, 30, 40]
    assert sum(res) == 100

    # 100 paise split between 3 equal weights of 33.33...
    # Hare-Niemeyer distributes 34, 33, 33 (or equivalent)
    res3 = allocate_largest_remainder(100, [1, 1, 1])
    assert res3 == [34, 33, 33]
    assert sum(res3) == 100


@pytest.mark.unit
def test_allocate_booking_totals_split_integrity() -> None:
    orders = [
        VendorOrderShareInput(
            vendor_order_id=1,
            rent_subtotal=Decimal("6000.00"),
            delivery_fee=Decimal("400.00"),
            deposit=Decimal("2000.00"),
        ),
        VendorOrderShareInput(
            vendor_order_id=2,
            rent_subtotal=Decimal("4000.00"),
            delivery_fee=Decimal("0.00"),
            deposit=Decimal("1500.00"),
        ),
    ]
    # Coupon discount = 1500, Tax = 1530
    booking_discount = Decimal("1500.00")
    booking_tax = Decimal("1530.00")

    result = allocate_booking_totals(
        orders, booking_discount=booking_discount, booking_tax=booking_tax
    )

    assert result.total_rent == Decimal("10000.00")
    assert result.total_discount == Decimal("1500.00")
    assert result.total_tax == Decimal("1530.00")
    assert result.total_delivery == Decimal("400.00")
    assert result.total_deposit == Decimal("3500.00")
    assert result.grand_total == Decimal("10000.00") - Decimal("1500.00") + Decimal(
        "1530.00"
    ) + Decimal("400.00") + Decimal("3500.00")

    # Order 1 (60% weight): discount = 900.00, taxable = 5100, tax = 918.00
    vo1 = result.orders[0]
    assert vo1.vendor_order_id == 1
    assert vo1.discount == Decimal("900.00")
    assert vo1.tax == Decimal("918.00")
    assert vo1.total == Decimal("6000.00") - Decimal("900.00") + Decimal("918.00") + Decimal(
        "400.00"
    ) + Decimal("2000.00")

    # Order 2 (40% weight): discount = 600.00, taxable = 3400, tax = 612.00
    vo2 = result.orders[1]
    assert vo2.vendor_order_id == 2
    assert vo2.discount == Decimal("600.00")
    assert vo2.tax == Decimal("612.00")
    assert vo2.total == Decimal("4000.00") - Decimal("600.00") + Decimal("612.00") + Decimal(
        "0.00"
    ) + Decimal("1500.00")

    # Invariant: sum of individual order totals equals grand_total
    assert sum(o.total for o in result.orders) == result.grand_total


@pytest.mark.unit
def test_allocate_single_order() -> None:
    orders = [
        VendorOrderShareInput(
            vendor_order_id=1,
            rent_subtotal=Decimal("5000.00"),
            delivery_fee=Decimal("300.00"),
            deposit=Decimal("1000.00"),
        )
    ]
    result = allocate_booking_totals(
        orders, booking_discount=Decimal("500.00"), booking_tax=Decimal("810.00")
    )
    assert len(result.orders) == 1
    vo = result.orders[0]
    assert vo.discount == Decimal("500.00")
    assert vo.tax == Decimal("810.00")
    assert vo.total == result.grand_total
