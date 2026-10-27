from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest

from app.core.errors import ConflictError, ValidationFailedError
from app.models.accounts import Address, User, UserRole, Vendor, VendorApprovalStatus
from app.models.catalog import Category, Equipment, EquipmentStatus
from app.models.fulfilment import (
    DamageReport,
    DamageReportStatus,
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
from app.services.booking import BookingService
from app.services.social import SocialService


@pytest.mark.unit
def test_unpaid_cancellation_vs_paid_cancellation(db_session) -> None:
    service = BookingService(db_session)
    user = User(
        firebase_uid="uid-cancel-cust",
        email="cancel@test.com",
        role=UserRole.customer,
        name="Cancel Tester",
    )
    db_session.add(user)
    db_session.flush()

    addr = Address(
        user_id=user.user_id,
        line1="123 Street",
        city="Bengaluru",
        state="Karnataka",
        pincode="560001",
        country="India",
        is_default=True,
    )
    db_session.add(addr)
    db_session.flush()

    # 1. Unpaid booking
    unpaid_booking = Booking(
        user_id=user.user_id,
        address_id=addr.address_id,
        status=BookingStatus.pending,
        payment_status=BookingPaymentStatus.unpaid,
        start_date=date(2026, 11, 20),
        end_date=date(2026, 11, 22),
        subtotal=Decimal("1500.00"),
        tax=Decimal("270.00"),
        total_amount=Decimal("1770.00"),
        event_name="Unpaid Event",
        event_type="Birthday",
    )
    db_session.add(unpaid_booking)
    db_session.flush()

    # Cancellation succeeds for unpaid booking
    res = service.cancel_unpaid_booking(user, unpaid_booking.booking_id, reason="Changed my mind")
    assert res["status"] == "success"
    db_session.refresh(unpaid_booking)
    assert unpaid_booking.status == BookingStatus.cancelled
    assert unpaid_booking.cancelled_reason == "Changed my mind"

    # 2. Paid booking
    paid_booking = Booking(
        user_id=user.user_id,
        address_id=addr.address_id,
        status=BookingStatus.confirmed,
        payment_status=BookingPaymentStatus.paid,
        start_date=date(2026, 11, 25),
        end_date=date(2026, 11, 28),
        subtotal=Decimal("2000.00"),
        tax=Decimal("360.00"),
        total_amount=Decimal("2360.00"),
        event_name="Paid Event",
        event_type="Wedding",
    )
    db_session.add(paid_booking)
    db_session.commit()

    # Cancellation must fail with 409 cancellation_requires_refund_flow
    with pytest.raises(ConflictError) as exc_info:
        service.cancel_unpaid_booking(user, paid_booking.booking_id, reason="Cancel paid")
    assert exc_info.value.code == "cancellation_requires_refund_flow"


@pytest.mark.unit
def test_damage_report_dispute_validation(db_session) -> None:
    service = BookingService(db_session)
    cust = User(firebase_uid="uid-dmg-cust", email="dmg@test.com", role=UserRole.customer, name="Damage Cust")
    vendor_u = User(firebase_uid="uid-dmg-ven", email="ven@test.com", role=UserRole.vendor, name="Damage Ven")
    db_session.add_all([cust, vendor_u])
    db_session.flush()

    addr = Address(
        user_id=cust.user_id,
        line1="123 Street",
        city="Goa",
        state="Goa",
        pincode="403001",
        country="India",
        is_default=True,
    )
    db_session.add(addr)
    db_session.flush()

    v = Vendor(user_id=vendor_u.user_id, business_name="V", approval_status=VendorApprovalStatus.approved, address="Goa")
    db_session.add(v)
    db_session.flush()

    cat = Category(name="Gear")
    db_session.add(cat)
    db_session.flush()

    eq = Equipment(
        vendor_id=v.vendor_id,
        category_id=cat.category_id,
        name="Lens",
        description="Camera Lens",
        status=EquipmentStatus.active,
        price_per_day=Decimal("1000.00"),
        security_deposit=Decimal("5000.00"),
        quantity=1,
    )
    db_session.add(eq)
    db_session.flush()

    b = Booking(
        user_id=cust.user_id,
        address_id=addr.address_id,
        status=BookingStatus.completed,
        payment_status=BookingPaymentStatus.paid,
        start_date=date(2026, 10, 1),
        end_date=date(2026, 10, 3),
        subtotal=Decimal("3000.00"),
        tax=Decimal("540.00"),
        total_amount=Decimal("3540.00"),
        event_name="Shoot",
        event_type="Concert",
    )
    db_session.add(b)
    db_session.flush()

    vo = VendorOrder(booking_id=b.booking_id, vendor_id=v.vendor_id, status=VendorOrderStatus.completed, subtotal=Decimal("3000.00"))
    db_session.add(vo)
    db_session.flush()

    bi = BookingItem(
        vendor_order_id=vo.vendor_order_id,
        booking_id=b.booking_id,
        vendor_id=v.vendor_id,
        equipment_id=eq.equipment_id,
        quantity=1,
        price_per_day=Decimal("1000.00"),
        days=3,
        total_price=Decimal("3000.00"),
        item_status=BookingItemStatus.returned,
        deposit_amount=Decimal("5000.00"),
    )
    db_session.add(bi)
    db_session.flush()

    ret = Return(vendor_order_id=vo.vendor_order_id, status=ReturnStatus.returned)
    db_session.add(ret)
    db_session.flush()

    ret_item = ReturnItem(
        return_id=ret.return_id,
        booking_item_id=bi.booking_item_id,
        quantity_returned=1,
        item_condition=ItemCondition.minor_damage,
    )
    db_session.add(ret_item)
    db_session.flush()

    dr = DamageReport(
        return_item_id=ret_item.return_item_id,
        status=DamageReportStatus.reported,
        description="Scratched glass element",
        damage_cost=Decimal("2500.00"),
    )
    db_session.add(dr)
    db_session.commit()

    # 1. Dispute with less than 20 characters must fail validation
    with pytest.raises(ValidationFailedError):
        service.respond_to_damage_report(
            user=cust,
            booking_id=b.booking_id,
            item_id=bi.booking_item_id,
            action="dispute",
            dispute_reason="Too short",  # 9 chars < 20 chars
        )

    # 2. Dispute with at least 20 characters succeeds
    res_dispute = service.respond_to_damage_report(
        user=cust,
        booking_id=b.booking_id,
        item_id=bi.booking_item_id,
        action="dispute",
        dispute_reason="The scratch was already present before rental delivery.",  # 55 chars
    )
    assert res_dispute["status"] == "disputed"
    db_session.refresh(dr)
    assert dr.status == DamageReportStatus.disputed
    assert dr.dispute_reason is not None

    # Reset to reported for accept test
    dr.status = DamageReportStatus.reported
    db_session.commit()

    # 3. Accept sets status to resolved
    res_accept = service.respond_to_damage_report(
        user=cust,
        booking_id=b.booking_id,
        item_id=bi.booking_item_id,
        action="accept",
    )
    assert res_accept["status"] == "resolved"
    db_session.refresh(dr)
    assert dr.status == DamageReportStatus.resolved


@pytest.mark.unit
def test_review_validation_rules(db_session) -> None:
    service = SocialService(db_session)
    cust = User(firebase_uid="uid-rev-cust", email="rev@test.com", role=UserRole.customer, name="Reviewer Cust")
    db_session.add(cust)
    db_session.commit()

    # Rating < 1
    with pytest.raises(ValidationFailedError):
        service.create_review(user=cust, rating=0, comment="Bad")

    # Rating > 5
    with pytest.raises(ValidationFailedError):
        service.create_review(user=cust, rating=6, comment="Super")

    # Comment > 500 characters
    long_comment = "A" * 501
    with pytest.raises(ValidationFailedError):
        service.create_review(user=cust, rating=5, comment=long_comment)
