from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import CurrentUser, get_current_user
from app.models.accounts import User
from app.schemas.customer import AccountBadgesResponse
from app.services.customer import CustomerService

router = APIRouter(prefix="/api/v1/account", tags=["Account"])


def _get_user(db: Session, current_user: CurrentUser) -> User:
    user = db.query(User).filter(User.user_id == current_user.user_id).first()
    assert user is not None
    return user


@router.get(
    "/badges",
    response_model=AccountBadgesResponse,
    operation_id="get_account_badges",
    summary="Get count of active bookings, unread inbox items, and wishlist items",
)
def get_account_badges(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = CustomerService(db)
    return service.get_badges(user)
