from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.integrations.storage import get_storage_provider
from app.models.storage import PendingUpload

logger = logging.getLogger("rent4fraction.jobs.cleanup_orphans")


def cleanup_orphaned_uploads(db: Session, max_age_hours: int = 24) -> int:
    """
    Finds pending uploads created more than max_age_hours ago that were never
    attached to any entity. Deletes the unattached asset from Cloudinary and
    marks the pending_uploads row as 'expired'.

    Returns the count of orphaned uploads cleaned up.
    """
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=max_age_hours)
    orphans = (
        db.query(PendingUpload)
        .filter(
            PendingUpload.status == "pending",
            PendingUpload.created_at <= cutoff,
        )
        .all()
    )

    if not orphans:
        return 0

    provider = get_storage_provider()
    cleaned_count = 0

    for upload in orphans:
        try:
            # Delete unattached asset from storage provider
            provider.delete_asset(
                public_id=upload.public_id,
                asset_type=upload.asset_type,  # type: ignore[arg-type]
            )
            upload.status = "expired"
            cleaned_count += 1
        except Exception as exc:
            logger.warning(
                "Failed to delete orphaned asset '%s' during cleanup: %s",
                upload.public_id,
                exc,
            )
            upload.status = "expired"  # Mark expired to prevent repeated failing attempts

    db.commit()
    logger.info("Cleaned up %d orphaned uploads older than %d hours.", cleaned_count, max_age_hours)
    return cleaned_count

