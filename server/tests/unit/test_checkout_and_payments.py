from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser
from app.core.time import utc_now
from app.integrations.razorpay import FakePaymentGateway, set_payment_gateway
from app.jobs.expire_bookings import expire_unpaid_bookings
from app.jobs.reconcile_payments import reconcile_payments
from app.models.accounts import Address, User, UserRole, Vendor, VendorApprovalStatus
from app.models.catalog import Category, Equipment, EquipmentStatus
from app.models.orders import (
    Booking,
    BookingItem,
    BookingPaymentStatus,
    BookingStatus,
    CartItem,
    Coupon,
    CouponType,
)
from app.models.payments import (
    Payment,
    PaymentStatus,
    PaymentType,
)
from app.models.platform import PlatformSetting


class DirectTestResponse:
    def __init__(self, status_code: int, data: Any) -> None:
        self.status_code = status_code
        self._data = data

    def json(self) -> Any:
        if hasattr(self._data, "model_dump"):
            return self._data.model_dump(mode="json")
        return self._data

    @property
    def text(self) -> str:
        return json.dumps(self.json(), default=str)


def run_coro(coro: Any) -> Any:
    stack = [coro]
    val = None
    while stack:
        try:
            nxt = stack[-1].send(val)
            val = None
            if hasattr(nxt, "send"):
                stack.append(nxt)
            else:
                val = nxt
        except StopIteration as e:
            stack.pop()
            val = e.value
    return val


