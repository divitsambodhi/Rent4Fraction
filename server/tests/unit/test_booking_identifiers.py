from __future__ import annotations

import pytest
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser
from app.core.errors import NotFoundError
from app.core.identifiers import (
    resolve_booking_id,
    resolve_damage_report_id,
    resolve_item_id,
    resolve_vendor_order_id,
)
from app.models.accounts import Address, User, UserRole, Vendor, VendorApprovalStatus
from app.models.catalog import Equipment, Category, EquipmentStatus
from app.models.orders import (
    Booking,
    BookingItem,
    BookingItemStatus,
    BookingPaymentStatus,
    BookingStatus,
    VendorOrder,
    VendorOrderStatus,
)
from app.routers.bookings import get_booking_detail
from datetime import date, datetime, timedelta
from decimal import Decimal


def test_resolve_booking_id_formats():
    # Integers
    assert resolve_booking_id(2) == 2
    assert resolve_booking_id(1042) == 1042

    # Strings with plain numbers
    assert resolve_booking_id("2") == 2
    assert resolve_booking_id("0002") == 2
    assert resolve_booking_id(" 2 ") == 2

    # Strings with prefixes
    assert resolve_booking_id("BK-0002") == 2
    assert resolve_booking_id("bk-0002") == 2
    assert resolve_booking_id("BK-2") == 2
    assert resolve_booking_id("BK2") == 2
    assert resolve_booking_id("BK-1038") == 1038
    assert resolve_booking_id("BK-01038") == 1038
    assert resolve_booking_id("bk-1000") == 1000

    # Invalid values raise NotFoundError
    with pytest.raises(NotFoundError):
        resolve_booking_id(0)

    with pytest.raises(NotFoundError):
        resolve_booking_id(-5)

    with pytest.raises(NotFoundError):
        resolve_booking_id("0")

    with pytest.raises(NotFoundError):
        resolve_booking_id("BK-0000")

    with pytest.raises(NotFoundError):
        resolve_booking_id("BK-INVALID")

    with pytest.raises(NotFoundError):
        resolve_booking_id("not-a-booking")

    with pytest.raises(NotFoundError):
        resolve_booking_id("")


def test_resolve_vendor_order_and_item_ids():
    assert resolve_vendor_order_id("VO-0001") == 1
    assert resolve_vendor_order_id("vo-0005") == 5
    assert resolve_vendor_order_id("12") == 12

    assert resolve_item_id("IT-0003") == 3
    assert resolve_item_id("it-0007") == 7
    assert resolve_item_id("14") == 14

    assert resolve_damage_report_id("DR-0004") == 4
    assert resolve_damage_report_id("4") == 4


