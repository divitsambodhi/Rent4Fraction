from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import CurrentUser, require_customer
from app.integrations.razorpay import PaymentGateway, get_payment_gateway
from app.models.accounts import User
from app.schemas.booking import (
    CheckoutQuoteRequest,
    CheckoutQuoteResponse,
    CouponValidateRequest,
    CouponValidationResponse,
)
from app.schemas.checkout import (
    CheckoutOrderCreateRequest,
    CheckoutOrderResponse,
)
from app.services.booking import BookingService
from app.services.checkout import create_checkout_order

router = APIRouter(prefix="/api/v1/checkout", tags=["Checkout"])


def _get_user(db: Session, current_user: CurrentUser) -> User:
    user = db.query(User).filter(User.user_id == current_user.user_id).first()
    assert user is not None
    return user


@router.post(
    "/orders",
    response_model=CheckoutOrderResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="create_checkout_order",
    summary="Create booking, reserve equipment and generate Razorpay order",
)
def place_checkout_order(
    payload: CheckoutOrderCreateRequest,
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
    gateway: PaymentGateway = Depends(get_payment_gateway),
) -> Any:
    user = _get_user(db, current_user)
    result = create_checkout_order(
        db=db,
        user=user,
        payload=payload,
        idempotency_key=idempotency_key,
        gateway=gateway,
    )
    return result


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
