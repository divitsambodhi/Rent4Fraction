from __future__ import annotations

import enum
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

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
from sqlalchemy.dialects.mysql import BIGINT, TINYINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.models.accounts import User
    from app.models.orders import BookingItem, VendorOrder


class DeliveryType(str, enum.Enum):
    delivery = "delivery"
    pickup = "pickup"


class DeliveryStatus(str, enum.Enum):
    scheduled = "scheduled"
    out_for_delivery = "out_for_delivery"
    delivered = "delivered"
    failed = "failed"


class ReturnStatus(str, enum.Enum):
    scheduled = "scheduled"
    returned = "returned"
    late = "late"
    incomplete = "incomplete"


class ItemCondition(str, enum.Enum):
    good = "good"
    minor_damage = "minor_damage"
    major_damage = "major_damage"
    lost = "lost"


class DamageReportStatus(str, enum.Enum):
    reported = "reported"
    disputed = "disputed"
    resolved = "resolved"


class Delivery(Base):
    __tablename__ = "deliveries"

    delivery_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    vendor_order_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("vendor_orders.vendor_order_id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
    )
    type: Mapped[DeliveryType] = mapped_column(
        SQLEnum(DeliveryType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=DeliveryType.delivery,
    )
    scheduled_start: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    scheduled_end: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    delivery_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[DeliveryStatus] = mapped_column(
        SQLEnum(DeliveryStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=DeliveryStatus.scheduled,
    )
    tracking_info: Mapped[str | None] = mapped_column(Text, nullable=True)
    delivered_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    proof_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    proof_public_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    proof_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    vendor_order: Mapped[VendorOrder] = relationship("VendorOrder", back_populates="deliveries")


class Return(Base):
    __tablename__ = "returns"

    return_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    vendor_order_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("vendor_orders.vendor_order_id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
    )
    return_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    scheduled_start: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    scheduled_end: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[ReturnStatus] = mapped_column(
        SQLEnum(ReturnStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=ReturnStatus.scheduled,
    )
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    vendor_order: Mapped[VendorOrder] = relationship("VendorOrder", back_populates="returns")
    items: Mapped[list[ReturnItem]] = relationship("ReturnItem", back_populates="return_record")


class ReturnItem(Base):
    __tablename__ = "return_items"

    return_item_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    return_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("returns.return_id", ondelete="CASCADE"), nullable=False
    )
    booking_item_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("booking_items.booking_item_id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity_returned: Mapped[int] = mapped_column(Integer, nullable=False)
    item_condition: Mapped[ItemCondition] = mapped_column(
        SQLEnum(ItemCondition, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=ItemCondition.good,
    )

    return_record: Mapped[Return] = relationship("Return", back_populates="items")
    booking_item: Mapped[BookingItem] = relationship("BookingItem")
    damage_report: Mapped[DamageReport | None] = relationship(
        "DamageReport", back_populates="return_item", uselist=False
    )


class DamageReport(Base):
    __tablename__ = "damage_reports"

    report_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    return_item_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("return_items.return_item_id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    damage_cost: Mapped[Decimal] = mapped_column(
        SQLDecimal(12, 2), nullable=False, default=Decimal("0.00")
    )
    deducted_from_deposit: Mapped[int] = mapped_column(TINYINT(1), nullable=False, default=0)
    status: Mapped[DamageReportStatus] = mapped_column(
        SQLEnum(DamageReportStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=DamageReportStatus.reported,
    )
    images_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_public_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    evidence_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dispute_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    disputed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    final_cost: Mapped[Decimal | None] = mapped_column(SQLDecimal(12, 2), nullable=True)
    resolved_by: Mapped[int | None] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    return_item: Mapped[ReturnItem] = relationship("ReturnItem", back_populates="damage_report")
    resolver: Mapped[User | None] = relationship("User")
