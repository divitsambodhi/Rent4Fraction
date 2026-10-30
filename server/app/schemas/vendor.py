from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any, Literal

from pydantic import ConfigDict, BaseModel, Field

from app.models.catalog import EquipmentStatus
from app.services.lifecycle.types import (
    DeliveryFailedPayload,
    InspectionPayload,
    LifecycleAction,
    MarkDeliveredPayload,
    ScheduleDeliveryPayload,
    ScheduleReturnPayload,
)

# -----------------------------------------------------------------------------
# Overview / Dashboard Schemas
# -----------------------------------------------------------------------------
OverviewRange = Literal["7d", "30d", "90d", "ytd"]


class VendorKpis(BaseModel):
    net_earnings: float = 0.0
    net_earnings_delta: str | None = None
    net_earnings_delta_percent: float = 0.0
    pending_orders: int = 0
    active_orders: int = 0
    active_orders_today: int = 0
    active_orders_delta: str | None = None
    completed_orders: int = 0
    completed_orders_delta: str | None = None
    completed_orders_delta_percent: float = 0.0
    equipment_listed: int = 0
    avg_rating: float = 0.0
    rating: float = 0.0
    review_count: int = 0


class EarningsDataPoint(BaseModel):
    date: str
    label: str
    gross: float
    commission: float
    net: float
    amount: float


class AttentionItem(BaseModel):
    id: str
    type: Literal["order", "review", "stock", "return", "dispute"] = "order"
    title: str | None = None
    label: str | None = None
    href: str
    count: int
    tone: Literal["warning", "danger", "info", "neutral"] = "neutral"


class AttentionCounts(BaseModel):
    new_orders_waiting: int = 0
    returns_awaiting_inspection: int = 0
    disputed_damage_reports: int = 0
    reviews_needing_reply: int = 0
    low_stock_items: int = 0


class VendorRecentOrder(BaseModel):
    order_id: str
    booking_id: str | None = None
    order_number: str
    customer_name: str
    customer_initials: str | None = None
    items_summary: str
    start_date: str | None = None
    end_date: str | None = None
    date_range: str | None = None
    total_days: int
    rental_days: int | None = None
    status: str
    amount: float


class TopEquipmentItem(BaseModel):
    id: str
    equipment_id: str
    name: str
    category: str
    image: str
    rental_count: int
    rentals_count: int
    avg_rating: float
    rating: float
    total_revenue: float
    earnings: float


class ScheduleEvent(BaseModel):
    id: str
    type: Literal["delivery", "return", "pickup"]
    time: str
    customer_name: str
    equipment_name: str
    location: str | None = None
    order_id: str | None = None


class ScheduleDayGroup(BaseModel):
    date: str
    day_label: str
    events: list[ScheduleEvent]


class VendorOverviewResponse(BaseModel):
    range: OverviewRange
    kpis: VendorKpis
    earnings_series: list[EarningsDataPoint]
    attention_items: list[AttentionItem]
    attention: AttentionCounts
    recent_orders: list[VendorRecentOrder]
    top_equipment: list[TopEquipmentItem]
    schedule: list[ScheduleDayGroup]


# -----------------------------------------------------------------------------
# Order Schemas
# -----------------------------------------------------------------------------
class VendorOrderItemDetail(BaseModel):
    item_id: str
    equipment_id: str
    equipment_name: str
    primary_image_url: str | None = None
    quantity: int
    daily_rate: float
    days: int
    total_price: float
    commission_rate: float
    commission_amount: float
    deposit_amount: float
    status: str
    condition: str | None = None
    damage_report: dict[str, Any] | None = None


class SetDeliveryFeeRequest(BaseModel):
    delivery_fee: float = Field(ge=0, description="Custom delivery charge calculated by vendor based on distance/location")
    notes: str | None = Field(default=None, description="Optional notes to customer about the delivery charge")


