from __future__ import annotations

import hashlib
import json
import logging
from datetime import UTC, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import (
    CodNotAvailableError,
    DeliveryNotAvailableError,
    EmailNotVerifiedError,
    IdempotencyKeyReuseError,
    ItemsUnavailableError,
    NotFoundError,
    PaymentGatewayUnavailableError,
    ValidationFailedError,
)
from app.core.money import calculate_item_commission, quantize_money
from app.core.time import utc_now
from app.integrations.razorpay import PaymentGateway, get_payment_gateway
from app.jobs.expire_bookings import expire_unpaid_bookings
from app.models.accounts import Address, User, Vendor, VendorApprovalStatus
from app.models.catalog import Category, Equipment, EquipmentStatus
from app.models.orders import (
    Booking,
    BookingItem,
    BookingItemStatus,
    BookingPaymentStatus,
    BookingStatus,
    CartItem,
    Coupon,
    CouponType,
    VendorOrder,
    VendorOrderStatus,
)
from app.models.payments import Payment, PaymentMethod, PaymentStatus, PaymentType
from app.models.platform import IdempotencyKey, OrderEvent, PlatformSetting
from app.models.social import Notification
from app.repositories.catalog import get_equipment_available_quantity
from app.schemas.checkout import (
    CheckoutOrderCreateRequest,
    CheckoutOrderResponse,
    RazorpayOrderBlock,
    RazorpayPrefill,
)
from app.services.pricing import resolve_commission

logger = logging.getLogger("rent4fraction.checkout")


