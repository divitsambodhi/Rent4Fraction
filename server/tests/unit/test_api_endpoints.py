from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_token_verifier
from app.main import create_app
from app.models.accounts import Address, User, UserRole, Vendor, VendorApprovalStatus
from app.models.catalog import Category, Equipment, EquipmentImage, EquipmentStatus
from app.models.orders import (
    Booking,
    BookingPaymentStatus,
    BookingStatus,
    CartItem,
    Coupon,
    CouponType,
)
from app.models.platform import PlatformSetting


@pytest.fixture
def api_test_setup(db_session: Session) -> dict[str, Any]:
    app = create_app()

    # Pre-seed platform tax setting
    tax_setting = PlatformSetting(
        setting_key="tax_rate_percent",
        setting_value="18.0",
        description="Platform GST percentage",
    )
    db_session.add(tax_setting)

    # 1. Users
    cust1 = User(
        firebase_uid="fb-cust-1",
        email="cust1@rent4fraction.com",
        name="Customer One",
        role=UserRole.customer,
        is_active=1,
        email_verified=1,
    )
    cust2 = User(
        firebase_uid="fb-cust-2",
        email="cust2@rent4fraction.com",
        name="Customer Two",
        role=UserRole.customer,
        is_active=1,
        email_verified=1,
    )
    vendor_user = User(
        firebase_uid="fb-vendor-1",
        email="vendor1@rent4fraction.com",
        name="Vendor Owner",
        role=UserRole.vendor,
        is_active=1,
        email_verified=1,
    )
    db_session.add_all([cust1, cust2, vendor_user])
    db_session.flush()

    # 2. Vendor
    v = Vendor(
        user_id=vendor_user.user_id,
        business_name="Pro Cine Rentals",
        approval_status=VendorApprovalStatus.approved,
        address="Mumbai, Maharashtra",
        delivery_fee=Decimal("300.00"),
    )
    db_session.add(v)
    db_session.flush()

    # 3. Category & Equipment
    cat = Category(
        name="Cameras",
        parent_id=None,
        is_active=1,
    )
    db_session.add(cat)
    db_session.flush()

    eq = Equipment(
        vendor_id=v.vendor_id,
        category_id=cat.category_id,
        name="Sony FX3 Cinema Camera",
        description="Full frame cinema line camera",
        status=EquipmentStatus.active,
        price_per_day=Decimal("2500.00"),
        security_deposit=Decimal("10000.00"),
        quantity=3,
        min_rental_days=1,
        delivery_available=1,
        avg_rating=Decimal("4.9"),
        review_count=8,
    )
    db_session.add(eq)
    db_session.flush()

    eq_img = EquipmentImage(
        equipment_id=eq.equipment_id,
        url="https://images.rent4fraction.com/sony-fx3.jpg",
        sort_order=0,
        is_primary=1,
    )
    db_session.add(eq_img)

    # 4. Coupon
    coupon = Coupon(
        code="SAVE10",
        type=CouponType.percent,
        value=Decimal("10.00"),
        min_order_amount=Decimal("1000.00"),
        usage_limit=100,
        used_count=0,
        valid_from=datetime(2025, 1, 1),
        valid_to=datetime(2030, 1, 1),
        is_active=1,
    )
    db_session.add(coupon)
    db_session.commit()

    # Dynamic token claims resolver
    active_claims: dict[str, Any] = {"uid": "fb-cust-1", "email": "cust1@rent4fraction.com"}

    def fake_verifier(token: str, _check_revoked: bool = False) -> dict[str, Any]:
        if token == "cust2-token":
            return {"uid": "fb-cust-2", "email": "cust2@rent4fraction.com"}
        if token == "vendor-token":
            return {"uid": "fb-vendor-1", "email": "vendor1@rent4fraction.com"}
        return active_claims

    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_token_verifier] = lambda: fake_verifier

    client = TestClient(app)
    return {
        "client": client,
        "cust1": cust1,
        "cust2": cust2,
        "vendor": v,
        "equipment": eq,
        "category": cat,
        "coupon": coupon,
        "db": db_session,
    }


