from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ValidationFailedError
from app.models.accounts import User
from app.repositories.booking import BookingRepository
from app.repositories.customer import CustomerRepository


class SocialService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.cust_repo = CustomerRepository(db)
        self.booking_repo = BookingRepository(db)

    # -------------------------------------------------------------------------
    # Messages & Conversations
    # -------------------------------------------------------------------------
    def list_conversations(self, user: User) -> list[dict[str, Any]]:
        return self.cust_repo.list_conversations(user.user_id)

    def get_conversation_thread(
        self,
        user: User,
        counterparty_id: int,
        equipment_id: int | None = None,
    ) -> list[dict[str, Any]]:
        messages = self.cust_repo.get_thread_messages(
            user_id=user.user_id,
            counterparty_user_id=counterparty_id,
            equipment_id=equipment_id,
        )
        self.db.commit()
        return [
            {
                "message_id": str(m.message_id),
                "conversation_id": f"{counterparty_id}_{equipment_id or 'general'}",
                "sender": "customer" if m.sender_id == user.user_id else "vendor",
                "text": m.body,
                "created_at": m.created_at.isoformat(),
                "status": "seen" if m.is_read else "sent",
            }
            for m in messages
        ]

    def send_message(
        self,
        user: User,
        receiver_id: int,
        equipment_id: int | None,
        body: str,
    ) -> dict[str, Any]:
        """
        Sends message to counterparty (vendor user).
        Body: 1 to 1000 characters.
        Attachments are not allowed.
        """
        clean_body = body.strip()
        if not clean_body or len(clean_body) > 1000:
            raise ValidationFailedError(
                "Message body must be between 1 and 1000 characters",
                [{"field": "body", "message": "Message body must be between 1 and 1000 characters"}],
            )

        msg = self.cust_repo.send_message(
            sender_id=user.user_id,
            receiver_id=receiver_id,
            equipment_id=equipment_id,
            body=clean_body,
        )
        self.db.commit()
        return {
            "message_id": str(msg.message_id),
            "sender_id": str(msg.sender_id),
            "receiver_id": str(msg.receiver_id),
            "equipment_id": str(msg.equipment_id) if msg.equipment_id else None,
            "body": msg.body,
            "is_read": bool(msg.is_read),
            "created_at": msg.created_at.isoformat(),
        }

    # -------------------------------------------------------------------------
    # Notifications
    # -------------------------------------------------------------------------
    def list_notifications(
        self,
        user: User,
        unread_only: bool = False,
        page: int = 1,
        page_size: int = 10,
    ) -> dict[str, Any]:
        capped_page_size = min(max(1, page_size), 50)
        safe_page = max(1, page)
        items, total = self.cust_repo.get_notifications(
            user_id=user.user_id,
            unread_only=unread_only,
            page=safe_page,
            page_size=capped_page_size,
        )
        return {
            "items": [
                {
                    "id": str(n.notification_id),
                    "title": n.title,
                    "message": n.message,
                    "time": n.created_at.isoformat(),
                    "read": bool(n.is_read),
                    "type": n.type,
                }
                for n in items
            ],
            "total": total,
            "page": safe_page,
            "pageSize": capped_page_size,
        }

    def mark_notification_read(self, user: User, notification_id: int) -> dict[str, Any]:
        success = self.cust_repo.mark_notification_read(user.user_id, notification_id)
        if not success:
            raise NotFoundError("Notification", str(notification_id))
        self.db.commit()
        return {
            "notification_id": str(notification_id),
            "is_read": True,
        }

    def mark_all_notifications_read(self, user: User) -> dict[str, Any]:
        count = self.cust_repo.mark_all_notifications_read(user.user_id)
        self.db.commit()
        return {"updated_count": count}

    # -------------------------------------------------------------------------
    # Reviews
    # -------------------------------------------------------------------------
    def create_review(
        self,
        user: User,
        booking_item_id: int | None = None,
        booking_id: int | None = None,
        equipment_id: int | None = None,
        rating: int = 5,
        comment: str | None = None,
    ) -> dict[str, Any]:
        """
        Creates a review for a returned booking item.
        Rating: 1 to 5.
        Comment: up to 500 characters.
        """
        if rating < 1 or rating > 5:
            raise ValidationFailedError(
                "Rating must be an integer between 1 and 5",
                [{"field": "rating", "message": "Rating must be between 1 and 5"}],
            )
        if comment and len(comment.strip()) > 500:
            raise ValidationFailedError(
                "Review comment must not exceed 500 characters",
                [{"field": "comment", "message": "Comment cannot exceed 500 characters"}],
            )

        review = self.booking_repo.create_review(
            user_id=user.user_id,
            rating=rating,
            comment=comment.strip() if comment else None,
            booking_item_id=booking_item_id,
            booking_id=booking_id,
            equipment_id=equipment_id,
        )
        self.db.commit()
        return {
            "review_id": str(review.review_id),
            "booking_item_id": str(review.booking_item_id),
            "equipment_id": str(review.equipment_id),
            "vendor_id": str(review.vendor_id),
            "rating": review.rating,
            "comment": review.comment,
            "review_date": review.review_date.isoformat(),
        }

    def get_items_to_review(self, user: User) -> list[dict[str, Any]]:
        return self.booking_repo.get_items_to_review(user.user_id)

    def get_my_reviews(self, user: User) -> list[dict[str, Any]]:
        return self.booking_repo.get_my_reviews(user.user_id)
