from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import CurrentUser, require_customer
from app.integrations.razorpay import PaymentGateway, get_payment_gateway
from app.models.accounts import User
from app.schemas.booking import (
    PaymentListResponse,
    PaymentSummaryResponse,
)
from app.schemas.checkout import (
    PaymentStatusResponse,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
)
from app.services.booking import BookingService
from app.services.payments import PaymentService

router = APIRouter(prefix="/api/v1", tags=["Payments"])


def _get_user(db: Session, current_user: CurrentUser) -> User:
    user = db.query(User).filter(User.user_id == current_user.user_id).first()
    assert user is not None
    return user


@router.post(
    "/payments/verify",
    response_model=PaymentVerifyResponse,
    operation_id="verify_payment",
    summary="Verify client-side Razorpay payment signature and confirm booking",
)
def verify_payment(
    payload: PaymentVerifyRequest,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
    gateway: PaymentGateway = Depends(get_payment_gateway),
) -> Any:
    user = _get_user(db, current_user)
    service = PaymentService(db, gateway=gateway)
    return service.verify_payment(
        user_id=user.user_id,
        booking_id=payload.booking_id,
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        razorpay_signature=payload.razorpay_signature,
    )


@router.get(
    "/payments/status",
    response_model=PaymentStatusResponse,
    operation_id="get_payment_status",
    summary="Poll status of payment and hold window for a booking",
)
def get_payment_status(
    booking_id: int = Query(..., description="Booking ID to check"),
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = PaymentService(db)
    return service.get_payment_status(user_id=user.user_id, booking_id=booking_id)


@router.get(
    "/payments",
    response_model=PaymentListResponse,
    operation_id="list_user_payments",
    summary="Get customer payment records with type and status filters",
)
def list_user_payments(
    payment_type: str | None = Query(None, alias="type", description="Payment type filter"),
    payment_status: str | None = Query(None, alias="status", description="Payment status filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, alias="pageSize", description="Items per page"),
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = BookingService(db)
    return service.list_payments(
        user=user,
        payment_type=payment_type,
        status=payment_status,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/account/payments/summary",
    response_model=PaymentSummaryResponse,
    operation_id="get_payments_summary",
    summary="Get summary metrics tiles for customer payments (total paid, held, deductions, refunded)",
)
def get_payments_summary(
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = BookingService(db)
    return service.get_payments_summary(user)
