from __future__ import annotations

import collections
import time
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

from fastapi import Depends, Header, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.core.errors import (
    AccountDeactivatedError,
    AuthInvalidTokenError,
    EmailNotVerifiedError,
    ForbiddenRoleError,
    RateLimitedError,
    UserNotRegisteredError,
    VendorNotApprovedError,
)
from app.core.security import TokenVerifier, get_token, get_token_verifier
from app.models.accounts import User, UserRole


# -----------------------------------------------------------------------------
# Current User Data Models
# -----------------------------------------------------------------------------
class CurrentVendor(BaseModel):
    vendor_id: int
    business_name: str
    approval_status: str
    commission_rate: float | None = None
    rejection_reason: str | None = None


class CurrentUser(BaseModel):
    user_id: int
    firebase_uid: str
    role: str
    name: str
    email: str
    phone: str | None = None
    email_verified: bool
    is_active: bool
    vendor: CurrentVendor | None = None


# -----------------------------------------------------------------------------
# Authentication Dependencies
# -----------------------------------------------------------------------------
def get_current_user(
    token: str = Depends(get_token),
    db: Session = Depends(get_db),
    verifier: TokenVerifier = Depends(get_token_verifier),
) -> CurrentUser:
    """
    Validates Firebase ID token and loads authoritative user record from the database.
    Enforces:
    - 403 user_not_registered if row missing in users table
    - 403 account_deactivated if is_active is 0
    - Synchronises email_verified from token claim if changed
    - Throttles last_login update to at most once every 10 minutes (600s)
    """
    token_claims = verifier(token, False)
    firebase_uid = token_claims.get("uid")
    if not firebase_uid:
        raise AuthInvalidTokenError("Token payload missing user identifier ('uid')")

    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if not user:
        raise UserNotRegisteredError("User is not registered. Please complete registration.")

    if not user.is_active:
        raise AccountDeactivatedError("This account has been deactivated. Please contact support.")

    # 1. Sync email_verified claim from Firebase if changed
    token_email_verified = bool(token_claims.get("email_verified", False))
    need_commit = False
    if token_email_verified and not user.email_verified:
        user.email_verified = 1
        need_commit = True

    # 2. Throttle last_login timestamp update (at most once every 10 minutes)
    now = datetime.now(UTC)
    if user.last_login is None:
        user.last_login = now
        need_commit = True
    else:
        last_login_dt = (
            user.last_login.replace(tzinfo=UTC)
            if user.last_login.tzinfo is None
            else user.last_login
        )
        if (now - last_login_dt).total_seconds() >= 600:
            user.last_login = now
            need_commit = True

    if need_commit:
        db.commit()
        db.refresh(user)

    # 3. Resolve vendor profile if role is vendor
    vendor_info: CurrentVendor | None = None
    if user.role == UserRole.vendor and user.vendor_profile:
        vp = user.vendor_profile
        vendor_info = CurrentVendor(
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

    return CurrentUser(
        user_id=user.user_id,
        firebase_uid=user.firebase_uid,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        name=user.name,
        email=user.email,
        phone=user.phone,
        email_verified=bool(user.email_verified),
        is_active=bool(user.is_active),
        vendor=vendor_info,
    )


def get_optional_user(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
    verifier: TokenVerifier = Depends(get_token_verifier),
) -> CurrentUser | None:
    """
    For public endpoints that personalize when a token is present.
    If the token is missing, invalid, or belongs to an unregistered/deactivated user,
    returns None without raising an error.
    """
    if not authorization:
        return None

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        return None

    token = parts[1].strip()
    try:
        claims = verifier(token, False)
        uid = claims.get("uid")
        if not uid:
            return None

        user = db.query(User).filter(User.firebase_uid == uid).first()
        if not user or not user.is_active:
            return None

        vendor_info: CurrentVendor | None = None
        if user.role == UserRole.vendor and user.vendor_profile:
            vp = user.vendor_profile
            vendor_info = CurrentVendor(
                vendor_id=vp.vendor_id,
                business_name=vp.business_name,
                approval_status=(
                    vp.approval_status.value
                    if hasattr(vp.approval_status, "value")
                    else str(vp.approval_status)
                ),
                commission_rate=(
                    float(vp.commission_rate) if vp.commission_rate is not None else None
                ),
                rejection_reason=vp.rejection_reason,
            )

        return CurrentUser(
            user_id=user.user_id,
            firebase_uid=user.firebase_uid,
            role=user.role.value if hasattr(user.role, "value") else str(user.role),
            name=user.name,
            email=user.email,
            phone=user.phone,
            email_verified=bool(user.email_verified),
            is_active=bool(user.is_active),
            vendor=vendor_info,
        )
    except Exception:
        return None


# -----------------------------------------------------------------------------
# Role Guards & Permissions
# -----------------------------------------------------------------------------
def require_roles(*allowed_roles: str) -> Callable[[CurrentUser], CurrentUser]:
    """Dependency factory checking if current_user.role is in allowed_roles."""

    def _guard(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in allowed_roles:
            raise ForbiddenRoleError(
                f"Access forbidden for role '{current_user.role}'. Required: {', '.join(allowed_roles)}"
            )
        return current_user

    return _guard


def require_customer(current_user: CurrentUser = Depends(require_roles("customer"))) -> CurrentUser:
    """Requires authenticated user with role 'customer'."""
    return current_user


def require_vendor(current_user: CurrentUser = Depends(require_roles("vendor"))) -> CurrentUser:
    """Requires authenticated user with role 'vendor' (any approval status)."""
    return current_user


def require_admin(current_user: CurrentUser = Depends(require_roles("admin"))) -> CurrentUser:
    """Requires authenticated user with role 'admin'."""
    return current_user


def require_vendor_or_admin(
    current_user: CurrentUser = Depends(require_roles("vendor", "admin")),
) -> CurrentUser:
    """Requires authenticated user with role 'vendor' or 'admin'."""
    return current_user


def require_customer_or_admin(
    current_user: CurrentUser = Depends(require_roles("customer", "admin")),
) -> CurrentUser:
    """Requires authenticated user with role 'customer' or 'admin'."""
    return current_user


def require_approved_vendor(
    current_user: CurrentUser = Depends(require_vendor),
) -> CurrentUser:
    """
    Requires authenticated vendor whose profile has approval_status == 'approved'.
    If not approved: raises 403 vendor_not_approved with current status and rejection reason.
    """
    if not current_user.vendor:
        raise ForbiddenRoleError("Vendor profile record not found")

    if current_user.vendor.approval_status != "approved":
        details: dict[str, Any] = {
            "approval_status": current_user.vendor.approval_status,
        }
        if current_user.vendor.approval_status == "rejected":
            details["rejection_reason"] = current_user.vendor.rejection_reason

        raise VendorNotApprovedError(
            f"Vendor account approval status is '{current_user.vendor.approval_status}'. Access to active inventory operations is restricted.",
            details=details,
        )

    return current_user


def require_verified_email(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """
    Checks if email is verified. Controlled by REQUIRE_VERIFIED_EMAIL_FOR_CHECKOUT setting.
    """
    settings = get_settings()
    if settings.REQUIRE_VERIFIED_EMAIL_FOR_CHECKOUT and not current_user.email_verified:
        raise EmailNotVerifiedError(
            "Email address has not been verified. Please verify your email to proceed."
        )
    return current_user


def ensure_owner(resource_user_id: int, current_user: CurrentUser) -> None:
    """
    Server-side IDOR prevention helper.
    Permits admins or the exact owner of the resource; rejects all others with 403 forbidden_role.
    """
    if current_user.role == "admin":
        return
    if current_user.user_id != resource_user_id:
        raise ForbiddenRoleError("Access forbidden: you do not have permission for this resource")


# -----------------------------------------------------------------------------
# Rate Limiting
# -----------------------------------------------------------------------------
class InMemoryRateLimiter:
    """
    In-memory sliding window rate limiter for development and single-instance environments.
    Production deployments should back rate-limiting with Redis.
    """

    def __init__(self, requests_per_minute: int = 60) -> None:
        self.requests_per_minute = requests_per_minute
        self._history: dict[str, collections.deque[float]] = collections.defaultdict(
            collections.deque
        )

    def check(self, key: str) -> None:
        now = time.time()
        window_start = now - 60.0
        q = self._history[key]

        # Prune timestamps older than 60 seconds
        while q and q[0] < window_start:
            q.popleft()

        if len(q) >= self.requests_per_minute:
            raise RateLimitedError(
                f"Rate limit exceeded. Maximum {self.requests_per_minute} requests per minute."
            )

        q.append(now)


# Standard rate limiters
_auth_limiter = InMemoryRateLimiter(requests_per_minute=20)
_payment_limiter = InMemoryRateLimiter(requests_per_minute=30)


def rate_limit_auth(request: Request) -> None:
    """Dependency applying 20 req/min limit by client IP for sensitive auth routes."""
    client_ip = request.client.host if request.client else "unknown"
    _auth_limiter.check(f"auth:{client_ip}")


def rate_limit_payments(request: Request) -> None:
    """Dependency applying 30 req/min limit by client IP for payment routes."""
    client_ip = request.client.host if request.client else "unknown"
    _payment_limiter.check(f"pay:{client_ip}")
