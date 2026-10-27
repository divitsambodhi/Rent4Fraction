from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

from app.core.money import (
    DEFAULT_PLATFORM_COMMISSION_RATE,
    paise_to_decimal,
    quantize_money,
    rupees_to_paise,
    to_decimal,
)

# Standard mock constants mirroring client/src/lib/config/pricing-placeholders.ts
MOCK_TAX_RATE_PERCENT = Decimal("18.00")
MOCK_DELIVERY_FEE_PER_VENDOR = Decimal("300.00")
MOCK_PICKUP_FEE = Decimal("0.00")


@dataclass
class CartLineInput:
    equipment_id: int | str
    name: str
    price_per_day: Decimal | float | int | str
    security_deposit: Decimal | float | int | str
    quantity: int
    start_date: date | str
    end_date: date | str
    vendor_id: int | str
    vendor_name: str = ""
    category: str = ""
    delivery_available: bool = True
    days: int | None = None
    primary_image_url: str = ""
    commission_rate: Decimal | float | None = None
    commission_amount: Decimal | float | None = None

    def __post_init__(self) -> None:
        self.price_per_day = to_decimal(self.price_per_day)
        self.security_deposit = to_decimal(self.security_deposit)
        if isinstance(self.start_date, date):
            self.start_date = self.start_date.isoformat()
        if isinstance(self.end_date, date):
            self.end_date = self.end_date.isoformat()
        if self.days is None:
            self.days = rental_days(self.start_date, self.end_date)
        if self.commission_rate is not None:
            self.commission_rate = to_decimal(self.commission_rate)
        if self.commission_amount is not None:
            self.commission_amount = to_decimal(self.commission_amount)


@dataclass
class CartVendorGroup:
    vendor_id: str
    vendor_name: str
    lines: list[CartLineInput]
    subtotal: Decimal
    deposit_total: Decimal
    delivery_available: bool


@dataclass
class CartPeriod:
    period_key: str
    start_date: str
    end_date: str
    days: int
    lines: list[CartLineInput]
    vendor_groups: list[CartVendorGroup]


@dataclass
class CouponInput:
    code: str
    type: str  # 'percent' | 'flat'
    value: Decimal | float | int | str
    min_order_amount: Decimal | float | int | str = Decimal("0.00")
    used_count: int = 0
    usage_limit: int | None = None
    is_active: bool = True
    valid_from: datetime | None = None
    valid_to: datetime | None = None
    expires_at: datetime | str | None = None
    description: str | None = None

    def __post_init__(self) -> None:
        self.value = to_decimal(self.value)
        self.min_order_amount = to_decimal(self.min_order_amount)
        if isinstance(self.expires_at, str):
            try:
                # normalize ISO string
                clean_str = self.expires_at.replace("Z", "+00:00")
                self.expires_at = datetime.fromisoformat(clean_str)
            except Exception:
                pass


@dataclass
class QuoteResult:
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    delivery_fee: Decimal
    security_deposit: Decimal
    total: Decimal
    applied_coupon: CouponInput | None = None
    vendor_subtotals: dict[str, Decimal] = field(default_factory=dict)
    vendor_delivery_fees: dict[str, Decimal] = field(default_factory=dict)
    coupon_error: str | None = None


# -----------------------------------------------------------------------------
# Pure Financial & Pricing Engine Functions
# -----------------------------------------------------------------------------

def rental_days(start: str | date, end: str | date) -> int:
    """
    Calculates inclusive rental days from start and end dates (YYYY-MM-DD or date objects).
    e.g. '2026-11-12' to '2026-11-14' = 3 days.
    Returns minimum 1 day.
    """
    if not start or not end:
        return 1

    try:
        s_date = date.fromisoformat(start) if isinstance(start, str) else start
        e_date = date.fromisoformat(end) if isinstance(end, str) else end

        diff_days = (e_date - s_date).days
        return max(1, diff_days + 1)
    except Exception:
        return 1


def line_total(
    price_per_day: Decimal | float | int | str,
    quantity: int = 1,
    days: int = 1,
) -> Decimal:
    """
    Calculates the total cost for a single line item using integer paise arithmetic.
    price_per_day * quantity * days rounded half-up.
    """
    p_paise = rupees_to_paise(price_per_day)
    total_paise = p_paise * quantity * days
    return paise_to_decimal(total_paise)


