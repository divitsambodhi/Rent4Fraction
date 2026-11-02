from __future__ import annotations

import re
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import String, and_, func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.errors import ConflictError, NotFoundError, ValidationFailedError
from app.models.accounts import Vendor
from app.models.catalog import Equipment
from app.models.fulfilment import (
    DamageReport,
    DamageReportStatus,
    Return,
    ReturnItem,
)
from app.models.orders import (
    Booking,
    BookingItem,
    BookingItemStatus,
    BookingPaymentStatus,
    BookingStatus,
    Coupon,
    VendorOrder,
    VendorOrderStatus,
)
from app.models.payments import Payment, PaymentStatus, PaymentType
from app.models.platform import OrderEvent
from app.models.social import Notification, Review


class BookingRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # -------------------------------------------------------------------------
    # Coupon Operations
    # -------------------------------------------------------------------------
    def get_coupon_by_code(self, code: str) -> Coupon | None:
        return self.db.query(Coupon).filter(func.lower(Coupon.code) == code.strip().lower()).first()

    # -------------------------------------------------------------------------
    # Customer Bookings List & Counts
    # -------------------------------------------------------------------------
    def get_user_bookings(
        self,
        user_id: int,
        status_filter: str = "all",
        search_query: str | None = None,
        page: int = 1,
        page_size: int = 6,
    ) -> tuple[list[dict[str, Any]], int, dict[str, int]]:
        """
        Returns (booking_summaries, total_for_filter, counts_by_tab).
        Tabs: 'all', 'upcoming', 'ongoing', 'completed', 'cancelled'.
        """
        today = date.today()

        # Compute counts by tab across all customer's bookings
        all_user_bookings = self.db.query(Booking).filter(Booking.user_id == user_id).all()
        counts: dict[str, int] = {
            "all": len(all_user_bookings),
            "upcoming": 0,
            "ongoing": 0,
            "completed": 0,
            "cancelled": 0,
        }
        for b in all_user_bookings:
            if b.status == BookingStatus.cancelled:
                counts["cancelled"] += 1
            elif b.status == BookingStatus.completed:
                counts["completed"] += 1
            elif b.start_date > today and b.status in [
                BookingStatus.pending,
                BookingStatus.confirmed,
            ]:
                counts["upcoming"] += 1
            elif b.start_date <= today <= b.end_date or b.status == BookingStatus.in_progress:
                counts["ongoing"] += 1
            else:
                counts["upcoming"] += 1

        # Build query for the requested filter
        query = (
            self.db.query(Booking)
            .options(
                joinedload(Booking.vendor_orders).joinedload(VendorOrder.vendor),
                joinedload(Booking.address),
            )
            .filter(Booking.user_id == user_id)
        )

        # Apply Tab Filter
        if status_filter == "upcoming":
            query = query.filter(
                Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
                Booking.start_date > today,
            )
        elif status_filter == "ongoing":
            query = query.filter(
                or_(
                    and_(Booking.start_date <= today, Booking.end_date >= today),
                    Booking.status == BookingStatus.in_progress,
                ),
                Booking.status != BookingStatus.cancelled,
            )
        elif status_filter == "completed":
            query = query.filter(Booking.status == BookingStatus.completed)
        elif status_filter == "cancelled":
            query = query.filter(Booking.status == BookingStatus.cancelled)

        # Apply search query (event name, event type, or booking ID)
        if search_query and search_query.strip():
            raw_sq = search_query.strip()
            sq_pattern = f"%{raw_sq}%"
            search_filters = [
                Booking.event_name.ilike(sq_pattern),
                Booking.event_type.ilike(sq_pattern),
                func.cast(Booking.booking_id, String).ilike(sq_pattern),
            ]
            m = re.match(r"^(?:[Bb][Kk]-?0*|0*)?(\d+)$", raw_sq)
            if m:
                num_id = int(m.group(1))
                if num_id > 0:
                    search_filters.append(Booking.booking_id == num_id)
            query = query.filter(or_(*search_filters))

        total_for_filter = query.count()
        bookings = (
            query.order_by(Booking.booking_date.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        summaries: list[dict[str, Any]] = []
        for b in bookings:
            rental_days_val = (b.end_date - b.start_date).days + 1

            # Vendor avatars
            vendor_avatars: list[dict[str, str]] = []
            seen_vendors: set[int] = set()
            for vo in b.vendor_orders:
                if vo.vendor and vo.vendor.vendor_id not in seen_vendors:
                    seen_vendors.add(vo.vendor.vendor_id)
                    words = vo.vendor.business_name.strip().split()
                    initials = "".join(w[0].upper() for w in words[:2])
                    vendor_avatars.append(
                        {
                            "id": str(vo.vendor.vendor_id),
                            "name": vo.vendor.business_name,
                            "initials": initials,
                        }
                    )

            # Item count
            item_count = (
                self.db.query(func.count(BookingItem.booking_item_id))
                .filter(BookingItem.booking_id == b.booking_id)
                .scalar()
                or 0
            )

            city = b.delivery_city or (b.address.city if b.address else "Mumbai")

            # Determine actions needed
            action_needed: list[str] = []
            if b.payment_status == BookingPaymentStatus.unpaid:
                action_needed.append("Payment pending")
            # Check for reported damage reports
            reported_count = (
                self.db.query(func.count(DamageReport.report_id))
                .join(ReturnItem, DamageReport.return_item_id == ReturnItem.return_item_id)
                .join(BookingItem, ReturnItem.booking_item_id == BookingItem.booking_item_id)
                .filter(
                    BookingItem.booking_id == b.booking_id,
                    DamageReport.status == DamageReportStatus.reported,
                )
                .scalar()
                or 0
            )
            if reported_count > 0:
                action_needed.append(f"{reported_count} damage report awaiting review")

            summaries.append(
                {
                    "booking_id": f"BK-{b.booking_id:04d}",
                    "event_name": b.event_name or "Event Rental",
                    "event_type": b.event_type or "Corporate event",
                    "status": b.status.value,
                    "payment_status": b.payment_status.value,
                    "start_date": b.start_date.isoformat(),
                    "end_date": b.end_date.isoformat(),
                    "rental_days": rental_days_val,
                    "delivery_city": city,
                    "vendor_count": len(vendor_avatars),
                    "item_count": int(item_count),
                    "vendor_avatars": vendor_avatars,
                    "total_amount": float(b.total_amount),
                    "action_needed": action_needed,
                    "created_at": b.booking_date.isoformat(),
                }
            )

        return summaries, total_for_filter, counts

    # -------------------------------------------------------------------------
    # Booking Detail Assembler
    # -------------------------------------------------------------------------
    def get_booking_detail(self, booking_id: int, user_id: int | None = None) -> dict[str, Any] | None:
        """
        Assembles complete booking detail matching client's BookingDetail schema.
        When user_id is provided, enforces strict IDOR isolation.
        """
        query = (
            self.db.query(Booking)
            .options(
                joinedload(Booking.address),
                joinedload(Booking.coupon),
                joinedload(Booking.vendor_orders).joinedload(VendorOrder.vendor),
                joinedload(Booking.vendor_orders).joinedload(VendorOrder.deliveries),
                joinedload(Booking.vendor_orders)
                .joinedload(VendorOrder.returns)
                .joinedload(Return.items),
                joinedload(Booking.payments),
            )
            .filter(Booking.booking_id == booking_id)
        )
        if user_id is not None:
            query = query.filter(Booking.user_id == user_id)
        b = query.first()
        if not b:
            return None

        # 1. Delivery Address Snapshot (with graceful fallback to address relation)
        snapshot = b.delivery_address_snapshot
        if not snapshot and b.address:
            snapshot = {
                "name": b.user.name if b.user else "Customer",
                "line1": b.address.line1,
                "line2": b.address.line2,
                "city": b.address.city,
                "state": b.address.state,
                "pincode": b.address.pincode,
                "country": b.address.country,
            }

        # 2. Items with reviews & damage reports
        items = (
            self.db.query(BookingItem)
            .options(
                joinedload(BookingItem.equipment).joinedload(Equipment.images),
                joinedload(BookingItem.vendor),
                joinedload(BookingItem.reviews),
            )
            .filter(BookingItem.booking_id == booking_id)
            .all()
        )

        item_details: list[dict[str, Any]] = []
        for it in items:
            # Review if exists
            rev_data = None
            if it.reviews:
                r = it.reviews[0]
                rev_data = {
                    "review_id": str(r.review_id),
                    "booking_id": f"BK-{b.booking_id:04d}",
                    "equipment_id": str(it.equipment_id),
                    "equipment_name": it.equipment.name if it.equipment else "",
                    "rating": r.rating,
                    "comment": r.comment,
                    "vendor_reply": r.vendor_reply,
                    "created_at": r.review_date.isoformat(),
                }

            # Damage report if exists
            damage_report_data = None
            ret_item = (
                self.db.query(ReturnItem)
                .options(joinedload(ReturnItem.damage_report))
                .filter(ReturnItem.booking_item_id == it.booking_item_id)
                .first()
            )
            if ret_item and ret_item.damage_report:
                dr = ret_item.damage_report
                damage_report_data = {
                    "report_id": str(dr.report_id),
                    "equipment_id": str(it.equipment_id),
                    "equipment_name": it.equipment.name if it.equipment else "",
                    "description": dr.description,
                    "repair_cost": float(dr.damage_cost),
                    "damage_cost": float(dr.damage_cost),
                    "deducted_from_deposit": dr.deducted_from_deposit,
                    "status": dr.status.value,
                    "dispute_reason": dr.dispute_reason,
                    "filed_at": dr.created_at.isoformat(),
                    "resolved_at": dr.resolved_at.isoformat() if dr.resolved_at else None,
                    "resolution_note": dr.resolution_note,
                }

            primary_img = ""
            if it.equipment and it.equipment.images:
                primary_img = it.equipment.images[0].url

            item_details.append(
                {
                    "item_id": str(it.booking_item_id),
                    "equipment_id": str(it.equipment_id),
                    "name": it.equipment.name if it.equipment else "",
                    "image_url": primary_img,
                    "unit_price": float(it.price_per_day),
                    "quantity": it.quantity,
                    "days": it.days,
                    "total_price": float(it.total_price),
                    "status": it.item_status.value,
                    "vendor_id": str(it.vendor_id),
                    "vendor_name": it.vendor.business_name if it.vendor else "",
                    "security_deposit": float(it.deposit_amount),
                    "category": it.equipment.category.name
                    if it.equipment and it.equipment.category
                    else "",
                    "review": rev_data,
                    "damage_report": damage_report_data,
                    "commission_rate": float(it.commission_rate),
                    "commission_amount": float(it.commission_amount),
                }
            )

        # 3. Vendor Orders with deliveries & returns
        vendor_orders_payload: list[dict[str, Any]] = []
        for vo in b.vendor_orders:
            v_name = vo.vendor.business_name if vo.vendor else ""
            words = v_name.strip().split()
            initials = "".join(w[0].upper() for w in words[:2])

            # Delivery tracking
            deliv_data = None
            if vo.deliveries:
                d = vo.deliveries
                deliv_data = {
                    "type": d.type.value,
                    "status": d.status.value,
                    "scheduled_window": f"{d.scheduled_start.strftime('%I:%M %p')} - {d.scheduled_end.strftime('%I:%M %p')}"
                    if d.scheduled_start and d.scheduled_end
                    else "10:00 AM - 12:00 PM",
                    "tracking_info": d.tracking_info,
                    "delivered_by": d.delivered_by,
                    "delivery_proof_url": d.proof_url,
                    "delivery_proof_public_id": getattr(d, "proof_public_id", None),
                    "failure_reason": None,
                    "updated_at": d.updated_at.isoformat(),
                }

            # Return tracking
            ret_data = None
            if vo.returns:
                ret_obj = vo.returns
                ret_data = {
                    "status": ret_obj.status.value,
                    "scheduled_window": f"{ret_obj.scheduled_start.strftime('%I:%M %p')} - {ret_obj.scheduled_end.strftime('%I:%M %p')}"
                    if ret_obj.scheduled_start and ret_obj.scheduled_end
                    else None,
                    "returned_at": ret_obj.return_date.isoformat() if ret_obj.return_date else None,
                    "inspected_at": ret_obj.updated_at.isoformat()
                    if ret_obj.status.value == "returned"
                    else None,
                    "condition": "good",
                    "notes": ret_obj.note,
                }

            vo_item_ids = [
                str(it.booking_item_id) for it in items if it.vendor_order_id == vo.vendor_order_id
            ]

            # Vendor contact privacy: reveal phone once accepted
            v_phone = None
            if vo.status.value not in ("pending", "rejected") and vo.vendor:
                v_phone = vo.vendor.phone

            vendor_orders_payload.append(
                {
                    "vendor_order_id": str(vo.vendor_order_id),
                    "vendor_id": str(vo.vendor_id),
                    "vendor_name": v_name,
                    "vendor_initials": initials,
                    "vendor_phone": v_phone,
                    "status": vo.status.value,
                    "rejection_reason": vo.rejection_reason,
                    "subtotal": float(vo.subtotal),
                    "delivery_fee": float(vo.delivery_fee),
                    "item_ids": vo_item_ids,
                    "delivery": deliv_data,
                    "return": ret_data,
                    "fulfilment_type": getattr(vo, "fulfilment_type", "delivery"),
                }
            )

        # 4. Payments
        payments_payload = [
            {
                "payment_id": str(p.payment_id),
                "booking_id": f"BK-{b.booking_id:04d}",
                "event_name": b.event_name or "Event Rental",
                "type": p.type.value,
                "method": p.method.value if p.method else "card",
                "amount": float(p.amount),
                "status": p.status.value,
                "created_at": p.created_at.isoformat(),
                "reference": p.transaction_id or f"TXN-{p.payment_id:06d}",
                "refund_reference": p.refund_reference,
            }
            for p in b.payments
        ]

        # 5. Deposit Summary derivation
        held = float(b.security_deposit)
        deducted = 0.0
        for it_dict in item_details:
            if (
                it_dict.get("damage_report")
                and it_dict["damage_report"].get("status") == "resolved"
            ):
                deducted += it_dict["damage_report"].get("damage_cost", 0.0)

        # Deposit refunds recorded
        refunded = sum(
            float(p.amount)
            for p in b.payments
            if p.type == PaymentType.deposit_refund and p.status == PaymentStatus.success
        )
        pending_refund = max(0.0, held - deducted - refunded)

        deposit_summary = {
            "held": held,
            "deducted": deducted,
            "refunded": refunded,
            "pending_refund": pending_refund,
        }

        # 6. Price Summary
        price_summary = {
            "subtotal": float(b.subtotal),
            "discount": float(b.discount),
            "coupon_code": b.coupon.code if b.coupon else None,
            "tax": float(b.tax),
            "delivery_fee": float(b.delivery_fee),
            "security_deposit": float(b.security_deposit),
            "total": float(b.total_amount),
        }

        # 7. Activity Timeline from order_events
        events = (
            self.db.query(OrderEvent)
            .filter(OrderEvent.booking_id == booking_id)
            .order_by(OrderEvent.created_at.asc())
            .all()
        )
        activity: list[dict[str, Any]] = [
            {
                "id": str(ev.order_event_id),
                "title": ev.event_type.replace("_", " ").title(),
                "description": ev.note or f"Status changed from {ev.from_status} to {ev.to_status}",
                "timestamp": ev.created_at.isoformat(),
                "type": "order",
                "actor": ev.actor_role.title(),
            }
            for ev in events
        ]

        # Vendor avatars for summary
        vendor_avatars = [
            {"id": vo["vendor_id"], "name": vo["vendor_name"], "initials": vo["vendor_initials"]}
            for vo in vendor_orders_payload
        ]

        rental_days_val = (b.end_date - b.start_date).days + 1

        return {
            "booking_id": f"BK-{b.booking_id:04d}",
            "event_name": b.event_name or "Event Rental",
            "event_type": b.event_type or "Corporate event",
            "status": b.status.value,
            "payment_status": b.payment_status.value,
            "start_date": b.start_date.isoformat(),
            "end_date": b.end_date.isoformat(),
            "rental_days": rental_days_val,
            "delivery_city": snapshot.get("city", "Mumbai") if snapshot else "Mumbai",
            "vendor_count": len(vendor_orders_payload),
            "item_count": len(items),
            "vendor_avatars": vendor_avatars,
            "total_amount": float(b.total_amount),
            "action_needed": [],
            "created_at": b.booking_date.isoformat(),
            "delivery_address": snapshot or {},
            "vendor_orders": vendor_orders_payload,
            "items": item_details,
            "payments": payments_payload,
            "deposit": deposit_summary,
            "price_summary": price_summary,
            "activity": activity,
        }

    # -------------------------------------------------------------------------
    # Booking Mutations: Cancel & Damage Dispute
    # -------------------------------------------------------------------------
    def cancel_booking(self, user_id: int, booking_id: int, reason: str | None = None) -> Booking:
        b = (
            self.db.query(Booking)
            .filter(Booking.booking_id == booking_id, Booking.user_id == user_id)
            .first()
        )
        if not b:
            raise NotFoundError("Booking not found")

        # Invariant for Step 5: Only UNPAID bookings can be cancelled here.
        # Paid cancellations require the refund workflow built in Step 9.
        if b.payment_status != BookingPaymentStatus.unpaid:
            raise ConflictError(
                "Booking has recorded payments. Cancellation requires refund workflow.",
                details={
                    "booking_id": f"BK-{booking_id:04d}",
                    "payment_status": b.payment_status.value,
                },
            )

        if b.status == BookingStatus.cancelled:
            return b

        old_status = b.status.value
        b.status = BookingStatus.cancelled
        b.cancelled_by = "customer"
        b.cancelled_reason = reason or "Cancelled by customer"
        b.cancelled_at = datetime.now(UTC)

        # Cancel vendor orders and booking items
        for vo in b.vendor_orders:
            vo.status = VendorOrderStatus.cancelled
        for it in self.db.query(BookingItem).filter(BookingItem.booking_id == booking_id).all():
            it.item_status = BookingItemStatus.cancelled

        # Write order_events row
        ev = OrderEvent(
            booking_id=booking_id,
            actor_user_id=user_id,
            actor_role="customer",
            event_type="booking_cancelled",
            from_status=old_status,
            to_status="cancelled",
            note=reason or "Customer cancelled unpaid booking",
        )
        self.db.add(ev)
        self.db.flush()
        return b

    def respond_to_damage_report(
        self, user_id: int, booking_id: int, item_id: int, action: str, dispute_reason: str | None
    ) -> DamageReport:
        b = (
            self.db.query(Booking)
            .filter(Booking.booking_id == booking_id, Booking.user_id == user_id)
            .first()
        )
        if not b:
            raise NotFoundError("Booking not found")

        # Find damage report for item
        ret_item = (
            self.db.query(ReturnItem)
            .join(BookingItem, ReturnItem.booking_item_id == BookingItem.booking_item_id)
            .filter(BookingItem.booking_id == booking_id, BookingItem.booking_item_id == item_id)
            .first()
        )
        if not ret_item or not ret_item.damage_report:
            raise NotFoundError("Damage report not found for this item")

        dr = ret_item.damage_report
        if dr.status != DamageReportStatus.reported:
            raise ConflictError(
                f"Damage report is already in status '{dr.status.value}' and cannot be updated"
            )

        old_status = dr.status.value
        now = datetime.now(UTC)

        if action == "accept":
            dr.status = DamageReportStatus.resolved
            dr.deducted_from_deposit = 1
            dr.resolved_at = now
            dr.resolution_note = "Customer accepted damage claim."
            dr.final_cost = dr.damage_cost
        else:  # dispute
            if not dispute_reason or len(dispute_reason.strip()) < 20:
                raise ValidationFailedError("Dispute reason must be at least 20 characters")
            dr.status = DamageReportStatus.disputed
            dr.dispute_reason = dispute_reason.strip()
            dr.disputed_at = now

        # Append order_events
        ev = OrderEvent(
            booking_id=booking_id,
            actor_user_id=user_id,
            actor_role="customer",
            event_type="damage_report_responded",
            from_status=old_status,
            to_status=dr.status.value,
            note=f"Customer responded with action '{action}'",
        )
        self.db.add(ev)

        # Notify vendor
        bi = ret_item.booking_item
        if bi and bi.vendor:
            notif = Notification(
                user_id=bi.vendor.user_id,
                type="damage_report_responded",
                title="Damage Claim Response",
                message=f"Customer has {action}ed the damage report for {bi.equipment.name if bi.equipment else 'equipment'}.",
                entity_type="damage_report",
                entity_id=dr.report_id,
                is_read=0,
            )
            self.db.add(notif)

        self.db.flush()
        return dr

    # -------------------------------------------------------------------------
    # Review Eligibility & Submission Operations
    # -------------------------------------------------------------------------
    def get_items_to_review(self, user_id: int) -> list[dict[str, Any]]:
        """
        Items where booking belongs to user, item_status == 'returned',
        and user has not submitted a review yet.
        """
        items = (
            self.db.query(BookingItem)
            .join(Booking, BookingItem.booking_id == Booking.booking_id)
            .join(Equipment, BookingItem.equipment_id == Equipment.equipment_id)
            .join(Vendor, BookingItem.vendor_id == Vendor.vendor_id)
            .outerjoin(Review, Review.booking_item_id == BookingItem.booking_item_id)
            .filter(
                Booking.user_id == user_id,
                BookingItem.item_status == BookingItemStatus.returned,
                Review.review_id.is_(None),  # not yet reviewed
            )
            .all()
        )

        results: list[dict[str, Any]] = []
        for it in items:
            img = it.equipment.images[0].url if it.equipment and it.equipment.images else ""
            ret_date_str = "Recently"
            if it.vendor_order and it.vendor_order.booking and it.vendor_order.booking.end_date:
                ret_date_str = it.vendor_order.booking.end_date.strftime("%b %d, %Y")
            results.append(
                {
                    "booking_id": f"BK-{it.booking_id:04d}",
                    "equipment_id": str(it.equipment_id),
                    "equipment_name": it.equipment.name if it.equipment else "",
                    "equipment_image": img,
                    "vendor_name": it.vendor.business_name if it.vendor else "",
                    "returned_date": ret_date_str,
                }
            )
        return results

    def get_my_reviews(self, user_id: int) -> list[dict[str, Any]]:
        reviews = (
            self.db.query(Review)
            .join(Equipment, Review.equipment_id == Equipment.equipment_id)
            .join(Vendor, Review.vendor_id == Vendor.vendor_id)
            .filter(Review.user_id == user_id)
            .order_by(Review.review_date.desc())
            .all()
        )

        results: list[dict[str, Any]] = []
        for r in reviews:
            img = r.equipment.images[0].url if r.equipment and r.equipment.images else ""
            results.append(
                {
                    "review_id": str(r.review_id),
                    "booking_id": f"BK-{r.booking_item_id:04d}",
                    "equipment_id": str(r.equipment_id),
                    "equipment_name": r.equipment.name if r.equipment else "",
                    "equipment_image": img,
                    "vendor_name": r.vendor.business_name if r.vendor else "",
                    "rating": r.rating,
                    "comment": r.comment,
                    "vendor_reply": r.vendor_reply,
                    "created_at": r.review_date.isoformat(),
                }
            )
        return results

    def create_review(
        self,
        user_id: int,
        rating: int,
        comment: str | None = None,
        booking_item_id: int | None = None,
        booking_id: int | None = None,
        equipment_id: int | None = None,
    ) -> Review:
        # Find matching booking item
        query = (
            self.db.query(BookingItem)
            .join(Booking, BookingItem.booking_id == Booking.booking_id)
            .filter(Booking.user_id == user_id)
        )
        if booking_item_id is not None:
            query = query.filter(BookingItem.booking_item_id == booking_item_id)
        elif booking_id is not None and equipment_id is not None:
            query = query.filter(
                BookingItem.booking_id == booking_id,
                BookingItem.equipment_id == equipment_id,
            )
        else:
            raise ValidationFailedError(
                "Either booking_item_id or (booking_id and equipment_id) must be provided"
            )

        bi = query.first()
        if not bi:
            raise NotFoundError("Booking item not found or does not belong to you")

        # Invariant: item_status must be 'returned'
        if bi.item_status != BookingItemStatus.returned:
            raise ConflictError("Review requires booking item status to be 'returned'")

        # Invariant: unique per booking item
        existing = (
            self.db.query(Review).filter(Review.booking_item_id == bi.booking_item_id).first()
        )
        if existing:
            raise ConflictError("You have already submitted a review for this booking item")

        rev = Review(
            user_id=user_id,
            booking_item_id=bi.booking_item_id,
            equipment_id=bi.equipment_id,
            vendor_id=bi.vendor_id,
            rating=rating,
            comment=comment,
        )
        self.db.add(rev)

        # Notify vendor
        if bi.vendor:
            notif = Notification(
                user_id=bi.vendor.user_id,
                type="new_review",
                title="New Customer Review",
                message=f"A customer rated {bi.equipment.name if bi.equipment else 'your equipment'} {rating}/5 stars.",
                entity_type="review",
                is_read=0,
            )
            self.db.add(notif)

        self.db.flush()
        return rev

    # -------------------------------------------------------------------------
    # Payments Read Operations
    # -------------------------------------------------------------------------
    def get_user_payments(
        self,
        user_id: int,
        type_filter: str = "all",
        status_filter: str = "all",
        page: int = 1,
        page_size: int = 10,
    ) -> tuple[list[dict[str, Any]], int]:
        query = (
            self.db.query(Payment)
            .join(Booking, Payment.booking_id == Booking.booking_id)
            .filter(Booking.user_id == user_id)
        )

        if type_filter != "all":
            query = query.filter(Payment.type == type_filter)
        if status_filter != "all":
            query = query.filter(Payment.status == status_filter)

        total = query.count()
        payments = (
            query.order_by(Payment.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        results = [
            {
                "payment_id": str(p.payment_id),
                "booking_id": f"BK-{p.booking_id:04d}",
                "event_name": p.booking.event_name if p.booking else "Event Rental",
                "type": p.type.value,
                "method": p.method.value if p.method else "card",
                "amount": float(p.amount),
                "status": p.status.value,
                "created_at": p.created_at.isoformat(),
                "reference": p.transaction_id or f"TXN-{p.payment_id:06d}",
                "refund_reference": p.refund_reference,
            }
            for p in payments
        ]
        return results, total

    def get_payment_summary(self, user_id: int) -> dict[str, float]:
        payments = (
            self.db.query(Payment)
            .join(Booking, Payment.booking_id == Booking.booking_id)
            .filter(Booking.user_id == user_id, Payment.status == PaymentStatus.success)
            .all()
        )

        total_paid = sum(
            float(p.amount) for p in payments if p.type in [PaymentType.advance, PaymentType.full]
        )
        deposits_held = sum(float(p.amount) for p in payments if p.type == PaymentType.deposit)
        refunded = sum(
            float(p.amount)
            for p in payments
            if p.type in [PaymentType.refund, PaymentType.deposit_refund]
        )

        # Deductions from resolved damage reports
        deductions_query = (
            self.db.query(func.coalesce(func.sum(DamageReport.final_cost), 0))
            .join(ReturnItem, DamageReport.return_item_id == ReturnItem.return_item_id)
            .join(BookingItem, ReturnItem.booking_item_id == BookingItem.booking_item_id)
            .join(Booking, BookingItem.booking_id == Booking.booking_id)
            .filter(Booking.user_id == user_id, DamageReport.status == DamageReportStatus.resolved)
            .scalar()
            or 0
        )

        return {
            "total_paid": round(total_paid, 2),
            "deposits_held": round(deposits_held, 2),
            "deductions": round(float(deductions_query), 2),
            "refunded": round(refunded, 2),
        }
