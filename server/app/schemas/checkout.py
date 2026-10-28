from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class PeriodInput(BaseModel):
    start_date: date
    end_date: date


class EventDetailsInput(BaseModel):
    event_name: str | None = None
    event_type: str = Field(
        ..., description="Wedding, Birthday, Corporate event, Concert, Festival, Other"
    )
    event_date: date | None = None
    venue_address: str = ""
    notes: str | None = None


class CheckoutOrderCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    period: PeriodInput
    address_id: int
    fulfilment_by_vendor: dict[str, Literal["delivery", "pickup"]] = Field(
        ...,
        alias="fulfilment",
        description="Vendor fulfilment choices keyed by vendor_id string",
    )
    event: EventDetailsInput
    coupon_code: str | None = None
    payment_method: Literal["upi", "card", "netbanking", "wallet", "cod"] = "card"

    @property
    def fulfilment(self) -> dict[str, Literal["delivery", "pickup"]]:
        return self.fulfilment_by_vendor


class RazorpayPrefill(BaseModel):
    name: str
    email: str
    contact: str = ""


class RazorpayOrderBlock(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    key_id: str
    order_id: str = Field(..., alias="order_id")
    amount: int = Field(..., alias="amount")  # in paise
    currency: str = "INR"
    name: str = "Rent4Fraction"
    description: str
    prefill: RazorpayPrefill
    notes: dict[str, str] = Field(default_factory=dict)

    @property
    def razorpay_order_id(self) -> str:
        return self.order_id

    @property
    def amount_paise(self) -> int:
        return self.amount


class CheckoutOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking_id: int
    booking_number: str
    status: str
    payment_status: str
    expires_at: str | None = None
    total_amount: float
    payment_method: str
    razorpay: RazorpayOrderBlock | None = None


class PaymentVerifyRequest(BaseModel):
    booking_id: int | None = None
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentVerifyResponse(BaseModel):
    success: bool
    booking_id: int
    booking_number: str
    status: str
    payment_status: str
    message: str
    refunded: bool = False


class PaymentStatusResponse(BaseModel):
    booking_id: int
    booking_number: str
    booking_status: str
    payment_status: str
    total_amount: float
    remaining_hold_seconds: int
    latest_attempt: dict[str, Any] | None = None


class WebhookAckResponse(BaseModel):
    status: str = "ok"
    event_id: str
    processed: bool = True
