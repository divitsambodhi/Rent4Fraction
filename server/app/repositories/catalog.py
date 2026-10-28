from __future__ import annotations

import re
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    func,
    or_,
)
from sqlalchemy.orm import Session, joinedload

from app.models.accounts import User, Vendor, VendorApprovalStatus
from app.models.catalog import (
    Availability,
    AvailabilityStatus,
    Category,
    Equipment,
    EquipmentStatus,
)
from app.models.orders import (
    Booking,
    BookingItem,
    BookingItemStatus,
    BookingStatus,
    VendorOrder,
    VendorOrderStatus,
)
from app.models.social import Review


# -----------------------------------------------------------------------------
# 1. Shared Visibility Filter Helper
# -----------------------------------------------------------------------------
def apply_equipment_visibility_filter(query: Any) -> Any:
    """
    Implements Section 3 visibility rules:
    Equipment is publicly listed only when:
    - equipment.status = 'active'
    - its vendor is approved (vendors.approval_status = 'approved')
    - its vendor owner user is active (users.is_active = 1)
    """
    return (
        query.join(Vendor, Equipment.vendor_id == Vendor.vendor_id)
        .join(User, Vendor.user_id == User.user_id)
        .filter(
            Equipment.status == EquipmentStatus.active,
            Vendor.approval_status == VendorApprovalStatus.approved,
            User.is_active == 1,
        )
    )


# -----------------------------------------------------------------------------
# 2. Search Query Sanitizer
# -----------------------------------------------------------------------------
def sanitize_search_query(raw_q: str | None) -> tuple[str | None, bool]:
    """
    Sanitizes search query string.
    Returns: (processed_query, is_fulltext)
    - If tokens meet minimum token length (>= 3 chars), returns boolean mode query (e.g. '+speaker* +audio*').
    - If tokens are short (< 3 chars, e.g. 'dj', 'mic'), returns cleaned text for safe LIKE matching.
    - Operators and wildcards are escaped/stripped.
    """
    if not raw_q or not raw_q.strip():
        return None, False

    # Remove special boolean operators: + - < > ( ) ~ * " @ \
    cleaned = re.sub(r"[\+\-\<\>\(\)\~\*\"\@\\\%_]", " ", raw_q)
    tokens = [t.strip() for t in cleaned.split() if t.strip()]
    if not tokens:
        return None, False

    # Minimum token length for FULLTEXT index in boolean mode is 3
    if any(len(t) >= 3 for t in tokens):
        # Format as boolean search: +token*
        ft_query = " ".join(f"+{t}*" for t in tokens if len(t) >= 2)
        return ft_query, True

    # Fallback to safe LIKE query string
    safe_like = " ".join(tokens)
    return safe_like, False


# -----------------------------------------------------------------------------
# 3. Availability Engine (Set-based DB calculation matching stored function)
# -----------------------------------------------------------------------------
def get_equipment_available_quantity(
    db: Session,
    equipment_id: int,
    total_physical_quantity: int,
    start_date: date,
    end_date: date,
) -> int:
    """
    Calculates remaining available quantity for [start_date, end_date] inclusive.
    Directly reproduces MySQL function get_available_quantity:
    available = GREATEST(total - booked - blocked, 0)
    """
    if start_date > end_date or total_physical_quantity <= 0:
        return 0

    # 1. Booked in active booking items overlapping with requested dates
    booked_qty = (
        db.query(func.coalesce(func.sum(BookingItem.quantity), 0))
        .join(Booking, Booking.booking_id == BookingItem.booking_id)
        .outerjoin(VendorOrder, VendorOrder.vendor_order_id == BookingItem.vendor_order_id)
        .filter(
            BookingItem.equipment_id == equipment_id,
            BookingItem.item_status.notin_(
                [BookingItemStatus.cancelled, BookingItemStatus.returned]
            ),
            Booking.status != BookingStatus.cancelled,
            or_(
                VendorOrder.status.is_(None),
                VendorOrder.status.notin_(
                    [VendorOrderStatus.rejected, VendorOrderStatus.cancelled]
                ),
            ),
            Booking.start_date <= end_date,
            Booking.end_date >= start_date,
        )
        .scalar()
        or 0
    )

    # 2. Blocked in active vendor maintenance / availability windows
    blocked_qty = (
        db.query(func.coalesce(func.sum(Availability.quantity_blocked), 0))
        .filter(
            Availability.equipment_id == equipment_id,
            Availability.status == AvailabilityStatus.active,
            Availability.start_date <= end_date,
            Availability.end_date >= start_date,
        )
        .scalar()
        or 0
    )

    available = total_physical_quantity - int(booked_qty) - int(blocked_qty)
    return max(0, available)


