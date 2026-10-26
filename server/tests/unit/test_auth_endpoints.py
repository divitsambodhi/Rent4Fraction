from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_token_verifier
from app.main import create_app
from app.models.accounts import User, UserRole, VendorApprovalStatus
from app.models.platform import AuditLog
from app.models.social import Notification


@pytest.fixture
def auth_client(db_session: Session) -> tuple[TestClient, dict[str, Any]]:
    """Creates a test client wired to the in-memory db_session with fake token claims."""
    app = create_app()

    fake_claims: dict[str, Any] = {
        "uid": "fb-test-uid-100",
        "email": "divit@example.com",
        "email_verified": False,
    }

    def fake_verifier(_token: str, _check_revoked: bool = False) -> dict[str, Any]:
        return fake_claims

    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_token_verifier] = lambda: fake_verifier

    client = TestClient(app)
    return client, fake_claims


@pytest.mark.unit
def test_customer_registration_success(
    auth_client: tuple[TestClient, dict[str, Any]], db_session: Session
) -> None:
    client, fake_claims = auth_client
    fake_claims["uid"] = "fb-customer-1"
    fake_claims["email"] = "customer1@rent4fraction.com"
    fake_claims["email_verified"] = False

    payload = {
        "role": "customer",
        "profile": {
            "name": "Divit Sharma",
            "phone": "9876543210",
        },
    }

    res = client.post(
        "/api/v1/auth/register",
        json=payload,
        headers={"Authorization": "Bearer mock-token"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "customer1@rent4fraction.com"
    assert data["name"] == "Divit Sharma"
    assert data["role"] == "customer"
    assert data["avatarInitials"] == "DS"
    assert data["email_verified"] is False
    assert data["vendor"] is None

    # Check DB record
    user = db_session.query(User).filter(User.firebase_uid == "fb-customer-1").first()
    assert user is not None
    assert user.role == UserRole.customer
    assert user.email == "customer1@rent4fraction.com"

    # Check audit log
    audit = db_session.query(AuditLog).filter(AuditLog.entity_id == user.user_id).first()
    assert audit is not None
    assert audit.action == "customer_registered"


@pytest.mark.unit
def test_vendor_registration_creates_profile_and_notification(
    auth_client: tuple[TestClient, dict[str, Any]], db_session: Session
) -> None:
    client, fake_claims = auth_client
    fake_claims["uid"] = "fb-vendor-1"
    fake_claims["email"] = "vendor1@rent4fraction.com"
    fake_claims["email_verified"] = True

    # Pre-seed an admin so notification dispatch can be tested
    admin = User(
        firebase_uid="admin-fb-1",
        email="admin@rent4fraction.com",
        name="Platform Admin",
        role=UserRole.admin,
        is_active=1,
    )
    db_session.add(admin)
    db_session.commit()

    payload = {
        "role": "vendor",
        "profile": {
            "name": "Vendor Boss",
            "phone": "9820012345",
        },
        "business": {
            "business_name": "SoundMaster Mumbai",
            "address": "42 Linking Road",
            "city": "Mumbai",
            "phone": "9820012345",
            "gst_number": "27ABCDE1234F1Z5",
            "description": "Premium audio rentals",
        },
    }

    res = client.post(
        "/api/v1/auth/register",
        json=payload,
        headers={"Authorization": "Bearer mock-token"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "vendor"
    assert data["email_verified"] is True
    assert data["vendor"] is not None
    assert data["vendor"]["business_name"] == "SoundMaster Mumbai"
    assert data["vendor"]["approval_status"] == "pending"

    # Verify DB state
    user = db_session.query(User).filter(User.firebase_uid == "fb-vendor-1").first()
    assert user is not None
    assert user.vendor_profile is not None
    assert user.vendor_profile.approval_status == VendorApprovalStatus.pending

    # Verify admin notification
    notif = db_session.query(Notification).filter(Notification.user_id == admin.user_id).first()
    assert notif is not None
    assert notif.type == "vendor_application"
    assert "SoundMaster Mumbai" in notif.message

    # Verify audit log
    audit = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "vendor_registered", AuditLog.actor_user_id == user.user_id)
        .first()
    )
    assert audit is not None


@pytest.mark.unit
def test_register_idempotency_same_firebase_uid(
    auth_client: tuple[TestClient, dict[str, Any]], db_session: Session
) -> None:
    client, fake_claims = auth_client
    fake_claims["uid"] = "fb-repeat-uid"
    fake_claims["email"] = "repeat@test.com"

    payload = {
        "role": "customer",
        "profile": {"name": "Repeat User", "phone": "9876543210"},
    }

    # First call
    res1 = client.post(
        "/api/v1/auth/register", json=payload, headers={"Authorization": "Bearer token"}
    )
    assert res1.status_code == 200
    user_id_1 = res1.json()["user_id"]

    # Second call with same firebase_uid
    res2 = client.post(
        "/api/v1/auth/register", json=payload, headers={"Authorization": "Bearer token"}
    )
    assert res2.status_code == 200
    user_id_2 = res2.json()["user_id"]

    # Same user ID returned idempotently
    assert user_id_1 == user_id_2
    assert db_session.query(User).filter(User.firebase_uid == "fb-repeat-uid").count() == 1


@pytest.mark.unit
def test_register_email_conflict_different_uid(
    auth_client: tuple[TestClient, dict[str, Any]],
) -> None:
    client, fake_claims = auth_client

    # User 1 registers with email
    fake_claims["uid"] = "uid-1"
    fake_claims["email"] = "conflict@test.com"
    client.post(
        "/api/v1/auth/register",
        json={"role": "customer", "profile": {"name": "User One"}},
        headers={"Authorization": "Bearer token"},
    )

    # User 2 tries to register with same email under different UID
    fake_claims["uid"] = "uid-2"
    fake_claims["email"] = "conflict@test.com"
    res = client.post(
        "/api/v1/auth/register",
        json={"role": "customer", "profile": {"name": "User Two"}},
        headers={"Authorization": "Bearer token"},
    )
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "email_already_registered"


@pytest.mark.unit
def test_register_role_escalation_rejected_by_api(
    auth_client: tuple[TestClient, dict[str, Any]],
) -> None:
    client, _ = auth_client
    # Attempt to supply role 'admin'
    res = client.post(
        "/api/v1/auth/register",
        json={"role": "admin", "profile": {"name": "Hacker"}},
        headers={"Authorization": "Bearer token"},
    )
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "validation_failed"


@pytest.mark.unit
def test_register_missing_email_in_token_rejected(
    auth_client: tuple[TestClient, dict[str, Any]],
) -> None:
    client, fake_claims = auth_client
    fake_claims["uid"] = "no-email-uid"
    fake_claims["email"] = None  # Token missing email

    res = client.post(
        "/api/v1/auth/register",
        json={"role": "customer", "profile": {"name": "No Email"}},
        headers={"Authorization": "Bearer token"},
    )
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "validation_failed"


@pytest.mark.unit
def test_get_me_syncs_email_verified_and_throttles_last_login(
    auth_client: tuple[TestClient, dict[str, Any]], db_session: Session
) -> None:
    client, fake_claims = auth_client

    # Setup user in DB with email_verified = 0 and last_login 15 minutes ago
    ten_minutes_ago = datetime.now(UTC) - timedelta(minutes=15)
    user = User(
        firebase_uid="fb-sync-uid",
        name="Sync Tester",
        email="sync@test.com",
        role=UserRole.customer,
        email_verified=0,
        is_active=1,
        last_login=ten_minutes_ago.replace(tzinfo=None),
    )
    db_session.add(user)
    db_session.commit()

    # Token now has email_verified = True
    fake_claims["uid"] = "fb-sync-uid"
    fake_claims["email"] = "sync@test.com"
    fake_claims["email_verified"] = True

    res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer token"})
    assert res.status_code == 200
    data = res.json()
    assert data["email_verified"] is True
    assert data["avatarInitials"] == "ST"

    # Verify DB was updated
    db_session.refresh(user)
    assert user.email_verified == 1
    first_last_login = user.last_login
    assert first_last_login is not None

    # Immediate second call within 10 minutes should NOT update last_login
    res2 = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer token"})
    assert res2.status_code == 200
    db_session.refresh(user)
    assert user.last_login == first_last_login


@pytest.mark.unit
def test_get_me_deactivated_account_rejected(
    auth_client: tuple[TestClient, dict[str, Any]], db_session: Session
) -> None:
    client, fake_claims = auth_client
    user = User(
        firebase_uid="fb-deactivated-uid",
        name="Deactivated Person",
        email="deact@test.com",
        role=UserRole.customer,
        email_verified=1,
        is_active=0,  # Deactivated
    )
    db_session.add(user)
    db_session.commit()

    fake_claims["uid"] = "fb-deactivated-uid"
    res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer token"})
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "account_deactivated"
