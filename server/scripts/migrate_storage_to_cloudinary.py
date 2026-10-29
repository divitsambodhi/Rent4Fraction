"""
Migration script: Convert existing storage_path and legacy media rows to Cloudinary identifiers.
Safe for development and staging environments.
Guards against running demo conversions in production without explicit flag.
"""
from __future__ import annotations

import sys
import uuid
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.models.accounts import Vendor
from app.models.catalog import EquipmentImage
from app.models.fulfilment import Delivery


def migrate_storage_to_cloudinary(db: Session) -> dict[str, int]:
    settings = get_settings()
    if settings.is_production and "--force-prod" not in sys.argv:
        print("ERROR: Cannot run dev storage migration in production environment without --force-prod.")
        sys.exit(1)

    stats = {
        "equipment_images_migrated": 0,
        "vendor_logos_migrated": 0,
        "delivery_proofs_migrated": 0,
    }

    # 1. Equipment Images
    images = db.query(EquipmentImage).all()
    for img in images:
        if not img.public_id:
            token = uuid.uuid4().hex[:12]
            img.provider = "cloudinary"
            img.public_id = f"dev/equipment_image/{img.equipment_id}/{token}"
            img.version = img.version or 1
            img.format = img.format or "webp"
            img.bytes = img.bytes or (img.size_bytes if hasattr(img, "size_bytes") and img.size_bytes else 204800)
            stats["equipment_images_migrated"] += 1

    # 2. Vendor Logos
    vendors = db.query(Vendor).all()
    for v in vendors:
        if v.logo_storage_path and not v.logo_public_id:
            token = uuid.uuid4().hex[:8]
            v.logo_public_id = f"dev/vendor_logo/{v.vendor_id}/logo_{token}"
            v.logo_version = 1
            stats["vendor_logos_migrated"] += 1

    # 3. Delivery Proofs
    deliveries = db.query(Delivery).all()
    for d in deliveries:
        if d.proof_url and not d.proof_public_id:
            token = uuid.uuid4().hex[:8]
            d.proof_public_id = f"dev/delivery_proof/{d.vendor_order_id}/proof_{token}"
            d.proof_version = 1
            stats["delivery_proofs_migrated"] += 1

    db.commit()
    return stats


def main() -> None:
    db = SessionLocal()
    try:
        print("Starting Cloudinary storage identifier migration...")
        stats = migrate_storage_to_cloudinary(db)
        print("Migration complete:")
        for k, v in stats.items():
            print(f"  - {k}: {v}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

