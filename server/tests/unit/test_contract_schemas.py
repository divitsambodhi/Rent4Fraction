from __future__ import annotations

import pytest

from app.schemas.booking import (
    BookingDetailResponse,
    BookingSummaryResponse,
    CheckoutQuoteResponse,
    DepositSummaryData,
    PaymentRecordResponse,
    PaymentSummaryResponse,
    PriceSummaryBreakdown,
)
from app.schemas.catalog import (
    EquipmentAvailabilityResponse,
    EquipmentDetailResponse,
    EquipmentListingItem,
    ReviewItemSchema,
    VendorSummarySchema,
)
from app.schemas.customer import (
    AccountBadgesResponse,
    AddressResponse,
    CartLineResponse,
)
from app.schemas.help import FAQItemResponse
from app.schemas.social import (
    ConversationResponse,
    MessageResponse,
    NotificationResponse,
)


@pytest.mark.unit
def test_catalog_contract_keys() -> None:
    # 1. EquipmentListingView
    listing_keys = set(EquipmentListingItem.model_fields.keys())
    expected_listing = {
        "equipment_id",
        "name",
        "description",
        "price_per_day",
        "security_deposit",
        "quantity",
        "min_rental_days",
        "delivery_available",
        "avg_rating",
        "review_count",
        "specifications",
        "vendor_id",
        "vendor_name",
        "category_id",
        "category_name",
        "parent_category_id",
        "parent_category_name",
        "primary_image_url",
    }
    assert expected_listing.issubset(listing_keys)

    # 2. EquipmentDetail
    detail_keys = set(EquipmentDetailResponse.model_fields.keys())
    expected_detail = expected_listing.union({
        "status",
        "images",
        "includes",
        "category_path",
        "vendor",
        "blocked_ranges",
    })
    assert expected_detail.issubset(detail_keys)

    # 3. EquipmentAvailability
    avail_keys = set(EquipmentAvailabilityResponse.model_fields.keys())
    assert {"available_quantity", "next_available_from", "unavailable_days"}.issubset(avail_keys)

    # 4. VendorDetail
    vendor_keys = set(VendorSummarySchema.model_fields.keys())
    assert {
        "vendor_id",
        "business_name",
        "city",
        "avg_rating",
        "review_count",
        "item_count",
        "member_since",
        "description",
    }.issubset(vendor_keys)

    # 5. Review
    review_keys = set(ReviewItemSchema.model_fields.keys())
    assert {
        "review_id",
        "user_name",
        "rating",
        "comment",
        "vendor_reply",
        "review_date",
    }.issubset(review_keys)


@pytest.mark.unit
def test_customer_contract_keys() -> None:
    # 1. Address
    address_keys = set(AddressResponse.model_fields.keys())
    assert {
        "id",
        "name",
        "line1",
        "city",
        "state",
        "pincode",
        "country",
        "label",
        "is_default",
        "used_in_bookings",
        "created_at",
    }.issubset(address_keys)

    # 2. CartLine
    cart_line_keys = set(CartLineResponse.model_fields.keys())
    assert {
        "cart_item_id",
        "equipment_id",
        "name",
        "category",
        "vendor_id",
        "vendor_name",
        "price_per_day",
        "security_deposit",
        "quantity",
        "start_date",
        "end_date",
        "days",
        "primary_image_url",
        "delivery_available",
    }.issubset(cart_line_keys)

    # 3. Quote
    quote_keys = set(CheckoutQuoteResponse.model_fields.keys())
    assert {
        "subtotal",
        "discount",
        "tax",
        "delivery_fee",
        "security_deposit",
        "total",
        "vendor_subtotals",
        "vendor_delivery_fees",
    }.issubset(quote_keys)

    # 4. AccountBadges
    badges_keys = set(AccountBadgesResponse.model_fields.keys())
    assert {
        "active_bookings_count",
        "unread_inbox_count",
        "wishlist_count",
    }.issubset(badges_keys)


@pytest.mark.unit
def test_booking_contract_keys() -> None:
    # 1. BookingSummary
    summary_keys = set(BookingSummaryResponse.model_fields.keys())
    expected_summary = {
        "booking_id",
        "event_name",
        "event_type",
        "status",
        "payment_status",
        "start_date",
        "end_date",
        "rental_days",
        "delivery_city",
        "vendor_count",
        "item_count",
        "vendor_avatars",
        "total_amount",
        "action_needed",
        "created_at",
    }
    assert expected_summary.issubset(summary_keys)

    # 2. BookingDetail
    detail_keys = set(BookingDetailResponse.model_fields.keys())
    expected_detail = expected_summary.union({
        "delivery_address",
        "vendor_orders",
        "items",
        "payments",
        "deposit",
        "price_summary",
        "activity",
    })
    assert expected_detail.issubset(detail_keys)

    # 3. DepositSummaryData
    dep_keys = set(DepositSummaryData.model_fields.keys())
    assert {"held", "deducted", "refunded", "pending_refund"}.issubset(dep_keys)

    # 4. PriceSummaryBreakdown
    price_keys = set(PriceSummaryBreakdown.model_fields.keys())
    assert {"subtotal", "discount", "tax", "delivery_fee", "security_deposit", "total"}.issubset(price_keys)

    # 5. PaymentRecord
    pmt_keys = set(PaymentRecordResponse.model_fields.keys())
    assert {
        "payment_id",
        "booking_id",
        "type",
        "method",
        "amount",
        "status",
        "created_at",
        "reference",
    }.issubset(pmt_keys)

    # 6. PaymentSummaryTilesData
    tile_keys = set(PaymentSummaryResponse.model_fields.keys())
    assert {"total_paid", "deposits_held", "deductions", "refunded"}.issubset(tile_keys)



@pytest.mark.unit
def test_social_contract_keys() -> None:
    # 1. Conversation
    conv_keys = set(ConversationResponse.model_fields.keys())
    assert {
        "conversation_id",
        "vendor_id",
        "vendor_name",
        "vendor_initials",
        "equipment_id",
        "equipment_name",
        "equipment_image",
        "last_message",
        "last_message_time",
        "unread_count",
    }.issubset(conv_keys)

    # 2. Message
    msg_keys = set(MessageResponse.model_fields.keys())
    assert {
        "message_id",
        "conversation_id",
        "sender",
        "text",
        "created_at",
        "status",
    }.issubset(msg_keys)

    # 3. AppNotification
    notif_keys = set(NotificationResponse.model_fields.keys())
    assert {
        "id",
        "type",
        "title",
        "message",
        "created_at",
        "read",
        "target",
    }.issubset(notif_keys)

    # 4. FAQItem
    faq_keys = set(FAQItemResponse.model_fields.keys())
    assert {"id", "question", "answer"}.issubset(faq_keys)
