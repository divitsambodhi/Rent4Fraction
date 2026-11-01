from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Header, Query, Response, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.catalog import (
    EquipmentAvailabilityResponse,
    EquipmentSearchResponse,
    ReviewsResponse,
)
from app.services.catalog import CatalogService

router = APIRouter(prefix="/api/v1", tags=["Catalog"])


@router.get(
    "/categories",
    response_model=list[dict[str, Any]],
    operation_id="get_categories",
    summary="Get category tree with listable counts",
)
def get_categories(
    response: Response,
    if_none_match: str | None = Header(None, alias="If-None-Match"),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    service = CatalogService(db)
    categories = service.get_categories_tree()
    etag = service.generate_etag(categories)
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "public, max-age=300"

    if if_none_match and if_none_match == etag:
        response.status_code = status.HTTP_304_NOT_MODIFIED
        return []
    return categories


@router.get(
    "/categories/{category_id}",
    response_model=dict[str, Any],
    operation_id="get_category_detail",
    summary="Get single category detail",
)
def get_category_detail(
    category_id: int,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    service = CatalogService(db)
    return service.get_category_by_id(category_id)


@router.get(
    "/equipment",
    response_model=EquipmentSearchResponse,
    operation_id="search_equipment",
    summary="Search equipment catalog with facets and date availability",
)
def search_equipment(
    response: Response,
    q: str | None = Query(None, description="Search keyword"),
    category: str | None = Query(None, description="Category slug or name"),
    vendor: str | None = Query(None, description="Vendor name"),
    price_min: float | None = Query(None, description="Minimum daily rental price"),
    price_max: float | None = Query(None, description="Maximum daily rental price"),
    rating: float | None = Query(None, description="Minimum average rating"),
    delivery: bool | None = Query(None, description="Delivery availability filter"),
    from_date: date | None = Query(None, alias="from", description="Rental start date (inclusive)"),
    to_date: date | None = Query(None, alias="to", description="Rental end date (inclusive)"),
    available: bool | None = Query(None, description="Available only flag"),
    sort: str = Query(
        "relevance",
        description="Sort option (relevance, price_asc, price_desc, rating, reviews, newest)",
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(
        24, ge=1, le=48, alias="pageSize", description="Items per page (max 48)"
    ),
    db: Session = Depends(get_db),
) -> Any:
    service = CatalogService(db)
    res = service.search_equipment(
        q=q,
        category=category,
        vendor=vendor,
        price_min=price_min,
        price_max=price_max,
        rating=rating,
        delivery=delivery,
        from_date=from_date,
        to_date=to_date,
        available=available,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    # Only cache when no date range was queried
    if not from_date and not to_date:
        response.headers["Cache-Control"] = "public, max-age=60"
    else:
        response.headers["Cache-Control"] = "no-store"
    return res


@router.get(
    "/equipment/{equipment_id}",
    response_model=dict[str, Any],
    operation_id="get_equipment_detail",
    summary="Get full equipment detail for product page",
)
def get_equipment_detail(
    equipment_id: int,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    service = CatalogService(db)
    return service.get_equipment_detail(equipment_id)


@router.get(
    "/equipment/{equipment_id}/availability",
    response_model=EquipmentAvailabilityResponse,
    operation_id="get_equipment_availability",
    summary="Get real-time availability breakdown for given date range",
)
def get_equipment_availability(
    response: Response,
    equipment_id: int,
    from_date: date | None = Query(None, alias="from", description="Rental start date (inclusive)"),
    to_date: date | None = Query(None, alias="to", description="Rental end date (inclusive)"),
    start_date: date | None = Query(None, description="Rental start date alias"),
    end_date: date | None = Query(None, description="Rental end date alias"),
    db: Session = Depends(get_db),
) -> Any:
    response.headers["Cache-Control"] = "no-store"
    f_date = from_date or start_date
    t_date = to_date or end_date
    if not f_date or not t_date:
        from app.core.errors import ValidationFailedError
        raise ValidationFailedError("Both start date and end date are required for availability query")
    service = CatalogService(db)
    return service.get_equipment_availability(
        equipment_id=equipment_id,
        from_date=f_date,
        to_date=t_date,
    )


@router.get(
    "/equipment/{equipment_id}/reviews",
    response_model=ReviewsResponse,
    operation_id="get_equipment_reviews",
    summary="Get verified customer reviews and rating distribution",
)
def get_equipment_reviews(
    equipment_id: int,
    rating: int | None = Query(None, ge=1, le=5, description="Filter by star rating"),
    sort: str = Query("newest", description="Sort order: newest, highest, lowest"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, alias="pageSize", description="Items per page"),
    db: Session = Depends(get_db),
) -> Any:
    service = CatalogService(db)
    return service.get_equipment_reviews(
        equipment_id=equipment_id,
        rating=rating,
        sort=sort,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/equipment/{equipment_id}/related",
    response_model=dict[str, Any],
    operation_id="get_related_equipment",
    summary="Get similar equipment and more from the same vendor",
)
def get_related_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    service = CatalogService(db)
    return service.get_related_equipment(equipment_id)


@router.get(
    "/vendors",
    response_model=list[dict[str, Any]],
    operation_id="list_vendors",
    summary="Get approved vendors list ordered by rating",
)
def list_vendors(
    response: Response,
    if_none_match: str | None = Header(None, alias="If-None-Match"),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    service = CatalogService(db)
    vendors = service.list_vendors(limit=limit)
    etag = service.generate_etag(vendors)
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "public, max-age=300"

    if if_none_match and if_none_match == etag:
        response.status_code = status.HTTP_304_NOT_MODIFIED
        return []
    return vendors


@router.get(
    "/vendors/{vendor_id}",
    response_model=dict[str, Any],
    operation_id="get_vendor_storefront",
    summary="Get public vendor storefront profile and catalog",
)
def get_vendor_storefront(
    vendor_id: int,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    service = CatalogService(db)
    return service.get_vendor_storefront(vendor_id)
