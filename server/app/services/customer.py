from __future__ import annotations

import re
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ValidationFailedError
from app.models.accounts import User, VendorApprovalStatus
from app.models.catalog import EquipmentStatus
from app.repositories.catalog import get_equipment_available_quantity
from app.repositories.customer import CustomerRepository
from app.services.pricing import CartLineInput, group_by_period, line_total, rental_days

INDIAN_STATES_AND_UTS = {
    "andhra pradesh",
    "arunachal pradesh",
    "assam",
    "bihar",
    "chhattisgarh",
    "goa",
    "gujarat",
    "haryana",
    "himachal pradesh",
    "jharkhand",
    "karnataka",
    "kerala",
    "madhya pradesh",
    "maharashtra",
    "manipur",
    "meghalaya",
    "mizoram",
    "nagaland",
    "odisha",
    "punjab",
    "rajasthan",
    "sikkim",
    "tamil nadu",
    "telangana",
    "tripura",
    "uttar pradesh",
    "uttarakhand",
    "west bengal",
    "andaman and nicobar islands",
    "chandigarh",
    "dadra and nagar haveli and daman and diu",
    "delhi",
    "jammu and kashmir",
    "ladakh",
    "lakshadweep",
    "puducherry",
}

PIN_CODE_REGEX = re.compile(r"^[1-9][0-9]{5}$")
PHONE_REGEX = re.compile(r"^[6-9][0-9]{9}$")


