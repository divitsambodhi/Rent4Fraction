from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    DECIMAL as SQLDecimal,
)
from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    func,
)
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy.dialects.mysql import BIGINT, TINYINT
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


class WebhookEventStatus(str, enum.Enum):
    received = "received"
    processed = "processed"
    ignored = "ignored"
    failed = "failed"


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
    vendor_order_id: Mapped[int | None] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("vendor_orders.vendor_order_id", ondelete="RESTRICT"),
        nullable=True,
    )
    user_id: Mapped[int | None] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("users.user_id", ondelete="RESTRICT"),
        nullable=True,
    )
    amount: Mapped[Decimal] = mapped_column(SQLDecimal(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    type: Mapped[PaymentType] = mapped_column(
        SQLEnum(PaymentType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    method: Mapped[PaymentMethod | None] = mapped_column(
        SQLEnum(PaymentMethod, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gateway: Mapped[str | None] = mapped_column(String(100), nullable=True, default="razorpay")
    transaction_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    gateway_order_id: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    gateway_payment_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    gateway_refund_id: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    signature_verified: Mapped[int] = mapped_column(TINYINT, default=0, nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        SQLEnum(PaymentStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=PaymentStatus.pending,
    )
    refund_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    failure_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    refund_of_payment_id: Mapped[int | None] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("payments.payment_id", ondelete="RESTRICT"),
        nullable=True,
    )
    refund_of_id: Mapped[int | None] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("payments.payment_id", ondelete="RESTRICT"),
        nullable=True,
    )
    idempotency_key: Mapped[str | None] = mapped_column(String(80), nullable=True)
    attempt_no: Mapped[int] = mapped_column(SmallInteger, default=1, nullable=False)
    raw_gateway_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    payment_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    captured_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    booking: Mapped[Booking] = relationship("Booking", back_populates="payments")
    vendor_order: Mapped[VendorOrder | None] = relationship("VendorOrder")
    refund_of: Mapped[Payment | None] = relationship(
        "Payment",
        remote_side=[payment_id],
        foreign_keys=[refund_of_id],
        back_populates="refunds",
    )
    refunds: Mapped[list[Payment]] = relationship(
        "Payment",
        foreign_keys=[refund_of_id],
        back_populates="refund_of",
    )


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    webhook_event_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    provider: Mapped[str] = mapped_column(String(20), nullable=False, default="razorpay")
    provider_event_id: Mapped[str] = mapped_column(String(100), nullable=False)
    event_type: Mapped[str] = mapped_column(String(60), nullable=False)
    signature_valid: Mapped[int] = mapped_column(TINYINT, default=1, nullable=False)
    payload: Mapped[Any] = mapped_column(JSON, nullable=False)
    status: Mapped[WebhookEventStatus] = mapped_column(
        SQLEnum(WebhookEventStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=WebhookEventStatus.received,
    )
    attempts: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    received_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


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
