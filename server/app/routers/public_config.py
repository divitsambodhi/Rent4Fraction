from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import get_settings

router = APIRouter(prefix="/api/v1/config", tags=["Configuration"])


class PublicConfigResponse(BaseModel):
    payments_online_enabled: bool
    currency: str
    acceptance_timeout_hours: int
    google_signin_enabled: bool
    cod_enabled: bool


@router.get("/public", response_model=PublicConfigResponse)
def get_public_config() -> PublicConfigResponse:
    """
    Returns public platform feature flags and non-sensitive configuration parameters.
    No secrets, credentials, or internal operational keys are ever returned.
    """
    settings = get_settings()
    return PublicConfigResponse(
        payments_online_enabled=settings.PAYMENTS_ONLINE_ENABLED,
        currency=settings.CURRENCY,
        acceptance_timeout_hours=settings.VENDOR_ACCEPTANCE_TIMEOUT_HOURS,
        google_signin_enabled=settings.GOOGLE_SIGNIN_ENABLED,
        cod_enabled=settings.COD_ENABLED,
    )

