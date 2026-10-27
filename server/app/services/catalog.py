from __future__ import annotations

import hashlib
import json
from datetime import date
from pathlib import Path
from typing import Any, cast

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ValidationFailedError
from app.repositories.catalog import CatalogRepository


class CatalogService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = CatalogRepository(db)

    def get_categories_tree(self) -> list[dict[str, Any]]:
        """
        Returns full category tree with groups, listable item counts, and active flags.
        """
        return self.repo.get_categories()

    def get_category_by_id(self, category_id: int) -> dict[str, Any]:
        cat = self.repo.get_category_by_id(category_id)
        if not cat:
            raise NotFoundError("Category", str(category_id))
        return cat

    def search_equipment(
        self,
        q: str | None = None,
        category: str | None = None,
        vendor: str | None = None,
        price_min: float | None = None,
        price_max: float | None = None,
        rating: float | None = None,
        delivery: bool | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
        available: bool | None = None,
        sort: str = "relevance",
        page: int = 1,
        page_size: int = 24,
    ) -> dict[str, Any]:
        """
        Validates date ranges and pagination parameters, then searches equipment.
        Dates: end >= start, start not in past, span <= 365 days.
        Page size is capped at 48.
        """
        today = date.today()
        if from_date and from_date < today:
            raise ValidationFailedError(
                "Rental start date cannot be in the past",
                [{"field": "from", "message": "Rental start date cannot be in the past"}],
            )
        if from_date and to_date:
            if to_date < from_date:
                raise ValidationFailedError(
                    "Rental end date must not be before start date",
                    [{"field": "to", "message": "End date must be greater than or equal to start date"}],
                )
            if (to_date - from_date).days > 365:
                raise ValidationFailedError(
                    "Rental duration exceeds maximum allowed duration of 365 days",
                    [{"field": "to", "message": "Rental duration cannot exceed 365 days"}],
                )

        capped_page_size = min(max(1, page_size), 48)
        safe_page = max(1, page)

        return self.repo.search_equipment(
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
            page=safe_page,
            page_size=capped_page_size,
        )

    def get_equipment_detail(self, equipment_id: int) -> dict[str, Any]:
        detail = self.repo.get_equipment_detail(equipment_id)
        if not detail:
            raise NotFoundError("Equipment", str(equipment_id))
        return detail

    def get_equipment_availability(
        self,
        equipment_id: int,
        from_date: date,
        to_date: date,
    ) -> dict[str, Any]:
        today = date.today()
        if from_date < today:
            raise ValidationFailedError(
                "Rental start date cannot be in the past",
                [{"field": "from", "message": "Rental start date cannot be in the past"}],
            )
        if to_date < from_date:
            raise ValidationFailedError(
                "Rental end date must not be before start date",
                [{"field": "to", "message": "End date must be greater than or equal to start date"}],
            )
        if (to_date - from_date).days > 365:
            raise ValidationFailedError(
                "Rental duration exceeds maximum allowed duration of 365 days",
                [{"field": "to", "message": "Rental duration cannot exceed 365 days"}],
            )

        avail = self.repo.get_equipment_availability(equipment_id, from_date, to_date)
        if not avail:
            raise NotFoundError("Equipment", str(equipment_id))
        return avail

    def get_equipment_reviews(
        self,
        equipment_id: int,
        rating: int | None = None,
        sort: str = "newest",
        page: int = 1,
        page_size: int = 10,
    ) -> dict[str, Any]:
        capped_page_size = min(max(1, page_size), 50)
        safe_page = max(1, page)
        return self.repo.get_equipment_reviews(
            equipment_id=equipment_id,
            rating_filter=rating,
            sort_by=sort,
            page=safe_page,
            page_size=capped_page_size,
        )

    def get_related_equipment(self, equipment_id: int) -> dict[str, Any]:
        related = self.repo.get_related_equipment(equipment_id)
        if not related:
            raise NotFoundError("Equipment", str(equipment_id))
        return related

    def list_vendors(self, limit: int = 20) -> list[dict[str, Any]]:
        return self.repo.list_vendors(limit=limit)

    def get_vendor_storefront(self, vendor_id: int) -> dict[str, Any]:
        storefront = self.repo.get_vendor_storefront(vendor_id)
        if not storefront:
            raise NotFoundError("Vendor", str(vendor_id))
        return storefront

    @staticmethod
    def get_faqs() -> list[dict[str, Any]]:
        faq_path = Path(__file__).resolve().parent.parent / "content" / "faqs.json"
        if faq_path.exists():
            with open(faq_path, encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return cast(list[dict[str, Any]], data)
                if isinstance(data, dict) and "faqs" in data and isinstance(data["faqs"], list):
                    return cast(list[dict[str, Any]], data["faqs"])
        return []

    @staticmethod
    def generate_etag(data: Any) -> str:
        """
        Generates an MD5-based ETag string for cached public responses.
        """
        raw = json.dumps(data, sort_keys=True, default=str)
        return f'"{hashlib.md5(raw.encode("utf-8")).hexdigest()}"'
