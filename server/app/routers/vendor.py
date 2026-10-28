from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.orm import Session

from app.core.db import get_db, transaction
from app.core.deps import CurrentUser, require_approved_vendor, require_vendor
from app.core.errors import ForbiddenError, ValidationFailedError
from app.schemas.social import ConversationResponse, NotificationResponse
from app.schemas.vendor import (
    AvailabilityBlockResponse,
    BulkStatusRequest,
    CreateAvailabilityBlockRequest,
    CreateEquipmentRequest,
    DeclineOrderRequest,
    DeliveryFailedRequest,
    InventoryItemResponse,
    InventoryListResponse,
    OverviewRange,
    RecordCashRequest,
    RecordDepositSettlementRequest,
    RecordNoShowRequest,
    ReviewReplyRequest,
    StatusUpdateRequest,
    UpdateEquipmentRequest,
    UpdateVendorProfileRequest,
    VendorOrderDetailResponse,
    VendorOrderListResponse,
    VendorOverviewResponse,
    VendorPayoutResponse,
    VendorPayoutsResult,
    VendorProfileResponse,
    VendorReviewsResult,
)
from app.services.idempotency import get_idempotency_service
from app.services.lifecycle.service import LifecycleService
from app.services.lifecycle.types import (
    DeliveryFailedPayload,
    InspectionPayload,
    MarkDeliveredPayload,
    ScheduleDeliveryPayload,
    ScheduleReturnPayload,
)
from app.services.vendor import VendorService

router = APIRouter(prefix="/api/v1/vendor", tags=["Vendor"])


def _get_vendor_id(current_user: CurrentUser) -> int:
    if not current_user.vendor:
        raise ForbiddenError("No vendor profile associated with this account.")
    return current_user.vendor.vendor_id


