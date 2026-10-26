from decimal import Decimal

import pytest

from app.core.money import (
    calculate_item_commission,
    calculate_line_item_total,
    paise_to_decimal,
    resolve_commission_rate,
    rupees_to_paise,
)


@pytest.mark.unit
def test_rupees_to_paise_conversions() -> None:
    assert rupees_to_paise(Decimal("10.50")) == 1050
    assert rupees_to_paise(Decimal("0.01")) == 1
    assert rupees_to_paise(Decimal("0.00")) == 0
    # Awkward fractional paise with ROUND_HALF_UP
    assert rupees_to_paise(Decimal("10.555")) == 1056
    assert rupees_to_paise("199.99") == 19999
    assert rupees_to_paise(150) == 15000


@pytest.mark.unit
def test_paise_to_decimal() -> None:
    assert paise_to_decimal(1050) == Decimal("10.50")
    assert paise_to_decimal(1) == Decimal("0.01")
    assert paise_to_decimal(0) == Decimal("0.00")
    assert paise_to_decimal(19999) == Decimal("199.99")


@pytest.mark.unit
def test_calculate_line_item_total() -> None:
    # 250.00 per day, 3 items, 4 days = 3000.00
    assert calculate_line_item_total(Decimal("250.00"), 3, 4) == Decimal("3000.00")

    # Awkward fractional rate
    assert calculate_line_item_total(Decimal("199.33"), 2, 3) == Decimal("1195.98")


@pytest.mark.unit
def test_calculate_item_commission_and_net() -> None:
    # 1000 total with 10% commission: 100 commission, 900 net
    comm, net = calculate_item_commission(Decimal("1000.00"), Decimal("10.00"))
    assert comm == Decimal("100.00")
    assert net == Decimal("900.00")
    assert comm + net == Decimal("1000.00")

    # Awkward amounts with rounding
    # 123.45 with 15% commission:
    # total paise = 12345
    # comm paise = 12345 * 0.15 = 1851.75 -> 1852 paise = 18.52
    # net paise = 12345 - 1852 = 10493 paise = 104.93
    comm, net = calculate_item_commission(Decimal("123.45"), Decimal("15.00"))
    assert comm == Decimal("18.52")
    assert net == Decimal("104.93")
    assert comm + net == Decimal("123.45")


@pytest.mark.unit
def test_resolve_commission_precedence() -> None:
    # Precedence 1: Equipment override
    rate, source = resolve_commission_rate(
        equipment_rate=Decimal("12.00"),
        category_rate=Decimal("15.00"),
        vendor_rate=Decimal("18.00"),
    )
    assert rate == Decimal("12.00")
    assert source == "Equipment"

    # Precedence 2: Category default
    rate, source = resolve_commission_rate(
        equipment_rate=None,
        category_rate=Decimal("15.00"),
        vendor_rate=Decimal("18.00"),
    )
    assert rate == Decimal("15.00")
    assert source == "Category"

    # Precedence 3: Vendor default
    rate, source = resolve_commission_rate(
        equipment_rate=None,
        category_rate=None,
        vendor_rate=Decimal("18.00"),
    )
    assert rate == Decimal("18.00")
    assert source == "Vendor"

    # Precedence 4: Platform fallback
    rate, source = resolve_commission_rate()
    assert rate == Decimal("10.00")
    assert source == "Platform"
