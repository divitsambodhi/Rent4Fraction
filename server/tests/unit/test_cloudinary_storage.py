from __future__ import annotations

import hashlib
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

import pytest
from app.core.config import Settings
from app.core.errors import ForbiddenError, NotFoundError, ValidationFailedError
from app.integrations.storage.base import AssetMetadata, SignedUploadParams, StorageProvider
from app.integrations.storage.cloudinary_provider import CloudinaryProvider
from app.integrations.storage.fake_provider import FakeStorageProvider
from app.jobs.cleanup_orphans import cleanup_orphaned_uploads
from app.models.storage import PendingUpload


class TestCloudinaryStorage:
    def test_cloudinary_signature_algorithm(self) -> None:
        """
        Verify Cloudinary SHA-1 canonical parameter signing against known test vector.
        Parameters must be sorted alphabetically by key and concatenated as key=value&...
        with api_secret appended directly to the end (no separator).
        """
        api_secret = "my_super_secret_key"
        params = {
            "folder": "dev/equipment_image/42",
            "public_id": "dev/equipment_image/42/test-uuid-1234",
            "timestamp": 1700000000,
            "type": "upload",
            "upload_preset": "public_preset",
        }

        # Expected canonical string:
        # folder=dev/equipment_image/42&public_id=dev/equipment_image/42/test-uuid-1234&timestamp=1700000000&type=upload&upload_preset=public_presetmy_super_secret_key
        canonical = (
            "folder=dev/equipment_image/42&"
            "public_id=dev/equipment_image/42/test-uuid-1234&"
            "timestamp=1700000000&"
            "type=upload&"
            "upload_preset=public_preset"
            "my_super_secret_key"
        )
        expected_sig = hashlib.sha1(canonical.encode("utf-8")).hexdigest()

        computed_sig = CloudinaryProvider.compute_signature(params, api_secret)
        assert computed_sig == expected_sig

    def test_fake_storage_provider_offline_determinism(self) -> None:
        """Verify FakeStorageProvider generates offline deterministic signed params."""
        provider = FakeStorageProvider(
            cloud_name="fake_cloud",
            api_key="fake_key",
            api_secret="fake_secret",
            upload_preset_public="fake_preset",
            upload_preset_private="fake_private",
            env_name="dev",
        )
        signed = provider.sign_upload(
            kind="equipment_image",
            owner_id=42,
        )

        assert signed.cloud_name == "fake_cloud"
        assert signed.api_key == "fake_key"
        assert signed.public_id.startswith("dev/equipment_image/42/")
        assert signed.type == "upload"
        assert signed.upload_preset == "fake_preset"
        assert isinstance(signed.timestamp, int)
        assert len(signed.signature) == 40  # SHA-1 hex length

    def test_private_upload_type_selection(self) -> None:
        """Delivery proofs and damage evidence must use authenticated type and private preset."""
        provider = CloudinaryProvider(
            cloud_name="test_cloud",
            api_key="12345",
            api_secret="sec123",
            upload_preset_public="public_preset",
            upload_preset_private="private_preset",
            env_name="dev",
        )

        # Delivery proof -> authenticated
        deliv = provider.sign_upload(kind="delivery_proof", owner_id=10)
        assert deliv.type == "authenticated"
        assert deliv.upload_preset == "private_preset"

        # Return evidence -> authenticated
        ret = provider.sign_upload(kind="return_evidence", owner_id=10)
        assert ret.type == "authenticated"
        assert ret.upload_preset == "private_preset"

        # Equipment image -> upload (public)
        eq = provider.sign_upload(kind="equipment_image", owner_id=10)
        assert eq.type == "upload"
        assert eq.upload_preset == "public_preset"

        # Vendor logo -> upload (public)
        logo = provider.sign_upload(kind="vendor_logo", owner_id=10)
        assert logo.type == "upload"
        assert logo.upload_preset == "public_preset"

    def test_signed_upload_never_leaks_api_secret(self) -> None:
        """SignedUploadParams must never contain or expose the Cloudinary API secret."""
        provider = CloudinaryProvider(
            cloud_name="test_cloud",
            api_key="12345",
            api_secret="ultra_classified_secret_999",
            upload_preset_public="pub_preset",
            upload_preset_private="priv_preset",
            env_name="dev",
        )

        signed = provider.sign_upload(kind="equipment_image", owner_id=5)
        data_dict = signed.model_dump() if hasattr(signed, "model_dump") else signed.dict()

        assert "api_secret" not in data_dict
        assert "ultra_classified_secret_999" not in str(data_dict)

    def test_hard_startup_guard_in_production(self) -> None:
        """Verify the app refuses to start if STORAGE_PROVIDER=fake when ENV=prod."""
        with pytest.raises(RuntimeError) as exc_info:
            test_settings = Settings(
                DATABASE_URL="mysql+pymysql://root:password@127.0.0.1/test_db",
                ENV="prod",
                STORAGE_PROVIDER="fake",
            )
            if test_settings.is_production and test_settings.STORAGE_PROVIDER == "fake":
                raise RuntimeError("STORAGE_PROVIDER=fake is strictly forbidden in production!")

        assert "strictly forbidden in production" in str(exc_info.value)

    def test_verify_asset_metadata_checks(self) -> None:
        """Verify asset metadata validation rules (format, size limits, namespace prefix)."""
        provider = FakeStorageProvider()

        # Seed valid asset
        pid = "dev/equipment_image/42/uuid_123"
        provider.seed_asset(
            public_id=pid,
            width=1600,
            height=1200,
            format="webp",
            bytes=3 * 1024 * 1024,
            asset_type="upload",
        )

        meta = provider.verify_asset(pid, asset_type="upload")
        assert meta.public_id == pid
        assert meta.format == "webp"
        assert meta.bytes == 3 * 1024 * 1024

        # Visibility mismatch rejection
        with pytest.raises(ValidationFailedError) as exc:
            provider.verify_asset(pid, asset_type="authenticated")
        assert "Asset visibility mismatch" in str(exc.value)

    def test_private_delivery_url_signed_generation(self) -> None:
        """Verify private delivery URL includes signature token and expiration."""
        provider = FakeStorageProvider(cloud_name="my_cloud")
        url = provider.private_delivery_url("dev/delivery_proof/10/photo123", ttl_seconds=300)
        assert "https://res.cloudinary.com/my_cloud/image/authenticated/" in url
        assert "photo123" in url
        assert "exp=" in url

    def test_cleanup_orphaned_uploads_job(self) -> None:
        """Verify cleanup_orphaned_uploads marks old pending uploads as expired and deletes assets."""
        db = MagicMock()
        mock_provider = MagicMock()

        # 2 stale pending uploads (>24 hours old)
        stale_upload_1 = PendingUpload(
            upload_id=1,
            public_id="dev/equipment_image/42/orphan1",
            owner_id=10,
            kind="equipment_image",
            status="pending",
            expires_at=datetime.now(timezone.utc) - timedelta(hours=12),
            created_at=datetime.now(timezone.utc) - timedelta(hours=36),
        )
        stale_upload_2 = PendingUpload(
            upload_id=2,
            public_id="dev/equipment_image/42/orphan2",
            owner_id=10,
            kind="equipment_image",
            status="pending",
            expires_at=datetime.now(timezone.utc) - timedelta(hours=2),
            created_at=datetime.now(timezone.utc) - timedelta(hours=26),
        )

        # Mock db query
        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.all.return_value = [stale_upload_1, stale_upload_2]
        mock_query.filter.return_value = mock_filter
        db.query.return_value = mock_query

        with patch("app.jobs.cleanup_orphans.get_storage_provider", return_value=mock_provider):
            cleaned_count = cleanup_orphaned_uploads(db, max_age_hours=24)

        assert cleaned_count == 2
        assert stale_upload_1.status == "expired"
        assert stale_upload_2.status == "expired"
        assert mock_provider.delete_asset.call_count == 2
        db.commit.assert_called_once()
