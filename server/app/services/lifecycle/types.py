from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

LifecycleRole = Literal["customer", "vendor", "admin", "system"]

LifecycleAction = Literal[
    "accept",
    "decline",
    "cancel",
    "schedule_delivery",
    "schedule_pickup",
    "dispatch",
    "mark_delivered",
    "delivery_failed",
    "reschedule_delivery",
    "schedule_return",
    "mark_returned",
    "inspect",
    "complete_order",
    "resolve_dispute",
]


class ScheduleDeliveryPayload(BaseModel):
    date: date
    start_time: str = Field(..., description="e.g. '10:00'")
    end_time: str = Field(..., description="e.g. '12:00'")
    delivered_by: str | None = None
    tracking_info: str | None = None
    notes: str | None = None


class MarkDeliveredPayload(BaseModel):
    delivered_by: str
    delivered_at: datetime | None = None
    proof_photo_storage_path: str | None = None
    proof_public_id: str | None = None
    notes: str | None = None


class DeliveryFailedPayload(BaseModel):
    reason: str = Field(..., min_length=5)


class ScheduleReturnPayload(BaseModel):
    date: date
    start_time: str = Field(..., description="e.g. '14:00'")
    end_time: str = Field(..., description="e.g. '16:00'")
    notes: str | None = None


class InspectionItemResult(BaseModel):
    item_id: int
    returned_quantity: int = Field(..., ge=0)
    condition: Literal["good", "minor_damage", "major_damage", "lost"]
    damage_description: str | None = None
    damage_cost: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    deduct_from_deposit: bool = True
    notes: str | None = None


class InspectionPayload(BaseModel):
    items: list[InspectionItemResult]
    inspected_at: datetime | None = None
    general_notes: str | None = None


class DisputeResolutionPayload(BaseModel):
    outcome: Literal["full", "partial", "reject"]
    final_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    resolution_note: str = Field(..., min_length=10)


@dataclass(frozen=True)
class PayoutCalculationResult:
    gross: Decimal
    commission: Decimal
    net: Decimal


@dataclass(frozen=True)
class DepositSettlementResult:
    deposit_share: Decimal
    total_deductions: Decimal
    refund_amount: Decimal
    excess_deductions: Decimal = Decimal("0.00")


@dataclass(frozen=True)
class DisputeResolutionResult:
    final_amount: Decimal
    deducted_from_deposit: Decimal
    is_valid: bool
    error: str | None = None


@dataclass
class LifecycleTransitionResult:
    booking_id: int
    vendor_order_id: int
    from_status: str
    to_status: str
    booking_status: str
    created_payout_id: int | None = None
    created_deposit_refund_id: int | None = None
    damage_report_ids: list[int] = field(default_factory=list)