# =============================================================================
# 1. Public Endpoints Tests
# =============================================================================
@pytest.mark.unit
def test_public_categories_and_cache(api_test_setup: dict[str, Any]) -> None:
    client: TestClient = api_test_setup["client"]
    res = client.get("/api/v1/categories")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "ETag" in res.headers
    assert "Cache-Control" in res.headers

    # Single category
    cat_id = api_test_setup["category"].category_id
    res_single = client.get(f"/api/v1/categories/{cat_id}")
    assert res_single.status_code == 200
    assert res_single.json()["id"] == str(cat_id)


@pytest.mark.unit
def test_public_equipment_search_and_detail(api_test_setup: dict[str, Any]) -> None:
    client: TestClient = api_test_setup["client"]
    eq_id = api_test_setup["equipment"].equipment_id

    # Search
    res_search = client.get("/api/v1/equipment?q=Sony&sort=rating")
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert "items" in search_data
    assert "facets" in search_data
    assert search_data["total"] >= 1
    assert any(it["equipment_id"] == str(eq_id) for it in search_data["items"])

    # Detail
    res_detail = client.get(f"/api/v1/equipment/{eq_id}")
    assert res_detail.status_code == 200
    detail_data = res_detail.json()
    assert detail_data["name"] == "Sony FX3 Cinema Camera"
    assert detail_data["status"] == "active"
    assert "vendor" in detail_data
    # Ensure sensitive vendor fields are NOT leaked in detail
    assert "phone" not in detail_data["vendor"]
    assert "gst_number" not in detail_data["vendor"]

    # Availability
    res_avail = client.get(f"/api/v1/equipment/{eq_id}/availability?from=2026-11-01&to=2026-11-05")
    assert res_avail.status_code == 200
    avail_data = res_avail.json()
    assert avail_data["available_quantity"] == 3

    # Related items
    res_rel = client.get(f"/api/v1/equipment/{eq_id}/related")
    assert res_rel.status_code == 200
    rel_data = res_rel.json()
    assert "similar" in rel_data
    assert "more_from_vendor" in rel_data


@pytest.mark.unit
def test_public_vendors_and_privacy(api_test_setup: dict[str, Any]) -> None:
    client: TestClient = api_test_setup["client"]
    v_id = api_test_setup["vendor"].vendor_id

    # List vendors
    res_v = client.get("/api/v1/vendors")
    assert res_v.status_code == 200
    vendors = res_v.json()
    assert any(v["id"] == str(v_id) for v in vendors)
    # Check that privacy fields (phone, email, GST) are absent
    for v in vendors:
        assert "phone" not in v
        assert "gst_number" not in v
        assert "email" not in v

    # Single storefront
    res_store = client.get(f"/api/v1/vendors/{v_id}")
    assert res_store.status_code == 200
    store = res_store.json()
    assert store["business_name"] == "Pro Cine Rentals"
    assert "phone" not in store
    assert "gst_number" not in store
    assert "equipment" in store


@pytest.mark.unit
def test_public_help_faqs_and_contact(api_test_setup: dict[str, Any]) -> None:
    client: TestClient = api_test_setup["client"]

    # FAQs
    res_faq = client.get("/api/v1/help/faqs")
    assert res_faq.status_code == 200
    faqs = res_faq.json()
    assert isinstance(faqs, list)
    assert len(faqs) > 0

    # Contact form (501 not_configured until table exists)
    res_contact = client.post(
        "/api/v1/help/contact",
        json={
            "name": "Inquirer",
            "email": "inquire@example.com",
            "subject": "Equipment inquiry",
            "message": "Do you have anamorphic lenses available?",
        },
    )
    assert res_contact.status_code == 501
    assert res_contact.json()["error"]["code"] == "not_configured"


