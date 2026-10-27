from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, Response, status

from app.core.errors import DomainError
from app.schemas.help import (
    ContactRequest,
    FAQItemResponse,
)
from app.services.catalog import CatalogService

router = APIRouter(prefix="/api/v1/help", tags=["Help"])


@router.get(
    "/faqs",
    response_model=list[FAQItemResponse],
    operation_id="get_faqs",
    summary="Get platform frequently asked questions served from verified content catalog",
)
def get_faqs(
    response: Response,
    if_none_match: str | None = Header(None, alias="If-None-Match"),
) -> Any:
    faqs_data = CatalogService.get_faqs()
    etag = CatalogService.generate_etag(faqs_data)
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "public, max-age=3600"

    if if_none_match and if_none_match == etag:
        response.status_code = status.HTTP_304_NOT_MODIFIED
        return []

    return faqs_data


@router.post(
    "/contact",
    response_model=dict[str, str],
    operation_id="submit_contact_form",
    summary="Submit customer support contact request (statically unconfigured until contact_requests table is created)",
)
def submit_contact_form(
    payload: ContactRequest,
) -> dict[str, str]:
    """
    Validates input and answers 501 not_configured as specified in Step 4.
    Documents the needed table in DB_CHANGES_STEP5.md.
    """
    raise DomainError(
        code="not_configured",
        message="Contact inquiry messaging is not configured until contact_requests table migration is deployed.",
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        details={"name": payload.name, "subject": payload.subject},
    )
