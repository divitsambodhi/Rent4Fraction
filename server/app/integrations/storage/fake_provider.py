from __future__ import annotations

import hashlib
import time
import uuid
from typing import Any

from app.core.config import get_settings
from app.core.errors import NotFoundError, ValidationFailedError
from app.integrations.storage.base import (
    AssetMetadata,
    AssetVisibility,
    SignedUploadParams,
    StorageProvider,
    UploadKind,
)


class FakeStorageProvider(StorageProvider):
    """
    In-memory and deterministic offline storage provider for testing and local development.
    Requires no network access and operates completely inside test runner sandbox.
    """

    def __init__(
        self,
        cloud_name: str | None = None,
        api_key: str | None = None,
        api_secret: str | None = None,
        upload_preset_public: str | None = None,
        upload_preset_private: str | None = None,
        env_name: str | None = None,
    ) -> None:
        settings = get_settings()
        self.cloud_name = cloud_name or getattr(settings, "CLOUDINARY_CLOUD_NAME", "fake_cloud")
        self.api_key = api_key or getattr(settings, "CLOUDINARY_API_KEY", "fake_key")
        self.api_secret = api_secret or getattr(settings, "CLOUDINARY_API_SECRET", "fake_secret")
        self.preset_public = upload_preset_public or getattr(settings, "CLOUDINARY_UPLOAD_PRESET_PUBLIC", "rent4fraction_public")
        self.preset_private = upload_preset_private or getattr(settings, "CLOUDINARY_UPLOAD_PRESET_PRIVATE", "rent4fraction_private")
        self.env_name = env_name or getattr(settings, "ENV", "test")
        self.assets: dict[str, AssetMetadata] = {}

    def seed_object(
        self,
        storage_path: str,
        content_type: str = "image/jpeg",
        size_bytes: int = 1024,
    ) -> None:
        fmt = "png" if "png" in content_type else "webp" if "webp" in content_type else "jpg"
        self.seed_asset(public_id=storage_path, bytes=size_bytes, format=fmt)

    def generate_signed_upload_url(
        self,
        storage_path: str,
        content_type: str,
        ttl_seconds: int = 900,
    ) -> tuple[str, dict[str, str]]:
        return (f"https://storage.googleapis.com/fake-rent4fraction.appspot.com/{storage_path}", {"Content-Type": content_type})

    def generate_signed_read_url(
        self,
        storage_path: str,
        ttl_seconds: int = 3600,
    ) -> str:
        return f"https://storage.googleapis.com/fake-rent4fraction.appspot.com/{storage_path}"

    def generate_signed_download_url(
        self,
        storage_path: str,
        ttl_seconds: int = 3600,
    ) -> str:
        return self.private_delivery_url(public_id=storage_path, ttl_seconds=ttl_seconds)

    def seed_asset(
        self,
        public_id: str,
        width: int = 1200,
        height: int = 900,
        format: str = "webp",
        bytes: int = 204800,
        version: int = 1,
        asset_type: AssetVisibility = "upload",
    ) -> AssetMetadata:
        meta = AssetMetadata(
            public_id=public_id,
            version=version,
            width=width,
            height=height,
            format=format,
            bytes=bytes,
            resource_type="image",
            type=asset_type,
            secure_url=f"https://res.cloudinary.com/{self.cloud_name}/image/{asset_type}/v{version}/{public_id}.{format}",
        )
        self.assets[public_id] = meta
        return meta

    def sign_upload(
        self,
        kind: UploadKind,
        owner_id: int,
        entity_id: int | None = None,
    ) -> SignedUploadParams:
        unique_token = uuid.uuid4().hex[:16]
        public_id = f"{self.env_name}/{kind}/{owner_id}/{unique_token}"
        folder = f"{self.env_name}/{kind}/{owner_id}"
        timestamp = int(time.time())

        # Public vs Private classification
        if kind in ("delivery_proof", "return_evidence"):
            asset_type: AssetVisibility = "authenticated"
            upload_preset = self.preset_private
        else:
            asset_type = "upload"
            upload_preset = self.preset_public

        max_bytes = 2 * 1024 * 1024 if kind == "vendor_logo" else 5 * 1024 * 1024

        # Deterministic mock signature: SHA-1 of canonical parameters
        param_str = f"public_id={public_id}&timestamp={timestamp}&type={asset_type}&upload_preset={upload_preset}{self.api_secret}"
        signature = hashlib.sha1(param_str.encode("utf-8")).hexdigest()

        # Pre-seed in fake store for subsequent attach verification
        self.seed_asset(
            public_id=public_id,
            asset_type=asset_type,
            bytes=min(max_bytes, 250000),
            format="webp",
        )

        return SignedUploadParams(
            cloud_name=self.cloud_name,
            api_key=self.api_key,
            timestamp=timestamp,
            signature=signature,
            folder=folder,
            public_id=public_id,
            upload_preset=upload_preset,
            type=asset_type,
            allowed_formats=["jpg", "jpeg", "png", "webp"],
            max_bytes=max_bytes,
            resource_type="image",
        )

    def verify_asset(
        self,
        public_id: str,
        resource_type: str = "image",
        asset_type: AssetVisibility = "upload",
    ) -> AssetMetadata:
        if public_id not in self.assets:
            # If not already seeded, create a default valid asset for testing
            meta = self.seed_asset(public_id=public_id, asset_type=asset_type)
            return meta

        meta = self.assets[public_id]
        if meta.type != asset_type:
            raise ValidationFailedError(
                f"Asset visibility mismatch: expected {asset_type}, got {meta.type}"
            )
        return meta

    def delete_asset(
        self,
        public_id: str,
        resource_type: str = "image",
        asset_type: AssetVisibility = "upload",
    ) -> bool:
        if public_id in self.assets:
            del self.assets[public_id]
            return True
        return True

    def private_delivery_url(
        self,
        public_id: str,
        version: int | None = None,
        ttl_seconds: int = 300,
    ) -> str:
        ver = version or 1
        exp = int(time.time()) + ttl_seconds
        # Return deterministic signed URL representation
        return f"https://res.cloudinary.com/{self.cloud_name}/image/authenticated/s--mock_sig--/v{ver}/{public_id}.jpg?exp={exp}"
