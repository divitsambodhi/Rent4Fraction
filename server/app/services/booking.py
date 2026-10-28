from __future__ import annotations

from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.core.errors import (
    CancellationNotAllowedError,
    ConflictError,
    NotFoundError,
    ValidationFailedError,
)
from app.core.money import to_decimal
from app.core.time import utc_now
from app.models.accounts import Address, User, Vendor
from app.models.orders import (
    Booking,
    BookingItem,
    BookingItemStatus,
    BookingPaymentStatus,
    BookingStatus,
    CartItem,
    Coupon,
    VendorOrder,
    VendorOrderStatus,
)
from app.models.platform import OrderEvent, PlatformSetting
from app.repositories.booking import BookingRepository
from app.repositories.catalog import get_equipment_available_quantity
from app.services.pricing import get_commission_source, get_effective_commission
from app.services.pricing import (
    CartLineInput,
    CouponInput,
    quote,
)
from app.services.refunds import compute_cancellation_refund, refund_payment


class BookingService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = BookingRepository(db)

    # -------------------------------------------------------------------------
    # Coupon Advisory Validation
    # -------------------------------------------------------------------------
    def validate_coupon(
        self,
        user: User,
        code: str,
        subtotal: float | Decimal,
    ) -> dict[str, Any]:
        """
        Advisory validation matching the checkout quote rules.
        """
        c_obj = self.repo.get_coupon_by_code(code)
        if not c_obj:
            return {
                "valid": False,
                "code": code.upper().strip(),
                "discount": 0.0,
                "message": "This coupon code does not exist.",
            }

        c_input = CouponInput(
            code=c_obj.code,
            type=c_obj.type.value,
            value=c_obj.value,
            min_order_amount=c_obj.min_order_amount,
            used_count=c_obj.used_count,
            usage_limit=c_obj.usage_limit,
            is_active=bool(c_obj.is_active),
            valid_from=c_obj.valid_from,
            valid_to=c_obj.valid_to,
        )

        sub_dec = to_decimal(subtotal)
        # Check user-specific usage limit (advisory placeholder: 1 use per customer)
        prior_usage = (
            self.db.query(Booking)
            .filter(Booking.user_id == user.user_id, Booking.coupon_id == c_obj.coupon_id)
            .count()
        )
        if prior_usage >= 1:
            return {
                "valid": False,
                "code": c_obj.code,
                "discount": 0.0,
                "message": "You have already used this coupon code.",
            }

        from app.services.pricing import coupon_discount

        discount_dec, msg = coupon_discount(c_input, sub_dec)

        if msg is not None:
            return {
                "valid": False,
                "code": c_obj.code,
                "discount": 0.0,
                "message": msg,
            }

        return {
            "valid": True,
            "code": c_obj.code,
            "type": c_obj.type.value,
            "value": float(c_obj.value),
            "discount": float(discount_dec),
            "message": "Coupon applied successfully!",
        }

    # -------------------------------------------------------------------------
    # Checkout Quote
    # -------------------------------------------------------------------------
    def get_checkout_quote(
        self,
        user: User,
        period: str | None = None,
        coupon_code: str | None = None,
        fulfilment_by_vendor: dict[str, str] | None = None,
        address_id: int | None = None,
    ) -> dict[str, Any]:
        """
        Computes the complete quotation server-side from user's current cart items.
        The server never trusts client-supplied pricing or discounts.
        """
        fulfilment = fulfilment_by_vendor or {}

        # 1. Fetch user's cart items
        cart_rows = self.db.query(CartItem).filter(CartItem.user_id == user.user_id).all()

        if not cart_rows:
            return {
                "subtotal": 0.0,
                "discount": 0.0,
                "tax": 0.0,
                "delivery_fee": 0.0,
                "security_deposit": 0.0,
                "total": 0.0,
                "vendor_delivery_fees": {},
                "issues": ["Cart is empty"],
            }

        # Filter by requested period if given (format "YYYY-MM-DD_YYYY-MM-DD")
        target_rows = cart_rows
        if period and "_" in period:
            s_str, e_str = period.split("_", 1)
            target_rows = [
                c
                for c in cart_rows
                if c.start_date.isoformat() == s_str and c.end_date.isoformat() == e_str
            ]
            if not target_rows:
                target_rows = cart_rows

        # 2. Convert to CartLineInput and check availability
        lines: list[CartLineInput] = []
        issues: list[str] = []
        vendor_ids_set: set[int] = set()

        if address_id is not None:
            addr = (
                self.db.query(Address)
                .filter(Address.address_id == address_id, Address.user_id == user.user_id)
                .first()
            )
            if not addr:
                issues.append(
                    "Specified delivery address does not exist or does not belong to you."
                )

        for c in target_rows:
            eq = c.equipment
            if not eq:
                continue

            vendor_ids_set.add(eq.vendor_id)
            avail_qty = get_equipment_available_quantity(
                self.db,
                eq.equipment_id,
                eq.quantity,
                c.start_date,
                c.end_date,
            )
            if avail_qty < c.quantity:
                issues.append(
                    f"'{eq.name}' has only {avail_qty} unit(s) available for selected dates ({c.quantity} requested)."
                )

            lines.append(
                CartLineInput(
                    equipment_id=str(eq.equipment_id),
                    name=eq.name,
                    price_per_day=eq.price_per_day,
                    security_deposit=eq.security_deposit,
                    quantity=c.quantity,
                    start_date=c.start_date,
                    end_date=c.end_date,
                    vendor_id=str(eq.vendor_id),
                    vendor_name=eq.vendor.business_name if eq.vendor else "",
                    delivery_available=bool(eq.delivery_available),
                )
            )

        # 3. Vendor delivery fees
        vendor_fee_map: dict[str, Decimal] = {}
        if vendor_ids_set:
            vendors = self.db.query(Vendor).filter(Vendor.vendor_id.in_(vendor_ids_set)).all()
            for v in vendors:
                vendor_fee_map[str(v.vendor_id)] = v.delivery_fee or Decimal("300.00")

        # 4. Coupon input
        c_input: CouponInput | None = None
        if coupon_code and coupon_code.strip():
            c_obj = self.repo.get_coupon_by_code(coupon_code)
            if c_obj:
                c_input = CouponInput(
                    code=c_obj.code,
                    type=c_obj.type.value,
                    value=c_obj.value,
                    min_order_amount=c_obj.min_order_amount,
                    used_count=c_obj.used_count,
                    usage_limit=c_obj.usage_limit,
                    is_active=bool(c_obj.is_active),
                    valid_from=c_obj.valid_from,
                    valid_to=c_obj.valid_to,
                )

        # 5. Tax rate from platform_settings (0% when platform takes no commission / COD mode)
        from app.core.config import get_settings

        settings = get_settings()
        if not settings.PAYMENTS_ONLINE_ENABLED:
            tax_rate = Decimal("0.00")
        else:
            tax_setting = (
                self.db.query(PlatformSetting)
                .filter(PlatformSetting.setting_key == "tax_rate_percent")
                .first()
            )
            tax_rate = Decimal("18.00")
            if tax_setting and tax_setting.setting_value:
                try:
                    tax_rate = Decimal(tax_setting.setting_value)
                except Exception:
                    tax_rate = Decimal("18.00")

        # 6. Execute pure quote calculation
        quote_res = quote(
            lines=lines,
            coupon=c_input,
            tax_rate_percent=tax_rate,
            fulfilment_by_vendor=fulfilment,
            vendor_fee_map=vendor_fee_map,
        )

        vendor_delivery_fees_float = {
            k: float(v) for k, v in quote_res.vendor_delivery_fees.items()
        }

        return {
            "subtotal": float(quote_res.subtotal),
            "discount": float(quote_res.discount),
            "tax": float(quote_res.tax),
            "delivery_fee": float(quote_res.delivery_fee),
            "security_deposit": float(quote_res.security_deposit),
            "total": float(quote_res.total),
            "vendor_delivery_fees": vendor_delivery_fees_float,
            "issues": issues,
        }

    # -------------------------------------------------------------------------
    # Booking Read & Management
    # -------------------------------------------------------------------------
    def list_bookings(
        self,
        user: User,
        status_filter: str | None = None,
        search_query: str | None = None,
        page: int = 1,
        page_size: int = 10,
    ) -> dict[str, Any]:
        capped_page_size = min(max(1, page_size), 50)
        safe_page = max(1, page)
        summaries, total, counts = self.repo.get_user_bookings(
            user_id=user.user_id,
            status_filter=status_filter or "all",
            search_query=search_query,
            page=safe_page,
            page_size=capped_page_size,
        )
        return {
            "items": summaries,
            "total": total,
            "counts": counts,
            "page": safe_page,
            "pageSize": capped_page_size,
        }

    def get_booking_detail(self, user: User, booking_id: int) -> dict[str, Any]:
        detail = self.repo.get_booking_detail(
            booking_id=booking_id,
            user_id=user.user_id,
        )
        if not detail:
            raise NotFoundError("Booking", str(booking_id))
        return detail

    def cancel_unpaid_booking(
        self,
        user: User,
        booking_id: int,
        reason: str | None = None,
    ) -> dict[str, Any]:
        """
        Cancels an unpaid or paid booking:
        - Unpaid: cancels immediately, releases holds, cancels vendor orders.
        - Paid: executes cancellation refund calculation, calls gateway refund,
          records refund payment rows, sets booking/items/orders cancelled,
          and releases reserved coupons.
        """
        booking = (
            self.db.query(Booking)
            .filter(Booking.booking_id == booking_id, Booking.user_id == user.user_id)
            .with_for_update()
            .first()
        )
        if not booking:
            raise NotFoundError("Booking", str(booking_id))

        if booking.status in (BookingStatus.cancelled, BookingStatus.completed):
            raise CancellationNotAllowedError(f"Booking is already {booking.status.value}.")

        # 1. Unpaid Cancellation
        if booking.payment_status == BookingPaymentStatus.unpaid:
            self.repo.cancel_booking(
                user_id=user.user_id,
                booking_id=booking_id,
                reason=reason or "Customer cancelled unpaid booking",
            )
            self.db.commit()
            return {"status": "success", "message": "Booking cancelled successfully"}

        if booking.payment_status == BookingPaymentStatus.paid:
            raise ConflictError(
                "Cancellation of paid bookings must follow the refund flow.",
                code="cancellation_requires_refund_flow",
            )

        raise ConflictError(
            "Booking cannot be cancelled in its current payment status.",
            code="cancellation_not_allowed",
        )

    def cancel_booking(
        self,
        user: User,
        booking_id: int,
        reason: str | None = None,
    ) -> dict[str, Any]:
        """
        Cancels a booking:
        - If unpaid: cancels without charges.
        - If paid: executes automated refund and updates status to refunded/partially_refunded.
        """
        booking = (
            self.db.query(Booking)
            .filter(
                Booking.booking_id == booking_id,
                Booking.user_id == user.user_id,
            )
            .with_for_update()
            .first()
        )
        if not booking:
            raise NotFoundError("Booking", str(booking_id))

        if booking.status in (BookingStatus.cancelled, BookingStatus.completed):
            raise CancellationNotAllowedError(f"Booking is already {booking.status.value}.")

        if booking.payment_status == BookingPaymentStatus.unpaid:
            return self.cancel_unpaid_booking(user, booking_id, reason)

        if booking.payment_status == BookingPaymentStatus.paid:
            if booking.start_date <= utc_now().date():
                raise CancellationNotAllowedError(
                    "Cancellation is not permitted on or after the rental start date."
                )

            refund_amount = compute_cancellation_refund(booking, utc_now().date())
            if refund_amount > Decimal("0.00"):
                refund_payment(
                    self.db,
                    booking_id=booking.booking_id,
                    amount=refund_amount,
                    reason=reason or "Customer cancelled paid booking",
                )

            booking.status = BookingStatus.cancelled
            if refund_amount >= booking.total_amount:
                booking.payment_status = BookingPaymentStatus.refunded
            else:
                booking.payment_status = BookingPaymentStatus.partial

            # Transition items and vendor orders to cancelled
            items = (
                self.db.query(BookingItem)
                .filter(BookingItem.booking_id == booking.booking_id)
                .all()
            )
            for it in items:
                it.status = BookingItemStatus.cancelled

            vendor_orders = (
                self.db.query(VendorOrder)
                .filter(VendorOrder.booking_id == booking.booking_id)
                .all()
            )
            for vo in vendor_orders:
                vo.status = VendorOrderStatus.cancelled

            # Release coupon if reserved
            if booking.coupon_id:
                coupon = (
                    self.db.query(Coupon)
                    .filter(Coupon.coupon_id == booking.coupon_id)
                    .with_for_update()
                    .first()
                )
                if coupon and coupon.used_count > 0:
                    coupon.used_count -= 1

            self.db.add(
                OrderEvent(
                    booking_id=booking.booking_id,
                    actor_role="customer",
                    event_type="booking_cancelled_paid",
                    note=f"Customer cancelled paid booking. Refund issued: ₹{refund_amount} ({reason or 'No reason provided'})",
                )
            )
            self.db.commit()
            return {
                "status": "success",
                "message": f"Booking cancelled successfully. Refund of ₹{refund_amount} initiated.",
            }

        raise ConflictError(
            "Booking cannot be cancelled in its current payment status.",
            code="cancellation_not_allowed",
        )

    def respond_to_damage_report(
        self,
        user: User,
        booking_id: int,
        item_id: int,
        action: str,  # 'accept' | 'dispute'
        dispute_reason: str | None = None,
    ) -> dict[str, Any]:
        """
        Accepts or disputes a reported damage report.
        Dispute requires reason of at least 20 characters.
        """
        if action == "dispute" and (not dispute_reason or len(dispute_reason.strip()) < 20):
            raise ValidationFailedError(
                "Dispute reason must be at least 20 characters",
                [
                    {
                        "field": "dispute_reason",
                        "message": "Dispute reason must be at least 20 characters",
                    }
                ],
            )

        dr = self.repo.respond_to_damage_report(
            user_id=user.user_id,
            booking_id=booking_id,
            item_id=item_id,
            action=action,
            dispute_reason=dispute_reason,
        )
        self.db.commit()
        return {
            "report_id": str(dr.report_id),
            "status": dr.status.value,
            "resolution_note": dr.resolution_note,
            "dispute_reason": dr.dispute_reason,
        }

    # -------------------------------------------------------------------------
    # Payments Read
    # -------------------------------------------------------------------------
    def list_payments(
        self,
        user: User,
        payment_type: str | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 10,
    ) -> dict[str, Any]:
        capped_page_size = min(max(1, page_size), 50)
        safe_page = max(1, page)
        results, total = self.repo.get_user_payments(
            user_id=user.user_id,
            type_filter=payment_type or "all",
            status_filter=status or "all",
            page=safe_page,
            page_size=capped_page_size,
        )
        return {
            "items": results,
            "total": total,
            "page": safe_page,
            "pageSize": capped_page_size,
        }

    def get_payments_summary(self, user: User) -> dict[str, float]:
        return self.repo.get_payment_summary(user.user_id)
