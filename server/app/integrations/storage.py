from __future__ import annotations

import logging
import os
import re
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Any, Literal

from app.core.config import get_settings
from app.core.errors import ForbiddenError, ValidationFailedError

logger = logging.getLogger("rent4fraction.storage")

UploadPurpose = Literal["equipment_image", "vendor_logo", "delivery_proof"]

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MAX_SIZE_BYTES_MAP: dict[UploadPurpose, int] = {
    "vendor_logo": 2 * 1024 * 1024,       # 2 MB
    "equipment_image": 5 * 1024 * 1024,   # 5 MB
    "delivery_proof": 5 * 1024 * 1024,    # 5 MB
}


class StorageClient(ABC):
    @abstractmethod
    def generate_signed_upload_url(
        self,
        storage_path: str,
        content_type: str,
        expires_in_seconds: int = 900,
    ) -> tuple[str, dict[str, str]]:
        """Returns (signed_put_url, required_headers)."""
        pass

    @abstractmethod
    def generate_signed_read_url(
        self,
        storage_path: str,
        expires_in_seconds: int = 900,
    ) -> str:
        """Returns signed GET url for private files."""
        pass

    @abstractmethod
    def object_exists(self, storage_path: str) -> bool:
        """Returns True if object exists in storage."""
        pass

    @abstractmethod
    def get_object_metadata(self, storage_path: str) -> dict[str, Any] | None:
        """Returns dict with content_type, size_bytes, updated."""
        pass

    @abstractmethod
    def get_public_url(self, storage_path: str) -> str:
        """Returns public URL for public/ paths."""
        pass


class FakeStorageClient(StorageClient):
    """
    Fake storage client for deterministic offline testing.
    Never calls real GCS or Firebase APIs.
    """

    def __init__(self, bucket_name: str = "fake-rent4fraction.appspot.com") -> None:
        self.bucket_name = bucket_name
        self.objects: dict[str, dict[str, Any]] = {}

    def seed_object(
        self,
        storage_path: str,
        content_type: str = "image/jpeg",
        size_bytes: int = 102400,
    ) -> None:
        self.objects[storage_path] = {
            "content_type": content_type,
            "size_bytes": size_bytes,
            "updated": datetime.utcnow().isoformat() + "Z",
        }

    def generate_signed_upload_url(
        self,
        storage_path: str,
        content_type: str,
        expires_in_seconds: int = 900,
    ) -> tuple[str, dict[str, str]]:
        # Pre-seed so subsequent verify_storage_path finds it in tests
        self.seed_object(storage_path, content_type=content_type, size_bytes=204800)
        url = f"https://storage.googleapis.com/{self.bucket_name}/{storage_path}?signed_put_mock=1&exp={expires_in_seconds}"
        headers = {
            "Content-Type": content_type,
        }
        return url, headers

    def generate_signed_read_url(
        self,
        storage_path: str,
        expires_in_seconds: int = 900,
    ) -> str:
        return f"https://storage.googleapis.com/{self.bucket_name}/{storage_path}?signed_get_mock=1&exp={expires_in_seconds}"

    def object_exists(self, storage_path: str) -> bool:
        return storage_path in self.objects

    def get_object_metadata(self, storage_path: str) -> dict[str, Any] | None:
        return self.objects.get(storage_path)

    def get_public_url(self, storage_path: str) -> str:
        return f"https://storage.googleapis.com/{self.bucket_name}/{storage_path}"


