from __future__ import annotations

# Import all models to ensure declarative metadata is complete
from app.models.accounts import Address, User, UserRole, Vendor, VendorApprovalStatus
from app.models.catalog import (
    Availability,
    AvailabilityReason,
    AvailabilityStatus,
    Category,
    Equipment,
    EquipmentImage,
    EquipmentStatus,
)
from app.models.fulfilment import (
    DamageReport,
    DamageReportStatus,
    Delivery,
    DeliveryStatus,
    DeliveryType,
    ItemCondition,
    Return,
    ReturnItem,
    ReturnStatus,
)
from app.models.orders import (
    Booking,
    BookingItem,
    BookingItemStatus,
    BookingPaymentStatus,
    BookingStatus,
    CartItem,
    Coupon,
    CouponType,
    VendorOrder,
    VendorOrderStatus,
    WishlistItem,
)
from app.models.payments import (
    Payment,
    PaymentMethod,
    PaymentStatus,
    PaymentType,
    Payout,
    PayoutStatus,
    WebhookEvent,
    WebhookEventStatus,
)
from app.models.platform import (
    AuditLog,
    IdempotencyKey,
    OrderEvent,
    PlatformSetting,
    SchemaMigration,
)
from app.models.social import Message, Notification, Review
from app.models.storage import PendingUpload

__all__ = [
    # Accounts
    "User",
    "UserRole",
    "Vendor",
    "VendorApprovalStatus",
    "Address",
    # Catalog
    "Category",
    "Equipment",
    "EquipmentStatus",
    "EquipmentImage",
    "Availability",
    "AvailabilityReason",
    "AvailabilityStatus",
    # Orders
    "Coupon",
    "CouponType",
    "Booking",
    "BookingPaymentStatus",
    "BookingStatus",
    "VendorOrder",
    "VendorOrderStatus",
    "BookingItem",
    "BookingItemStatus",
    "CartItem",
    "WishlistItem",
    # Payments
    "Payment",
    "PaymentType",
    "PaymentMethod",
    "PaymentStatus",
    "Payout",
    "PayoutStatus",
    "WebhookEvent",
    "WebhookEventStatus",
    # Fulfilment
    "Delivery",
    "DeliveryType",
    "DeliveryStatus",
    "Return",
    "ReturnStatus",
    "ReturnItem",
    "ItemCondition",
    "DamageReport",
    "DamageReportStatus",
    # Social
    "Review",
    "Notification",
    "Message",
    # Storage
    "PendingUpload",
    # Platform
    "SchemaMigration",
    "IdempotencyKey",
    "PlatformSetting",
    "OrderEvent",
    "AuditLog",
]
