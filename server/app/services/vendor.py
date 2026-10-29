from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import String, func, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import (
    ConflictError,
    NotFoundError,
    ValidationFailedError,
    VendorNotApprovedError,
)
from app.core.money import quantize_money
from app.core.time import utc_now
from app.integrations.storage import get_storage_client, get_storage_provider, verify_storage_path_for_entity
from app.models.storage import PendingUpload
from app.models.accounts import User, Vendor
from app.models.catalog import (
    Availability,
    AvailabilityReason,
    AvailabilityStatus,
    Category,
    Equipment,
    EquipmentImage,
    EquipmentStatus,
)
from app.models.fulfilment import (
    DamageReport,
    Delivery,
    DeliveryStatus,
    Return,
    ReturnItem,
)
from app.models.orders import (
    Booking,
    BookingItem,
    BookingItemStatus,
    BookingPaymentStatus,
    BookingStatus,
    VendorOrder,
    VendorOrderStatus,
)
from app.models.payments import Payment, PaymentStatus, PaymentType, Payout, PayoutStatus
from app.models.platform import OrderEvent
from app.models.social import Notification, Review
from app.schemas.vendor import (
    AttentionCounts,
    AttentionItem,
    AvailabilityBlockResponse,
    CreateAvailabilityBlockRequest,
    CreateEquipmentRequest,
    EarningsDataPoint,
    InventoryItemResponse,
    InventoryListResponse,
    PayoutLineItem,
    RecordCashRequest,
    RecordDepositSettlementRequest,
    RecordNoShowRequest,
    ScheduleDayGroup,
    ScheduleEvent,
    TopEquipmentItem,
    UpdateEquipmentRequest,
    UpdateVendorProfileRequest,
    VendorKpis,
    VendorOrderDetailResponse,
    VendorOrderItemDetail,
    VendorOrderListResponse,
    VendorOverviewResponse,
    VendorPayoutResponse,
    VendorPayoutsResult,
    VendorPayoutTiles,
    VendorProfileResponse,
    VendorRecentOrder,
    VendorReviewItem,
    VendorReviewsResult,
    VendorReviewSummary,
)
from app.services.lifecycle.actions import allowed_actions
from app.services.pricing import get_effective_commission

logger = logging.getLogger("rent4fraction.vendor_service")


