from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import CurrentUser, require_customer
from app.models.accounts import User
from app.schemas.customer import (
    CartApplyDatesRequest,
    CartApplyDatesResponse,
    CartItemCreateRequest,
    CartItemUpdateRequest,
    CartResponse,
)
from app.services.customer import CustomerService

router = APIRouter(prefix="/api/v1/cart", tags=["Cart"])


def _get_user(db: Session, current_user: CurrentUser) -> User:
    user = db.query(User).filter(User.user_id == current_user.user_id).first()
    assert user is not None
    return user


@router.get(
    "",
    response_model=CartResponse,
    operation_id="get_cart",
    summary="Get customer cart with read-time status and period groupings",
)
def get_cart(
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = CustomerService(db)
    return service.get_cart(user)


@router.post(
    "/items",
    response_model=CartResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="add_cart_item",
    summary="Add equipment to cart (merges identical items and dates)",
)
def add_cart_item(
    payload: CartItemCreateRequest,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = CustomerService(db)
    eq_id = int(payload.equipment_id)
    s_date = date.fromisoformat(payload.start_date)
    e_date = date.fromisoformat(payload.end_date)
    return service.add_cart_item(
        user=user,
        equipment_id=eq_id,
        quantity=payload.quantity,
        start_date=s_date,
        end_date=e_date,
        override_quantity=payload.override_quantity,
    )


@router.patch(
    "/items/{cart_item_id}",
    response_model=CartResponse,
    operation_id="update_cart_item",
    summary="Update quantity or rental dates of a cart item",
)
def update_cart_item(
    cart_item_id: int,
    payload: CartItemUpdateRequest,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = CustomerService(db)
    s_date = date.fromisoformat(payload.start_date) if payload.start_date else None
    e_date = date.fromisoformat(payload.end_date) if payload.end_date else None
    return service.update_cart_item(
        user=user,
        cart_item_id=cart_item_id,
        quantity=payload.quantity,
        start_date=s_date,
        end_date=e_date,
    )


@router.delete(
    "/items/{cart_item_id}",
    response_model=CartResponse,
    operation_id="remove_cart_item",
    summary="Remove a single line item from the cart",
)
def remove_cart_item(
    cart_item_id: int,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = CustomerService(db)
    return service.remove_cart_item(user, cart_item_id)


@router.delete(
    "",
    response_model=dict[str, str],
    operation_id="clear_cart",
    summary="Clear all items from the customer cart",
)
def clear_cart(
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user = _get_user(db, current_user)
    service = CustomerService(db)
    service.clear_cart(user)
    return {"status": "success", "message": "Cart cleared successfully"}


@router.post(
    "/move-to-wishlist/{cart_item_id}",
    response_model=CartResponse,
    operation_id="move_to_wishlist",
    summary="Move cart item to wishlist",
)
def move_to_wishlist(
    cart_item_id: int,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = CustomerService(db)
    return service.move_to_wishlist(user, cart_item_id)


@router.post(
    "/apply-dates",
    response_model=CartApplyDatesResponse,
    operation_id="apply_cart_dates",
    summary="Synchronize rental dates across all cart items",
)
def apply_cart_dates(
    payload: CartApplyDatesRequest,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = CustomerService(db)
    s_date = date.fromisoformat(payload.start_date)
    e_date = date.fromisoformat(payload.end_date)
    res = service.apply_cart_dates(
        user=user,
        start_date=s_date,
        end_date=e_date,
    )
    unavailable_list = [{"name": name} for name in res.get("unavailable_items", [])]
    return {
        "success": True,
        "updated_items_count": len(res.get("cart", {}).get("items", [])),
        "unavailable_items": unavailable_list,
    }
