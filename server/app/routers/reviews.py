from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import CurrentUser, require_customer
from app.models.accounts import User
from app.schemas.social import (
    CustomerReviewItemResponse,
    ItemToReviewResponse,
    ReviewCreateRequest,
    ReviewResponse,
)
from app.services.social import SocialService

router = APIRouter(prefix="/api/v1", tags=["Reviews"])


def _get_user(db: Session, current_user: CurrentUser) -> User:
    user = db.query(User).filter(User.user_id == current_user.user_id).first()
    assert user is not None
    return user


@router.post(
    "/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="create_equipment_review",
    summary="Submit a verified customer review for a returned booking item",
)
@router.post(
    "/account/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="create_account_review_alias",
    include_in_schema=False,
)
def create_equipment_review(
    payload: ReviewCreateRequest,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = SocialService(db)
    b_item_id = (
        int(payload.booking_item_id)
        if payload.booking_item_id is not None and str(payload.booking_item_id).isdigit()
        else None
    )
    b_id = (
        int(payload.booking_id)
        if payload.booking_id is not None and str(payload.booking_id).isdigit()
        else None
    )
    eq_id = (
        int(payload.equipment_id)
        if payload.equipment_id is not None and str(payload.equipment_id).isdigit()
        else None
    )
    return service.create_review(
        user=user,
        booking_item_id=b_item_id,
        booking_id=b_id,
        equipment_id=eq_id,
        rating=payload.rating,
        comment=payload.comment,
    )


@router.get(
    "/account/reviews/to-write",
    response_model=list[ItemToReviewResponse],
    operation_id="get_items_to_review",
    summary="List returned equipment items eligible for customer review",
)
def get_items_to_review(
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = SocialService(db)
    return service.get_items_to_review(user)


@router.get(
    "/account/reviews/mine",
    response_model=list[CustomerReviewItemResponse],
    operation_id="get_my_reviews",
    summary="List reviews submitted by the authenticated customer",
)
def get_my_reviews(
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = SocialService(db)
    return service.get_my_reviews(user)
