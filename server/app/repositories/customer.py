from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.errors import ConflictError
from app.models.accounts import Address
from app.models.catalog import Equipment
from app.models.orders import (
    Booking,
    BookingStatus,
    CartItem,
    WishlistItem,
)
from app.models.social import Message, Notification


class CustomerRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # -------------------------------------------------------------------------
    # Cart Operations
    # -------------------------------------------------------------------------
    def get_cart_items(self, user_id: int) -> list[CartItem]:
        return (
            self.db.query(CartItem)
            .options(
                joinedload(CartItem.equipment).joinedload(Equipment.vendor),
                joinedload(CartItem.equipment).joinedload(Equipment.category),
                joinedload(CartItem.equipment).joinedload(Equipment.images),
            )
            .filter(CartItem.user_id == user_id)
            .all()
        )

    def find_cart_item(
        self, user_id: int, equipment_id: int, start_date: date, end_date: date
    ) -> CartItem | None:
        return (
            self.db.query(CartItem)
            .filter(
                CartItem.user_id == user_id,
                CartItem.equipment_id == equipment_id,
                CartItem.start_date == start_date,
                CartItem.end_date == end_date,
            )
            .first()
        )

    def get_cart_item_by_id(self, user_id: int, cart_item_id: int) -> CartItem | None:
        return (
            self.db.query(CartItem)
            .filter(CartItem.cart_item_id == cart_item_id, CartItem.user_id == user_id)
            .first()
        )

    def add_cart_item(
        self,
        user_id: int,
        equipment_id: int,
        quantity: int,
        start_date: date,
        end_date: date,
    ) -> CartItem:
        existing = self.find_cart_item(user_id, equipment_id, start_date, end_date)
        if existing:
            existing.quantity = min(50, existing.quantity + quantity)
            self.db.flush()
            return existing

        item = CartItem(
            user_id=user_id,
            equipment_id=equipment_id,
            quantity=quantity,
            start_date=start_date,
            end_date=end_date,
        )
        self.db.add(item)
        self.db.flush()
        return item

    def delete_cart_item(self, user_id: int, cart_item_id: int) -> bool:
        item = self.get_cart_item_by_id(user_id, cart_item_id)
        if not item:
            return False
        self.db.delete(item)
        self.db.flush()
        return True

    def clear_cart(self, user_id: int) -> None:
        self.db.query(CartItem).filter(CartItem.user_id == user_id).delete()
        self.db.flush()

    # -------------------------------------------------------------------------
    # Wishlist Operations
    # -------------------------------------------------------------------------
    def get_wishlist_items(self, user_id: int) -> list[WishlistItem]:
        return (
            self.db.query(WishlistItem)
            .options(
                joinedload(WishlistItem.equipment).joinedload(Equipment.vendor),
                joinedload(WishlistItem.equipment).joinedload(Equipment.category),
                joinedload(WishlistItem.equipment).joinedload(Equipment.images),
            )
            .filter(WishlistItem.user_id == user_id)
            .order_by(WishlistItem.created_at.desc())
            .all()
        )

    def add_wishlist_item(self, user_id: int, equipment_id: int) -> WishlistItem:
        item = (
            self.db.query(WishlistItem)
            .filter(WishlistItem.user_id == user_id, WishlistItem.equipment_id == equipment_id)
            .first()
        )
        if item:
            return item

        item = WishlistItem(user_id=user_id, equipment_id=equipment_id)
        self.db.add(item)
        self.db.flush()
        return item

    def remove_wishlist_item(self, user_id: int, equipment_id: int) -> bool:
        item = (
            self.db.query(WishlistItem)
            .filter(WishlistItem.user_id == user_id, WishlistItem.equipment_id == equipment_id)
            .first()
        )
        if not item:
            return False
        self.db.delete(item)
        self.db.flush()
        return True

    # -------------------------------------------------------------------------
    # Address Operations
    # -------------------------------------------------------------------------
    def get_user_addresses(self, user_id: int) -> list[tuple[Address, int]]:
        """
        Returns list of (Address, used_in_bookings_count).
        """
        addresses = (
            self.db.query(Address)
            .filter(Address.user_id == user_id)
            .order_by(Address.is_default.desc(), Address.created_at.desc())
            .all()
        )

        results: list[tuple[Address, int]] = []
        for addr in addresses:
            booking_count = (
                self.db.query(func.count(Booking.booking_id))
                .filter(Booking.address_id == addr.address_id)
                .scalar()
                or 0
            )
            results.append((addr, int(booking_count)))

        return results

    def get_address_by_id(self, user_id: int, address_id: int) -> Address | None:
        return (
            self.db.query(Address)
            .filter(Address.address_id == address_id, Address.user_id == user_id)
            .first()
        )

    def create_address(
        self,
        user_id: int,
        label: str | None,
        line1: str,
        line2: str | None,
        city: str,
        state: str,
        pincode: str,
        country: str = "India",
        is_default: bool = False,
    ) -> Address:
        existing_count = (
            self.db.query(func.count(Address.address_id))
            .filter(Address.user_id == user_id)
            .scalar()
            or 0
        )

        # First address is automatically default
        make_default = is_default or (existing_count == 0)

        if make_default:
            # Clear any existing default
            self.db.query(Address).filter(
                Address.user_id == user_id, Address.is_default == 1
            ).update({"is_default": 0})
            self.db.flush()

        addr = Address(
            user_id=user_id,
            label=label,
            line1=line1,
            line2=line2,
            city=city,
            state=state,
            pincode=pincode,
            country=country,
            is_default=1 if make_default else 0,
        )
        self.db.add(addr)
        self.db.flush()
        return addr

    def update_address(
        self,
        user_id: int,
        address_id: int,
        label: str | None = None,
        line1: str | None = None,
        line2: str | None = None,
        city: str | None = None,
        state: str | None = None,
        pincode: str | None = None,
        country: str | None = None,
        is_default: bool | None = None,
    ) -> Address | None:
        addr = self.get_address_by_id(user_id, address_id)
        if not addr:
            return None

        if is_default is True and addr.is_default != 1:
            # Clear old default
            self.db.query(Address).filter(
                Address.user_id == user_id, Address.is_default == 1
            ).update({"is_default": 0})
            self.db.flush()
            addr.is_default = 1
        elif is_default is False and addr.is_default == 1:
            # Only allow unsetting default if there are other addresses to promote
            other = (
                self.db.query(Address)
                .filter(Address.user_id == user_id, Address.address_id != address_id)
                .order_by(Address.created_at.desc(), Address.address_id.desc())
                .first()
            )
            if other:
                addr.is_default = 0
                other.is_default = 1
                self.db.flush()

        if label is not None:
            addr.label = label
        if line1 is not None:
            addr.line1 = line1
        if line2 is not None:
            addr.line2 = line2
        if city is not None:
            addr.city = city
        if state is not None:
            addr.state = state
        if pincode is not None:
            addr.pincode = pincode
        if country is not None:
            addr.country = country

        self.db.flush()
        return addr

    def delete_address(self, user_id: int, address_id: int) -> bool:
        addr = self.get_address_by_id(user_id, address_id)
        if not addr:
            return False

        # Invariant: used_in_bookings cannot be deleted -> 409 address_in_use
        booking_count = (
            self.db.query(func.count(Booking.booking_id))
            .filter(Booking.address_id == address_id)
            .scalar()
            or 0
        )
        if booking_count > 0:
            raise ConflictError(
                "Address is used in bookings and cannot be deleted",
                details={"address_id": str(address_id), "used_in_bookings": booking_count},
                code="address_in_use",
            )

        was_default = bool(addr.is_default)
        self.db.delete(addr)
        self.db.flush()

        if was_default:
            # Promote most recent address
            next_addr = (
                self.db.query(Address)
                .filter(Address.user_id == user_id)
                .order_by(Address.created_at.desc(), Address.address_id.desc())
                .first()
            )
            if next_addr:
                next_addr.is_default = 1
                self.db.flush()

        return True

    def set_default_address(self, user_id: int, address_id: int) -> Address | None:
        addr = self.get_address_by_id(user_id, address_id)
        if not addr:
            return None

        # Unset previous default
        self.db.query(Address).filter(
            Address.user_id == user_id, Address.is_default == 1
        ).update({"is_default": 0})
        addr.is_default = 1
        self.db.flush()
        return addr

    # -------------------------------------------------------------------------
    # Messages & Conversations Operations
    # -------------------------------------------------------------------------
    def list_conversations(self, user_id: int) -> list[dict[str, Any]]:
        """
        Groups messages involving user_id by (counterparty_id, equipment_id).
        Returns list of conversations with unread incoming count.
        """
        # Find all messages where user is sender or receiver
        messages = (
            self.db.query(Message)
            .options(
                joinedload(Message.sender),
                joinedload(Message.receiver),
                joinedload(Message.equipment).joinedload(Equipment.vendor),
            )
            .filter(or_(Message.sender_id == user_id, Message.receiver_id == user_id))
            .order_by(Message.created_at.asc())
            .all()
        )

        conv_map: dict[str, dict[str, Any]] = {}
        for m in messages:
            counterparty = m.receiver if m.sender_id == user_id else m.sender

            if not counterparty:
                continue

            eq_id_str = str(m.equipment_id) if m.equipment_id else "general"
            key = f"{counterparty.user_id}_{eq_id_str}"

            if key not in conv_map:
                # Resolve vendor info
                v_name = counterparty.name
                v_id_str = str(counterparty.user_id)
                if counterparty.vendor_profile:
                    v_name = counterparty.vendor_profile.business_name
                    v_id_str = str(counterparty.vendor_profile.vendor_id)

                words = v_name.strip().split()
                initials = "".join(w[0].upper() for w in words[:2])

                eq_name = m.equipment.name if m.equipment else "General Inquiry"
                eq_img = m.equipment.images[0].url if m.equipment and m.equipment.images else ""

                conv_map[key] = {
                    "conversation_id": key,
                    "vendor_id": v_id_str,
                    "vendor_name": v_name,
                    "vendor_initials": initials,
                    "equipment_id": str(m.equipment_id) if m.equipment_id else "",
                    "equipment_name": eq_name,
                    "equipment_image": eq_img,
                    "last_message": m.body,
                    "last_message_time": m.created_at.isoformat(),
                    "unread_count": 0,
                    "_counterparty_id": counterparty.user_id,
                }
            else:
                conv_map[key]["last_message"] = m.body
                conv_map[key]["last_message_time"] = m.created_at.isoformat()

            # Increment unread count for incoming messages
            if m.receiver_id == user_id and m.is_read == 0:
                conv_map[key]["unread_count"] += 1

        conv_list = list(conv_map.values())
        conv_list.sort(key=lambda c: c["last_message_time"], reverse=True)
        return conv_list

    def get_thread_messages(
        self, user_id: int, counterparty_user_id: int, equipment_id: int | None
    ) -> list[Message]:
        query = self.db.query(Message).filter(
            or_(
                and_(Message.sender_id == user_id, Message.receiver_id == counterparty_user_id),
                and_(Message.sender_id == counterparty_user_id, Message.receiver_id == user_id),
            )
        )
        if equipment_id is not None:
            query = query.filter(Message.equipment_id == equipment_id)

        messages = query.order_by(Message.created_at.asc()).all()

        # Mark customer's incoming messages as read
        for m in messages:
            if m.receiver_id == user_id and m.is_read == 0:
                m.is_read = 1
        self.db.flush()

        return messages

    def send_message(
        self, sender_id: int, receiver_id: int, equipment_id: int | None, body: str
    ) -> Message:
        msg = Message(
            sender_id=sender_id,
            receiver_id=receiver_id,
            equipment_id=equipment_id,
            body=body,
            is_read=0,
        )
        self.db.add(msg)
        self.db.flush()
        return msg

    # -------------------------------------------------------------------------
    # Notifications Operations
    # -------------------------------------------------------------------------
    def get_notifications(
        self, user_id: int, unread_only: bool = False, page: int = 1, page_size: int = 10
    ) -> tuple[list[Notification], int]:
        query = self.db.query(Notification).filter(Notification.user_id == user_id)
        if unread_only:
            query = query.filter(Notification.is_read == 0)

        total = query.count()
        items = (
            query.order_by(Notification.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return items, total

    def mark_notification_read(self, user_id: int, notification_id: int) -> bool:
        notif = (
            self.db.query(Notification)
            .filter(
                Notification.notification_id == notification_id,
                Notification.user_id == user_id,
            )
            .first()
        )
        if not notif:
            return False
        notif.is_read = 1
        self.db.flush()
        return True

    def mark_all_notifications_read(self, user_id: int) -> int:
        count = (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read == 0)
            .update({"is_read": 1})
        )
        self.db.flush()
        return int(count)

    def create_notification(
        self,
        user_id: int,
        type_: str,
        title: str,
        message: str,
        entity_type: str | None = None,
        entity_id: int | None = None,
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            type=type_,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            is_read=0,
        )
        self.db.add(notif)
        self.db.flush()
        return notif

    # -------------------------------------------------------------------------
    # Account Badges Operations
    # -------------------------------------------------------------------------
    def get_account_badges(self, user_id: int) -> dict[str, int]:
        # Active bookings: pending, confirmed, in_progress
        active_bookings = (
            self.db.query(func.count(Booking.booking_id))
            .filter(
                Booking.user_id == user_id,
                Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed, BookingStatus.in_progress]),
            )
            .scalar()
            or 0
        )

        # Unread messages
        unread_msgs = (
            self.db.query(func.count(Message.message_id))
            .filter(Message.receiver_id == user_id, Message.is_read == 0)
            .scalar()
            or 0
        )

        # Unread notifications
        unread_notifs = (
            self.db.query(func.count(Notification.notification_id))
            .filter(Notification.user_id == user_id, Notification.is_read == 0)
            .scalar()
            or 0
        )

        # Wishlist count
        wishlist_count = (
            self.db.query(func.count(WishlistItem.equipment_id))
            .filter(WishlistItem.user_id == user_id)
            .scalar()
            or 0
        )

        return {
            "active_bookings_count": int(active_bookings),
            "unread_inbox_count": int(unread_msgs) + int(unread_notifs),
            "wishlist_count": int(wishlist_count),
        }