# =============================================================================
# 1. Overview & Dashboard
# =============================================================================
@router.get(
    "/overview",
    response_model=VendorOverviewResponse,
    operation_id="get_vendor_overview",
    summary="Get vendor dashboard overview KPIs, earnings series, and 7-day schedule",
)
@router.get(
    "/dashboard",
    response_model=VendorOverviewResponse,
    operation_id="get_vendor_dashboard_alias",
    summary="Alias for vendor overview",
    include_in_schema=False,
)
def get_vendor_overview(
    range: OverviewRange = Query("30d", description="Overview time window: 7d, 30d, 90d, ytd"),
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorOverviewResponse:
    vendor_id = _get_vendor_id(current_user)
    service = VendorService(db)
    return service.get_overview(vendor_id=vendor_id, range_str=range)


# =============================================================================
# 2. Orders & Order Lifecycle Transitions
# =============================================================================
@router.get(
    "/orders",
    response_model=VendorOrderListResponse,
    operation_id="list_vendor_orders",
    summary="List orders for this vendor with filters (pending, active, completed, closed)",
)
def list_vendor_orders(
    status: str = Query("all", description="Filter: all, pending, active, completed, closed"),
    q: str | None = Query(None, description="Search term across order#, booking#, or customer"),
    from_date: date | None = Query(None, alias="from", description="Rental start date from"),
    to_date: date | None = Query(None, alias="to", description="Rental end date to"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, alias="pageSize", description="Items per page"),
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorOrderListResponse:
    vendor_id = _get_vendor_id(current_user)
    service = VendorService(db)
    return service.list_orders(
        vendor_id=vendor_id,
        status_filter=status,
        search=q,
        start_date=from_date,
        end_date=to_date,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/orders/{vendor_order_id}",
    response_model=VendorOrderDetailResponse,
    operation_id="get_vendor_order_detail",
    summary="Get vendor order detail with items, customer contacts, delivery snapshot, and allowed actions",
)
def get_vendor_order_detail(
    vendor_order_id: int,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorOrderDetailResponse:
    vendor_id = _get_vendor_id(current_user)
    service = VendorService(db)
    return service.get_order_detail(vendor_id=vendor_id, vendor_order_id=vendor_order_id)


# --- Order Action Endpoints ---
@router.post(
    "/orders/{vendor_order_id}/accept",
    response_model=VendorOrderDetailResponse,
    operation_id="accept_vendor_order",
    summary="Accept pending vendor order",
)
def accept_vendor_order(
    vendor_order_id: int,
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorOrderDetailResponse:
    vendor_id = _get_vendor_id(current_user)
    idem_service = get_idempotency_service(db)
    idem_record = idem_service.check_or_lock(
        key=idempotency_key,
        user_id=current_user.user_id,
        endpoint=f"/api/v1/vendor/orders/{vendor_order_id}/accept",
        payload={},
    )
    if idem_record and idem_record.response_body:
        import json
        return VendorOrderDetailResponse(**json.loads(idem_record.response_body))

    with transaction(db):
        service = LifecycleService(db)
        service.accept_order(
            vendor_order_id=vendor_order_id,
            actor_user_id=current_user.user_id,
            role="vendor",
        )
        vendor_service = VendorService(db)
        res = vendor_service.get_order_detail(vendor_id=vendor_id, vendor_order_id=vendor_order_id)

    if idempotency_key:
        idem_service.save_response(
            key=idempotency_key,
            user_id=current_user.user_id,
            endpoint=f"/api/v1/vendor/orders/{vendor_order_id}/accept",
            status_code=200,
            response_body=res.model_dump_json(),
        )
    return res


@router.post(
    "/orders/{vendor_order_id}/decline",
    response_model=VendorOrderDetailResponse,
    operation_id="decline_vendor_order",
    summary="Decline pending vendor order and trigger refund of allocated share",
)
def decline_vendor_order(
    vendor_order_id: int,
    payload: DeclineOrderRequest,
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorOrderDetailResponse:
    vendor_id = _get_vendor_id(current_user)
    idem_service = get_idempotency_service(db)
    idem_record = idem_service.check_or_lock(
        key=idempotency_key,
        user_id=current_user.user_id,
        endpoint=f"/api/v1/vendor/orders/{vendor_order_id}/decline",
        payload=payload.model_dump(),
    )
    if idem_record and idem_record.response_body:
        import json
        return VendorOrderDetailResponse(**json.loads(idem_record.response_body))

    with transaction(db):
        service = LifecycleService(db)
        service.decline_order(
            vendor_order_id=vendor_order_id,
            actor_user_id=current_user.user_id,
            role="vendor",
            reason=payload.reason,
        )
        vendor_service = VendorService(db)
        res = vendor_service.get_order_detail(vendor_id=vendor_id, vendor_order_id=vendor_order_id)

    if idempotency_key:
        idem_service.save_response(
            key=idempotency_key,
            user_id=current_user.user_id,
            endpoint=f"/api/v1/vendor/orders/{vendor_order_id}/decline",
            status_code=200,
            response_body=res.model_dump_json(),
        )
    return res


@router.post(
    "/orders/{vendor_order_id}/schedule-delivery",
    response_model=VendorOrderDetailResponse,
    operation_id="schedule_order_delivery",
    summary="Schedule delivery or customer pickup window",
)
def schedule_order_delivery(
    vendor_order_id: int,
    payload: ScheduleDeliveryPayload,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorOrderDetailResponse:
    vendor_id = _get_vendor_id(current_user)
    with transaction(db):
        service = LifecycleService(db)
        service.schedule_delivery(
            vendor_order_id=vendor_order_id,
            actor_user_id=current_user.user_id,
            role="vendor",
            payload=payload,
        )
        vendor_service = VendorService(db)
        return vendor_service.get_order_detail(vendor_id=vendor_id, vendor_order_id=vendor_order_id)


@router.post(
    "/orders/{vendor_order_id}/mark-dispatched",
    response_model=VendorOrderDetailResponse,
    operation_id="mark_order_dispatched",
    summary="Mark order dispatched (out for delivery)",
)
def mark_order_dispatched(
    vendor_order_id: int,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorOrderDetailResponse:
    vendor_id = _get_vendor_id(current_user)
    with transaction(db):
        service = LifecycleService(db)
        service.mark_dispatched(
            vendor_order_id=vendor_order_id,
            actor_user_id=current_user.user_id,
            role="vendor",
        )
        vendor_service = VendorService(db)
        return vendor_service.get_order_detail(vendor_id=vendor_id, vendor_order_id=vendor_order_id)


@router.post(
    "/orders/{vendor_order_id}/mark-delivered",
    response_model=VendorOrderDetailResponse,
    operation_id="mark_order_delivered",
    summary="Mark order delivered with required proof photo storage path for deliveries",
)
def mark_order_delivered(
    vendor_order_id: int,
    payload: MarkDeliveredPayload,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorOrderDetailResponse:
    vendor_id = _get_vendor_id(current_user)
    with transaction(db):
        service = LifecycleService(db)
        service.mark_delivered(
            vendor_order_id=vendor_order_id,
            actor_user_id=current_user.user_id,
            role="vendor",
            payload=payload,
        )
        vendor_service = VendorService(db)
        return vendor_service.get_order_detail(vendor_id=vendor_id, vendor_order_id=vendor_order_id)


@router.post(
    "/orders/{vendor_order_id}/delivery-failed",
    response_model=VendorOrderDetailResponse,
    operation_id="mark_order_delivery_failed",
    summary="Mark delivery attempt failed with reason",
)
def mark_order_delivery_failed(
    vendor_order_id: int,
    payload: DeliveryFailedRequest,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorOrderDetailResponse:
    vendor_id = _get_vendor_id(current_user)
    with transaction(db):
        service = LifecycleService(db)
        service.delivery_failed(
            vendor_order_id=vendor_order_id,
            actor_user_id=current_user.user_id,
            role="vendor",
            payload=DeliveryFailedPayload(reason=payload.reason),
        )
        vendor_service = VendorService(db)
        return vendor_service.get_order_detail(vendor_id=vendor_id, vendor_order_id=vendor_order_id)


@router.post(
    "/orders/{vendor_order_id}/reschedule-delivery",
    response_model=VendorOrderDetailResponse,
    operation_id="reschedule_order_delivery",
    summary="Reschedule a failed delivery window",
)
def reschedule_order_delivery(
    vendor_order_id: int,
    payload: ScheduleDeliveryPayload,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorOrderDetailResponse:
    vendor_id = _get_vendor_id(current_user)
    with transaction(db):
        service = LifecycleService(db)
        service.reschedule_delivery(
            vendor_order_id=vendor_order_id,
            actor_user_id=current_user.user_id,
            role="vendor",
            payload=payload,
        )
        vendor_service = VendorService(db)
        return vendor_service.get_order_detail(vendor_id=vendor_id, vendor_order_id=vendor_order_id)


@router.post(
    "/orders/{vendor_order_id}/schedule-return",
    response_model=VendorOrderDetailResponse,
    operation_id="schedule_order_return",
    summary="Schedule equipment pickup return window",
)
def schedule_order_return(
    vendor_order_id: int,
    payload: ScheduleReturnPayload,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorOrderDetailResponse:
    vendor_id = _get_vendor_id(current_user)
    with transaction(db):
        service = LifecycleService(db)
        service.schedule_return(
            vendor_order_id=vendor_order_id,
            actor_user_id=current_user.user_id,
            role="vendor",
            payload=payload,
        )
        vendor_service = VendorService(db)
        return vendor_service.get_order_detail(vendor_id=vendor_id, vendor_order_id=vendor_order_id)


@router.post(
    "/orders/{vendor_order_id}/mark-returned",
    response_model=VendorOrderDetailResponse,
    operation_id="mark_order_returned",
    summary="Mark equipment returned from customer venue",
)
def mark_order_returned(
    vendor_order_id: int,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorOrderDetailResponse:
    vendor_id = _get_vendor_id(current_user)
    with transaction(db):
        service = LifecycleService(db)
        service.mark_returned(
            vendor_order_id=vendor_order_id,
            actor_user_id=current_user.user_id,
            role="vendor",
        )
        vendor_service = VendorService(db)
        return vendor_service.get_order_detail(vendor_id=vendor_id, vendor_order_id=vendor_order_id)


@router.post(
    "/orders/{vendor_order_id}/inspect",
    response_model=VendorOrderDetailResponse,
    operation_id="inspect_order_returns",
    summary="Inspect returned items; auto-completes order if all good, otherwise files damage reports",
)
def inspect_order_returns(
    vendor_order_id: int,
    payload: InspectionPayload,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorOrderDetailResponse:
    vendor_id = _get_vendor_id(current_user)
    with transaction(db):
        service = LifecycleService(db)
        service.inspect_return(
            vendor_order_id=vendor_order_id,
            actor_user_id=current_user.user_id,
            role="vendor",
            payload=payload,
        )
        vendor_service = VendorService(db)
        return vendor_service.get_order_detail(vendor_id=vendor_id, vendor_order_id=vendor_order_id)


@router.post(
    "/orders/{vendor_order_id}/complete",
    response_model=VendorOrderDetailResponse,
    operation_id="complete_vendor_order",
    summary="Complete vendor order when all damage reports are resolved; generates payout & deposit refund",
)
def complete_vendor_order(
    vendor_order_id: int,
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorOrderDetailResponse:
    vendor_id = _get_vendor_id(current_user)
    idem_service = get_idempotency_service(db)
    idem_record = idem_service.check_or_lock(
        key=idempotency_key,
        user_id=current_user.user_id,
        endpoint=f"/api/v1/vendor/orders/{vendor_order_id}/complete",
        payload={},
    )
    if idem_record and idem_record.response_body:
        import json
        return VendorOrderDetailResponse(**json.loads(idem_record.response_body))

    with transaction(db):
        service = LifecycleService(db)
        service.complete_order(
            vendor_order_id=vendor_order_id,
            actor_user_id=current_user.user_id,
            role="vendor",
        )
        vendor_service = VendorService(db)
        res = vendor_service.get_order_detail(vendor_id=vendor_id, vendor_order_id=vendor_order_id)

    if idempotency_key:
        idem_service.save_response(
            key=idempotency_key,
            user_id=current_user.user_id,
            endpoint=f"/api/v1/vendor/orders/{vendor_order_id}/complete",
            status_code=200,
            response_body=res.model_dump_json(),
        )
    return res


@router.patch(
    "/orders/{vendor_order_id}/status",
    response_model=VendorOrderDetailResponse,
    operation_id="update_vendor_order_status_dispatch",
    summary="Dispatcher endpoint matching client API to perform status actions",
)
def update_vendor_order_status_dispatcher(
    vendor_order_id: int,
    payload: StatusUpdateRequest,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorOrderDetailResponse:
    act = payload.action
    if act == "accept":
        return accept_vendor_order(vendor_order_id, None, current_user, db)
    elif act == "decline":
        return decline_vendor_order(vendor_order_id, DeclineOrderRequest(reason=payload.reason or "Declined by vendor"), None, current_user, db)
    elif act in ("schedule_delivery", "schedule_pickup"):
        if not payload.schedule_delivery:
            raise ValidationFailedError("Missing schedule_delivery payload.")
        return schedule_order_delivery(vendor_order_id, payload.schedule_delivery, current_user, db)
    elif act == "dispatch":
        return mark_order_dispatched(vendor_order_id, current_user, db)
    elif act == "mark_delivered":
        if not payload.mark_delivered:
            raise ValidationFailedError("Missing mark_delivered payload.")
        return mark_order_delivered(vendor_order_id, payload.mark_delivered, current_user, db)
    elif act == "delivery_failed":
        reason = payload.delivery_failed.reason if payload.delivery_failed else (payload.reason or "Delivery failed")
        return mark_order_delivery_failed(vendor_order_id, DeliveryFailedRequest(reason=reason), current_user, db)
    elif act == "reschedule_delivery":
        if not payload.schedule_delivery:
            raise ValidationFailedError("Missing schedule_delivery payload.")
        return reschedule_order_delivery(vendor_order_id, payload.schedule_delivery, current_user, db)
    elif act == "schedule_return":
        if not payload.schedule_return:
            raise ValidationFailedError("Missing schedule_return payload.")
        return schedule_order_return(vendor_order_id, payload.schedule_return, current_user, db)
    elif act == "mark_returned":
        return mark_order_returned(vendor_order_id, current_user, db)
    elif act == "inspect":
        if not payload.inspection:
            raise ValidationFailedError("Missing inspection payload.")
        return inspect_order_returns(vendor_order_id, payload.inspection, current_user, db)
    elif act == "complete_order":
        return complete_vendor_order(vendor_order_id, None, current_user, db)
    else:
        raise ValidationFailedError(f"Unknown action '{act}'.")


# -----------------------------------------------------------------------------
# COD Actions
# -----------------------------------------------------------------------------
@router.post(
    "/orders/{vendor_order_id}/record-cash",
    response_model=VendorOrderDetailResponse,
    operation_id="record_order_cash_collection",
    summary="Record cash collected from customer upon delivery (COD)",
)
def record_order_cash_collection(
    vendor_order_id: int,
    payload: RecordCashRequest,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorOrderDetailResponse:
    vendor_id = _get_vendor_id(current_user)
    with transaction(db):
        service = VendorService(db)
        return service.record_cash_collected(
            vendor_id=vendor_id,
            vendor_order_id=vendor_order_id,
            req=payload,
            actor_user_id=current_user.user_id,
        )


@router.post(
    "/orders/{vendor_order_id}/no-show",
    response_model=VendorOrderDetailResponse,
    operation_id="record_order_no_show",
    summary="Record customer no-show at delivery venue (COD abuse tracking)",
)
def record_order_no_show(
    vendor_order_id: int,
    payload: RecordNoShowRequest,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorOrderDetailResponse:
    vendor_id = _get_vendor_id(current_user)
    with transaction(db):
        service = VendorService(db)
        return service.record_no_show(
            vendor_id=vendor_id,
            vendor_order_id=vendor_order_id,
            req=payload,
            actor_user_id=current_user.user_id,
        )


@router.post(
    "/orders/{vendor_order_id}/record-deposit",
    response_model=VendorOrderDetailResponse,
    operation_id="record_order_deposit_settlement",
    summary="Record cash deposit settlement upon equipment return (COD)",
)
def record_order_deposit_settlement(
    vendor_order_id: int,
    payload: RecordDepositSettlementRequest,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorOrderDetailResponse:
    vendor_id = _get_vendor_id(current_user)
    with transaction(db):
        service = VendorService(db)
        return service.record_deposit_settlement(
            vendor_id=vendor_id,
            vendor_order_id=vendor_order_id,
            req=payload,
            actor_user_id=current_user.user_id,
        )


# =============================================================================
# 3. Returns
# =============================================================================
@router.get(
    "/returns",
    response_model=dict[str, Any],
    operation_id="list_vendor_returns",
    summary="List returns with filters (all, scheduled, to_inspect, inspected, disputed)",
)
def list_vendor_returns(
    tab: str = Query("all", description="Filter tab: all, scheduled, to_inspect, inspected, disputed"),
    q: str | None = Query(None, description="Search term"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50, alias="pageSize"),
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    vendor_id = _get_vendor_id(current_user)
    service = VendorService(db)
    # Filter returns via orders
    res = service.list_orders(vendor_id=vendor_id, status_filter="active", search=q, page=page, page_size=page_size)
    returns_list = [o for o in res.items if o.return_record is not None]
    if tab and tab != "all":
        returns_list = [o for o in returns_list if o.return_record and o.return_record.get("status") == tab]
    return {
        "items": returns_list,
        "total": len(returns_list),
        "page": page,
        "pageSize": page_size,
    }


# =============================================================================
# 4. Inventory & Equipment
# =============================================================================
@router.get(
    "/inventory",
    response_model=InventoryListResponse,
    operation_id="list_vendor_inventory",
    summary="List inventory items with stats, filters, search, and pagination",
)
@router.get(
    "/equipment",
    response_model=InventoryListResponse,
    operation_id="list_vendor_equipment_alias",
    summary="Alias for list vendor inventory",
    include_in_schema=False,
)
def list_vendor_inventory(
    status: str | None = Query(None, description="Status filter: active, inactive, archived"),
    category_id: int | None = Query(None, description="Filter by category"),
    stock: str | None = Query(None, description="'low' for stock <= 1"),
    q: str | None = Query(None, description="Search by name or description"),
    sort: str = Query("newest", description="Sort: newest, price_asc, price_desc, rating"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50, alias="pageSize"),
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> InventoryListResponse:
    vendor_id = _get_vendor_id(current_user)
    service = VendorService(db)
    return service.list_inventory(
        vendor_id=vendor_id,
        status_filter=status,
        category_id=category_id,
        low_stock=(stock == "low"),
        search=q,
        sort=sort,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/inventory/{equipment_id}",
    response_model=InventoryItemResponse,
    operation_id="get_vendor_inventory_item",
    summary="Get vendor inventory item detail",
)
@router.get(
    "/equipment/{equipment_id}",
    response_model=InventoryItemResponse,
    operation_id="get_vendor_equipment_alias",
    include_in_schema=False,
)
def get_vendor_inventory_item(
    equipment_id: int,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> InventoryItemResponse:
    vendor_id = _get_vendor_id(current_user)
    service = VendorService(db)
    return service.get_inventory_item(vendor_id=vendor_id, equipment_id=equipment_id)


@router.post(
    "/inventory",
    response_model=InventoryItemResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="create_vendor_equipment",
    summary="Create new equipment listing with validated images and specifications",
)
@router.post(
    "/equipment",
    response_model=InventoryItemResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="create_vendor_equipment_alias",
    include_in_schema=False,
)
def create_vendor_equipment(
    payload: CreateEquipmentRequest,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> InventoryItemResponse:
    vendor_id = _get_vendor_id(current_user)
    with transaction(db):
        service = VendorService(db)
        return service.create_equipment(vendor_id=vendor_id, payload=payload)


@router.patch(
    "/inventory/{equipment_id}",
    response_model=InventoryItemResponse,
    operation_id="update_vendor_equipment",
    summary="Update equipment listing; quantity cannot drop below upcoming booked units",
)
@router.patch(
    "/equipment/{equipment_id}",
    response_model=InventoryItemResponse,
    operation_id="update_vendor_equipment_alias",
    include_in_schema=False,
)
def update_vendor_equipment(
    equipment_id: int,
    payload: UpdateEquipmentRequest,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> InventoryItemResponse:
    vendor_id = _get_vendor_id(current_user)
    with transaction(db):
        service = VendorService(db)
        return service.update_equipment(vendor_id=vendor_id, equipment_id=equipment_id, payload=payload)


@router.post(
    "/inventory/{equipment_id}/duplicate",
    response_model=InventoryItemResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="duplicate_vendor_equipment",
    summary="Duplicate equipment listing creating a new inactive copy",
)
def duplicate_vendor_equipment(
    equipment_id: int,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> InventoryItemResponse:
    vendor_id = _get_vendor_id(current_user)
    with transaction(db):
        service = VendorService(db)
        return service.duplicate_equipment(vendor_id=vendor_id, equipment_id=equipment_id)


@router.post(
    "/inventory/bulk-status",
    response_model=dict[str, Any],
    operation_id="bulk_update_vendor_equipment_status",
    summary="Bulk activate, deactivate, or archive equipment (archiving is blocked if upcoming bookings exist)",
)
def bulk_update_vendor_equipment_status(
    payload: BulkStatusRequest,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    vendor_id = _get_vendor_id(current_user)
    with transaction(db):
        service = VendorService(db)
        return service.bulk_status(vendor_id=vendor_id, equipment_ids=payload.equipment_ids, new_status=payload.status)


# =============================================================================
# 5. Availability Blocks
# =============================================================================
@router.get(
    "/inventory/{equipment_id}/availability-blocks",
    response_model=list[AvailabilityBlockResponse],
    operation_id="list_equipment_availability_blocks",
    summary="List active availability blocks for equipment",
)
def list_equipment_availability_blocks(
    equipment_id: int,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> list[AvailabilityBlockResponse]:
    vendor_id = _get_vendor_id(current_user)
    service = VendorService(db)
    return service.list_availability_blocks(vendor_id=vendor_id, equipment_id=equipment_id)


@router.post(
    "/inventory/{equipment_id}/availability-blocks",
    response_model=AvailabilityBlockResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="create_equipment_availability_block",
    summary="Add an availability block validating that units are free on every day of range",
)
@router.post(
    "/equipment/{equipment_id}/availability",
    response_model=AvailabilityBlockResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="create_equipment_availability_block_alias",
    include_in_schema=False,
)
def create_equipment_availability_block(
    equipment_id: int,
    payload: CreateAvailabilityBlockRequest,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> AvailabilityBlockResponse:
    vendor_id = _get_vendor_id(current_user)
    with transaction(db):
        service = VendorService(db)
        return service.add_availability_block(vendor_id=vendor_id, equipment_id=equipment_id, payload=payload)


@router.delete(
    "/inventory/{equipment_id}/availability-blocks/{block_id}",
    response_model=dict[str, bool],
    operation_id="remove_equipment_availability_block",
    summary="Remove an availability block",
)
def remove_equipment_availability_block(
    equipment_id: int,
    block_id: int,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    vendor_id = _get_vendor_id(current_user)
    with transaction(db):
        service = VendorService(db)
        return service.remove_availability_block(vendor_id=vendor_id, equipment_id=equipment_id, block_id=block_id)


# =============================================================================
# 6. Payouts
# =============================================================================
@router.get(
    "/payouts",
    response_model=VendorPayoutsResult,
    operation_id="list_vendor_payouts",
    summary="List payouts with tiles, status filters, and per-item commission snapshot breakdown",
)
def list_vendor_payouts(
    status: str | None = Query(None, description="Status filter: pending, processing, paid"),
    range: str | None = Query(None, description="Time range: 7d, 30d, 90d"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50, alias="pageSize"),
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorPayoutsResult:
    vendor_id = _get_vendor_id(current_user)
    service = VendorService(db)
    return service.list_payouts(vendor_id=vendor_id, status_filter=status, range_str=range, page=page, page_size=page_size)


@router.get(
    "/payouts/{payout_id}",
    response_model=VendorPayoutResponse,
    operation_id="get_vendor_payout_detail",
    summary="Get vendor payout detail with item lines",
)
def get_vendor_payout_detail(
    payout_id: int,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorPayoutResponse:
    vendor_id = _get_vendor_id(current_user)
    service = VendorService(db)
    return service.get_payout_detail(vendor_id=vendor_id, payout_id=payout_id)


# =============================================================================
# 7. Reviews
# =============================================================================
@router.get(
    "/reviews",
    response_model=VendorReviewsResult,
    operation_id="list_vendor_reviews",
    summary="List customer reviews on vendor equipment with distribution summary",
)
def list_vendor_reviews(
    rating: int | None = Query(None, ge=1, le=5),
    needs_reply: bool | None = Query(None, alias="needsReply"),
    equipment_id: int | None = Query(None),
    sort: str = Query("newest", description="newest, highest, lowest"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50, alias="pageSize"),
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> VendorReviewsResult:
    vendor_id = _get_vendor_id(current_user)
    service = VendorService(db)
    return service.list_reviews(
        vendor_id=vendor_id,
        rating_filter=rating,
        needs_reply=needs_reply,
        equipment_id=equipment_id,
        sort=sort,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/reviews/{review_id}/reply",
    response_model=dict[str, bool],
    operation_id="reply_to_vendor_review",
    summary="Submit or edit a vendor reply to a review and notify customer",
)
def reply_to_vendor_review(
    review_id: int,
    payload: ReviewReplyRequest,
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    vendor_id = _get_vendor_id(current_user)
    with transaction(db):
        service = VendorService(db)
        service.reply_to_review(vendor_id=vendor_id, review_id=review_id, reply_text=payload.reply_text)
    return {"success": True}


# =============================================================================
# 8. Business Profile
# =============================================================================
@router.get(
    "/profile",
    response_model=VendorProfileResponse,
    operation_id="get_vendor_profile",
    summary="Get vendor business profile (pending vendors may view)",
)
def get_vendor_profile(
    current_user: CurrentUser = Depends(require_vendor),
    db: Session = Depends(get_db),
) -> VendorProfileResponse:
    vendor_id = _get_vendor_id(current_user)
    service = VendorService(db)
    return service.get_profile(vendor_id=vendor_id)


@router.patch(
    "/profile",
    response_model=VendorProfileResponse,
    operation_id="update_vendor_profile",
    summary="Update vendor business profile; rejected/suspended vendors receive 403",
)
def update_vendor_profile(
    payload: UpdateVendorProfileRequest,
    current_user: CurrentUser = Depends(require_vendor),
    db: Session = Depends(get_db),
) -> VendorProfileResponse:
    vendor_id = _get_vendor_id(current_user)
    approval_st = current_user.vendor.approval_status if current_user.vendor else "pending"
    with transaction(db):
        service = VendorService(db)
        return service.update_profile(vendor_id=vendor_id, payload=payload, current_status=approval_st)


# =============================================================================
# 9. Inbox & Notifications
# =============================================================================
@router.get(
    "/inbox/conversations",
    response_model=list[ConversationResponse],
    operation_id="get_vendor_conversations",
    summary="Get vendor inbox conversations",
)
@router.get(
    "/messages",
    response_model=list[ConversationResponse],
    operation_id="get_vendor_messages_alias",
    include_in_schema=False,
)
def get_vendor_conversations(
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> list[ConversationResponse]:
    from app.models.accounts import User
    from app.services.social import SocialService
    u = db.query(User).filter(User.user_id == current_user.user_id).first()
    if not u:
        return []
    social = SocialService(db)
    items = social.list_conversations(user=u)
    return [ConversationResponse(**c) for c in items]


@router.get(
    "/notifications",
    response_model=list[NotificationResponse],
    operation_id="get_vendor_notifications",
    summary="Get notifications for vendor user",
)
def get_vendor_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50, alias="pageSize"),
    current_user: CurrentUser = Depends(require_approved_vendor),
    db: Session = Depends(get_db),
) -> list[NotificationResponse]:
    from app.models.accounts import User
    from app.services.social import SocialService
    u = db.query(User).filter(User.user_id == current_user.user_id).first()
    if not u:
        return []
    social = SocialService(db)
    res = social.list_notifications(user=u, page=page, page_size=page_size)
    return [NotificationResponse(**n) for n in res["items"]]