class CustomerService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = CustomerRepository(db)

    # -------------------------------------------------------------------------
    # Cart Operations
    # -------------------------------------------------------------------------
    def get_cart(self, user: User) -> dict[str, Any]:
        cart_rows = self.repo.get_cart_items(user.user_id)
        if not cart_rows:
            return {
                "items": [],
                "periods": [],
                "item_count": 0,
                "subtotal": 0.0,
                "deposit_total": 0.0,
            }

        lines: list[CartLineInput] = []
        formatted_items: list[dict[str, Any]] = []
        total_subtotal_paise = 0
        total_deposit_paise = 0

        for c in cart_rows:
            eq = c.equipment
            if not eq:
                continue

            days = rental_days(c.start_date.isoformat(), c.end_date.isoformat())
            avail_qty = get_equipment_available_quantity(
                self.db,
                eq.equipment_id,
                eq.quantity,
                c.start_date,
                c.end_date,
            )

            # Determine read-time status
            is_active = eq.status == EquipmentStatus.active
            is_approved = bool(
                eq.vendor and eq.vendor.approval_status == VendorApprovalStatus.approved
            )
            if not is_active or not is_approved or avail_qty <= 0:
                line_status = "unavailable"
            elif avail_qty < c.quantity:
                line_status = "low"
            else:
                line_status = "ok"

            primary_img = eq.images[0].url if eq.images else ""
            line_tot = line_total(eq.price_per_day, c.quantity, days)
            dep_tot = Decimal(str(eq.security_deposit)) * Decimal(c.quantity)

            total_subtotal_paise += int(line_tot * Decimal("100"))
            total_deposit_paise += int(dep_tot * Decimal("100"))

            line_dict = {
                "cart_item_id": str(c.cart_item_id),
                "equipment_id": str(c.equipment_id),
                "name": eq.name,
                "category": eq.category.name if eq.category else "",
                "category_id": str(eq.category_id) if eq.category_id else None,
                "vendor_id": str(eq.vendor_id),
                "vendor_name": eq.vendor.business_name if eq.vendor else "",
                "price_per_day": float(eq.price_per_day),
                "security_deposit": float(eq.security_deposit),
                "quantity": c.quantity,
                "start_date": c.start_date.isoformat(),
                "end_date": c.end_date.isoformat(),
                "days": days,
                "primary_image_url": primary_img,
                "delivery_available": bool(eq.delivery_available),
                "min_rental_days": eq.min_rental_days,
                "max_available_quantity": avail_qty,
                "status": line_status,
            }
            formatted_items.append(line_dict)

            lines.append(
                CartLineInput(
                    equipment_id=str(c.equipment_id),
                    name=eq.name,
                    price_per_day=eq.price_per_day,
                    security_deposit=eq.security_deposit,
                    quantity=c.quantity,
                    start_date=c.start_date.isoformat(),
                    end_date=c.end_date.isoformat(),
                    days=days,
                    vendor_id=str(eq.vendor_id),
                    vendor_name=eq.vendor.business_name if eq.vendor else "",
                    delivery_available=bool(eq.delivery_available),
                )
            )

        # Group into periods using pricing service
        cart_periods = group_by_period(lines)
        formatted_periods: list[dict[str, Any]] = []
        for cp in cart_periods:
            v_groups: list[dict[str, Any]] = []
            for vg in cp.vendor_groups:
                vg_lines = [
                    item
                    for item in formatted_items
                    if item["vendor_id"] == vg.vendor_id
                    and item["start_date"] == cp.start_date
                    and item["end_date"] == cp.end_date
                ]
                v_groups.append(
                    {
                        "vendor_id": vg.vendor_id,
                        "vendor_name": vg.vendor_name,
                        "lines": vg_lines,
                        "subtotal": float(vg.subtotal),
                        "deposit_total": float(vg.deposit_total),
                        "delivery_available": vg.delivery_available,
                    }
                )

            period_lines = [
                item
                for item in formatted_items
                if item["start_date"] == cp.start_date and item["end_date"] == cp.end_date
            ]
            formatted_periods.append(
                {
                    "period_key": f"{cp.start_date}_{cp.end_date}",
                    "start_date": cp.start_date,
                    "end_date": cp.end_date,
                    "days": cp.days,
                    "lines": period_lines,
                    "vendor_groups": v_groups,
                }
            )

        return {
            "items": formatted_items,
            "periods": formatted_periods,
            "item_count": len(formatted_items),
            "subtotal": round(total_subtotal_paise / 100.0, 2),
            "deposit_total": round(total_deposit_paise / 100.0, 2),
        }

    def add_cart_item(
        self,
        user: User,
        equipment_id: int,
        quantity: int,
        start_date: date,
        end_date: date,
        override_quantity: bool = False,
    ) -> dict[str, Any]:
        today = date.today()
        if start_date < today:
            raise ValidationFailedError(
                "Rental start date cannot be in the past",
                [{"field": "start_date", "message": "Rental start date cannot be in the past"}],
            )
        if end_date < start_date:
            raise ValidationFailedError(
                "Rental end date must not be before start date",
                [
                    {
                        "field": "end_date",
                        "message": "End date must be greater than or equal to start date",
                    }
                ],
            )
        if (end_date - start_date).days > 365:
            raise ValidationFailedError(
                "Rental duration exceeds maximum allowed duration of 365 days",
                [{"field": "end_date", "message": "Rental duration cannot exceed 365 days"}],
            )
        if quantity < 1 or quantity > 100:
            raise ValidationFailedError(
                "Quantity must be between 1 and 100",
                [{"field": "quantity", "message": "Quantity must be between 1 and 100"}],
            )

        from app.models.catalog import Equipment
        eq = self.db.query(Equipment).filter(Equipment.equipment_id == equipment_id).first()
        if eq and eq.vendor and eq.vendor.user_id == user.user_id:
            raise ValidationFailedError(
                "You cannot book your own equipment listing",
                [{"field": "equipment_id", "message": "You cannot book your own equipment listing"}],
            )

        self.repo.add_cart_item(
            user_id=user.user_id,
            equipment_id=equipment_id,
            quantity=quantity,
            start_date=start_date,
            end_date=end_date,
            override_quantity=override_quantity,
        )
        self.db.commit()
        return self.get_cart(user)

    def update_cart_item(
        self,
        user: User,
        cart_item_id: int,
        quantity: int | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict[str, Any]:
        item = self.repo.get_cart_item_by_id(user.user_id, cart_item_id)
        if not item:
            raise NotFoundError("CartItem", str(cart_item_id))

        today = date.today()
        if start_date is not None and start_date < today:
            raise ValidationFailedError(
                "Rental start date cannot be in the past",
                [{"field": "start_date", "message": "Rental start date cannot be in the past"}],
            )

        chk_start = start_date or item.start_date
        chk_end = end_date or item.end_date
        if chk_end < chk_start:
            raise ValidationFailedError(
                "Rental end date must not be before start date",
                [
                    {
                        "field": "end_date",
                        "message": "End date must be greater than or equal to start date",
                    }
                ],
            )
        if (chk_end - chk_start).days > 365:
            raise ValidationFailedError(
                "Rental duration exceeds maximum allowed duration of 365 days",
                [{"field": "end_date", "message": "Rental duration cannot exceed 365 days"}],
            )

        if quantity is not None:
            if quantity < 1 or quantity > 100:
                raise ValidationFailedError(
                    "Quantity must be between 1 and 100",
                    [{"field": "quantity", "message": "Quantity must be between 1 and 100"}],
                )
            item.quantity = quantity

        if start_date is not None:
            item.start_date = start_date
        if end_date is not None:
            item.end_date = end_date

        self.db.commit()
        return self.get_cart(user)

    def remove_cart_item(self, user: User, cart_item_id: int) -> dict[str, Any]:
        deleted = self.repo.delete_cart_item(user.user_id, cart_item_id)
        if not deleted:
            raise NotFoundError("CartItem", str(cart_item_id))
        self.db.commit()
        return self.get_cart(user)

    def clear_cart(self, user: User) -> None:
        self.repo.clear_cart(user.user_id)
        self.db.commit()

    def move_to_wishlist(self, user: User, cart_item_id: int) -> dict[str, Any]:
        item = self.repo.get_cart_item_by_id(user.user_id, cart_item_id)
        if not item:
            raise NotFoundError("CartItem", str(cart_item_id))

        self.repo.add_wishlist_item(user.user_id, item.equipment_id)
        self.repo.delete_cart_item(user.user_id, cart_item_id)
        self.db.commit()
        return self.get_cart(user)

    def apply_cart_dates(
        self,
        user: User,
        start_date: date,
        end_date: date,
    ) -> dict[str, Any]:
        today = date.today()
        if start_date < today:
            raise ValidationFailedError(
                "Rental start date cannot be in the past",
                [{"field": "start_date", "message": "Rental start date cannot be in the past"}],
            )
        if end_date < start_date:
            raise ValidationFailedError(
                "Rental end date must not be before start date",
                [
                    {
                        "field": "end_date",
                        "message": "End date must be greater than or equal to start date",
                    }
                ],
            )
        if (end_date - start_date).days > 365:
            raise ValidationFailedError(
                "Rental duration exceeds maximum allowed duration of 365 days",
                [{"field": "end_date", "message": "Rental duration cannot exceed 365 days"}],
            )

        cart_items = self.repo.get_cart_items(user.user_id)
        unavailable_items: list[str] = []

        for c in cart_items:
            c.start_date = start_date
            c.end_date = end_date
            if c.equipment:
                avail_qty = get_equipment_available_quantity(
                    self.db,
                    c.equipment_id,
                    c.equipment.quantity,
                    start_date,
                    end_date,
                )
                if avail_qty < c.quantity:
                    unavailable_items.append(c.equipment.name)

        self.db.commit()
        return {
            "cart": self.get_cart(user),
            "unavailable_items": unavailable_items,
        }

    # -------------------------------------------------------------------------
    # Wishlist Operations
    # -------------------------------------------------------------------------
    def get_wishlist(
        self,
        user: User,
        sort: str = "newest",
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> list[dict[str, Any]]:
        wishlist_items = self.repo.get_wishlist_items(user.user_id)
        results: list[dict[str, Any]] = []

        days = 1
        if from_date and to_date and to_date >= from_date:
            days = (to_date - from_date).days + 1

        check_start = from_date or (date.today() + timedelta(days=1))
        check_end = to_date or check_start

        for w in wishlist_items:
            eq = w.equipment
            if not eq:
                continue

            is_active = (eq.status == EquipmentStatus.active)
            is_approved = bool(
                eq.vendor and eq.vendor.approval_status == VendorApprovalStatus.approved
            )
            is_archived = not (is_active and is_approved)

            avail_qty = 0 if is_archived else get_equipment_available_quantity(
                self.db,
                eq.equipment_id,
                eq.quantity,
                check_start,
                check_end,
            )

            img = eq.images[0].url if eq.images else ""
            line_cost = float(line_total(eq.price_per_day, 1, days))

            results.append(
                {
                    "wishlist_id": f"{w.user_id}_{w.equipment_id}",
                    "equipment_id": str(eq.equipment_id),
                    "name": eq.name,
                    "description": eq.description or "",
                    "price_per_day": float(eq.price_per_day),
                    "security_deposit": float(eq.security_deposit),
                    "quantity": eq.quantity,
                    "available_quantity": avail_qty,
                    "min_rental_days": eq.min_rental_days,
                    "delivery_available": bool(eq.delivery_available),
                    "avg_rating": float(eq.avg_rating),
                    "review_count": eq.review_count,
                    "specifications": eq.specifications or {},
                    "primary_image_url": img,
                    "vendor_id": str(eq.vendor_id),
                    "vendor_name": eq.vendor.business_name if eq.vendor else "",
                    "category_id": str(eq.category_id),
                    "category_name": eq.category.name if eq.category else "",
                    "is_available": avail_qty > 0 and not is_archived,
                    "is_archived": is_archived,
                    "total_price": line_cost,
                    "price_for_days": line_cost,
                    "created_at": w.created_at.isoformat(),
                }
            )

        if sort == "price_asc":
            results.sort(key=lambda x: x["price_per_day"])
        elif sort == "price_desc":
            results.sort(key=lambda x: x["price_per_day"], reverse=True)
        else:
            results.sort(key=lambda x: x["created_at"], reverse=True)

        return results

    def add_to_wishlist(self, user: User, equipment_id: int) -> None:
        self.repo.add_wishlist_item(user.user_id, equipment_id)
        self.db.commit()

    def remove_from_wishlist(self, user: User, equipment_id: int) -> None:
        self.repo.remove_wishlist_item(user.user_id, equipment_id)
        self.db.commit()

    # -------------------------------------------------------------------------
    # Address Operations
    # -------------------------------------------------------------------------
    def _validate_address_fields(
        self,
        pincode: str,
        state: str,
    ) -> None:
        errors = []
        if not PIN_CODE_REGEX.match(pincode):
            errors.append(
                {
                    "field": "pincode",
                    "message": "PIN code must be a valid 6-digit Indian postal code starting with digits 1-9",
                }
            )
        clean_state = state.strip().lower()
        if clean_state not in INDIAN_STATES_AND_UTS:
            errors.append(
                {
                    "field": "state",
                    "message": f"'{state}' is not a recognized Indian state or union territory",
                }
            )
        if errors:
            raise ValidationFailedError("Address validation failed", errors)

    def list_addresses(self, user: User) -> list[dict[str, Any]]:
        addr_tuples = self.repo.get_user_addresses(user.user_id)
        return [
            {
                "id": str(addr.address_id),
                "name": user.name,
                "label": addr.label or "Home",
                "line1": addr.line1,
                "line2": addr.line2 or "",
                "city": addr.city,
                "state": addr.state,
                "pincode": addr.pincode,
                "country": addr.country or "India",
                "is_default": bool(addr.is_default),
                "used_in_bookings": booking_count,
                "created_at": addr.created_at.isoformat() if addr.created_at else "",
            }
            for addr, booking_count in addr_tuples
        ]

    def create_address(
        self,
        user: User,
        label: str | None,
        line1: str,
        city: str,
        state: str,
        pincode: str,
        line2: str | None = None,
        is_default: bool = False,
    ) -> dict[str, Any]:
        self._validate_address_fields(pincode, state)
        addr = self.repo.create_address(
            user_id=user.user_id,
            label=label or "Home",
            line1=line1,
            line2=line2,
            city=city,
            state=state,
            pincode=pincode,
            country="India",
            is_default=is_default,
        )
        self.db.commit()
        return {
            "id": str(addr.address_id),
            "name": user.name,
            "label": addr.label or "Home",
            "line1": addr.line1,
            "line2": addr.line2 or "",
            "city": addr.city,
            "state": addr.state,
            "pincode": addr.pincode,
            "country": "India",
            "is_default": bool(addr.is_default),
            "used_in_bookings": 0,
            "created_at": addr.created_at.isoformat() if addr.created_at else "",
        }

    def update_address(
        self,
        user: User,
        address_id: int,
        label: str | None = None,
        line1: str | None = None,
        line2: str | None = None,
        city: str | None = None,
        state: str | None = None,
        pincode: str | None = None,
        is_default: bool | None = None,
    ) -> dict[str, Any]:
        existing = self.repo.get_address_by_id(user.user_id, address_id)
        if not existing:
            raise NotFoundError("Address", str(address_id))

        chk_pin = pincode or existing.pincode
        chk_state = state or existing.state
        self._validate_address_fields(chk_pin, chk_state)

        addr = self.repo.update_address(
            user_id=user.user_id,
            address_id=address_id,
            label=label,
            line1=line1,
            line2=line2,
            city=city,
            state=state,
            pincode=pincode,
            is_default=is_default,
        )
        if not addr:
            raise NotFoundError("Address", str(address_id))

        self.db.commit()
        return {
            "id": str(addr.address_id),
            "name": user.name,
            "label": addr.label or "Home",
            "line1": addr.line1,
            "line2": addr.line2 or "",
            "city": addr.city,
            "state": addr.state,
            "pincode": addr.pincode,
            "country": "India",
            "is_default": bool(addr.is_default),
            "used_in_bookings": 0,
            "created_at": addr.created_at.isoformat() if addr.created_at else "",
        }

    def delete_address(self, user: User, address_id: int) -> None:
        deleted = self.repo.delete_address(user.user_id, address_id)
        if not deleted:
            raise NotFoundError("Address", str(address_id))
        self.db.commit()

    def set_default_address(self, user: User, address_id: int) -> dict[str, Any]:
        addr = self.repo.set_default_address(user.user_id, address_id)
        if not addr:
            raise NotFoundError("Address", str(address_id))
        self.db.commit()
        return {
            "id": str(addr.address_id),
            "name": user.name,
            "label": addr.label or "Home",
            "line1": addr.line1,
            "line2": addr.line2 or "",
            "city": addr.city,
            "state": addr.state,
            "pincode": addr.pincode,
            "country": "India",
            "is_default": bool(addr.is_default),
            "used_in_bookings": 0,
            "created_at": addr.created_at.isoformat() if addr.created_at else "",
        }

    # -------------------------------------------------------------------------
    # Profile & Badges
    # -------------------------------------------------------------------------
    def update_profile(
        self,
        user: User,
        name: str | None = None,
        phone: str | None = None,
    ) -> dict[str, Any]:
        if name is not None:
            clean_name = name.strip()
            if len(clean_name) < 2 or len(clean_name) > 100:
                raise ValidationFailedError(
                    "Name must be between 2 and 100 characters",
                    [{"field": "name", "message": "Name must be between 2 and 100 characters"}],
                )
            user.name = clean_name

        if phone is not None:
            clean_phone = phone.strip()
            if not PHONE_REGEX.match(clean_phone) and not (
                clean_phone.startswith("+") and len(clean_phone) >= 10
            ):
                raise ValidationFailedError(
                    "Phone must be a valid 10-digit number",
                    [
                        {
                            "field": "phone",
                            "message": "Phone number must be a valid 10-digit mobile number",
                        }
                    ],
                )
            user.phone = clean_phone

        self.db.commit()
        return {
            "user_id": str(user.user_id),
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role.value,
            "is_active": bool(user.is_active),
            "created_at": user.created_at.isoformat(),
        }

    def get_badges(self, user: User) -> dict[str, int]:
        return self.repo.get_account_badges(user.user_id)
