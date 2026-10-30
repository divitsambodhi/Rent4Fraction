from __future__ import annotations

import base64
import json
import logging
import os
from collections.abc import Callable

import firebase_admin
from firebase_admin import auth, credentials

from app.core.config import get_settings

logger = logging.getLogger("rent4fraction.firebase")

_firebase_app: firebase_admin.App | None = None


def init_firebase() -> firebase_admin.App | None:
    """
    Initialises the Firebase Admin SDK once at startup (lazily if credentials are absent).
    Supports:
    1. Local Firebase Auth Emulator (FIREBASE_AUTH_EMULATOR_HOST)
    2. Raw JSON or Base64 credentials string in env (FIREBASE_CREDENTIALS_JSON / FIREBASE_CREDENTIALS_BASE64)
    3. Google Service Account JSON file path (GOOGLE_APPLICATION_CREDENTIALS)
    4. Firebase Project ID (FIREBASE_PROJECT_ID)
    Returns the App instance if initialised, or None if credentials are absent.
    """
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    settings = get_settings()

    # 1. Check for Firebase Auth Emulator
    emulator_host = settings.FIREBASE_AUTH_EMULATOR_HOST or os.environ.get(
        "FIREBASE_AUTH_EMULATOR_HOST"
    )
    if emulator_host:
        os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = emulator_host
        project_id = (
            settings.FIREBASE_PROJECT_ID
            or os.environ.get("FIREBASE_PROJECT_ID")
            or "rent4fraction-dev"
        )
        logger.info(
            "Initialising Firebase Admin SDK with Auth Emulator at %s (project: %s)",
            emulator_host,
            project_id,
        )
        try:
            _firebase_app = firebase_admin.get_app()
        except ValueError:
            _firebase_app = firebase_admin.initialize_app(options={"projectId": project_id})
        return _firebase_app

    # 2. Check for real service account credentials
    real_project_id: str | None = settings.FIREBASE_PROJECT_ID or os.environ.get(
        "FIREBASE_PROJECT_ID"
    )

    cred_json_str = os.environ.get("FIREBASE_CREDENTIALS_JSON")
    cred_b64_str = os.environ.get("FIREBASE_CREDENTIALS_BASE64")

    if cred_b64_str and not cred_json_str:
        try:
            cred_json_str = base64.b64decode(cred_b64_str.strip()).decode("utf-8")
        except Exception as e:
            logger.error("Failed to decode FIREBASE_CREDENTIALS_BASE64: %s", e)

    if cred_json_str:
        try:
            cert_dict = json.loads(cred_json_str)
            try:
                _firebase_app = firebase_admin.get_app()
            except ValueError:
                cred = credentials.Certificate(cert_dict)
                options = {"projectId": real_project_id} if real_project_id else None
                _firebase_app = firebase_admin.initialize_app(cred, options=options)
            logger.info("Initialised Firebase Admin SDK from environment credentials.")
            return _firebase_app
        except Exception as e:
            logger.error("Failed to initialize Firebase Admin SDK from credentials JSON: %s", e)

    cred_path = settings.GOOGLE_APPLICATION_CREDENTIALS or os.environ.get(
        "GOOGLE_APPLICATION_CREDENTIALS"
    )

    if cred_path and os.path.exists(cred_path):
        logger.info("Initialising Firebase Admin SDK with credentials file: %s", cred_path)
        try:
            _firebase_app = firebase_admin.get_app()
        except ValueError:
            cred = credentials.Certificate(cred_path)
            options = {"projectId": real_project_id} if real_project_id else None
            _firebase_app = firebase_admin.initialize_app(cred, options=options)
        return _firebase_app

    # 3. Credentials not configured yet
    logger.warning(
        "Firebase credentials not provided. Auth verification will fail until credentials "
        "or FIREBASE_AUTH_EMULATOR_HOST are configured."
    )
    return None


def get_firebase_app() -> firebase_admin.App:
    """
    Retrieves the initialized Firebase Admin App singleton.
    Fails fast with a clear diagnostic message if credentials are not configured.
    """
    global _firebase_app
    if _firebase_app is None:
        _firebase_app = init_firebase()
    if _firebase_app is None:
        raise RuntimeError(
            "Firebase Admin SDK is not initialized. Please configure GOOGLE_APPLICATION_CREDENTIALS "
            "with a valid service account JSON path, or set FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 "
            "for local development."
        )
    return _firebase_app


def _default_set_firebase_user_disabled(uid: str, disabled: bool) -> None:
    """Production implementation: updates disabled state via Firebase Admin SDK."""
    get_firebase_app()
    auth.update_user(uid, disabled=disabled)


# Mockable seam for set_firebase_user_disabled (swapped during unit testing)
_user_disabler: Callable[[str, bool], None] = _default_set_firebase_user_disabled


def set_firebase_user_disabled(uid: str, disabled: bool) -> None:
    """
    Updates the Firebase user's disabled status (used for deactivation and reactivation flows).
    Delegates to the configured _user_disabler seam.
    """
    _user_disabler(uid, disabled)


def override_user_disabler(handler: Callable[[str, bool], None] | None) -> None:
    """Test helper to intercept set_firebase_user_disabled calls."""
    global _user_disabler
    _user_disabler = handler if handler is not None else _default_set_firebase_user_disabled
