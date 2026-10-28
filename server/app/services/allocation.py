from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class VendorOrderShareInput:
    vendor_order_id: int
    rent_subtotal: Decimal
    delivery_fee: Decimal
    deposit: Decimal


@dataclass(frozen=True)
class VendorOrderShareResult:
    vendor_order_id: int
    rent: Decimal
    discount: Decimal
    tax: Decimal
    delivery_fee: Decimal
    deposit: Decimal
    total: Decimal


@dataclass(frozen=True)
class BookingAllocationResult:
    orders: list[VendorOrderShareResult]
    total_rent: Decimal
    total_discount: Decimal
    total_tax: Decimal
    total_delivery: Decimal
    total_deposit: Decimal
    grand_total: Decimal


def _to_paise(d: Decimal) -> int:
    return int((d * 100).to_integral_value())


def _to_decimal(paise: int) -> Decimal:
    return Decimal(paise) / Decimal(100)


def allocate_largest_remainder(
    total_paise: int,
    weights_paise: list[int],
) -> list[int]:
    """
    Allocates an integer amount of paise across recipients proportionally
    to weights using the Hare-Niemeyer (largest remainder) method.
    Guarantees sum(allocations) == total_paise exactly.
    """
    n = len(weights_paise)
    if n == 0 or total_paise == 0:
        return [0] * n

    total_weight = sum(weights_paise)
    if total_weight <= 0:
        # If all weights are 0, divide evenly and distribute remainders
        base = total_paise // n
        rem = total_paise % n
        return [base + (1 if i < rem else 0) for i in range(n)]

    # 1. Exact shares and floor
    floors: list[int] = []
    remainders: list[tuple[float, int]] = []  # (remainder, index)

    for i, w in enumerate(weights_paise):
        exact_share = (total_paise * w) / total_weight
        fl = int(exact_share)
        floors.append(fl)
        remainders.append((exact_share - fl, i))

    allocated_so_far = sum(floors)
    shortfall = total_paise - allocated_so_far

    # 2. Sort by largest remainder descending, breaking ties by index
    remainders.sort(key=lambda x: (x[0], -x[1]), reverse=True)

    result = list(floors)
    for k in range(shortfall):
        idx = remainders[k][1]
        result[idx] += 1

    return result


def allocate_booking_totals(
    orders: list[VendorOrderShareInput],
    booking_discount: Decimal,
    booking_tax: Decimal,
) -> BookingAllocationResult:
    """
    Splits a booking's money across its vendor orders to the exact paisa:
    - Rent per order: exact sum from items
    - Delivery fee per order: exact delivery fee configured
    - Deposit per order: exact item deposit sum
    - Discount: allocated pro-rata by order rent (largest-remainder method)
    - Tax: allocated pro-rata by order rent after discount (largest-remainder method)
    - Total per order: rent - discount + tax + delivery + deposit

    Invariants:
    sum(order.rent) == sum(input.rent_subtotal)
    sum(order.discount) == booking_discount
    sum(order.tax) == booking_tax
    sum(order.delivery) == sum(input.delivery_fee)
    sum(order.deposit) == sum(input.deposit)
    sum(order.total) == booking grand total
    """
    if not orders:
        return BookingAllocationResult(
            orders=[],
            total_rent=Decimal("0.00"),
            total_discount=Decimal("0.00"),
            total_tax=Decimal("0.00"),
            total_delivery=Decimal("0.00"),
            total_deposit=Decimal("0.00"),
            grand_total=Decimal("0.00"),
        )

    # 1. Rent paise
    rent_paise = [_to_paise(o.rent_subtotal) for o in orders]

    # 2. Discount allocation
    discount_paise_total = _to_paise(booking_discount)
    allocated_discounts_paise = allocate_largest_remainder(
        discount_paise_total,
        rent_paise,
    )

    # 3. Taxable subtotal paise per order: order_rent - order_discount
    taxable_paise = [
        max(0, rent_paise[i] - allocated_discounts_paise[i]) for i in range(len(orders))
    ]

    # 4. Tax allocation
    tax_paise_total = _to_paise(booking_tax)
    allocated_taxes_paise = allocate_largest_remainder(
        tax_paise_total,
        taxable_paise,
    )

    # 5. Build results
    results: list[VendorOrderShareResult] = []
    for i, o in enumerate(orders):
        r_paise = rent_paise[i]
        d_paise = allocated_discounts_paise[i]
        t_paise = allocated_taxes_paise[i]
        del_paise = _to_paise(o.delivery_fee)
        dep_paise = _to_paise(o.deposit)

        order_total_paise = r_paise - d_paise + t_paise + del_paise + dep_paise

        results.append(
            VendorOrderShareResult(
                vendor_order_id=o.vendor_order_id,
                rent=_to_decimal(r_paise),
                discount=_to_decimal(d_paise),
                tax=_to_decimal(t_paise),
                delivery_fee=_to_decimal(del_paise),
                deposit=_to_decimal(dep_paise),
                total=_to_decimal(order_total_paise),
            )
        )

    tot_rent = sum((r.rent for r in results), Decimal("0.00"))
    tot_disc = sum((r.discount for r in results), Decimal("0.00"))
    tot_tax = sum((r.tax for r in results), Decimal("0.00"))
    tot_del = sum((r.delivery_fee for r in results), Decimal("0.00"))
    tot_dep = sum((r.deposit for r in results), Decimal("0.00"))
    grand = sum((r.total for r in results), Decimal("0.00"))

    return BookingAllocationResult(
        orders=results,
        total_rent=tot_rent,
        total_discount=tot_disc,
        total_tax=tot_tax,
        total_delivery=tot_del,
        total_deposit=tot_dep,
        grand_total=grand,
    )
