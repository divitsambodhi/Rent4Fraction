from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class SchemaMigration(Base):
    """
    Reflects the database migration tracking table (schema_migrations)
    managed by the /database runner.
    """

    __tablename__ = "schema_migrations"

    migration: Mapped[str] = mapped_column(String(255), primary_key=True)
    applied_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class IdempotencyKey(Base):
    """
    Platform idempotency storage for safe mutations (e.g. checkout, payment captures, refunds).
    Backed by MySQL table or in-memory fallback.
    """

    __tablename__ = "idempotency_keys"

    key_id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    idempotency_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    response_code: Mapped[int] = mapped_column(Integer, nullable=False)
    response_body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PlatformSetting(Base):
    """
    Platform configuration settings loaded from database (platform_settings).
    """

    __tablename__ = "platform_settings"

    setting_key: Mapped[str] = mapped_column(String(60), primary_key=True)
    setting_value: Mapped[str] = mapped_column(String(255), nullable=False)
    value_type: Mapped[str] = mapped_column(String(20), nullable=False, default="string")
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_placeholder: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    updated_by: Mapped[int | None] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


class OrderEvent(Base):
    """
    Append-only timeline of state transitions and order milestones.
    """

    __tablename__ = "order_events"

    order_event_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    booking_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("bookings.booking_id", ondelete="CASCADE"), nullable=False
    )
    vendor_order_id: Mapped[int | None] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("vendor_orders.vendor_order_id", ondelete="CASCADE"),
        nullable=True,
    )
    actor_user_id: Mapped[int | None] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )
    actor_role: Mapped[str] = mapped_column(String(20), nullable=False)
    event_type: Mapped[str] = mapped_column(String(60), nullable=False)
    from_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    to_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class AuditLog(Base):
    """
    Append-only system audit log tracking key administrative, security, and state mutations.
    """

    __tablename__ = "audit_log"

    audit_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    actor_user_id: Mapped[int | None] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )
    actor_role: Mapped[str] = mapped_column(String(20), nullable=False)
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_id: Mapped[int | None] = mapped_column(BIGINT(unsigned=True), nullable=True)
    before_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    after_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

