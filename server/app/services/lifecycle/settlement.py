from __future__ import annotations

from collections.abc import Sequence
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from app.core.money import quantize_money
from app.services.lifecycle.types import (
    DepositSettlementResult,
    DisputeResolutionResult,
    PayoutCalculationResult,
)

if TYPE_CHECKING:
    from app.models.fulfilment import DamageReport
    from app.models.orders import BookingItem


def calculate_payout(gross: Decimal, items: Sequence[BookingItem | Any]) -> PayoutCalculationResult:
    """
    Calculate vendor payout from booking item snapshots.
    Invariants:
    - gross equals vendor_order.subtotal
    - commission equals exact sum of booking_items.commission_amount snapshots
    - net equals gross - commission
    """
    safe_gross = quantize_money(max(Decimal("0.00"), gross))

    commission_sum = Decimal("0.00")
    for item in items:
        comm = getattr(item, "commission_amount", Decimal("0.00"))
        commission_sum += Decimal(str(comm))

    safe_commission = quantize_money(commission_sum)
    safe_net = quantize_money(safe_gross - safe_commission)

    return PayoutCalculationResult(
        gross=safe_gross,
        commission=safe_commission,
        net=safe_net,
    )


def calculate_deposit_settlement(
    items: Sequence[BookingItem | Any],
    damage_reports: Sequence[DamageReport | Any] = (),
) -> DepositSettlementResult:
    """
    Calculate deposit settlement for a vendor order upon completion.
    - deposit_share = sum of items' deposit_amount snapshots
    - total_deductions = sum of resolved damage reports with deducted_from_deposit
    - clamped_deductions = min(deposit_share, total_deductions)
    - excess_deductions = max(0, total_deductions - deposit_share)
    - refund_amount = deposit_share - clamped_deductions
    """
    deposit_share = Decimal("0.00")
    for item in items:
        dep = getattr(item, "deposit_amount", Decimal("0.00"))
        deposit_share += Decimal(str(dep))
    deposit_share = quantize_money(deposit_share)

    total_deductions = Decimal("0.00")
    for rep in damage_reports:
        rep_status = getattr(rep, "status", None)
        status_str = rep_status.value if (rep_status is not None and hasattr(rep_status, "value")) else str(rep_status or "")
        is_deducted = bool(getattr(rep, "deducted_from_deposit", 0))

        if status_str == "resolved" and is_deducted:
            final_cost = getattr(rep, "final_cost", None)
            if final_cost is not None:
                cost = Decimal(str(final_cost))
            else:
                cost = Decimal(str(getattr(rep, "damage_cost", Decimal("0.00"))))
            total_deductions += cost

    total_deductions = quantize_money(total_deductions)
    clamped_deductions = min(deposit_share, total_deductions)
    excess = max(Decimal("0.00"), total_deductions - deposit_share)
    refund = max(Decimal("0.00"), deposit_share - clamped_deductions)

    return DepositSettlementResult(
        deposit_share=deposit_share,
        total_deductions=clamped_deductions,
        refund_amount=refund,
        excess_deductions=excess,
    )


def evaluate_dispute_resolution(
    claim_amount: Decimal,
    deposit_share: Decimal,
    outcome: str,
    proposed_amount: Decimal | None = None,
) -> DisputeResolutionResult:
    """
    Validate and compute dispute resolution amounts.
    - reject: 0
    - full: claim_amount (must be <= deposit_share)
    - partial: 0 < proposed_amount < claim_amount and <= deposit_share
    """
    claim = quantize_money(claim_amount)
    share = quantize_money(deposit_share)

    if outcome == "reject":
        return DisputeResolutionResult(
            final_amount=Decimal("0.00"),
            deducted_from_deposit=Decimal("0.00"),
            is_valid=True,
        )

    if outcome == "full":
        if claim > share:
            return DisputeResolutionResult(
                final_amount=claim,
                deducted_from_deposit=share,
                is_valid=False,
                error=f"Claim amount (₹{claim}) exceeds held deposit share (₹{share})",
            )
        return DisputeResolutionResult(
            final_amount=claim,
            deducted_from_deposit=claim,
            is_valid=True,
        )

    if outcome == "partial":
        if proposed_amount is None:
            return DisputeResolutionResult(
                final_amount=Decimal("0.00"),
                deducted_from_deposit=Decimal("0.00"),
                is_valid=False,
                error="Partial outcome requires a proposed amount.",
            )
        amt = quantize_money(proposed_amount)
        if amt <= Decimal("0.00") or amt >= claim:
            return DisputeResolutionResult(
                final_amount=amt,
                deducted_from_deposit=Decimal("0.00"),
                is_valid=False,
                error=f"Partial amount (₹{amt}) must be strictly greater than 0 and less than claim amount ₹{claim}.",
            )
        if amt > share:
            return DisputeResolutionResult(
                final_amount=amt,
                deducted_from_deposit=min(amt, share),
                is_valid=False,
                error=f"Proposed amount (₹{amt}) exceeds held deposit share (₹{share}).",
            )
        return DisputeResolutionResult(
            final_amount=amt,
            deducted_from_deposit=amt,
            is_valid=True,
        )

    return DisputeResolutionResult(
        final_amount=Decimal("0.00"),
        deducted_from_deposit=Decimal("0.00"),
        is_valid=False,
        error=f"Invalid outcome '{outcome}'. Expected 'full', 'partial', or 'reject'.",
    )