# =============================================================================
# 2. Customer Endpoints Tests (Cart, Wishlist, Addresses, Profile, Badges)
# =============================================================================
@pytest.mark.unit
def test_customer_cart_and_wishlist_lifecycle(api_test_setup: dict[str, Any]) -> None:
    client: TestClient = api_test_setup["client"]
    eq_id = api_test_setup["equipment"].equipment_id
    cust_auth = {"Authorization": "Bearer cust1-token"}

    # 1. Add to cart
    res_add = client.post(
        "/api/v1/cart/items",
        headers=cust_auth,
        json={
            "equipment_id": str(eq_id),
            "quantity": 1,
            "start_date": "2026-11-10",
            "end_date": "2026-11-12",
        },
    )
    assert res_add.status_code == 201
    cart = res_add.json()
    assert len(cart["items"]) == 1
    cart_item_id = cart["items"][0]["cart_item_id"]

    # 2. Update cart item
    res_upd = client.patch(
        f"/api/v1/cart/items/{cart_item_id}",
        headers=cust_auth,
        json={"quantity": 2},
    )
    assert res_upd.status_code == 200
    assert res_upd.json()["items"][0]["quantity"] == 2

    # 3. Apply dates across cart
    res_dates = client.post(
        "/api/v1/cart/apply-dates",
        headers=cust_auth,
        json={"start_date": "2026-11-15", "end_date": "2026-11-18"},
    )
    assert res_dates.status_code == 200

    # 4. Move to wishlist
    res_move = client.post(
        f"/api/v1/cart/move-to-wishlist/{cart_item_id}",
        headers=cust_auth,
    )
    assert res_move.status_code == 200

    # Verify wishlist has item
    res_wish = client.get("/api/v1/wishlist", headers=cust_auth)
    assert res_wish.status_code == 200
    assert len(res_wish.json()) == 1

    # Remove from wishlist
    res_rem_w = client.delete(f"/api/v1/wishlist/{eq_id}", headers=cust_auth)
    assert res_rem_w.status_code == 200


@pytest.mark.unit
def test_customer_addresses_and_validation(api_test_setup: dict[str, Any]) -> None:
    client: TestClient = api_test_setup["client"]
    cust_auth = {"Authorization": "Bearer cust1-token"}

    # Invalid PIN code (fails 6-digit regex ^[1-9][0-9]{5}$)
    res_bad_pin = client.post(
        "/api/v1/addresses",
        headers=cust_auth,
        json={
            "line1": "Flat 101, Sea View",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "012345",  # starts with 0
            "country": "India",
            "is_default": True,
        },
    )
    assert res_bad_pin.status_code == 422

    # Invalid state
    res_bad_state = client.post(
        "/api/v1/addresses",
        headers=cust_auth,
        json={
            "line1": "Flat 101, Sea View",
            "city": "Mumbai",
            "state": "California",  # Not an Indian state
            "pincode": "400001",
            "country": "India",
            "is_default": True,
        },
    )
    assert res_bad_state.status_code == 422

    # Valid address 1 (becomes default automatically)
    res_ok1 = client.post(
        "/api/v1/addresses",
        headers=cust_auth,
        json={
            "line1": "Flat 101, Sea View",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
            "country": "India",
            "is_default": False,
        },
    )
    assert res_ok1.status_code == 201
    addr1 = res_ok1.json()
    assert addr1["is_default"] is True  # First address is promoted to default

    # Valid address 2
    res_ok2 = client.post(
        "/api/v1/addresses",
        headers=cust_auth,
        json={
            "line1": "Office 402, Trade Tower",
            "city": "Pune",
            "state": "Maharashtra",
            "pincode": "411001",
            "country": "India",
            "is_default": True,
        },
    )
    assert res_ok2.status_code == 201
    addr2 = res_ok2.json()
    assert addr2["is_default"] is True

    # Check that addr1 is no longer default
    res_list = client.get("/api/v1/addresses", headers=cust_auth)
    addrs = res_list.json()
    defaults = [a for a in addrs if a["is_default"]]
    assert len(defaults) == 1
    assert defaults[0]["id"] == addr2["id"]