def test_get_booking_detail_with_prefixed_and_numeric_id(db_session: Session):
    # Setup test user
    user = User(
        email="customer_bk2@example.com",
        firebase_uid="fb_test_customer_bk2",
        name="Test Customer",
        phone="9876543210",
        role=UserRole.customer,
        is_active=1,
        email_verified=1,
    )
    db_session.add(user)
    db_session.flush()

    address = Address(
        user_id=user.user_id,
        line1="123 Test St",
        city="Mumbai",
        state="Maharashtra",
        pincode="400001",
        is_default=1,
    )
    db_session.add(address)
    db_session.flush()

    booking = Booking(
        booking_id=2,
        user_id=user.user_id,
        address_id=address.address_id,
        start_date=date.today() + timedelta(days=5),
        end_date=date.today() + timedelta(days=7),
        event_name="Sangeet Night",
        subtotal=Decimal("5000.00"),
        total_amount=Decimal("5900.00"),
        payment_status=BookingPaymentStatus.unpaid,
        status=BookingStatus.pending,
        delivery_address_snapshot={
            "name": "Test Customer",
            "phone": "9876543210",
            "line1": "123 Test St",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
        },
    )
    db_session.add(booking)
    db_session.commit()

    current_user = CurrentUser(
        user_id=user.user_id,
        firebase_uid="fb_test_2",
        role="customer",
        name="Test Customer",
        email=user.email,
        phone=user.phone,
        email_verified=True,
        is_active=True,
    )

    # 1. Fetch with standard formatted ID 'BK-0002'
    detail_bk = get_booking_detail(
        booking_id="BK-0002",
        current_user=current_user,
        db=db_session,
    )
    assert detail_bk["booking_id"] == "BK-0002"
    assert detail_bk["event_name"] == "Sangeet Night"

    # 2. Fetch with lower case 'bk-0002'
    detail_lower = get_booking_detail(
        booking_id="bk-0002",
        current_user=current_user,
        db=db_session,
    )
    assert detail_lower["booking_id"] == "BK-0002"

    # 3. Fetch with plain numeric string '2'
    detail_num_str = get_booking_detail(
        booking_id="2",
        current_user=current_user,
        db=db_session,
    )
    assert detail_num_str["booking_id"] == "BK-0002"

    # 4. Fetch with 'BK-2'
    detail_short = get_booking_detail(
        booking_id="BK-2",
        current_user=current_user,
        db=db_session,
    )
    assert detail_short["booking_id"] == "BK-0002"

    # 5. Non-existent booking raises NotFoundError (HTTP 404, not 422)
    with pytest.raises(NotFoundError) as exc_info:
        get_booking_detail(
            booking_id="BK-9999",
            current_user=current_user,
            db=db_session,
        )
    assert exc_info.value.status_code == 404

    # 6. Malformed/invalid booking ID raises NotFoundError (HTTP 404, not 422)
    with pytest.raises(NotFoundError) as exc_info2:
        get_booking_detail(
            booking_id="BK-INVALID",
            current_user=current_user,
            db=db_session,
        )
    assert exc_info2.value.status_code == 404


def test_admin_can_view_any_booking(db_session: Session):
    # User 1 creates booking
    user1 = User(
        email="customer1_test@example.com",
        firebase_uid="fb_customer1_test",
        name="Customer One",
        phone="9876543211",
        role=UserRole.customer,
        is_active=1,
        email_verified=1,
    )
    db_session.add(user1)
    db_session.flush()

    address = Address(
        user_id=user1.user_id,
        line1="456 Test Ave",
        city="Mumbai",
        state="Maharashtra",
        pincode="400002",
        is_default=1,
    )
    db_session.add(address)
    db_session.flush()

    booking = Booking(
        booking_id=10,
        user_id=user1.user_id,
        address_id=address.address_id,
        start_date=date.today() + timedelta(days=3),
        end_date=date.today() + timedelta(days=5),
        event_name="Corporate Summit",
        subtotal=Decimal("12000.00"),
        total_amount=Decimal("14160.00"),
        payment_status=BookingPaymentStatus.unpaid,
        status=BookingStatus.pending,
        delivery_address_snapshot={
            "name": "Customer One",
            "phone": "9876543211",
            "line1": "456 Test Ave",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400002",
        },
    )
    db_session.add(booking)

    # Admin user
    admin_user = User(
        email="admin_reviewer@example.com",
        firebase_uid="fb_admin_test_reviewer",
        name="Admin Reviewer",
        phone="9876543299",
        role=UserRole.admin,
        is_active=1,
        email_verified=1,
    )
    db_session.add(admin_user)
    db_session.commit()

    admin_current_user = CurrentUser(
        user_id=admin_user.user_id,
        firebase_uid="fb_admin_test",
        role="admin",
        name="Admin Reviewer",
        email=admin_user.email,
        phone=admin_user.phone,
        email_verified=True,
        is_active=True,
    )

    # Admin should be able to view booking 10 created by user 1
    detail = get_booking_detail(
        booking_id="BK-0010",
        current_user=admin_current_user,
        db=db_session,
    )
    assert detail["booking_id"] == "BK-0010"
    assert detail["event_name"] == "Corporate Summit"
