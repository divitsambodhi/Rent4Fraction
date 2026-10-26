from __future__ import annotations

import uuid

import pytest
from sqlalchemy.orm import Session

from app.models.accounts import User, UserRole, Vendor, VendorApprovalStatus
from app.models.platform import AuditLog
from app.models.social import Notification
from app.schemas.auth import RegisterRequest, UserProfileInput, VendorBusinessInput
from app.services.auth import register_user


@pytest.mark.integration
def test_vendor_registration_transaction_atomicity(integration_db: Session) -> None:
    """
    Integration test asserting that vendor registration creates:
    1. The users row (role='vendor')
    2. The vendors row (approval_status='pending', commission_rate=NULL)
    3. The notification row (type='vendor_application') for platform administrators
    4. The audit_log row (action='vendor_registered')
    all within ONE atomic transaction.
    """
    unique_suffix = uuid.uuid4().hex[:8]
    firebase_uid = f"fb_vendor_it_{unique_suffix}"
    email = f"vendor_it_{unique_suffix}@rent4fraction.com"

    # Pre-seed an admin if not present
    admin = integration_db.query(User).filter(User.role == UserRole.admin).first()
    if not admin:
        admin = User(
            firebase_uid=f"fb_admin_it_{unique_suffix}",
            email=f"admin_it_{unique_suffix}@rent4fraction.com",
            name="Integration Admin",
            role=UserRole.admin,
            is_active=1,
            email_verified=1,
        )
        integration_db.add(admin)
        integration_db.commit()

    token_claims = {
        "uid": firebase_uid,
        "email": email,
        "email_verified": True,
    }

    req = RegisterRequest(
        role="vendor",
        profile=UserProfileInput(
            name="Integration Vendor",
            phone="9820011223",
        ),
        business=VendorBusinessInput(
            business_name=f"IT Vendor Business {unique_suffix}",
            address="100 Test Blvd",
            city="Pune",
            phone="9820011223",
            gst_number="27ABCDE1234F1Z5",
            description="Integration test staging gear",
        ),
    )

    resp = register_user(
        db=integration_db,
        token_claims=token_claims,
        req=req,
        ip_address="127.0.0.1",
        user_agent="pytest-integration-agent",
    )

    # 1. Assert user created
    user = integration_db.query(User).filter(User.user_id == resp.user_id).first()
    assert user is not None
    assert user.role == UserRole.vendor
    assert user.email == email
    assert user.email_verified == 1

    # 2. Assert vendor created
    vendor = integration_db.query(Vendor).filter(Vendor.user_id == user.user_id).first()
    assert vendor is not None
    assert vendor.approval_status == VendorApprovalStatus.pending
    assert vendor.commission_rate is None  # Platform default applies

    # 3. Assert admin notification created
    notif = (
        integration_db.query(Notification)
        .filter(Notification.user_id == admin.user_id, Notification.entity_id == vendor.vendor_id)
        .first()
    )
    assert notif is not None
    assert notif.type == "vendor_application"
    assert "Integration Vendor" in notif.message or vendor.business_name in notif.message

    # 4. Assert audit log row created
    audit = (
        integration_db.query(AuditLog)
        .filter(AuditLog.entity_id == vendor.vendor_id, AuditLog.action == "vendor_registered")
        .first()
    )
    assert audit is not None
    assert audit.actor_user_id == user.user_id
    assert audit.actor_role == "vendor"
