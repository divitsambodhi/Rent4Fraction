from __future__ import annotations

import random
from decimal import Decimal

import pytest

from app.core.money import rupees_to_paise
from app.services.pricing import (
    CartLineInput,
    CouponInput,
    calculate_item_commission,
    calculate_order_payout_from_items,
    coupon_discount,
    delivery_fee,
    group_by_period,
    line_total,
    quote,
    rental_days,
    resolve_commission,
    tax,
)

# Mock coupons matching client/src/lib/config/pricing-placeholders.ts
MOCK_COUPONS = {
    "WELCOME100": CouponInput(
        code="WELCOME100",
        type="flat",
        value=Decimal("100"),
        min_order_amount=Decimal("1000"),
        used_count=42,
        is_active=True,
        description="Flat ₹100 off on orders of ₹1,000 or more",
    ),
    "SAVE10": CouponInput(
        code="SAVE10",
        type="percent",
        value=Decimal("10"),
        min_order_amount=Decimal("2000"),
        used_count=18,
        is_active=True,
        description="10% off on orders of ₹2,000 or more",
    ),
    "EXPIRED5": CouponInput(
        code="EXPIRED5",
        type="flat",
        value=Decimal("500"),
        min_order_amount=Decimal("1000"),
        expires_at="2024-01-01T00:00:00.000Z",
        used_count=100,
        is_active=True,
        description="Expired discount coupon",
    ),
    "LIMITED1": CouponInput(
        code="LIMITED1",
        type="flat",
        value=Decimal("200"),
        min_order_amount=Decimal("500"),
        usage_limit=1,
        used_count=1,
        is_active=True,
        description="Limited single-use voucher",
    ),
}