@pytest.mark.unit
def test_customer_profile_and_badges(api_test_setup: dict[str, Any]) -> None:
    client: TestClient = api_test_setup["client"]
    cust_auth = {"Authorization": "Bearer cust1-token"}

    # Update profile
    res_prof = client.patch(
        "/api/v1/auth/profile",
        headers=cust_auth,
        json={"name": "Customer One Renamed", "phone": "9819998877"},
    )
    assert res_prof.status_code == 200
    assert res_prof.json()["name"] == "Customer One Renamed"
    assert res_prof.json()["phone"] == "9819998877"

    # Badges
    res_badge = client.get("/api/v1/account/badges", headers=cust_auth)
    assert res_badge.status_code == 200
    badges = res_badge.json()
    assert "active_bookings_count" in badges
    assert "unread_inbox_count" in badges
    assert "wishlist_count" in badges


# =============================================================================
# 3. Coupons, Checkout Quote & Bookings
# =============================================================================
@pytest.mark.unit
def test_checkout_quote_and_coupon_validation(api_test_setup: dict[str, Any]) -> None:
    client: TestClient = api_test_setup["client"]
    eq_id = api_test_setup["equipment"].equipment_id
    cust_auth = {"Authorization": "Bearer cust1-token"}

    # Validate coupon advisory
    res_cv = client.post(
        "/api/v1/checkout/coupons/validate",
        headers=cust_auth,
        json={"code": "SAVE10", "subtotal": 5000.0},
    )
    assert res_cv.status_code == 200
    assert res_cv.json()["valid"] is True
    assert res_cv.json()["discount"] == 500.0

    # Add item to cart for quote
    client.post(
        "/api/v1/cart/items",
        headers=cust_auth,
        json={
            "equipment_id": str(eq_id),
            "quantity": 1,
            "start_date": "2026-11-20",
            "end_date": "2026-11-22",  # 3 inclusive days
        },
    )

    # Request checkout quote
    res_quote = client.post(
        "/api/v1/checkout/quote",
        headers=cust_auth,
        json={
            "period": "2026-11-20_2026-11-22",
            "coupon_code": "SAVE10",
        },
    )
    assert res_quote.status_code == 200
    quote = res_quote.json()
    # 2500 * 3 = 7500 subtotal
    assert quote["subtotal"] == 7500.0
    # 10% coupon = 750
    assert quote["discount"] == 750.0
    # taxable = 6750, 18% tax = 1215
    assert quote["tax"] == 1215.0
    # delivery fee = 300
    assert quote["delivery_fee"] == 300.0
    # security deposit = 10000
    assert quote["security_deposit"] == 10000.0
    # total = 7500 - 750 + 1215 + 300 + 10000 = 18265.0
    assert quote["total"] == 18265.0