class DirectTestClient:
    def __init__(
        self,
        db: Session,
        gateway: FakePaymentGateway,
        cust1: User,
        cust2: User,
    ) -> None:
        self.db = db
        self.gateway = gateway
        self.cust1 = cust1
        self.cust2 = cust2

    def _resolve_user(self, headers: dict[str, str] | None) -> CurrentUser:
        if headers:
            auth = headers.get("Authorization", "")
            u = self.cust2 if "cust2" in auth else self.cust1
        else:
            u = self.cust1

        return CurrentUser(
            user_id=u.user_id,
            firebase_uid=u.firebase_uid,
            role="customer",
            name=u.name,
            email=u.email,
            phone=u.phone or "9876543210",
            email_verified=bool(u.email_verified),
            is_active=bool(u.is_active),
        )

    def post(
        self,
        url: str,
        headers: dict[str, str] | None = None,
        json: Any = None,
        content: bytes | None = None,
    ) -> DirectTestResponse:
        headers = headers or {}
        user = self._resolve_user(headers)

        from app.core.errors import DomainError

        try:
            if url == "/api/v1/checkout/orders":
                from app.routers.checkout import place_checkout_order
                from app.schemas.checkout import CheckoutOrderCreateRequest

                payload = CheckoutOrderCreateRequest.model_validate(json)
                idem_key = headers.get("Idempotency-Key", "default_idem_key")
                res = place_checkout_order(
                    payload=payload,
                    idempotency_key=idem_key,
                    current_user=user,
                    db=self.db,
                    gateway=self.gateway,
                )
                return DirectTestResponse(201, res)

            elif url == "/api/v1/payments/verify":
                from app.routers.payments import verify_payment
                from app.schemas.checkout import PaymentVerifyRequest

                payload = PaymentVerifyRequest.model_validate(json)
                res = verify_payment(
                    payload=payload,
                    current_user=user,
                    db=self.db,
                    gateway=self.gateway,
                )
                return DirectTestResponse(200, res)

            elif url.startswith("/api/v1/bookings/") and url.endswith("/pay"):
                from app.routers.bookings import retry_booking_payment

                booking_id = int(url.strip("/").split("/")[3])
                res = retry_booking_payment(
                    booking_id=booking_id,
                    current_user=user,
                    db=self.db,
                    gateway=self.gateway,
                )
                return DirectTestResponse(200, res)

            elif url == "/api/v1/webhooks/razorpay":
                from app.routers.webhooks import handle_razorpay_webhook

                class MockRequest:
                    def __init__(self, raw: bytes, req_headers: dict[str, str]) -> None:
                        self._raw = raw
                        self.headers = req_headers

                    async def body(self) -> bytes:
                        return self._raw

                mock_req = MockRequest(content or b"", headers)
                sig = headers.get("X-Razorpay-Signature")
                evt_id = headers.get("X-Razorpay-Event-Id")
                coro = handle_razorpay_webhook(
                    request=mock_req,  # type: ignore[arg-type]
                    x_razorpay_signature=sig,
                    x_razorpay_event_id=evt_id,
                    db=self.db,
                )
                res = run_coro(coro)
                return DirectTestResponse(200, res)

            raise NotImplementedError(f"DirectTestClient does not implement POST {url}")

        except DomainError as exc:
            return DirectTestResponse(
                exc.status_code,
                {"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
            )

    def get(
        self,
        url: str,
        headers: dict[str, str] | None = None,
    ) -> DirectTestResponse:
        headers = headers or {}
        user = self._resolve_user(headers)

        from app.core.errors import DomainError

        try:
            if url.startswith("/api/v1/payments/status"):
                from app.routers.payments import get_payment_status

                param_part = url.split("?")[1]
                b_id_str = param_part.split("booking_id=")[1].split("&")[0]
                booking_id = int(b_id_str)
                res = get_payment_status(
                    booking_id=booking_id,
                    current_user=user,
                    db=self.db,
                )
                return DirectTestResponse(200, res)

            raise NotImplementedError(f"DirectTestClient does not implement GET {url}")

        except DomainError as exc:
            return DirectTestResponse(
                exc.status_code,
                {"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
            )


@pytest.fixture
def checkout_test_env(db_session: Session) -> dict[str, Any]:
    """Test fixture setting up catalog, vendor, equipment, customer, address, and test client."""
    # 1. Platform Settings
    db_session.add(
        PlatformSetting(setting_key="tax_rate_percent", setting_value="18.0", description="GST")
    )
    db_session.add(
        PlatformSetting(
            setting_key="payment_hold_minutes", setting_value="15", description="Hold minutes"
        )
    )
    db_session.add(
        PlatformSetting(setting_key="cod_enabled", setting_value="0", description="COD disabled")
    )
    db_session.add(
        PlatformSetting(
            setting_key="platform_commission_percent",
            setting_value="10.0",
            description="Commission",
        )
    )

    # 2. Users: Cust1, Cust2, Vendor Owner
    cust1 = User(
        firebase_uid="fb_test_cust_1",
        email="cust1@rent4fraction.com",
        name="Customer One",
        phone="9876543210",
        role=UserRole.customer,
        is_active=1,
        email_verified=1,
    )
    cust2 = User(
        firebase_uid="fb_test_cust_2",
        email="cust2@rent4fraction.com",
        name="Customer Two",
        phone="9876543210",
        role=UserRole.customer,
        is_active=1,
        email_verified=1,
    )
    v_user = User(
        firebase_uid="fb_test_vendor_1",
        email="vendor1@rent4fraction.com",
        name="Vendor Owner",
        role=UserRole.vendor,
        is_active=1,
        email_verified=1,
    )
    db_session.add_all([cust1, cust2, v_user])
    db_session.flush()

    # 3. Address for Cust1
    addr = Address(
        user_id=cust1.user_id,
        line1="Flat 401, Sea View Apartments",
        city="Mumbai",
        state="Maharashtra",
        pincode="400050",
        country="India",
        is_default=True,
    )
    db_session.add(addr)
    db_session.flush()

    # 4. Vendor
    vendor = Vendor(
        user_id=v_user.user_id,
        business_name="Prime Cine Equipments",
        approval_status=VendorApprovalStatus.approved,
        delivery_fee=Decimal("400.00"),
        commission_rate=Decimal("10.00"),
    )
    db_session.add(vendor)
    db_session.flush()

    # 5. Category & Equipment
    cat = Category(name="Cinema Cameras", is_active=1)
    db_session.add(cat)
    db_session.flush()

    eq = Equipment(
        vendor_id=vendor.vendor_id,
        category_id=cat.category_id,
        name="RED Komodo 6K Camera",
        status=EquipmentStatus.active,
        price_per_day=Decimal("5000.00"),
        security_deposit=Decimal("15000.00"),
        quantity=2,
        min_rental_days=1,
        delivery_available=1,
    )
    db_session.add(eq)
    db_session.flush()

    # 6. Coupon
    coupon = Coupon(
        code="OFFER10",
        type=CouponType.percent,
        value=Decimal("10.00"),
        min_order_amount=Decimal("2000.00"),
        usage_limit=10,
        used_count=0,
        valid_from=datetime(2025, 1, 1),
        valid_to=datetime(2030, 1, 1),
        is_active=1,
    )
    db_session.add(coupon)
    db_session.commit()

    # 7. Gateway injection
    fake_gateway = FakePaymentGateway(
        key_id="rzp_test_fixture", key_secret="fixture_secret", webhook_secret="fixture_wh_secret"
    )
    set_payment_gateway(fake_gateway)

    # 8. Direct Test Client (safe, fast, no socket dependencies in sandbox)
    client = DirectTestClient(
        db=db_session,
        gateway=fake_gateway,
        cust1=cust1,
        cust2=cust2,
    )

    return {
        "client": client,
        "db": db_session,
        "cust1": cust1,
        "cust2": cust2,
        "vendor": vendor,
        "equipment": eq,
        "coupon": coupon,
        "address": addr,
        "gateway": fake_gateway,
    }


# =============================================================================
# 1. Order Placement & Idempotency Tests
# =============================================================================
@pytest.mark.unit
def test_checkout_order_placement_and_snapshots(checkout_test_env: dict[str, Any]) -> None:
    client: TestClient = checkout_test_env["client"]
    db: Session = checkout_test_env["db"]
    cust1: User = checkout_test_env["cust1"]
    eq: Equipment = checkout_test_env["equipment"]
    addr: Address = checkout_test_env["address"]
    vendor: Vendor = checkout_test_env["vendor"]
    coupon: Coupon = checkout_test_env["coupon"]
    auth = {"Authorization": "Bearer cust1-token"}

    # Add item to cart for rental 2026-12-01 to 2026-12-03 (3 days)
    cart_item = CartItem(
        user_id=cust1.user_id,
        equipment_id=eq.equipment_id,
        quantity=1,
        start_date=date(2026, 12, 1),
        end_date=date(2026, 12, 3),
    )
    db.add(cart_item)
    db.commit()

    order_payload = {
        "period": {"start_date": "2026-12-01", "end_date": "2026-12-03"},
        "address_id": addr.address_id,
        "fulfilment": {str(vendor.vendor_id): "delivery"},
        "event": {
            "event_name": "Commercial Shoot",
            "event_type": "Ad",
            "event_date": "2026-12-02",
            "venue_address": "Film City Studio 5, Mumbai",
        },
        "coupon_code": "OFFER10",
        "payment_method": "upi",
    }

    headers = {**auth, "Idempotency-Key": "idem_order_placement_001"}
    res = client.post("/api/v1/checkout/orders", headers=headers, json=order_payload)
    assert res.status_code == 201, res.text
    data = res.json()

    # In COD mode, razorpay is None and payment_method is cod
    assert data["razorpay"] is None
    assert data["payment_method"] == "cod"
    assert data["status"] == "pending"
    assert data["payment_status"] == "unpaid"

    booking_id = data["booking_id"]
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    assert booking is not None

    # Subtotal: 5000 * 3 = 15000
    # Coupon 10%: 1500 discount
    # Tax: 0 (platform charges zero commission and zero tax in COD mode)
    # Delivery fee: 400
    # Deposit: 15000
    # Total: 15000 - 1500 + 0 + 400 + 15000 = 28900.00
    assert booking.tax == Decimal("0.00")
    assert booking.total_amount == Decimal("28900.00")
    assert booking.subtotal == Decimal("15000.00")
    assert booking.discount == Decimal("1500.00")
    assert booking.delivery_fee == Decimal("400.00")
    assert booking.security_deposit == Decimal("15000.00")

    # Invariant: money totals identity
    assert booking.total_amount == (
        booking.subtotal
        - booking.discount
        + booking.tax
        + booking.delivery_fee
        + booking.security_deposit
    )

    # Address snapshot check
    assert booking.address_snapshot is not None
    assert booking.address_snapshot.get("line1") == addr.line1
    assert booking.address_snapshot.get("pincode") == "400050"

    # Booking items and commission snapshot check
    items = db.query(BookingItem).filter(BookingItem.booking_id == booking.booking_id).all()
    assert len(items) == 1
    it = items[0]
    assert it.quantity == 1
    # Commission is 0.00 in COD mode (0% commission platform)
    assert it.commission_rate == Decimal("0.00")
    assert it.commission_amount == Decimal("0.00")
    assert it.deposit_amount == Decimal("15000.00")

    # Coupon reservation check
    db.refresh(coupon)
    assert coupon.used_count == 1

    # Cart cleared for checkout period
    remaining_cart = db.query(CartItem).filter(CartItem.user_id == cust1.user_id).all()
    assert len(remaining_cart) == 0


@pytest.mark.unit
def test_checkout_idempotency_replay_and_conflict(checkout_test_env: dict[str, Any]) -> None:
    client: TestClient = checkout_test_env["client"]
    db: Session = checkout_test_env["db"]
    cust1: User = checkout_test_env["cust1"]
    eq: Equipment = checkout_test_env["equipment"]
    addr: Address = checkout_test_env["address"]
    vendor: Vendor = checkout_test_env["vendor"]
    auth = {"Authorization": "Bearer cust1-token"}

    db.add(
        CartItem(
            user_id=cust1.user_id,
            equipment_id=eq.equipment_id,
            quantity=1,
            start_date=date(2026, 12, 5),
            end_date=date(2026, 12, 6),
        )
    )
    db.commit()

    order_payload = {
        "period": {"start_date": "2026-12-05", "end_date": "2026-12-06"},
        "address_id": addr.address_id,
        "fulfilment": {str(vendor.vendor_id): "pickup"},
        "event": {"event_type": "Photo Shoot", "event_date": "2026-12-05"},
        "payment_method": "card",
    }
    headers = {**auth, "Idempotency-Key": "idem_replay_test_99"}

    # First attempt: 201 Created
    res1 = client.post("/api/v1/checkout/orders", headers=headers, json=order_payload)
    assert res1.status_code == 201

    # Second attempt (same body + same key): fast idempotent replay (200 OK or 201)
    res2 = client.post("/api/v1/checkout/orders", headers=headers, json=order_payload)
    assert res2.status_code in (200, 201)
    assert res1.json()["booking_id"] == res2.json()["booking_id"]

    # Third attempt (different body with same key): 409 Conflict idempotency_key_reuse
    conflict_payload = {**order_payload, "payment_method": "upi"}
    res3 = client.post("/api/v1/checkout/orders", headers=headers, json=conflict_payload)
    assert res3.status_code == 409
    assert res3.json()["error"]["code"] in ("idempotency_key_reuse", "idempotency_conflict")


@pytest.mark.unit
def test_checkout_cod_disabled_rejection(checkout_test_env: dict[str, Any]) -> None:
    client: TestClient = checkout_test_env["client"]
    db: Session = checkout_test_env["db"]
    cust1: User = checkout_test_env["cust1"]
    eq: Equipment = checkout_test_env["equipment"]
    addr: Address = checkout_test_env["address"]
    vendor: Vendor = checkout_test_env["vendor"]
    auth = {"Authorization": "Bearer cust1-token"}

    db.add(
        CartItem(
            user_id=cust1.user_id,
            equipment_id=eq.equipment_id,
            quantity=1,
            start_date=date(2026, 12, 10),
            end_date=date(2026, 12, 11),
        )
    )
    db.commit()

    from app.core.config import get_settings
    orig = get_settings().PAYMENTS_ONLINE_ENABLED
    get_settings().PAYMENTS_ONLINE_ENABLED = True
    try:
        res = client.post(
            "/api/v1/checkout/orders",
            headers={**auth, "Idempotency-Key": "idem_cod_rejection"},
            json={
                "period": {"start_date": "2026-12-10", "end_date": "2026-12-11"},
                "address_id": addr.address_id,
                "fulfilment": {str(vendor.vendor_id): "pickup"},
                "event": {"event_type": "Shoot"},
                "payment_method": "cod",
            },
        )
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "cod_not_available"
    finally:
        get_settings().PAYMENTS_ONLINE_ENABLED = orig


# =============================================================================
# 2. Payment Verification & IDOR Protection Tests
# =============================================================================
@pytest.mark.unit
def test_payment_verify_success_and_idor(checkout_test_env: dict[str, Any]) -> None:
    client: TestClient = checkout_test_env["client"]
    db: Session = checkout_test_env["db"]
    cust1: User = checkout_test_env["cust1"]
    addr: Address = checkout_test_env["address"]
    fake_gateway: FakePaymentGateway = checkout_test_env["gateway"]

    # Create pending booking
    booking = Booking(
        user_id=cust1.user_id,
        address_id=addr.address_id,
        status=BookingStatus.pending,
        payment_status=BookingPaymentStatus.unpaid,
        start_date=date(2026, 12, 20),
        end_date=date(2026, 12, 22),
        subtotal=Decimal("10000.00"),
        tax=Decimal("1800.00"),
        total_amount=Decimal("11800.00"),
        expires_at=utc_now() + timedelta(minutes=15),
    )
    db.add(booking)
    db.flush()

    payment = Payment(
        booking_id=booking.booking_id,
        amount=Decimal("11800.00"),
        currency="INR",
        type=PaymentType.full,
        status=PaymentStatus.pending,
        gateway_order_id="order_fake_verify_1",
    )
    db.add(payment)
    db.commit()

    # Pre-populate fake gateway with captured payment
    fake_pay_id = "pay_fake_verify_success"
    fake_gateway.payments[fake_pay_id] = {
        "id": fake_pay_id,
        "entity": "payment",
        "amount": 1180000,
        "currency": "INR",
        "status": "captured",
        "order_id": "order_fake_verify_1",
        "method": "upi",
    }
    valid_sig = fake_gateway._generate_signature("order_fake_verify_1", fake_pay_id)

    # 1. IDOR Check: Cust2 cannot verify Cust1's payment (returns 404)
    res_idor = client.post(
        "/api/v1/payments/verify",
        headers={"Authorization": "Bearer cust2-token"},
        json={
            "booking_id": booking.booking_id,
            "razorpay_order_id": "order_fake_verify_1",
            "razorpay_payment_id": fake_pay_id,
            "razorpay_signature": valid_sig,
        },
    )
    assert res_idor.status_code == 404

    # 2. Invalid Signature Check: Returns 400 invalid_signature
    res_bad_sig = client.post(
        "/api/v1/payments/verify",
        headers={"Authorization": "Bearer cust1-token"},
        json={
            "booking_id": booking.booking_id,
            "razorpay_order_id": "order_fake_verify_1",
            "razorpay_payment_id": fake_pay_id,
            "razorpay_signature": "tampered_signature_hex",
        },
    )
    assert res_bad_sig.status_code == 400
    assert res_bad_sig.json()["error"]["code"] == "invalid_signature"

    # 3. Successful Verification
    res_ok = client.post(
        "/api/v1/payments/verify",
        headers={"Authorization": "Bearer cust1-token"},
        json={
            "booking_id": booking.booking_id,
            "razorpay_order_id": "order_fake_verify_1",
            "razorpay_payment_id": fake_pay_id,
            "razorpay_signature": valid_sig,
        },
    )
    assert res_ok.status_code == 200
    assert res_ok.json()["success"] is True
    assert res_ok.json()["status"] == "confirmed"

    db.refresh(booking)
    db.refresh(payment)
    assert booking.status == BookingStatus.confirmed
    assert booking.payment_status == BookingPaymentStatus.paid
    assert payment.status == PaymentStatus.success
    assert payment.transaction_id == fake_pay_id


@pytest.mark.unit
def test_payment_status_polling_and_retry(checkout_test_env: dict[str, Any]) -> None:
    client: TestClient = checkout_test_env["client"]
    db: Session = checkout_test_env["db"]
    cust1: User = checkout_test_env["cust1"]
    addr: Address = checkout_test_env["address"]
    auth = {"Authorization": "Bearer cust1-token"}

    # Pending booking within hold window
    booking = Booking(
        user_id=cust1.user_id,
        address_id=addr.address_id,
        status=BookingStatus.pending,
        payment_status=BookingPaymentStatus.unpaid,
        start_date=date(2026, 12, 25),
        end_date=date(2026, 12, 26),
        subtotal=Decimal("5000.00"),
        tax=Decimal("900.00"),
        total_amount=Decimal("5900.00"),
        expires_at=utc_now() + timedelta(minutes=10),
    )
    db.add(booking)
    db.flush()

    p1 = Payment(
        booking_id=booking.booking_id,
        amount=Decimal("5900.00"),
        currency="INR",
        type=PaymentType.full,
        status=PaymentStatus.pending,
        gateway_order_id="order_attempt_1",
    )
    db.add(p1)
    db.commit()

    # 1. Status Polling Endpoint
    res_status = client.get(
        f"/api/v1/payments/status?booking_id={booking.booking_id}", headers=auth
    )
    assert res_status.status_code == 200
    st = res_status.json()
    assert st["booking_id"] == booking.booking_id
    assert st["booking_status"] == "pending"
    assert st["payment_status"] == "unpaid"

    # 2. Retry Payment (creates attempt 2, supersedes attempt 1)
    res_retry = client.post(f"/api/v1/bookings/{booking.booking_id}/pay", headers=auth)
    assert res_retry.status_code == 200
    ret_data = res_retry.json()
    assert (ret_data.get("order_id") or ret_data.get("razorpay_order_id")).startswith("order_fake_")
    assert (ret_data.get("amount") or ret_data.get("amount_paise")) == 590000

    db.refresh(p1)
    assert p1.status == PaymentStatus.failed
    assert "Superseded" in str(p1.failure_reason)

    # 3. Retry on Expired Booking: 409 booking_expired
    booking.expires_at = utc_now() - timedelta(minutes=1)
    db.commit()
    res_expired = client.post(f"/api/v1/bookings/{booking.booking_id}/pay", headers=auth)
    assert res_expired.status_code == 409
    assert res_expired.json()["error"]["code"] == "booking_expired"


# =============================================================================
# 3. Razorpay Webhook Processing Tests
# =============================================================================
@pytest.mark.unit
def test_webhook_payment_captured_and_deduplication(checkout_test_env: dict[str, Any]) -> None:
    client: TestClient = checkout_test_env["client"]
    db: Session = checkout_test_env["db"]
    cust1: User = checkout_test_env["cust1"]
    addr: Address = checkout_test_env["address"]
    fake_gateway: FakePaymentGateway = checkout_test_env["gateway"]

    booking = Booking(
        user_id=cust1.user_id,
        address_id=addr.address_id,
        status=BookingStatus.pending,
        payment_status=BookingPaymentStatus.unpaid,
        start_date=date(2027, 1, 10),
        end_date=date(2027, 1, 12),
        subtotal=Decimal("6000.00"),
        tax=Decimal("1080.00"),
        total_amount=Decimal("7080.00"),
        expires_at=utc_now() + timedelta(minutes=15),
    )
    db.add(booking)
    db.flush()

    payment = Payment(
        booking_id=booking.booking_id,
        amount=Decimal("7080.00"),
        currency="INR",
        type=PaymentType.full,
        status=PaymentStatus.pending,
        gateway_order_id="order_wh_test_100",
    )
    db.add(payment)
    db.commit()

    webhook_payload = {
        "entity": "event",
        "account_id": "acc_fake",
        "event": "payment.captured",
        "contains": ["payment"],
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_wh_captured_100",
                    "amount": 708000,
                    "currency": "INR",
                    "status": "captured",
                    "order_id": "order_wh_test_100",
                    "method": "card",
                }
            }
        },
    }
    raw_bytes = json.dumps(webhook_payload).encode("utf-8")
    valid_sig = fake_gateway._generate_webhook_signature(raw_bytes)

    # 1. Successful Webhook Processing
    res1 = client.post(
        "/api/v1/webhooks/razorpay",
        content=raw_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": valid_sig,
            "X-Razorpay-Event-Id": "evt_wh_001",
        },
    )
    assert res1.status_code == 200
    assert res1.json()["processed"] is True

    db.refresh(booking)
    db.refresh(payment)
    assert booking.status == BookingStatus.confirmed
    assert booking.payment_status == BookingPaymentStatus.paid
    assert payment.status == PaymentStatus.success

    # 2. Duplicate Delivery: Fast 200 OK replay without duplicate side-effects
    res_dup = client.post(
        "/api/v1/webhooks/razorpay",
        content=raw_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": valid_sig,
            "X-Razorpay-Event-Id": "evt_wh_001",
        },
    )
    assert res_dup.status_code == 200
    assert res_dup.json()["processed"] is True

    # 3. Out-of-order payment.failed event arriving AFTER capture must NEVER undo success
    failed_payload = {
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_wh_captured_100",
                    "order_id": "order_wh_test_100",
                    "error_description": "Network timeout",
                }
            }
        },
    }
    failed_bytes = json.dumps(failed_payload).encode("utf-8")
    failed_sig = fake_gateway._generate_webhook_signature(failed_bytes)
    res_failed = client.post(
        "/api/v1/webhooks/razorpay",
        content=failed_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": failed_sig,
            "X-Razorpay-Event-Id": "evt_wh_002",
        },
    )
    assert res_failed.status_code == 200

    db.refresh(booking)
    db.refresh(payment)
    assert booking.status == BookingStatus.confirmed
    assert payment.status == PaymentStatus.success


