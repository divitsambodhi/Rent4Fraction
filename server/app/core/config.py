from __future__ import annotations

import os
import sys
from typing import Any, Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application configuration loaded from server/.env.
    Fails fast if DATABASE_URL is missing. Secrets are never logged.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENV: Literal["dev", "test", "prod"] = "dev"
    LOG_LEVEL: str = "INFO"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = Field(default="", description="MySQL connection URL using mysql+pymysql://")
    TEST_DATABASE_URL: str | None = None

    # CORS & Web
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    FRONTEND_URL: str = "http://localhost:5173"

    # Firebase Auth
    FIREBASE_PROJECT_ID: str | None = None
    GOOGLE_APPLICATION_CREDENTIALS: str | None = None
    FIREBASE_AUTH_EMULATOR_HOST: str | None = None

    # Razorpay Payments (dormant behind PAYMENTS_ONLINE_ENABLED=False)
    PAYMENTS_ONLINE_ENABLED: bool = False
    RAZORPAY_KEY_ID: str | None = None
    RAZORPAY_KEY_SECRET: str | None = None
    RAZORPAY_WEBHOOK_SECRET: str | None = None

    # Image Storage (Cloudinary replaces Firebase Storage)
    STORAGE_PROVIDER: Literal["fake", "cloudinary"] = "fake"
    CLOUDINARY_CLOUD_NAME: str = "fake-cloud"
    CLOUDINARY_API_KEY: str = "fake-key"
    CLOUDINARY_API_SECRET: str = "fake-secret"
    CLOUDINARY_UPLOAD_PRESET_PUBLIC: str = "rent4fraction_public"
    CLOUDINARY_UPLOAD_PRESET_PRIVATE: str = "rent4fraction_private"
    STORAGE_BUCKET: str | None = None

    # COD Policies & Market Governance
    COD_ENABLED: bool = True
    CURRENCY: str = "INR"
    GOOGLE_SIGNIN_ENABLED: bool = True
    VENDOR_ACCEPTANCE_TIMEOUT_HOURS: int = 24
    CUSTOMER_MAX_PENDING_BOOKINGS: int = 3
    CUSTOMER_NO_SHOW_THRESHOLD: int = 2
    REQUIRE_VERIFIED_EMAIL_FOR_CHECKOUT: bool = True
    REQUIRE_VERIFIED_PHONE_FOR_CHECKOUT: bool = True
    PAYMENT_HOLD_MINUTES: int = 15
    ENABLE_SCHEDULER: bool = False

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v: Any, info: Any) -> str:
        # If an explicit value was passed to Settings(DATABASE_URL=...), honor it directly
        val = v
        if val is None:
            if isinstance(info.data, dict):
                val = info.data.get("TEST_DATABASE_URL")
            if not val:
                val = os.environ.get("DATABASE_URL") or os.environ.get("TEST_DATABASE_URL")

        if not val or not str(val).strip():
            raise ValueError("DATABASE_URL (or TEST_DATABASE_URL) is required and cannot be empty")

        url_str = str(val).strip()
        is_test_mode = "pytest" in sys.modules or (
            isinstance(info.data, dict) and info.data.get("ENV") == "test"
        )
        if url_str.startswith("sqlite") and is_test_mode:
            return url_str

        if not url_str.startswith("mysql+pymysql://"):
            raise ValueError("DATABASE_URL must start with 'mysql+pymysql://'")
        return url_str

    @model_validator(mode="after")
    def validate_production_invariants(self) -> Settings:
        if self.ENV != "prod":
            return self

        # 1. Storage Provider check (Cloudinary required in prod)
        if self.STORAGE_PROVIDER != "cloudinary" or self.STORAGE_PROVIDER == "fake":
            raise RuntimeError(
                "FATAL CONFIGURATION ERROR: STORAGE_PROVIDER=fake is strictly forbidden in production! "
                "Configure STORAGE_PROVIDER=cloudinary with production Cloudinary credentials."
            )

        # 2. Debug guard
        if self.DEBUG:
            raise ValueError("FATAL CONFIGURATION ERROR: DEBUG cannot be true in production (ENV=prod).")

        # 3. Database SSL & host guards (enforced strictly in real production execution)
        is_pytest = "pytest" in sys.modules
        if not is_pytest:
            db_url = self.DATABASE_URL.lower()
            if "localhost" in db_url or "127.0.0.1" in db_url or db_url.startswith("sqlite"):
                raise ValueError(
                    "FATAL CONFIGURATION ERROR: Production DATABASE_URL cannot point to localhost or sqlite."
                )
            ssl_indicators = ("ssl_ca", "ssl_disabled=false", "ssl_mode", "ssl=")
            has_ssl_env = bool(os.getenv("DB_SSL_CA"))
            if not any(k in db_url for k in ssl_indicators) and not has_ssl_env:
                raise ValueError(
                    "FATAL CONFIGURATION ERROR: Production DATABASE_URL requires SSL encryption (e.g. ?ssl_mode=REQUIRED or ?ssl_ca=...)."
                )

            if not self.CLOUDINARY_CLOUD_NAME or self.CLOUDINARY_CLOUD_NAME == "fake-cloud":
                raise ValueError("FATAL CONFIGURATION ERROR: CLOUDINARY_CLOUD_NAME must be configured for production.")
            if not self.CLOUDINARY_API_KEY or self.CLOUDINARY_API_KEY == "fake-key":
                raise ValueError("FATAL CONFIGURATION ERROR: CLOUDINARY_API_KEY must be configured for production.")
            if not self.CLOUDINARY_API_SECRET or self.CLOUDINARY_API_SECRET == "fake-secret":
                raise ValueError("FATAL CONFIGURATION ERROR: CLOUDINARY_API_SECRET must be configured for production.")

            if not self.FIREBASE_PROJECT_ID:
                raise ValueError("FATAL CONFIGURATION ERROR: FIREBASE_PROJECT_ID is required in production.")
            if self.FIREBASE_AUTH_EMULATOR_HOST:
                raise ValueError("FATAL CONFIGURATION ERROR: FIREBASE_AUTH_EMULATOR_HOST cannot be set in production.")

            if self.PAYMENTS_ONLINE_ENABLED:
                raise ValueError(
                    "FATAL CONFIGURATION ERROR: PAYMENTS_ONLINE_ENABLED must be false in COD marketplace."
                )

            if not self.cors_origin_list or "*" in self.cors_origin_list:
                raise ValueError(
                    "FATAL CONFIGURATION ERROR: Wildcard '*' or empty CORS origin is strictly forbidden in production."
                )

        return self

    @property
    def cors_origin_list(self) -> list[str]:
        if not self.CORS_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENV == "prod"


_settings_instance: Settings | None = None


def get_settings() -> Settings:
    global _settings_instance
    if _settings_instance is None:
        _settings_instance = Settings()
    return _settings_instance


def __getattr__(name: str) -> Any:
    if name == "settings":
        return get_settings()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def set_settings(settings: Settings) -> None:
    """Helper for testing to override global configuration."""
    global _settings_instance
    _settings_instance = settings
    from app.core.db import reset_engine

    reset_engine()
