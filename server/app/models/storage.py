from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.accounts import User


class PendingUpload(Base):
    """
    Tracks signed direct-to-Cloudinary upload intents.
    Prevents unauthorized asset attachment and provides audit trail
    for orphan asset detection and cleanup.
    """

    __tablename__ = "pending_uploads"

    upload_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    owner_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[int | None] = mapped_column(BIGINT(unsigned=True), nullable=True)
    public_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    asset_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="upload"
    )  # "upload" (public) or "authenticated" (private)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )  # "pending", "attached", "expired", "deleted"
    format: Mapped[str | None] = mapped_column(String(10), nullable=True)
    bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    owner: Mapped[User] = relationship("User")