# =============================================================================
# 4. Background Jobs (Hold Expiry & Payment Reconciliation)
# =============================================================================
@pytest.mark.unit
def test_expire_unpaid_bookings_job(checkout_test_env: dict[str, Any]) -> None:
    db: Session = checkout_test_env["db"]
    cust1: User = checkout_test_env["cust1"]
    addr: Address = checkout_test_env["address"]
    coupon: Coupon = checkout_test_env["coupon"]
    coupon.used_count = 1
    db.commit()

    # Expired hold booking
    past_time = utc_now() - timedelta(minutes=5)
    booking = Booking(
        user_id=cust1.user_id,
        address_id=addr.address_id,
        coupon_id=coupon.coupon_id,
        status=BookingStatus.pending,
        payment_status=BookingPaymentStatus.unpaid,
        start_date=date(2027, 2, 1),
        end_date=date(2027, 2, 3),
        subtotal=Decimal("4000.00"),
        total_amount=Decimal("4000.00"),
        expires_at=past_time,
    )
    db.add(booking)
    db.flush()

    p_pending = Payment(
        booking_id=booking.booking_id,
        amount=Decimal("4000.00"),
        currency="INR",
        type=PaymentType.full,
        status=PaymentStatus.pending,
    )
    db.add(p_pending)
    db.commit()

    # Run Expiry Job
    expired_count = expire_unpaid_bookings(db)
    assert expired_count >= 1

    db.refresh(booking)
    db.refresh(p_pending)
    db.refresh(coupon)
    assert booking.status == BookingStatus.cancelled
    assert booking.payment_status == BookingPaymentStatus.unpaid
    assert p_pending.status == PaymentStatus.failed
    assert coupon.used_count == 0  # Reserved coupon released


