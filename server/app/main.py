from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import setup_logging
from app.core.middleware import RequestContextMiddleware
from app.routers.auth import router as auth_router
from app.routers.health import router as health_router
from app.routers.stubs import (
    addresses_router,
    admin_router,
    bookings_router,
    cart_router,
    catalog_router,
    checkout_router,
    help_router,
    messages_router,
    notifications_router,
    payments_router,
    reviews_router,
    vendor_router,
    webhooks_router,
    wishlist_router,
)


def create_app(settings: Settings | None = None) -> FastAPI:
    if settings is None:
        settings = get_settings()

    # Configure structured logging
    setup_logging(log_level=settings.LOG_LEVEL)

    # Disable interactive docs in production unless explicitly enabled
    docs_url = None if settings.is_production else "/docs"
    redoc_url = None if settings.is_production else "/redoc"
    openapi_url = None if settings.is_production else "/openapi.json"

    app = FastAPI(
        title="Rent4Fraction API",
        description="Event Equipment Rental Platform Backend API",
        version="0.1.0",
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
        openapi_tags=[
            {"name": "Health", "description": "Liveness and database readiness probes"},
            {"name": "Authentication", "description": "User sessions, profiles, and credentials"},
            {"name": "Catalog", "description": "Equipment discovery, categories, and availability"},
            {"name": "Cart", "description": "Shopping cart line item management"},
            {"name": "Wishlist", "description": "Saved customer wishlist items"},
            {"name": "Addresses", "description": "Customer delivery address book"},
            {"name": "Checkout", "description": "Booking estimates and coupon applications"},
            {"name": "Bookings", "description": "Booking orders and status tracking"},
            {"name": "Payments", "description": "Payment intents and settlements"},
            {"name": "Webhooks", "description": "Razorpay and payment gateway webhooks"},
            {"name": "Vendor", "description": "Vendor dashboard, orders, inventory, and payouts"},
            {"name": "Admin", "description": "Platform management, vendor approvals, and disputes"},
            {"name": "Reviews", "description": "Equipment customer ratings and feedback"},
            {"name": "Messages", "description": "Direct communication between users and vendors"},
            {"name": "Notifications", "description": "Customer and vendor alerts"},
            {"name": "Help", "description": "FAQs and customer support knowledge base"},
        ],
    )

    # Register Exception Handlers (unified error envelope)
    register_exception_handlers(app)

    # Register Custom Middlewares
    app.add_middleware(
        RequestContextMiddleware,
        is_production=settings.is_production,
    )

    # GZip compression for responses > 1000 bytes
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Cross-Origin Resource Sharing (CORS)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "Idempotency-Key",
            "X-Request-ID",
            "Accept",
        ],
    )

    # Register Routers
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(catalog_router)
    app.include_router(cart_router)
    app.include_router(wishlist_router)
    app.include_router(addresses_router)
    app.include_router(checkout_router)
    app.include_router(bookings_router)
    app.include_router(payments_router)
    app.include_router(webhooks_router)
    app.include_router(vendor_router)
    app.include_router(admin_router)
    app.include_router(reviews_router)
    app.include_router(messages_router)
    app.include_router(notifications_router)
    app.include_router(help_router)

    return app


# Top-level ASGI app instance for uvicorn
try:
    app: FastAPI = create_app()
except Exception:
    # If DATABASE_URL is not yet configured, create a placeholder app that fails fast on request
    # but allows module imports during testing and tooling inspection
    app = FastAPI(title="Rent4Fraction (Unconfigured)")
