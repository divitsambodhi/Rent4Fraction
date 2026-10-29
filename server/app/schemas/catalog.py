from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class CategoryResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    parent_id: str | None = None
    is_active: bool = True
    starting_price: float = 0.0
    equipment_count: int = 0
    children: list[CategoryResponse] = Field(default_factory=list)


class CategoryDetailResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    parent_id: str | None = None
    is_active: bool = True
    starting_price: float = 0.0
    equipment_count: int = 0


class EquipmentListingItem(BaseModel):
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
    parent_category_id: str | None = None
    parent_category_name: str | None = None
    primary_image_url: str = ""
    primary_image_public_id: str | None = None
    available_quantity: int | None = None


class EquipmentFacets(BaseModel):
    category_counts: dict[str, int] = Field(default_factory=dict)
    vendor_counts: dict[str, int] = Field(default_factory=dict)
    price_min: float = 0.0
    price_max: float = 0.0


class EquipmentSearchResponse(BaseModel):
    items: list[EquipmentListingItem]
    total: int
    page: int
    pageSize: int
    facets: EquipmentFacets


class EquipmentImageSchema(BaseModel):
    image_id: str
    url: str | None = None
    public_id: str | None = None
    version: int | None = None
    width: int | None = None
    height: int | None = None
    format: str | None = None
    alt_text: str | None = None
    is_primary: bool
    sort_order: int
    placeholder_color: str | None = None


class VendorSummarySchema(BaseModel):
    vendor_id: str
    business_name: str
    city: str
    avg_rating: float
    review_count: int
    item_count: int
    member_since: str
    description: str
    logo_url: str | None = None
    logo_public_id: str | None = None


class CategoryPathItem(BaseModel):
    id: str
    name: str


class BlockedRangeSchema(BaseModel):
    start_date: str
    end_date: str
    quantity_blocked: int
    reason: str


class EquipmentDetailResponse(BaseModel):
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
    vendor_id: str
    vendor_name: str
    category_id: str
    category_name: str
    parent_category_id: str | None = None
    parent_category_name: str | None = None
    primary_image_url: str = ""
    primary_image_public_id: str | None = None
    status: str
    images: list[EquipmentImageSchema] = Field(default_factory=list)
    includes: list[str] = Field(default_factory=list)
    specifications: dict[str, Any] = Field(default_factory=dict)
    category_path: list[CategoryPathItem] = Field(default_factory=list)
    vendor: VendorSummarySchema
    blocked_ranges: list[BlockedRangeSchema] = Field(default_factory=list)


class EquipmentAvailabilityResponse(BaseModel):
    available_quantity: int
    next_available_from: str | None = None
    unavailable_days: list[str] = Field(default_factory=list)
    limited_days: dict[str, int] = Field(default_factory=dict)


class ReviewItemSchema(BaseModel):
    review_id: str
    user_name: str
    rating: int
    comment: str | None = None
    vendor_reply: str | None = None
    review_date: str


class ReviewsSummary(BaseModel):
    avg: float
    count: int
    distribution: dict[int, int] = Field(default_factory=dict)


class ReviewsPageResponse(BaseModel):
    items: list[ReviewItemSchema]
    total: int
    summary: ReviewsSummary


ReviewsResponse = ReviewsPageResponse


class VendorListingItem(BaseModel):
    id: str
    name: str
    city: str
    rating: float
    review_count: int
    item_count: int
    verified: bool
    initials: str
    tagline: str


class VendorStorefrontResponse(BaseModel):
    vendor_id: str
    business_name: str
    description: str | None = None
    city: str
    logo_url: str | None = None
    logo_public_id: str | None = None
    avg_rating: float
    review_count: int
    item_count: int
    member_since: str
    equipment: list[EquipmentListingItem] = Field(default_factory=list)