class VendorOrderDetailResponse(BaseModel):
    vendor_order_id: str
    order_number: str
    booking_id: str
    booking_number: str
    customer_name: str
    customer_phone: str | None = None
    customer_email: str | None = None
    delivery_address: dict[str, Any]
    fulfilment_type: str
    status: str
    start_date: str
    end_date: str
    total_days: int
    subtotal: float
    delivery_fee: float
    commission_amount: float
    net_payout: float
    deposit_share: float
    deposit_held: float
    deposit_refunded: float
    deposit_deducted: float
    items: list[VendorOrderItemDetail]
    delivery: dict[str, Any] | None = None
    return_record: dict[str, Any] | None = None
    damage_reports: list[dict[str, Any]] = []
    events: list[dict[str, Any]] = []
    allowed_actions: list[str] = []
    rejection_reason: str | None = None


class VendorOrderListResponse(BaseModel):
    items: list[VendorOrderDetailResponse]
    total: int
    page: int
    pageSize: int


class DeclineOrderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: str = Field(..., min_length=10)


class DeliveryFailedRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: str = Field(..., min_length=5)


class StatusUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: LifecycleAction
    reason: str | None = None
    schedule_delivery: ScheduleDeliveryPayload | None = None
    mark_delivered: MarkDeliveredPayload | None = None
    delivery_failed: DeliveryFailedPayload | None = None
    schedule_return: ScheduleReturnPayload | None = None
    inspection: InspectionPayload | None = None
    return_date: date | None = None
    note: str | None = None


# -----------------------------------------------------------------------------
# Inventory & Equipment Schemas
# -----------------------------------------------------------------------------
class ImagePayload(BaseModel):
    public_id: str | None = None
    storage_path: str | None = None
    url: str | None = None
    version: int | None = None
    format: str | None = None
    bytes: int | None = None
    alt_text: str | None = None
    is_primary: bool = False
    sort_order: int = 0
    width: int | None = None
    height: int | None = None
    placeholder_color: str | None = None
    content_type: str | None = None
    size_bytes: int | None = None


class CreateEquipmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category_id: int
    name: str = Field(..., min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    price_per_day: Decimal = Field(..., gt=Decimal("0.00"))
    security_deposit: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    quantity: int = Field(default=1, ge=0)
    min_rental_days: int = Field(default=1, ge=1)
    delivery_available: bool = True
    images: list[ImagePayload] = Field(default_factory=list, max_length=8)
    includes: list[str] = Field(default_factory=list, max_length=30)
    specifications: dict[str, Any] = Field(default_factory=dict)


class UpdateEquipmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category_id: int | None = None
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    price_per_day: Decimal | None = Field(default=None, gt=Decimal("0.00"))
    security_deposit: Decimal | None = Field(default=None, ge=Decimal("0.00"))
    quantity: int | None = Field(default=None, ge=0)
    min_rental_days: int | None = Field(default=None, ge=1)
    delivery_available: bool | None = None
    status: EquipmentStatus | None = None
    images: list[ImagePayload] | None = None
    includes: list[str] | None = None
    specifications: dict[str, Any] | None = None


class BulkStatusRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    equipment_ids: list[int]
    status: Literal["active", "inactive", "archived"]


class InventoryItemResponse(BaseModel):
    id: str
    equipment_id: str
    vendor_id: str
    vendor_name: str
    name: str
    description: str
    category_id: str
    category_name: str
    category: str
    parent_category_id: str | None = None
    parent_category_name: str | None = None
    price_per_day: float
    price: float
    security_deposit: float
    deposit: float
    quantity: int
    stock: int
    min_rental_days: int
    delivery_available: bool
    avg_rating: float
    rating: float
    review_count: int
    reviews: int
    status: str
    primary_image_url: str
    image: str
    images: list[dict[str, Any]]
    includes: list[str]
    included: list[str]
    specifications: dict[str, Any]
    commission_rate: float | None = None
    commission_source: str | None = None
    created_at: str
    updated_at: str
    updated: str


class InventoryListResponse(BaseModel):
    items: list[InventoryItemResponse]
    total: int
    page: int
    pageSize: int
    stats: dict[str, int] = {}


# -----------------------------------------------------------------------------
# Availability Blocks Schemas
# -----------------------------------------------------------------------------
class CreateAvailabilityBlockRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    start_date: date
    end_date: date
    units: int = Field(default=1, ge=1)
    reason: Literal["maintenance", "vendor_blocked"]
    note: str | None = None


class AvailabilityBlockResponse(BaseModel):
    id: str
    block_id: str
    equipment_id: str
    start_date: str
    end_date: str
    reason: str
    units: int
    quantity: int
    note: str | None = None
    created_at: str


# -----------------------------------------------------------------------------
# Payout Schemas
# -----------------------------------------------------------------------------
class PayoutLineItem(BaseModel):
    equipment_name: str
    quantity: int
    daily_rate: float
    days: int
    subtotal: float
    commission_rate: float
    commission_amount: float


class VendorPayoutResponse(BaseModel):
    payout_id: str
    order_id: str
    order_number: str
    booking_id: str
    customer_name: str
    items_summary: str
    rental_dates: str
    gross: float
    gross_amount: float
    commission_rate: float
    commission_amount: float
    net: float
    net_amount: float
    status: str
    paid_at: str | None = None
    created_at: str
    items: list[PayoutLineItem] = []
    timeline: list[dict[str, Any]] = []


class VendorPayoutTiles(BaseModel):
    total_earned_net: float
    pending: float
    processing: float
    paid_out: float
    commission_rate: float


class VendorPayoutsResult(BaseModel):
    payouts: list[VendorPayoutResponse]
    items: list[VendorPayoutResponse]
    total_count: int
    total: int
    page: int
    pageSize: int
    tiles: VendorPayoutTiles
    commission_rate: float


# -----------------------------------------------------------------------------
# Reviews Schemas
# -----------------------------------------------------------------------------
class VendorReviewItem(BaseModel):
    review_id: str
    equipment_id: str
    equipment_name: str
    equipment_category: str | None = None
    equipment_image: str | None = None
    user_name: str
    customer_name: str
    user_avatar: str | None = None
    rating: int
    comment: str
    review_date: str
    created_at: str
    verified_rental: bool
    vendor_reply: str | None = None
    replied_at: str | None = None


class VendorReviewSummary(BaseModel):
    avg: float
    average_rating: float
    count: int
    total_reviews: int
    distribution: dict[int, int]
    replied_count: int
    needs_reply_count: int


class VendorReviewsResult(BaseModel):
    reviews: list[VendorReviewItem]
    items: list[VendorReviewItem]
    total: int
    total_count: int
    page: int
    pageSize: int
    summary: VendorReviewSummary


class ReviewReplyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reply_text: str = Field(..., min_length=1, max_length=500)


# -----------------------------------------------------------------------------
# Profile Schemas
# -----------------------------------------------------------------------------
class VendorProfileResponse(BaseModel):
    vendor_id: str
    business_name: str
    description: str
    address: str
    city: str
    phone: str
    gst: str | None = None
    gst_number: str
    logo: str | None = None
    logo_url: str
    gst: str | None = None
    logo: str | None = None
    logo_url: str | None = None
    logo_public_id: str | None = None
    logo_version: int | None = None
    logo_storage_path: str | None = None
    approval_status: str
    member_since: str
    commission_rate: float
    owner_name: str
    owner_email: str
    email: str
    rating: float
    review_count: int
    rejection_reason: str | None = None
    suspension_reason: str | None = None
    approved_by: str | None = None
    approved_at: str | None = None
    delivery_fee: float = 0.0


class UpdateVendorProfileRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    business_name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    address: str | None = None
    city: str | None = None
    phone: str | None = None
    gst_number: str | None = Field(default=None, pattern=r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
    gst: str | None = None
    delivery_fee: Decimal | None = Field(default=None, ge=Decimal("0.00"))
    logo_public_id: str | None = None
    logo_version: int | None = None
    logo_storage_path: str | None = None
    logo: str | None = None
    logo_url: str | None = None


# -----------------------------------------------------------------------------
# COD Actions Schemas
# -----------------------------------------------------------------------------
class RecordCashRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    amount: Decimal = Field(..., ge=Decimal("0.00"), description="Cash collected from customer at delivery")
    notes: str | None = None
    proof_public_id: str | None = None
    proof_photo_storage_path: str | None = None


class RecordNoShowRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: str = Field(default="Customer unavailable at delivery venue", min_length=5)
    notes: str | None = None


class RecordDepositSettlementRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    deposit_refunded: Decimal = Field(..., ge=Decimal("0.00"), description="Cash refunded to customer upon clean return")
    damage_deductions: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="Deductions withheld for damages")
    notes: str | None = None
