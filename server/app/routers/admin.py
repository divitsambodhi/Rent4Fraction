from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import require_admin
from app.core.identifiers import resolve_booking_id
from app.models.accounts import User
from app.schemas.admin import (
    AdminCouponResponse,
    AdminDispute,
    AdminOverviewKPIs,
    AdminPayoutRow,
    AdminUser,
    AdminUserDetail,
    AdminVendorDetail,
    BulkPayoutStatusRequest,
    CategoryCommissionRequest,
    CreateCategoryRequest,
    CreateCouponRequest,
    ManagedCategory,
    RejectVendorRequest,
    ResolveDisputeRequest,
    ReviewVendorRequest,
    SuspendVendorRequest,
    SystemChecksReport,
    ToggleActiveRequest,
    UpdateCategoryRequest,
    UpdateCouponRequest,
    UpdateEquipmentCommissionRequest,
    UpdatePayoutStatusRequest,
    UpdateVendorCommissionRequest,
)
from app.schemas.vendor import VendorProfileResponse
from app.services.admin import AdminService
from app.services.lifecycle.service import LifecycleService
from app.services.lifecycle.types import DisputeResolutionPayload

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin"],
    dependencies=[Depends(require_admin)],
)


class DeactivateUserRequest(BaseModel):
    reason: str = Field(..., min_length=10)