class VendorService:
    def __init__(self, db: Session) -> None:
        self.db = db

    # -------------------------------------------------------------------------
    # 1. Vendor Overview & Dashboard
    # -------------------------------------------------------------------------
    def get_overview(self, vendor_id: int, range_str: str = "30d") -> VendorOverviewResponse:
        now = utc_now()
        today = now.date()

        # Date range bounds
        if range_str == "7d":
            start_dt = now - timedelta(days=7)
            prev_start_dt = start_dt - timedelta(days=7)
        elif range_str == "90d":
            start_dt = now - timedelta(days=90)
            prev_start_dt = start_dt - timedelta(days=90)
        elif range_str == "ytd":
            start_dt = datetime(now.year, 1, 1)
            prev_start_dt = datetime(now.year - 1, 1, 1)
        else:  # default 30d
            start_dt = now - timedelta(days=30)
            prev_start_dt = start_dt - timedelta(days=30)

        # 1. Earnings in Range (SUM of payouts.net_amount where payout was created in range)
        current_payouts = (
            self.db.query(Payout)
            .filter(Payout.vendor_id == vendor_id, Payout.created_at >= start_dt)
            .all()
        )
        current_net = sum((p.net_amount for p in current_payouts), Decimal("0.00"))

        prev_payouts = (
            self.db.query(Payout)
            .filter(
                Payout.vendor_id == vendor_id,
                Payout.created_at >= prev_start_dt,
                Payout.created_at < start_dt,
            )
            .all()
        )
        prev_net = sum((p.net_amount for p in prev_payouts), Decimal("0.00"))

        if prev_net > Decimal("0.00"):
            delta_pct = float(round(((current_net - prev_net) / prev_net) * 100, 1))
            delta_str = f"{'+' if delta_pct >= 0 else ''}{delta_pct}% vs previous period"
        else:
            delta_pct = 100.0 if current_net > 0 else 0.0
            delta_str = f"{'+' if delta_pct >= 0 else ''}{delta_pct}% vs previous period"

        # 2. Orders visibility:
        # In COD mode, all uncancelled bookings are visible to vendors.
        # In online payments mode, only paid or partial bookings are visible.
        valid_orders_query = (
            self.db.query(VendorOrder)
            .join(Booking, Booking.booking_id == VendorOrder.booking_id)
            .filter(
                VendorOrder.vendor_id == vendor_id,
                Booking.status != BookingStatus.cancelled,
            )
        )
        if settings.PAYMENTS_ONLINE_ENABLED:
            valid_orders_query = valid_orders_query.filter(
                Booking.payment_status.in_([BookingPaymentStatus.paid, BookingPaymentStatus.partial])
            )
        all_vendor_orders = valid_orders_query.all()

        pending_orders = sum(1 for o in all_vendor_orders if o.status == VendorOrderStatus.pending)
        active_orders = sum(
            1 for o in all_vendor_orders if o.status in (
                VendorOrderStatus.accepted,
                VendorOrderStatus.dispatched,
                VendorOrderStatus.delivered,
                VendorOrderStatus.returned,
            )
        )
        completed_orders = sum(1 for o in all_vendor_orders if o.status == VendorOrderStatus.completed)

        # Active orders today
        active_today = 0
        for o in all_vendor_orders:
            if (
                o.status
                in (
                    VendorOrderStatus.accepted,
                    VendorOrderStatus.dispatched,
                    VendorOrderStatus.delivered,
                    VendorOrderStatus.returned,
                )
                and o.booking.start_date <= today <= o.booking.end_date
            ):
                active_today += 1

        # Equipment listed count
        equipment_count = (
            self.db.query(func.count(Equipment.equipment_id))
            .filter(Equipment.vendor_id == vendor_id, Equipment.status != EquipmentStatus.archived)
            .scalar()
            or 0
        )

        # Average rating & review count
        reviews = (
            self.db.query(Review)
            .filter(Review.vendor_id == vendor_id)
            .all()
        )
        review_count = len(reviews)
        avg_rating = (
            float(round(sum(r.rating for r in reviews) / review_count, 2))
            if review_count > 0
            else 0.0
        )

        kpis = VendorKpis(
            net_earnings=float(current_net),
            net_earnings_delta=delta_str,
            net_earnings_delta_percent=delta_pct,
            pending_orders=pending_orders,
            active_orders=active_orders,
            active_orders_today=active_today,
            active_orders_delta=None,
            completed_orders=completed_orders,
            completed_orders_delta=None,
            completed_orders_delta_percent=0.0,
            equipment_listed=equipment_count,
            avg_rating=avg_rating,
            rating=avg_rating,
            review_count=review_count,
        )

        # 3. Attention items & counts
        # Attention 1: New orders awaiting response
        waiting_orders_cnt = pending_orders
        # Attention 2: Returns awaiting inspection (returned orders where return has no items)
        returned_orders = [o for o in all_vendor_orders if o.status == VendorOrderStatus.returned]
        returns_awaiting = 0
        for ro in returned_orders:
            if not ro.returns or not ro.returns.items or len(ro.returns.items) == 0:
                returns_awaiting += 1

        # Attention 3: Disputed damage reports
        disputed_cnt = (
            self.db.query(func.count(DamageReport.report_id))
            .join(ReturnItem, ReturnItem.return_item_id == DamageReport.return_item_id)
            .join(Return, Return.return_id == ReturnItem.return_id)
            .join(VendorOrder, VendorOrder.vendor_order_id == Return.vendor_order_id)
            .filter(VendorOrder.vendor_id == vendor_id, DamageReport.status == "disputed")
            .scalar()
            or 0
        )

        # Attention 4: Reviews needing a reply
        reviews_needing_reply = sum(1 for r in reviews if not r.vendor_reply)

        # Attention 5: Low-stock items
        low_stock_cnt = (
            self.db.query(func.count(Equipment.equipment_id))
            .filter(
                Equipment.vendor_id == vendor_id,
                Equipment.status == EquipmentStatus.active,
                Equipment.quantity <= 1,
            )
            .scalar()
            or 0
        )

        attention_counts = AttentionCounts(
            new_orders_waiting=waiting_orders_cnt,
            returns_awaiting_inspection=returns_awaiting,
            disputed_damage_reports=disputed_cnt,
            reviews_needing_reply=reviews_needing_reply,
            low_stock_items=low_stock_cnt,
        )

        attention_items: list[AttentionItem] = []
        if waiting_orders_cnt > 0:
            attention_items.append(
                AttentionItem(
                    id="attn_orders",
                    type="order",
                    title=f"{waiting_orders_cnt} new order(s) awaiting response",
                    label=f"{waiting_orders_cnt} pending order(s)",
                    href="/vendor/orders?status=pending",
                    count=waiting_orders_cnt,
                    tone="warning",
                )
            )
        if returns_awaiting > 0:
            attention_items.append(
                AttentionItem(
                    id="attn_returns",
                    type="return",
                    title=f"{returns_awaiting} return(s) to inspect",
                    label=f"{returns_awaiting} to inspect",
                    href="/vendor/returns?tab=to_inspect",
                    count=returns_awaiting,
                    tone="info",
                )
            )
        if disputed_cnt > 0:
            attention_items.append(
                AttentionItem(
                    id="attn_disputes",
                    type="dispute",
                    title=f"{disputed_cnt} disputed damage report(s)",
                    label=f"{disputed_cnt} dispute(s)",
                    href="/vendor/returns?tab=disputed",
                    count=disputed_cnt,
                    tone="danger",
                )
            )
        if reviews_needing_reply > 0:
            attention_items.append(
                AttentionItem(
                    id="attn_reviews",
                    type="review",
                    title=f"{reviews_needing_reply} review(s) needing a reply",
                    label=f"{reviews_needing_reply} review(s)",
                    href="/vendor?tab=reviews&reply=needs",
                    count=reviews_needing_reply,
                    tone="neutral",
                )
            )
        if low_stock_cnt > 0:
            attention_items.append(
                AttentionItem(
                    id="attn_stock",
                    type="stock",
                    title=f"{low_stock_cnt} low-stock item(s)",
                    label=f"{low_stock_cnt} low stock",
                    href="/vendor/inventory?stock=low",
                    count=low_stock_cnt,
                    tone="warning",
                )
            )

        # 4. Earnings Series
        series: list[EarningsDataPoint] = []
        if range_str in ("7d", "30d"):
            bucket_days = 7 if range_str == "7d" else 30
            for i in range(bucket_days):
                b_date = today - timedelta(days=(bucket_days - 1 - i))
                b_str = b_date.strftime("%Y-%m-%d")
                b_payouts = [p for p in current_payouts if p.created_at.date() == b_date]
                gross_amt = sum((p.gross_amount for p in b_payouts), Decimal("0.00"))
                comm_amt = sum((p.commission_amount for p in b_payouts), Decimal("0.00"))
                net_amt = sum((p.net_amount for p in b_payouts), Decimal("0.00"))
                series.append(
                    EarningsDataPoint(
                        date=b_str,
                        label=b_date.strftime("%b %d"),
                        gross=float(gross_amt),
                        commission=float(comm_amt),
                        net=float(net_amt),
                        amount=float(net_amt),
                    )
                )
        else:
            # 90d or ytd: bucket by week / month
            for i in range(12):
                b_date = today - timedelta(weeks=(11 - i))
                b_str = b_date.strftime("%Y-%m-%d")
                series.append(
                    EarningsDataPoint(
                        date=b_str,
                        label=b_date.strftime("W%W %b"),
                        gross=0.0,
                        commission=0.0,
                        net=0.0,
                        amount=0.0,
                    )
                )

        # 5. Recent Orders
        sorted_orders = sorted(all_vendor_orders, key=lambda x: x.created_at, reverse=True)[:5]
        recent_orders: list[VendorRecentOrder] = []
        for o in sorted_orders:
            cust_name = o.booking.user.name if o.booking and o.booking.user else "Customer"
            items_summary = ", ".join([f"{it.quantity}x {it.equipment.name}" for it in o.items if it.equipment]) or "Rental items"
            total_days = (o.booking.end_date - o.booking.start_date).days + 1
            recent_orders.append(
                VendorRecentOrder(
                    order_id=str(o.vendor_order_id),
                    booking_id=str(o.booking_id),
                    order_number=f"VO-{o.vendor_order_id:04d}",
                    customer_name=cust_name,
                    customer_initials="".join([p[0].upper() for p in cust_name.split()[:2]]),
                    items_summary=items_summary,
                    start_date=o.booking.start_date.isoformat(),
                    end_date=o.booking.end_date.isoformat(),
                    date_range=f"{o.booking.start_date.strftime('%b %d')} - {o.booking.end_date.strftime('%b %d, %Y')}",
                    total_days=total_days,
                    rental_days=total_days,
                    status=o.status.value,
                    amount=float(o.subtotal + o.delivery_fee),
                )
            )

        # 6. Top Equipment by Earnings
        top_eq_list: list[TopEquipmentItem] = []
        eq_items = (
            self.db.query(Equipment)
            .filter(Equipment.vendor_id == vendor_id, Equipment.status != EquipmentStatus.archived)
            .all()
        )
        for eq in eq_items:
            # Calculate total revenue and rental count from completed/active booking items
            item_lines = (
                self.db.query(BookingItem)
                .join(VendorOrder, VendorOrder.vendor_order_id == BookingItem.vendor_order_id)
                .filter(
                    BookingItem.equipment_id == eq.equipment_id,
                    VendorOrder.status.in_([VendorOrderStatus.accepted, VendorOrderStatus.dispatched, VendorOrderStatus.delivered, VendorOrderStatus.returned, VendorOrderStatus.completed]),
                )
                .all()
            )
            revenue = sum((it.total_price for it in item_lines), Decimal("0.00"))
            rent_cnt = len(item_lines)
            primary_img = next((img.url for img in eq.images if img.is_primary), None) or (eq.images[0].url if eq.images else "/images/placeholder.jpg")
            top_eq_list.append(
                TopEquipmentItem(
                    id=str(eq.equipment_id),
                    equipment_id=str(eq.equipment_id),
                    name=eq.name,
                    category=eq.category.name if eq.category else "General",
                    image=primary_img,
                    rental_count=rent_cnt,
                    rentals_count=rent_cnt,
                    avg_rating=float(eq.avg_rating),
                    rating=float(eq.avg_rating),
                    total_revenue=float(revenue),
                    earnings=float(revenue),
                )
            )
        top_eq_list.sort(key=lambda x: x.total_revenue, reverse=True)
        top_equipment = top_eq_list[:5]

        # 7. Next 7 Days Schedule (Deliveries, returns, pickups)
        schedule: list[ScheduleDayGroup] = []
        for d in range(7):
            cur_d = today + timedelta(days=d)
            cur_str = cur_d.strftime("%Y-%m-%d")
            day_label = "Today" if d == 0 else ("Tomorrow" if d == 1 else cur_d.strftime("%A, %b %d"))

            day_events: list[ScheduleEvent] = []
            for vo in all_vendor_orders:
                cust_name = vo.booking.user.name if vo.booking and vo.booking.user else "Customer"
                eq_summary = ", ".join([it.equipment.name for it in vo.items if it.equipment]) or "Equipment"
                loc = vo.booking.delivery_city or "Venue"

                # Check deliveries
                if vo.deliveries and vo.deliveries.scheduled_start and vo.deliveries.scheduled_start.date() == cur_d:
                    day_events.append(
                        ScheduleEvent(
                            id=f"del_{vo.vendor_order_id}",
                            type="pickup" if vo.fulfilment_type == "pickup" else "delivery",
                            time=vo.deliveries.scheduled_start.strftime("%I:%M %p"),
                            customer_name=cust_name,
                            equipment_name=eq_summary,
                            location=loc,
                            order_id=str(vo.vendor_order_id),
                        )
                    )
                # Check returns
                if vo.returns and vo.returns.scheduled_start and vo.returns.scheduled_start.date() == cur_d:
                    day_events.append(
                        ScheduleEvent(
                            id=f"ret_{vo.vendor_order_id}",
                            type="return",
                            time=vo.returns.scheduled_start.strftime("%I:%M %p"),
                            customer_name=cust_name,
                            equipment_name=eq_summary,
                            location=loc,
                            order_id=str(vo.vendor_order_id),
                        )
                    )

            schedule.append(
                ScheduleDayGroup(
                    date=cur_str,
                    day_label=day_label,
                    events=day_events,
                )
            )

        return VendorOverviewResponse(
            range=range_str,
            kpis=kpis,
            earnings_series=series,
            attention_items=attention_items,
            attention=attention_counts,
            recent_orders=recent_orders,
            top_equipment=top_equipment,
            schedule=schedule,
        )

    # -------------------------------------------------------------------------
    # 2. Vendor Orders List & Detail
    # -------------------------------------------------------------------------
    def list_orders(
        self,
        vendor_id: int,
        status_filter: str = "all",
        search: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        page: int = 1,
        page_size: int = 10,
    ) -> VendorOrderListResponse:
        # Enforce Visibility Rule: In COD mode, all uncancelled bookings are visible;
        # in online payments mode, only paid or partial bookings are visible.
        q = (
            self.db.query(VendorOrder)
            .join(Booking, Booking.booking_id == VendorOrder.booking_id)
            .filter(
                VendorOrder.vendor_id == vendor_id,
                Booking.status != BookingStatus.cancelled,
            )
        )
        if settings.PAYMENTS_ONLINE_ENABLED:
            q = q.filter(
                Booking.payment_status.in_([BookingPaymentStatus.paid, BookingPaymentStatus.partial])
            )

        # Status filter mapping
        if status_filter == "pending":
            q = q.filter(VendorOrder.status == VendorOrderStatus.pending)
        elif status_filter == "active":
            q = q.filter(
                VendorOrder.status.in_([
                    VendorOrderStatus.accepted,
                    VendorOrderStatus.dispatched,
                    VendorOrderStatus.delivered,
                    VendorOrderStatus.returned,
                ])
            )
        elif status_filter == "completed":
            q = q.filter(VendorOrder.status == VendorOrderStatus.completed)
        elif status_filter == "closed":
            q = q.filter(VendorOrder.status.in_([VendorOrderStatus.rejected, VendorOrderStatus.cancelled]))

        # Search filter (order number, booking number, customer name)
        if search and search.strip():
            term = f"%{search.strip()}%"
            q = q.join(User, User.user_id == Booking.user_id).filter(
                or_(
                    func.cast(VendorOrder.vendor_order_id, String).like(term),
                    func.cast(Booking.booking_id, String).like(term),
                    User.name.ilike(term),
                    Booking.event_name.ilike(term),
                )
            )

        if start_date:
            q = q.filter(Booking.start_date >= start_date)
        if end_date:
            q = q.filter(Booking.end_date <= end_date)

        total = q.count()
        orders = (
            q.order_by(VendorOrder.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        items = [self._format_order_detail(o) for o in orders]
        return VendorOrderListResponse(
            items=items,
            total=total,
            page=page,
            pageSize=page_size,
        )

    def get_order_detail(self, vendor_id: int, vendor_order_id: int) -> VendorOrderDetailResponse:
        vo = (
            self.db.query(VendorOrder)
            .filter(VendorOrder.vendor_order_id == vendor_order_id, VendorOrder.vendor_id == vendor_id)
            .first()
        )
        if not vo:
            raise NotFoundError("VendorOrder", str(vendor_order_id))

        # Check visibility rule
        if settings.PAYMENTS_ONLINE_ENABLED and vo.booking.payment_status not in (
            BookingPaymentStatus.paid,
            BookingPaymentStatus.partial,
        ):
            raise NotFoundError("VendorOrder", str(vendor_order_id))

        return self._format_order_detail(vo)

    # -------------------------------------------------------------------------
    # COD Operations
    # -------------------------------------------------------------------------
    def record_cash_collected(
        self,
        vendor_id: int,
        vendor_order_id: int,
        req: RecordCashRequest,
        actor_user_id: int,
    ) -> VendorOrderDetailResponse:
        vo = (
            self.db.query(VendorOrder)
            .filter(VendorOrder.vendor_order_id == vendor_order_id, VendorOrder.vendor_id == vendor_id)
            .with_for_update()
            .first()
        )
        if not vo:
            raise NotFoundError("VendorOrder", str(vendor_order_id))

        if vo.status not in (VendorOrderStatus.accepted, VendorOrderStatus.dispatched, VendorOrderStatus.delivered):
            raise ConflictError(f"Cannot record cash collection for order in status '{vo.status.value}'.")

        # Record payment row for COD
        payment = Payment(
            booking_id=vo.booking_id,
            vendor_order_id=vo.vendor_order_id,
            user_id=vo.booking.user_id,
            amount=req.amount,
            currency="INR",
            type=PaymentType.full,
            status=PaymentStatus.success,
            transaction_id=f"cod_{vo.vendor_order_id}_{int(utc_now().timestamp())}",
            payment_method="cod",
            payment_date=utc_now(),
            captured_at=utc_now(),
        )
        self.db.add(payment)

        # Transition order to delivered if dispatched or accepted
        if vo.status != VendorOrderStatus.delivered:
            vo.status = VendorOrderStatus.delivered
            for item in vo.items:
                item.item_status = BookingItemStatus.delivered

        # Update booking payment status
        vo.booking.payment_status = BookingPaymentStatus.paid

        # Delivery proof if provided
        if req.proof_photo_storage_path:
            delivery = self.db.query(Delivery).filter(Delivery.vendor_order_id == vendor_order_id).first()
            if delivery:
                delivery.status = DeliveryStatus.delivered
                delivery.proof_url = req.proof_photo_storage_path

        # Timeline event
        self.db.add(
            OrderEvent(
                booking_id=vo.booking_id,
                vendor_order_id=vo.vendor_order_id,
                actor_user_id=actor_user_id,
                actor_role="vendor",
                event_type="cash_collected",
                from_status=vo.status.value,
                to_status=vo.status.value,
                note=f"Vendor collected ₹{req.amount} in cash on delivery. {req.notes or ''}".strip(),
            )
        )
        self.db.flush()
        return self._format_order_detail(vo)

    def record_no_show(
        self,
        vendor_id: int,
        vendor_order_id: int,
        req: RecordNoShowRequest,
        actor_user_id: int,
    ) -> VendorOrderDetailResponse:
        vo = (
            self.db.query(VendorOrder)
            .filter(VendorOrder.vendor_order_id == vendor_order_id, VendorOrder.vendor_id == vendor_id)
            .with_for_update()
            .first()
        )
        if not vo:
            raise NotFoundError("VendorOrder", str(vendor_order_id))

        if vo.status in (VendorOrderStatus.completed, VendorOrderStatus.cancelled, VendorOrderStatus.rejected):
            raise ConflictError(f"Cannot mark no-show for order in status '{vo.status.value}'.")

        from_status = vo.status.value
        vo.status = VendorOrderStatus.cancelled
        for item in vo.items:
            item.item_status = BookingItemStatus.cancelled

        # Update delivery status if present
        deliveries = self.db.query(Delivery).filter(Delivery.vendor_order_id == vendor_order_id).all()
        for d in deliveries:
            d.status = DeliveryStatus.failed

        # Log timeline event with specific event_type="customer_no_show"
        # This is tracked by checkout service to enforce no-show threshold
        self.db.add(
            OrderEvent(
                booking_id=vo.booking_id,
                vendor_order_id=vo.vendor_order_id,
                actor_user_id=actor_user_id,
                actor_role="vendor",
                event_type="customer_no_show",
                from_status=from_status,
                to_status="cancelled",
                note=f"Customer no-show recorded: {req.reason}. {req.notes or ''}".strip(),
            )
        )
        self.db.flush()
        return self._format_order_detail(vo)

    def record_deposit_settlement(
        self,
        vendor_id: int,
        vendor_order_id: int,
        req: RecordDepositSettlementRequest,
        actor_user_id: int,
    ) -> VendorOrderDetailResponse:
        vo = (
            self.db.query(VendorOrder)
            .filter(VendorOrder.vendor_order_id == vendor_order_id, VendorOrder.vendor_id == vendor_id)
            .with_for_update()
            .first()
        )
        if not vo:
            raise NotFoundError("VendorOrder", str(vendor_order_id))

        if vo.status not in (VendorOrderStatus.returned, VendorOrderStatus.delivered):
            raise ConflictError(f"Cannot record deposit settlement for order in status '{vo.status.value}'.")

        from_status = vo.status.value
        vo.status = VendorOrderStatus.completed
        for item in vo.items:
            item.item_status = BookingItemStatus.completed

        # Record timeline event
        self.db.add(
            OrderEvent(
                booking_id=vo.booking_id,
                vendor_order_id=vo.vendor_order_id,
                actor_user_id=actor_user_id,
                actor_role="vendor",
                event_type="deposit_settled",
                from_status=from_status,
                to_status="completed",
                note=f"Deposit settled: ₹{req.deposit_refunded} refunded, ₹{req.damage_deductions} withheld. {req.notes or ''}".strip(),
            )
        )
        self.db.flush()
        return self._format_order_detail(vo)

    def _format_order_detail(self, vo: VendorOrder) -> VendorOrderDetailResponse:
        booking = vo.booking
        cust = booking.user if booking else None

        # Address snapshot
        addr_snap = dict(booking.delivery_address_snapshot) if booking and booking.delivery_address_snapshot else {}

        # Items and commission snapshots
        item_details: list[VendorOrderItemDetail] = []
        tot_commission = Decimal("0.00")
        tot_deposit = Decimal("0.00")

        for it in vo.items:
            tot_commission += it.commission_amount
            tot_deposit += it.deposit_amount

            # Check damage report
            dr_data: dict[str, Any] | None = None
            cond_str = "good"
            if vo.returns:
                ret_item = next((ri for ri in vo.returns.items if ri.booking_item_id == it.booking_item_id), None)
                if ret_item:
                    cond_str = ret_item.item_condition.value if hasattr(ret_item.item_condition, "value") else str(ret_item.item_condition)
                    if ret_item.damage_report:
                        dr = ret_item.damage_report
                        dr_data = {
                            "report_id": str(dr.report_id),
                            "description": dr.description,
                        "evidence_url": getattr(dr, "evidence_url", None),
                        "evidence_public_id": getattr(dr, "evidence_public_id", None),
                            "damage_cost": float(dr.damage_cost),
                            "final_cost": float(dr.final_cost) if dr.final_cost is not None else None,
                            "status": dr.status.value,
                            "deducted_from_deposit": bool(dr.deducted_from_deposit),
                        }

            item_details.append(
                VendorOrderItemDetail(
                    item_id=str(it.booking_item_id),
                    equipment_id=str(it.equipment_id),
                    equipment_name=it.equipment.name if it.equipment else "Item",
                    primary_image_url=(it.equipment.images[0].url if it.equipment and it.equipment.images else None),
                    quantity=it.quantity,
                    daily_rate=float(it.price_per_day),
                    days=it.days,
                    total_price=float(it.total_price),
                    commission_rate=float(it.commission_rate),
                    commission_amount=float(it.commission_amount),
                    deposit_amount=float(it.deposit_amount),
                    status=it.item_status.value if hasattr(it.item_status, "value") else str(it.item_status),
                    condition=cond_str,
                    damage_report=dr_data,
                )
            )

        net_payout = vo.subtotal - tot_commission

        # Delivery details
        deliv_data: dict[str, Any] | None = None
        if vo.deliveries:
            deliv_data = {
                "delivery_id": str(vo.deliveries.delivery_id),
                "type": vo.deliveries.type.value,
                "status": vo.deliveries.status.value,
                "scheduled_start": vo.deliveries.scheduled_start.isoformat() if vo.deliveries.scheduled_start else None,
                "scheduled_end": vo.deliveries.scheduled_end.isoformat() if vo.deliveries.scheduled_end else None,
                "delivered_by": vo.deliveries.delivered_by,
                "tracking_info": vo.deliveries.tracking_info,
                "proof_url": vo.deliveries.proof_url,
                "proof_public_id": getattr(vo.deliveries, "proof_public_id", None),
            }

        # Return details
        return_data: dict[str, Any] | None = None
        damage_reports_list: list[dict[str, Any]] = []
        if vo.returns:
            return_data = {
                "return_id": str(vo.returns.return_id),
                "status": vo.returns.status.value,
                "scheduled_start": vo.returns.scheduled_start.isoformat() if vo.returns.scheduled_start else None,
                "scheduled_end": vo.returns.scheduled_end.isoformat() if vo.returns.scheduled_end else None,
                "return_date": vo.returns.return_date.isoformat() if vo.returns.return_date else None,
                "note": vo.returns.note,
                "inspected": bool(vo.returns.items and len(vo.returns.items) > 0),
            }
            for ri in vo.returns.items:
                if ri.damage_report:
                    dr = ri.damage_report
                    damage_reports_list.append({
                        "report_id": str(dr.report_id),
                        "item_id": str(ri.booking_item_id),
                        "equipment_name": ri.booking_item.equipment.name if ri.booking_item and ri.booking_item.equipment else "Equipment",
                        "description": dr.description,
                        "damage_cost": float(dr.damage_cost),
                        "final_cost": float(dr.final_cost) if dr.final_cost is not None else None,
                        "status": dr.status.value,
                        "deducted_from_deposit": bool(dr.deducted_from_deposit),
                    })

        # Activity timeline (Order events)
        events_list: list[dict[str, Any]] = []
        order_events = (
            self.db.query(OrderEvent)
            .filter(
                OrderEvent.booking_id == vo.booking_id,
                or_(OrderEvent.vendor_order_id == vo.vendor_order_id, OrderEvent.vendor_order_id.is_(None)),
            )
            .order_by(OrderEvent.created_at.asc())
            .all()
        )
        for ev in order_events:
            events_list.append({
                "event_id": str(ev.order_event_id),
                "event_type": ev.event_type,
                "actor_role": ev.actor_role,
                "from_status": ev.from_status,
                "to_status": ev.to_status,
                "note": ev.note,
                "timestamp": ev.created_at.isoformat() if ev.created_at else None,
            })

        # Calculate allowed actions
        damages = [ri.damage_report for ri in vo.returns.items if ri.damage_report] if vo.returns else []
        actions = allowed_actions(order=vo, role="vendor", items=vo.items, damage_reports=damages)

        total_days = (booking.end_date - booking.start_date).days + 1 if booking else 1

        # Deposit held/deducted/refunded
        total_deductions = Decimal("0.00")
        for dr in damages:
            if dr and dr.status.value == "resolved" and dr.deducted_from_deposit:
                total_deductions += dr.final_cost if dr.final_cost is not None else dr.damage_cost
        clamped_deductions = min(tot_deposit, total_deductions)
        deposit_refunded = (tot_deposit - clamped_deductions) if vo.status == VendorOrderStatus.completed else Decimal("0.00")

        return VendorOrderDetailResponse(
            vendor_order_id=str(vo.vendor_order_id),
            order_number=f"VO-{vo.vendor_order_id:04d}",
            booking_id=str(vo.booking_id),
            booking_number=f"BK-{booking.booking_id:04d}" if booking else "",
            customer_name=cust.name if cust else "Customer",
            customer_phone=cust.phone if cust else None,
            customer_email=cust.email if cust else None,
            delivery_address=addr_snap,
            fulfilment_type=vo.fulfilment_type,
            status=vo.status.value,
            start_date=booking.start_date.isoformat() if booking else "",
            end_date=booking.end_date.isoformat() if booking else "",
            total_days=total_days,
            subtotal=float(vo.subtotal),
            delivery_fee=float(vo.delivery_fee),
            commission_amount=float(tot_commission),
            net_payout=float(net_payout),
            deposit_share=float(tot_deposit),
            deposit_held=float(tot_deposit),
            deposit_refunded=float(deposit_refunded),
            deposit_deducted=float(clamped_deductions),
            items=item_details,
            delivery=deliv_data,
            return_record=return_data,
            damage_reports=damage_reports_list,
            events=events_list,
            allowed_actions=[str(a) for a in actions],
            rejection_reason=vo.rejection_reason,
        )

    # -------------------------------------------------------------------------
    # 3. Inventory Management
    # -------------------------------------------------------------------------
    def list_inventory(
        self,
        vendor_id: int,
        status_filter: str | None = None,
        category_id: int | None = None,
        low_stock: bool | None = None,
        search: str | None = None,
        sort: str = "newest",
        page: int = 1,
        page_size: int = 10,
    ) -> InventoryListResponse:
        q = self.db.query(Equipment).filter(Equipment.vendor_id == vendor_id)

        # Filters
        if status_filter:
            q = q.filter(Equipment.status == status_filter)
        else:
            q = q.filter(Equipment.status != EquipmentStatus.archived)

        if category_id:
            q = q.filter(Equipment.category_id == category_id)

        if low_stock:
            q = q.filter(Equipment.quantity <= 1)

        if search and search.strip():
            term = f"%{search.strip()}%"
            q = q.filter(or_(Equipment.name.ilike(term), Equipment.description.ilike(term)))

        # Sorting
        if sort == "price_asc":
            q = q.order_by(Equipment.price_per_day.asc())
        elif sort == "price_desc":
            q = q.order_by(Equipment.price_per_day.desc())
        elif sort == "rating":
            q = q.order_by(Equipment.avg_rating.desc())
        else:
            q = q.order_by(Equipment.created_at.desc())

        total = q.count()
        records = q.offset((page - 1) * page_size).limit(page_size).all()

        # Stats
        all_vendor_eq = self.db.query(Equipment).filter(Equipment.vendor_id == vendor_id).all()
        stats = {
            "all": len([e for e in all_vendor_eq if e.status != EquipmentStatus.archived]),
            "active": len([e for e in all_vendor_eq if e.status == EquipmentStatus.active]),
            "inactive": len([e for e in all_vendor_eq if e.status == EquipmentStatus.inactive]),
            "low_stock": len([e for e in all_vendor_eq if e.status == EquipmentStatus.active and e.quantity <= 1]),
            "archived": len([e for e in all_vendor_eq if e.status == EquipmentStatus.archived]),
        }

        items = [self._format_inventory_item(eq) for eq in records]
        return InventoryListResponse(
            items=items,
            total=total,
            page=page,
            pageSize=page_size,
            stats=stats,
        )

    def get_inventory_item(self, vendor_id: int, equipment_id: int) -> InventoryItemResponse:
        eq = (
            self.db.query(Equipment)
            .filter(Equipment.equipment_id == equipment_id, Equipment.vendor_id == vendor_id)
            .first()
        )
        if not eq:
            raise NotFoundError("Equipment", str(equipment_id))
        return self._format_inventory_item(eq)

    def _format_inventory_item(self, eq: Equipment) -> InventoryItemResponse:
        # Effective commission and source
        eff_rate, comm_source = get_effective_commission(
            db=self.db,
            equipment_id=eq.equipment_id,
            category_id=eq.category_id,
            vendor_id=eq.vendor_id,
        )

        primary_url = next((i.url for i in eq.images if i.is_primary), None) or (
            eq.images[0].url if eq.images else "/images/placeholder.jpg"
        )

        # Specifications and includes
        specs_dict = dict(eq.specifications) if eq.specifications and isinstance(eq.specifications, dict) else {}
        includes_list: list[str] = specs_dict.get("includes", []) if "includes" in specs_dict else []
        filtered_specs = {k: v for k, v in specs_dict.items() if k != "includes"}

        images_list: list[dict[str, Any]] = [
            {
                "image_id": str(img.image_id),
                "url": img.url,
                "storage_path": img.storage_path,
                "is_primary": bool(img.is_primary),
                "sort_order": img.sort_order,
                "width": img.width,
                "height": img.height,
            }
            for img in eq.images
        ]

        return InventoryItemResponse(
            id=str(eq.equipment_id),
            equipment_id=str(eq.equipment_id),
            vendor_id=str(eq.vendor_id),
            vendor_name=eq.vendor.business_name if eq.vendor else "",
            name=eq.name,
            description=eq.description or "",
            category_id=str(eq.category_id),
            category_name=eq.category.name if eq.category else "",
            category=eq.category.name if eq.category else "",
            parent_category_id=str(eq.category.parent_id) if eq.category and eq.category.parent_id else None,
            parent_category_name=eq.category.parent.name if eq.category and eq.category.parent else None,
            price_per_day=float(eq.price_per_day),
            price=float(eq.price_per_day),
            security_deposit=float(eq.security_deposit),
            deposit=float(eq.security_deposit),
            quantity=eq.quantity,
            stock=eq.quantity,
            min_rental_days=eq.min_rental_days,
            delivery_available=bool(eq.delivery_available),
            avg_rating=float(eq.avg_rating),
            rating=float(eq.avg_rating),
            review_count=eq.review_count,
            reviews=eq.review_count,
            status=eq.status.value if hasattr(eq.status, "value") else str(eq.status),
            primary_image_url=primary_url,
            image=primary_url,
            images=images_list,
            includes=includes_list,
            included=includes_list,
            specifications=filtered_specs,
            commission_rate=float(eff_rate),
            commission_source=comm_source,
            created_at=eq.created_at.isoformat() if eq.created_at else "",
            updated_at=eq.updated_at.isoformat() if eq.updated_at else "",
            updated=eq.updated_at.isoformat() if eq.updated_at else "",
        )

    def create_equipment(self, vendor_id: int, payload: CreateEquipmentRequest) -> InventoryItemResponse:
        # Category validation
        cat = self.db.query(Category).filter(Category.category_id == payload.category_id, Category.is_active == 1).first()
        if not cat:
            raise ValidationFailedError("Category does not exist or is inactive.")

        specs = dict(payload.specifications)
        if len(specs) > 20:
            raise ValidationFailedError("Specifications map may contain at most 20 keys.")
        if payload.includes:
            specs["includes"] = payload.includes

        eq = Equipment(
            vendor_id=vendor_id,
            category_id=payload.category_id,
            name=payload.name.strip(),
            description=payload.description.strip() if payload.description else None,
            price_per_day=quantize_money(payload.price_per_day),
            security_deposit=quantize_money(payload.security_deposit),
            quantity=payload.quantity,
            min_rental_days=payload.min_rental_days,
            delivery_available=1 if payload.delivery_available else 0,
            specifications=specs,
            status=EquipmentStatus.active,
        )
        self.db.add(eq)
        self.db.flush()

        # Handle images (max 8 per equipment)
        if len(payload.images) > 8:
            raise ValidationFailedError("Maximum 8 images allowed per equipment listing.")

        storage = get_storage_client()
        provider = get_storage_provider()
        has_primary = False
        for idx, img_p in enumerate(payload.images):
            if img_p.public_id:
                meta = provider.verify_asset(img_p.public_id, asset_type="upload")
                url = meta.secure_url
                pub_id = img_p.public_id
                version_val = meta.version
                fmt_val = meta.format
                bytes_val = meta.bytes
                w_val = meta.width
                h_val = meta.height
                pending = self.db.query(PendingUpload).filter(PendingUpload.public_id == img_p.public_id).first()
                if pending:
                    pending.status = "attached"
                    pending.entity_id = eq.equipment_id
            else:
                if img_p.storage_path:
                    verify_storage_path_for_entity(
                        storage_path=img_p.storage_path,
                        vendor_id=vendor_id,
                        expected_purpose="equipment_image",
                        storage=storage,
                    )
                url = img_p.url or f"https://res.cloudinary.com/fake-cloud/image/upload/{img_p.storage_path or 'placeholder'}"
                pub_id = None
                version_val = None
                fmt_val = None
                bytes_val = img_p.size_bytes
                w_val = img_p.width
                h_val = img_p.height

            is_prim = 1 if (img_p.is_primary or (idx == 0 and not has_primary)) else 0
            if is_prim:
                has_primary = True

            img_row = EquipmentImage(
                equipment_id=eq.equipment_id,
                url=url,
                provider="cloudinary",
                public_id=pub_id,
                version=version_val,
                format=fmt_val,
                bytes=bytes_val,
                alt_text=img_p.alt_text,
                storage_path=img_p.storage_path,
                is_primary=is_prim,
                sort_order=img_p.sort_order if img_p.sort_order is not None else idx,
                width=w_val,
                height=h_val,
                placeholder_color=img_p.placeholder_color,
                content_type=img_p.content_type,
                size_bytes=bytes_val,
            )
            self.db.add(img_row)

        self.db.flush()
        return self._format_inventory_item(eq)

    def update_equipment(
        self, vendor_id: int, equipment_id: int, payload: UpdateEquipmentRequest
    ) -> InventoryItemResponse:
        eq = (
            self.db.query(Equipment)
            .filter(Equipment.equipment_id == equipment_id, Equipment.vendor_id == vendor_id)
            .with_for_update()
            .first()
        )
        if not eq:
            raise NotFoundError("Equipment", str(equipment_id))

        if payload.category_id is not None:
            cat = self.db.query(Category).filter(Category.category_id == payload.category_id, Category.is_active == 1).first()
            if not cat:
                raise ValidationFailedError("Category does not exist or is inactive.")
            eq.category_id = payload.category_id

        if payload.name is not None:
            eq.name = payload.name.strip()
        if payload.description is not None:
            eq.description = payload.description.strip()
        if payload.price_per_day is not None:
            eq.price_per_day = quantize_money(payload.price_per_day)
        if payload.security_deposit is not None:
            eq.security_deposit = quantize_money(payload.security_deposit)
        if payload.min_rental_days is not None:
            eq.min_rental_days = payload.min_rental_days
        if payload.delivery_available is not None:
            eq.delivery_available = 1 if payload.delivery_available else 0

        # Quantity floor check: quantity cannot drop below units currently booked for any upcoming date
        if payload.quantity is not None:
            today = utc_now().date()
            booked_max = (
                self.db.query(func.coalesce(func.max(BookingItem.quantity), 0))
                .join(Booking, Booking.booking_id == BookingItem.booking_id)
                .filter(
                    BookingItem.equipment_id == equipment_id,
                    Booking.end_date >= today,
                    BookingItem.item_status.in_([BookingItemStatus.pending, BookingItemStatus.confirmed, BookingItemStatus.delivered]),
                )
                .scalar()
                or 0
            )
            if payload.quantity < booked_max:
                raise ConflictError(
                    f"Quantity cannot be reduced to {payload.quantity} because {booked_max} units are booked for upcoming rentals.",
                    code="conflict",
                )
            eq.quantity = payload.quantity

        if payload.status is not None:
            if payload.status == EquipmentStatus.archived:
                self._assert_can_archive(equipment_id)
            eq.status = payload.status

        # Specifications / includes
        if payload.specifications is not None or payload.includes is not None:
            current_specs = dict(eq.specifications) if eq.specifications and isinstance(eq.specifications, dict) else {}
            if payload.specifications is not None:
                current_specs = dict(payload.specifications)
            if payload.includes is not None:
                current_specs["includes"] = payload.includes
            eq.specifications = current_specs

        # Images (max 8 per equipment)
        if payload.images is not None:
            if len(payload.images) > 8:
                raise ValidationFailedError("Maximum 8 images allowed per equipment listing.")

            storage = get_storage_client()
            provider = get_storage_provider()

            # Clean up removed images from Cloudinary (best effort)
            kept_pub_ids = {p.public_id for p in payload.images if p.public_id}
            old_images = self.db.query(EquipmentImage).filter(EquipmentImage.equipment_id == equipment_id).all()
            for old_img in old_images:
                if old_img.public_id and old_img.public_id not in kept_pub_ids:
                    try:
                        provider.delete_asset(old_img.public_id)
                    except Exception as e:
                        logger.warning("Could not delete removed Cloudinary asset '%s': %s", old_img.public_id, e)

            # Remove old rows
            self.db.query(EquipmentImage).filter(EquipmentImage.equipment_id == equipment_id).delete()
            has_primary = False
            for idx, img_p in enumerate(payload.images):
                if img_p.public_id:
                    meta = provider.verify_asset(img_p.public_id, asset_type="upload")
                    url = meta.secure_url
                    pub_id = img_p.public_id
                    version_val = meta.version
                    fmt_val = meta.format
                    bytes_val = meta.bytes
                    w_val = meta.width
                    h_val = meta.height
                    pending = self.db.query(PendingUpload).filter(PendingUpload.public_id == img_p.public_id).first()
                    if pending:
                        pending.status = "attached"
                        pending.entity_id = equipment_id
                else:
                    if img_p.storage_path:
                        verify_storage_path_for_entity(
                            storage_path=img_p.storage_path,
                            vendor_id=vendor_id,
                            expected_purpose="equipment_image",
                            storage=storage,
                        )
                    url = img_p.url or f"https://res.cloudinary.com/fake-cloud/image/upload/{img_p.storage_path or 'placeholder'}"
                    pub_id = None
                    version_val = None
                    fmt_val = None
                    bytes_val = img_p.size_bytes
                    w_val = img_p.width
                    h_val = img_p.height

                is_prim = 1 if (img_p.is_primary or (idx == 0 and not has_primary)) else 0
                if is_prim:
                    has_primary = True

                img_row = EquipmentImage(
                    equipment_id=equipment_id,
                    url=url,
                    provider="cloudinary",
                    public_id=pub_id,
                    version=version_val,
                    format=fmt_val,
                    bytes=bytes_val,
                    alt_text=img_p.alt_text,
                    storage_path=img_p.storage_path,
                    is_primary=is_prim,
                    sort_order=img_p.sort_order if img_p.sort_order is not None else idx,
                    width=w_val,
                    height=h_val,
                    placeholder_color=img_p.placeholder_color,
                    content_type=img_p.content_type,
                    size_bytes=bytes_val,
                )
                self.db.add(img_row)

        self.db.flush()
        return self._format_inventory_item(eq)

    def duplicate_equipment(self, vendor_id: int, equipment_id: int) -> InventoryItemResponse:
        orig = (
            self.db.query(Equipment)
            .filter(Equipment.equipment_id == equipment_id, Equipment.vendor_id == vendor_id)
            .first()
        )
        if not orig:
            raise NotFoundError("Equipment", str(equipment_id))

        dup = Equipment(
            vendor_id=vendor_id,
            category_id=orig.category_id,
            name=f"{orig.name} (Copy)",
            description=orig.description,
            price_per_day=orig.price_per_day,
            security_deposit=orig.security_deposit,
            quantity=orig.quantity,
            min_rental_days=orig.min_rental_days,
            delivery_available=orig.delivery_available,
            specifications=orig.specifications,
            status=EquipmentStatus.inactive,
        )
        self.db.add(dup)
        self.db.flush()

        for img in orig.images:
            dup_img = EquipmentImage(
                equipment_id=dup.equipment_id,
                url=img.url,
                storage_path=img.storage_path,
                is_primary=img.is_primary,
                sort_order=img.sort_order,
                width=img.width,
                height=img.height,
            )
            self.db.add(dup_img)

        self.db.flush()
        return self._format_inventory_item(dup)

    def bulk_status(self, vendor_id: int, equipment_ids: list[int], new_status: str) -> dict[str, Any]:
        target_status = EquipmentStatus(new_status)
        if target_status == EquipmentStatus.archived:
            for eid in equipment_ids:
                self._assert_can_archive(eid)

        updated_cnt = (
            self.db.query(Equipment)
            .filter(Equipment.vendor_id == vendor_id, Equipment.equipment_id.in_(equipment_ids))
            .update({Equipment.status: target_status}, synchronize_session="fetch")
        )
        self.db.flush()
        return {"updated_count": updated_cnt, "status": target_status.value}

    def _assert_can_archive(self, equipment_id: int) -> None:
        today = utc_now().date()
        active_bookings_count = (
            self.db.query(func.count(BookingItem.booking_item_id))
            .join(Booking, Booking.booking_id == BookingItem.booking_id)
            .filter(
                BookingItem.equipment_id == equipment_id,
                Booking.end_date >= today,
                BookingItem.item_status.in_([
                    BookingItemStatus.pending,
                    BookingItemStatus.confirmed,
                    BookingItemStatus.delivered,
                ]),
            )
            .scalar()
            or 0
        )
        if active_bookings_count > 0:
            raise ConflictError(
                f"Equipment {equipment_id} cannot be archived because it has {active_bookings_count} active or upcoming booking(s).",
                details={"active_bookings_count": active_bookings_count, "equipment_id": equipment_id},
                code="conflict",
            )

    # -------------------------------------------------------------------------
    # 4. Availability Blocks
    # -------------------------------------------------------------------------
    def list_availability_blocks(self, vendor_id: int, equipment_id: int) -> list[AvailabilityBlockResponse]:
        eq = (
            self.db.query(Equipment)
            .filter(Equipment.equipment_id == equipment_id, Equipment.vendor_id == vendor_id)
            .first()
        )
        if not eq:
            raise NotFoundError("Equipment", str(equipment_id))

        blocks = (
            self.db.query(Availability)
            .filter(Availability.equipment_id == equipment_id, Availability.status == AvailabilityStatus.active)
            .order_by(Availability.start_date.asc())
            .all()
        )

        return [
            AvailabilityBlockResponse(
                id=str(b.availability_id),
                block_id=str(b.availability_id),
                equipment_id=str(b.equipment_id),
                start_date=b.start_date.isoformat(),
                end_date=b.end_date.isoformat(),
                reason=b.reason.value,
                units=b.quantity_blocked,
                quantity=b.quantity_blocked,
                note=None,
                created_at=utc_now().isoformat(),
            )
            for b in blocks
        ]

    def add_availability_block(
        self, vendor_id: int, equipment_id: int, payload: CreateAvailabilityBlockRequest
    ) -> AvailabilityBlockResponse:
        eq = (
            self.db.query(Equipment)
            .filter(Equipment.equipment_id == equipment_id, Equipment.vendor_id == vendor_id)
            .with_for_update()
            .first()
        )
        if not eq:
            raise NotFoundError("Equipment", str(equipment_id))

        if payload.end_date < payload.start_date:
            raise ValidationFailedError("End date cannot be before start date.")

        if payload.units > eq.quantity:
            raise ValidationFailedError(f"Requested {payload.units} units exceeds total equipment stock {eq.quantity}.")

        # Validate that blocked units are free on EVERY day of the range
        # Check bookings and other blocks
        cur_d = payload.start_date
        while cur_d <= payload.end_date:
            # 1. Bookings on cur_d
            booked_units = (
                self.db.query(func.coalesce(func.sum(BookingItem.quantity), 0))
                .join(Booking, Booking.booking_id == BookingItem.booking_id)
                .filter(
                    BookingItem.equipment_id == equipment_id,
                    Booking.start_date <= cur_d,
                    Booking.end_date >= cur_d,
                    BookingItem.item_status.in_([BookingItemStatus.pending, BookingItemStatus.confirmed, BookingItemStatus.delivered]),
                )
                .scalar()
                or 0
            )

            # 2. Existing blocks on cur_d
            blocked_units = (
                self.db.query(func.coalesce(func.sum(Availability.quantity_blocked), 0))
                .filter(
                    Availability.equipment_id == equipment_id,
                    Availability.status == AvailabilityStatus.active,
                    Availability.start_date <= cur_d,
                    Availability.end_date >= cur_d,
                )
                .scalar()
                or 0
            )

            if booked_units + blocked_units + payload.units > eq.quantity:
                raise ConflictError(
                    f"Availability block conflicts with existing bookings on {cur_d.isoformat()} (Available: {eq.quantity - booked_units - blocked_units}, Requested: {payload.units}).",
                    details={"conflicting_date": cur_d.isoformat(), "equipment_id": equipment_id},
                    code="conflict",
                )

            cur_d += timedelta(days=1)

        block = Availability(
            equipment_id=equipment_id,
            start_date=payload.start_date,
            end_date=payload.end_date,
            quantity_blocked=payload.units,
            reason=AvailabilityReason(payload.reason),
            status=AvailabilityStatus.active,
        )
        self.db.add(block)
        self.db.flush()

        return AvailabilityBlockResponse(
            id=str(block.availability_id),
            block_id=str(block.availability_id),
            equipment_id=str(block.equipment_id),
            start_date=block.start_date.isoformat(),
            end_date=block.end_date.isoformat(),
            reason=block.reason.value,
            units=block.quantity_blocked,
            quantity=block.quantity_blocked,
            note=payload.note,
            created_at=utc_now().isoformat(),
        )

    def remove_availability_block(self, vendor_id: int, equipment_id: int, block_id: int) -> dict[str, bool]:
        eq = (
            self.db.query(Equipment)
            .filter(Equipment.equipment_id == equipment_id, Equipment.vendor_id == vendor_id)
            .first()
        )
        if not eq:
            raise NotFoundError("Equipment", str(equipment_id))

        block = (
            self.db.query(Availability)
            .filter(Availability.availability_id == block_id, Availability.equipment_id == equipment_id)
            .first()
        )
        if not block:
            raise NotFoundError("AvailabilityBlock", str(block_id))

        self.db.delete(block)
        self.db.flush()
        return {"success": True}

    # -------------------------------------------------------------------------
    # 5. Payouts
    # -------------------------------------------------------------------------
    def list_payouts(
        self,
        vendor_id: int,
        status_filter: str | None = None,
        range_str: str | None = None,
        page: int = 1,
        page_size: int = 10,
    ) -> VendorPayoutsResult:
        q = self.db.query(Payout).filter(Payout.vendor_id == vendor_id)

        if status_filter and status_filter != "all":
            q = q.filter(Payout.status == status_filter)

        if range_str == "7d":
            q = q.filter(Payout.created_at >= utc_now() - timedelta(days=7))
        elif range_str == "30d":
            q = q.filter(Payout.created_at >= utc_now() - timedelta(days=30))
        elif range_str == "90d":
            q = q.filter(Payout.created_at >= utc_now() - timedelta(days=90))

        total = q.count()
        records = q.order_by(Payout.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

        # Tiles
        all_vendor_payouts = self.db.query(Payout).filter(Payout.vendor_id == vendor_id).all()
        earned_net = sum((p.net_amount for p in all_vendor_payouts if p.status == PayoutStatus.paid), Decimal("0.00"))
        pending_amt = sum((p.net_amount for p in all_vendor_payouts if p.status == PayoutStatus.pending), Decimal("0.00"))
        processing_amt = sum((p.net_amount for p in all_vendor_payouts if p.status == PayoutStatus.processing), Decimal("0.00"))
        paid_out = sum((p.net_amount for p in all_vendor_payouts if p.status == PayoutStatus.paid), Decimal("0.00"))

        vendor = self.db.query(Vendor).filter(Vendor.vendor_id == vendor_id).first()
        comm_rate = float(vendor.commission_rate) if vendor and vendor.commission_rate else 10.0

        tiles = VendorPayoutTiles(
            total_earned_net=float(earned_net),
            pending=float(pending_amt),
            processing=float(processing_amt),
            paid_out=float(paid_out),
            commission_rate=comm_rate,
        )

        payout_items = [self._format_payout(p) for p in records]
        return VendorPayoutsResult(
            payouts=payout_items,
            items=payout_items,
            total_count=total,
            total=total,
            page=page,
            pageSize=page_size,
            tiles=tiles,
            commission_rate=comm_rate,
        )

    def get_payout_detail(self, vendor_id: int, payout_id: int) -> VendorPayoutResponse:
        p = (
            self.db.query(Payout)
            .filter(Payout.payout_id == payout_id, Payout.vendor_id == vendor_id)
            .first()
        )
        if not p:
            raise NotFoundError("Payout", str(payout_id))
        return self._format_payout(p)

    def _format_payout(self, p: Payout) -> VendorPayoutResponse:
        vo = p.vendor_order
        cust_name = vo.booking.user.name if vo and vo.booking and vo.booking.user else "Customer"
        items_summary = ", ".join([it.equipment.name for it in vo.items if it.equipment]) if vo else ""
        date_range = f"{vo.booking.start_date.strftime('%b %d')} - {vo.booking.end_date.strftime('%b %d, %Y')}" if vo and vo.booking else ""

        # Items breakdown with snapshot commission
        lines: list[PayoutLineItem] = []
        eff_rate = 10.0
        if vo:
            for it in vo.items:
                eff_rate = float(it.commission_rate)
                lines.append(
                    PayoutLineItem(
                        equipment_name=it.equipment.name if it.equipment else "Item",
                        quantity=it.quantity,
                        daily_rate=float(it.price_per_day),
                        days=it.days,
                        subtotal=float(it.total_price),
                        commission_rate=float(it.commission_rate),
                        commission_amount=float(it.commission_amount),
                    )
                )

        timeline = [
            {"status": "pending", "timestamp": p.created_at.isoformat(), "note": "Payout generated upon order completion"},
        ]
        if p.paid_at:
            timeline.append({"status": "paid", "timestamp": p.paid_at.isoformat(), "note": "Funds transferred to vendor account"})

        return VendorPayoutResponse(
            payout_id=str(p.payout_id),
            order_id=str(p.vendor_order_id),
            order_number=f"VO-{p.vendor_order_id:04d}",
            booking_id=str(vo.booking_id) if vo else "",
            customer_name=cust_name,
            items_summary=items_summary,
            rental_dates=date_range,
            gross=float(p.gross_amount),
            gross_amount=float(p.gross_amount),
            commission_rate=eff_rate,
            commission_amount=float(p.commission_amount),
            net=float(p.net_amount),
            net_amount=float(p.net_amount),
            status=p.status.value,
            paid_at=p.paid_at.isoformat() if p.paid_at else None,
            created_at=p.created_at.isoformat(),
            items=lines,
            timeline=timeline,
        )

    # -------------------------------------------------------------------------
    # 6. Reviews
    # -------------------------------------------------------------------------
    def list_reviews(
        self,
        vendor_id: int,
        rating_filter: int | None = None,
        needs_reply: bool | None = None,
        equipment_id: int | None = None,
        sort: str = "newest",
        page: int = 1,
        page_size: int = 10,
    ) -> VendorReviewsResult:
        q = self.db.query(Review).filter(Review.vendor_id == vendor_id)

        if rating_filter:
            q = q.filter(Review.rating == rating_filter)
        if needs_reply:
            q = q.filter(Review.vendor_reply.is_(None))
        if equipment_id:
            q = q.filter(Review.equipment_id == equipment_id)

        if sort == "highest":
            q = q.order_by(Review.rating.desc())
        elif sort == "lowest":
            q = q.order_by(Review.rating.asc())
        else:
            q = q.order_by(Review.review_date.desc())

        total = q.count()
        records = q.offset((page - 1) * page_size).limit(page_size).all()

        # Summary aggregates
        all_reviews = self.db.query(Review).filter(Review.vendor_id == vendor_id).all()
        tot_cnt = len(all_reviews)
        avg = float(round(sum(r.rating for r in all_reviews) / tot_cnt, 2)) if tot_cnt > 0 else 0.0

        dist: dict[int, int] = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        replied_cnt = 0
        for r in all_reviews:
            dist[r.rating] = dist.get(r.rating, 0) + 1
            if r.vendor_reply:
                replied_cnt += 1

        summary = VendorReviewSummary(
            avg=avg,
            average_rating=avg,
            count=tot_cnt,
            total_reviews=tot_cnt,
            distribution=dist,
            replied_count=replied_cnt,
            needs_reply_count=tot_cnt - replied_cnt,
        )

        review_items: list[VendorReviewItem] = []
        for r in records:
            review_items.append(
                VendorReviewItem(
                    review_id=str(r.review_id),
                    equipment_id=str(r.equipment_id),
                    equipment_name=r.equipment.name if r.equipment else "Item",
                    equipment_category=r.equipment.category.name if r.equipment and r.equipment.category else None,
                    equipment_image=(r.equipment.images[0].url if r.equipment and r.equipment.images else None),
                    user_name=r.user.name if r.user else "Customer",
                    customer_name=r.user.name if r.user else "Customer",
                    rating=r.rating,
                    comment=r.comment or "",
                    review_date=r.review_date.strftime("%Y-%m-%d"),
                    created_at=r.review_date.isoformat(),
                    verified_rental=True,
                    vendor_reply=r.vendor_reply,
                    replied_at=r.review_date.isoformat() if r.vendor_reply else None,
                )
            )

        return VendorReviewsResult(
            reviews=review_items,
            items=review_items,
            total=total,
            total_count=total,
            page=page,
            pageSize=page_size,
            summary=summary,
        )

    def reply_to_review(self, vendor_id: int, review_id: int, reply_text: str) -> None:
        rev = (
            self.db.query(Review)
            .filter(Review.review_id == review_id, Review.vendor_id == vendor_id)
            .first()
        )
        if not rev:
            raise NotFoundError("Review", str(review_id))

        rev.vendor_reply = reply_text.strip()
        self.db.flush()

        # Customer notification
        cust_notif = Notification(
            user_id=rev.user_id,
            type="review_replied",
            title="Vendor Replied to Your Review",
            message=f"Vendor replied to your review for {rev.equipment.name if rev.equipment else 'equipment'}: '{reply_text[:60]}...'",
            is_read=0,
            created_at=utc_now(),
        )
        self.db.add(cust_notif)
        self.db.flush()

    # -------------------------------------------------------------------------
    # 7. Business Profile
    # -------------------------------------------------------------------------
    def get_profile(self, vendor_id: int) -> VendorProfileResponse:
        v = self.db.query(Vendor).filter(Vendor.vendor_id == vendor_id).first()
        if not v:
            raise NotFoundError("Vendor", str(vendor_id))
        return self._format_profile(v)

    def update_profile(
        self, vendor_id: int, payload: UpdateVendorProfileRequest, current_status: str
    ) -> VendorProfileResponse:
        # Pending vendors may edit; rejected and suspended vendors receive 403 vendor_not_approved
        if current_status in ("rejected", "suspended"):
            raise VendorNotApprovedError(
                f"Cannot update profile while vendor status is '{current_status}'.",
                details={"approval_status": current_status},
            )

        v = self.db.query(Vendor).filter(Vendor.vendor_id == vendor_id).with_for_update().first()
        if not v:
            raise NotFoundError("Vendor", str(vendor_id))

        if payload.business_name is not None:
            v.business_name = payload.business_name.strip()
        if payload.description is not None:
            v.description = payload.description.strip()
        if payload.address is not None:
            v.address = payload.address.strip()
        if payload.phone is not None:
            v.phone = payload.phone.strip()
        gst_in = payload.gst_number or payload.gst
        if gst_in is not None:
            v.gst_number = gst_in.strip().upper()
        if payload.delivery_fee is not None:
            v.delivery_fee = quantize_money(payload.delivery_fee)

        if payload.logo_public_id is not None:
            provider = get_storage_provider()
            meta = provider.verify_asset(payload.logo_public_id, asset_type="upload")
            v.logo_public_id = payload.logo_public_id
            v.logo_version = meta.version
            v.logo_url = meta.secure_url
            pending = self.db.query(PendingUpload).filter(PendingUpload.public_id == payload.logo_public_id).first()
            if pending:
                pending.status = "attached"
        elif payload.logo_url is not None or payload.logo is not None:
            v.logo_url = (payload.logo_url or payload.logo).strip()
        elif payload.logo_storage_path is not None:
            storage = get_storage_client()
            verify_storage_path_for_entity(
                storage_path=payload.logo_storage_path,
                vendor_id=vendor_id,
                expected_purpose="vendor_logo",
                storage=storage,
            )
            v.logo_storage_path = payload.logo_storage_path
            v.logo_url = f"https://res.cloudinary.com/fake-cloud/image/upload/{payload.logo_storage_path}"


        self.db.flush()
        return self._format_profile(v)

    def _format_profile(self, v: Vendor) -> VendorProfileResponse:
        reviews = self.db.query(Review).filter(Review.vendor_id == v.vendor_id).all()
        avg_r = (
            float(round(sum(r.rating for r in reviews) / len(reviews), 2))
            if reviews
            else 0.0
        )
        owner_name = v.user.name if v.user else ""
        owner_email = v.user.email if v.user else ""

        return VendorProfileResponse(
            vendor_id=str(v.vendor_id),
            business_name=v.business_name,
            description=v.description or "",
            address=v.address or "",
            city="Mumbai",
            phone=v.phone or "",
            gst=v.gst_number,
            gst_number=v.gst_number or "",
            logo=v.logo_url,
            logo_url=v.logo_url or "/images/vendors/placeholder.png",
            logo_public_id=v.logo_public_id,
            logo_version=v.logo_version,
            logo_storage_path=v.logo_storage_path,
            approval_status=v.approval_status.value,
            member_since=v.created_at.strftime("%B %Y") if v.created_at else "2026",
            commission_rate=float(v.commission_rate) if v.commission_rate is not None else 10.0,
            owner_name=owner_name,
            owner_email=owner_email,
            email=owner_email,
            rating=avg_r,
            review_count=len(reviews),
            rejection_reason=v.rejection_reason,
            approved_by=str(v.approved_by) if v.approved_by else None,
            approved_at=v.approved_at.isoformat() if v.approved_at else None,
            delivery_fee=float(v.delivery_fee),
        )
