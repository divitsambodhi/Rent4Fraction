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
    from app.models.accounts import Address, User, Vendor
    from app.models.catalog import Equipment
    from app.models.fulfilment import Delivery, Return
    from app.models.payments import Payment, Payout
    from app.models.social import Review


class CouponType(str, enum.Enum):
    percent = "percent"
    flat = "flat"


class BookingPaymentStatus(str, enum.Enum):
    unpaid = "unpaid"
    partial = "partial"
    paid = "paid"
    refunded = "refunded"


class BookingStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class VendorOrderStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    dispatched = "dispatched"
    delivered = "delivered"
    returned = "returned"
    completed = "completed"
    cancelled = "cancelled"


class BookingItemStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    delivered = "delivered"
    returned = "returned"
    cancelled = "cancelled"


class Coupon(Base):
    __tablename__ = "coupons"

    coupon_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    type: Mapped[CouponType] = mapped_column(
        SQLEnum(CouponType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    value: Mapped[Decimal] = mapped_column(SQLDecimal(12, 2), nullable=False)
    min_order_amount: Mapped[Decimal] = mapped_column(
        SQLDecimal(12, 2), nullable=False, default=Decimal("0.00")
    )
    valid_from: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    valid_to: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    usage_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    used_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[int] = mapped_column(TINYINT(1), nullable=False, default=1)

    bookings: Mapped[list[Booking]] = relationship("Booking", back_populates="coupon")


class Booking(Base):
    __tablename__ = "bookings"

    booking_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    user_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False
    )
    address_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("addresses.address_id", ondelete="RESTRICT"),
        nullable=False,
    )
    booking_date: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    event_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    event_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    event_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    venue_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    subtotal: Mapped[Decimal] = mapped_column(SQLDecimal(12, 2), nullable=False)
    discount: Mapped[Decimal] = mapped_column(
        SQLDecimal(12, 2), nullable=False, default=Decimal("0.00")
    )
    coupon_id: Mapped[int | None] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("coupons.coupon_id", ondelete="SET NULL"), nullable=True
    )
    tax: Mapped[Decimal] = mapped_column(SQLDecimal(12, 2), nullable=False, default=Decimal("0.00"))
    delivery_fee: Mapped[Decimal] = mapped_column(
        SQLDecimal(12, 2), nullable=False, default=Decimal("0.00")
    )
    security_deposit: Mapped[Decimal] = mapped_column(
        SQLDecimal(12, 2), nullable=False, default=Decimal("0.00")
    )
    total_amount: Mapped[Decimal] = mapped_column(SQLDecimal(12, 2), nullable=False)
    payment_status: Mapped[BookingPaymentStatus] = mapped_column(
        SQLEnum(BookingPaymentStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=BookingPaymentStatus.unpaid,
    )
    status: Mapped[BookingStatus] = mapped_column(
        SQLEnum(BookingStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=BookingStatus.pending,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped[User] = relationship("User")
    address: Mapped[Address] = relationship("Address", back_populates="bookings")
    coupon: Mapped[Coupon | None] = relationship("Coupon", back_populates="bookings")
    vendor_orders: Mapped[list[VendorOrder]] = relationship("VendorOrder", back_populates="booking")
    payments: Mapped[list[Payment]] = relationship("Payment", back_populates="booking")


class VendorOrder(Base):
    __tablename__ = "vendor_orders"

    vendor_order_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    booking_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("bookings.booking_id", ondelete="RESTRICT"),
        nullable=False,
    )
    vendor_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("vendors.vendor_id", ondelete="RESTRICT"), nullable=False
    )
    subtotal: Mapped[Decimal] = mapped_column(SQLDecimal(12, 2), nullable=False)
    status: Mapped[VendorOrderStatus] = mapped_column(
        SQLEnum(VendorOrderStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=VendorOrderStatus.pending,
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    booking: Mapped[Booking] = relationship("Booking", back_populates="vendor_orders")
    vendor: Mapped[Vendor] = relationship("Vendor")
    items: Mapped[list[BookingItem]] = relationship("BookingItem", back_populates="vendor_order")
    deliveries: Mapped[Delivery | None] = relationship(
        "Delivery", back_populates="vendor_order", uselist=False
    )
    returns: Mapped[Return | None] = relationship(
        "Return", back_populates="vendor_order", uselist=False
    )
    payout: Mapped[Payout | None] = relationship(
        "Payout", back_populates="vendor_order", uselist=False
    )


class BookingItem(Base):
    __tablename__ = "booking_items"

    booking_item_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    vendor_order_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("vendor_orders.vendor_order_id", ondelete="RESTRICT"),
        nullable=False,
    )
    booking_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("bookings.booking_id", ondelete="RESTRICT"),
        nullable=False,
    )
    vendor_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("vendors.vendor_id", ondelete="RESTRICT"), nullable=False
    )
    equipment_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("equipment.equipment_id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    price_per_day: Mapped[Decimal] = mapped_column(SQLDecimal(12, 2), nullable=False)
    days: Mapped[int] = mapped_column(Integer, nullable=False)
    total_price: Mapped[Decimal] = mapped_column(SQLDecimal(12, 2), nullable=False)
    item_status: Mapped[BookingItemStatus] = mapped_column(
        SQLEnum(BookingItemStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=BookingItemStatus.pending,
    )

    vendor_order: Mapped[VendorOrder] = relationship("VendorOrder", back_populates="items")
    equipment: Mapped[Equipment] = relationship("Equipment", back_populates="booking_items")
    reviews: Mapped[list[Review]] = relationship("Review", back_populates="booking_item")


class CartItem(Base):
    __tablename__ = "cart_items"

    cart_item_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    user_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    equipment_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("equipment.equipment_id", ondelete="CASCADE"),
        nullable=False,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped[User] = relationship("User")
    equipment: Mapped[Equipment] = relationship("Equipment")


class WishlistItem(Base):
    __tablename__ = "wishlist"

    user_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True
    )
    equipment_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("equipment.equipment_id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship("User")
    equipment: Mapped[Equipment] = relationship("Equipment")