# -----------------------------------------------------------------------------
# 1. Overview & Dashboard
# -----------------------------------------------------------------------------
@router.get("/dashboard", response_model=AdminOverviewKPIs)
@router.get("/overview", response_model=AdminOverviewKPIs, include_in_schema=False)
def get_admin_dashboard(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AdminOverviewKPIs:
    service = AdminService(db)
    return service.get_overview()


# -----------------------------------------------------------------------------
# 2. Vendors Management
# -----------------------------------------------------------------------------
@router.get("/vendors")
def list_vendors(
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict[str, Any]:
    service = AdminService(db)
    return service.list_vendors(status_filter=status, search=search, page=page, page_size=limit)


@router.get("/vendors/{vendor_id}", response_model=AdminVendorDetail)
def get_vendor_detail(
    vendor_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AdminVendorDetail:
    service = AdminService(db)
    return service.get_vendor_detail(vendor_id)


@router.post("/vendors/{vendor_id}/approve", response_model=VendorProfileResponse)
def approve_vendor(
    vendor_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> VendorProfileResponse:
    service = AdminService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    res = service.approve_vendor(
        admin_id=admin.user_id,
        vendor_id=vendor_id,
        ip_address=ip,
        user_agent=ua,
    )
    db.commit()
    return res


@router.post("/vendors/{vendor_id}/reject", response_model=VendorProfileResponse)
def reject_vendor(
    vendor_id: int,
    body: RejectVendorRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> VendorProfileResponse:
    service = AdminService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    res = service.reject_vendor(
        admin_id=admin.user_id,
        vendor_id=vendor_id,
        reason=body.reason,
        ip_address=ip,
        user_agent=ua,
    )
    db.commit()
    return res


@router.post("/vendors/{vendor_id}/suspend", response_model=VendorProfileResponse)
def suspend_vendor(
    vendor_id: int,
    body: SuspendVendorRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> VendorProfileResponse:
    service = AdminService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    res = service.suspend_vendor(
        admin_id=admin.user_id,
        vendor_id=vendor_id,
        reason=body.reason,
        ip_address=ip,
        user_agent=ua,
    )
    db.commit()
    return res


@router.post("/vendors/{vendor_id}/reinstate", response_model=VendorProfileResponse)
def reinstate_vendor(
    vendor_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> VendorProfileResponse:
    service = AdminService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    res = service.reinstate_vendor(
        admin_id=admin.user_id,
        vendor_id=vendor_id,
        ip_address=ip,
        user_agent=ua,
    )
    db.commit()
    return res


@router.post("/vendors/{vendor_id}/review", response_model=VendorProfileResponse)
def review_vendor(
    vendor_id: int,
    body: ReviewVendorRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> VendorProfileResponse:
    service = AdminService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    if body.decision == "approved":
        res = service.approve_vendor(admin_id=admin.user_id, vendor_id=vendor_id, ip_address=ip, user_agent=ua)
    elif body.decision == "rejected":
        res = service.reject_vendor(
            admin_id=admin.user_id,
            vendor_id=vendor_id,
            reason=body.reason or "Application rejected upon administrative review.",
            ip_address=ip,
            user_agent=ua,
        )
    else:
        res = service.suspend_vendor(
            admin_id=admin.user_id,
            vendor_id=vendor_id,
            reason=body.reason or "Vendor account suspended by administrator.",
            ip_address=ip,
            user_agent=ua,
        )
    db.commit()
    return res


@router.patch("/vendors/{vendor_id}/commission", response_model=VendorProfileResponse)
def update_vendor_commission(
    vendor_id: int,
    body: UpdateVendorCommissionRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> VendorProfileResponse:
    service = AdminService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    res = service.update_vendor_commission(
        admin_id=admin.user_id,
        vendor_id=vendor_id,
        commission_rate=body.commission_rate,
        ip_address=ip,
        user_agent=ua,
    )
    db.commit()
    return res


# -----------------------------------------------------------------------------
# 3. Equipment & Commission Overrides
# -----------------------------------------------------------------------------
@router.get("/equipment")
def list_equipment(
    vendor_id: int | None = Query(default=None),
    category_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict[str, Any]:
    service = AdminService(db)
    return service.list_equipment(
        vendor_id=vendor_id,
        category_id=category_id,
        search=search,
        page=page,
        page_size=limit,
    )


@router.patch("/equipment/{equipment_id}/commission")
def update_equipment_commission(
    equipment_id: int,
    body: UpdateEquipmentCommissionRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict[str, Any]:
    service = AdminService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    res = service.update_equipment_commission(
        admin_id=admin.user_id,
        equipment_id=equipment_id,
        commission_rate=body.commission_rate,
        ip_address=ip,
        user_agent=ua,
    )
    db.commit()
    return res


# -----------------------------------------------------------------------------
# 4. Categories Management
# -----------------------------------------------------------------------------
@router.get("/categories", response_model=list[ManagedCategory])
def list_categories(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[ManagedCategory]:
    service = AdminService(db)
    return service.list_categories()


@router.post("/categories", response_model=ManagedCategory, status_code=status.HTTP_201_CREATED)
def create_category(
    body: CreateCategoryRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> ManagedCategory:
    service = AdminService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    res = service.create_category(
        admin_id=admin.user_id,
        payload=body,
        ip_address=ip,
        user_agent=ua,
    )
    db.commit()
    return res


@router.patch("/categories/{category_id}", response_model=ManagedCategory)
def update_category(
    category_id: int,
    body: UpdateCategoryRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> ManagedCategory:
    service = AdminService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    res = service.update_category(
        admin_id=admin.user_id,
        category_id=category_id,
        payload=body,
        ip_address=ip,
        user_agent=ua,
    )
    db.commit()
    return res


@router.patch("/categories/{category_id}/active")
def toggle_category_active(
    category_id: int,
    body: ToggleActiveRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict[str, Any]:
    service = AdminService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    res = service.toggle_category_active(
        admin_id=admin.user_id,
        category_id=category_id,
        is_active=body.is_active,
        ip_address=ip,
        user_agent=ua,
    )
    db.commit()
    return res


@router.patch("/categories/{category_id}/commission", response_model=ManagedCategory)
def update_category_commission(
    category_id: int,
    body: CategoryCommissionRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> ManagedCategory:
    service = AdminService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    payload = UpdateCategoryRequest(default_commission_rate=body.default_commission_rate)
    res = service.update_category(
        admin_id=admin.user_id,
        category_id=category_id,
        payload=payload,
        ip_address=ip,
        user_agent=ua,
    )
    db.commit()
    return res


# -----------------------------------------------------------------------------
# 5. Coupons Management
# -----------------------------------------------------------------------------
@router.get("/coupons")
def list_coupons(
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict[str, Any]:
    service = AdminService(db)
    return service.list_coupons(status_filter=status, search=search, page=page, page_size=limit)


@router.post("/coupons", response_model=AdminCouponResponse, status_code=status.HTTP_201_CREATED)
def create_coupon(
    body: CreateCouponRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AdminCouponResponse:
    service = AdminService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    res = service.create_coupon(
        admin_id=admin.user_id,
        payload=body,
        ip_address=ip,
        user_agent=ua,
    )
    db.commit()
    return res


@router.patch("/coupons/{coupon_id}", response_model=AdminCouponResponse)
def update_coupon(
    coupon_id: int,
    body: UpdateCouponRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AdminCouponResponse:
    service = AdminService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    res = service.update_coupon(
        admin_id=admin.user_id,
        coupon_id=coupon_id,
        payload=body,
        ip_address=ip,
        user_agent=ua,
    )
    db.commit()
    return res


@router.patch("/coupons/{coupon_id}/active")
def toggle_coupon_active(
    coupon_id: int,
    body: ToggleActiveRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict[str, Any]:
    service = AdminService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    res = service.toggle_coupon_active(
        admin_id=admin.user_id,
        coupon_id=coupon_id,
        is_active=body.is_active,
        ip_address=ip,
        user_agent=ua,
    )
    db.commit()
    return res


# -----------------------------------------------------------------------------
# 6. Users Management
# -----------------------------------------------------------------------------
@router.get("/users")
def list_users(
    role: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict[str, Any]:
    service = AdminService(db)
    return service.list_users(role=role, search=search, page=page, page_size=limit)


@router.get("/users/{user_id}", response_model=AdminUserDetail)
def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AdminUserDetail:
    service = AdminService(db)
    return service.get_user_detail(user_id)


@router.post("/users/{user_id}/deactivate", response_model=AdminUser)
def deactivate_user(
    user_id: int,
    body: DeactivateUserRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AdminUser:
    service = AdminService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    res = service.deactivate_user(
        admin_id=admin.user_id,
        target_user_id=user_id,
        reason=body.reason,
        ip_address=ip,
        user_agent=ua,
    )
    db.commit()
    return res


@router.post("/users/{user_id}/reactivate", response_model=AdminUser)
def reactivate_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AdminUser:
    service = AdminService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    res = service.reactivate_user(
        admin_id=admin.user_id,
        target_user_id=user_id,
        ip_address=ip,
        user_agent=ua,
    )
    db.commit()
    return res


# -----------------------------------------------------------------------------
# 7. Disputes Management
# -----------------------------------------------------------------------------
@router.get("/disputes")
def list_disputes(
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict[str, Any]:
    service = AdminService(db)
    return service.list_disputes(status_filter=status, page=page, page_size=limit)


@router.get("/disputes/{report_id}", response_model=AdminDispute)
def get_dispute(
    report_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AdminDispute:
    service = AdminService(db)
    return service.get_dispute(report_id)


@router.post("/disputes/{report_id}/resolve", response_model=AdminDispute)
def resolve_dispute(
    report_id: int,
    body: ResolveDisputeRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AdminDispute:
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")

    lifecycle = LifecycleService(db)
    dr = lifecycle.resolve_dispute(
        report_id=report_id,
        actor_user_id=admin.user_id,
        role="admin",
        payload=DisputeResolutionPayload(
            outcome=body.outcome,
            final_amount=body.final_amount,
            resolution_note=body.resolution_note,
        ),
        ip_address=ip,
        user_agent=ua,
    )
    db.commit()

    admin_svc = AdminService(db)
    return admin_svc._format_dispute(dr)


# -----------------------------------------------------------------------------
# 8. Payouts Management
# -----------------------------------------------------------------------------
@router.get("/payouts")
def list_payouts(
    status: str | None = Query(default=None),
    vendor_id: int | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict[str, Any]:
    service = AdminService(db)
    return service.list_payouts(status_filter=status, vendor_id=vendor_id, page=page, page_size=limit)


@router.patch("/payouts/{payout_id}/status", response_model=AdminPayoutRow)
def update_payout_status(
    payout_id: int,
    body: UpdatePayoutStatusRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AdminPayoutRow:
    service = AdminService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    res = service.update_payout_status(
        admin_id=admin.user_id,
        payout_id=payout_id,
        new_status=body.status,
        paid_at=body.paid_at,
        note=body.note,
        ip_address=ip,
        user_agent=ua,
    )
    db.commit()
    return res


@router.post("/payouts/bulk-status")
def bulk_payout_status(
    body: BulkPayoutStatusRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict[str, Any]:
    service = AdminService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    res = service.bulk_payout_status(
        admin_id=admin.user_id,
        payout_ids=body.payout_ids,
        new_status=body.status,
        paid_at=body.paid_at,
        ip_address=ip,
        user_agent=ua,
    )
    db.commit()
    return res


# -----------------------------------------------------------------------------
# 9. Bookings Overview & Detail
# -----------------------------------------------------------------------------
@router.get("/bookings")
def list_bookings(
    status: str | None = Query(default=None),
    payment_status: str | None = Query(default=None),
    vendor_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict[str, Any]:
    service = AdminService(db)
    return service.list_bookings(
        status=status,
        payment_status=payment_status,
        vendor_id=vendor_id,
        search=search,
        from_date=from_date,
        to_date=to_date,
        page=page,
        page_size=limit,
    )


@router.get("/bookings/{booking_id}")
def get_booking_detail(
    booking_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict[str, Any]:
    numeric_id = resolve_booking_id(booking_id)
    service = AdminService(db)
    return service.get_booking_detail(booking_id=numeric_id)


# -----------------------------------------------------------------------------
# 10. System Checks (10 Invariant Checks)
# -----------------------------------------------------------------------------
@router.get("/system/checks", response_model=SystemChecksReport)
def get_system_checks(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> SystemChecksReport:
    service = AdminService(db)
    return service.run_system_checks()
