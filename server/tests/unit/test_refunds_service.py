from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

import pytest
from sqlalchemy.orm import Session

from app.core.errors import RefundExceedsCapturedError
from app.integrations.razorpay import FakePaymentGateway
from app.models.accounts import Address, User, UserRole, Vendor, VendorApprovalStatus
from app.models.catalog import Category, Equipment, EquipmentStatus
from app.models.orders import (
    Booking,
    BookingPaymentStatus,
    BookingStatus,
    VendorOrder,
    VendorOrderStatus,
)
from app.models.payments import Payment, PaymentStatus, PaymentType
from app.services.refunds import (
    compute_cancellation_refund,
    refund_payment,
)


@pytest.fixture
def refunds_db_setup(db_session: Session) -> dict[str, Booking]:
    cust = User(
        firebase_uid="fb_refund_cust",
        email="refund_cust@example.com",
        name="Refund Customer",
        role=UserRole.customer,
        is_active=1,
    )
    db_session.add(cust)
    db_session.flush()

    addr = Address(
        user_id=cust.user_id,
        line1="123 Ocean View",
        city="Mumbai",
        state="Maharashtra",
        pincode="400001",
        country="India",
        is_default=True,
    )
    db_session.add(addr)
    db_session.flush()

    v_user = User(
        firebase_uid="fb_refund_vendor",
        email="refund_vendor@example.com",
        name="Refund Vendor User",
        role=UserRole.vendor,
        is_active=1,
    )
    db_session.add(v_user)
    db_session.flush()

    v = Vendor(
        user_id=v_user.user_id,
        business_name="Refund Cine Equipment",
        approval_status=VendorApprovalStatus.approved,
        delivery_fee=Decimal("200.00"),
    )
    db_session.add(v)
    db_session.flush()

    cat = Category(name="Lenses", is_active=1)
    db_session.add(cat)
    db_session.flush()

    eq = Equipment(
        vendor_id=v.vendor_id,
        category_id=cat.category_id,
        name="50mm Prime Lens",
        status=EquipmentStatus.active,
        price_per_day=Decimal("1000.00"),
        security_deposit=Decimal("5000.00"),
        quantity=2,
        min_rental_days=1,
        delivery_available=1,
    )
    db_session.add(eq)
    db_session.flush()

    booking = Booking(
        user_id=cust.user_id,
        address_id=addr.address_id,
        status=BookingStatus.confirmed,
        payment_status=BookingPaymentStatus.paid,
        start_date=date(2026, 12, 10),
        end_date=date(2026, 12, 12),
        subtotal=Decimal("3000.00"),
        tax=Decimal("540.00"),
        delivery_fee=Decimal("200.00"),
        security_deposit=Decimal("5000.00"),
        discount=Decimal("0.00"),
        total_amount=Decimal("8740.00"),
        event_name="Feature Film",
        event_type="Movie",
    )
    db_session.add(booking)
    db_session.flush()

    vo = VendorOrder(
        booking_id=booking.booking_id,
        vendor_id=v.vendor_id,
        status=VendorOrderStatus.pending,
        subtotal=Decimal("3000.00"),
        fulfilment_type="delivery",
        delivery_fee=Decimal("200.00"),
    )
    db_session.add(vo)
    db_session.flush()

    charge = Payment(
        booking_id=booking.booking_id,
        vendor_order_id=None,
        amount=Decimal("8740.00"),
        currency="INR",
        type=PaymentType.full,
        status=PaymentStatus.success,
        transaction_id="pay_fake_capture_123",
        gateway_order_id="order_fake_123",
    )
    db_session.add(charge)
    db_session.commit()

    return {"booking": booking, "vendor_order": vo}


@pytest.mark.unit
def test_compute_cancellation_refund_schedule(refunds_db_setup: dict[str, Any]) -> None:
    booking: Booking = refunds_db_setup["booking"]
    # Rental starts on 2026-12-10

    # 1. 10 days before (>= 7 days): 100% refund (8740.00)
    rfnd_early = compute_cancellation_refund(booking, cancel_date=date(2026, 11, 30))
    assert rfnd_early == Decimal("8740.00")

    # 2. 4 days before (>= 3 days): 75% rental (3540 * 0.75 = 2655) + 200 delivery + 5000 deposit = 7855.00
    rfnd_med = compute_cancellation_refund(booking, cancel_date=date(2026, 12, 6))
    assert rfnd_med == Decimal("7855.00")

    # 3. 1 day before (>= 1 day): 50% rental (3540 * 0.5 = 1770) + 200 delivery + 5000 deposit = 6970.00
    rfnd_late = compute_cancellation_refund(booking, cancel_date=date(2026, 12, 9))
    assert rfnd_late == Decimal("6970.00")

    # 4. Same day or past start date (< 1 day): 0% rental/delivery + 100% deposit = 5000.00
    rfnd_sameday = compute_cancellation_refund(booking, cancel_date=date(2026, 12, 10))
    assert rfnd_sameday == Decimal("5000.00")


@pytest.mark.unit
def test_refund_payment_and_cap_enforcement(
    db_session: Session, refunds_db_setup: dict[str, Any]
) -> None:
    from app.core.config import get_settings
    orig = get_settings().PAYMENTS_ONLINE_ENABLED
    get_settings().PAYMENTS_ONLINE_ENABLED = True
    try:
        booking: Booking = refunds_db_setup["booking"]
        fake_gateway = FakePaymentGateway()

        # Successful partial refund 1
        p1 = refund_payment(
            db=db_session,
            booking_id=booking.booking_id,
            amount=Decimal("5000.00"),
            reason="Deposit return",
            gateway=fake_gateway,
        )
        assert p1.status == PaymentStatus.success
        assert p1.type == PaymentType.refund
        assert p1.amount == Decimal("5000.00")

        # Remaining refundable = 8740 - 5000 = 3740
        # Attempting to refund 4000 must fail with RefundExceedsCapturedError
        with pytest.raises(RefundExceedsCapturedError):
            refund_payment(
                db=db_session,
                booking_id=booking.booking_id,
                amount=Decimal("4000.00"),
                reason="Exceeding cap",
                gateway=fake_gateway,
            )
    finally:
        get_settings().PAYMENTS_ONLINE_ENABLED = orig

    # Valid second refund for remaining balance
    p2 = refund_payment(
        db=db_session,
        booking_id=booking.booking_id,
        amount=Decimal("3740.00"),
        reason="Remaining rental balance",
        gateway=fake_gateway,
    )
    assert p2.amount == Decimal("3740.00")
