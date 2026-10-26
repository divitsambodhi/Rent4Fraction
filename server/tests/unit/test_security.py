from __future__ import annotations

import pytest

from app.core.deps import CurrentUser, ensure_owner
from app.core.errors import AuthMissingTokenError, ForbiddenRoleError
from app.core.security import get_token


@pytest.mark.unit
def test_get_token_missing_header() -> None:
    with pytest.raises(AuthMissingTokenError) as exc_info:
        get_token(authorization=None)
    assert exc_info.value.code == "auth_missing_token"
    assert exc_info.value.status_code == 401


@pytest.mark.unit
def test_get_token_malformed_headers() -> None:
    # Missing Bearer prefix
    with pytest.raises(AuthMissingTokenError):
        get_token(authorization="Token 12345")

    # Extra parts
    with pytest.raises(AuthMissingTokenError):
        get_token(authorization="Bearer token extra")

    # Empty token
    with pytest.raises(AuthMissingTokenError):
        get_token(authorization="Bearer ")


@pytest.mark.unit
def test_get_token_valid() -> None:
    token = get_token(authorization="Bearer valid-jwt-token-string")
    assert token == "valid-jwt-token-string"

    # Case insensitive 'bearer'
    token_lower = get_token(authorization="bearer lowercase-prefix-token")
    assert token_lower == "lowercase-prefix-token"


@pytest.mark.unit
def test_ensure_owner_allows_resource_owner() -> None:
    user = CurrentUser(
        user_id=42,
        firebase_uid="uid-42",
        role="customer",
        name="Alice",
        email="alice@example.com",
        email_verified=True,
        is_active=True,
    )
    # Matching resource_user_id succeeds without raising
    ensure_owner(resource_user_id=42, current_user=user)


@pytest.mark.unit
def test_ensure_owner_allows_admin() -> None:
    admin = CurrentUser(
        user_id=1,
        firebase_uid="admin-uid",
        role="admin",
        name="Admin",
        email="admin@example.com",
        email_verified=True,
        is_active=True,
    )
    # Admin can access any resource
    ensure_owner(resource_user_id=999, current_user=admin)


@pytest.mark.unit
def test_ensure_owner_rejects_non_owner() -> None:
    user = CurrentUser(
        user_id=42,
        firebase_uid="uid-42",
        role="customer",
        name="Alice",
        email="alice@example.com",
        email_verified=True,
        is_active=True,
    )
    # Different resource_user_id raises ForbiddenRoleError (403 forbidden_role)
    with pytest.raises(ForbiddenRoleError) as exc_info:
        ensure_owner(resource_user_id=99, current_user=user)
    assert exc_info.value.code == "forbidden_role"
    assert exc_info.value.status_code == 403
