from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest

from app.core.errors import ConflictError, ValidationFailedError
from app.models.accounts import User, UserRole
from app.models.orders import Booking, BookingPaymentStatus, BookingStatus
from app.services.customer import CustomerService


@pytest.mark.unit
def test_address_pincode_validation(db_session) -> None:
    service = CustomerService(db_session)
    user = User(
        firebase_uid="uid-addr-1",
        email="addr1@test.com",
        role=UserRole.customer,
        name="Tester",
    )
    db_session.add(user)
    db_session.commit()

    invalid_pincodes = ["012345", "12345", "1234567", "56000A", "abcdef", " 560001", "560001 "]
    for pin in invalid_pincodes:
        with pytest.raises(ValidationFailedError):
            service.create_address(
                user=user,
                label="Home",
                line1="123 Street",
                city="Bengaluru",
                state="Karnataka",
                pincode=pin,
            )

    # Valid PIN codes
    valid_pins = ["560001", "110001", "400001", "700001", "600001"]
    for i, pin in enumerate(valid_pins):
        addr = service.create_address(
            user=user,
            label="Home",
            line1=f"{i} Street",
            city="Bengaluru",
            state="Karnataka",
            pincode=pin,
        )
        assert addr["pincode"] == pin


@pytest.mark.unit
def test_address_state_validation(db_session) -> None:
    service = CustomerService(db_session)
    user = User(
        firebase_uid="uid-addr-2",
        email="addr2@test.com",
        role=UserRole.customer,
        name="Tester",
    )
    db_session.add(user)
    db_session.commit()

    invalid_states = ["California", "Texas", "London", "InvalidState", "12345"]
    for st in invalid_states:
        with pytest.raises(ValidationFailedError):
            service.create_address(
                user=user,
                label="Office",
                line1="456 Avenue",
                city="Bengaluru",
                state=st,
                pincode="560001",
            )

    # Valid Indian states / UTs
    valid_states = ["Karnataka", "Maharashtra", "Tamil Nadu", "Delhi", "Kerala", "Gujarat"]
    for st in valid_states:
        addr = service.create_address(
            user=user,
            label="Office",
            line1="456 Avenue",
            city="Bengaluru",
            state=st,
            pincode="560001",
        )
        assert addr["state"] == st


@pytest.mark.unit
def test_single_default_address_invariant(db_session) -> None:
    service = CustomerService(db_session)
    user = User(
        firebase_uid="uid-addr-3",
        email="addr3@test.com",
        role=UserRole.customer,
        name="Default Tester",
    )
    db_session.add(user)
    db_session.commit()

    # 1. First address automatically becomes default
    addr1 = service.create_address(
        user=user,
        label="Home",
        line1="Addr 1",
        city="Bengaluru",
        state="Karnataka",
        pincode="560001",
        is_default=False,  # Even if requested False, first must be default
    )
    assert addr1["is_default"] is True

    # 2. Second address is not default unless requested
    addr2 = service.create_address(
        user=user,
        label="Office",
        line1="Addr 2",
        city="Bengaluru",
        state="Karnataka",
        pincode="560002",
        is_default=False,
    )
    assert addr2["is_default"] is False

    # 3. Third address created with is_default=True demotes others
    addr3 = service.create_address(
        user=user,
        label="Venue",
        line1="Addr 3",
        city="Bengaluru",
        state="Karnataka",
        pincode="560003",
        is_default=True,
    )
    addrs = {a["id"]: a["is_default"] for a in service.list_addresses(user)}
    assert addrs[addr3["id"]] is True
    assert addrs[addr1["id"]] is False
    assert addrs[addr2["id"]] is False

    # 4. Set default explicitly
    service.set_default_address(user, int(addr2["id"]))
    addrs = {a["id"]: a["is_default"] for a in service.list_addresses(user)}
    assert addrs[addr2["id"]] is True
    assert addrs[addr1["id"]] is False
    assert addrs[addr3["id"]] is False

    # 5. Deleting current default promotes the most recent remaining address
    service.delete_address(user, int(addr2["id"]))
    addrs = {a["id"]: a["is_default"] for a in service.list_addresses(user)}
    # addr3 was created after addr1, so addr3 should be promoted
    assert addrs[addr3["id"]] is True
    assert addrs[addr1["id"]] is False

    # 6. Deleting the last address is allowed
    service.delete_address(user, int(addr3["id"]))
    service.delete_address(user, int(addr1["id"]))
    remaining = service.list_addresses(user)
    assert len(remaining) == 0


@pytest.mark.unit
def test_address_in_use_cannot_be_deleted(db_session) -> None:
    service = CustomerService(db_session)
    user = User(
        firebase_uid="uid-addr-4",
        email="addr4@test.com",
        role=UserRole.customer,
        name="InUse Tester",
    )
    db_session.add(user)
    db_session.commit()

    addr = service.create_address(
        user=user,
        label="Home",
        line1="Protected St",
        city="Bengaluru",
        state="Karnataka",
        pincode="560001",
    )
    addr_id = int(addr["id"])

    # Attach to a booking
    booking = Booking(
        user_id=user.user_id,
        address_id=addr_id,
        delivery_address_snapshot={"line1": "Protected St"},
        event_name="Birthday",
        event_type="Birthday",
        status=BookingStatus.pending,
        payment_status=BookingPaymentStatus.unpaid,
        start_date=date(2026, 12, 1),
        end_date=date(2026, 12, 3),
        subtotal=Decimal("1000.00"),
        tax=Decimal("180.00"),
        total_amount=Decimal("1180.00"),
    )
    db_session.add(booking)
    db_session.commit()

    # Attempting to delete must fail with 409 address_in_use
    with pytest.raises(ConflictError) as exc_info:
        service.delete_address(user, addr_id)
    assert exc_info.value.code == "address_in_use"
