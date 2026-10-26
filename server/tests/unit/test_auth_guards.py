from __future__ import annotations

from typing import Any

import pytest
from fastapi import APIRouter, Depends, FastAPI
from fastapi.testclient import TestClient

from app.core.deps import (
    CurrentUser,
    CurrentVendor,
    InMemoryRateLimiter,
    get_current_user,
    get_optional_user,
    require_admin,
    require_approved_vendor,
    require_customer,
    require_vendor,
    require_verified_email,
)
from app.core.errors import (
    AuthInvalidTokenError,
    AuthRevokedError,
    AuthTokenExpiredError,
    RateLimitedError,
    UserNotRegisteredError,
    register_exception_handlers,
)
from app.core.middleware import RequestContextMiddleware


# -----------------------------------------------------------------------------
# Test Application & Sample Protected Routes
# -----------------------------------------------------------------------------
def create_test_guards_app() -> FastAPI:
    app = FastAPI(title="Guards Test App")
    register_exception_handlers(app)
    app.add_middleware(RequestContextMiddleware)

    test_router = APIRouter(prefix="/test-guards")

    @test_router.get("/public")
    def public_route(user: CurrentUser | None = Depends(get_optional_user)) -> dict[str, Any]:
        return {"user": user.role if user else None}

    @test_router.get("/customer")
    def customer_route(user: CurrentUser = Depends(require_customer)) -> dict[str, str]:
        return {"status": "ok", "role": user.role}

    @test_router.get("/vendor")
    def vendor_route(user: CurrentUser = Depends(require_vendor)) -> dict[str, str]:
        return {"status": "ok", "role": user.role}

    @test_router.get("/approved-vendor")
    def approved_vendor_route(
        user: CurrentUser = Depends(require_approved_vendor),
    ) -> dict[str, str]:
        return {"status": "ok", "vendor_id": str(user.vendor.vendor_id if user.vendor else "")}

    @test_router.get("/admin")
    def admin_route(user: CurrentUser = Depends(require_admin)) -> dict[str, str]:
        return {"status": "ok", "role": user.role}

    @test_router.get("/verified-email")
    def verified_email_route(
        user: CurrentUser = Depends(require_verified_email),
    ) -> dict[str, str]:
        return {"status": "ok", "email_verified": str(user.email_verified)}

    app.include_router(test_router)
    return app


# Sample CurrentUser Fixtures
def make_user(
    role: str = "customer",
    is_active: bool = True,
    email_verified: bool = True,
    approval_status: str | None = None,
    rejection_reason: str | None = None,
) -> CurrentUser:
    vendor_info = None
    if role == "vendor" and approval_status:
        vendor_info = CurrentVendor(
            vendor_id=101,
            business_name="Test Vendor Inc",
            approval_status=approval_status,
            rejection_reason=rejection_reason,
        )

    return CurrentUser(
        user_id=1,
        firebase_uid=f"uid-{role}",
        role=role,
        name=f"Test {role.title()}",
        email=f"{role}@test.com",
        phone="9876543210",
        email_verified=email_verified,
        is_active=is_active,
        vendor=vendor_info,
    )


# -----------------------------------------------------------------------------
# Role Matrix Tests
# -----------------------------------------------------------------------------
@pytest.mark.unit
def test_visitor_without_token() -> None:
    app = create_test_guards_app()
    client = TestClient(app)

    # 1. Public route returns user: null without raising error
    res_pub = client.get("/test-guards/public")
    assert res_pub.status_code == 200
    assert res_pub.json() == {"user": None}

    # 2. Protected routes fail with 401 auth_missing_token
    for route in ["/customer", "/vendor", "/approved-vendor", "/admin", "/verified-email"]:
        res = client.get(f"/test-guards{route}")
        assert res.status_code == 401
        assert res.json()["error"]["code"] == "auth_missing_token"


@pytest.mark.unit
def test_customer_role_matrix() -> None:
    app = create_test_guards_app()
    customer = make_user(role="customer")
    app.dependency_overrides[get_current_user] = lambda: customer
    app.dependency_overrides[get_optional_user] = lambda: customer
    client = TestClient(app)

    # Public -> passes
    assert client.get("/test-guards/public").json() == {"user": "customer"}
    # Customer route -> passes
    assert client.get("/test-guards/customer").status_code == 200
    # Vendor route -> 403 forbidden_role
    res_vendor = client.get("/test-guards/vendor")
    assert res_vendor.status_code == 403
    assert res_vendor.json()["error"]["code"] == "forbidden_role"
    # Approved vendor route -> 403 forbidden_role
    assert client.get("/test-guards/approved-vendor").status_code == 403
    # Admin route -> 403 forbidden_role
    res_admin = client.get("/test-guards/admin")
    assert res_admin.status_code == 403
    assert res_admin.json()["error"]["code"] == "forbidden_role"


@pytest.mark.unit
def test_vendor_pending_matrix() -> None:
    app = create_test_guards_app()
    pending_vendor = make_user(role="vendor", approval_status="pending")
    app.dependency_overrides[get_current_user] = lambda: pending_vendor
    client = TestClient(app)

    # Customer route -> 403 forbidden_role
    assert client.get("/test-guards/customer").status_code == 403
    # Generic vendor route -> 200 OK (pending vendors can access dashboard)
    assert client.get("/test-guards/vendor").status_code == 200
    # Approved vendor route -> 403 vendor_not_approved with details
    res_approved = client.get("/test-guards/approved-vendor")
    assert res_approved.status_code == 403
    err = res_approved.json()["error"]
    assert err["code"] == "vendor_not_approved"
    assert err["details"]["approval_status"] == "pending"


