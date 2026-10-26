from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from firebase_admin import auth

from app.core.errors import (
    AuthInvalidTokenError,
    AuthRevokedError,
    AuthTokenExpiredError,
)
from app.core.firebase import (
    override_user_disabler,
    set_firebase_user_disabled,
)
from app.core.security import verify_firebase_token


@pytest.mark.unit
def test_set_firebase_user_disabled_mockable_seam() -> None:
    calls: list[tuple[str, bool]] = []

    def fake_disabler(uid: str, disabled: bool) -> None:
        calls.append((uid, disabled))

    override_user_disabler(fake_disabler)
    try:
        set_firebase_user_disabled("test-uid-123", True)
        set_firebase_user_disabled("test-uid-456", False)

        assert calls == [("test-uid-123", True), ("test-uid-456", False)]
    finally:
        override_user_disabler(None)


@pytest.mark.unit
def test_verify_firebase_token_maps_expired() -> None:
    with (
        patch("app.core.security.get_firebase_app", return_value=MagicMock()),
        patch(
            "firebase_admin.auth.verify_id_token",
            side_effect=auth.ExpiredIdTokenError(
                "Token has expired", Exception("jwt token has expired")
            ),
        ),
    ):
        with pytest.raises(AuthTokenExpiredError) as exc_info:
            verify_firebase_token("expired_token")
        assert exc_info.value.code == "auth_token_expired"
        assert exc_info.value.status_code == 401


@pytest.mark.unit
def test_verify_firebase_token_maps_revoked() -> None:
    with (
        patch("app.core.security.get_firebase_app", return_value=MagicMock()),
        patch(
            "firebase_admin.auth.verify_id_token",
            side_effect=auth.RevokedIdTokenError("Token revoked"),
        ),
    ):
        with pytest.raises(AuthRevokedError) as exc_info:
            verify_firebase_token("revoked_token", check_revoked=True)
        assert exc_info.value.code == "auth_revoked"
        assert exc_info.value.status_code == 401


@pytest.mark.unit
def test_verify_firebase_token_maps_invalid() -> None:
    with (
        patch("app.core.security.get_firebase_app", return_value=MagicMock()),
        patch(
            "firebase_admin.auth.verify_id_token",
            side_effect=auth.InvalidIdTokenError("Malformed token"),
        ),
    ):
        with pytest.raises(AuthInvalidTokenError) as exc_info:
            verify_firebase_token("bad_token")
        assert exc_info.value.code == "auth_invalid_token"
        assert exc_info.value.status_code == 401


@pytest.mark.unit
def test_verify_firebase_token_success() -> None:
    mock_claims = {"uid": "user-123", "email": "test@example.com", "email_verified": True}
    with (
        patch("app.core.security.get_firebase_app", return_value=MagicMock()),
        patch("firebase_admin.auth.verify_id_token", return_value=mock_claims),
    ):
        claims = verify_firebase_token("valid_token")
        assert claims["uid"] == "user-123"
        assert claims["email"] == "test@example.com"
        assert claims["email_verified"] is True