@pytest.mark.unit
def test_booking_cancellation_unpaid_vs_paid(api_test_setup: dict[str, Any]) -> None:
    client: TestClient = api_test_setup["client"]
    db: Session = api_test_setup["db"]
    cust1: User = api_test_setup["cust1"]
    cust_auth = {"Authorization": "Bearer cust1-token"}

    # Create address
    addr = Address(
        user_id=cust1.user_id,
        line1="123 Studio Way",
        city="Mumbai",
        state="Maharashtra",
        pincode="400050",
        country="India",
        is_default=True,
    )
    db.add(addr)
    db.flush()

    # 1. Unpaid Booking
    b_unpaid = Booking(
        user_id=cust1.user_id,
        address_id=addr.address_id,
        status=BookingStatus.pending,
        payment_status=BookingPaymentStatus.unpaid,
        start_date=date(2026, 12, 1),
        end_date=date(2026, 12, 3),
        subtotal=Decimal("7500.00"),
        tax=Decimal("1350.00"),
        total_amount=Decimal("8850.00"),
        event_name="Ad Shoot",
        event_type="Commercial",
    )
    db.add(b_unpaid)
    db.flush()

    # Cancelling unpaid booking succeeds
    res_cancel_unpaid = client.post(
        f"/api/v1/bookings/{b_unpaid.booking_id}/cancel",
        headers=cust_auth,
        json={"reason": "Schedule changed"},
    )
    assert res_cancel_unpaid.status_code == 200

    # 2. Paid Booking
    b_paid = Booking(
        user_id=cust1.user_id,
        address_id=addr.address_id,
        status=BookingStatus.confirmed,
        payment_status=BookingPaymentStatus.paid,
        start_date=date(2026, 12, 10),
        end_date=date(2026, 12, 12),
        subtotal=Decimal("7500.00"),
        tax=Decimal("1350.00"),
        total_amount=Decimal("8850.00"),
        event_name="Music Video",
        event_type="Music",
    )
    db.add(b_paid)
    db.commit()

    # Cancelling paid booking in Step 5 must return 409 cancellation_requires_refund_flow
    res_cancel_paid = client.post(
        f"/api/v1/bookings/{b_paid.booking_id}/cancel",
        headers=cust_auth,
        json={"reason": "Cancelled"},
    )
    assert res_cancel_paid.status_code == 409
    assert res_cancel_paid.json()["error"]["code"] == "cancellation_requires_refund_flow"


# =============================================================================
# 4. IDOR Protection (Cross-User Access Returns 404)
# =============================================================================
@pytest.mark.unit
def test_idor_cross_user_access_returns_404(api_test_setup: dict[str, Any]) -> None:
    client: TestClient = api_test_setup["client"]
    db: Session = api_test_setup["db"]
    cust1: User = api_test_setup["cust1"]
    cust2_auth = {"Authorization": "Bearer cust2-token"}

    # Seed an address belonging to Customer 1
    addr1 = Address(
        user_id=cust1.user_id,
        line1="Cust1 Private Home",
        city="Mumbai",
        state="Maharashtra",
        pincode="400001",
        country="India",
        is_default=True,
    )
    db.add(addr1)
    db.flush()

    # Seed a booking belonging to Customer 1
    b1 = Booking(
        user_id=cust1.user_id,
        address_id=addr1.address_id,
        status=BookingStatus.pending,
        payment_status=BookingPaymentStatus.unpaid,
        start_date=date(2026, 12, 1),
        end_date=date(2026, 12, 3),
        subtotal=Decimal("5000.00"),
        tax=Decimal("900.00"),
        total_amount=Decimal("5900.00"),
        event_name="Private Event",
    )
    # Seed a cart item belonging to Customer 1
    ci1 = CartItem(
        user_id=cust1.user_id,
        equipment_id=api_test_setup["equipment"].equipment_id,
        quantity=1,
        start_date=date(2026, 12, 1),
        end_date=date(2026, 12, 3),
    )
    db.add_all([b1, ci1])
    db.commit()

    # Customer 2 attempts to delete Customer 1's address -> 404 (not 403)
    res_addr_del = client.delete(f"/api/v1/addresses/{addr1.address_id}", headers=cust2_auth)
    assert res_addr_del.status_code == 404

    # Customer 2 attempts to read Customer 1's booking -> 404 (not 403)
    res_b_get = client.get(f"/api/v1/bookings/{b1.booking_id}", headers=cust2_auth)
    assert res_b_get.status_code == 404

    # Customer 2 attempts to cancel Customer 1's booking -> 404 (not 403)
    res_b_cancel = client.post(
        f"/api/v1/bookings/{b1.booking_id}/cancel",
        headers=cust2_auth,
        json={"reason": "Hacking"},
    )
    assert res_b_cancel.status_code == 404

    # Customer 2 attempts to update Customer 1's cart item -> 404 (not 403)
    res_ci_upd = client.patch(
        f"/api/v1/cart/items/{ci1.cart_item_id}",
        headers=cust2_auth,
        json={"quantity": 5},
    )
    assert res_ci_upd.status_code == 404
