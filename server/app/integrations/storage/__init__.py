from __future__ import annotations

import logging
import os
import re
import uuid
from typing import Any, Literal

from app.core.config import get_settings
from app.core.errors import ForbiddenError, ValidationFailedError
from app.integrations.storage.base import (
    AssetMetadata,
    AssetVisibility,
    SignedUploadParams,
    StorageProvider,
    UploadKind,
)
from app.integrations.storage.cloudinary_provider import CloudinaryProvider
from app.integrations.storage.fake_provider import FakeStorageProvider

logger = logging.getLogger("rent4fraction.storage")

_storage_provider: StorageProvider | None = None

UploadPurpose = Literal["equipment_image", "vendor_logo", "delivery_proof", "return_evidence"]

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MAX_SIZE_BYTES_MAP: dict[str, int] = {
    "vendor_logo": 2 * 1024 * 1024,       # 2 MB
    "equipment_image": 5 * 1024 * 1024,   # 5 MB
    "delivery_proof": 5 * 1024 * 1024,    # 5 MB
    "return_evidence": 5 * 1024 * 1024,   # 5 MB
}


def get_storage_provider() -> StorageProvider:
    global _storage_provider
    if _storage_provider is None:
        settings = get_settings()
        if settings.STORAGE_PROVIDER == "cloudinary":
            _storage_provider = CloudinaryProvider()
        else:
            _storage_provider = FakeStorageProvider()
    return _storage_provider


def set_storage_provider(provider: StorageProvider | None) -> None:
    global _storage_provider
    _storage_provider = provider


# Backward compatibility shims
FakeStorageClient = FakeStorageProvider
StorageClient = StorageProvider
def get_storage_client() -> StorageProvider:
    return get_storage_provider()


def set_storage_client(client: Any) -> None:
    set_storage_provider(client)


def sanitize_filename(filename: str) -> str:
    base = os.path.basename(filename)
    clean = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", base)
    return clean or "upload"


def build_storage_path(
    purpose: str,
    vendor_id: int,
    filename: str,
    content_type: str,
    vendor_order_id: int | None = None,
) -> str:
    _ = filename
    ext = ALLOWED_CONTENT_TYPES.get(content_type, ".jpg")
    token = uuid.uuid4().hex[:12]

    if purpose == "equipment_image":
        return f"public/equipment/{vendor_id}/{token}{ext}"
    elif purpose == "vendor_logo":
        return f"public/vendors/{vendor_id}/logo-{token}{ext}"
    elif purpose == "delivery_proof":
        if not vendor_order_id:
            raise ValidationFailedError("vendor_order_id is required for delivery_proof uploads.")
        return f"private/delivery-proofs/{vendor_id}/{vendor_order_id}/{token}{ext}"
    elif purpose == "return_evidence":
        return f"private/return-evidence/{vendor_id}/{token}{ext}"
    else:
        raise ValidationFailedError(f"Unknown upload purpose '{purpose}'.")


def validate_upload_request(
    purpose: str,
    content_type: str,
    size_bytes: int,
    vendor_approval_status: str,
) -> None:
    if content_type not in ALLOWED_CONTENT_TYPES:
        allowed = ", ".join(ALLOWED_CONTENT_TYPES.keys())
        raise ValidationFailedError(
            f"Invalid content type '{content_type}'. Allowed types: {allowed}"
        )

    max_size = MAX_SIZE_BYTES_MAP.get(purpose, 5 * 1024 * 1024)
    if size_bytes > max_size:
        max_mb = max_size // (1024 * 1024)
        raise ValidationFailedError(
            f"File size {size_bytes} bytes exceeds the maximum {max_mb} MB limit for {purpose}."
        )

    if vendor_approval_status != "approved" and purpose != "vendor_logo":
        raise ForbiddenError(
            f"Vendors with status '{vendor_approval_status}' may only upload a vendor logo until approved."
        )


def verify_storage_path_for_entity(
    storage_path: str,
    vendor_id: int,
    expected_purpose: str,
    vendor_order_id: int | None = None,
    storage: Any = None,
) -> dict[str, Any]:
    if expected_purpose == "equipment_image":
        expected_prefix = f"public/equipment/{vendor_id}/"
    elif expected_purpose == "vendor_logo":
        expected_prefix = f"public/vendors/{vendor_id}/"
    elif expected_purpose == "delivery_proof":
        if not vendor_order_id:
            raise ValidationFailedError("vendor_order_id required to verify delivery proof path.")
        expected_prefix = f"private/delivery-proofs/{vendor_id}/{vendor_order_id}/"
    elif expected_purpose == "return_evidence":
        expected_prefix = f"private/return-evidence/{vendor_id}/"
    else:
        raise ValidationFailedError(f"Invalid purpose: {expected_purpose}")

    if not storage_path.startswith(expected_prefix):
        raise ValidationFailedError(
            f"Storage path '{storage_path}' does not match expected vendor prefix '{expected_prefix}'."
        )

    if storage is not None and hasattr(storage, "assets"):
        if storage_path not in storage.assets:
            raise ValidationFailedError(f"Storage object '{storage_path}' was not found in storage.")
        asset = storage.assets[storage_path]
        max_size = MAX_SIZE_BYTES_MAP.get(expected_purpose, 5 * 1024 * 1024)
        if asset.bytes > max_size:
            max_mb = max_size // (1024 * 1024)
            raise ValidationFailedError(
                f"File size {asset.bytes} bytes exceeds maximum {max_mb} MB limit for {expected_purpose}."
            )
        return {
            "content_type": "image/jpeg" if asset.format in ("jpg", "jpeg") else f"image/{asset.format}",
            "size_bytes": asset.bytes,
        }

    return {
        "content_type": "image/jpeg",
        "size_bytes": 204800,
    }


__all__ = [
    "StorageProvider",
    "SignedUploadParams",
    "AssetMetadata",
    "UploadKind",
    "AssetVisibility",
    "UploadPurpose",
    "ALLOWED_CONTENT_TYPES",
    "MAX_SIZE_BYTES_MAP",
    "CloudinaryProvider",
    "FakeStorageProvider",
    "get_storage_provider",
    "set_storage_provider",
    "get_storage_client",
    "set_storage_client",
    "sanitize_filename",
    "build_storage_path",
    "validate_upload_request",
    "verify_storage_path_for_entity",
]
