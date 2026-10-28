from __future__ import annotations

import pytest

from app.core.errors import ForbiddenError, ValidationFailedError
from app.integrations.storage import (
    MAX_SIZE_BYTES_MAP,
    FakeStorageClient,
    build_storage_path,
    sanitize_filename,
    validate_upload_request,
    verify_storage_path_for_entity,
)


class TestStorageUploads:
    def test_sanitize_filename(self) -> None:
        assert sanitize_filename("my photo.jpg") == "my_photo.jpg"
        assert sanitize_filename("../../../etc/passwd") == "passwd"
        assert sanitize_filename("Equipment#1 @2026.PNG") == "Equipment_1__2026.PNG"
        assert sanitize_filename("") == "upload"

    def test_build_storage_path_equipment(self) -> None:
        path = build_storage_path(
            purpose="equipment_image",
            vendor_id=42,
            filename="camera.jpg",
            content_type="image/jpeg",
        )
        assert path.startswith("public/equipment/42/")
        assert path.endswith(".jpg")

    def test_build_storage_path_logo(self) -> None:
        path = build_storage_path(
            purpose="vendor_logo",
            vendor_id=42,
            filename="logo.png",
            content_type="image/png",
        )
        assert path.startswith("public/vendors/42/logo-")
        assert path.endswith(".png")

    def test_build_storage_path_delivery_proof(self) -> None:
        path = build_storage_path(
            purpose="delivery_proof",
            vendor_id=42,
            filename="proof.webp",
            content_type="image/webp",
            vendor_order_id=101,
        )
        assert path.startswith("private/delivery-proofs/42/101/")
        assert path.endswith(".webp")

    def test_build_storage_path_delivery_proof_requires_order_id(self) -> None:
        with pytest.raises(ValidationFailedError) as exc:
            build_storage_path(
                purpose="delivery_proof",
                vendor_id=42,
                filename="proof.webp",
                content_type="image/webp",
                vendor_order_id=None,
            )
        assert "vendor_order_id is required" in str(exc.value)

    def test_validate_upload_request_content_type(self) -> None:
        with pytest.raises(ValidationFailedError) as exc:
            validate_upload_request(
                purpose="equipment_image",
                content_type="application/pdf",
                size_bytes=1024,
                vendor_approval_status="approved",
            )
        assert "invalid content type" in str(exc.value).lower()

    def test_validate_upload_request_size_limits(self) -> None:
        # Equipment image: <= 5 MB
        validate_upload_request(
            purpose="equipment_image",
            content_type="image/jpeg",
            size_bytes=MAX_SIZE_BYTES_MAP["equipment_image"],
            vendor_approval_status="approved",
        )

        with pytest.raises(ValidationFailedError) as exc:
            validate_upload_request(
                purpose="equipment_image",
                content_type="image/jpeg",
                size_bytes=MAX_SIZE_BYTES_MAP["equipment_image"] + 1,
                vendor_approval_status="approved",
            )
        assert "exceeds the maximum" in str(exc.value).lower()

        # Logo: <= 2 MB
        validate_upload_request(
            purpose="vendor_logo",
            content_type="image/png",
            size_bytes=MAX_SIZE_BYTES_MAP["vendor_logo"],
            vendor_approval_status="pending",
        )

        with pytest.raises(ValidationFailedError) as exc:
            validate_upload_request(
                purpose="vendor_logo",
                content_type="image/png",
                size_bytes=MAX_SIZE_BYTES_MAP["vendor_logo"] + 1,
                vendor_approval_status="pending",
            )
        assert "exceeds the maximum" in str(exc.value).lower()

    def test_validate_upload_pending_vendor_cannot_upload_equipment(self) -> None:
        with pytest.raises(ForbiddenError) as exc:
            validate_upload_request(
                purpose="equipment_image",
                content_type="image/jpeg",
                size_bytes=1024,
                vendor_approval_status="pending",
            )
        assert "may only upload a vendor logo" in str(exc.value).lower()

    def test_verify_storage_path_valid(self) -> None:
        client = FakeStorageClient()
        path = "public/equipment/42/item-123.jpg"
        client.seed_object(path, content_type="image/jpeg", size_bytes=1024)

        meta = verify_storage_path_for_entity(
            storage_path=path,
            vendor_id=42,
            expected_purpose="equipment_image",
            storage=client,
        )
        assert meta["size_bytes"] == 1024
        assert meta["content_type"] == "image/jpeg"

    def test_verify_storage_path_wrong_vendor(self) -> None:
        client = FakeStorageClient()
        path = "public/equipment/99/item-123.jpg"
        client.seed_object(path, content_type="image/jpeg", size_bytes=1024)

        with pytest.raises(ValidationFailedError) as exc:
            verify_storage_path_for_entity(
                storage_path=path,
                vendor_id=42,
                expected_purpose="equipment_image",
                storage=client,
            )
        assert "does not match expected vendor prefix" in str(exc.value).lower()

    def test_verify_storage_path_non_existent(self) -> None:
        client = FakeStorageClient()
        path = "public/equipment/42/non_existent.jpg"

        with pytest.raises(ValidationFailedError) as exc:
            verify_storage_path_for_entity(
                storage_path=path,
                vendor_id=42,
                expected_purpose="equipment_image",
                storage=client,
            )
        assert "was not found in storage" in str(exc.value).lower()

    def test_verify_storage_path_exceeds_size(self) -> None:
        client = FakeStorageClient()
        path = "public/vendors/42/logo-large.png"
        client.seed_object(path, content_type="image/png", size_bytes=3 * 1024 * 1024)

        with pytest.raises(ValidationFailedError) as exc:
            verify_storage_path_for_entity(
                storage_path=path,
                vendor_id=42,
                expected_purpose="vendor_logo",
                storage=client,
            )
        assert "exceeds" in str(exc.value).lower()

    def test_fake_storage_signed_put_and_read_urls(self) -> None:
        client = FakeStorageClient()
        put_url, headers = client.generate_signed_upload_url(
            storage_path="public/equipment/42/test.jpg",
            content_type="image/jpeg",
        )
        assert "https://storage.googleapis.com/fake-rent4fraction.appspot.com/public/equipment/42/test.jpg" in put_url
        assert headers["Content-Type"] == "image/jpeg"

        read_url = client.generate_signed_read_url(
            storage_path="private/delivery-proofs/42/1/proof.jpg"
        )
        assert "https://storage.googleapis.com/fake-rent4fraction.appspot.com/private/delivery-proofs/42/1/proof.jpg" in read_url
