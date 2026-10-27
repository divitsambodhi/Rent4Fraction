from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import CurrentUser, get_current_user
from app.models.accounts import User
from app.schemas.social import (
    ConversationResponse,
    MessageResponse,
    MessageSendRequest,
)
from app.services.social import SocialService

router = APIRouter(prefix="/api/v1", tags=["Messages"])


def _get_user(db: Session, current_user: CurrentUser) -> User:
    user = db.query(User).filter(User.user_id == current_user.user_id).first()
    assert user is not None
    return user


@router.get(
    "/messages",
    response_model=list[ConversationResponse],
    operation_id="list_user_conversations",
    summary="List conversations grouped by counterparty and equipment with unread count",
)
@router.get(
    "/account/conversations",
    response_model=list[ConversationResponse],
    operation_id="list_account_conversations_alias",
    summary="Alias for user conversations",
    include_in_schema=False,
)
def list_user_conversations(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = SocialService(db)
    return service.list_conversations(user)


@router.get(
    "/messages/threads/{counterparty_id}/{equipment_id}",
    response_model=list[MessageResponse],
    operation_id="get_conversation_thread",
    summary="Get full conversation message history and mark incoming messages as read",
)
def get_conversation_thread(
    counterparty_id: int,
    equipment_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    eq_id_int = int(equipment_id) if equipment_id.isdigit() else None
    service = SocialService(db)
    return service.get_conversation_thread(
        user=user,
        counterparty_id=counterparty_id,
        equipment_id=eq_id_int,
    )


@router.post(
    "/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="send_user_message",
    summary="Send direct message to vendor or counterparty user",
)
def send_user_message(
    payload: MessageSendRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    user = _get_user(db, current_user)
    service = SocialService(db)
    return service.send_message(
        user=user,
        receiver_id=payload.get_receiver_id(),
        equipment_id=payload.get_equipment_id(),
        body=payload.get_body(),
    )

