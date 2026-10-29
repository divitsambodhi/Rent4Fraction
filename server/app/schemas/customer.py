from __future__ import annotations

from typing import Any

from pydantic import ConfigDict, BaseModel, Field


# -----------------------------------------------------------------------------
# Cart Schemas
# -----------------------------------------------------------------------------
class CartLineResponse(BaseModel):
    cart_item_id: str
    equipment_id: str
    name: str
    category: str
    category_id: str | None = None
    vendor_id: str
    vendor_name: str
    price_per_day: float
    security_deposit: float
    quantity: int
    start_date: str
    end_date: str
    days: int
    primary_image_url: str = ""
    delivery_available: bool = True
    min_rental_days: int | None = None
    max_available_quantity: int | None = None
    status: str = "ok"  # 'ok' | 'low' | 'unavailable'


class CartVendorGroupResponse(BaseModel):
    vendor_id: str
    vendor_name: str
    lines: list[CartLineResponse] = Field(default_factory=list)
    subtotal: float
    deposit_total: float
    delivery_available: bool = True


class CartPeriodResponse(BaseModel):
    period_key: str
    start_date: str
    end_date: str
    days: int
    lines: list[CartLineResponse] = Field(default_factory=list)
    vendor_groups: list[CartVendorGroupResponse] = Field(default_factory=list)


class CartResponse(BaseModel):
    items: list[CartLineResponse] = Field(default_factory=list)
    periods: list[CartPeriodResponse] = Field(default_factory=list)
    subtotal: float = 0.0
    deposit_total: float = 0.0
    issues: list[dict[str, Any]] = Field(default_factory=list)


class CartItemCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    equipment_id: int | str
    quantity: int = Field(default=1, ge=1, le=50)
    start_date: str
    end_date: str


class CartItemUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    quantity: int | None = Field(default=None, ge=1, le=50)
    start_date: str | None = None
    end_date: str | None = None


class CartApplyDatesRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    start_date: str
    end_date: str


class CartApplyDatesResponse(BaseModel):
    success: bool
    updated_items_count: int
    unavailable_items: list[dict[str, Any]] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# Wishlist Schemas
# -----------------------------------------------------------------------------
class WishlistItemResponse(BaseModel):
    equipment_id: str
    name: str
    description: str
    price_per_day: float
    security_deposit: float
    quantity: int
    min_rental_days: int
    delivery_available: bool
    avg_rating: float
    review_count: int
    specifications: dict[str, Any] = Field(default_factory=dict)
    vendor_id: str
    vendor_name: str
    category_id: str
    category_name: str
    primary_image_url: str = ""
    is_available: bool = True
    total_price: float | None = None
    created_at: str | None = None


# -----------------------------------------------------------------------------
# Address Schemas
# -----------------------------------------------------------------------------
class AddressCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: str | None = None
    line1: str = Field(min_length=3, max_length=255)
    line2: str | None = Field(default=None, max_length=255)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    pincode: str = Field(pattern=r"^[1-9][0-9]{5}$")
    country: str = "India"
    is_default: bool = False
    name: str | None = None
    phone: str | None = None


class AddressUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: str | None = None
    line1: str | None = Field(default=None, min_length=3, max_length=255)
    line2: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, min_length=2, max_length=100)
    state: str | None = Field(default=None, min_length=2, max_length=100)
    pincode: str | None = Field(default=None, pattern=r"^[1-9][0-9]{5}$")
    country: str | None = None
    is_default: bool | None = None
    name: str | None = None
    phone: str | None = None


class AddressResponse(BaseModel):
    id: str
    label: str | None = None
    line1: str
    line2: str | None = None
    city: str
    state: str
    pincode: str
    country: str = "India"
    is_default: bool
    used_in_bookings: int = 0
    created_at: str
    name: str = ""
    phone: str | None = None


# -----------------------------------------------------------------------------
# Profile & Badges Schemas
# -----------------------------------------------------------------------------
class UpdateProfileRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(default=None, min_length=2, max_length=100)
    phone: str | None = Field(default=None, pattern=r"^[6-9][0-9]{9}$")


class UserProfileResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str | None = None
    role: str
    avatarInitials: str


class AccountBadgesResponse(BaseModel):
    active_bookings_count: int
    unread_inbox_count: int
    wishlist_count: int
