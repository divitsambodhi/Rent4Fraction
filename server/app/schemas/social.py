from __future__ import annotations

from pydantic import ConfigDict, BaseModel, Field


# -----------------------------------------------------------------------------
# Messages & Conversations Schemas
# -----------------------------------------------------------------------------
class MessageSendRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    vendor_id: str | None = None
    receiver_id: int | None = None
    equipment_id: int | str | None = None
    content: str | None = None
    body: str | None = None
    conversation_id: str | None = None

    def get_receiver_id(self) -> int:
        if self.receiver_id is not None:
            return self.receiver_id
        if self.vendor_id is not None and self.vendor_id.isdigit():
            return int(self.vendor_id)
        return 1

    def get_equipment_id(self) -> int | None:
        if self.equipment_id is None:
            return None
        if isinstance(self.equipment_id, int):
            return self.equipment_id
        if isinstance(self.equipment_id, str) and self.equipment_id.isdigit():
            return int(self.equipment_id)
        return None

    def get_body(self) -> str:
        return self.body or self.content or ""


class MessageResponse(BaseModel):
    message_id: str
    conversation_id: str
    sender: str  # 'customer' | 'vendor'
    text: str
    created_at: str
    status: str = "sent"


class ConversationResponse(BaseModel):
    conversation_id: str
    vendor_id: str
    vendor_name: str
    vendor_initials: str
    equipment_id: str
    equipment_name: str
    equipment_image: str = ""
    last_message: str
    last_message_time: str
    unread_count: int


# -----------------------------------------------------------------------------
# Notifications Schemas
# -----------------------------------------------------------------------------
class AppNotificationTarget(BaseModel):
    tab: str | None = None
    booking_id: str | None = None
    thread_id: str | None = None
    address_id: str | None = None


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str
    time: str | None = None
    created_at: str | None = None
    read: bool
    target: AppNotificationTarget = Field(default_factory=AppNotificationTarget)
    link: str | None = None


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    page: int = 1
    pageSize: int = 10


class NotificationReadResponse(BaseModel):
    notification_id: str
    is_read: bool = True


class SuccessResponse(BaseModel):
    success: bool = True
    message: str | None = None


# -----------------------------------------------------------------------------
# Reviews Schemas
# -----------------------------------------------------------------------------
class ReviewCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    booking_item_id: int | str | None = None
    booking_id: int | str | None = None
    equipment_id: int | str | None = None
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=500)


class ReviewResponse(BaseModel):
    review_id: str
    booking_item_id: str
    equipment_id: str
    vendor_id: str
    rating: int
    comment: str | None = None
    review_date: str


class ReviewToWriteResponse(BaseModel):
    booking_id: str
    equipment_id: str
    equipment_name: str
    equipment_image: str
    vendor_name: str
    returned_date: str


class MyReviewResponse(BaseModel):
    review_id: str
    booking_id: str
    equipment_id: str
    equipment_name: str
    equipment_image: str
    vendor_name: str
    rating: int
    comment: str | None = None
    vendor_reply: str | None = None
    created_at: str


ItemToReviewResponse = ReviewToWriteResponse
CustomerReviewItemResponse = MyReviewResponse
