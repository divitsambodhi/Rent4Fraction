from __future__ import annotations

import logging
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.errors import (
    ConflictError,
    DomainError,
    NotFoundError,
    ValidationFailedError,
)
from app.core.money import quantize_money
from app.core.time import utc_now
from app.integrations.razorpay import PaymentGateway, get_payment_gateway
from app.models.accounts import User
from app.models.fulfilment import (
    DamageReport,
    DamageReportStatus,
    Delivery,
    DeliveryStatus,
    DeliveryType,
    ItemCondition,
    Return,
    ReturnItem,
    ReturnStatus,
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
from app.models.payments import Payout, PayoutStatus
from app.models.platform import AuditLog, OrderEvent
from app.models.social import Notification
from app.services.lifecycle.actions import assert_action_allowed
from app.services.lifecycle.settlement import (
    calculate_deposit_settlement,
    calculate_payout,
    evaluate_dispute_resolution,
)
from app.services.lifecycle.status import derive_booking_status
from app.services.lifecycle.types import (
    DeliveryFailedPayload,
    DisputeResolutionPayload,
    InspectionPayload,
    LifecycleAction,
    LifecycleRole,
    LifecycleTransitionResult,
    MarkDeliveredPayload,
    ScheduleDeliveryPayload,
    ScheduleReturnPayload,
)
from app.services.refunds import refund_deposit_for_vendor_order, refund_vendor_order_share

logger = logging.getLogger("rent4fraction.lifecycle")


class LifecycleService:
    def __init__(self, db: Session, gateway: PaymentGateway | None = None) -> None:
        self.db = db
        self.gateway = gateway or get_payment_gateway()

    # -------------------------------------------------------------------------
    # Helper: Locking Order & Entity Retrieval
    # -------------------------------------------------------------------------
    def _lock_booking_and_order(
        self, vendor_order_id: int
    ) -> tuple[Booking, VendorOrder, list[BookingItem], list[DamageReport]]:
        """
        Locks booking and vendor order rows in global order:
        1. Booking row (SELECT FOR UPDATE)
        2. Vendor Order rows in ascending order (SELECT FOR UPDATE)
        3. Returns booking, target vendor_order, items, and damage reports.
        """
        # Read target vendor_order to find booking_id
        target = self.db.query(VendorOrder).filter(VendorOrder.vendor_order_id == vendor_order_id).first()
        if not target:
            raise NotFoundError("VendorOrder", str(vendor_order_id))

        booking_id = target.booking_id

        # 1. Lock Booking row
        booking = (
            self.db.query(Booking)
            .filter(Booking.booking_id == booking_id)
            .with_for_update()
            .first()
        )
        if not booking:
            raise NotFoundError("Booking", str(booking_id))

        # 2. Lock all Vendor Orders of this booking in ascending order
        vendor_orders = (
            self.db.query(VendorOrder)
            .filter(VendorOrder.booking_id == booking_id)
            .order_by(VendorOrder.vendor_order_id.asc())
            .with_for_update()
            .all()
        )
        vo = next((o for o in vendor_orders if o.vendor_order_id == vendor_order_id), None)
        if not vo:
            raise NotFoundError("VendorOrder", str(vendor_order_id))

        # 3. Load items
        items = (
            self.db.query(BookingItem)
            .filter(BookingItem.vendor_order_id == vendor_order_id)
            .all()
        )

        # 4. Load damage reports for this vendor order
        damage_reports = (
            self.db.query(DamageReport)
            .join(ReturnItem, ReturnItem.return_item_id == DamageReport.return_item_id)
            .join(Return, Return.return_id == ReturnItem.return_id)
            .filter(Return.vendor_order_id == vendor_order_id)
            .all()
        )

        return booking, vo, items, damage_reports

    def _update_items_status(self, items: list[BookingItem], new_status: BookingItemStatus) -> None:
        for it in items:
            it.item_status = new_status
        self.db.flush()

    def _sync_booking_status(self, booking: Booking) -> BookingStatus:
        """Derives and updates parent booking status based on all vendor orders."""
        all_orders = (
            self.db.query(VendorOrder)
            .filter(VendorOrder.booking_id == booking.booking_id)
            .order_by(VendorOrder.vendor_order_id.asc())
            .all()
        )
        new_status = derive_booking_status(all_orders)
        if booking.status != new_status:
            logger.info("Booking %s status updated: %s -> %s", booking.booking_id, booking.status, new_status)
            booking.status = new_status
            self.db.flush()
        return new_status

    def _log_event(
        self,
        booking_id: int,
        vendor_order_id: int | None,
        actor_user_id: int | None,
        actor_role: str,
        event_type: str,
        from_status: str | None,
        to_status: str | None,
        note: str | None = None,
    ) -> OrderEvent:
        event = OrderEvent(
            booking_id=booking_id,
            vendor_order_id=vendor_order_id,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            event_type=event_type,
            from_status=from_status,
            to_status=to_status,
            note=note,
            created_at=utc_now(),
        )
        self.db.add(event)
        self.db.flush()
        return event

    def _create_notification(
        self,
        user_id: int,
        notif_type: str,
        title: str,
        message: str,
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            type=notif_type,
            title=title,
            message=message,
            is_read=0,
            created_at=utc_now(),
        )
        self.db.add(notif)
        self.db.flush()
        return notif

    def _notify_admins(
        self,
        notif_type: str,
        title: str,
        message: str,
    ) -> None:
        admins = self.db.query(User).filter(User.role == "admin", User.is_active == 1).all()
        for a in admins:
            self._create_notification(a.user_id, notif_type, title, message)

    # -------------------------------------------------------------------------
    # Transition 1: Accept Order
    # -------------------------------------------------------------------------
    def accept_order(
        self,
        vendor_order_id: int,
        actor_user_id: int | None,
        role: LifecycleRole,
        note: str | None = None,
    ) -> LifecycleTransitionResult:
        booking, vo, items, reports = self._lock_booking_and_order(vendor_order_id)
        assert_action_allowed(vo, role, "accept", items, reports)

        from_status = vo.status.value
        vo.status = VendorOrderStatus.accepted
        self._update_items_status(items, BookingItemStatus.confirmed)
        booking_status = self._sync_booking_status(booking)

        self._log_event(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            actor_user_id=actor_user_id,
            actor_role=role,
            event_type="order_accepted",
            from_status=from_status,
            to_status="accepted",
            note=note or "Vendor accepted order.",
        )

        self._create_notification(
            user_id=booking.user_id,
            notif_type="order_accepted",
            title="Order Accepted",
            message=f"Vendor accepted order VO-{vo.vendor_order_id:04d} for booking BK-{booking.booking_id:04d}.",
        )

        return LifecycleTransitionResult(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            from_status=from_status,
            to_status="accepted",
            booking_status=booking_status.value,
        )

    # -------------------------------------------------------------------------
    # Transition 2: Decline Order
    # -------------------------------------------------------------------------
    def decline_order(
        self,
        vendor_order_id: int,
        actor_user_id: int | None,
        role: LifecycleRole,
        reason: str,
    ) -> LifecycleTransitionResult:
        if len(reason.strip()) < 10:
            raise ValidationFailedError("Rejection reason must be at least 10 characters.")

        booking, vo, items, reports = self._lock_booking_and_order(vendor_order_id)
        assert_action_allowed(vo, role, "decline", items, reports)

        from_status = vo.status.value
        vo.status = VendorOrderStatus.rejected
        vo.rejection_reason = reason.strip()
        self._update_items_status(items, BookingItemStatus.cancelled)
        booking_status = self._sync_booking_status(booking)

        # Refund allocated share if booking was paid or partial
        refund_id: int | None = None
        if booking.payment_status in (BookingPaymentStatus.paid, BookingPaymentStatus.partial):
            refund_payment = refund_vendor_order_share(
                db=self.db,
                vendor_order_id=vo.vendor_order_id,
                reason=reason,
                gateway=self.gateway,
            )
            refund_id = refund_payment.payment_id

        self._log_event(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            actor_user_id=actor_user_id,
            actor_role=role,
            event_type="order_rejected",
            from_status=from_status,
            to_status="rejected",
            note=f"Order rejected: {reason}",
        )

        self._create_notification(
            user_id=booking.user_id,
            notif_type="order_rejected",
            title="Order Declined",
            message=f"Vendor was unable to fulfill order VO-{vo.vendor_order_id:04d} (Reason: {reason}). A refund has been issued.",
        )

        return LifecycleTransitionResult(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            from_status=from_status,
            to_status="rejected",
            booking_status=booking_status.value,
            created_deposit_refund_id=refund_id,
        )

    # -------------------------------------------------------------------------
    # Transition 3: Schedule Delivery or Pickup
    # -------------------------------------------------------------------------
    def schedule_delivery(
        self,
        vendor_order_id: int,
        actor_user_id: int | None,
        role: LifecycleRole,
        payload: ScheduleDeliveryPayload,
    ) -> LifecycleTransitionResult:
        booking, vo, items, reports = self._lock_booking_and_order(vendor_order_id)
        is_pickup = vo.fulfilment_type == "pickup"
        action: LifecycleAction = "schedule_pickup" if is_pickup else "schedule_delivery"
        assert_action_allowed(vo, role, action, items, reports)

        # Window validation: delivery date must be within [start_date - 1 day, start_date]
        min_date = booking.start_date.fromordinal(booking.start_date.toordinal() - 1)
        max_date = booking.start_date
        if not (min_date <= payload.date <= max_date):
            raise ValidationFailedError(
                f"Scheduled delivery date {payload.date} must be between {min_date} and {max_date} (rental start date)."
            )

        # Upsert deliveries row
        delivery = self.db.query(Delivery).filter(Delivery.vendor_order_id == vendor_order_id).first()
        start_dt = datetime.strptime(f"{payload.date} {payload.start_time}", "%Y-%m-%d %H:%M")
        end_dt = datetime.strptime(f"{payload.date} {payload.end_time}", "%Y-%m-%d %H:%M")

        if not delivery:
            delivery = Delivery(
                vendor_order_id=vendor_order_id,
                type=DeliveryType.pickup if is_pickup else DeliveryType.delivery,
                scheduled_start=start_dt,
                scheduled_end=end_dt,
                status=DeliveryStatus.scheduled,
                delivered_by=payload.delivered_by,
                tracking_info=payload.tracking_info,
            )
            self.db.add(delivery)
        else:
            delivery.scheduled_start = start_dt
            delivery.scheduled_end = end_dt
            delivery.status = DeliveryStatus.scheduled
            if payload.delivered_by:
                delivery.delivered_by = payload.delivered_by
            if payload.tracking_info:
                delivery.tracking_info = payload.tracking_info

        self.db.flush()

        self._log_event(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            actor_user_id=actor_user_id,
            actor_role=role,
            event_type="delivery_scheduled",
            from_status=vo.status.value,
            to_status=vo.status.value,
            note=f"Scheduled {vo.fulfilment_type} for {payload.date} ({payload.start_time}-{payload.end_time})",
        )

        self._create_notification(
            user_id=booking.user_id,
            notif_type="return_scheduled" if is_pickup else "order_accepted",
            title=f"{'Pickup' if is_pickup else 'Delivery'} Scheduled",
            message=f"Order VO-{vo.vendor_order_id:04d} {vo.fulfilment_type} is scheduled for {payload.date} ({payload.start_time} - {payload.end_time}).",
        )

        return LifecycleTransitionResult(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            from_status=vo.status.value,
            to_status=vo.status.value,
            booking_status=booking.status.value,
        )

    # -------------------------------------------------------------------------
    # Transition 4: Mark Dispatched (Out for Delivery)
    # -------------------------------------------------------------------------
    def mark_dispatched(
        self,
        vendor_order_id: int,
        actor_user_id: int | None,
        role: LifecycleRole,
        note: str | None = None,
    ) -> LifecycleTransitionResult:
        booking, vo, items, reports = self._lock_booking_and_order(vendor_order_id)
        assert_action_allowed(vo, role, "dispatch", items, reports)

        delivery = self.db.query(Delivery).filter(Delivery.vendor_order_id == vendor_order_id).first()
        if not delivery:
            raise ConflictError("Cannot dispatch order without a scheduled delivery record.")

        from_status = vo.status.value
        vo.status = VendorOrderStatus.dispatched
        delivery.status = DeliveryStatus.out_for_delivery
        booking_status = self._sync_booking_status(booking)

        self._log_event(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            actor_user_id=actor_user_id,
            actor_role=role,
            event_type="order_dispatched",
            from_status=from_status,
            to_status="dispatched",
            note=note or "Order is out for delivery.",
        )

        self._create_notification(
            user_id=booking.user_id,
            notif_type="order_dispatched",
            title="Order Dispatched",
            message=f"Order VO-{vo.vendor_order_id:04d} is on its way to the event venue.",
        )

        return LifecycleTransitionResult(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            from_status=from_status,
            to_status="dispatched",
            booking_status=booking_status.value,
        )

    # -------------------------------------------------------------------------
    # Transition 5: Mark Delivered
    # -------------------------------------------------------------------------
    def mark_delivered(
        self,
        vendor_order_id: int,
        actor_user_id: int | None,
        role: LifecycleRole,
        payload: MarkDeliveredPayload,
    ) -> LifecycleTransitionResult:
        booking, vo, items, reports = self._lock_booking_and_order(vendor_order_id)
        assert_action_allowed(vo, role, "mark_delivered", items, reports)

        is_pickup = vo.fulfilment_type == "pickup"
        proof_ref = getattr(payload, "proof_public_id", None) or payload.proof_photo_storage_path
        if not is_pickup:
            if not proof_ref or not proof_ref.strip():
                raise ValidationFailedError("Proof of delivery storage path is required for delivery fulfillment.")
            from app.core.config import settings
            expected_cloudinary = f"{settings.ENV}/delivery_proof/{vo.vendor_id}/"
            expected_legacy = f"private/delivery-proofs/{vo.vendor_id}/"
            if not (proof_ref.startswith(expected_cloudinary) or proof_ref.startswith(expected_legacy)):
                raise ValidationFailedError(
                    f"Delivery proof path must start with vendor private prefix: {expected_cloudinary}"
                )

        delivery = self.db.query(Delivery).filter(Delivery.vendor_order_id == vendor_order_id).first()
        if not delivery:
            delivery = Delivery(
                vendor_order_id=vendor_order_id,
                type=DeliveryType.pickup if is_pickup else DeliveryType.delivery,
                status=DeliveryStatus.delivered,
                delivered_by=payload.delivered_by,
                delivery_date=payload.delivered_at or utc_now(),
                proof_url=proof_ref,
                proof_public_id=proof_ref,
            )
            self.db.add(delivery)
        else:
            delivery.status = DeliveryStatus.delivered
            delivery.delivered_by = payload.delivered_by
            delivery.delivery_date = payload.delivered_at or utc_now()
            if proof_ref:
                delivery.proof_url = proof_ref
                delivery.proof_public_id = proof_ref

        if proof_ref:
            from app.models.storage import PendingUpload
            self.db.query(PendingUpload).filter(
                PendingUpload.public_id == proof_ref
            ).update({"status": "attached"})

        from_status = vo.status.value
        vo.status = VendorOrderStatus.delivered
        self._update_items_status(items, BookingItemStatus.delivered)
        booking_status = self._sync_booking_status(booking)

        self._log_event(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            actor_user_id=actor_user_id,
            actor_role=role,
            event_type="order_delivered",
            from_status=from_status,
            to_status="delivered",
            note=payload.notes or f"Delivered by {payload.delivered_by}.",
        )

        self._create_notification(
            user_id=booking.user_id,
            notif_type="delivered",
            title="Equipment Delivered",
            message=f"Order VO-{vo.vendor_order_id:04d} equipment has been delivered and inspected at the venue.",
        )

        return LifecycleTransitionResult(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            from_status=from_status,
            to_status="delivered",
            booking_status=booking_status.value,
        )

    # -------------------------------------------------------------------------
    # Transition 6: Delivery Failed & Reschedule
    # -------------------------------------------------------------------------
    def delivery_failed(
        self,
        vendor_order_id: int,
        actor_user_id: int | None,
        role: LifecycleRole,
        payload: DeliveryFailedPayload,
    ) -> LifecycleTransitionResult:
        booking, vo, items, reports = self._lock_booking_and_order(vendor_order_id)
        assert_action_allowed(vo, role, "delivery_failed", items, reports)

        delivery = self.db.query(Delivery).filter(Delivery.vendor_order_id == vendor_order_id).first()
        if delivery:
            delivery.status = DeliveryStatus.failed

        self._log_event(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            actor_user_id=actor_user_id,
            actor_role=role,
            event_type="delivery_failed",
            from_status=vo.status.value,
            to_status=vo.status.value,
            note=f"Delivery attempt failed: {payload.reason}",
        )

        return LifecycleTransitionResult(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            from_status=vo.status.value,
            to_status=vo.status.value,
            booking_status=booking.status.value,
        )

    def reschedule_delivery(
        self,
        vendor_order_id: int,
        actor_user_id: int | None,
        role: LifecycleRole,
        payload: ScheduleDeliveryPayload,
    ) -> LifecycleTransitionResult:
        # Reschedule works identically to schedule_delivery, updating delivery status back to scheduled
        res = self.schedule_delivery(vendor_order_id, actor_user_id, role, payload)
        # Update order back to accepted if needed
        booking, vo, _, _ = self._lock_booking_and_order(vendor_order_id)
        if vo.status == VendorOrderStatus.dispatched:
            vo.status = VendorOrderStatus.accepted
            self.db.flush()
        return res

    # -------------------------------------------------------------------------
    # Transition 7: Schedule Return & Mark Returned
    # -------------------------------------------------------------------------
    def schedule_return(
        self,
        vendor_order_id: int,
        actor_user_id: int | None,
        role: LifecycleRole,
        payload: ScheduleReturnPayload,
    ) -> LifecycleTransitionResult:
        booking, vo, items, reports = self._lock_booking_and_order(vendor_order_id)
        assert_action_allowed(vo, role, "schedule_return", items, reports)

        min_return_date = booking.end_date.fromordinal(booking.end_date.toordinal() - 1)
        if payload.date < min_return_date:
            raise ValidationFailedError(
                f"Scheduled return date {payload.date} cannot be before {min_return_date} (rental end date minus 1 day)."
            )

        start_dt = datetime.strptime(f"{payload.date} {payload.start_time}", "%Y-%m-%d %H:%M")
        end_dt = datetime.strptime(f"{payload.date} {payload.end_time}", "%Y-%m-%d %H:%M")

        ret = self.db.query(Return).filter(Return.vendor_order_id == vendor_order_id).first()
        if not ret:
            ret = Return(
                vendor_order_id=vendor_order_id,
                scheduled_start=start_dt,
                scheduled_end=end_dt,
                status=ReturnStatus.scheduled,
                note=payload.notes,
            )
            self.db.add(ret)
        else:
            ret.scheduled_start = start_dt
            ret.scheduled_end = end_dt
            ret.status = ReturnStatus.scheduled
            if payload.notes:
                ret.note = payload.notes

        self.db.flush()

        self._log_event(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            actor_user_id=actor_user_id,
            actor_role=role,
            event_type="return_scheduled",
            from_status=vo.status.value,
            to_status=vo.status.value,
            note=f"Scheduled return for {payload.date} ({payload.start_time}-{payload.end_time})",
        )

        self._create_notification(
            user_id=booking.user_id,
            notif_type="return_scheduled",
            title="Return Scheduled",
            message=f"Equipment return for VO-{vo.vendor_order_id:04d} is scheduled for {payload.date}.",
        )

        return LifecycleTransitionResult(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            from_status=vo.status.value,
            to_status=vo.status.value,
            booking_status=booking.status.value,
        )

    def mark_returned(
        self,
        vendor_order_id: int,
        actor_user_id: int | None,
        role: LifecycleRole,
        return_date: date | None = None,
        note: str | None = None,
    ) -> LifecycleTransitionResult:
        booking, vo, items, reports = self._lock_booking_and_order(vendor_order_id)
        assert_action_allowed(vo, role, "mark_returned", items, reports)

        actual_date = return_date or utc_now().date()
        ret = self.db.query(Return).filter(Return.vendor_order_id == vendor_order_id).first()
        if not ret:
            ret = Return(
                vendor_order_id=vendor_order_id,
                return_date=actual_date,
                status=ReturnStatus.returned,
                note=note,
            )
            self.db.add(ret)
        else:
            ret.return_date = actual_date
            ret.status = ReturnStatus.returned
            if note:
                ret.note = note

        from_status = vo.status.value
        vo.status = VendorOrderStatus.returned
        self._update_items_status(items, BookingItemStatus.returned)
        booking_status = self._sync_booking_status(booking)

        self._log_event(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            actor_user_id=actor_user_id,
            actor_role=role,
            event_type="order_returned",
            from_status=from_status,
            to_status="returned",
            note=note or "Equipment picked up and returned.",
        )

        return LifecycleTransitionResult(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            from_status=from_status,
            to_status="returned",
            booking_status=booking_status.value,
        )

    # -------------------------------------------------------------------------
    # Transition 8: Inspect Return
    # -------------------------------------------------------------------------
    def inspect_return(
        self,
        vendor_order_id: int,
        actor_user_id: int | None,
        role: LifecycleRole,
        payload: InspectionPayload,
    ) -> LifecycleTransitionResult:
        booking, vo, items, reports = self._lock_booking_and_order(vendor_order_id)
        assert_action_allowed(vo, role, "inspect", items, reports)

        ret = self.db.query(Return).filter(Return.vendor_order_id == vendor_order_id).first()
        if not ret:
            ret = Return(
                vendor_order_id=vendor_order_id,
                return_date=utc_now().date(),
                status=ReturnStatus.returned,
            )
            self.db.add(ret)
            self.db.flush()

        damage_ids: list[int] = []
        all_good = True

        for it_res in payload.items:
            # Map condition
            cond = ItemCondition(it_res.condition)
            ret_item = ReturnItem(
                return_id=ret.return_id,
                booking_item_id=it_res.item_id,
                quantity_returned=it_res.returned_quantity,
                item_condition=cond,
            )
            self.db.add(ret_item)
            self.db.flush()

            if cond != ItemCondition.good:
                all_good = False
                desc = it_res.damage_description or f"Condition noted as {it_res.condition}"
                if len(desc.strip()) < 10:
                    desc = desc.strip() + " (inspected by vendor)"

                dr = DamageReport(
                    return_item_id=ret_item.return_item_id,
                    description=desc,
                    damage_cost=quantize_money(it_res.damage_cost),
                    deducted_from_deposit=1 if it_res.deduct_from_deposit else 0,
                    status=DamageReportStatus.reported,
                    images_notes=it_res.notes,
                )
                self.db.add(dr)
                self.db.flush()
                damage_ids.append(dr.report_id)

                self._create_notification(
                    user_id=booking.user_id,
                    notif_type="damage_report_filed",
                    title="Damage Reported",
                    message=f"A damage report of ₹{it_res.damage_cost} was filed for item in order VO-{vo.vendor_order_id:04d}.",
                )

        self._create_notification(
            user_id=booking.user_id,
            notif_type="return_inspected",
            title="Return Inspected",
            message=f"Vendor completed return inspection for order VO-{vo.vendor_order_id:04d}.",
        )

        self._log_event(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            actor_user_id=actor_user_id,
            actor_role=role,
            event_type="return_inspected",
            from_status=vo.status.value,
            to_status=vo.status.value,
            note=f"Inspection complete. {len(damage_ids)} damage report(s) filed.",
        )

        # If every item is in good condition, complete the order automatically!
        if all_good:
            return self.complete_order(
                vendor_order_id=vendor_order_id,
                actor_user_id=actor_user_id,
                role=role,
                note="Auto-completed: all items returned in good condition.",
            )

        return LifecycleTransitionResult(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            from_status=vo.status.value,
            to_status=vo.status.value,
            booking_status=booking.status.value,
            damage_report_ids=damage_ids,
        )

    # -------------------------------------------------------------------------
    # Transition 9: Complete Order (Payout + Deposit Settlement)
    # -------------------------------------------------------------------------
    def complete_order(
        self,
        vendor_order_id: int,
        actor_user_id: int | None,
        role: LifecycleRole,
        note: str | None = None,
    ) -> LifecycleTransitionResult:
        booking, vo, items, reports = self._lock_booking_and_order(vendor_order_id)
        assert_action_allowed(vo, role, "complete_order", items, reports)

        # 1. Payout Calculation
        payout_calc = calculate_payout(gross=vo.subtotal, items=items)

        # Upsert or create payout
        payout = self.db.query(Payout).filter(Payout.vendor_order_id == vendor_order_id).first()
        if not payout:
            payout = Payout(
                vendor_id=vo.vendor_id,
                vendor_order_id=vo.vendor_order_id,
                gross_amount=payout_calc.gross,
                commission_amount=payout_calc.commission,
                net_amount=payout_calc.net,
                status=PayoutStatus.pending,
            )
            self.db.add(payout)
        else:
            payout.gross_amount = payout_calc.gross
            payout.commission_amount = payout_calc.commission
            payout.net_amount = payout_calc.net
        self.db.flush()

        # 2. Deposit Settlement
        settlement = calculate_deposit_settlement(items=items, damage_reports=reports)
        refund_id: int | None = None

        if settlement.refund_amount > Decimal("0.00"):
            refund_record = refund_deposit_for_vendor_order(
                db=self.db,
                vendor_order_id=vo.vendor_order_id,
                amount=settlement.refund_amount,
                reason=f"Deposit refund for completed order VO-{vo.vendor_order_id:04d}",
                gateway=self.gateway,
            )
            refund_id = refund_record.payment_id

        if settlement.excess_deductions > Decimal("0.00"):
            self._log_event(
                booking_id=booking.booking_id,
                vendor_order_id=vo.vendor_order_id,
                actor_user_id=actor_user_id,
                actor_role="system",
                event_type="excess_damage_recorded",
                from_status=None,
                to_status=None,
                note=f"Damage deductions (₹{settlement.total_deductions + settlement.excess_deductions}) exceeded deposit share (₹{settlement.deposit_share}) by ₹{settlement.excess_deductions}.",
            )

        # 3. Transition Order Status
        from_status = vo.status.value
        vo.status = VendorOrderStatus.completed
        booking_status = self._sync_booking_status(booking)

        self._log_event(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            actor_user_id=actor_user_id,
            actor_role=role,
            event_type="order_completed",
            from_status=from_status,
            to_status="completed",
            note=note or "Order completed. Payout and deposit settled.",
        )

        # Notifications
        self._notify_admins(
            notif_type="payout_due",
            title="Payout Due",
            message=f"Order VO-{vo.vendor_order_id:04d} completed. Net payout ₹{payout_calc.net} is ready to process.",
        )
        self._create_notification(
            user_id=booking.user_id,
            notif_type="refund_processed",
            title="Rental Completed",
            message=f"Order VO-{vo.vendor_order_id:04d} is completed. Security deposit of ₹{settlement.refund_amount} released.",
        )

        return LifecycleTransitionResult(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            from_status=from_status,
            to_status="completed",
            booking_status=booking_status.value,
            created_payout_id=payout.payout_id,
            created_deposit_refund_id=refund_id,
        )

    # -------------------------------------------------------------------------
    # Transition 10: Admin Dispute Resolution
    # -------------------------------------------------------------------------
    def resolve_dispute(
        self,
        report_id: int,
        actor_user_id: int,
        role: LifecycleRole,
        payload: DisputeResolutionPayload,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> DamageReport:
        if role != "admin":
            raise DomainError("forbidden_role", "Only administrators can resolve damage disputes.", 403)

        dr = self.db.query(DamageReport).filter(DamageReport.report_id == report_id).with_for_update().first()
        if not dr:
            raise NotFoundError("DamageReport", str(report_id))

        if dr.status == DamageReportStatus.resolved:
            raise ConflictError("Damage report has already been resolved.", code="damage_report_already_resolved")

        # Find associated vendor order and booking
        ret_item = self.db.query(ReturnItem).filter(ReturnItem.return_item_id == dr.return_item_id).first()
        if not ret_item:
            raise NotFoundError("ReturnItem", str(dr.return_item_id))

        ret = self.db.query(Return).filter(Return.return_id == ret_item.return_id).first()
        vo = self.db.query(VendorOrder).filter(VendorOrder.vendor_order_id == ret.vendor_order_id).first() if ret else None
        booking = self.db.query(Booking).filter(Booking.booking_id == vo.booking_id).first() if vo else None

        if not vo or not booking:
            raise NotFoundError("VendorOrder", "associated with damage report")

        # Held deposit share calculation
        items = self.db.query(BookingItem).filter(BookingItem.vendor_order_id == vo.vendor_order_id).all()
        deposit_share = sum((it.deposit_amount for it in items), Decimal("0.00"))

        eval_res = evaluate_dispute_resolution(
            claim_amount=dr.damage_cost,
            deposit_share=deposit_share,
            outcome=payload.outcome,
            proposed_amount=payload.final_amount,
        )
        if not eval_res.is_valid:
            raise ValidationFailedError(eval_res.error or "Invalid dispute resolution payload.")

        before_json = {
            "report_id": dr.report_id,
            "status": dr.status.value,
            "damage_cost": str(dr.damage_cost),
            "final_cost": str(dr.final_cost) if dr.final_cost else None,
        }

        dr.final_cost = eval_res.final_amount
        dr.deducted_from_deposit = 1 if eval_res.final_amount > Decimal("0.00") else 0
        dr.resolution_note = payload.resolution_note
        dr.resolved_by = actor_user_id
        dr.resolved_at = utc_now()
        dr.status = DamageReportStatus.resolved

        self.db.flush()

        after_json = {
            "report_id": dr.report_id,
            "status": dr.status.value,
            "final_cost": str(dr.final_cost),
            "deducted_from_deposit": dr.deducted_from_deposit,
            "resolution_note": dr.resolution_note,
            "resolved_by": dr.resolved_by,
        }

        # Audit Log
        audit = AuditLog(
            actor_user_id=actor_user_id,
            actor_role="admin",
            action="dispute_resolved",
            entity_type="damage_report",
            entity_id=dr.report_id,
            before_json=before_json,
            after_json=after_json,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=utc_now(),
        )
        self.db.add(audit)

        # Order Event
        self._log_event(
            booking_id=booking.booking_id,
            vendor_order_id=vo.vendor_order_id,
            actor_user_id=actor_user_id,
            actor_role="admin",
            event_type="dispute_resolved",
            from_status="disputed",
            to_status="resolved",
            note=f"Dispute resolved ({payload.outcome}): final cost ₹{dr.final_cost}. {payload.resolution_note}",
        )

        # Notify Customer and Vendor
        self._create_notification(
            user_id=booking.user_id,
            notif_type="dispute_resolved",
            title="Dispute Resolved",
            message=f"Administrator resolved the damage dispute for order VO-{vo.vendor_order_id:04d} (Final amount: ₹{dr.final_cost}).",
        )
        vendor_user = self.db.query(User).filter(User.user_id == vo.vendor.user_id).first() if vo.vendor else None
        if vendor_user:
            self._create_notification(
                user_id=vendor_user.user_id,
                notif_type="dispute_resolved",
                title="Dispute Resolved",
                message=f"Admin resolved dispute for order VO-{vo.vendor_order_id:04d} (Final amount: ₹{dr.final_cost}).",
            )

        return dr
