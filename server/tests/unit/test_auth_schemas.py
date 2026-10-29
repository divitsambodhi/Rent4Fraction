from __future__ import annotations

from typing import Any

import pytest
from pydantic import ValidationError

from app.schemas.auth import (
    RegisterRequest,
    UserProfileInput,
    VendorBusinessInput,
    compute_avatar_initials,
)


@pytest.mark.unit
def test_compute_avatar_initials() -> None:
    assert compute_avatar_initials("John Doe") == "JD"
    assert compute_avatar_initials("Alice") == "AL"
    assert compute_avatar_initials("First Middle Last") == "FL"
    assert compute_avatar_initials("  ") == "U"


@pytest.mark.unit
def test_user_profile_name_length_validation() -> None:
    # Too short (< 2 chars)
    with pytest.raises(ValidationError):
        UserProfileInput(name="A")

    # Too long (> 80 chars)
    with pytest.raises(ValidationError):
        UserProfileInput(name="A" * 81)

    # Valid name
    prof = UserProfileInput(name="Divit Sharma")
    assert prof.name == "Divit Sharma"


@pytest.mark.unit
def test_phone_number_validation() -> None:
    # Customer phone is optional
    prof = UserProfileInput(name="Test User", phone=None)
    assert prof.phone is None

    # Invalid: not starting with 6-9
    with pytest.raises(ValidationError):
        UserProfileInput(name="Test User", phone="1234567890")

    # Invalid: not 10 digits
    with pytest.raises(ValidationError):
        UserProfileInput(name="Test User", phone="987654321")

    # Invalid: letters
    with pytest.raises(ValidationError):
        UserProfileInput(name="Test User", phone="98765abcde")

    # Valid 10-digit Indian phone
    valid_prof = UserProfileInput(name="Test User", phone="9876543210")
    assert valid_prof.phone == "9876543210"


@pytest.mark.unit
def test_vendor_business_validation() -> None:
    # Valid vendor business
    biz = VendorBusinessInput(
        business_name="Pro Sounds",
        address="100 Market Road",
        city="Mumbai",
        phone="9820012345",
        gst_number="27abcde1234f1z5",  # lowercase will be uppercased
    )
    assert biz.gst_number == "27ABCDE1234F1Z5"

    # Invalid GSTIN pattern
    with pytest.raises(ValidationError):
        VendorBusinessInput(
            business_name="Pro Sounds",
            address="100 Market Road",
            city="Mumbai",
            phone="9820012345",
            gst_number="INVALID_GST",
        )


@pytest.mark.unit
def test_register_role_escalation_rejected() -> None:
    # Reject body role 'admin'
    admin_role: Any = "admin"
    with pytest.raises(ValidationError):
        RegisterRequest(
            role=admin_role,
            profile=UserProfileInput(name="Hacker"),
        )

    # Reject unexpected role
    super_role: Any = "superuser"
    with pytest.raises(ValidationError):
        RegisterRequest(
            role=super_role,
            profile=UserProfileInput(name="Hacker"),
        )


@pytest.mark.unit
def test_vendor_requires_business_payload() -> None:
    # Vendor role without business payload fails validation
    with pytest.raises(ValidationError) as exc_info:
        RegisterRequest(
            role="vendor",
            profile=UserProfileInput(name="Vendor Person", phone="9876543210"),
            business=None,
        )
    assert "Business details are required" in str(exc_info.value)


@pytest.mark.unit
def test_extra_fields_forbidden_in_auth_and_profile_schemas() -> None:
    # Prove that attempting to inject role, status, is_admin, approved raises ValidationError
    with pytest.raises(ValidationError):
        UserProfileInput(name="Legit User", is_admin=True)  # type: ignore

    with pytest.raises(ValidationError):
        UserProfileInput(name="Legit User", role="admin")  # type: ignore

    with pytest.raises(ValidationError):
        UserProfileInput(name="Legit User", status="approved")  # type: ignore

    with pytest.raises(ValidationError):
        RegisterRequest(
            role="customer",
            profile=UserProfileInput(name="Legit User"),
            is_admin=True,  # type: ignore
        )

