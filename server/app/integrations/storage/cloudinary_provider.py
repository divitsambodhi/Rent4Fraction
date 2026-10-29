from __future__ import annotations

import hashlib
import logging
import time
import uuid
from typing import Any

import requests
from requests.auth import HTTPBasicAuth

from app.core.config import get_settings
from app.core.errors import NotFoundError, ValidationFailedError
from app.integrations.storage.base import (
    AssetMetadata,
    AssetVisibility,
    SignedUploadParams,
    StorageProvider,
    UploadKind,
)

logger = logging.getLogger("rent4fraction.storage.cloudinary")


class CloudinaryProvider(StorageProvider):
    """
    Production-grade Cloudinary Storage Provider.
    Implements SHA-1 signature generation, Admin API asset verification,
    asset deletion, and authenticated private delivery URLs.
    API Secret is strictly server-side and never exposed to the client or logs.
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
        self.cloud_name = cloud_name or getattr(settings, "CLOUDINARY_CLOUD_NAME", "")
        self.api_key = api_key or getattr(settings, "CLOUDINARY_API_KEY", "")
        self.api_secret = api_secret or getattr(settings, "CLOUDINARY_API_SECRET", "")
        self.preset_public = upload_preset_public or getattr(settings, "CLOUDINARY_UPLOAD_PRESET_PUBLIC", "rent4fraction_public")
        self.preset_private = upload_preset_private or getattr(settings, "CLOUDINARY_UPLOAD_PRESET_PRIVATE", "rent4fraction_private")
        self.env_name = env_name or getattr(settings, "ENV", "prod")

        if not self.cloud_name or not self.api_key or not self.api_secret:
            logger.warning("Cloudinary credentials are not fully configured.")

    @classmethod
    def compute_signature(cls, params: dict[str, Any], api_secret: str) -> str:
        """
        Cloudinary signature algorithm:
        1. Exclude 'file', 'cloud_name', 'resource_type', 'api_key', 'signature'.
        2. Sort keys alphabetically.
        3. Join with '&' and '='.
        4. Append api_secret directly.
        5. Compute SHA-1 hex digest.
        """
        excluded = {"file", "cloud_name", "resource_type", "api_key", "signature"}
        filtered = {k: v for k, v in params.items() if k not in excluded and v is not None and v != ""}
        sorted_keys = sorted(filtered.keys())
        query_string = "&".join(f"{k}={filtered[k]}" for k in sorted_keys)
        to_sign = f"{query_string}{api_secret}"
        return hashlib.sha1(to_sign.encode("utf-8")).hexdigest()

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

        sign_params = {
            "public_id": public_id,
            "timestamp": timestamp,
            "type": asset_type,
            "upload_preset": upload_preset,
        }

        signature = self.compute_signature(sign_params, self.api_secret)

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
        """
        Queries Cloudinary Admin API:
        GET https://api.cloudinary.com/v1_1/<cloud_name>/resources/<resource_type>/<type>/<public_id>
        """
        url = f"https://api.cloudinary.com/v1_1/{self.cloud_name}/resources/{resource_type}/{asset_type}/{public_id}"
        try:
            resp = requests.get(
                url,
                auth=HTTPBasicAuth(self.api_key, self.api_secret),
                timeout=10,
            )
        except Exception as exc:
            logger.error("Cloudinary asset verification network error: %s", exc)
            raise ValidationFailedError(f"Failed to communicate with storage provider: {exc}") from exc

        if resp.status_code == 404:
            raise NotFoundError(f"Uploaded asset '{public_id}' not found in Cloudinary.", public_id)
        elif resp.status_code != 200:
            logger.error("Cloudinary returned error %s: %s", resp.status_code, resp.text)
            raise ValidationFailedError(f"Storage provider verification failed: {resp.text}")

        data = resp.json()
        fmt = data.get("format", "").lower()
        size = data.get("bytes", 0)
        width = data.get("width", 0)
        height = data.get("height", 0)
        version = data.get("version", 1)
        secure_url = data.get("secure_url", "")

        # Format and size constraints
        if fmt not in ("jpg", "jpeg", "png", "webp"):
            raise ValidationFailedError(f"Uploaded format '{fmt}' is not permitted.")
        if size > 5 * 1024 * 1024:
            raise ValidationFailedError(f"Asset size {size} bytes exceeds maximum 5 MB limit.")

        return AssetMetadata(
            public_id=public_id,
            version=version,
            width=width,
            height=height,
            format=fmt,
            bytes=size,
            resource_type=resource_type,
            type=asset_type,
            secure_url=secure_url,
        )

    def delete_asset(
        self,
        public_id: str,
        resource_type: str = "image",
        asset_type: AssetVisibility = "upload",
    ) -> bool:
        """
        Deletes asset via Cloudinary destroy endpoint:
        POST https://api.cloudinary.com/v1_1/<cloud_name>/<resource_type>/destroy
        """
        url = f"https://api.cloudinary.com/v1_1/{self.cloud_name}/{resource_type}/destroy"
        timestamp = int(time.time())
        params = {
            "public_id": public_id,
            "type": asset_type,
            "timestamp": timestamp,
        }
        signature = self.compute_signature(params, self.api_secret)
        params["api_key"] = self.api_key
        params["signature"] = signature

        try:
            resp = requests.post(url, data=params, timeout=10)
            if resp.status_code == 200:
                result = resp.json().get("result")
                return result in ("ok", "not found")
            logger.warning("Cloudinary asset deletion returned %s: %s", resp.status_code, resp.text)
            return False
        except Exception as exc:
            logger.error("Failed to delete Cloudinary asset '%s': %s", public_id, exc)
            return False

    def private_delivery_url(
        self,
        public_id: str,
        version: int | None = None,
        ttl_seconds: int = 300,
    ) -> str:
        """
        Generates signed URL for authenticated assets:
        https://res.cloudinary.com/<cloud_name>/image/authenticated/s--<sig>--/v<version>/<public_id>.<format>
        """
        ver_str = f"v{version}/" if version else ""
        # Base string to sign for URL delivery
        to_sign = f"{ver_str}{public_id}{self.api_secret}"
        # URL signature uses base64-encoded SHA-1 digest truncated or URL-safe encoded
        sig_digest = hashlib.sha1(to_sign.encode("utf-8")).digest()
        import base64

        url_sig = base64.urlsafe_b64encode(sig_digest)[:8].decode("ascii")

        return f"https://res.cloudinary.com/{self.cloud_name}/image/authenticated/s--{url_sig}--/{ver_str}{public_id}"
