from __future__ import annotations

from typing import Any, Literal

from pydantic import Field, field_validator
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

    # Database
    DATABASE_URL: str = Field(default="", description="MySQL connection URL using mysql+pymysql://")
    TEST_DATABASE_URL: str | None = None

    # CORS & Web
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    FRONTEND_URL: str = "http://localhost:5173"

    # Firebase Auth (optional in initial foundation)
    FIREBASE_PROJECT_ID: str | None = None
    GOOGLE_APPLICATION_CREDENTIALS: str | None = None
    FIREBASE_AUTH_EMULATOR_HOST: str | None = None

    # Razorpay Payments (optional in initial foundation)
    RAZORPAY_KEY_ID: str | None = None
    RAZORPAY_KEY_SECRET: str | None = None
    RAZORPAY_WEBHOOK_SECRET: str | None = None

    # Cloud Storage
    STORAGE_BUCKET: str | None = None

    # Policies
    REQUIRE_VERIFIED_EMAIL_FOR_CHECKOUT: bool = True

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v: Any, info: Any) -> str:
        # If an explicit value was passed to Settings(DATABASE_URL=...), honor it directly
        val = v
        if val is None:
            if isinstance(info.data, dict):
                val = info.data.get("TEST_DATABASE_URL")
            if not val:
                import os

                val = os.environ.get("DATABASE_URL") or os.environ.get("TEST_DATABASE_URL")

        if not val or not str(val).strip():
            raise ValueError("DATABASE_URL (or TEST_DATABASE_URL) is required and cannot be empty")

        url_str = str(val).strip()
        if not url_str.startswith("mysql+pymysql://"):
            raise ValueError("DATABASE_URL must start with 'mysql+pymysql://'")
        return url_str

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


def set_settings(settings: Settings) -> None:
    """Helper for testing to override global configuration."""
    global _settings_instance
    _settings_instance = settings
    from app.core.db import reset_engine

    reset_engine()
