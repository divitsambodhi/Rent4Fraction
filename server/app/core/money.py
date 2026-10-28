from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Any

# Default commission rate across the platform
DEFAULT_PLATFORM_COMMISSION_RATE = Decimal("10.00")

# Precision quantizers
QUANT_TWO_DECIMALS = Decimal("0.01")
QUANT_PAISE = Decimal("1")


def to_decimal(val: Any) -> Decimal:
    """
    Safely converts string, int, float, or Decimal to Decimal.
    Never operates directly on floats without converting to string representation first.
    """
    if val is None:
        return Decimal("0.00")
    if isinstance(val, Decimal):
        return val
    if isinstance(val, float):
        return Decimal(str(val))
    return Decimal(str(val))


def quantize_money(amount: Decimal | str | int | float) -> Decimal:
    """
    Quantizes an amount to 2 decimal places using standard financial ROUND_HALF_UP.
    """
    d = to_decimal(amount)
    return d.quantize(QUANT_TWO_DECIMALS, rounding=ROUND_HALF_UP)


round_half_up = quantize_money


def rupees_to_paise(rupees: Decimal | str | int | float) -> int:
    """
    Converts INR Rupees to integer paise (1 INR = 100 paise) using ROUND_HALF_UP.
    Suitable for Razorpay order amounts.
    """
    d = to_decimal(rupees)
    paise_dec = (d * Decimal("100")).quantize(QUANT_PAISE, rounding=ROUND_HALF_UP)
    return int(paise_dec)


def paise_to_decimal(paise: int) -> Decimal:
    """
    Converts integer paise back to INR Rupees Decimal with 2 decimal places.
    """
    d = Decimal(paise) / Decimal("100")
    return quantize_money(d)


def calculate_line_item_total(
    price_per_day: Decimal | str | int | float,
    quantity: int,
    days: int,
) -> Decimal:
    """
    Calculates line total: price_per_day * quantity * days.
    Rounded with ROUND_HALF_UP.
    """
    p = to_decimal(price_per_day)
    qty = Decimal(quantity)
    d = Decimal(days)
    return quantize_money(p * qty * d)


def calculate_item_commission(
    item_total: Decimal | str | int | float,
    rate: Decimal | str | int | float,
) -> tuple[Decimal, Decimal]:
    """
    Computes commission amount and net payout amount for a line item using paise-safe arithmetic.
    Returns: (commission_amount, net_amount).
    """
    tot = to_decimal(item_total)
    r = to_decimal(rate)

    total_paise = rupees_to_paise(tot)
    commission_paise_dec = (Decimal(total_paise) * (r / Decimal("100"))).quantize(
        QUANT_PAISE, rounding=ROUND_HALF_UP
    )
    commission_paise = int(commission_paise_dec)
    net_paise = total_paise - commission_paise

    return paise_to_decimal(commission_paise), paise_to_decimal(net_paise)


def resolve_commission_rate(
    equipment_rate: Decimal | str | float | None = None,
    category_rate: Decimal | str | float | None = None,
    vendor_rate: Decimal | str | float | None = None,
    platform_default: Decimal = DEFAULT_PLATFORM_COMMISSION_RATE,
) -> tuple[Decimal, str]:
    """
    Precedence: equipment override -> category default -> vendor default -> platform default.
    Returns: (resolved_rate, source_label).
    """
    if equipment_rate is not None and str(equipment_rate).strip():
        return quantize_money(equipment_rate), "Equipment"
    if category_rate is not None and str(category_rate).strip():
        return quantize_money(category_rate), "Category"
    if vendor_rate is not None and str(vendor_rate).strip():
        return quantize_money(vendor_rate), "Vendor"
    return quantize_money(platform_default), "Platform"
