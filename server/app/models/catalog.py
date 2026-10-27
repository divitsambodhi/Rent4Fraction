from __future__ import annotations

import enum
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    DECIMAL as SQLDecimal,
)
from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy.dialects.mysql import BIGINT, JSON, TINYINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.models.accounts import Vendor
    from app.models.orders import BookingItem
    from app.models.social import Review


class EquipmentStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    out_of_stock = "out_of_stock"
    archived = "archived"


class AvailabilityReason(str, enum.Enum):
    maintenance = "maintenance"
    vendor_blocked = "vendor_blocked"
    booked = "booked"


class AvailabilityStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class Category(Base):
    __tablename__ = "categories"

    category_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_id: Mapped[int | None] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("categories.category_id", ondelete="SET NULL"),
        nullable=True,
    )
    default_commission_rate: Mapped[Decimal | None] = mapped_column(
        SQLDecimal(5, 2), nullable=True
    )
    is_active: Mapped[int] = mapped_column(TINYINT(1), nullable=False, default=1)

    parent: Mapped[Category | None] = relationship("Category", remote_side=[category_id])
    equipment_items: Mapped[list[Equipment]] = relationship("Equipment", back_populates="category")


class Equipment(Base):
    __tablename__ = "equipment"

    equipment_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    vendor_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("vendors.vendor_id", ondelete="RESTRICT"), nullable=False
    )
    category_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("categories.category_id", ondelete="RESTRICT"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price_per_day: Mapped[Decimal] = mapped_column(SQLDecimal(12, 2), nullable=False)
    security_deposit: Mapped[Decimal] = mapped_column(
        SQLDecimal(12, 2), nullable=False, default=Decimal("0.00")
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    min_rental_days: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    commission_rate: Mapped[Decimal | None] = mapped_column(SQLDecimal(5, 2), nullable=True)
    delivery_available: Mapped[int] = mapped_column(TINYINT(1), nullable=False, default=1)
    specifications: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    avg_rating: Mapped[Decimal] = mapped_column(
        SQLDecimal(3, 2), nullable=False, default=Decimal("0.00")
    )
    review_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[EquipmentStatus] = mapped_column(
        SQLEnum(EquipmentStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=EquipmentStatus.active,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    vendor: Mapped[Vendor] = relationship("Vendor", back_populates="equipment_items")
    category: Mapped[Category] = relationship("Category", back_populates="equipment_items")
    images: Mapped[list[EquipmentImage]] = relationship(
        "EquipmentImage", back_populates="equipment"
    )
    availability_records: Mapped[list[Availability]] = relationship(
        "Availability", back_populates="equipment"
    )
    booking_items: Mapped[list[BookingItem]] = relationship(
        "BookingItem", back_populates="equipment"
    )
    reviews: Mapped[list[Review]] = relationship("Review", back_populates="equipment")


class EquipmentImage(Base):
    __tablename__ = "equipment_images"

    image_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    equipment_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("equipment.equipment_id", ondelete="CASCADE"),
        nullable=False,
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_primary: Mapped[int] = mapped_column(TINYINT(1), nullable=False, default=0)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    equipment: Mapped[Equipment] = relationship("Equipment", back_populates="images")


class Availability(Base):
    __tablename__ = "availability"

    availability_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    equipment_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("equipment.equipment_id", ondelete="CASCADE"),
        nullable=False,
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    quantity_blocked: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    reason: Mapped[AvailabilityReason] = mapped_column(
        SQLEnum(AvailabilityReason, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    status: Mapped[AvailabilityStatus] = mapped_column(
        SQLEnum(AvailabilityStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=AvailabilityStatus.active,
    )

    equipment: Mapped[Equipment] = relationship("Equipment", back_populates="availability_records")
