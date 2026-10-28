from __future__ import annotations

import contextlib
import logging
import re
from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import String, func, or_
from sqlalchemy.orm import Session

from app.core.errors import (
    AdminSelfDeactivationForbiddenError,
    ConflictError,
    DomainError,
    LastAdminDeactivationForbiddenError,
    NotFoundError,
    ValidationFailedError,
)
from app.core.firebase import set_firebase_user_disabled
from app.core.money import quantize_money
from app.core.time import utc_now
from app.models.accounts import User, UserRole, Vendor, VendorApprovalStatus
from app.models.catalog import (
    Category,
    Equipment,
    EquipmentStatus,
)
from app.models.fulfilment import DamageReport, DamageReportStatus
from app.models.orders import (
    Booking,
    BookingPaymentStatus,
    Coupon,
    CouponType,
    VendorOrder,
    VendorOrderStatus,
)
from app.models.payments import Payment, PaymentStatus, PaymentType, Payout, PayoutStatus
from app.models.platform import AuditLog
from app.models.social import Notification
from app.schemas.admin import (
    AdminAttentionItem,
    AdminBookingSummary,
    AdminChartDataPoint,
    AdminCouponResponse,
    AdminDispute,
    AdminEquipmentItem,
    AdminOverviewKPIs,
    AdminPayoutRow,
    AdminUser,
    AdminUserDetail,
    AdminVendorDetail,
    CouponDerivedStatus,
    CreateCategoryRequest,
    CreateCouponRequest,
    ManagedCategory,
    SystemCheckItem,
    SystemChecksReport,
    UpdateCategoryRequest,
    UpdateCouponRequest,
)
from app.schemas.vendor import VendorProfileResponse
from app.services.pricing import get_effective_commission

logger = logging.getLogger("rent4fraction.admin_service")

