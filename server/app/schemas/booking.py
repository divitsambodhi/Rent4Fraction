from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# Coupon & Checkout Quote Schemas
# -----------------------------------------------------------------------------
class CouponValidateRequest(BaseModel):
    code: str
    subtotal: float = Field(ge=0)


class CouponValidationResponse(BaseModel):
    valid: bool
    discount: float
    message: str | None = None
    coupon: dict[str, Any] | None = None


class CheckoutQuoteRequest(BaseModel):
    period: str | None = None
    period_key: str | None = None
    coupon_code: str | None = None
    fulfilment_by_vendor: dict[str, str] = Field(default_factory=dict)
    address_id: int | str | None = None

    def get_period(self) -> str | None:
        return self.period or self.period_key

    def get_address_id(self) -> int | None:
        if self.address_id is None:
            return None
        if isinstance(self.address_id, int):
            return self.address_id
        if isinstance(self.address_id, str) and self.address_id.isdigit():
            return int(self.address_id)
        return None


class CheckoutQuoteResponse(BaseModel):
    subtotal: float
    discount: float
    tax: float
    delivery_fee: float
    security_deposit: float
    total: float
    vendor_subtotals: dict[str, float] = Field(default_factory=dict)
    vendor_delivery_fees: dict[str, float] = Field(default_factory=dict)
    applied_coupon: dict[str, Any] | None = None
    issues: list[dict[str, Any]] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# Booking List & Detail Schemas
# -----------------------------------------------------------------------------
class VendorAvatar(BaseModel):
    id: str
    name: str
    initials: str


class BookingSummaryResponse(BaseModel):
    booking_id: str
    event_name: str
    event_type: str
    status: str
    payment_status: str
    start_date: str
    end_date: str
    rental_days: int
    delivery_city: str
    vendor_count: int
    item_count: int
    vendor_avatars: list[VendorAvatar] = Field(default_factory=list)
    total_amount: float
    action_needed: list[str] = Field(default_factory=list)
    created_at: str


class BookingListResponse(BaseModel):
    items: list[BookingSummaryResponse]
    total: int
    counts: dict[str, int] = Field(default_factory=dict)


class BookingCancelRequest(BaseModel):
    reason: str | None = None


class DamageReportRespondRequest(BaseModel):
    action: str = Field(pattern=r"^(accept|dispute)$")
    dispute_reason: str | None = None


DamageReportResponseRequest = DamageReportRespondRequest


class DamageReportResponse(BaseModel):
    report_id: str
    equipment_id: str
    equipment_name: str
    description: str
    repair_cost: float
    damage_cost: float
    deducted_from_deposit: int
    status: str
    dispute_reason: str | None = None
    filed_at: str
    resolved_at: str | None = None
    resolution_note: str | None = None


class ItemReviewData(BaseModel):
    review_id: str
    booking_id: str
    equipment_id: str
    equipment_name: str
    rating: int
    comment: str | None = None
    vendor_reply: str | None = None
    created_at: str


class DeliveryTrackerData(BaseModel):
    type: str  # 'delivery' | 'pickup'
    status: str  # 'scheduled' | 'out_for_delivery' | 'delivered' | 'failed'
    scheduled_window: str = ""
    tracking_info: str | None = None
    delivered_by: str | None = None
    delivery_proof_url: str | None = None
    failure_reason: str | None = None
    updated_at: str = ""


class ReturnInspectionData(BaseModel):
    status: str  # 'scheduled' | 'returned' | 'late' | 'incomplete'
    scheduled_window: str | None = None
    returned_at: str | None = None
    inspected_at: str | None = None
    condition: str = "good"
    notes: str | None = None


class BookingItemDetailResponse(BaseModel):
    item_id: str
    equipment_id: str
    name: str
    image_url: str
    unit_price: float
    quantity: int
    days: int
    total_price: float
    status: str
    vendor_id: str
    vendor_name: str
    security_deposit: float = 0.0
    category: str = ""
    review: ItemReviewData | None = None
    damage_report: DamageReportResponse | None = None
    commission_rate: float = 0.0
    commission_amount: float = 0.0


class VendorOrderResponse(BaseModel):
    vendor_order_id: str
    vendor_id: str
    vendor_name: str
    vendor_initials: str
    vendor_phone: str | None = None
    status: str
    rejection_reason: str | None = None
    subtotal: float
    item_ids: list[str] = Field(default_factory=list)
    delivery: DeliveryTrackerData | None = None
    return_: ReturnInspectionData | None = Field(default=None, alias="return")
    fulfilment_type: str = "delivery"

    model_config = {"populate_by_name": True}


class DepositSummaryData(BaseModel):
    held: float
    deducted: float
    refunded: float
    pending_refund: float


class PriceSummaryBreakdown(BaseModel):
    subtotal: float
    discount: float
    coupon_code: str | None = None
    tax: float
    delivery_fee: float
    security_deposit: float
    total: float


class PaymentRecordResponse(BaseModel):
    payment_id: str
    booking_id: str
    event_name: str | None = None
    type: str
    method: str
    amount: float
    status: str
    created_at: str
    reference: str
    refund_reference: str | None = None


class ActivityTimelineEvent(BaseModel):
    id: str | None = None
    title: str | None = None
    description: str | None = None
    timestamp: str
    type: str | None = None
    actor: str | None = None
    event: str | None = None


class BookingDetailResponse(BookingSummaryResponse):
    delivery_address: dict[str, Any]
    vendor_orders: list[VendorOrderResponse] = Field(default_factory=list)
    items: list[BookingItemDetailResponse] = Field(default_factory=list)
    payments: list[PaymentRecordResponse] = Field(default_factory=list)
    deposit: DepositSummaryData
    price_summary: PriceSummaryBreakdown
    activity: list[ActivityTimelineEvent] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# Payments Schemas
# -----------------------------------------------------------------------------
class PaymentSummaryTilesResponse(BaseModel):
    total_paid: float
    deposits_held: float
    deductions: float
    refunded: float


PaymentSummaryResponse = PaymentSummaryTilesResponse


class PaymentListResponse(BaseModel):
    items: list[PaymentRecordResponse]
    total: int
    page: int = 1
    pageSize: int = 10