def group_by_period(lines: list[CartLineInput]) -> list[CartPeriod]:
    """
    Groups cart lines by their unique rental period dates.
    Database invariant: 1 booking = 1 date range.
    """
    if not lines:
        return []

    period_map: dict[str, list[CartLineInput]] = {}
    for line in lines:
        key = f"{line.start_date}_{line.end_date}"
        period_map.setdefault(key, []).append(line)

    periods: list[CartPeriod] = []
    for key, p_lines in period_map.items():
        s_date = str(p_lines[0].start_date)
        e_date = str(p_lines[0].end_date)
        days = rental_days(s_date, e_date)

        # Group lines within period by vendor
        vendor_map: dict[str, list[CartLineInput]] = {}
        for line in p_lines:
            vendor_map.setdefault(str(line.vendor_id), []).append(line)

        vendor_groups: list[CartVendorGroup] = []
        for v_id, v_lines in vendor_map.items():
            v_subtotal_paise = 0
            v_deposit_paise = 0
            v_delivery_available = True

            for vl in v_lines:
                vl_days = vl.days if vl.days is not None else days
                lt = line_total(vl.price_per_day, vl.quantity, vl_days)
                v_subtotal_paise += rupees_to_paise(lt)
                v_deposit_paise += rupees_to_paise(to_decimal(vl.security_deposit) * Decimal(vl.quantity))
                if not vl.delivery_available:
                    v_delivery_available = False

            vendor_groups.append(
                CartVendorGroup(
                    vendor_id=v_id,
                    vendor_name=v_lines[0].vendor_name,
                    lines=v_lines,
                    subtotal=paise_to_decimal(v_subtotal_paise),
                    deposit_total=paise_to_decimal(v_deposit_paise),
                    delivery_available=v_delivery_available,
                )
            )

        periods.append(
            CartPeriod(
                period_key=key,
                start_date=s_date,
                end_date=e_date,
                days=days,
                lines=p_lines,
                vendor_groups=vendor_groups,
            )
        )

    # Sort periods chronologically by start_date
    return sorted(periods, key=lambda p: p.start_date)


def subtotal(lines: list[CartLineInput]) -> Decimal:
    """
    Calculates total subtotal for a set of cart lines using integer paise.
    """
    if not lines:
        return Decimal("0.00")

    subtotal_paise = sum(
        rupees_to_paise(
            line_total(
                line.price_per_day,
                line.quantity,
                line.days if line.days is not None else 1,
            )
        )
        for line in lines
    )
    return paise_to_decimal(subtotal_paise)


def deposit_total(lines: list[CartLineInput]) -> Decimal:
    """
    Calculates refundable security deposit total for a set of cart lines.
    """
    if not lines:
        return Decimal("0.00")

    deposit_paise = sum(
        rupees_to_paise(to_decimal(line.security_deposit) * Decimal(line.quantity))
        for line in lines
    )
    return paise_to_decimal(deposit_paise)


def coupon_discount(
    coupon: CouponInput | None,
    order_subtotal: Decimal | float | int | str,
    now: datetime | None = None,
) -> tuple[Decimal, str | None]:
    """
    Validates a coupon against an order subtotal and calculates discount.
    Returns: (discount_amount, error_message)
    Error messages mirror client exactly for UI parity:
    - Inactive: "This code isn't valid."
    - Expired: "This code has expired."
    - Usage limit reached: "This code has reached its usage limit."
    - Below min order: "Add ₹{diff} more to use this code."
    """
    if not coupon:
        return Decimal("0.00"), None

    if not coupon.is_active:
        return Decimal("0.00"), "This code isn't valid."

    if now is None:
        now = datetime.now(UTC)

    # Expiry check
    raw_expiry = coupon.expires_at or coupon.valid_to
    if raw_expiry is not None:
        expiry_dt: datetime | None = None
        if isinstance(raw_expiry, str):
            try:
                clean_str = raw_expiry.replace("Z", "+00:00")
                expiry_dt = datetime.fromisoformat(clean_str)
            except Exception:
                expiry_dt = None
        else:
            expiry_dt = raw_expiry

        if expiry_dt is not None:
            if expiry_dt.tzinfo is None:
                expiry_dt = expiry_dt.replace(tzinfo=UTC)
            if now > expiry_dt:
                return Decimal("0.00"), "This code has expired."

    # Usage limit check
    if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
        return Decimal("0.00"), "This code has reached its usage limit."

    sub_dec = to_decimal(order_subtotal)
    min_order = to_decimal(coupon.min_order_amount)

    if sub_dec < min_order:
        diff = int(math.ceil(float(min_order - sub_dec)))
        # Format difference matching en-IN locale grouping
        diff_str = f"{diff:,}"
        return Decimal("0.00"), f"Add ₹{diff_str} more to use this code."

    subtotal_paise = rupees_to_paise(sub_dec)

    if coupon.type == "percent":
        val = to_decimal(coupon.value)
        # Round half-up on percent discount
        discount_paise = int(
            (Decimal(subtotal_paise) * (val / Decimal("100"))).quantize(
                Decimal("1"), rounding="ROUND_HALF_UP"
            )
        )
    else:  # 'flat'
        coupon_paise = rupees_to_paise(coupon.value)
        discount_paise = min(coupon_paise, subtotal_paise)

    return paise_to_decimal(discount_paise), None


