from __future__ import annotations

from fastapi import APIRouter

# Domain stub routers to populate OpenAPI tags and structure
auth_router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
catalog_router = APIRouter(prefix="/api/v1", tags=["Catalog"])
cart_router = APIRouter(prefix="/api/v1/cart", tags=["Cart"])
wishlist_router = APIRouter(prefix="/api/v1/wishlist", tags=["Wishlist"])
addresses_router = APIRouter(prefix="/api/v1/addresses", tags=["Addresses"])
checkout_router = APIRouter(prefix="/api/v1/checkout", tags=["Checkout"])
bookings_router = APIRouter(prefix="/api/v1/bookings", tags=["Bookings"])
payments_router = APIRouter(prefix="/api/v1/payments", tags=["Payments"])
webhooks_router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])
vendor_router = APIRouter(prefix="/api/v1/vendor", tags=["Vendor"])
admin_router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])
reviews_router = APIRouter(prefix="/api/v1/reviews", tags=["Reviews"])
messages_router = APIRouter(prefix="/api/v1/messages", tags=["Messages"])
notifications_router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])
help_router = APIRouter(prefix="/api/v1/help", tags=["Help"])

# Note: Domain endpoints will be implemented in subsequent phases.
# Router stubs ensure OpenAPI tags and documentation exist from day one.
