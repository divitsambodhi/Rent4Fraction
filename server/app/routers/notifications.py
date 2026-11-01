from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import CurrentUser, get_current_user
from app.models.accounts import User
from app.schemas.social import (
    NotificationListResponse,
    NotificationReadResponse,
)
from app.services.social import SocialService

router = APIRouter(prefix="/api/v1", tags=["Notifications"])


def _get_user(db: Session, current_user: CurrentUser) -> User:
    user = db.query(User).filter(User.user_id == current_user.user_id).first()
    assert user is not None
    return user


@router.get(
    "/notifications/unread-count",
    response_model=dict[str, int],
    operation_id="get_notifications_unread_count",
    summary="Count of unread notifications for the current user",
)
def get_notifications_unread_count(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    from sqlalchemy import func
    from app.models.social import Notification

    count: int = (
        db.query(func.count(Notification.notification_id))
        .filter(
            Notification.user_id == current_user.user_id,
            Notification.is_read == 0,
        )
        .scalar()
        or 0
    )
    return {"unread_count": count}


@router.get(
    "/notifications",
    response_model=NotificationListResponse,
    operation_id="list_user_notifications",
    summary="Get user notifications with unread filter and pagination",
)
@router.get(
    "/account/notifications",
    response_model=NotificationListResponse,
    operation_id="list_account_notifications_alias",
    summary="Alias for user notifications",
    include_in_schema=False,
)
def list_user_notifications(
    unread_only: bool = Query(False, description="Filter unread notifications only"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, alias="pageSize", description="Items per page"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = SocialService(db)
    return service.list_notifications(
        user=user,
        unread_only=unread_only,
        page=page,
        page_size=page_size,
    )


@router.patch(
    "/notifications/{notification_id}/read",
    response_model=NotificationReadResponse,
    operation_id="mark_notification_read",
    summary="Mark single notification as read",
)
def mark_notification_read(
    notification_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = SocialService(db)
    return service.mark_notification_read(user, notification_id)


@router.post(
    "/notifications/mark-all-read",
    response_model=dict[str, int],
    operation_id="mark_all_notifications_read",
    summary="Mark all user notifications as read",
)
def mark_all_notifications_read(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    user = _get_user(db, current_user)
    service = SocialService(db)
    return service.mark_all_notifications_read(user)
