from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import CurrentUser, require_customer_or_admin
from app.models.accounts import User
from app.schemas.customer import (
    AddressCreateRequest,
    AddressResponse,
    AddressUpdateRequest,
)
from app.services.customer import CustomerService

router = APIRouter(prefix="/api/v1", tags=["Addresses"])


def _get_user(db: Session, current_user: CurrentUser) -> User:
    user = db.query(User).filter(User.user_id == current_user.user_id).first()
    assert user is not None
    return user


@router.get(
    "/addresses",
    response_model=list[AddressResponse],
    operation_id="list_addresses",
    summary="Get customer saved delivery addresses with used_in_bookings indicator",
)
@router.get(
    "/account/addresses",
    response_model=list[AddressResponse],
    operation_id="list_account_addresses_alias",
    summary="Alias for customer delivery addresses",
    include_in_schema=False,
)
def list_addresses(
    current_user: CurrentUser = Depends(require_customer_or_admin),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = CustomerService(db)
    return service.list_addresses(user)


@router.post(
    "/addresses",
    response_model=AddressResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="create_address",
    summary="Create a new delivery address (enforces single default invariant)",
)
def create_address(
    payload: AddressCreateRequest,
    current_user: CurrentUser = Depends(require_customer_or_admin),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = CustomerService(db)
    return service.create_address(
        user=user,
        label=payload.label or "Home",
        line1=payload.line1,
        line2=payload.line2,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        is_default=payload.is_default,
    )


@router.patch(
    "/addresses/{address_id}",
    response_model=AddressResponse,
    operation_id="update_address",
    summary="Update delivery address details",
)
def update_address(
    address_id: int,
    payload: AddressUpdateRequest,
    current_user: CurrentUser = Depends(require_customer_or_admin),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = CustomerService(db)
    return service.update_address(
        user=user,
        address_id=address_id,
        label=payload.label,
        line1=payload.line1,
        line2=payload.line2,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        is_default=payload.is_default,
    )


@router.delete(
    "/addresses/{address_id}",
    response_model=dict[str, str],
    operation_id="delete_address",
    summary="Delete address (blocks deletion if used in bookings, promotes recent default)",
)
def delete_address(
    address_id: int,
    current_user: CurrentUser = Depends(require_customer_or_admin),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user = _get_user(db, current_user)
    service = CustomerService(db)
    service.delete_address(user, address_id)
    return {"status": "success", "message": "Address deleted successfully"}


@router.post(
    "/addresses/{address_id}/default",
    response_model=AddressResponse,
    operation_id="set_default_address",
    summary="Set address as default delivery location",
)
def set_default_address(
    address_id: int,
    current_user: CurrentUser = Depends(require_customer_or_admin),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = CustomerService(db)
    return service.set_default_address(user, address_id)
