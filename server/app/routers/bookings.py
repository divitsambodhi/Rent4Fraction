from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import CurrentUser, require_customer_or_admin
from app.integrations.razorpay import PaymentGateway, get_payment_gateway
from app.models.accounts import User
from app.schemas.booking import (
    BookingCancelRequest,
    BookingDetailResponse,
    BookingListResponse,
    DamageReportResponse,
    DamageReportResponseRequest,
    RespondDeliveryFeeRequest,
)
from app.schemas.checkout import RazorpayOrderBlock
from app.services.booking import BookingService
from app.services.payments import PaymentService

router = APIRouter(prefix="/api/v1", tags=["Bookings"])


def _get_user(db: Session, current_user: CurrentUser) -> User:
    user = db.query(User).filter(User.user_id == current_user.user_id).first()
    assert user is not None
    return user


@router.get(
    "/bookings",
    response_model=BookingListResponse,
    operation_id="list_user_bookings",
    summary="Get customer bookings with status tab filters, tab counts, and keyword search",
)
@router.get(
    "/account/bookings",
    response_model=BookingListResponse,
    operation_id="list_account_bookings_alias",
    summary="Alias for customer bookings list",
    include_in_schema=False,
)
def list_user_bookings(
    status_filter: str | None = Query(
        "all",
        alias="status",
        description="Tab filter: all, upcoming, ongoing, completed, cancelled",
    ),
    q: str | None = Query(None, description="Search by event name, type, or booking ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, alias="pageSize", description="Items per page"),
    current_user: CurrentUser = Depends(require_customer_or_admin),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = BookingService(db)
    return service.list_bookings(
        user=user,
        status_filter=status_filter,
        search_query=q,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/bookings/{booking_id}",
    response_model=BookingDetailResponse,
    operation_id="get_booking_detail",
    summary="Get full booking detail with vendor orders, delivery, damage reports, and deposit summary",
)
@router.get(
    "/account/bookings/{booking_id}",
    response_model=BookingDetailResponse,
    operation_id="get_account_booking_detail_alias",
    summary="Alias for booking detail",
    include_in_schema=False,
)
def get_booking_detail(
    booking_id: int,
    current_user: CurrentUser = Depends(require_customer_or_admin),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = BookingService(db)
    return service.get_booking_detail(user, booking_id)


@router.post(
    "/bookings/{booking_id}/cancel",
    response_model=dict[str, str],
    operation_id="cancel_unpaid_booking",
    summary="Cancel an unpaid booking (paid bookings require refund workflow)",
)
@router.post(
    "/account/bookings/{booking_id}/cancel",
    response_model=dict[str, str],
    operation_id="cancel_account_booking_alias",
    include_in_schema=False,
)
def cancel_unpaid_booking(
    booking_id: int,
    payload: BookingCancelRequest,
    current_user: CurrentUser = Depends(require_customer_or_admin),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user = _get_user(db, current_user)
    service = BookingService(db)
    return service.cancel_booking(
        user=user,
        booking_id=booking_id,
        reason=payload.reason,
    )


@router.post(
    "/bookings/{booking_id}/pay",
    response_model=RazorpayOrderBlock,
    operation_id="retry_booking_payment",
    summary="Retry payment for an unpaid pending booking within hold window",
)
@router.post(
    "/account/bookings/{booking_id}/pay",
    response_model=RazorpayOrderBlock,
    operation_id="retry_account_booking_payment_alias",
    include_in_schema=False,
)
def retry_booking_payment(
    booking_id: int,
    current_user: CurrentUser = Depends(require_customer_or_admin),
    db: Session = Depends(get_db),
    gateway: PaymentGateway = Depends(get_payment_gateway),
) -> Any:
    user = _get_user(db, current_user)
    service = PaymentService(db, gateway=gateway)
    return service.retry_booking_payment(user_id=user.user_id, booking_id=booking_id)


@router.post(
    "/bookings/{booking_id}/damage-reports/{item_id}/respond",
    response_model=DamageReportResponse,
    operation_id="respond_to_damage_report",
    summary="Accept or dispute a reported equipment damage claim",
)
@router.post(
    "/account/bookings/{booking_id}/damage-reports/{item_id}/respond",
    response_model=DamageReportResponse,
    operation_id="respond_to_account_damage_report_alias",
    include_in_schema=False,
)
def respond_to_damage_report(
    booking_id: int,
    item_id: int,
    payload: DamageReportResponseRequest,
    current_user: CurrentUser = Depends(require_customer_or_admin),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = BookingService(db)
    return service.respond_to_damage_report(
        user=user,
        booking_id=booking_id,
        item_id=item_id,
        action=payload.action,
        dispute_reason=payload.dispute_reason,
    )


@router.post(
    "/bookings/{booking_id}/vendor-orders/{vendor_order_id}/respond-delivery-fee",
    operation_id="respond_to_vendor_order_delivery_fee",
    summary="Accept vendor's quoted delivery fee or switch to self-pickup",
)
@router.post(
    "/account/bookings/{booking_id}/vendor-orders/{vendor_order_id}/respond-delivery-fee",
    operation_id="respond_to_account_vendor_order_delivery_fee_alias",
    include_in_schema=False,
)
def respond_to_delivery_fee(
    booking_id: int,
    vendor_order_id: int,
    payload: RespondDeliveryFeeRequest,
    current_user: CurrentUser = Depends(require_customer_or_admin),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = BookingService(db)
    return service.respond_to_delivery_fee(
        user=user,
        booking_id=booking_id,
        vendor_order_id=vendor_order_id,
        action=payload.action,
    )
