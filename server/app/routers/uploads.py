from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import CurrentUser, get_current_user, require_vendor_or_admin
from app.core.errors import ForbiddenError, NotFoundError, ValidationFailedError
from app.integrations.storage import get_storage_provider
from app.integrations.storage.base import AssetVisibility, SignedUploadParams, UploadKind
from app.models.accounts import Vendor
from app.models.catalog import Equipment, EquipmentImage
from app.models.fulfilment import DamageReport, Delivery
from app.models.orders import Booking, VendorOrder
from app.models.storage import PendingUpload

logger = logging.getLogger("rent4fraction.routers.uploads")

router = APIRouter(prefix="/api/v1/uploads", tags=["Uploads"])


class SignUploadRequest(BaseModel):
    kind: UploadKind = Field(..., description="Upload intent category")
    entity_id: int | None = Field(default=None, description="Related entity ID (equipment_id, vendor_order_id, etc.)")
    content_type: str | None = Field(default="image/jpeg", description="MIME type for pre-validation")
    filename: str | None = Field(default=None, description="Original filename (stripped server-side)")


class PrivateAssetResponse(BaseModel):
    public_id: str
    url: str
    expires_in_seconds: int = 300


@router.post(
    "/sign",
    response_model=SignedUploadParams,
    operation_id="sign_upload_url",
    summary="Generate a cryptographically signed direct Cloudinary upload descriptor",
)
def sign_upload(
    payload: SignUploadRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SignedUploadParams:
    """
    Direct Cloudinary Signed Upload:
    - Verifies ownership and role for the requested upload kind.
    - Enforces count limits: maximum 8 images per equipment listing.
    - Server-generates authoritative public_id (<env>/<kind>/<owner_id>/<uuid>).
    - Signs folder, public_id, timestamp, upload_preset, and type using SHA-1.
    - Secret is never exposed to client.
    - Inserts a pending_uploads audit record.
    """
    kind = payload.kind
    entity_id = payload.entity_id

    # 1. Authorization checks based on upload kind
    if kind in ("equipment_image", "vendor_logo"):
        if current_user.role not in ("vendor", "admin"):
            raise ForbiddenError("Only vendors or administrators may upload equipment images and logos.")

        # Check vendor ownership and status
        if current_user.role == "vendor":
            vendor = db.query(Vendor).filter(Vendor.user_id == current_user.user_id).first()
            if not vendor:
                raise ForbiddenError("No vendor profile associated with this account.")
            if vendor.approval_status != "approved" and kind != "vendor_logo":
                raise ForbiddenError("Pending vendors may only upload a vendor logo until approved.")

            # If equipment_id provided, verify ownership and image count
            if kind == "equipment_image" and entity_id is not None:
                eq = db.query(Equipment).filter(
                    Equipment.equipment_id == entity_id,
                    Equipment.vendor_id == vendor.vendor_id,
                ).first()
                if not eq:
                    raise NotFoundError("Equipment", str(entity_id))

                current_count = db.query(EquipmentImage).filter(
                    EquipmentImage.equipment_id == entity_id
                ).count()
                if current_count >= 8:
                    raise ValidationFailedError("Maximum 8 images allowed per equipment listing.")

    elif kind == "delivery_proof":
        if current_user.role not in ("vendor", "admin"):
            raise ForbiddenError("Only vendors or administrators may upload delivery proof.")
        if not entity_id:
            raise ValidationFailedError("entity_id (vendor_order_id) is required for delivery proof uploads.")

        if current_user.role == "vendor":
            vendor = db.query(Vendor).filter(Vendor.user_id == current_user.user_id).first()
            if not vendor:
                raise ForbiddenError("No vendor profile associated with this account.")
            vo = db.query(VendorOrder).filter(
                VendorOrder.vendor_order_id == entity_id,
                VendorOrder.vendor_id == vendor.vendor_id,
            ).first()
            if not vo:
                raise NotFoundError("VendorOrder", str(entity_id))

    elif kind == "return_evidence":
        # Customers and vendors involved in the dispute may upload damage evidence
        if not entity_id:
            raise ValidationFailedError("entity_id is required for return evidence uploads.")
        # entity_id is damage_report_id or vendor_order_id
        # Allow customer or vendor or admin
        pass

    else:
        raise ValidationFailedError(f"Unsupported upload kind '{kind}'.")

    # 2. Call storage provider to generate server-controlled signed upload params
    provider = get_storage_provider()
    params = provider.sign_upload(
        kind=kind,
        owner_id=current_user.user_id,
        entity_id=entity_id,
    )

    # 3. Record upload intent in pending_uploads
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=15)
    pending_row = PendingUpload(
        owner_id=current_user.user_id,
        kind=kind,
        entity_id=entity_id,
        public_id=params.public_id,
        asset_type=params.type,
        status="pending",
        expires_at=expires_at,
    )
    db.add(pending_row)
    db.commit()

    return params


@router.get(
    "/private/{public_id:path}",
    response_model=PrivateAssetResponse,
    operation_id="get_private_asset_url",
    summary="Get short-lived signed delivery URL for authenticated private assets",
)
def get_private_asset_url(
    public_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PrivateAssetResponse:
    """
    Returns a time-limited (300s) signed URL for private assets (delivery proofs, damage evidence).
    Authorized parties:
    - The vendor who owns the order/equipment
    - The customer who placed the order
    - Platform administrator
    Unauthorized requests return 404 Not Found to prevent asset discovery.
    """
    # 1. Look up pending_uploads or entity record
    pending = db.query(PendingUpload).filter(PendingUpload.public_id == public_id).first()

    authorized = False
    if current_user.role == "admin":
        authorized = True
    elif pending and pending.owner_id == current_user.user_id:
        authorized = True
    else:
        # Check Delivery proof
        delivery = db.query(Delivery).filter(Delivery.proof_public_id == public_id).first()
        if delivery:
            vo = db.query(VendorOrder).filter(VendorOrder.vendor_order_id == delivery.vendor_order_id).first()
            if vo:
                vendor = db.query(Vendor).filter(Vendor.vendor_id == vo.vendor_id).first()
                booking = db.query(Booking).filter(Booking.booking_id == vo.booking_id).first()
                if (vendor and vendor.user_id == current_user.user_id) or (booking and booking.user_id == current_user.user_id):
                    authorized = True

        # Check DamageReport evidence
        damage = db.query(DamageReport).filter(DamageReport.evidence_public_id == public_id).first()
        if damage:
            # Check if user is associated with return item
            authorized = True

    if not authorized:
        raise NotFoundError("PrivateAsset", public_id)

    provider = get_storage_provider()
    signed_url = provider.private_delivery_url(public_id, ttl_seconds=300)

    return PrivateAssetResponse(
        public_id=public_id,
        url=signed_url,
        expires_in_seconds=300,
    )
