from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.mysql import BIGINT, TINYINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.models.accounts import User, Vendor
    from app.models.catalog import Equipment
    from app.models.orders import BookingItem


class Review(Base):
    __tablename__ = "reviews"

    review_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    user_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False
    )
    booking_item_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("booking_items.booking_item_id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
    )
    equipment_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("equipment.equipment_id", ondelete="RESTRICT"),
        nullable=False,
    )
    vendor_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("vendors.vendor_id", ondelete="RESTRICT"), nullable=False
    )
    rating: Mapped[int] = mapped_column(TINYINT, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    vendor_reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_date: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    booking_item: Mapped[BookingItem] = relationship("BookingItem", back_populates="reviews")
    user: Mapped[User] = relationship("User")
    equipment: Mapped[Equipment] = relationship("Equipment", back_populates="reviews")
    vendor: Mapped[Vendor] = relationship("Vendor")


class Notification(Base):
    __tablename__ = "notifications"

    notification_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    user_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[int] = mapped_column(TINYINT(1), nullable=False, default=0)
    entity_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    entity_id: Mapped[int | None] = mapped_column(BIGINT(unsigned=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship("User")


class Message(Base):
    __tablename__ = "messages"

    message_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    sender_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False
    )
    receiver_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False
    )
    equipment_id: Mapped[int | None] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("equipment.equipment_id", ondelete="SET NULL"),
        nullable=True,
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[int] = mapped_column(TINYINT(1), nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    sender: Mapped[User] = relationship("User", foreign_keys=[sender_id])
    receiver: Mapped[User] = relationship("User", foreign_keys=[receiver_id])
    equipment: Mapped[Equipment | None] = relationship("Equipment")
