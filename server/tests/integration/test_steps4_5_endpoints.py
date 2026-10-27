from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_token_verifier
from app.main import create_app
from app.models.accounts import User, UserRole, Vendor, VendorApprovalStatus
from app.models.catalog import Category, Equipment, EquipmentImage, EquipmentStatus
from app.models.orders import (
    Booking,
    BookingPaymentStatus,
    BookingStatus,
    Coupon,
    CouponType,
)
from app.models.platform import PlatformSetting


@pytest.mark.integration
def test_steps4_5_live_database_workflow(integration_db: Session) -> None:
    """
    Live integration test against MySQL (TEST_DATABASE_URL), rolled back at test end.
    Verifies Public catalog, Customer cart, quote, booking cancellation rules,
    and IDOR 404 security enforcement in real database conditions.
    """
    suffix = uuid.uuid4().hex[:6]
    app = create_app()

    # Pre-seed tax rate if not present
    tax_setting = integration_db.query(PlatformSetting).filter(PlatformSetting.setting_key == "tax_rate_percent").first()
    if not tax_setting:
        tax_setting = PlatformSetting(
            setting_key="tax_rate_percent",
            setting_value="18.0",
            description="Platform GST percentage",
        )
        integration_db.add(tax_setting)
        integration_db.flush()

    # 1. Users
    cust1 = User(
        firebase_uid=f"fb_cust1_{suffix}",
        email=f"cust1_{suffix}@rent4fraction.com",
        name=f"Customer One {suffix}",
        role=UserRole.customer,
        is_active=1,
        email_verified=1,
    )
    cust2 = User(
        firebase_uid=f"fb_cust2_{suffix}",
        email=f"cust2_{suffix}@rent4fraction.com",
        name=f"Customer Two {suffix}",
        role=UserRole.customer,
        is_active=1,
        email_verified=1,
    )
    v_user = User(
        firebase_uid=f"fb_ven_{suffix}",
        email=f"vendor_{suffix}@rent4fraction.com",
        name=f"Vendor User {suffix}",
        role=UserRole.vendor,
        is_active=1,
        email_verified=1,
    )
    integration_db.add_all([cust1, cust2, v_user])
    integration_db.flush()

    # 2. Vendor
    v = Vendor(
        user_id=v_user.user_id,
        business_name=f"Live Gear Rentals {suffix}",
        approval_status=VendorApprovalStatus.approved,
        address="Mumbai, Maharashtra",
        delivery_fee=Decimal("250.00"),
    )
    integration_db.add(v)
    integration_db.flush()

    # 3. Category & Equipment
    cat = Category(
        name=f"Lighting {suffix}",
        parent_id=None,
        is_active=1,
    )
    integration_db.add(cat)
    integration_db.flush()

    eq = Equipment(
        vendor_id=v.vendor_id,
        category_id=cat.category_id,
        name=f"Aputure 600d Pro {suffix}",
        description="Daylight LED light fixture",
        status=EquipmentStatus.active,
        price_per_day=Decimal("1500.00"),
        security_deposit=Decimal("6000.00"),
        quantity=2,
        min_rental_days=1,
        delivery_available=1,
        avg_rating=Decimal("5.0"),
        review_count=1,
    )
    integration_db.add(eq)
    integration_db.flush()

    eq_img = EquipmentImage(
        equipment_id=eq.equipment_id,
        url="https://images.rent4fraction.com/aputure600d.jpg",
        sort_order=0,
        is_primary=1,
    )
    integration_db.add(eq_img)

    # 4. Coupon
    coupon = Coupon(
        code=f"LIVE{suffix.upper()}",
        type=CouponType.percent,
        value=Decimal("15.00"),
        min_order_amount=Decimal("1000.00"),
        usage_limit=50,
        used_count=0,
        valid_from=datetime(2025, 1, 1),
        valid_to=datetime(2030, 1, 1),
        is_active=1,
    )
    integration_db.add(coupon)
    integration_db.flush()

    # Token verifier override
    def fake_verifier(token: str, _check_revoked: bool = False) -> dict[str, Any]:
        if "cust2" in token:
            return {"uid": cust2.firebase_uid, "email": cust2.email}
        return {"uid": cust1.firebase_uid, "email": cust1.email}

    app.dependency_overrides[get_db] = lambda: integration_db
    app.dependency_overrides[get_token_verifier] = lambda: fake_verifier
    client = TestClient(app)

    cust1_auth = {"Authorization": "Bearer cust1-token"}
    cust2_auth = {"Authorization": "Bearer cust2-token"}

    # -------------------------------------------------------------------------
    # Public Tests
    # -------------------------------------------------------------------------
    res_cats = client.get("/api/v1/categories")
    assert res_cats.status_code == 200

    res_eq = client.get(f"/api/v1/equipment/{eq.equipment_id}")
    assert res_eq.status_code == 200
    assert res_eq.json()["name"] == eq.name

    res_search = client.get(f"/api/v1/equipment?category={cat.category_id}")
    assert res_search.status_code == 200
    assert res_search.json()["total"] >= 1

    res_faqs = client.get("/api/v1/help/faqs")
    assert res_faqs.status_code == 200
    assert len(res_faqs.json()) > 0

    # -------------------------------------------------------------------------
    # Customer Cart & Quote Tests
    # -------------------------------------------------------------------------
    res_add_cart = client.post(
        "/api/v1/cart/items",
        headers=cust1_auth,
        json={
            "equipment_id": str(eq.equipment_id),
            "quantity": 1,
            "start_date": "2026-12-01",
            "end_date": "2026-12-03",
        },
    )
    assert res_add_cart.status_code == 201

    res_quote = client.post(
        "/api/v1/checkout/quote",
        headers=cust1_auth,
        json={
            "period": "2026-12-01_2026-12-03",
            "coupon_code": coupon.code,
        },
    )
    assert res_quote.status_code == 200
    quote = res_quote.json()
    assert quote["subtotal"] == 4500.0  # 1500 * 3 days
    assert quote["discount"] == 675.0   # 15% of 4500
    assert quote["delivery_fee"] == 250.0

    # -------------------------------------------------------------------------
    # Address Rules
    # -------------------------------------------------------------------------
    res_addr = client.post(
        "/api/v1/addresses",
        headers=cust1_auth,
        json={
            "line1": "701 Light Tower",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400018",
            "country": "India",
            "is_default": True,
        },
    )
    assert res_addr.status_code == 201
    addr_id = res_addr.json()["id"]

    # -------------------------------------------------------------------------
    # Booking Unpaid Cancellation & IDOR 404
    # -------------------------------------------------------------------------
    b_unpaid = Booking(
        user_id=cust1.user_id,
        address_id=int(addr_id),
        delivery_address_snapshot={
            "name": cust1.name or "Customer",
            "phone": cust1.phone or "",
            "line1": "456 Bandra West",
            "line2": "",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400050",
            "country": "India",
        },
        status=BookingStatus.pending,
        payment_status=BookingPaymentStatus.unpaid,
        start_date=date(2026, 12, 1),
        end_date=date(2026, 12, 3),
        subtotal=Decimal("4500.00"),
        tax=Decimal("810.00"),
        total_amount=Decimal("5310.00"),
        event_name="Film Shoot",
    )
    integration_db.add(b_unpaid)
    integration_db.flush()

    # Customer 2 attempts IDOR on Customer 1's booking -> 404 (NOT 403)
    res_idor = client.get(f"/api/v1/bookings/{b_unpaid.booking_id}", headers=cust2_auth)
    assert res_idor.status_code == 404

    # Customer 1 cancels unpaid booking -> 200
    res_cancel = client.post(
        f"/api/v1/bookings/{b_unpaid.booking_id}/cancel",
        headers=cust1_auth,
        json={"reason": "Schedule change"},
    )
    assert res_cancel.status_code == 200
