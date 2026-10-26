from __future__ import annotations

import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# GSTIN pattern: 2 state digits + 10 PAN alphanumeric + 1 entity num + 'Z' + 1 checksum
GSTIN_REGEX = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$")
# 10-digit Indian mobile starting with 6-9
PHONE_REGEX = re.compile(r"^[6-9]\d{9}$")


def compute_avatar_initials(name: str) -> str:
    """Computes two-letter uppercase avatar initials from user's full name."""
    parts = name.strip().split()
    if not parts:
        return "U"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return f"{parts[0][0]}{parts[-1][0]}".upper()


class UserProfileInput(BaseModel):
    name: str = Field(..., min_length=2, max_length=80, description="Full name (2-80 characters)")
    phone: str | None = Field(
        None, description="Optional 10-digit Indian phone number starting with 6-9"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2 or len(cleaned) > 80:
            raise ValueError("Name must be between 2 and 80 characters")
        return cleaned

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = v.strip()
        if not cleaned:
            return None
        if not PHONE_REGEX.match(cleaned):
            raise ValueError(
                "Phone number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9"
            )
        return cleaned


class VendorBusinessInput(BaseModel):
    business_name: str = Field(
        ..., min_length=2, max_length=255, description="Registered legal business name"
    )
    address: str = Field(..., min_length=2, description="Street / premises address")
    city: str = Field(..., min_length=2, max_length=100, description="Operating city")
    phone: str = Field(..., description="10-digit business phone number")
    gst_number: str | None = Field(None, description="15-character GSTIN")
    description: str | None = Field(None, max_length=1000, description="Business description")

    @field_validator("business_name")
    @classmethod
    def validate_business_name(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2 or len(cleaned) > 255:
            raise ValueError("Business name must be between 2 and 255 characters")
        return cleaned

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = v.strip()
        if not PHONE_REGEX.match(cleaned):
            raise ValueError(
                "Business phone must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9"
            )
        return cleaned

    @field_validator("gst_number")
    @classmethod
    def validate_gst(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = v.strip().upper()
        if not cleaned:
            return None
        if not GSTIN_REGEX.match(cleaned):
            raise ValueError(
                "GST number must match official 15-character GSTIN pattern (e.g. 27ABCDE1234F1Z5)"
            )
        return cleaned


class RegisterRequest(BaseModel):
    role: Literal["customer", "vendor"] = Field(
        ..., description="Registration role: 'customer' or 'vendor' only"
    )
    profile: UserProfileInput
    business: VendorBusinessInput | None = Field(
        None, description="Required for role 'vendor', ignored for customer"
    )

    @field_validator("business")
    @classmethod
    def validate_business_required_for_vendor(
        cls, v: VendorBusinessInput | None, info: Any
    ) -> VendorBusinessInput | None:
        role = info.data.get("role") if hasattr(info, "data") else None
        if role == "vendor" and v is None:
            raise ValueError("Business details are required when registering as a vendor")
        return v


class VendorProfileResponse(BaseModel):
    vendor_id: int
    business_name: str
    approval_status: str
    commission_rate: float | None = None
    rejection_reason: str | None = None
    suspension_reason: str | None = None


class AuthUserResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_id: int
    firebase_uid: str
    name: str
    email: str
    phone: str | None = None
    role: str
    avatar_initials: str = Field(..., serialization_alias="avatarInitials")
    email_verified: bool
    status: str = "active"
    joined_at: str | None = None
    last_login: str | None = None
    vendor: VendorProfileResponse | None = None
