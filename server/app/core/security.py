from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth

from app.core.errors import (
    AuthInvalidTokenError,
    AuthMissingTokenError,
    AuthRevokedError,
    AuthTokenExpiredError,
)
from app.core.firebase import get_firebase_app

logger = logging.getLogger("rent4fraction.security")

# Type alias for token verification callables
TokenVerifier = Callable[[str, bool], dict[str, Any]]

http_bearer = HTTPBearer(auto_error=False)


def get_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
    authorization: str | None = Header(None),
) -> str:
    """
    Extracts Bearer token from HTTPBearer security scheme or HTTP Authorization header.
    Raises 401 auth_missing_token if header is absent, malformed, or empty.
    """
    if credentials and hasattr(credentials, "credentials") and credentials.credentials.strip():
        return credentials.credentials.strip()

    if not authorization:
        raise AuthMissingTokenError(
            "Authentication token is missing. Please provide Authorization: Bearer <token>"
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise AuthMissingTokenError("Authorization header is malformed. Expected 'Bearer <token>'")

    return parts[1].strip()


def verify_firebase_token(token: str, check_revoked: bool = False) -> dict[str, Any]:
    """
    Wraps firebase_admin.auth.verify_id_token.
    Maps Firebase exceptions to unified domain errors without leaking internal stack traces:
    - auth.ExpiredIdTokenError -> 401 auth_token_expired
    - auth.RevokedIdTokenError -> 401 auth_revoked
    - InvalidIdTokenError / others -> 401 auth_invalid_token
    """
    get_firebase_app()
    try:
        claims = auth.verify_id_token(token, check_revoked=check_revoked)
        return dict(claims)
    except auth.ExpiredIdTokenError as e:
        logger.info("Token verification failed: token expired")
        raise AuthTokenExpiredError(
            "Authentication token has expired. Please refresh your session."
        ) from e
    except auth.RevokedIdTokenError as e:
        logger.warning("Token verification failed: token revoked")
        raise AuthRevokedError(
            "Authentication token has been revoked. Please re-authenticate."
        ) from e
    except Exception as e:
        logger.info("Token verification failed: invalid token (%s)", type(e).__name__)
        raise AuthInvalidTokenError("Authentication token is invalid.") from e


def get_token_verifier() -> TokenVerifier:
    """
    FastAPI dependency returning the active token verifier.
    Tests override this dependency to provide fake token validation without calling Firebase.
    """
    return verify_firebase_token
