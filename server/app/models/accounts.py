from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    DECIMAL as SQLDecimal,
)
from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy.dialects.mysql import BIGINT, TINYINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.models.catalog import Equipment
    from app.models.orders import Booking


class UserRole(str, enum.Enum):
    customer = "customer"
    vendor = "vendor"
    admin = "admin"


class VendorApprovalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    suspended = "suspended"


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=UserRole.customer,
    )
    is_active: Mapped[int] = mapped_column(TINYINT(1), nullable=False, default=1)
    email_verified: Mapped[int] = mapped_column(TINYINT(1), nullable=False, default=0)
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    vendor_profile: Mapped[Vendor | None] = relationship(
        "Vendor", back_populates="user", uselist=False, foreign_keys="Vendor.user_id"
    )
    addresses: Mapped[list[Address]] = relationship("Address", back_populates="user")


class Vendor(Base):
    __tablename__ = "vendors"

    vendor_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    user_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("users.user_id"), unique=True, nullable=False
    )
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    gst_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    approval_status: Mapped[VendorApprovalStatus] = mapped_column(
        SQLEnum(VendorApprovalStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=VendorApprovalStatus.pending,
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_by: Mapped[int | None] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("users.user_id"), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    commission_rate: Mapped[Decimal | None] = mapped_column(
        SQLDecimal(5, 2), nullable=True, default=Decimal("10.00")
    )
    delivery_fee: Mapped[Decimal] = mapped_column(
        SQLDecimal(12, 2), nullable=False, default=Decimal("0.00")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped[User] = relationship(
        "User", foreign_keys=[user_id], back_populates="vendor_profile"
    )
    equipment_items: Mapped[list[Equipment]] = relationship("Equipment", back_populates="vendor")


class Address(Base):
    __tablename__ = "addresses"

    address_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    user_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    line1: Mapped[str] = mapped_column(String(255), nullable=False)
    line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    pincode: Mapped[str] = mapped_column(String(20), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False, default="India")
    is_default: Mapped[int] = mapped_column(TINYINT(1), nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship("User", back_populates="addresses")
    bookings: Mapped[list[Booking]] = relationship("Booking", back_populates="address")