class GoogleCloudStorageClient(StorageClient):
    """
    Real Google Cloud Storage / Firebase Storage client using GCS SDK.
    """

    def __init__(self, bucket_name: str | None = None) -> None:
        settings = get_settings()
        self.bucket_name = bucket_name or getattr(settings, "STORAGE_BUCKET_NAME", "rent4fraction.appspot.com")
        self._bucket: Any = None

    def _get_bucket(self) -> Any:
        if self._bucket is None:
            from google.cloud import storage  # type: ignore[import-untyped]

            client = storage.Client()
            self._bucket = client.bucket(self.bucket_name)
        return self._bucket

    def generate_signed_upload_url(
        self,
        storage_path: str,
        content_type: str,
        expires_in_seconds: int = 900,
    ) -> tuple[str, dict[str, str]]:
        bucket = self._get_bucket()
        blob = bucket.blob(storage_path)
        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(seconds=expires_in_seconds),
            method="PUT",
            content_type=content_type,
        )
        headers = {"Content-Type": content_type}
        return url, headers

    def generate_signed_read_url(
        self,
        storage_path: str,
        expires_in_seconds: int = 900,
    ) -> str:
        bucket = self._get_bucket()
        blob = bucket.blob(storage_path)
        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(seconds=expires_in_seconds),
            method="GET",
        )
        return str(url)

    def object_exists(self, storage_path: str) -> bool:
        bucket = self._get_bucket()
        blob = bucket.blob(storage_path)
        return bool(blob.exists())

    def get_object_metadata(self, storage_path: str) -> dict[str, Any] | None:
        bucket = self._get_bucket()
        blob = bucket.get_blob(storage_path)
        if not blob:
            return None
        return {
            "content_type": blob.content_type,
            "size_bytes": blob.size,
            "updated": blob.updated.isoformat() if blob.updated else None,
        }

    def get_public_url(self, storage_path: str) -> str:
        return f"https://storage.googleapis.com/{self.bucket_name}/{storage_path}"


# -----------------------------------------------------------------------------
# Global Storage Client Singleton
# -----------------------------------------------------------------------------
_storage_client: StorageClient | None = None


def get_storage_client() -> StorageClient:
    global _storage_client
    if _storage_client is None:
        settings = get_settings()
        if settings.ENV in ("test", "testing") or not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
            _storage_client = FakeStorageClient()
        else:
            try:
                _storage_client = GoogleCloudStorageClient()
            except Exception as exc:
                logger.warning("Could not initialize real GCS client, falling back to Fake: %s", exc)
                _storage_client = FakeStorageClient()
    return _storage_client


def set_storage_client(client: StorageClient | None) -> None:
    global _storage_client
    _storage_client = client


# -----------------------------------------------------------------------------
# Path and Validation Utilities
# -----------------------------------------------------------------------------
def sanitize_filename(filename: str) -> str:
    # Strip paths, spaces and disallowed characters
    base = os.path.basename(filename)
    clean = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", base)
    return clean or "upload"


def build_storage_path(
    purpose: UploadPurpose,
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
    else:
        raise ValidationFailedError(f"Unknown upload purpose '{purpose}'.")


def validate_upload_request(
    purpose: UploadPurpose,
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

    # Vendor approval permissions
    if vendor_approval_status != "approved" and purpose != "vendor_logo":
        raise ForbiddenError(
            f"Vendors with status '{vendor_approval_status}' may only upload a vendor logo until approved."
        )


def verify_storage_path_for_entity(
    storage_path: str,
    vendor_id: int,
    expected_purpose: UploadPurpose,
    vendor_order_id: int | None = None,
    storage: StorageClient | None = None,
) -> dict[str, Any]:
    """
    Validates that:
    1. storage_path matches the server's expected prefix for this vendor.
    2. Object exists in storage.
    3. Content type and size are within allowed bounds.
    """
    if storage is None:
        storage = get_storage_client()

    if expected_purpose == "equipment_image":
        expected_prefix = f"public/equipment/{vendor_id}/"
    elif expected_purpose == "vendor_logo":
        expected_prefix = f"public/vendors/{vendor_id}/"
    elif expected_purpose == "delivery_proof":
        if not vendor_order_id:
            raise ValidationFailedError("vendor_order_id required to verify delivery proof path.")
        expected_prefix = f"private/delivery-proofs/{vendor_id}/{vendor_order_id}/"
    else:
        raise ValidationFailedError(f"Invalid purpose: {expected_purpose}")

    if not storage_path.startswith(expected_prefix):
        raise ValidationFailedError(
            f"Storage path '{storage_path}' does not match expected vendor prefix '{expected_prefix}'."
        )

    if not storage.object_exists(storage_path):
        raise ValidationFailedError(
            f"Uploaded object was not found in storage at path '{storage_path}'."
        )

    meta = storage.get_object_metadata(storage_path) or {}
    ct = meta.get("content_type", "image/jpeg")
    sz = meta.get("size_bytes", 0)

    if ct not in ALLOWED_CONTENT_TYPES:
        raise ValidationFailedError(f"Object content type '{ct}' is not permitted.")

    max_sz = MAX_SIZE_BYTES_MAP[expected_purpose]
    if sz > max_sz:
        raise ValidationFailedError(f"Object size {sz} exceeds maximum {max_sz} bytes.")

    return meta