@pytest.mark.unit
class TestPricingParityWithFrontend:
    """
    Direct 1:1 parity test suite mirroring client/src/lib/__tests__/pricing.test.ts
    """

    def test_rental_days_inclusive(self) -> None:
        assert rental_days("2026-11-12", "2026-11-14") == 3
        assert rental_days("2026-11-12", "2026-11-12") == 1
        assert rental_days("2026-11-01", "2026-11-07") == 7

    def test_rental_days_fallback_on_invalid(self) -> None:
        assert rental_days("", "") == 1
        assert rental_days("invalid", "dates") == 1

    def test_line_total_accurate(self) -> None:
        # 2 units * 2500/day * 3 days = 15000
        assert line_total(2500, 2, 3) == Decimal("15000.00")
        # 1 unit * 700/day * 2 days = 1400
        assert line_total(700, 1, 2) == Decimal("1400.00")

    def test_line_total_fractional_rounding_clean(self) -> None:
        # 7 units * 333.33 * 3 days = 6999.93
        total = line_total(Decimal("333.33"), 7, 3)
        assert total == Decimal("6999.93")

    def test_group_by_period(self) -> None:
        mock_lines = [
            CartLineInput(
                equipment_id="eq-1",
                name="Speaker",
                category="Speakers",
                vendor_id="v1",
                vendor_name="Sargam Sound Systems",
                price_per_day=Decimal("2500"),
                security_deposit=Decimal("5000"),
                quantity=2,
                start_date="2026-11-12",
                end_date="2026-11-14",
                days=3,
                delivery_available=True,
            ),
            CartLineInput(
                equipment_id="eq-2",
                name="Lights",
                category="Stage lights",
                vendor_id="v2",
                vendor_name="Lumina Lighting",
                price_per_day=Decimal("1800"),
                security_deposit=Decimal("3000"),
                quantity=1,
                start_date="2026-11-12",
                end_date="2026-11-14",
                days=3,
                delivery_available=True,
            ),
            CartLineInput(
                equipment_id="eq-3",
                name="Mic",
                category="Microphones",
                vendor_id="v1",
                vendor_name="Sargam Sound Systems",
                price_per_day=Decimal("800"),
                security_deposit=Decimal("1500"),
                quantity=1,
                start_date="2026-12-01",
                end_date="2026-12-02",
                days=2,
                delivery_available=False,
            ),
        ]

        periods = group_by_period(mock_lines)
        assert len(periods) == 2

        # First period: 2026-11-12_2026-11-14
        assert periods[0].period_key == "2026-11-12_2026-11-14"
        assert len(periods[0].lines) == 2
        assert len(periods[0].vendor_groups) == 2

        # Second period: 2026-12-01_2026-12-02
        assert periods[1].period_key == "2026-12-01_2026-12-02"
        assert len(periods[1].lines) == 1
        assert periods[1].vendor_groups[0].delivery_available is False

    def test_coupon_discount_welcome100(self) -> None:
        coupon = MOCK_COUPONS["WELCOME100"]
        discount, err = coupon_discount(coupon, Decimal("15000"))
        assert discount == Decimal("100.00")
        assert err is None

    def test_coupon_discount_below_minimum(self) -> None:
        coupon = MOCK_COUPONS["WELCOME100"]
        discount, err = coupon_discount(coupon, Decimal("850"))
        assert discount == Decimal("0.00")
        assert err == "Add ₹150 more to use this code."

    def test_coupon_discount_save10(self) -> None:
        coupon = MOCK_COUPONS["SAVE10"]
        discount, err = coupon_discount(coupon, Decimal("5000"))
        assert discount == Decimal("500.00")
        assert err is None

    def test_coupon_discount_expired(self) -> None:
        coupon = MOCK_COUPONS["EXPIRED5"]
        discount, err = coupon_discount(coupon, Decimal("5000"))
        assert discount == Decimal("0.00")
        assert err == "This code has expired."

    def test_coupon_discount_usage_limit_reached(self) -> None:
        coupon = MOCK_COUPONS["LIMITED1"]
        discount, err = coupon_discount(coupon, Decimal("1000"))
        assert discount == Decimal("0.00")
        assert err == "This code has reached its usage limit."

    def test_coupon_discount_none(self) -> None:
        discount, err = coupon_discount(None, Decimal("5000"))
        assert discount == Decimal("0.00")
        assert err is None

    def test_delivery_fee_breakdown(self) -> None:
        res_total, by_vendor = delivery_fee(
            {"v1": "delivery", "v2": "pickup", "v3": "delivery"},
            ["v1", "v2", "v3"],
        )
        assert res_total == Decimal("600.00")
        assert by_vendor == {
            "v1": Decimal("300.00"),
            "v2": Decimal("0.00"),
            "v3": Decimal("300.00"),
        }

    def test_tax_calculation(self) -> None:
        assert tax(Decimal("10000")) == Decimal("1800.00")
        # 1234.50 taxable subtotal -> round(1234.50 * 0.18) = 222.21
        assert tax(Decimal("1234.50")) == Decimal("222.21")

    def test_quote_exact_match(self) -> None:
        mock_lines = [
            CartLineInput(
                equipment_id="eq-1",
                name="Pro Line-Array Speaker Pair",
                category="Speakers",
                vendor_id="v1",
                vendor_name="Sargam Sound Systems",
                price_per_day=Decimal("2500"),
                security_deposit=Decimal("10000"),
                quantity=2,
                start_date="2026-11-12",
                end_date="2026-11-14",
                days=3,
                delivery_available=True,
            ),
            CartLineInput(
                equipment_id="eq-2",
                name="Moving Head Light (Pair)",
                category="Stage lights",
                vendor_id="v2",
                vendor_name="Lumina Lighting",
                price_per_day=Decimal("2800"),
                security_deposit=Decimal("7000"),
                quantity=1,
                start_date="2026-11-12",
                end_date="2026-11-14",
                days=3,
                delivery_available=True,
            ),
        ]

        q = quote(
            lines=mock_lines,
            coupon=MOCK_COUPONS["WELCOME100"],
            fulfilment_by_vendor={"v1": "delivery", "v2": "pickup"},
        )

        assert q.subtotal == Decimal("23400.00")
        assert q.discount == Decimal("100.00")
        assert q.tax == Decimal("4194.00")
        assert q.delivery_fee == Decimal("300.00")
        assert q.security_deposit == Decimal("27000.00")
        assert q.total == Decimal("54794.00")

        # Invariant: total = subtotal - discount + tax + delivery + deposit
        expected_total = (
            q.subtotal - q.discount + q.tax + q.delivery_fee + q.security_deposit
        )
        assert q.total == expected_total

    def test_resolve_commission_precedence(self) -> None:
        # Precedence 1: Equipment override
        rate1, src1 = resolve_commission(
            equipment_rate=Decimal("15.5"),
            category_rate=Decimal("12"),
            vendor_rate=Decimal("10"),
        )
        assert rate1 == Decimal("15.50")
        assert src1 == "Equipment"

        # Precedence 2: Category default
        rate2, src2 = resolve_commission(
            equipment_rate=None,
            category_rate=Decimal("12.25"),
            vendor_rate=Decimal("10"),
        )
        assert rate2 == Decimal("12.25")
        assert src2 == "Category"

        # Precedence 3: Vendor default
        rate3, src3 = resolve_commission(
            equipment_rate=None,
            category_rate=None,
            vendor_rate=Decimal("8.5"),
        )
        assert rate3 == Decimal("8.50")
        assert src3 == "Vendor"

        # Precedence 4: Platform fallback
        rate4, src4 = resolve_commission(None, None, None, None)
        assert rate4 == Decimal("10.00")
        assert src4 == "Platform"

    def test_resolve_commission_clamping_and_rounding(self) -> None:
        high, _ = resolve_commission(equipment_rate=Decimal("125.456"))
        assert high == Decimal("100.00")

        low, _ = resolve_commission(equipment_rate=Decimal("-5.2"))
        assert low == Decimal("0.00")

        precision, _ = resolve_commission(equipment_rate=Decimal("12.3456"))
        assert precision == Decimal("12.35")

    def test_calculate_item_commission_paise_safe(self) -> None:
        comm, net = calculate_item_commission(Decimal("15000"), Decimal("10"))
        assert comm == Decimal("1500.00")
        assert net == Decimal("13500.00")

        comm2, net2 = calculate_item_commission(Decimal("333.33"), Decimal("10"))
        assert comm2 == Decimal("33.33")
        assert net2 == Decimal("300.00")

    def test_calculate_order_payout_from_items(self) -> None:
        items = [
            {
                "item_id": "i1",
                "equipment_id": "eq1",
                "total_price": Decimal("15000"),
                "commission_rate": Decimal("15"),
                "commission_amount": Decimal("2250"),
            },
            {
                "item_id": "i2",
                "equipment_id": "eq2",
                "total_price": Decimal("3000"),
                "commission_rate": Decimal("8"),
                "commission_amount": Decimal("240"),
            },
        ]

        payout = calculate_order_payout_from_items(items)
        assert payout["gross"] == Decimal("18000.00")
        assert payout["commission"] == Decimal("2490.00")
        assert payout["net"] == Decimal("15510.00")
        assert payout["effective_rate"] == 13.83

    def test_50_randomized_carts_exact_equality(self) -> None:
        """
        Generates 50 randomized carts with awkward amounts and verifies mathematical invariant:
        total = subtotal - discount + tax + delivery + deposit exactly.
        """
        rng = random.Random(42)

        for _i in range(50):
            line_count = rng.randint(1, 5)
            lines: list[CartLineInput] = []

            for j in range(line_count):
                price = Decimal(str(rng.randint(100, 5000))) + Decimal(str(rng.choice([0, 0.25, 0.33, 0.5, 0.75, 0.99])))
                deposit = Decimal(str(rng.randint(500, 10000)))
                qty = rng.randint(1, 4)
                days = rng.randint(1, 5)

                lines.append(
                    CartLineInput(
                        equipment_id=f"eq_{j}",
                        name=f"Item {j}",
                        price_per_day=price,
                        security_deposit=deposit,
                        quantity=qty,
                        start_date="2026-11-12",
                        end_date="2026-11-16",
                        days=days,
                        vendor_id=f"v_{j % 3}",
                        vendor_name=f"Vendor {j % 3}",
                    )
                )

            coupon = MOCK_COUPONS["WELCOME100"] if rng.random() > 0.5 else None
            fulfilment = {
                "v_0": "delivery" if rng.random() > 0.5 else "pickup",
                "v_1": "delivery" if rng.random() > 0.5 else "pickup",
                "v_2": "pickup",
            }

            q = quote(lines, coupon=coupon, fulfilment_by_vendor=fulfilment)

            # Assert invariant in Decimal
            expected = q.subtotal - q.discount + q.tax + q.delivery_fee + q.security_deposit
            assert q.total == expected

            # Assert paise balance
            sub_p = rupees_to_paise(q.subtotal)
            disc_p = rupees_to_paise(q.discount)
            tax_p = rupees_to_paise(q.tax)
            del_p = rupees_to_paise(q.delivery_fee)
            dep_p = rupees_to_paise(q.security_deposit)
            tot_p = rupees_to_paise(q.total)
            assert tot_p == sub_p - disc_p + tax_p + del_p + dep_p