@pytest.mark.unit
def test_reconcile_payments_job(checkout_test_env: dict[str, Any]) -> None:
    db: Session = checkout_test_env["db"]
    cust1: User = checkout_test_env["cust1"]
    addr: Address = checkout_test_env["address"]
    fake_gateway: FakePaymentGateway = checkout_test_env["gateway"]

    booking = Booking(
        user_id=cust1.user_id,
        address_id=addr.address_id,
        status=BookingStatus.pending,
        payment_status=BookingPaymentStatus.unpaid,
        start_date=date(2027, 3, 1),
        end_date=date(2027, 3, 2),
        subtotal=Decimal("2000.00"),
        total_amount=Decimal("2000.00"),
        expires_at=utc_now() + timedelta(minutes=15),
    )
    db.add(booking)
    db.flush()

    order_id = "order_reconcile_test_1"
    pay_id = "pay_reconcile_captured_1"
    payment = Payment(
        booking_id=booking.booking_id,
        amount=Decimal("2000.00"),
        currency="INR",
        type=PaymentType.full,
        status=PaymentStatus.pending,
        gateway_order_id=order_id,
    )
    db.add(payment)
    db.commit()

    # Gateway reports captured payment for this order
    fake_gateway.payments[pay_id] = {
        "id": pay_id,
        "amount": 200000,
        "currency": "INR",
        "status": "captured",
        "order_id": order_id,
        "method": "upi",
    }
    fake_gateway.orders[order_id] = {"id": order_id, "status": "paid", "amount_paid": 200000}

    # Run Reconcile Job with PAYMENTS_ONLINE_ENABLED=True to test reconciliation logic
    from app.core.config import get_settings
    orig = get_settings().PAYMENTS_ONLINE_ENABLED
    get_settings().PAYMENTS_ONLINE_ENABLED = True
    try:
        reconciled = reconcile_payments(db, gateway=fake_gateway)
        assert reconciled >= 1
    finally:
        get_settings().PAYMENTS_ONLINE_ENABLED = orig

    db.refresh(booking)
    db.refresh(payment)
    assert booking.status == BookingStatus.confirmed
    assert booking.payment_status == BookingPaymentStatus.paid
    assert payment.status == PaymentStatus.success
