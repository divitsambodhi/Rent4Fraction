from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import ConfigDict, BaseModel, Field

from app.schemas.vendor import VendorProfileResponse


# -----------------------------------------------------------------------------
# Overview & KPI Schemas
# -----------------------------------------------------------------------------
class AdminChartDataPoint(BaseModel):
    date: str
    bookings: int
    bookingValue: float


class AdminAttentionItem(BaseModel):
    id: str
    label: str
    count: int
    href: str


class AdminBookingSummary(BaseModel):
    booking_id: str
    booking_number: str
    customer_name: str
    customer_email: str
    event_name: str | None = None
    start_date: str
    end_date: str
    total_amount: float
    payment_status: str
    status: str
    created_at: str


class AdminOverviewKPIs(BaseModel):
    grossBookingValue: float
    bookingsCount: int
    bookingsDelta: str
    activeVendorsCount: int
    pendingApplicationsCount: int
    openDisputesCount: int
    platformCommissionEarned: float
    chartData: list[AdminChartDataPoint]
    attentionItems: list[AdminAttentionItem]
    recentBookings: list[AdminBookingSummary]
    recentApplications: list[VendorProfileResponse]


# -----------------------------------------------------------------------------
# Vendor Decisions & Commission Schemas
# -----------------------------------------------------------------------------
class RejectVendorRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: str = Field(..., min_length=10)


class SuspendVendorRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: str = Field(..., min_length=5)


class ReviewVendorRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision: Literal["approved", "rejected", "suspended"]
    reason: str | None = None


class UpdateVendorCommissionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    commission_rate: Decimal | None = Field(default=None, ge=Decimal("0.00"), le=Decimal("100.00"))


class AdminVendorDetail(BaseModel):
    vendor: VendorProfileResponse
    application_data: dict[str, Any]
    timeline: list[dict[str, Any]]
    equipment_summary: dict[str, int]


# -----------------------------------------------------------------------------
# Equipment Schemas
# -----------------------------------------------------------------------------
class UpdateEquipmentCommissionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    commission_rate: Decimal | None = Field(default=None, ge=Decimal("0.00"), le=Decimal("100.00"))


class AdminEquipmentItem(BaseModel):
    equipment_id: str
    vendor_id: str
    vendor_name: str
    category_id: str
    category_name: str
    name: str
    price_per_day: float
    security_deposit: float
    quantity: int
    status: str
    commission_rate: float | None = None
    effective_commission_rate: float
    commission_source: str
    created_at: str


# -----------------------------------------------------------------------------
# Category Schemas
# -----------------------------------------------------------------------------
class CreateCategoryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(..., min_length=2, max_length=100)
    parent_id: int | None = None
    description: str | None = None
    default_commission_rate: Decimal | None = Field(default=None, ge=Decimal("0.00"), le=Decimal("100.00"))
    is_active: bool = True


class UpdateCategoryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(default=None, min_length=2, max_length=100)
    parent_id: int | None = None
    description: str | None = None
    default_commission_rate: Decimal | None = Field(default=None, ge=Decimal("0.00"), le=Decimal("100.00"))
    is_active: bool | None = None


class ToggleActiveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    is_active: bool


class CategoryCommissionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    default_commission_rate: Decimal | None = Field(default=None, ge=Decimal("0.00"), le=Decimal("100.00"))


class ManagedCategory(BaseModel):
    category_id: str
    id: str
    name: str
    parent_id: str | None = None
    description: str | None = None
    default_commission_rate: float | None = None
    is_active: bool
    equipment_count: int = 0
    subcategories: list[ManagedCategory] = []


# -----------------------------------------------------------------------------
# Coupon Schemas
# -----------------------------------------------------------------------------
CouponDerivedStatus = Literal["active", "scheduled", "expired", "inactive", "limit_reached"]


class CreateCouponRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str = Field(..., min_length=4, max_length=20, pattern=r"^[A-Za-z0-9]+$")
    type: Literal["percent", "flat"]
    value: Decimal = Field(..., gt=Decimal("0.00"))
    min_order_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    usage_limit: int | None = Field(default=None, ge=1)
    valid_from: datetime | None = None
    valid_to: datetime | None = None
    is_active: bool = True


class UpdateCouponRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["percent", "flat"] | None = None
    value: Decimal | None = Field(default=None, gt=Decimal("0.00"))
    min_order_amount: Decimal | None = Field(default=None, ge=Decimal("0.00"))
    usage_limit: int | None = Field(default=None, ge=1)
    valid_from: datetime | None = None
    valid_to: datetime | None = None
    is_active: bool | None = None


class AdminCouponResponse(BaseModel):
    coupon_id: str
    id: str
    code: str
    type: str
    value: float
    min_order_amount: float
    usage_limit: int | None = None
    used_count: int
    valid_from: str | None = None
    valid_to: str | None = None
    expires_at: str | None = None
    is_active: bool
    status: CouponDerivedStatus


# -----------------------------------------------------------------------------
# User Schemas
# -----------------------------------------------------------------------------
class AdminUser(BaseModel):
    user_id: str
    name: str
    email: str
    role: Literal["customer", "vendor", "admin"]
    email_verified: bool
    status: Literal["active", "deactivated"]
    joined_at: str
    last_login: str | None = None
    bookings_count: int = 0
    avatar_initials: str
    vendor_id: str | None = None


class AdminUserDetail(BaseModel):
    user: AdminUser
    linked_vendor: dict[str, Any] | None = None
    activity_counts: dict[str, int] = {}
    recent_events: list[dict[str, Any]] = []


# -----------------------------------------------------------------------------
# Dispute Schemas
# -----------------------------------------------------------------------------
class AdminDispute(BaseModel):
    dispute_id: str
    booking_id: str
    vendor_order_id: str
    customer_name: str
    customer_email: str
    vendor_name: str
    vendor_id: str
    equipment_name: str
    equipment_id: str
    claimed_amount: float
    deducted_from_deposit: float
    status: Literal["reported", "disputed", "resolved"]
    description: str
    dispute_reason: str | None = None
    filed_at: str
    resolved_at: str | None = None
    resolved_by: str | None = None
    resolution_note: str | None = None
    deposit_held: float


class ResolveDisputeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    outcome: Literal["full", "partial", "reject"]
    final_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    resolution_note: str = Field(..., min_length=10)


# -----------------------------------------------------------------------------
# Payout Schemas
# -----------------------------------------------------------------------------
class UpdatePayoutStatusRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["processing", "paid"]
    paid_at: datetime | None = None
    note: str | None = None


class BulkPayoutStatusRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    payout_ids: list[int]
    status: Literal["processing", "paid"]
    paid_at: datetime | None = None


class AdminPayoutRow(BaseModel):
    payout_id: str
    order_id: str
    vendor_id: str
    vendor_name: str
    customer_name: str
    gross_amount: float
    commission_amount: float
    net_amount: float
    status: str
    paid_at: str | None = None
    created_at: str


# -----------------------------------------------------------------------------
# System Check Invariant Schemas
# -----------------------------------------------------------------------------
class SystemCheckItem(BaseModel):
    check_id: str
    name: str
    status: Literal["pass", "fail"]
    message: str
    violations_count: int = 0
    offending_ids: list[str] = []


class SystemChecksReport(BaseModel):
    passed: bool
    total_checks: int
    passed_checks: int
    failed_checks: int
    timestamp: str
    checks: list[SystemCheckItem]
