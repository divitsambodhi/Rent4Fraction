from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import CurrentUser, require_customer
from app.models.accounts import User
from app.schemas.booking import (
    CheckoutQuoteRequest,
    CheckoutQuoteResponse,
    CouponValidateRequest,
    CouponValidationResponse,
)
from app.services.booking import BookingService

router = APIRouter(prefix="/api/v1/checkout", tags=["Checkout"])


def _get_user(db: Session, current_user: CurrentUser) -> User:
    user = db.query(User).filter(User.user_id == current_user.user_id).first()
    assert user is not None
    return user


@router.post(
    "/coupons/validate",
    response_model=CouponValidationResponse,
    operation_id="validate_coupon",
    summary="Advisory coupon validation against checkout discount rules",
)
def validate_coupon(
    payload: CouponValidateRequest,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = BookingService(db)
    return service.validate_coupon(
        user=user,
        code=payload.code,
        subtotal=payload.subtotal,
    )


@router.post(
    "/quote",
    response_model=CheckoutQuoteResponse,
    operation_id="estimate_checkout_quote",
    summary="Generate comprehensive server-side checkout price breakdown from cart",
)
def estimate_checkout_quote(
    payload: CheckoutQuoteRequest,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = BookingService(db)
    return service.get_checkout_quote(
        user=user,
        period=payload.get_period(),
        coupon_code=payload.coupon_code,
        fulfilment_by_vendor=payload.fulfilment_by_vendor,
        address_id=payload.get_address_id(),
    )