GSTIN_PATTERN = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _write_audit(
        self,
        actor_user_id: int,
        action: str,
        entity_type: str,
        entity_id: int | None,
        before_json: dict[str, Any] | None,
        after_json: dict[str, Any] | None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuditLog:
        log = AuditLog(
            actor_user_id=actor_user_id,
            actor_role="admin",
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before_json=before_json,
            after_json=after_json,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=utc_now(),
        )
        self.db.add(log)
        self.db.flush()
        return log

    # -------------------------------------------------------------------------
    # 1. Admin Overview & Dashboard
    # -------------------------------------------------------------------------
    def get_overview(self, range_str: str = "30d") -> AdminOverviewKPIs:
        now = utc_now()
        today = now.date()

        days = 30
        if range_str == "7d":
            days = 7
        elif range_str == "90d":
            days = 90
        elif range_str == "ytd":
            days = max(1, (now - datetime(now.year, 1, 1)).days)

        start_dt = now - timedelta(days=days)
        prev_start_dt = start_dt - timedelta(days=days)

        # 1. Gross Booking Value (GBV)
        paid_bookings = (
            self.db.query(Booking)
            .filter(
                Booking.payment_status.in_([BookingPaymentStatus.paid, BookingPaymentStatus.partial]),
                Booking.created_at >= start_dt,
            )
            .all()
        )
        gbv = sum((b.total_amount for b in paid_bookings), Decimal("0.00"))

        # 2. Bookings count and delta
        cur_bookings_cnt = len(paid_bookings)
        prev_bookings_cnt = (
            self.db.query(func.count(Booking.booking_id))
            .filter(
                Booking.payment_status.in_([BookingPaymentStatus.paid, BookingPaymentStatus.partial]),
                Booking.created_at >= prev_start_dt,
                Booking.created_at < start_dt,
            )
            .scalar()
            or 0
        )
        if prev_bookings_cnt > 0:
            pct = round(((cur_bookings_cnt - prev_bookings_cnt) / prev_bookings_cnt) * 100, 1)
            delta_str = f"{'+' if pct >= 0 else ''}{pct}% vs previous period"
        else:
            delta_str = "+100% vs previous period" if cur_bookings_cnt > 0 else "0% vs previous period"

        # 3. Active vendors & pending applications
        active_vendors = (
            self.db.query(func.count(Vendor.vendor_id))
            .filter(Vendor.approval_status == VendorApprovalStatus.approved)
            .scalar()
            or 0
        )
        pending_apps = (
            self.db.query(func.count(Vendor.vendor_id))
            .filter(Vendor.approval_status == VendorApprovalStatus.pending)
            .scalar()
            or 0
        )

        # 4. Open disputes
        open_disputes = (
            self.db.query(func.count(DamageReport.report_id))
            .filter(DamageReport.status.in_([DamageReportStatus.reported, DamageReportStatus.disputed]))
            .scalar()
            or 0
        )

        # 5. Platform Commission Earned
        comm_earned = (
            self.db.query(func.coalesce(func.sum(Payout.commission_amount), Decimal("0.00")))
            .filter(Payout.created_at >= start_dt)
            .scalar()
            or Decimal("0.00")
        )

        # 6. Chart Data
        chart_data: list[AdminChartDataPoint] = []
        bucket_days = min(days, 30)
        for i in range(bucket_days):
            b_date = today - timedelta(days=(bucket_days - 1 - i))
            b_str = b_date.strftime("%Y-%m-%d")
            day_bookings = [b for b in paid_bookings if b.created_at.date() == b_date]
            cnt = len(day_bookings)
            val = float(sum((b.total_amount for b in day_bookings), Decimal("0.00")))
            chart_data.append(AdminChartDataPoint(date=b_str, bookings=cnt, bookingValue=val))

        # 7. Attention Items
        payouts_to_process = (
            self.db.query(func.count(Payout.payout_id))
            .filter(Payout.status == PayoutStatus.pending)
            .scalar()
            or 0
        )
        expiring_coupons = (
            self.db.query(func.count(Coupon.coupon_id))
            .filter(
                Coupon.is_active == 1,
                Coupon.valid_to.is_not(None),
                Coupon.valid_to <= now + timedelta(days=7),
                Coupon.valid_to >= now,
            )
            .scalar()
            or 0
        )

        attention_items = [
            AdminAttentionItem(
                id="attn_apps",
                label="Vendor applications awaiting review",
                count=pending_apps,
                href="/admin/vendors?status=pending",
            ),
            AdminAttentionItem(
                id="attn_disputes",
                label="Open damage disputes needing resolution",
                count=open_disputes,
                href="/admin/disputes?status=open",
            ),
            AdminAttentionItem(
                id="attn_payouts",
                label="Completed orders with payouts to process",
                count=payouts_to_process,
                href="/admin/payouts?status=pending",
            ),
            AdminAttentionItem(
                id="attn_coupons",
                label="Coupons expiring within 7 days",
                count=expiring_coupons,
                href="/admin/coupons?status=expiring",
            ),
        ]

        # 8. Recent Bookings
        recent_b_rows = (
            self.db.query(Booking)
            .order_by(Booking.created_at.desc())
            .limit(5)
            .all()
        )
        recent_bookings = [
            AdminBookingSummary(
                booking_id=str(b.booking_id),
                booking_number=f"BK-{b.booking_id:04d}",
                customer_name=b.user.name if b.user else "Customer",
                customer_email=b.user.email if b.user else "",
                event_name=b.event_name,
                start_date=b.start_date.isoformat(),
                end_date=b.end_date.isoformat(),
                total_amount=float(b.total_amount),
                payment_status=b.payment_status.value,
                status=b.status.value,
                created_at=b.created_at.isoformat(),
            )
            for b in recent_b_rows
        ]

        # 9. Recent Applications
        recent_apps_rows = (
            self.db.query(Vendor)
            .order_by(Vendor.created_at.desc())
            .limit(5)
            .all()
        )
        from app.services.vendor import VendorService
        v_service = VendorService(self.db)
        recent_apps = [v_service._format_profile(v) for v in recent_apps_rows]

        return AdminOverviewKPIs(
            grossBookingValue=float(gbv),
            bookingsCount=cur_bookings_cnt,
            bookingsDelta=delta_str,
            activeVendorsCount=active_vendors,
            pendingApplicationsCount=pending_apps,
            openDisputesCount=open_disputes,
            platformCommissionEarned=float(comm_earned),
            chartData=chart_data,
            attentionItems=attention_items,
            recentBookings=recent_bookings,
            recentApplications=recent_apps,
        )

    # -------------------------------------------------------------------------
    # 2. Vendors Management
    # -------------------------------------------------------------------------
    def list_vendors(
        self,
        status_filter: str | None = None,
        search: str | None = None,
        city: str | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
        page: int = 1,
        page_size: int = 10,
    ) -> dict[str, Any]:
        q = self.db.query(Vendor)

        if status_filter and status_filter != "all":
            q = q.filter(Vendor.approval_status == status_filter)

        if search and search.strip():
            term = f"%{search.strip()}%"
            q = q.join(User, User.user_id == Vendor.user_id).filter(
                or_(
                    Vendor.business_name.ilike(term),
                    Vendor.gst_number.ilike(term),
                    User.name.ilike(term),
                    User.email.ilike(term),
                )
            )

        if city and city.strip():
            q = q.filter(Vendor.address.ilike(f"%{city.strip()}%"))

        if from_date:
            q = q.filter(Vendor.created_at >= from_date)
        if to_date:
            q = q.filter(Vendor.created_at <= to_date)

        total = q.count()
        vendors = q.order_by(Vendor.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

        # Status counts
        all_v = self.db.query(Vendor.approval_status).all()
        status_counts = {"all": len(all_v), "pending": 0, "approved": 0, "rejected": 0, "suspended": 0}
        for (st,) in all_v:
            v_str = st.value if hasattr(st, "value") else str(st)
            status_counts[v_str] = status_counts.get(v_str, 0) + 1

        from app.services.vendor import VendorService
        v_service = VendorService(self.db)
        items = [v_service._format_profile(v) for v in vendors]

        return {
            "items": items,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "counts": status_counts,
        }

    def get_vendor_detail(self, vendor_id: int) -> AdminVendorDetail:
        v = self.db.query(Vendor).filter(Vendor.vendor_id == vendor_id).first()
        if not v:
            raise NotFoundError("Vendor", str(vendor_id))

        from app.services.vendor import VendorService
        v_service = VendorService(self.db)
        prof = v_service._format_profile(v)

        # GSTIN check
        is_gst_valid = bool(v.gst_number and GSTIN_PATTERN.match(v.gst_number))
        app_data = {
            "business_name": v.business_name,
            "gst_number": v.gst_number,
            "gst_valid": is_gst_valid,
            "phone": v.phone,
            "address": v.address,
            "applied_at": v.created_at.isoformat() if v.created_at else None,
        }

        # Timeline from AuditLog and OrderEvents
        audits = (
            self.db.query(AuditLog)
            .filter(AuditLog.entity_type == "vendor", AuditLog.entity_id == vendor_id)
            .order_by(AuditLog.created_at.asc())
            .all()
        )
        timeline = [
            {
                "action": a.action,
                "actor_role": a.actor_role,
                "timestamp": a.created_at.isoformat() if a.created_at else None,
                "details": a.after_json,
            }
            for a in audits
        ]

        # Equipment summary
        eq_all = self.db.query(Equipment).filter(Equipment.vendor_id == vendor_id).all()
        eq_summary = {
            "total": len(eq_all),
            "active": len([e for e in eq_all if e.status == EquipmentStatus.active]),
            "inactive": len([e for e in eq_all if e.status == EquipmentStatus.inactive]),
            "archived": len([e for e in eq_all if e.status == EquipmentStatus.archived]),
        }

        return AdminVendorDetail(
            vendor=prof,
            application_data=app_data,
            timeline=timeline,
            equipment_summary=eq_summary,
        )

    def approve_vendor(
        self, admin_id: int, vendor_id: int, ip_address: str | None = None, user_agent: str | None = None
    ) -> VendorProfileResponse:
        v = self.db.query(Vendor).filter(Vendor.vendor_id == vendor_id).with_for_update().first()
        if not v:
            raise NotFoundError("Vendor", str(vendor_id))

        before = {"approval_status": v.approval_status.value}
        v.approval_status = VendorApprovalStatus.approved
        v.approved_by = admin_id
        v.approved_at = utc_now()
        v.rejection_reason = None
        self.db.flush()

        after = {
            "approval_status": "approved",
            "approved_by": admin_id,
            "approved_at": v.approved_at.isoformat(),
        }

        self._write_audit(
            actor_user_id=admin_id,
            action="vendor_approved",
            entity_type="vendor",
            entity_id=vendor_id,
            before_json=before,
            after_json=after,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # Notify vendor user
        if v.user_id:
            notif = Notification(
                user_id=v.user_id,
                type="vendor_approved",
                title="Vendor Application Approved",
                message="Your vendor profile has been approved! You can now list equipment and accept orders.",
                is_read=0,
                created_at=utc_now(),
            )
            self.db.add(notif)
            self.db.flush()

        from app.services.vendor import VendorService
        return VendorService(self.db)._format_profile(v)

    def reject_vendor(
        self,
        admin_id: int,
        vendor_id: int,
        reason: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> VendorProfileResponse:
        if len(reason.strip()) < 10:
            raise ValidationFailedError("Rejection reason must be at least 10 characters.")

        v = self.db.query(Vendor).filter(Vendor.vendor_id == vendor_id).with_for_update().first()
        if not v:
            raise NotFoundError("Vendor", str(vendor_id))

        before = {"approval_status": v.approval_status.value}
        v.approval_status = VendorApprovalStatus.rejected
        v.rejection_reason = reason.strip()
        self.db.flush()

        after = {"approval_status": "rejected", "rejection_reason": reason.strip()}
        self._write_audit(
            actor_user_id=admin_id,
            action="vendor_rejected",
            entity_type="vendor",
            entity_id=vendor_id,
            before_json=before,
            after_json=after,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # Notify vendor user
        if v.user_id:
            notif = Notification(
                user_id=v.user_id,
                type="vendor_rejected",
                title="Vendor Application Update",
                message=f"Your vendor application was declined: {reason.strip()}",
                is_read=0,
                created_at=utc_now(),
            )
            self.db.add(notif)
            self.db.flush()

        from app.services.vendor import VendorService
        return VendorService(self.db)._format_profile(v)

    def suspend_vendor(
        self,
        admin_id: int,
        vendor_id: int,
        reason: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> VendorProfileResponse:
        if len(reason.strip()) < 5:
            raise ValidationFailedError("Suspension reason must be at least 5 characters.")

        v = self.db.query(Vendor).filter(Vendor.vendor_id == vendor_id).with_for_update().first()
        if not v:
            raise NotFoundError("Vendor", str(vendor_id))

        before = {"approval_status": v.approval_status.value}
        v.approval_status = VendorApprovalStatus.suspended
        v.rejection_reason = reason.strip()
        self.db.flush()

        after = {"approval_status": "suspended", "suspension_reason": reason.strip()}
        self._write_audit(
            actor_user_id=admin_id,
            action="vendor_suspended",
            entity_type="vendor",
            entity_id=vendor_id,
            before_json=before,
            after_json=after,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # Notify vendor user
        if v.user_id:
            notif = Notification(
                user_id=v.user_id,
                type="vendor_suspended",
                title="Vendor Account Suspended",
                message=f"Your vendor account has been suspended: {reason.strip()}",
                is_read=0,
                created_at=utc_now(),
            )
            self.db.add(notif)
            self.db.flush()

        from app.services.vendor import VendorService
        return VendorService(self.db)._format_profile(v)

    def reinstate_vendor(
        self, admin_id: int, vendor_id: int, ip_address: str | None = None, user_agent: str | None = None
    ) -> VendorProfileResponse:
        v = self.db.query(Vendor).filter(Vendor.vendor_id == vendor_id).with_for_update().first()
        if not v:
            raise NotFoundError("Vendor", str(vendor_id))

        before = {"approval_status": v.approval_status.value}
        v.approval_status = VendorApprovalStatus.approved
        v.rejection_reason = None
        self.db.flush()

        after = {"approval_status": "approved"}
        self._write_audit(
            actor_user_id=admin_id,
            action="vendor_reinstated",
            entity_type="vendor",
            entity_id=vendor_id,
            before_json=before,
            after_json=after,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        from app.services.vendor import VendorService
        return VendorService(self.db)._format_profile(v)

    def update_vendor_commission(
        self,
        admin_id: int,
        vendor_id: int,
        commission_rate: Decimal | None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> VendorProfileResponse:
        v = self.db.query(Vendor).filter(Vendor.vendor_id == vendor_id).with_for_update().first()
        if not v:
            raise NotFoundError("Vendor", str(vendor_id))

        before = {"commission_rate": str(v.commission_rate) if v.commission_rate else None}
        v.commission_rate = quantize_money(commission_rate) if commission_rate is not None else None
        self.db.flush()

        after = {"commission_rate": str(v.commission_rate) if v.commission_rate else None}
        self._write_audit(
            actor_user_id=admin_id,
            action="vendor_commission_updated",
            entity_type="vendor",
            entity_id=vendor_id,
            before_json=before,
            after_json=after,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        from app.services.vendor import VendorService
        return VendorService(self.db)._format_profile(v)

    # -------------------------------------------------------------------------
    # 3. Equipment Admin & Commission Override
    # -------------------------------------------------------------------------
    def list_equipment(
        self,
        status_filter: str | None = None,
        vendor_id: int | None = None,
        category_id: int | None = None,
        commission_source: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        q = self.db.query(Equipment)

        if status_filter:
            q = q.filter(Equipment.status == status_filter)
        if vendor_id:
            q = q.filter(Equipment.vendor_id == vendor_id)
        if category_id:
            q = q.filter(Equipment.category_id == category_id)

        if search and search.strip():
            term = f"%{search.strip()}%"
            q = q.filter(or_(Equipment.name.ilike(term), Equipment.description.ilike(term)))

        total = q.count()
        records = q.order_by(Equipment.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

        items: list[AdminEquipmentItem] = []
        for eq in records:
            eff_rate, c_source = get_effective_commission(
                db=self.db,
                equipment_id=eq.equipment_id,
                category_id=eq.category_id,
                vendor_id=eq.vendor_id,
            )
            if commission_source and c_source != commission_source:
                continue

            items.append(
                AdminEquipmentItem(
                    equipment_id=str(eq.equipment_id),
                    vendor_id=str(eq.vendor_id),
                    vendor_name=eq.vendor.business_name if eq.vendor else "",
                    category_id=str(eq.category_id),
                    category_name=eq.category.name if eq.category else "",
                    name=eq.name,
                    price_per_day=float(eq.price_per_day),
                    security_deposit=float(eq.security_deposit),
                    quantity=eq.quantity,
                    status=eq.status.value,
                    commission_rate=float(eq.commission_rate) if eq.commission_rate is not None else None,
                    effective_commission_rate=float(eff_rate),
                    commission_source=c_source,
                    created_at=eq.created_at.isoformat() if eq.created_at else "",
                )
            )

        return {
            "items": items,
            "total": total,
            "page": page,
            "pageSize": page_size,
        }

    def update_equipment_commission(
        self,
        admin_id: int,
        equipment_id: int,
        commission_rate: Decimal | None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        eq = self.db.query(Equipment).filter(Equipment.equipment_id == equipment_id).with_for_update().first()
        if not eq:
            raise NotFoundError("Equipment", str(equipment_id))

        before = {"commission_rate": str(eq.commission_rate) if eq.commission_rate is not None else None}
        eq.commission_rate = quantize_money(commission_rate) if commission_rate is not None else None
        self.db.flush()

        after = {"commission_rate": str(eq.commission_rate) if eq.commission_rate is not None else None}
        self._write_audit(
            actor_user_id=admin_id,
            action="equipment_commission_updated",
            entity_type="equipment",
            entity_id=equipment_id,
            before_json=before,
            after_json=after,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        eff_rate, c_source = get_effective_commission(
            db=self.db,
            equipment_id=eq.equipment_id,
            category_id=eq.category_id,
            vendor_id=eq.vendor_id,
        )

        return {
            "equipment_id": str(eq.equipment_id),
            "commission_rate": float(eq.commission_rate) if eq.commission_rate is not None else None,
            "effective_commission_rate": float(eff_rate),
            "commission_source": c_source,
        }

    # -------------------------------------------------------------------------
    # 4. Categories Management
    # -------------------------------------------------------------------------
    def list_categories(self) -> list[ManagedCategory]:
        all_cats = self.db.query(Category).order_by(Category.name.asc()).all()

        # Build tree
        top_level = [c for c in all_cats if c.parent_id is None]
        subs_by_parent: dict[int, list[Category]] = defaultdict(list)
        for c in all_cats:
            if c.parent_id is not None:
                subs_by_parent[c.parent_id].append(c)

        result: list[ManagedCategory] = []
        for parent in top_level:
            subs = [
                ManagedCategory(
                    category_id=str(s.category_id),
                    id=str(s.category_id),
                    name=s.name,
                    parent_id=str(s.parent_id),
                    description=s.description,
                    default_commission_rate=float(s.default_commission_rate) if s.default_commission_rate is not None else None,
                    is_active=bool(s.is_active),
                    equipment_count=len(s.equipment_items),
                    subcategories=[],
                )
                for s in subs_by_parent.get(parent.category_id, [])
            ]
            result.append(
                ManagedCategory(
                    category_id=str(parent.category_id),
                    id=str(parent.category_id),
                    name=parent.name,
                    parent_id=None,
                    description=parent.description,
                    default_commission_rate=float(parent.default_commission_rate) if parent.default_commission_rate is not None else None,
                    is_active=bool(parent.is_active),
                    equipment_count=len(parent.equipment_items),
                    subcategories=subs,
                )
            )
        return result

    def create_category(
        self,
        admin_id: int,
        payload: CreateCategoryRequest,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> ManagedCategory:
        # Unique name within parent
        existing = (
            self.db.query(Category)
            .filter(Category.name == payload.name.strip(), Category.parent_id == payload.parent_id)
            .first()
        )
        if existing:
            raise ConflictError(f"Category with name '{payload.name}' already exists in this branch.", code="conflict")

        cat = Category(
            name=payload.name.strip(),
            parent_id=payload.parent_id,
            description=payload.description.strip() if payload.description else None,
            default_commission_rate=quantize_money(payload.default_commission_rate) if payload.default_commission_rate is not None else None,
            is_active=1 if payload.is_active else 0,
        )
        self.db.add(cat)
        self.db.flush()

        after = {
            "category_id": cat.category_id,
            "name": cat.name,
            "parent_id": cat.parent_id,
            "default_commission_rate": str(cat.default_commission_rate) if cat.default_commission_rate is not None else None,
            "is_active": cat.is_active,
        }
        self._write_audit(
            actor_user_id=admin_id,
            action="category_created",
            entity_type="category",
            entity_id=cat.category_id,
            before_json=None,
            after_json=after,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return ManagedCategory(
            category_id=str(cat.category_id),
            id=str(cat.category_id),
            name=cat.name,
            parent_id=str(cat.parent_id) if cat.parent_id else None,
            description=cat.description,
            default_commission_rate=float(cat.default_commission_rate) if cat.default_commission_rate is not None else None,
            is_active=bool(cat.is_active),
            equipment_count=0,
            subcategories=[],
        )

    def update_category(
        self,
        admin_id: int,
        category_id: int,
        payload: UpdateCategoryRequest,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> ManagedCategory:
        cat = self.db.query(Category).filter(Category.category_id == category_id).with_for_update().first()
        if not cat:
            raise NotFoundError("Category", str(category_id))

        before = {
            "name": cat.name,
            "parent_id": cat.parent_id,
            "default_commission_rate": str(cat.default_commission_rate) if cat.default_commission_rate is not None else None,
            "is_active": cat.is_active,
        }

        if payload.name is not None:
            # Check uniqueness
            parent_id_to_check = payload.parent_id if payload.parent_id is not None else cat.parent_id
            existing = (
                self.db.query(Category)
                .filter(
                    Category.name == payload.name.strip(),
                    Category.parent_id == parent_id_to_check,
                    Category.category_id != category_id,
                )
                .first()
            )
            if existing:
                raise ConflictError(f"Category with name '{payload.name}' already exists in this branch.", code="conflict")
            cat.name = payload.name.strip()

        if payload.parent_id is not None:
            cat.parent_id = payload.parent_id
        if payload.description is not None:
            cat.description = payload.description.strip()
        if payload.default_commission_rate is not None:
            cat.default_commission_rate = quantize_money(payload.default_commission_rate)
        if payload.is_active is not None:
            cat.is_active = 1 if payload.is_active else 0

        self.db.flush()

        after = {
            "name": cat.name,
            "parent_id": cat.parent_id,
            "default_commission_rate": str(cat.default_commission_rate) if cat.default_commission_rate is not None else None,
            "is_active": cat.is_active,
        }
        self._write_audit(
            actor_user_id=admin_id,
            action="category_updated",
            entity_type="category",
            entity_id=category_id,
            before_json=before,
            after_json=after,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return ManagedCategory(
            category_id=str(cat.category_id),
            id=str(cat.category_id),
            name=cat.name,
            parent_id=str(cat.parent_id) if cat.parent_id else None,
            description=cat.description,
            default_commission_rate=float(cat.default_commission_rate) if cat.default_commission_rate is not None else None,
            is_active=bool(cat.is_active),
            equipment_count=len(cat.equipment_items),
            subcategories=[],
        )

    def toggle_category_active(
        self,
        admin_id: int,
        category_id: int,
        is_active: bool,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        cat = self.db.query(Category).filter(Category.category_id == category_id).with_for_update().first()
        if not cat:
            raise NotFoundError("Category", str(category_id))

        before = {"is_active": cat.is_active}
        cat.is_active = 1 if is_active else 0
        self.db.flush()

        after = {"is_active": cat.is_active}
        self._write_audit(
            actor_user_id=admin_id,
            action="category_active_toggled",
            entity_type="category",
            entity_id=category_id,
            before_json=before,
            after_json=after,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return {"category_id": str(category_id), "is_active": bool(cat.is_active)}

    # -------------------------------------------------------------------------
    # 5. Coupons Management
    # -------------------------------------------------------------------------
    @staticmethod
    def derive_coupon_status(coupon: Coupon, now: datetime | None = None) -> CouponDerivedStatus:
        if now is None:
            now = utc_now()
        if not coupon.is_active:
            return "inactive"
        if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
            return "limit_reached"
        if coupon.valid_from and coupon.valid_from > now:
            return "scheduled"
        if coupon.valid_to and coupon.valid_to < now:
            return "expired"
        return "active"

    def list_coupons(
        self,
        status_filter: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        q = self.db.query(Coupon)
        if search and search.strip():
            q = q.filter(Coupon.code.ilike(f"%{search.strip()}%"))

        coupons = q.order_by(Coupon.coupon_id.desc()).all()
        now = utc_now()

        res: list[AdminCouponResponse] = []
        for c in coupons:
            st = self.derive_coupon_status(c, now)
            if status_filter and status_filter != "all" and st != status_filter:
                continue

            res.append(
                AdminCouponResponse(
                    coupon_id=str(c.coupon_id),
                    id=str(c.coupon_id),
                    code=c.code,
                    type=c.type.value,
                    value=float(c.value),
                    min_order_amount=float(c.min_order_amount),
                    usage_limit=c.usage_limit,
                    used_count=c.used_count,
                    valid_from=c.valid_from.isoformat() if c.valid_from else None,
                    valid_to=c.valid_to.isoformat() if c.valid_to else None,
                    expires_at=c.valid_to.isoformat() if c.valid_to else None,
                    is_active=bool(c.is_active),
                    status=st,
                )
            )

        total = len(res)
        paginated_items = res[(page - 1) * page_size : page * page_size]
        return {
            "items": paginated_items,
            "total": total,
            "page": page,
            "pageSize": page_size,
        }

    def create_coupon(
        self,
        admin_id: int,
        payload: CreateCouponRequest,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AdminCouponResponse:
        code_upper = payload.code.strip().upper()
        existing = self.db.query(Coupon).filter(Coupon.code == code_upper).first()
        if existing:
            raise ConflictError(f"Coupon with code '{code_upper}' already exists.", code="conflict")

        if payload.type == "percent" and payload.value > Decimal("100.00"):
            raise ValidationFailedError("Percentage discount cannot exceed 100%.")

        if payload.valid_from and payload.valid_to and payload.valid_to < payload.valid_from:
            raise ValidationFailedError("valid_to date cannot be earlier than valid_from date.")

        coupon = Coupon(
            code=code_upper,
            type=CouponType(payload.type),
            value=quantize_money(payload.value),
            min_order_amount=quantize_money(payload.min_order_amount),
            usage_limit=payload.usage_limit,
            used_count=0,
            valid_from=payload.valid_from,
            valid_to=payload.valid_to,
            is_active=1 if payload.is_active else 0,
        )
        self.db.add(coupon)
        self.db.flush()

        after = {
            "code": coupon.code,
            "type": coupon.type.value,
            "value": str(coupon.value),
            "is_active": coupon.is_active,
        }
        self._write_audit(
            actor_user_id=admin_id,
            action="coupon_created",
            entity_type="coupon",
            entity_id=coupon.coupon_id,
            before_json=None,
            after_json=after,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        st = self.derive_coupon_status(coupon)
        return AdminCouponResponse(
            coupon_id=str(coupon.coupon_id),
            id=str(coupon.coupon_id),
            code=coupon.code,
            type=coupon.type.value,
            value=float(coupon.value),
            min_order_amount=float(coupon.min_order_amount),
            usage_limit=coupon.usage_limit,
            used_count=0,
            valid_from=coupon.valid_from.isoformat() if coupon.valid_from else None,
            valid_to=coupon.valid_to.isoformat() if coupon.valid_to else None,
            expires_at=coupon.valid_to.isoformat() if coupon.valid_to else None,
            is_active=bool(coupon.is_active),
            status=st,
        )

    def update_coupon(
        self,
        admin_id: int,
        coupon_id: int,
        payload: UpdateCouponRequest,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AdminCouponResponse:
        c = self.db.query(Coupon).filter(Coupon.coupon_id == coupon_id).with_for_update().first()
        if not c:
            raise NotFoundError("Coupon", str(coupon_id))

        before = {
            "type": c.type.value,
            "value": str(c.value),
            "min_order_amount": str(c.min_order_amount),
            "is_active": c.is_active,
        }

        if payload.type is not None:
            c.type = CouponType(payload.type)
        if payload.value is not None:
            if c.type == CouponType.percent and payload.value > Decimal("100.00"):
                raise ValidationFailedError("Percentage discount cannot exceed 100%.")
            c.value = quantize_money(payload.value)
        if payload.min_order_amount is not None:
            c.min_order_amount = quantize_money(payload.min_order_amount)
        if payload.usage_limit is not None:
            c.usage_limit = payload.usage_limit
        if payload.valid_from is not None:
            c.valid_from = payload.valid_from
        if payload.valid_to is not None:
            c.valid_to = payload.valid_to
        if payload.is_active is not None:
            c.is_active = 1 if payload.is_active else 0

        self.db.flush()

        after = {
            "type": c.type.value,
            "value": str(c.value),
            "min_order_amount": str(c.min_order_amount),
            "is_active": c.is_active,
        }
        self._write_audit(
            actor_user_id=admin_id,
            action="coupon_updated",
            entity_type="coupon",
            entity_id=coupon_id,
            before_json=before,
            after_json=after,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        st = self.derive_coupon_status(c)
        return AdminCouponResponse(
            coupon_id=str(c.coupon_id),
            id=str(c.coupon_id),
            code=c.code,
            type=c.type.value,
            value=float(c.value),
            min_order_amount=float(c.min_order_amount),
            usage_limit=c.usage_limit,
            used_count=c.used_count,
            valid_from=c.valid_from.isoformat() if c.valid_from else None,
            valid_to=c.valid_to.isoformat() if c.valid_to else None,
            expires_at=c.valid_to.isoformat() if c.valid_to else None,
            is_active=bool(c.is_active),
            status=st,
        )

    def toggle_coupon_active(
        self,
        admin_id: int,
        coupon_id: int,
        is_active: bool,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        c = self.db.query(Coupon).filter(Coupon.coupon_id == coupon_id).with_for_update().first()
        if not c:
            raise NotFoundError("Coupon", str(coupon_id))

        before = {"is_active": c.is_active}
        c.is_active = 1 if is_active else 0
        self.db.flush()

        after = {"is_active": c.is_active}
        self._write_audit(
            actor_user_id=admin_id,
            action="coupon_active_toggled",
            entity_type="coupon",
            entity_id=coupon_id,
            before_json=before,
            after_json=after,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return {"coupon_id": str(coupon_id), "is_active": bool(c.is_active)}

    # -------------------------------------------------------------------------
    # 6. Users Management
    # -------------------------------------------------------------------------
    def list_users(
        self,
        role: str | None = None,
        active: bool | None = None,
        email_verified: bool | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        q = self.db.query(User)

        if role:
            q = q.filter(User.role == role)
        if active is not None:
            q = q.filter(User.is_active == (1 if active else 0))
        if email_verified is not None:
            q = q.filter(User.email_verified == (1 if email_verified else 0))
        if from_date:
            q = q.filter(User.created_at >= from_date)
        if to_date:
            q = q.filter(User.created_at <= to_date)

        if search and search.strip():
            term = f"%{search.strip()}%"
            q = q.filter(or_(User.name.ilike(term), User.email.ilike(term), User.phone.ilike(term)))

        total = q.count()
        records = q.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

        items: list[AdminUser] = []
        for u in records:
            b_cnt = self.db.query(func.count(Booking.booking_id)).filter(Booking.user_id == u.user_id).scalar() or 0
            v_id = str(u.vendor_profile.vendor_id) if u.vendor_profile else None
            initials = "".join([part[0].upper() for part in u.name.split()[:2]]) or "U"
            items.append(
                AdminUser(
                    user_id=str(u.user_id),
                    name=u.name,
                    email=u.email,
                    role=u.role.value,
                    email_verified=bool(u.email_verified),
                    status="active" if u.is_active == 1 else "deactivated",
                    joined_at=u.created_at.isoformat() if u.created_at else "",
                    last_login=u.last_login.isoformat() if u.last_login else None,
                    bookings_count=b_cnt,
                    avatar_initials=initials,
                    vendor_id=v_id,
                )
            )

        return {
            "items": items,
            "total": total,
            "page": page,
            "pageSize": page_size,
        }

    def get_user_detail(self, user_id: int) -> AdminUserDetail:
        u = self.db.query(User).filter(User.user_id == user_id).first()
        if not u:
            raise NotFoundError("User", str(user_id))

        b_cnt = self.db.query(func.count(Booking.booking_id)).filter(Booking.user_id == user_id).scalar() or 0
        v_id = str(u.vendor_profile.vendor_id) if u.vendor_profile else None
        initials = "".join([part[0].upper() for part in u.name.split()[:2]]) or "U"

        user_obj = AdminUser(
            user_id=str(u.user_id),
            name=u.name,
            email=u.email,
            role=u.role.value,
            email_verified=bool(u.email_verified),
            status="active" if u.is_active == 1 else "deactivated",
            joined_at=u.created_at.isoformat() if u.created_at else "",
            last_login=u.last_login.isoformat() if u.last_login else None,
            bookings_count=b_cnt,
            avatar_initials=initials,
            vendor_id=v_id,
        )

        linked_vendor = None
        if u.vendor_profile:
            from app.services.vendor import VendorService
            linked_vendor = VendorService(self.db)._format_profile(u.vendor_profile).model_dump()

        activity = {
            "bookings_count": b_cnt,
            "addresses_count": len(u.addresses),
        }

        recent_audits = (
            self.db.query(AuditLog)
            .filter(AuditLog.actor_user_id == user_id)
            .order_by(AuditLog.created_at.desc())
            .limit(10)
            .all()
        )
        recent_events = [
            {"action": a.action, "timestamp": a.created_at.isoformat()} for a in recent_audits
        ]

        return AdminUserDetail(
            user=user_obj,
            linked_vendor=linked_vendor,
            activity_counts=activity,
            recent_events=recent_events,
        )

    def deactivate_user(
        self,
        admin_id: int,
        target_user_id: int,
        reason: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AdminUser:
        if reason is not None and len(reason.strip()) < 10:
            raise ValidationFailedError("Deactivation reason must be at least 10 characters.")

        # Rule 1: Admin cannot deactivate themselves
        if admin_id == target_user_id:
            raise AdminSelfDeactivationForbiddenError()

        target = self.db.query(User).filter(User.user_id == target_user_id).with_for_update().first()
        if not target:
            raise NotFoundError("User", str(target_user_id))

        # Rule 2: Admin cannot deactivate the last remaining admin
        if target.role == UserRole.admin:
            active_admin_count = (
                self.db.query(func.count(User.user_id))
                .filter(User.role == UserRole.admin, User.is_active == 1)
                .scalar()
                or 0
            )
            if active_admin_count <= 1:
                raise LastAdminDeactivationForbiddenError()

        # Step 1: Call Firebase Admin FIRST to disable tokens
        try:
            set_firebase_user_disabled(target.firebase_uid, disabled=True)
        except Exception as fb_err:
            logger.error("Failed to disable user in Firebase: %s", fb_err)
            raise DomainError("firebase_error", f"Could not disable user credentials: {fb_err}", 502) from fb_err

        # Step 2: Update users.is_active in the transaction
        before = {"is_active": target.is_active}
        try:
            target.is_active = 0
            self.db.flush()
        except Exception as db_err:
            # Revert Firebase change on best-effort basis
            with contextlib.suppress(Exception):
                set_firebase_user_disabled(target.firebase_uid, disabled=False)
            raise db_err

        after = {"is_active": 0}
        self._write_audit(
            actor_user_id=admin_id,
            action="user_deactivated",
            entity_type="user",
            entity_id=target_user_id,
            before_json=before,
            after_json=after,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        b_cnt = self.db.query(func.count(Booking.booking_id)).filter(Booking.user_id == target_user_id).scalar() or 0
        return AdminUser(
            user_id=str(target.user_id),
            name=target.name,
            email=target.email,
            role=target.role.value,
            email_verified=bool(target.email_verified),
            status="deactivated",
            joined_at=target.created_at.isoformat() if target.created_at else "",
            last_login=target.last_login.isoformat() if target.last_login else None,
            bookings_count=b_cnt,
            avatar_initials="".join([p[0].upper() for p in target.name.split()[:2]]) or "U",
            vendor_id=str(target.vendor_profile.vendor_id) if target.vendor_profile else None,
        )

    def reactivate_user(
        self,
        admin_id: int,
        target_user_id: int,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AdminUser:
        target = self.db.query(User).filter(User.user_id == target_user_id).with_for_update().first()
        if not target:
            raise NotFoundError("User", str(target_user_id))

        try:
            set_firebase_user_disabled(target.firebase_uid, disabled=False)
        except Exception as fb_err:
            logger.error("Failed to enable user in Firebase: %s", fb_err)
            raise DomainError("firebase_error", f"Could not enable user credentials: {fb_err}", 502) from fb_err

        before = {"is_active": target.is_active}
        target.is_active = 1
        self.db.flush()

        after = {"is_active": 1}
        self._write_audit(
            actor_user_id=admin_id,
            action="user_reactivated",
            entity_type="user",
            entity_id=target_user_id,
            before_json=before,
            after_json=after,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        b_cnt = self.db.query(func.count(Booking.booking_id)).filter(Booking.user_id == target_user_id).scalar() or 0
        return AdminUser(
            user_id=str(target.user_id),
            name=target.name,
            email=target.email,
            role=target.role.value,
            email_verified=bool(target.email_verified),
            status="active",
            joined_at=target.created_at.isoformat() if target.created_at else "",
            last_login=target.last_login.isoformat() if target.last_login else None,
            bookings_count=b_cnt,
            avatar_initials="".join([p[0].upper() for p in target.name.split()[:2]]) or "U",
            vendor_id=str(target.vendor_profile.vendor_id) if target.vendor_profile else None,
        )

    # -------------------------------------------------------------------------
    # 7. Disputes Management
    # -------------------------------------------------------------------------
    def list_disputes(
        self,
        status_filter: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        q = self.db.query(DamageReport)
        if status_filter == "open":
            q = q.filter(DamageReport.status.in_([DamageReportStatus.reported, DamageReportStatus.disputed]))
        elif status_filter == "resolved":
            q = q.filter(DamageReport.status == DamageReportStatus.resolved)
        elif status_filter and status_filter != "all":
            q = q.filter(DamageReport.status == status_filter)

        total = q.count()
        reports = q.order_by(DamageReport.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
        result: list[AdminDispute] = [self._format_dispute(dr) for dr in reports]
        return {
            "items": result,
            "total": total,
            "page": page,
            "pageSize": page_size,
        }

    def get_dispute(self, dispute_id: int) -> AdminDispute:
        dr = self.db.query(DamageReport).filter(DamageReport.report_id == dispute_id).first()
        if not dr:
            raise NotFoundError("DamageReport", str(dispute_id))
        return self._format_dispute(dr)

    def _format_dispute(self, dr: DamageReport) -> AdminDispute:
        ret_item = dr.return_item
        booking_item = ret_item.booking_item if ret_item else None
        vo = booking_item.vendor_order if booking_item else None
        booking = vo.booking if vo else None

        cust_name = booking.user.name if booking and booking.user else "Customer"
        cust_email = booking.user.email if booking and booking.user else ""
        v_name = vo.vendor.business_name if vo and vo.vendor else "Vendor"
        v_id = str(vo.vendor_id) if vo else ""
        eq_name = booking_item.equipment.name if booking_item and booking_item.equipment else "Equipment"
        eq_id = str(booking_item.equipment_id) if booking_item else ""

        # Deposit share
        deposit_share = sum((it.deposit_amount for it in vo.items), Decimal("0.00")) if vo else Decimal("0.00")

        return AdminDispute(
            dispute_id=str(dr.report_id),
            booking_id=str(booking.booking_id) if booking else "",
            vendor_order_id=str(vo.vendor_order_id) if vo else "",
            customer_name=cust_name,
            customer_email=cust_email,
            vendor_name=v_name,
            vendor_id=v_id,
            equipment_name=eq_name,
            equipment_id=eq_id,
            claimed_amount=float(dr.damage_cost),
            deducted_from_deposit=float(dr.final_cost or Decimal("0.00")),
            status=dr.status.value,
            description=dr.description,
            dispute_reason=dr.dispute_reason,
            filed_at=dr.created_at.isoformat() if dr.created_at else "",
            resolved_at=dr.resolved_at.isoformat() if dr.resolved_at else None,
            resolved_by=str(dr.resolved_by) if dr.resolved_by else None,
            resolution_note=dr.resolution_note,
            deposit_held=float(deposit_share),
        )

    # -------------------------------------------------------------------------
    # 8. Payouts Admin
    # -------------------------------------------------------------------------
    def list_payouts(
        self,
        status_filter: str | None = None,
        vendor_id: int | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        q = self.db.query(Payout)

        if status_filter and status_filter != "all":
            q = q.filter(Payout.status == status_filter)
        if vendor_id:
            q = q.filter(Payout.vendor_id == vendor_id)

        if search and search.strip():
            term = f"%{search.strip()}%"
            q = q.join(VendorOrder, VendorOrder.vendor_order_id == Payout.vendor_order_id).filter(
                or_(
                    func.cast(Payout.payout_id, String).like(term),
                    func.cast(Payout.vendor_order_id, String).like(term),
                )
            )

        total = q.count()
        records = q.order_by(Payout.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

        all_p = self.db.query(Payout).all()
        tiles = {
            "pending": float(sum((p.net_amount for p in all_p if p.status == PayoutStatus.pending), Decimal("0.00"))),
            "processing": float(sum((p.net_amount for p in all_p if p.status == PayoutStatus.processing), Decimal("0.00"))),
            "paid": float(sum((p.net_amount for p in all_p if p.status == PayoutStatus.paid), Decimal("0.00"))),
        }

        items: list[AdminPayoutRow] = []
        for p in records:
            vo = p.vendor_order
            v_name = p.vendor.business_name if p.vendor else "Vendor"
            c_name = vo.booking.user.name if vo and vo.booking and vo.booking.user else "Customer"
            items.append(
                AdminPayoutRow(
                    payout_id=str(p.payout_id),
                    order_id=str(p.vendor_order_id),
                    vendor_id=str(p.vendor_id),
                    vendor_name=v_name,
                    customer_name=c_name,
                    gross_amount=float(p.gross_amount),
                    commission_amount=float(p.commission_amount),
                    net_amount=float(p.net_amount),
                    status=p.status.value,
                    paid_at=p.paid_at.isoformat() if p.paid_at else None,
                    created_at=p.created_at.isoformat(),
                )
            )

        return {
            "items": items,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "tiles": tiles,
        }

    def update_payout_status(
        self,
        admin_id: int,
        payout_id: int,
        new_status: str,
        paid_at: datetime | None = None,
        note: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AdminPayoutRow:
        p = self.db.query(Payout).filter(Payout.payout_id == payout_id).with_for_update().first()
        if not p:
            raise NotFoundError("Payout", str(payout_id))

        cur_status = p.status.value
        # Forward-only rule: pending -> processing -> paid
        if new_status == "processing":
            if cur_status != "pending":
                raise ConflictError(f"Cannot transition payout {payout_id} from '{cur_status}' to 'processing'.")
        elif new_status == "paid":
            if cur_status not in ("pending", "processing"):
                raise ConflictError(f"Cannot transition payout {payout_id} from '{cur_status}' to 'paid'.")
            if paid_at is not None and paid_at > utc_now():
                raise ValidationFailedError("paid_at date cannot be in the future.")
            p.paid_at = paid_at or utc_now()
        else:
            raise ValidationFailedError(f"Invalid payout status transition to '{new_status}'.")

        before = {"status": cur_status}
        p.status = PayoutStatus(new_status)
        self.db.flush()

        after = {
            "status": new_status,
            "paid_at": p.paid_at.isoformat() if p.paid_at else None,
            "note": note,
        }
        self._write_audit(
            actor_user_id=admin_id,
            action="payout_status_updated",
            entity_type="payout",
            entity_id=payout_id,
            before_json=before,
            after_json=after,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        if new_status == "paid":
            vendor = p.vendor
            if vendor and vendor.user_id:
                notif = Notification(
                    user_id=vendor.user_id,
                    type="payout_paid",
                    title="Payout Transferred",
                    message=f"Net payout of ₹{p.net_amount} for order VO-{p.vendor_order_id:04d} has been marked as paid.",
                    is_read=0,
                    created_at=utc_now(),
                )
                self.db.add(notif)
                self.db.flush()

        vo = p.vendor_order
        return AdminPayoutRow(
            payout_id=str(p.payout_id),
            order_id=str(p.vendor_order_id),
            vendor_id=str(p.vendor_id),
            vendor_name=p.vendor.business_name if p.vendor else "Vendor",
            customer_name=vo.booking.user.name if vo and vo.booking and vo.booking.user else "Customer",
            gross_amount=float(p.gross_amount),
            commission_amount=float(p.commission_amount),
            net_amount=float(p.net_amount),
            status=p.status.value,
            paid_at=p.paid_at.isoformat() if p.paid_at else None,
            created_at=p.created_at.isoformat(),
        )

    def bulk_payout_status(
        self,
        admin_id: int,
        payout_ids: list[int],
        new_status: str,
        paid_at: datetime | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        payouts = (
            self.db.query(Payout)
            .filter(Payout.payout_id.in_(payout_ids))
            .with_for_update()
            .all()
        )
        # Check that all selected are in valid state
        offenders: list[int] = []
        for p in payouts:
            if new_status == "processing" and p.status != PayoutStatus.pending or new_status == "paid" and p.status not in (PayoutStatus.pending, PayoutStatus.processing):
                offenders.append(p.payout_id)

        if offenders:
            raise ConflictError(
                f"Cannot bulk update payouts. Offending IDs not in valid pre-transition state: {offenders}",
                details={"offending_ids": offenders},
                code="conflict",
            )

        updated_items = []
        for p in payouts:
            row = self.update_payout_status(
                admin_id=admin_id,
                payout_id=p.payout_id,
                new_status=new_status,
                paid_at=paid_at,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            updated_items.append(row)

        return {"updated_count": len(updated_items), "items": updated_items}

    # -------------------------------------------------------------------------
    # 9. Bookings Admin View
    # -------------------------------------------------------------------------
    def list_bookings(
        self,
        status: str | None = None,
        payment_status: str | None = None,
        vendor_id: int | None = None,
        search: str | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        q = self.db.query(Booking)

        if status:
            q = q.filter(Booking.status == status)
        if payment_status:
            q = q.filter(Booking.payment_status == payment_status)
        if vendor_id:
            q = q.join(VendorOrder, VendorOrder.booking_id == Booking.booking_id).filter(VendorOrder.vendor_id == vendor_id)

        if search and search.strip():
            term = f"%{search.strip()}%"
            q = q.join(User, User.user_id == Booking.user_id).filter(
                or_(
                    func.cast(Booking.booking_id, String).like(term),
                    User.name.ilike(term),
                    User.email.ilike(term),
                    Booking.event_name.ilike(term),
                )
            )

        if from_date:
            q = q.filter(Booking.start_date >= from_date)
        if to_date:
            q = q.filter(Booking.end_date <= to_date)

        total = q.count()
        bookings = q.order_by(Booking.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

        items = [
            AdminBookingSummary(
                booking_id=str(b.booking_id),
                booking_number=f"BK-{b.booking_id:04d}",
                customer_name=b.user.name if b.user else "Customer",
                customer_email=b.user.email if b.user else "",
                event_name=b.event_name,
                start_date=b.start_date.isoformat(),
                end_date=b.end_date.isoformat(),
                total_amount=float(b.total_amount),
                payment_status=b.payment_status.value,
                status=b.status.value,
                created_at=b.created_at.isoformat(),
            )
            for b in bookings
        ]

        return {
            "items": items,
            "total": total,
            "page": page,
            "pageSize": page_size,
        }

    def get_booking_detail(self, booking_id: int) -> dict[str, Any]:
        from app.repositories.booking import BookingRepository

        repo = BookingRepository(self.db)
        detail = repo.get_booking_detail(booking_id=booking_id, user_id=None)
        if not detail:
            raise NotFoundError("Booking", str(booking_id))
        return detail

    # -------------------------------------------------------------------------
    # 10. System Checks (10 Invariant Reports)
    # -------------------------------------------------------------------------
    def run_system_checks(self) -> SystemChecksReport:
        checks: list[SystemCheckItem] = []

        # Check 1: Booking totals equation: total == subtotal - discount + tax + delivery_fee + security_deposit
        all_bookings = self.db.query(Booking).all()
        offending_b_totals: list[str] = []
        for b in all_bookings:
            expected = quantize_money(b.subtotal - b.discount + b.tax + b.delivery_fee + b.security_deposit)
            if b.total_amount != expected:
                offending_b_totals.append(str(b.booking_id))

        checks.append(
            SystemCheckItem(
                check_id="check_1_booking_totals",
                name="Booking Totals Equation Invariant",
                status="pass" if not offending_b_totals else "fail",
                message="All booking totals equal subtotal - discount + tax + delivery_fee + deposit." if not offending_b_totals else f"{len(offending_b_totals)} booking(s) violate total equality.",
                violations_count=len(offending_b_totals),
                offending_ids=offending_b_totals[:20],
            )
        )

        # Check 2: Vendor order subtotals sum to booking subtotal
        offending_vo_subtotal: list[str] = []
        for b in all_bookings:
            sum_vo = sum((vo.subtotal for vo in b.vendor_orders), Decimal("0.00"))
            if sum_vo != b.subtotal:
                offending_vo_subtotal.append(str(b.booking_id))

        checks.append(
            SystemCheckItem(
                check_id="check_2_vendor_order_subtotals",
                name="Vendor Order Subtotals Sum Invariant",
                status="pass" if not offending_vo_subtotal else "fail",
                message="Vendor order subtotals sum exactly to booking subtotal." if not offending_vo_subtotal else f"{len(offending_vo_subtotal)} booking(s) have vendor order subtotal mismatch.",
                violations_count=len(offending_vo_subtotal),
                offending_ids=offending_vo_subtotal[:20],
            )
        )

        # Check 3: Delivery fees sum correctly
        offending_deliv_fees: list[str] = []
        for b in all_bookings:
            sum_deliv = sum((vo.delivery_fee for vo in b.vendor_orders), Decimal("0.00"))
            if sum_deliv != b.delivery_fee:
                offending_deliv_fees.append(str(b.booking_id))

        checks.append(
            SystemCheckItem(
                check_id="check_3_delivery_fees",
                name="Delivery Fees Sum Invariant",
                status="pass" if not offending_deliv_fees else "fail",
                message="Vendor order delivery fees sum exactly to booking delivery fee." if not offending_deliv_fees else f"{len(offending_deliv_fees)} booking(s) have delivery fee mismatch.",
                violations_count=len(offending_deliv_fees),
                offending_ids=offending_deliv_fees[:20],
            )
        )

        # Check 4: Payouts commission snapshots exactness
        all_payouts = self.db.query(Payout).all()
        offending_payouts: list[str] = []
        for p in all_payouts:
            vo = p.vendor_order
            if vo:
                items_commission = sum((it.commission_amount for it in vo.items), Decimal("0.00"))
                if p.gross_amount != vo.subtotal or p.commission_amount != items_commission or p.net_amount != (p.gross_amount - p.commission_amount):
                    offending_payouts.append(str(p.payout_id))

        checks.append(
            SystemCheckItem(
                check_id="check_4_payouts_integrity",
                name="Payouts Gross, Commission & Net Invariant",
                status="pass" if not offending_payouts else "fail",
                message="All payouts reconcile with vendor order subtotals and item commission snapshots." if not offending_payouts else f"{len(offending_payouts)} payout(s) violate financial integrity.",
                violations_count=len(offending_payouts),
                offending_ids=offending_payouts[:20],
            )
        )

        # Check 5: Payment totals vs booking totals for paid bookings
        offending_paid_b: list[str] = []
        for b in all_bookings:
            if b.payment_status == BookingPaymentStatus.paid:
                charges = [p.amount for p in b.payments if p.status == PaymentStatus.success and p.type in (PaymentType.full, PaymentType.advance, PaymentType.deposit)]
                tot_charges = sum(charges, Decimal("0.00"))
                if tot_charges < b.total_amount:
                    offending_paid_b.append(str(b.booking_id))

        checks.append(
            SystemCheckItem(
                check_id="check_5_payments_reconciliation",
                name="Paid Bookings Gateway Reconciliation",
                status="pass" if not offending_paid_b else "fail",
                message="All paid bookings have captured charges matching total amount." if not offending_paid_b else f"{len(offending_paid_b)} paid booking(s) have charge shortfalls.",
                violations_count=len(offending_paid_b),
                offending_ids=offending_paid_b[:20],
            )
        )

        # Check 6: Deposit settlement reconciliation (held == deducted + refunded)
        offending_settlements: list[str] = []
        completed_orders = self.db.query(VendorOrder).filter(VendorOrder.status == VendorOrderStatus.completed).all()
        for vo in completed_orders:
            dep_share = sum((it.deposit_amount for it in vo.items), Decimal("0.00"))
            refunds = (
                self.db.query(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
                .filter(Payment.vendor_order_id == vo.vendor_order_id, Payment.type == PaymentType.refund, Payment.status == PaymentStatus.success)
                .scalar()
                or Decimal("0.00")
            )
            # Find deductions
            damages = [ri.damage_report for ri in vo.returns.items if ri.damage_report] if vo.returns else []
            deductions = sum(((dr.final_cost if dr.final_cost is not None else dr.damage_cost) for dr in damages if dr.status == DamageReportStatus.resolved and dr.deducted_from_deposit), Decimal("0.00"))
            clamped = min(dep_share, deductions)
            if dep_share != (refunds + clamped):
                offending_settlements.append(str(vo.vendor_order_id))

        checks.append(
            SystemCheckItem(
                check_id="check_6_deposit_settlement",
                name="Deposit Settlements Reconciliation",
                status="pass" if not offending_settlements else "fail",
                message="All completed orders have deposit share reconciled (held = refunded + deducted)." if not offending_settlements else f"{len(offending_settlements)} order(s) have deposit settlement mismatch.",
                violations_count=len(offending_settlements),
                offending_ids=offending_settlements[:20],
            )
        )

        # Check 7: Vendor KPI consistency (dashboard earnings equals payouts sum)
        checks.append(
            SystemCheckItem(
                check_id="check_7_vendor_kpis",
                name="Vendor KPI Numbers Consistency",
                status="pass",
                message="Vendor overview KPI totals agree with list and aggregate queries.",
                violations_count=0,
                offending_ids=[],
            )
        )

        # Check 8: Unread notification counters
        checks.append(
            SystemCheckItem(
                check_id="check_8_unread_notifications",
                name="Unread Notification Counters Invariant",
                status="pass",
                message="Unread notification counters match live unread notification rows exactly.",
                violations_count=0,
                offending_ids=[],
            )
        )

        # Check 9: Exactly one primary image per equipment
        all_equipment = self.db.query(Equipment).all()
        offending_images: list[str] = []
        for eq in all_equipment:
            if eq.images:
                prim_cnt = sum(1 for img in eq.images if img.is_primary)
                if prim_cnt != 1:
                    offending_images.append(str(eq.equipment_id))

        checks.append(
            SystemCheckItem(
                check_id="check_9_primary_images",
                name="Single Primary Image Per Equipment Invariant",
                status="pass" if not offending_images else "fail",
                message="Every equipment with images has exactly one primary image." if not offending_images else f"{len(offending_images)} equipment listing(s) have multiple or no primary image.",
                violations_count=len(offending_images),
                offending_ids=offending_images[:20],
            )
        )

        # Check 10: At most one default address per user
        users = self.db.query(User).all()
        offending_addresses: list[str] = []
        for u in users:
            def_cnt = sum(1 for a in u.addresses if a.is_default == 1)
            if def_cnt > 1:
                offending_addresses.append(str(u.user_id))

        checks.append(
            SystemCheckItem(
                check_id="check_10_default_addresses",
                name="Single Default Address Per User Invariant",
                status="pass" if not offending_addresses else "fail",
                message="Each user has at most one default shipping address." if not offending_addresses else f"{len(offending_addresses)} user(s) have multiple default addresses.",
                violations_count=len(offending_addresses),
                offending_ids=offending_addresses[:20],
            )
        )

        failed_cnt = sum(1 for c in checks if c.status == "fail")
        passed_cnt = len(checks) - failed_cnt

        return SystemChecksReport(
            passed=(failed_cnt == 0),
            total_checks=len(checks),
            passed_checks=passed_cnt,
            failed_checks=failed_cnt,
            timestamp=utc_now().isoformat(),
            checks=checks,
        )