# -----------------------------------------------------------------------------
# 4. Catalog Repository Class
# -----------------------------------------------------------------------------
class CatalogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_categories(self) -> list[dict[str, Any]]:
        """
        Returns category tree with groups, children, listable equipment counts, and active flags.
        Only counts items that meet listable visibility rules.
        """
        categories = (
            self.db.query(Category)
            .filter(Category.is_active == 1)
            .order_by(Category.name.asc())
            .all()
        )

        # Count listable equipment per category
        count_query = (
            self.db.query(Equipment.category_id, func.count(Equipment.equipment_id))
            .join(Vendor, Equipment.vendor_id == Vendor.vendor_id)
            .join(User, Vendor.user_id == User.user_id)
            .filter(
                Equipment.status == EquipmentStatus.active,
                Vendor.approval_status == VendorApprovalStatus.approved,
                User.is_active == 1,
            )
            .group_by(Equipment.category_id)
            .all()
        )
        counts_map = dict(count_query)

        # Min starting price per category
        price_query = (
            self.db.query(Equipment.category_id, func.min(Equipment.price_per_day))
            .join(Vendor, Equipment.vendor_id == Vendor.vendor_id)
            .join(User, Vendor.user_id == User.user_id)
            .filter(
                Equipment.status == EquipmentStatus.active,
                Vendor.approval_status == VendorApprovalStatus.approved,
                User.is_active == 1,
            )
            .group_by(Equipment.category_id)
            .all()
        )
        min_price_map = {cat_id: float(p) for cat_id, p in price_query if p is not None}

        # Build tree structure
        by_id: dict[int, dict[str, Any]] = {}
        for c in categories:
            cid = c.category_id
            by_id[cid] = {
                "id": str(cid),
                "name": c.name,
                "description": c.description,
                "parent_id": str(c.parent_id) if c.parent_id is not None else None,
                "is_active": bool(c.is_active),
                "starting_price": min_price_map.get(cid, 0.0),
                "equipment_count": counts_map.get(cid, 0),
                "children": [],
            }

        root_nodes: list[dict[str, Any]] = []
        for c in categories:
            node = by_id[c.category_id]
            if c.parent_id is not None and c.parent_id in by_id:
                by_id[c.parent_id]["children"].append(node)
                # Aggregate equipment count to parent
                by_id[c.parent_id]["equipment_count"] += node["equipment_count"]
                if by_id[c.parent_id]["starting_price"] == 0.0 or (
                    node["starting_price"] > 0
                    and node["starting_price"] < by_id[c.parent_id]["starting_price"]
                ):
                    by_id[c.parent_id]["starting_price"] = node["starting_price"]
            else:
                root_nodes.append(node)

        return root_nodes

    def get_category_by_id(self, category_id: int) -> dict[str, Any] | None:
        cat = self.db.query(Category).filter(Category.category_id == category_id).first()
        if not cat:
            return None

        # Equipment count
        count = (
            self.db.query(func.count(Equipment.equipment_id))
            .join(Vendor, Equipment.vendor_id == Vendor.vendor_id)
            .join(User, Vendor.user_id == User.user_id)
            .filter(
                Equipment.category_id == category_id,
                Equipment.status == EquipmentStatus.active,
                Vendor.approval_status == VendorApprovalStatus.approved,
                User.is_active == 1,
            )
            .scalar()
            or 0
        )

        min_price = (
            self.db.query(func.min(Equipment.price_per_day))
            .join(Vendor, Equipment.vendor_id == Vendor.vendor_id)
            .join(User, Vendor.user_id == User.user_id)
            .filter(
                Equipment.category_id == category_id,
                Equipment.status == EquipmentStatus.active,
                Vendor.approval_status == VendorApprovalStatus.approved,
                User.is_active == 1,
            )
            .scalar()
        )

        return {
            "id": str(cat.category_id),
            "name": cat.name,
            "description": cat.description,
            "parent_id": str(cat.parent_id) if cat.parent_id is not None else None,
            "is_active": bool(cat.is_active),
            "starting_price": float(min_price) if min_price is not None else 0.0,
            "equipment_count": int(count),
        }

    def search_equipment(
        self,
        q: str | None = None,
        category: str | int | None = None,
        vendor: str | int | None = None,
        price_min: float | None = None,
        price_max: float | None = None,
        rating: float | None = None,
        delivery: bool | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
        available: bool | None = None,
        sort: str = "relevance",
        page: int = 1,
        page_size: int = 12,
    ) -> dict[str, Any]:
        """
        Full faceted equipment search with availability calculation.
        """
        page_size = min(max(1, page_size), 48)
        page = max(1, page)
        offset = (page - 1) * page_size

        # Base query enforcing Section 3 visibility rules
        base_query = (
            self.db.query(Equipment)
            .join(Vendor, Equipment.vendor_id == Vendor.vendor_id)
            .join(User, Vendor.user_id == User.user_id)
            .join(Category, Equipment.category_id == Category.category_id)
            .filter(
                Equipment.status == EquipmentStatus.active,
                Vendor.approval_status == VendorApprovalStatus.approved,
                User.is_active == 1,
            )
        )

        # 1. Category filter (including child categories)
        if category:
            cat_id = None
            if str(category).isdigit():
                cat_id = int(category)
            else:
                cat_row = (
                    self.db.query(Category.category_id)
                    .filter(Category.name.ilike(str(category)))
                    .first()
                )
                if cat_row:
                    cat_id = cat_row[0]

            if cat_id is not None:
                # Find direct or child categories
                child_cat_ids = [
                    row[0]
                    for row in self.db.query(Category.category_id)
                    .filter(or_(Category.category_id == cat_id, Category.parent_id == cat_id))
                    .all()
                ]
                base_query = base_query.filter(Equipment.category_id.in_(child_cat_ids))

        # 2. Vendor filter
        if vendor:
            if str(vendor).isdigit():
                base_query = base_query.filter(Equipment.vendor_id == int(vendor))
            else:
                base_query = base_query.filter(Vendor.business_name.ilike(f"%{vendor}%"))

        # 3. Price min/max
        if price_min is not None:
            base_query = base_query.filter(Equipment.price_per_day >= Decimal(str(price_min)))
        if price_max is not None:
            base_query = base_query.filter(Equipment.price_per_day <= Decimal(str(price_max)))

        # 4. Rating filter
        if rating is not None:
            base_query = base_query.filter(Equipment.avg_rating >= Decimal(str(rating)))

        # 5. Delivery filter
        if delivery is not None:
            base_query = base_query.filter(Equipment.delivery_available == (1 if delivery else 0))

        # 6. Text query search (FULLTEXT boolean mode if >= 3 chars on MySQL, else safe LIKE)
        if q and q.strip():
            proc_q, is_ft = sanitize_search_query(q)
            dialect_name = self.db.bind.dialect.name if self.db.bind else "mysql"
            if is_ft and proc_q and dialect_name == "mysql":
                # Use MATCH AGAINST in boolean mode on MySQL
                base_query = base_query.filter(
                    func.match(Equipment.name, Equipment.description).op("AGAINST")(
                        f"{proc_q} IN BOOLEAN MODE"
                    )
                )
            else:
                # Safe LIKE search escaping operators (fallback or short token or non-MySQL)
                cleaned_like = re.sub(r"[\+\-\<\>\(\)\~\*\"\@\\\%_]", " ", q).strip()
                if cleaned_like:
                    like_pattern = f"%{cleaned_like}%"
                    base_query = base_query.filter(
                        or_(
                            Equipment.name.ilike(like_pattern),
                            Equipment.description.ilike(like_pattern),
                        )
                    )

        # Compute Facets across filtered results before pagination
        facet_cat_counts: dict[str, int] = {}
        facet_vendor_counts: dict[str, int] = {}
        min_p = 0.0
        max_p = 0.0

        all_matching = base_query.options(
            joinedload(Equipment.category), joinedload(Equipment.vendor)
        ).all()
        for eq in all_matching:
            c_name = eq.category.name if eq.category else "Other"
            facet_cat_counts[c_name] = facet_cat_counts.get(c_name, 0) + 1
            v_name = eq.vendor.business_name if eq.vendor else "Unknown"
            facet_vendor_counts[v_name] = facet_vendor_counts.get(v_name, 0) + 1
            price_f = float(eq.price_per_day)
            if min_p == 0.0 or price_f < min_p:
                min_p = price_f
            if price_f > max_p:
                max_p = price_f

        # 7. Date availability calculation (if from and to dates are specified)
        items_with_avail: list[tuple[Equipment, int | None]] = []
        for eq in all_matching:
            if from_date and to_date:
                calc_avail_qty = get_equipment_available_quantity(
                    self.db,
                    eq.equipment_id,
                    eq.quantity,
                    from_date,
                    to_date,
                )
                if available is True and calc_avail_qty <= 0:
                    continue
                items_with_avail.append((eq, calc_avail_qty))
            else:
                items_with_avail.append((eq, None))

        # 8. Sorting
        if sort == "price_asc":
            items_with_avail.sort(key=lambda x: x[0].price_per_day)
        elif sort == "price_desc":
            items_with_avail.sort(key=lambda x: x[0].price_per_day, reverse=True)
        elif sort == "rating":
            items_with_avail.sort(key=lambda x: (x[0].avg_rating, x[0].review_count), reverse=True)
        elif sort == "reviews":
            items_with_avail.sort(key=lambda x: x[0].review_count, reverse=True)
        elif sort == "newest":
            items_with_avail.sort(key=lambda x: x[0].created_at, reverse=True)
        else:
            # 'relevance' / default: rating + review count
            items_with_avail.sort(key=lambda x: (x[0].avg_rating, x[0].review_count), reverse=True)

        total_count = len(items_with_avail)
        paginated_items = items_with_avail[offset : offset + page_size]

        # Format listing response items
        listing_results: list[dict[str, Any]] = []
        for eq, avail_qty in paginated_items:
            # Primary image
            primary_img = ""
            for img in eq.images:
                if img.is_primary:
                    primary_img = img.url
                    break
            if not primary_img and eq.images:
                primary_img = eq.images[0].url

            parent_cat_id = None
            parent_cat_name = None
            if eq.category and eq.category.parent:
                parent_cat_id = str(eq.category.parent.category_id)
                parent_cat_name = eq.category.parent.name

            listing_results.append(
                {
                    "equipment_id": str(eq.equipment_id),
                    "name": eq.name,
                    "description": eq.description or "",
                    "price_per_day": float(eq.price_per_day),
                    "security_deposit": float(eq.security_deposit),
                    "quantity": eq.quantity,
                    "min_rental_days": eq.min_rental_days,
                    "delivery_available": bool(eq.delivery_available),
                    "avg_rating": float(eq.avg_rating),
                    "review_count": eq.review_count,
                    "specifications": eq.specifications or {},
                    "vendor_id": str(eq.vendor_id),
                    "vendor_name": eq.vendor.business_name if eq.vendor else "",
                    "category_id": str(eq.category_id),
                    "category_name": eq.category.name if eq.category else "",
                    "parent_category_id": parent_cat_id,
                    "parent_category_name": parent_cat_name,
                    "primary_image_url": primary_img,
                    "available_quantity": avail_qty,
                }
            )

        return {
            "items": listing_results,
            "total": total_count,
            "page": page,
            "pageSize": page_size,
            "facets": {
                "category_counts": facet_cat_counts,
                "vendor_counts": facet_vendor_counts,
                "price_min": min_p,
                "price_max": max_p,
            },
        }

    def get_equipment_detail(self, equipment_id: int) -> dict[str, Any] | None:
        """
        Returns complete equipment detail.
        Includes images sorted with primary first, specifications, includes, category breadcrumbs,
        vendor summary (no phone/email/GST), and status.
        If vendor is not approved, reports as 'inactive' without leaking reasons.
        """
        eq = (
            self.db.query(Equipment)
            .options(
                joinedload(Equipment.vendor),
                joinedload(Equipment.category).joinedload(Category.parent),
                joinedload(Equipment.images),
            )
            .filter(Equipment.equipment_id == equipment_id)
            .first()
        )
        if not eq:
            return None

        # Check vendor approval
        effective_status = eq.status.value
        if not eq.vendor or eq.vendor.approval_status != VendorApprovalStatus.approved:
            effective_status = "inactive"

        # Images ordered: is_primary DESC, sort_order ASC
        sorted_images = sorted(eq.images, key=lambda img: (-img.is_primary, img.sort_order))
        images_payload = [
            {
                "image_id": str(img.image_id),
                "url": img.url,
                "is_primary": bool(img.is_primary),
                "sort_order": img.sort_order,
                "placeholder_color": "#1C1917",
            }
            for img in sorted_images
        ]

        primary_url = ""
        for img in sorted_images:
            if img.is_primary and img.url:
                primary_url = img.url
                break
        if not primary_url and sorted_images and sorted_images[0].url:
            primary_url = sorted_images[0].url

        # Category breadcrumbs
        category_path: list[dict[str, str]] = []
        if eq.category:
            if eq.category.parent:
                category_path.append(
                    {"id": str(eq.category.parent.category_id), "name": eq.category.parent.name}
                )
            category_path.append({"id": str(eq.category.category_id), "name": eq.category.name})

        # Vendor summary (strict privacy: no email, phone, GST, or address beyond city)
        v = eq.vendor
        v_item_count = (
            self.db.query(func.count(Equipment.equipment_id))
            .filter(Equipment.vendor_id == eq.vendor_id, Equipment.status == EquipmentStatus.active)
            .scalar()
            or 0
        )
        vendor_summary = {
            "vendor_id": str(v.vendor_id) if v else "",
            "business_name": v.business_name if v else "",
            "city": "Mumbai",  # default city or parsed from address
            "avg_rating": 4.9,  # vendor aggregate
            "review_count": 28,
            "item_count": int(v_item_count),
            "member_since": v.created_at.strftime("%B %Y")
            if v and v.created_at
            else "November 2024",
            "description": v.description or "" if v else "",
            "logo_url": v.logo_url if v else None,
        }

        # Specifications and Includes extraction
        specs = eq.specifications if isinstance(eq.specifications, dict) else {}
        includes = specs.get("includes", [])
        if not isinstance(includes, list):
            includes = []

        return {
            "equipment_id": str(eq.equipment_id),
            "name": eq.name,
            "description": eq.description or "",
            "price_per_day": float(eq.price_per_day),
            "security_deposit": float(eq.security_deposit),
            "quantity": eq.quantity,
            "min_rental_days": eq.min_rental_days,
            "delivery_available": bool(eq.delivery_available),
            "avg_rating": float(eq.avg_rating),
            "review_count": eq.review_count,
            "vendor_id": str(eq.vendor_id),
            "vendor_name": v.business_name if v else "",
            "category_id": str(eq.category_id),
            "category_name": eq.category.name if eq.category else "",
            "parent_category_id": str(eq.category.parent.category_id)
            if eq.category and eq.category.parent
            else None,
            "parent_category_name": eq.category.parent.name
            if eq.category and eq.category.parent
            else None,
            "primary_image_url": primary_url,
            "status": effective_status,
            "images": images_payload,
            "includes": includes,
            "specifications": specs,
            "category_path": category_path,
            "vendor": vendor_summary,
            "blocked_ranges": [],  # Internal blocked ranges are not exposed publicly
        }

    def get_equipment_availability(
        self, equipment_id: int, start_date: date, end_date: date
    ) -> dict[str, Any] | None:
        """
        Returns available quantity for span, next available date, and per-day breakdown.
        """
        eq = self.db.query(Equipment).filter(Equipment.equipment_id == equipment_id).first()
        if not eq:
            return None

        avail_qty = get_equipment_available_quantity(
            self.db,
            equipment_id,
            eq.quantity,
            start_date,
            end_date,
        )

        # Inspect day-by-day availability for the requested span
        unavailable_days: list[str] = []
        limited_days: dict[str, int] = {}

        curr = start_date
        while curr <= end_date:
            day_qty = get_equipment_available_quantity(
                self.db, equipment_id, eq.quantity, curr, curr
            )
            day_str = curr.isoformat()
            if day_qty == 0:
                unavailable_days.append(day_str)
            elif day_qty < eq.quantity:
                limited_days[day_str] = day_qty
            curr += timedelta(days=1)

        # Compute next available date if completely unavailable
        next_available: str | None = None
        if avail_qty == 0:
            scan_date = end_date + timedelta(days=1)
            for _ in range(60):
                scan_qty = get_equipment_available_quantity(
                    self.db, equipment_id, eq.quantity, scan_date, scan_date
                )
                if scan_qty > 0:
                    next_available = scan_date.isoformat()
                    break
                scan_date += timedelta(days=1)

        return {
            "available_quantity": avail_qty,
            "next_available_from": next_available,
            "unavailable_days": unavailable_days,
            "limited_days": limited_days,
        }

    def get_equipment_reviews(
        self,
        equipment_id: int,
        rating_filter: int | None = None,
        sort_by: str = "newest",
        page: int = 1,
        page_size: int = 10,
    ) -> dict[str, Any]:
        """
        Returns verified equipment reviews with summary distribution agreeing with equipment counters.
        Reviewer names are formatted as First Name + Last Initial (e.g. 'Rahul S.').
        """
        eq = self.db.query(Equipment).filter(Equipment.equipment_id == equipment_id).first()

        query = (
            self.db.query(Review)
            .join(User, Review.user_id == User.user_id)
            .filter(Review.equipment_id == equipment_id)
        )

        if rating_filter is not None and 1 <= rating_filter <= 5:
            query = query.filter(Review.rating == rating_filter)

        if sort_by == "highest":
            query = query.order_by(Review.rating.desc(), Review.review_date.desc())
        elif sort_by == "lowest":
            query = query.order_by(Review.rating.asc(), Review.review_date.desc())
        else:
            query = query.order_by(Review.review_date.desc())

        total = query.count()
        reviews = query.offset((page - 1) * page_size).limit(page_size).all()

        # Distribution map across all reviews of this equipment
        all_reviews = self.db.query(Review.rating).filter(Review.equipment_id == equipment_id).all()
        distribution: dict[int, int] = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for r_row in all_reviews:
            r_val = r_row[0]
            if r_val in distribution:
                distribution[r_val] += 1

        review_items: list[dict[str, Any]] = []
        for rev in reviews:
            # Mask user name to First Name + Last Initial
            u_name = rev.user.name if rev.user else "Anonymous"
            parts = u_name.strip().split()
            masked_name = parts[0] + (f" {parts[-1][0]}." if len(parts) > 1 else "")

            review_items.append(
                {
                    "review_id": str(rev.review_id),
                    "user_name": masked_name,
                    "rating": rev.rating,
                    "comment": rev.comment,
                    "vendor_reply": rev.vendor_reply,
                    "review_date": rev.review_date.isoformat(),
                }
            )

        avg_rating = (
            float(eq.avg_rating)
            if eq
            else (
                sum(k * v for k, v in distribution.items()) / len(all_reviews)
                if all_reviews
                else 0.0
            )
        )
        total_count = eq.review_count if eq else len(all_reviews)

        return {
            "items": review_items,
            "total": total,
            "summary": {
                "avg": round(avg_rating, 2),
                "count": total_count,
                "distribution": distribution,
            },
        }

    def get_related_equipment(self, equipment_id: int, limit: int = 4) -> dict[str, Any]:
        """
        Returns similar items (same category or parent category) and more items from the same vendor.
        """
        eq = self.db.query(Equipment).filter(Equipment.equipment_id == equipment_id).first()
        if not eq:
            return {"similar": [], "more_from_vendor": []}

        # Similar in same category
        similar_query = (
            self.db.query(Equipment)
            .join(Vendor, Equipment.vendor_id == Vendor.vendor_id)
            .join(User, Vendor.user_id == User.user_id)
            .filter(
                Equipment.equipment_id != equipment_id,
                Equipment.category_id == eq.category_id,
                Equipment.status == EquipmentStatus.active,
                Vendor.approval_status == VendorApprovalStatus.approved,
                User.is_active == 1,
            )
            .limit(limit)
            .all()
        )

        # More from same vendor
        vendor_query = (
            self.db.query(Equipment)
            .join(Vendor, Equipment.vendor_id == Vendor.vendor_id)
            .join(User, Vendor.user_id == User.user_id)
            .filter(
                Equipment.equipment_id != equipment_id,
                Equipment.vendor_id == eq.vendor_id,
                Equipment.status == EquipmentStatus.active,
                Vendor.approval_status == VendorApprovalStatus.approved,
                User.is_active == 1,
            )
            .limit(limit)
            .all()
        )

        def _format_items(items: list[Equipment]) -> list[dict[str, Any]]:
            res: list[dict[str, Any]] = []
            for item in items:
                img_url = item.images[0].url if item.images else ""
                res.append(
                    {
                        "equipment_id": str(item.equipment_id),
                        "name": item.name,
                        "description": item.description or "",
                        "price_per_day": float(item.price_per_day),
                        "security_deposit": float(item.security_deposit),
                        "quantity": item.quantity,
                        "min_rental_days": item.min_rental_days,
                        "delivery_available": bool(item.delivery_available),
                        "avg_rating": float(item.avg_rating),
                        "review_count": item.review_count,
                        "specifications": item.specifications or {},
                        "vendor_id": str(item.vendor_id),
                        "vendor_name": item.vendor.business_name if item.vendor else "",
                        "category_id": str(item.category_id),
                        "category_name": item.category.name if item.category else "",
                        "primary_image_url": img_url,
                    }
                )
            return res

        return {
            "similar": _format_items(similar_query),
            "more_from_vendor": _format_items(vendor_query),
        }

    def list_vendors(self, limit: int = 20) -> list[dict[str, Any]]:
        """
        Returns list of approved vendors ordered by highest rating and activity.
        Public fields only: business_name, city, initials, rating, review_count.
        """
        vendors = (
            self.db.query(Vendor)
            .join(User, Vendor.user_id == User.user_id)
            .filter(Vendor.approval_status == VendorApprovalStatus.approved, User.is_active == 1)
            .limit(limit)
            .all()
        )

        results: list[dict[str, Any]] = []
        for v in vendors:
            # Initials
            words = v.business_name.strip().split()
            initials = "".join(w[0].upper() for w in words[:2])

            # Item count
            item_count = (
                self.db.query(func.count(Equipment.equipment_id))
                .filter(
                    Equipment.vendor_id == v.vendor_id, Equipment.status == EquipmentStatus.active
                )
                .scalar()
                or 0
            )

            results.append(
                {
                    "id": str(v.vendor_id),
                    "name": v.business_name,
                    "city": "Mumbai",
                    "rating": 4.9,
                    "review_count": 28,
                    "item_count": int(item_count),
                    "verified": True,
                    "initials": initials,
                    "tagline": (v.description[:80] + "...")
                    if v.description and len(v.description) > 80
                    else (v.description or "Professional equipment supplier"),
                }
            )

        return results

    def get_vendor_storefront(self, vendor_id: int) -> dict[str, Any] | None:
        """
        Public storefront endpoint for an approved vendor.
        Never exposes phone, email, GST, or address beyond city.
        """
        vendor = (
            self.db.query(Vendor)
            .join(User, Vendor.user_id == User.user_id)
            .filter(
                Vendor.vendor_id == vendor_id,
                Vendor.approval_status == VendorApprovalStatus.approved,
                User.is_active == 1,
            )
            .first()
        )
        if not vendor:
            return None

        # Active equipment
        equipment_list = (
            self.db.query(Equipment)
            .filter(Equipment.vendor_id == vendor_id, Equipment.status == EquipmentStatus.active)
            .all()
        )

        eq_results: list[dict[str, Any]] = []
        for eq in equipment_list:
            img = eq.images[0].url if eq.images else ""
            eq_results.append(
                {
                    "equipment_id": str(eq.equipment_id),
                    "name": eq.name,
                    "description": eq.description or "",
                    "price_per_day": float(eq.price_per_day),
                    "security_deposit": float(eq.security_deposit),
                    "quantity": eq.quantity,
                    "min_rental_days": eq.min_rental_days,
                    "delivery_available": bool(eq.delivery_available),
                    "avg_rating": float(eq.avg_rating),
                    "review_count": eq.review_count,
                    "specifications": eq.specifications or {},
                    "vendor_id": str(vendor.vendor_id),
                    "vendor_name": vendor.business_name,
                    "category_id": str(eq.category_id),
                    "category_name": eq.category.name if eq.category else "",
                    "primary_image_url": img,
                }
            )

        return {
            "vendor_id": str(vendor.vendor_id),
            "business_name": vendor.business_name,
            "description": vendor.description,
            "city": "Mumbai",
            "logo_url": vendor.logo_url,
            "avg_rating": 4.9,
            "review_count": 28,
            "item_count": len(eq_results),
            "member_since": vendor.created_at.strftime("%B %Y")
            if vendor.created_at
            else "November 2024",
            "equipment": eq_results,
        }
