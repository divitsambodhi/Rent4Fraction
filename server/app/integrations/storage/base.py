from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Literal
from pydantic import BaseModel, Field

UploadKind = Literal["equipment_image", "vendor_logo", "delivery_proof", "return_evidence"]
AssetVisibility = Literal["upload", "authenticated"]  # Cloudinary types: "upload" = public, "authenticated" = private


class SignedUploadParams(BaseModel):
    cloud_name: str
    api_key: str
    timestamp: int
    signature: str
    folder: str
    public_id: str
    upload_preset: str
    type: AssetVisibility
    allowed_formats: list[str] = Field(default_factory=lambda: ["jpg", "jpeg", "png", "webp"])
    max_bytes: int
    resource_type: str = "image"


class AssetMetadata(BaseModel):
    public_id: str
    version: int = 1
    width: int
    height: int
    format: str
    bytes: int
    resource_type: str = "image"
    type: AssetVisibility = "upload"
    secure_url: str


class StorageProvider(ABC):
    """
    Abstract contract for media storage providers (Cloudinary real provider and offline Fake provider).
    Enforces server-authoritative public_id generation, cryptographic signing, asset verification,
    and private delivery URLs.
    """

    @abstractmethod
    def sign_upload(
        self,
        kind: UploadKind,
        owner_id: int,
        entity_id: int | None = None,
    ) -> SignedUploadParams:
        """
        Generates server-controlled parameters and cryptographic signature for direct client upload.
        Server-generates public_id: <env>/<kind>/<owner_id>/<uuid>
        Signature covers folder, public_id, timestamp, upload_preset, and type.
        """
        pass

    @abstractmethod
    def verify_asset(
        self,
        public_id: str,
        resource_type: str = "image",
        asset_type: AssetVisibility = "upload",
    ) -> AssetMetadata:
        """
        Queries the storage provider to verify that the asset actually exists, matches the expected
        prefix/owner, has an allowed format, and respects size and dimension constraints.
        """
        pass

    @abstractmethod
    def delete_asset(
        self,
        public_id: str,
        resource_type: str = "image",
        asset_type: AssetVisibility = "upload",
    ) -> bool:
        """
        Deletes the asset from Cloudinary/storage provider.
        """
        pass

    @abstractmethod
    def private_delivery_url(
        self,
        public_id: str,
        version: int | None = None,
        ttl_seconds: int = 300,
    ) -> str:
        """
        Generates a short-lived time-limited signed delivery URL for authenticated/private assets.
        """
        pass