@pytest.mark.unit
def test_vendor_approved_matrix() -> None:
    app = create_test_guards_app()
    approved_vendor = make_user(role="vendor", approval_status="approved")
    app.dependency_overrides[get_current_user] = lambda: approved_vendor
    client = TestClient(app)

    # Generic vendor route -> 200
    assert client.get("/test-guards/vendor").status_code == 200
    # Approved vendor route -> 200
    assert client.get("/test-guards/approved-vendor").status_code == 200
    # Customer route -> 403 forbidden_role
    assert client.get("/test-guards/customer").status_code == 403
    # Admin route -> 403 forbidden_role
    assert client.get("/test-guards/admin").status_code == 403


@pytest.mark.unit
def test_vendor_rejected_matrix() -> None:
    app = create_test_guards_app()
    rejected_vendor = make_user(
        role="vendor",
        approval_status="rejected",
        rejection_reason="Invalid GST documentation",
    )
    app.dependency_overrides[get_current_user] = lambda: rejected_vendor
    client = TestClient(app)

    # Generic vendor route -> 200 (can view rejection notification)
    assert client.get("/test-guards/vendor").status_code == 200
    # Approved vendor route -> 403 vendor_not_approved with rejection reason in details
    res = client.get("/test-guards/approved-vendor")
    assert res.status_code == 403
    err = res.json()["error"]
    assert err["code"] == "vendor_not_approved"
    assert err["details"]["approval_status"] == "rejected"
    assert err["details"]["rejection_reason"] == "Invalid GST documentation"


@pytest.mark.unit
def test_vendor_suspended_matrix() -> None:
    app = create_test_guards_app()
    suspended_vendor = make_user(role="vendor", approval_status="suspended")
    app.dependency_overrides[get_current_user] = lambda: suspended_vendor
    client = TestClient(app)

    # Generic vendor route -> 200
    assert client.get("/test-guards/vendor").status_code == 200
    # Approved vendor route -> 403 vendor_not_approved
    res = client.get("/test-guards/approved-vendor")
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "vendor_not_approved"
    assert res.json()["error"]["details"]["approval_status"] == "suspended"


@pytest.mark.unit
def test_admin_role_matrix() -> None:
    app = create_test_guards_app()
    admin_user = make_user(role="admin")
    app.dependency_overrides[get_current_user] = lambda: admin_user
    client = TestClient(app)

    # Admin route -> 200 OK
    assert client.get("/test-guards/admin").status_code == 200
    # Customer route -> 403 forbidden_role
    assert client.get("/test-guards/customer").status_code == 403
    # Vendor route -> 403 forbidden_role
    assert client.get("/test-guards/vendor").status_code == 403


@pytest.mark.unit
def test_email_not_verified_guard() -> None:
    app = create_test_guards_app()
    unverified_user = make_user(role="customer", email_verified=False)
    app.dependency_overrides[get_current_user] = lambda: unverified_user
    client = TestClient(app)

    res = client.get("/test-guards/verified-email")
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "email_not_verified"


# -----------------------------------------------------------------------------
# Guard Error Code Coverage
# -----------------------------------------------------------------------------
@pytest.mark.unit
def test_user_not_registered_error() -> None:
    app = create_test_guards_app()

    def raise_unregistered() -> CurrentUser:
        raise UserNotRegisteredError("User is not registered")

    app.dependency_overrides[get_current_user] = raise_unregistered
    client = TestClient(app)

    res = client.get("/test-guards/customer", headers={"Authorization": "Bearer token"})
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "user_not_registered"


@pytest.mark.unit
def test_token_error_codes_mapping() -> None:
    app = create_test_guards_app()

    # 1. auth_token_expired (401)
    def raise_expired() -> CurrentUser:
        raise AuthTokenExpiredError("Token expired")

    app.dependency_overrides[get_current_user] = raise_expired
    client = TestClient(app)
    res_exp = client.get("/test-guards/customer", headers={"Authorization": "Bearer token"})
    assert res_exp.status_code == 401
    assert res_exp.json()["error"]["code"] == "auth_token_expired"

    # 2. auth_revoked (401)
    def raise_revoked() -> CurrentUser:
        raise AuthRevokedError("Token revoked")

    app.dependency_overrides[get_current_user] = raise_revoked
    res_rev = client.get("/test-guards/customer", headers={"Authorization": "Bearer token"})
    assert res_rev.status_code == 401
    assert res_rev.json()["error"]["code"] == "auth_revoked"

    # 3. auth_invalid_token (401)
    def raise_invalid() -> CurrentUser:
        raise AuthInvalidTokenError("Token invalid")

    app.dependency_overrides[get_current_user] = raise_invalid
    res_inv = client.get("/test-guards/customer", headers={"Authorization": "Bearer token"})
    assert res_inv.status_code == 401
    assert res_inv.json()["error"]["code"] == "auth_invalid_token"


@pytest.mark.unit
def test_rate_limited_error_code() -> None:
    limiter = InMemoryRateLimiter(requests_per_minute=2)
    limiter.check("test-key")
    limiter.check("test-key")

    with pytest.raises(RateLimitedError) as exc_info:
        limiter.check("test-key")
    assert exc_info.value.code == "rate_limited"
    assert exc_info.value.status_code == 429
