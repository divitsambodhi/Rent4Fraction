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
    func,
)
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.models.accounts import Vendor
    from app.models.orders import Booking, VendorOrder


class PaymentType(str, enum.Enum):
    advance = "advance"
    full = "full"
    deposit = "deposit"
    refund = "refund"
    deposit_refund = "deposit_refund"


class PaymentMethod(str, enum.Enum):
    upi = "upi"
    card = "card"
    netbanking = "netbanking"
    cod = "cod"
    wallet = "wallet"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    success = "success"
    failed = "failed"
    refunded = "refunded"


class PayoutStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    paid = "paid"


class Payment(Base):
    __tablename__ = "payments"

    payment_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    booking_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("bookings.booking_id", ondelete="RESTRICT"),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(SQLDecimal(12, 2), nullable=False)
    type: Mapped[PaymentType] = mapped_column(
        SQLEnum(PaymentType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    method: Mapped[PaymentMethod] = mapped_column(
        SQLEnum(PaymentMethod, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    gateway: Mapped[str | None] = mapped_column(String(100), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    transaction_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    status: Mapped[PaymentStatus] = mapped_column(
        SQLEnum(PaymentStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=PaymentStatus.pending,
    )
    refund_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    booking: Mapped[Booking] = relationship("Booking", back_populates="payments")


class Payout(Base):
    __tablename__ = "payouts"

    payout_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    vendor_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("vendors.vendor_id", ondelete="RESTRICT"), nullable=False
    )
    vendor_order_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("vendor_orders.vendor_order_id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
    )
    gross_amount: Mapped[Decimal] = mapped_column(SQLDecimal(12, 2), nullable=False)
    commission_amount: Mapped[Decimal] = mapped_column(SQLDecimal(12, 2), nullable=False)
    net_amount: Mapped[Decimal] = mapped_column(SQLDecimal(12, 2), nullable=False)
    status: Mapped[PayoutStatus] = mapped_column(
        SQLEnum(PayoutStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=PayoutStatus.pending,
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    vendor_order: Mapped[VendorOrder] = relationship("VendorOrder", back_populates="payout")
    vendor: Mapped[Vendor] = relationship("Vendor")
