from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.core.db import transaction
from app.core.errors import EmailAlreadyRegisteredError, ValidationFailedError
from app.models.accounts import User, UserRole, Vendor, VendorApprovalStatus
from app.models.platform import AuditLog
from app.models.social import Notification
from app.schemas.auth import (
    AuthUserResponse,
    RegisterRequest,
    VendorProfileResponse,
    compute_avatar_initials,
)

logger = logging.getLogger("rent4fraction.auth_service")


def build_auth_user_response(user: User) -> AuthUserResponse:
    """Builds frontend-compatible AuthUser response object from database User entity."""
    vendor_resp: VendorProfileResponse | None = None
    if user.role == UserRole.vendor and user.vendor_profile:
        vp = user.vendor_profile
        vendor_resp = VendorProfileResponse(
            vendor_id=vp.vendor_id,
            business_name=vp.business_name,
            approval_status=(
                vp.approval_status.value
                if hasattr(vp.approval_status, "value")
                else str(vp.approval_status)
            ),
            commission_rate=float(vp.commission_rate) if vp.commission_rate is not None else None,
            rejection_reason=vp.rejection_reason,
        )

    return AuthUserResponse(
        user_id=user.user_id,
        firebase_uid=user.firebase_uid,
        name=user.name,
        email=user.email,
        phone=user.phone,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        avatar_initials=compute_avatar_initials(user.name),
        email_verified=bool(user.email_verified),
        status="active" if user.is_active else "deactivated",
        joined_at=user.created_at.isoformat() if user.created_at else None,
        last_login=user.last_login.isoformat() if user.last_login else None,
        vendor=vendor_resp,
    )


def register_user(
    db: Session,
    token_claims: dict[str, Any],
    req: RegisterRequest,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuthUserResponse:
    """
    Registers a new user in the database following client-side Firebase Auth sign-up.

    Invariants:
    1. Email is taken directly from the verified Firebase ID token (never from request body).
    2. IDEMPOTENT: If user already exists for this firebase_uid, returns existing user (200).
    3. CONFLICT: If email belongs to a different firebase_uid, raises 409 email_already_registered.
    4. ATOMIC: Creates user, vendor (if role=vendor), admin notifications, and audit log in ONE transaction.
    """
    firebase_uid = token_claims.get("uid")
    if not firebase_uid:
        raise ValidationFailedError("Firebase token payload missing 'uid'")

    email = token_claims.get("email")
    if not email or not str(email).strip():
        raise ValidationFailedError(
            "Firebase token does not contain a valid email address. An email is required to register."
        )
    email = str(email).strip().lower()

    # 1. Check idempotency: does this firebase_uid already exist?
    existing_by_uid = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if existing_by_uid:
        logger.info(
            "Idempotent registration: user with firebase_uid %s already registered (user_id=%s)",
            firebase_uid,
            existing_by_uid.user_id,
        )
        return build_auth_user_response(existing_by_uid)

    # 2. Check conflict: does this email belong to a different firebase_uid?
    existing_by_email = db.query(User).filter(User.email == email).first()
    if existing_by_email:
        logger.warning(
            "Registration conflict: email '%s' already registered to firebase_uid '%s'",
            email,
            existing_by_email.firebase_uid,
        )
        raise EmailAlreadyRegisteredError(
            f"An account with email '{email}' is already registered. Please log in instead."
        )

    # 3. Create user and vendor profile atomically in ONE transaction
    token_email_verified = bool(token_claims.get("email_verified", False))
    role_enum = UserRole(req.role)

    with transaction(db):
        user = User(
            firebase_uid=firebase_uid,
            name=req.profile.name,
            email=email,
            phone=req.profile.phone,
            role=role_enum,
            email_verified=1 if token_email_verified else 0,
            is_active=1,
        )
        db.add(user)
        db.flush()  # Assigns user.user_id

        if req.role == "vendor":
            assert req.business is not None, "Vendor business data required"
            # Format combined address if city provided
            vendor_address = f"{req.business.address}, {req.business.city}"
            vendor = Vendor(
                user_id=user.user_id,
                business_name=req.business.business_name,
                description=req.business.description,
                address=vendor_address,
                phone=req.business.phone,
                gst_number=req.business.gst_number,
                approval_status=VendorApprovalStatus.pending,
                commission_rate=None,  # Platform default applies
            )
            db.add(vendor)
            db.flush()  # Assigns vendor.vendor_id

            # Create notification for all platform administrators
            admin_users = (
                db.query(User).filter(User.role == UserRole.admin, User.is_active == 1).all()
            )
            for admin in admin_users:
                notif = Notification(
                    user_id=admin.user_id,
                    type="vendor_application",
                    title="New Vendor Application",
                    message=(
                        f"Vendor '{req.business.business_name}' has registered and is pending approval."
                    ),
                    entity_type="vendor",
                    entity_id=vendor.vendor_id,
                    is_read=0,
                )
                db.add(notif)

            # Record audit log row for vendor creation
            audit = AuditLog(
                actor_user_id=user.user_id,
                actor_role=user.role.value,
                action="vendor_registered",
                entity_type="vendor",
                entity_id=vendor.vendor_id,
                before_json=None,
                after_json={
                    "user_id": user.user_id,
                    "vendor_id": vendor.vendor_id,
                    "business_name": vendor.business_name,
                    "approval_status": "pending",
                },
                ip_address=ip_address,
                user_agent=user_agent,
            )
            db.add(audit)

        else:
            # Customer registration audit log
            audit = AuditLog(
                actor_user_id=user.user_id,
                actor_role=user.role.value,
                action="customer_registered",
                entity_type="user",
                entity_id=user.user_id,
                before_json=None,
                after_json={
                    "user_id": user.user_id,
                    "email": user.email,
                    "role": user.role.value,
                },
                ip_address=ip_address,
                user_agent=user_agent,
            )
            db.add(audit)

    db.refresh(user)
    return build_auth_user_response(user)