def create_checkout_order(
    db: Session,
    user: User,
    payload: CheckoutOrderCreateRequest,
    idempotency_key: str,
    gateway: PaymentGateway | None = None,
) -> CheckoutOrderResponse:
    """
    Orchestrates end-to-end checkout order creation following the exact 8-step specification:
    1. Preconditions (email verification, address ownership, fulfilment validation, COD setting)
    2. Lazy expiry of stale unpaid bookings holding same equipment
    3. Concurrency row locks on equipment (in ascending equipment_id order) and inventory validation
    4. Coupon reservation
    5. Price calculation and commission/deposit snapshots
    6. Atomic entity creation (booking, vendor_orders, booking_items, first payment row, order_events)
    7. Commit, then gateway.create_order outside transaction
    8. Returns order response with Razorpay checkout payload
    """
    settings = get_settings()
    now = utc_now()

    # -------------------------------------------------------------------------
    # 0. Idempotency Check
    # -------------------------------------------------------------------------
    req_json = payload.model_dump_json()
    req_hash = hashlib.sha256(req_json.encode("utf-8")).hexdigest()

    CHECKOUT_ENDPOINT = "/api/v1/checkout/orders"
    existing_idem = (
        db.query(IdempotencyKey)
        .filter(
            IdempotencyKey.user_id == user.user_id,
            IdempotencyKey.endpoint == CHECKOUT_ENDPOINT,
            IdempotencyKey.idempotency_key == idempotency_key,
        )
        .first()
    )
    if existing_idem:
        if existing_idem.request_hash != req_hash:
            raise IdempotencyKeyReuseError(
                "Idempotency key has already been used with a different request payload."
            )
        saved_data = (
            existing_idem.response_body
            if isinstance(existing_idem.response_body, dict)
            else json.loads(existing_idem.response_body)
        )
        return CheckoutOrderResponse.model_validate(saved_data)

    # -------------------------------------------------------------------------
    # 1. Preconditions
    # -------------------------------------------------------------------------
    if settings.REQUIRE_VERIFIED_EMAIL_FOR_CHECKOUT and not user.email_verified:
        raise EmailNotVerifiedError(
            message="Email address must be verified before proceeding to checkout.",
            details={"email": user.email},
        )

    # Phone is strictly required for COD bookings
    if not user.phone or not str(user.phone).strip():
        raise ValidationFailedError(
            message="A verified contact phone number is required on your profile to request a Cash on Delivery booking.",
            details=[{"field": "phone", "message": "Phone number is required"}],
        )

    # Cap on simultaneous unaccepted bookings per customer
    pending_count = (
        db.query(Booking)
        .filter(Booking.user_id == user.user_id, Booking.status == BookingStatus.pending)
        .count()
    )
    if pending_count >= settings.CUSTOMER_MAX_PENDING_BOOKINGS:
        raise ValidationFailedError(
            message=(
                f"You have reached the maximum allowed pending booking requests ({settings.CUSTOMER_MAX_PENDING_BOOKINGS}). "
                "Please wait for your active requests to be accepted or completed before requesting more equipment."
            ),
            details={"max_pending": settings.CUSTOMER_MAX_PENDING_BOOKINGS, "current_pending": pending_count},
        )

    # Customer no-show abuse check
    no_show_events = (
        db.query(OrderEvent)
        .join(Booking, OrderEvent.booking_id == Booking.booking_id)
        .filter(Booking.user_id == user.user_id, OrderEvent.event_type == "customer_no_show")
        .count()
    )
    if no_show_events >= settings.CUSTOMER_NO_SHOW_THRESHOLD:
        raise ValidationFailedError(
            message="Your account has multiple reported delivery no-shows. New booking requests are restricted until cleared by platform moderation.",
            details={"no_show_count": no_show_events},
        )

    # Address ownership check (IDOR protection: 404 if not found or not owned)
    address = (
        db.query(Address)
        .filter(Address.address_id == payload.address_id, Address.user_id == user.user_id)
        .first()
    )
    if not address:
        raise NotFoundError("Address", str(payload.address_id))

    # Event date within rental duration
    start_d = payload.period.start_date
    end_d = payload.period.end_date
    from datetime import date as dt_date
    if start_d < dt_date.today():
        raise ValidationFailedError(
            "Rental start date cannot be in the past",
            details=[{"field": "period.start_date", "message": "Rental start date cannot be in the past"}],
        )
    if end_d < start_d:
        raise ValidationFailedError(
            "Rental end date cannot precede start date",
            details=[{"field": "period.end_date", "message": "end_date must be >= start_date"}],
        )

    event_d = payload.event.event_date
    if event_d and not (start_d <= event_d <= end_d):
        raise ValidationFailedError(
            "Event date must fall within the rental start and end dates.",
            details=[
                {"field": "event.event_date", "message": f"Must be between {start_d} and {end_d}"}
            ],
        )

    # Cash on delivery check
    if payload.payment_method == "cod":
        cod_setting = (
            db.query(PlatformSetting).filter(PlatformSetting.setting_key == "cod_enabled").first()
        )
        if cod_setting:
            cod_val = cod_setting.setting_value.strip().lower()
            if cod_val not in ("1", "true"):
                raise CodNotAvailableError(
                    message="Cash on Delivery is currently disabled by platform policy."
                )
        elif not settings.COD_ENABLED:
            raise CodNotAvailableError(
                message="Cash on Delivery is currently disabled by platform policy."
            )

    # Read cart lines FROM DATABASE, never from request!
    cart_lines = (
        db.query(CartItem)
        .filter(
            CartItem.user_id == user.user_id,
            CartItem.start_date == start_d,
            CartItem.end_date == end_d,
        )
        .all()
    )
    if not cart_lines:
        raise ValidationFailedError(
            message="No active cart lines found for the specified rental period.",
            details={"period": f"{start_d} to {end_d}"},
        )

    # -------------------------------------------------------------------------
    # 2. Lazy Expiry
    # -------------------------------------------------------------------------
    equipment_ids = sorted({item.equipment_id for item in cart_lines})
    # Clear stale holds on equipment before checking inventory
    expire_unpaid_bookings(db, equipment_ids=equipment_ids)

    # -------------------------------------------------------------------------
    # 3. Lock Equipment Rows & Inventory Validation (Ascending ID order)
    # -------------------------------------------------------------------------
    locked_equipment_map: dict[int, Equipment] = {}

    for eq_id in equipment_ids:
        eq = db.query(Equipment).filter(Equipment.equipment_id == eq_id).with_for_update().first()
        if eq:
            locked_equipment_map[eq_id] = eq

    rental_days = (end_d - start_d).days + 1
    unavailable_lines: list[dict[str, Any]] = []

    for item in cart_lines:
        eq = locked_equipment_map.get(item.equipment_id)
        if not eq:
            unavailable_lines.append(
                {
                    "equipment_id": item.equipment_id,
                    "name": "Item",
                    "reason": "Equipment no longer exists",
                }
            )
            continue

        # Active check
        if eq.status != EquipmentStatus.active:
            unavailable_lines.append(
                {
                    "equipment_id": eq.equipment_id,
                    "name": eq.name,
                    "reason": "Equipment is inactive or archived",
                }
            )
            continue

        # Vendor approved check
        vendor = db.query(Vendor).filter(Vendor.vendor_id == eq.vendor_id).first()
        if not vendor or vendor.approval_status != VendorApprovalStatus.approved:
            unavailable_lines.append(
                {
                    "equipment_id": eq.equipment_id,
                    "name": eq.name,
                    "reason": "Vendor profile is not approved",
                }
            )
            continue

        if vendor.user_id == user.user_id:
            raise ValidationFailedError(
                "You cannot book your own equipment listing",
                details=[{"field": "equipment_id", "message": "You cannot book your own equipment listing"}],
            )

        # Min rental days check
        if rental_days < eq.min_rental_days:
            unavailable_lines.append(
                {
                    "equipment_id": eq.equipment_id,
                    "name": eq.name,
                    "reason": f"Minimum rental duration is {eq.min_rental_days} days (requested {rental_days} days)",
                }
            )
            continue

        # Available quantity check
        avail_qty = get_equipment_available_quantity(
            db=db,
            equipment_id=eq.equipment_id,
            total_physical_quantity=eq.quantity,
            start_date=start_d,
            end_date=end_d,
        )
        if avail_qty < item.quantity:
            unavailable_lines.append(
                {
                    "equipment_id": eq.equipment_id,
                    "name": eq.name,
                    "reason": f"Only {avail_qty} unit(s) available; requested {item.quantity}",
                }
            )

    if unavailable_lines:
        raise ItemsUnavailableError(
            message="One or more equipment items are unavailable for the selected period.",
            details={"unavailable_lines": unavailable_lines},
        )

    # Fulfilment coverage check
    cart_vendor_ids = {
        str(locked_equipment_map[item.equipment_id].vendor_id) for item in cart_lines
    }
    for v_id_str in cart_vendor_ids:
        if v_id_str not in payload.fulfilment_by_vendor:
            # Default to delivery if all vendor's items allow it, else pickup
            vendor_eqs = [
                locked_equipment_map[item.equipment_id]
                for item in cart_lines
                if str(locked_equipment_map[item.equipment_id].vendor_id) == v_id_str
            ]
            all_delivery = all(eq.delivery_available for eq in vendor_eqs)
            payload.fulfilment_by_vendor[v_id_str] = "delivery" if all_delivery else "pickup"

    # Delivery availability check
    for item in cart_lines:
        eq = locked_equipment_map[item.equipment_id]
        chosen_fulfilment = payload.fulfilment_by_vendor.get(str(eq.vendor_id))
        if chosen_fulfilment == "delivery" and not eq.delivery_available:
            raise DeliveryNotAvailableError(
                message=f"Delivery is unavailable for item '{eq.name}'. Please choose pickup for this vendor.",
                details={"equipment_id": eq.equipment_id, "name": eq.name},
            )

    # -------------------------------------------------------------------------
    # 4. Coupon Lock & Reservation
    # -------------------------------------------------------------------------
    coupon: Coupon | None = None
    discount_amount = Decimal("0.00")

    # Compute pre-discount subtotal
    subtotal = sum(
        (
            locked_equipment_map[item.equipment_id].price_per_day
            * Decimal(rental_days)
            * Decimal(item.quantity)
            for item in cart_lines
        ),
        Decimal("0.00"),
    )

    if payload.coupon_code:
        code_clean = payload.coupon_code.strip()
        coupon = db.query(Coupon).filter(Coupon.code.ilike(code_clean)).with_for_update().first()
        if not coupon or not coupon.is_active:
            raise ValidationFailedError(
                "Invalid or inactive coupon code.", details={"coupon": code_clean}
            )

        vf = (
            coupon.valid_from.replace(tzinfo=UTC)
            if coupon.valid_from.tzinfo is None
            else coupon.valid_from
        )
        vt = (
            coupon.valid_to.replace(tzinfo=UTC)
            if coupon.valid_to.tzinfo is None
            else coupon.valid_to
        )
        if not (vf <= now <= vt):
            raise ValidationFailedError(
                "Coupon code is not valid at this time.", details={"coupon": code_clean}
            )

        if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
            raise ValidationFailedError(
                "Coupon usage limit has been reached.", details={"coupon": code_clean}
            )

        if subtotal < coupon.min_order_amount:
            raise ValidationFailedError(
                f"Booking subtotal ₹{subtotal} does not meet coupon minimum of ₹{coupon.min_order_amount}.",
                details={"min_order_amount": float(coupon.min_order_amount)},
            )

        # Compute discount
        if coupon.type == CouponType.percent:
            raw_discount = quantize_money(subtotal * (coupon.value / Decimal(100)))
            discount_amount = min(raw_discount, subtotal)
        else:
            discount_amount = min(coupon.value, subtotal)

        # Reserve one use now
        coupon.used_count += 1

    # -------------------------------------------------------------------------
    # 5. Compute Quote & Snapshots
    # -------------------------------------------------------------------------
    if not settings.PAYMENTS_ONLINE_ENABLED:
        tax_amount = Decimal("0.00")
        payload.payment_method = "cod"
    else:
        tax_setting = (
            db.query(PlatformSetting).filter(PlatformSetting.setting_key == "tax_rate_percent").first()
        )
        tax_rate = Decimal(tax_setting.setting_value.strip()) if tax_setting else Decimal("18.00")
        taxable_subtotal = max(Decimal("0.00"), subtotal - discount_amount)
        tax_amount = quantize_money(taxable_subtotal * (tax_rate / Decimal(100)))

    # Vendor groups for subtotal, delivery fee, deposit
    vendor_groups: dict[int, list[CartItem]] = {}
    for item in cart_lines:
        eq = locked_equipment_map[item.equipment_id]
        vendor_groups.setdefault(eq.vendor_id, []).append(item)

    delivery_fee_total = Decimal("0.00")
    vendor_delivery_fees: dict[int, Decimal] = {}
    for v_id, _v_items in vendor_groups.items():
        chosen_fulfilment = payload.fulfilment_by_vendor.get(str(v_id), "delivery")
        if chosen_fulfilment == "delivery":
            vendor = db.query(Vendor).filter(Vendor.vendor_id == v_id).first()
            fee = vendor.delivery_fee if vendor else Decimal("300.00")
            vendor_delivery_fees[v_id] = fee
            delivery_fee_total += fee
        else:
            vendor_delivery_fees[v_id] = Decimal("0.00")

    security_deposit_total = sum(
        (
            locked_equipment_map[item.equipment_id].security_deposit * Decimal(item.quantity)
            for item in cart_lines
        ),
        Decimal("0.00"),
    )

    grand_total = (
        subtotal - discount_amount + tax_amount + delivery_fee_total + security_deposit_total
    )

    # Acceptance timeout (24h in COD mode) vs hold minutes in online payment mode
    if not settings.PAYMENTS_ONLINE_ENABLED:
        expires_at = now + timedelta(hours=settings.VENDOR_ACCEPTANCE_TIMEOUT_HOURS)
    else:
        hold_setting = (
            db.query(PlatformSetting)
            .filter(PlatformSetting.setting_key == "payment_hold_minutes")
            .first()
        )
        hold_minutes = int(hold_setting.setting_value.strip()) if hold_setting else 15
        expires_at = now + timedelta(minutes=hold_minutes)

    # -------------------------------------------------------------------------
    # 6. Atomic Entity Creation
    # -------------------------------------------------------------------------
    address_snapshot = {
        "name": user.name,
        "phone": user.phone or "",
        "line1": address.line1,
        "line2": address.line2 or "",
        "city": address.city,
        "state": address.state,
        "pincode": address.pincode,
        "country": address.country,
    }

    booking = Booking(
        user_id=user.user_id,
        address_id=address.address_id,
        start_date=start_d,
        end_date=end_d,
        event_name=payload.event.event_name,
        event_type=payload.event.event_type,
        event_date=payload.event.event_date,
        venue_address=payload.event.venue_address,
        notes=payload.event.notes,
        delivery_address_snapshot=address_snapshot,
        subtotal=subtotal,
        discount=discount_amount,
        coupon_id=coupon.coupon_id if coupon else None,
        tax=tax_amount,
        delivery_fee=delivery_fee_total,
        security_deposit=security_deposit_total,
        total_amount=grand_total,
        payment_status=BookingPaymentStatus.unpaid,
        status=BookingStatus.pending,
        expires_at=expires_at,
    )
    db.add(booking)
    db.flush()

    # Create VendorOrders and BookingItems
    for v_id, v_items in vendor_groups.items():
        v_subtotal = sum(
            (
                locked_equipment_map[it.equipment_id].price_per_day
                * Decimal(rental_days)
                * Decimal(it.quantity)
                for it in v_items
            ),
            Decimal("0.00"),
        )
        fulfilment = payload.fulfilment_by_vendor.get(str(v_id), "delivery")
        v_del_fee = vendor_delivery_fees.get(v_id, Decimal("0.00"))

        vo = VendorOrder(
            booking_id=booking.booking_id,
            vendor_id=v_id,
            subtotal=v_subtotal,
            fulfilment_type=fulfilment,
            delivery_fee=v_del_fee,
            status=VendorOrderStatus.pending,
        )
        db.add(vo)
        db.flush()

        for it in v_items:
            eq = locked_equipment_map[it.equipment_id]
            line_tot = eq.price_per_day * Decimal(rental_days) * Decimal(it.quantity)
            dep_snapshot = eq.security_deposit * Decimal(it.quantity)

            # Resolve effective commission rate (0% when platform takes no commission / COD mode)
            if not settings.PAYMENTS_ONLINE_ENABLED:
                eff_rate = Decimal("0.00")
                comm_amount = Decimal("0.00")
            else:
                category = (
                    db.query(Category).filter(Category.category_id == eq.category_id).first()
                    if eq.category_id
                    else None
                )
                parent_cat = (
                    db.query(Category).filter(Category.category_id == category.parent_id).first()
                    if (category and category.parent_id)
                    else None
                )
                vendor = db.query(Vendor).filter(Vendor.vendor_id == eq.vendor_id).first()

                eff_rate, _src = resolve_commission(
                    equipment_rate=eq.commission_rate,
                    category_rate=category.default_commission_rate if category else None,
                    parent_category_rate=parent_cat.default_commission_rate if parent_cat else None,
                    vendor_rate=vendor.commission_rate if vendor else None,
                )
                comm_amount, _net = calculate_item_commission(line_tot, eff_rate)

            b_item = BookingItem(
                vendor_order_id=vo.vendor_order_id,
                booking_id=booking.booking_id,
                vendor_id=v_id,
                equipment_id=eq.equipment_id,
                quantity=it.quantity,
                price_per_day=eq.price_per_day,
                days=rental_days,
                total_price=line_tot,
                commission_rate=eff_rate,
                commission_amount=comm_amount,
                deposit_amount=dep_snapshot,
                item_status=BookingItemStatus.pending,
            )
            db.add(b_item)

    # First Payment Attempt
    payment_method_enum = PaymentMethod(payload.payment_method)
    payment_row = Payment(
        booking_id=booking.booking_id,
        amount=grand_total,
        type=PaymentType.full,
        method=payment_method_enum,
        gateway="cod" if payload.payment_method == "cod" else "razorpay",
        currency="INR",
        status=PaymentStatus.pending,
        attempt_no=1,
        idempotency_key=idempotency_key,
    )
    db.add(payment_row)

    # Order timeline event
    db.add(
        OrderEvent(
            booking_id=booking.booking_id,
            actor_user_id=user.user_id,
            actor_role="customer",
            event_type="order_created",
            to_status="pending",
            note=f"Order created with total ₹{grand_total}",
        )
    )

    # Customer in-app notification
    db.add(
        Notification(
            user_id=user.user_id,
            title="Booking Request Placed",
            message=f"Booking request BK-{booking.booking_id:04d} placed successfully. Awaiting vendor confirmation.",
            type="new_order",
        )
    )

    # Vendor in-app notification for each vendor partner
    for v_id in vendor_groups.keys():
        v_partner = db.query(Vendor).filter(Vendor.vendor_id == v_id).first()
        if v_partner and v_partner.user_id:
            db.add(
                Notification(
                    user_id=v_partner.user_id,
                    title="New Booking Request",
                    message=f"New booking request BK-{booking.booking_id:04d} received. Please review and accept or reject.",
                    type="new_order",
                )
            )

    # Delete cart lines for this period
    for item in cart_lines:
        db.delete(item)

    # Commit short DB transaction
    db.commit()

    # -------------------------------------------------------------------------
    # 7. Gateway Call Outside Transaction
    # -------------------------------------------------------------------------
    booking_num = f"BK-{booking.booking_id:04d}"

    if not settings.PAYMENTS_ONLINE_ENABLED or payload.payment_method == "cod":
        # COD path: booking stays pending, vendor acceptance timeout applies
        resp = CheckoutOrderResponse(
            booking_id=booking.booking_id,
            booking_number=booking_num,
            status=booking.status.value,
            payment_status=booking.payment_status.value,
            expires_at=booking.expires_at.isoformat() + "Z" if booking.expires_at else None,
            total_amount=float(booking.total_amount),
            payment_method="cod",
            razorpay=None,
        )
        idem_record = IdempotencyKey(
            user_id=user.user_id,
            endpoint=CHECKOUT_ENDPOINT,
            idempotency_key=idempotency_key,
            request_hash=req_hash,
            response_status=201,
            response_body=resp.model_dump(),
            expires_at=now + timedelta(days=1),
        )
        db.add(idem_record)
        db.commit()
        return resp

    if gateway is None:
        gateway = get_payment_gateway()

    amount_paise = int((grand_total * 100).to_integral_value())
    try:
        razorpay_order = gateway.create_order(
            amount_paise=amount_paise,
            currency="INR",
            receipt=booking_num,
            notes={"booking_id": str(booking.booking_id), "user_id": str(user.user_id)},
        )

        # Store gateway_order_id on payment row
        payment_row.gateway_order_id = razorpay_order["id"]
        db.commit()

        razorpay_block = RazorpayOrderBlock(
            key_id=getattr(gateway, "key_id", "rzp_test_placeholder"),
            order_id=razorpay_order["id"],
            amount=razorpay_order["amount"],
            currency=razorpay_order["currency"],
            name="Rent4Fraction",
            description=f"Rental Booking {booking_num}",
            prefill=RazorpayPrefill(
                name=user.name,
                email=user.email,
                contact=user.phone or "",
            ),
            notes={"booking_id": str(booking.booking_id)},
        )

        resp = CheckoutOrderResponse(
            booking_id=booking.booking_id,
            booking_number=booking_num,
            status=booking.status.value,
            payment_status=booking.payment_status.value,
            expires_at=booking.expires_at.isoformat() + "Z" if booking.expires_at else None,
            total_amount=float(booking.total_amount),
            payment_method=payload.payment_method,
            razorpay=razorpay_block,
        )

        idem_record = IdempotencyKey(
            user_id=user.user_id,
            endpoint=CHECKOUT_ENDPOINT,
            idempotency_key=idempotency_key,
            request_hash=req_hash,
            response_status=201,
            response_body=resp.model_dump(),
            expires_at=now + timedelta(days=1),
        )
        db.add(idem_record)
        db.commit()

        return resp

    except Exception as exc:
        logger.error("Razorpay order creation failed for booking %d: %s", booking.booking_id, exc)
        payment_row.status = PaymentStatus.failed
        payment_row.failure_code = "gateway_error"
        payment_row.failure_reason = str(exc)[:250]
        db.commit()
        raise PaymentGatewayUnavailableError(
            message="Payment gateway temporarily unavailable. You can retry payment via your bookings page.",
            details={"booking_id": booking.booking_id, "booking_number": booking_num},
        ) from exc
