from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.deps import CurrentUser, require_vendor_or_admin
from app.core.errors import ForbiddenError, ValidationFailedError
from app.integrations.storage import (
    UploadPurpose,
    build_storage_path,
    get_storage_client,
    sanitize_filename,
    validate_upload_request,
)

router = APIRouter(prefix="/api/v1/uploads", tags=["Uploads"])


class SignUploadRequest(BaseModel):
    purpose: UploadPurpose
    content_type: str = Field(..., description="MIME type, e.g. 'image/jpeg', 'image/png', 'image/webp'")
    size_bytes: int = Field(..., ge=1, description="Size of file in bytes")
    filename: str = Field(..., min_length=1, description="Original filename")
    vendor_order_id: int | None = Field(default=None, description="Required for delivery_proof")
    vendor_id: int | None = Field(default=None, description="Required if admin uploading on behalf of vendor")


class SignUploadResponse(BaseModel):
    upload_url: str
    storage_path: str
    expires_in_seconds: int
    headers: dict[str, str]


@router.post(
    "/sign",
    response_model=SignUploadResponse,
    operation_id="sign_upload_url",
    summary="Generate a short-lived V4 signed upload PUT URL for direct browser storage upload",
)
def sign_upload(
    payload: SignUploadRequest,
    current_user: CurrentUser = Depends(require_vendor_or_admin),
) -> SignUploadResponse:
    """
    Vendor or admin uploads:
    - Validates image content types (jpeg, png, webp).
    - Enforces size limit (2 MB for vendor_logo, 5 MB for others).
    - Pending vendors may only upload a vendor_logo.
    - Path is chosen server-side under the vendor's private or public prefix.
    """
    # Resolve vendor_id and vendor status
    if current_user.role == "vendor":
        if not current_user.vendor:
            raise ForbiddenError("No vendor profile associated with this account.")
        vendor_id = current_user.vendor.vendor_id
        vendor_status = current_user.vendor.approval_status
    else:
        # Admin
        if not payload.vendor_id:
            raise ValidationFailedError("Admin must specify vendor_id for signed uploads.")
        vendor_id = payload.vendor_id
        vendor_status = "approved"

    validate_upload_request(
        purpose=payload.purpose,
        content_type=payload.content_type,
        size_bytes=payload.size_bytes,
        vendor_approval_status=vendor_status,
    )

    clean_filename = sanitize_filename(payload.filename)
    storage_path = build_storage_path(
        purpose=payload.purpose,
        vendor_id=vendor_id,
        filename=clean_filename,
        content_type=payload.content_type,
        vendor_order_id=payload.vendor_order_id,
    )

    storage = get_storage_client()
    expires_in = 900  # 15 minutes
    upload_url, headers = storage.generate_signed_upload_url(
        storage_path=storage_path,
        content_type=payload.content_type,
        expires_in_seconds=expires_in,
    )

    return SignUploadResponse(
        upload_url=upload_url,
        storage_path=storage_path,
        expires_in_seconds=expires_in,
        headers=headers,
    )
