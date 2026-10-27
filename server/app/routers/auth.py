from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import (
    CurrentUser,
    get_current_user,
    rate_limit_auth,
)
from app.core.security import TokenVerifier, get_token, get_token_verifier
from app.models.accounts import User
from app.schemas.auth import AuthUserResponse, RegisterRequest
from app.schemas.customer import UpdateProfileRequest
from app.services.auth import build_auth_user_response, register_user

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=AuthUserResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit_auth)],
    summary="Register user profile after client-side Firebase Auth sign-up",
    description=(
        "Requires a valid Firebase ID token. The user's email is taken directly from the verified "
        "token claims. Idempotent: returns existing user if firebase_uid is already registered. "
        "Rejects registration with 409 if email already belongs to a different account."
    ),
)
def register(
    body: RegisterRequest,
    request: Request,
    token: str = Depends(get_token),
    verifier: TokenVerifier = Depends(get_token_verifier),
    db: Session = Depends(get_db),
) -> AuthUserResponse:
    token_claims = verifier(token, False)
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    return register_user(
        db=db,
        token_claims=token_claims,
        req=body,
        ip_address=client_ip,
        user_agent=user_agent,
    )


@router.get(
    "/me",
    response_model=AuthUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated user profile",
    description=(
        "Retrieves the currently authenticated user's profile and vendor information. "
        "Automatically synchronises email_verified from the token claim and throttles last_login "
        "updates to once every 10 minutes."
    ),
)
def get_me(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuthUserResponse:
    user = db.query(User).filter(User.user_id == current_user.user_id).first()
    assert user is not None, "Authenticated user must exist in database"
    return build_auth_user_response(user)


@router.patch(
    "/profile",
    response_model=dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Update customer name and phone",
    operation_id="update_profile",
)
def update_profile(
    body: UpdateProfileRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    from app.services.customer import CustomerService
    user = db.query(User).filter(User.user_id == current_user.user_id).first()
    assert user is not None
    service = CustomerService(db)
    service.update_profile(user, name=body.name, phone=body.phone)
    words = user.name.strip().split()
    initials = "".join(w[0].upper() for w in words[:2])
    return {
        "id": str(user.user_id),
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role.value,
        "avatarInitials": initials,
    }
