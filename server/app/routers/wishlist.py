from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import CurrentUser, require_customer
from app.models.accounts import User
from app.schemas.customer import WishlistItemResponse
from app.services.customer import CustomerService

router = APIRouter(prefix="/api/v1", tags=["Wishlist"])


def _get_user(db: Session, current_user: CurrentUser) -> User:
    user = db.query(User).filter(User.user_id == current_user.user_id).first()
    assert user is not None
    return user


@router.get(
    "/wishlist",
    response_model=list[WishlistItemResponse],
    operation_id="get_wishlist",
    summary="Get customer saved wishlist items with real-time pricing and availability",
)
@router.get(
    "/account/wishlist",
    response_model=list[WishlistItemResponse],
    operation_id="get_account_wishlist_alias",
    summary="Alias for customer wishlist",
    include_in_schema=False,
)
def get_wishlist(
    sort: str = Query("newest", description="Sort by: newest, price_asc, price_desc"),
    from_date: date | None = Query(
        None, alias="from", description="Calculate price and availability from date"
    ),
    to_date: date | None = Query(
        None, alias="to", description="Calculate price and availability to date"
    ),
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = CustomerService(db)
    return service.get_wishlist(
        user=user,
        sort=sort,
        from_date=from_date,
        to_date=to_date,
    )


@router.post(
    "/wishlist/{equipment_id}",
    response_model=dict[str, str],
    status_code=status.HTTP_201_CREATED,
    operation_id="add_to_wishlist",
    summary="Save equipment to customer wishlist (idempotent)",
)
@router.post(
    "/account/wishlist/{equipment_id}",
    response_model=dict[str, str],
    status_code=status.HTTP_201_CREATED,
    operation_id="add_to_account_wishlist_alias",
    include_in_schema=False,
)
def add_to_wishlist(
    equipment_id: int,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user = _get_user(db, current_user)
    service = CustomerService(db)
    service.add_to_wishlist(user, equipment_id)
    return {"status": "success", "message": "Equipment added to wishlist"}


@router.delete(
    "/wishlist/{equipment_id}",
    response_model=dict[str, str],
    operation_id="remove_from_wishlist",
    summary="Remove equipment from customer wishlist (idempotent)",
)
@router.delete(
    "/account/wishlist/{equipment_id}",
    response_model=dict[str, str],
    operation_id="remove_from_account_wishlist_alias",
    include_in_schema=False,
)
def remove_from_wishlist(
    equipment_id: int,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user = _get_user(db, current_user)
    service = CustomerService(db)
    service.remove_from_wishlist(user, equipment_id)
    return {"status": "success", "message": "Equipment removed from wishlist"}
