from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest

from app.models.accounts import User, UserRole
from app.models.orders import Coupon, CouponType
from app.services.booking import BookingService
from app.services.pricing import CouponInput, coupon_discount


@pytest.mark.unit
def test_coupon_discount_calculation() -> None:
    # Flat coupon
    c_flat = CouponInput(code="FLAT250", type="flat", value=Decimal("250.00"), is_active=True)
    disc, err = coupon_discount(c_flat, Decimal("1000.00"))
    assert err is None
    assert disc == Decimal("250.00")

    # Flat discount capped at subtotal
    disc_capped, err = coupon_discount(c_flat, Decimal("150.00"))
    assert err is None
    assert disc_capped == Decimal("150.00")

    # Percentage coupon with ROUND_HALF_UP
    c_pct = CouponInput(code="PCT15", type="percent", value=Decimal("15.00"), is_active=True)
    disc_pct, err = coupon_discount(c_pct, Decimal("999.00"))
    # 999 * 0.15 = 149.85
    assert err is None
    assert disc_pct == Decimal("149.85")

    # Awkward percentage rounding test
    c_pct10 = CouponInput(code="PCT10", type="percent", value=Decimal("10.00"), is_active=True)
    disc_pct2, err = coupon_discount(c_pct10, Decimal("333.33"))
    # 33.333 -> 33.33
    assert err is None
    assert disc_pct2 == Decimal("33.33")


@pytest.mark.unit
def test_coupon_validation_rules(db_session) -> None:
    service = BookingService(db_session)
    now = datetime.now(UTC)

    user = User(
        firebase_uid="uid-coupon-tester",
        email="coupon@test.com",
        role=UserRole.customer,
        name="Coupon Tester",
    )
    db_session.add(user)
    db_session.commit()

    # 1. Inactive coupon
    c_inactive = Coupon(
        code="INACTIVE10",
        type=CouponType.percent,
        value=Decimal("10.00"),
        valid_from=now - timedelta(days=5),
        valid_to=now + timedelta(days=5),
        is_active=0,
        used_count=0,
    )
    db_session.add(c_inactive)
    db_session.commit()

    res_inactive = service.validate_coupon(user, "INACTIVE10", 500.0)
    assert res_inactive["valid"] is False
    assert "isn't valid" in res_inactive["message"]

    # 2. Expired coupon
    c_expired = Coupon(
        code="EXPIRED20",
        type=CouponType.flat,
        value=Decimal("100.00"),
        is_active=1,
        valid_from=now - timedelta(days=10),
        valid_to=now - timedelta(days=1),
        used_count=0,
    )
    db_session.add(c_expired)
    db_session.commit()

    res_expired = service.validate_coupon(user, "EXPIRED20", 500.0)
    assert res_expired["valid"] is False
    assert "expired" in res_expired["message"]

    # 3. Minimum order not met
    c_min = Coupon(
        code="MINORDER",
        type=CouponType.flat,
        value=Decimal("100.00"),
        min_order_amount=Decimal("1000.00"),
        is_active=1,
        valid_from=now - timedelta(days=1),
        valid_to=now + timedelta(days=10),
        used_count=0,
    )
    db_session.add(c_min)
    db_session.commit()

    res_min = service.validate_coupon(user, "MINORDER", 500.0)
    assert res_min["valid"] is False
    assert "more to use this code" in res_min["message"]

    # 4. Usage limit reached
    c_max = Coupon(
        code="MAXEDOUT",
        type=CouponType.flat,
        value=Decimal("100.00"),
        is_active=1,
        valid_from=now - timedelta(days=1),
        valid_to=now + timedelta(days=10),
        usage_limit=5,
        used_count=5,
    )
    db_session.add(c_max)
    db_session.commit()

    res_max = service.validate_coupon(user, "MAXEDOUT", 500.0)
    assert res_max["valid"] is False
    assert "usage limit" in res_max["message"]

    # 5. Valid coupon succeeds
    c_valid = Coupon(
        code="WELCOME100",
        type=CouponType.flat,
        value=Decimal("100.00"),
        min_order_amount=Decimal("500.00"),
        is_active=1,
        valid_from=now - timedelta(days=1),
        valid_to=now + timedelta(days=30),
        usage_limit=10,
        used_count=2,
    )
    db_session.add(c_valid)
    db_session.commit()

    res_valid = service.validate_coupon(user, "WELCOME100", 800.0)
    assert res_valid["valid"] is True
    assert res_valid["discount"] == 100.0