def delivery_fee(
    fulfilment_by_vendor: dict[str, str] | None = None,
    vendor_ids: list[str] | None = None,
    vendor_fee_map: dict[str, Decimal] | None = None,
    default_delivery_fee: Decimal = MOCK_DELIVERY_FEE_PER_VENDOR,
) -> tuple[Decimal, dict[str, Decimal]]:
    """
    Calculates delivery fee based on fulfilment selection ('delivery' vs 'pickup') per vendor.
    Returns: (total_delivery_fee, by_vendor_breakdown)
    """
    if fulfilment_by_vendor is None:
        fulfilment_by_vendor = {}
    if vendor_ids is None:
        vendor_ids = []
    if vendor_fee_map is None:
        vendor_fee_map = {}

    total_paise = 0
    by_vendor: dict[str, Decimal] = {}

    for v_id in vendor_ids:
        type_choice = fulfilment_by_vendor.get(v_id, "delivery")
        if type_choice == "delivery":
            fee = vendor_fee_map.get(v_id, default_delivery_fee)
        else:
            fee = MOCK_PICKUP_FEE

        fee_dec = quantize_money(fee)
        by_vendor[v_id] = fee_dec
        total_paise += rupees_to_paise(fee_dec)

    return paise_to_decimal(total_paise), by_vendor


def tax(
    taxable_subtotal: Decimal | float | int | str,
    tax_rate_percent: Decimal = MOCK_TAX_RATE_PERCENT,
) -> Decimal:
    """
    Calculates GST on taxable subtotal (subtotal - discount) using integer paise.
    """
    sub_dec = to_decimal(taxable_subtotal)
    if sub_dec <= Decimal("0.00"):
        return Decimal("0.00")

    taxable_paise = rupees_to_paise(sub_dec)
    rate = to_decimal(tax_rate_percent)
    tax_paise = int(
        (Decimal(taxable_paise) * (rate / Decimal("100"))).quantize(
            Decimal("1"), rounding="ROUND_HALF_UP"
        )
    )
    return paise_to_decimal(tax_paise)


def quote(
    lines: list[CartLineInput],
    coupon: CouponInput | None = None,
    fulfilment_by_vendor: dict[str, str] | None = None,
    now: datetime | None = None,
    vendor_fee_map: dict[str, Decimal] | None = None,
    tax_rate_percent: Decimal = MOCK_TAX_RATE_PERCENT,
) -> QuoteResult:
    """
    Produces the complete Quote for an active rental period.
    Mathematical Invariant:
    total = subtotal - discount + tax + delivery_fee + security_deposit
    Computed in integer paise to eliminate floating point rounding error.
    """
    if fulfilment_by_vendor is None:
        fulfilment_by_vendor = {}

    subtotal_val = subtotal(lines)
    deposit_val = deposit_total(lines)

    discount_val, coupon_error = coupon_discount(coupon, subtotal_val, now)

    # Taxable subtotal in paise
    subtotal_paise = rupees_to_paise(subtotal_val)
    discount_paise = rupees_to_paise(discount_val)
    taxable_paise = max(0, subtotal_paise - discount_paise)

    # Tax in paise
    rate = to_decimal(tax_rate_percent)
    tax_paise = int(
        (Decimal(taxable_paise) * (rate / Decimal("100"))).quantize(
            Decimal("1"), rounding="ROUND_HALF_UP"
        )
    )
    tax_val = paise_to_decimal(tax_paise)

    # Delivery fee per unique vendor
    vendor_ids = sorted({str(item.vendor_id) for item in lines})
    delivery_fee_val, vendor_delivery_fees = delivery_fee(
        fulfilment_by_vendor,
        vendor_ids,
        vendor_fee_map,
    )
    delivery_paise = rupees_to_paise(delivery_fee_val)
    deposit_paise = rupees_to_paise(deposit_val)

    # Vendor subtotals
    vendor_subtotals: dict[str, Decimal] = {}
    for line in lines:
        v_key = str(line.vendor_id)
        l_days = line.days if line.days is not None else 1
        l_total = line_total(line.price_per_day, line.quantity, l_days)
        vendor_subtotals[v_key] = vendor_subtotals.get(v_key, Decimal("0.00")) + l_total

    # Exact Total in paise
    total_paise = subtotal_paise - discount_paise + tax_paise + delivery_paise + deposit_paise
    total_val = paise_to_decimal(total_paise)

    return QuoteResult(
        subtotal=subtotal_val,
        discount=discount_val,
        tax=tax_val,
        delivery_fee=delivery_fee_val,
        security_deposit=deposit_val,
        total=total_val,
        applied_coupon=coupon if (coupon and discount_val > Decimal("0.00")) else None,
        vendor_subtotals=vendor_subtotals,
        vendor_delivery_fees=vendor_delivery_fees,
        coupon_error=coupon_error,
    )


