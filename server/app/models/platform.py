from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
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