def resolve_commission(
    equipment_rate: Decimal | float | int | str | None = None,
    category_rate: Decimal | float | int | str | None = None,
    parent_category_rate: Decimal | float | int | str | None = None,
    vendor_rate: Decimal | float | int | str | None = None,
    platform_default: Decimal = DEFAULT_PLATFORM_COMMISSION_RATE,
) -> tuple[Decimal, str]:
    """
    Precedence matching database get_effective_commission:
    1. equipment override (if not NULL) -> 'Equipment'
    2. direct category default (if not NULL) -> 'Category'
    3. parent category default (if not NULL) -> 'Category'
    4. vendor default (if not NULL) -> 'Vendor'
    5. platform default (10.00%) -> 'Platform'

    Clamped between 0.00 and 100.00 with at most 2 decimal places.
    """
    def _parse(val: Any) -> Decimal | None:
        if val is None:
            return None
        s = str(val).strip()
        if not s or s.lower() == "none":
            return None
        try:
            return to_decimal(val)
        except Exception:
            return None

    def _clamp_and_round(val: Decimal) -> Decimal:
        clamped = max(Decimal("0.00"), min(Decimal("100.00"), val))
        return quantize_money(clamped)

    eq = _parse(equipment_rate)
    if eq is not None:
        return _clamp_and_round(eq), "Equipment"

    cat = _parse(category_rate)
    if cat is not None:
        return _clamp_and_round(cat), "Category"

    p_cat = _parse(parent_category_rate)
    if p_cat is not None:
        return _clamp_and_round(p_cat), "Category"

    vend = _parse(vendor_rate)
    if vend is not None:
        return _clamp_and_round(vend), "Vendor"

    return _clamp_and_round(platform_default), "Platform"


def calculate_item_commission(
    item_total: Decimal | float | int | str,
    rate: Decimal | float | int | str,
) -> tuple[Decimal, Decimal]:
    """
    Calculates item commission amount and net amount with paise-safe integer arithmetic.
    Returns: (commission_amount, net_amount).
    """
    tot = to_decimal(item_total)
    r = to_decimal(rate)

    total_paise = rupees_to_paise(tot)
    commission_paise = int(
        (Decimal(total_paise) * (r / Decimal("100"))).quantize(
            Decimal("1"), rounding="ROUND_HALF_UP"
        )
    )
    net_paise = total_paise - commission_paise

    return paise_to_decimal(commission_paise), paise_to_decimal(net_paise)


def calculate_order_payout_from_items(
    items: list[Any],
) -> dict[str, Any]:
    """
    Derives payout from item snapshots:
    gross = sum of item totals,
    commission = sum of item commissions,
    net = gross minus commission.
    Returns: { 'gross': Decimal, 'commission': Decimal, 'net': Decimal, 'effective_rate': float }
    """
    gross_paise = 0
    commission_paise = 0

    for item in items:
        # Support dict or object attributes
        if isinstance(item, dict):
            tot = to_decimal(item.get("total_price", 0))
            comm_amt = item.get("commission_amount")
            comm_rate = item.get("commission_rate")
        else:
            tot = to_decimal(getattr(item, "total_price", 0))
            comm_amt = getattr(item, "commission_amount", None)
            comm_rate = getattr(item, "commission_rate", None)

        item_total_paise = rupees_to_paise(tot)
        gross_paise += item_total_paise

        if comm_amt is not None:
            commission_paise += rupees_to_paise(to_decimal(comm_amt))
        else:
            rate = to_decimal(comm_rate) if comm_rate is not None else DEFAULT_PLATFORM_COMMISSION_RATE
            comm_paise_item = int(
                (Decimal(item_total_paise) * (rate / Decimal("100"))).quantize(
                    Decimal("1"), rounding="ROUND_HALF_UP"
                )
            )
            commission_paise += comm_paise_item

    net_paise = gross_paise - commission_paise
    effective_rate = (
        round(float(commission_paise) / float(gross_paise) * 100.0, 2)
        if gross_paise > 0
        else 0.0
    )

    return {
        "gross": paise_to_decimal(gross_paise),
        "commission": paise_to_decimal(commission_paise),
        "net": paise_to_decimal(net_paise),
        "effective_rate": effective_rate,
    }
