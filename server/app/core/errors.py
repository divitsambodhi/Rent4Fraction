from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Structured logger
logger = logging.getLogger("rent4fraction.errors")


class ErrorPayload(BaseModel):
    code: str
    message: str
    details: Any | None = None
    request_id: str


class ErrorResponse(BaseModel):
    error: ErrorPayload


# -----------------------------------------------------------------------------
# Domain Exception Hierarchy
# -----------------------------------------------------------------------------
class DomainError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Any | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


class NotFoundError(DomainError):
    def __init__(self, message: str = "Resource not found", details: Any | None = None) -> None:
        super().__init__(
            code="NOT_FOUND",
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class ConflictError(DomainError):
    def __init__(self, message: str = "Resource conflict", details: Any | None = None) -> None:
        super().__init__(
            code="CONFLICT",
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class UnauthorizedError(DomainError):
    def __init__(self, message: str = "Unauthorized", details: Any | None = None) -> None:
        super().__init__(
            code="UNAUTHORIZED",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class ForbiddenError(DomainError):
    def __init__(self, message: str = "Permission denied", details: Any | None = None) -> None:
        super().__init__(
            code="FORBIDDEN",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class ValidationFailedError(DomainError):
    def __init__(self, message: str = "Validation failed", details: Any | None = None) -> None:
        super().__init__(
            code="validation_failed",
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            details=details,
        )


class PaymentError(DomainError):
    def __init__(
        self, message: str = "Payment processing failed", details: Any | None = None
    ) -> None:
        super().__init__(
            code="PAYMENT_ERROR",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


# -----------------------------------------------------------------------------
# Auth Domain Errors (Strictly matches Section 5 specification)
# -----------------------------------------------------------------------------
class AuthMissingTokenError(DomainError):
    def __init__(
        self,
        message: str = "Authorization header is missing or malformed",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            code="auth_missing_token",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class AuthInvalidTokenError(DomainError):
    def __init__(
        self,
        message: str = "Invalid authentication token",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            code="auth_invalid_token",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class AuthTokenExpiredError(DomainError):
    def __init__(
        self,
        message: str = "Authentication token has expired",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            code="auth_token_expired",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class AuthRevokedError(DomainError):
    def __init__(
        self,
        message: str = "Authentication token has been revoked",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            code="auth_revoked",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class UserNotRegisteredError(DomainError):
    def __init__(
        self,
        message: str = "User is not registered. Please complete registration.",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            code="user_not_registered",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class AccountDeactivatedError(DomainError):
    def __init__(
        self,
        message: str = "This account has been deactivated. Please contact support.",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            code="account_deactivated",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class ForbiddenRoleError(DomainError):
    def __init__(
        self,
        message: str = "Access forbidden for your current role",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            code="forbidden_role",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class VendorNotApprovedError(DomainError):
    def __init__(
        self,
        message: str = "Vendor profile is not approved",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            code="vendor_not_approved",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class EmailNotVerifiedError(DomainError):
    def __init__(
        self,
        message: str = "Email address has not been verified",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            code="email_not_verified",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class EmailAlreadyRegisteredError(DomainError):
    def __init__(
        self,
        message: str = "An account with this email already exists",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            code="email_already_registered",
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class RateLimitedError(DomainError):
    def __init__(
        self,
        message: str = "Too many attempts. Please wait a few minutes and try again.",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            code="rate_limited",
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details=details,
        )


# -----------------------------------------------------------------------------
# MySQL Trigger SIGNAL (SQLSTATE 45000) Error Catalog Mapping
# -----------------------------------------------------------------------------
# Maps MySQL trigger messages from 013_functions_and_triggers.sql to domain codes & HTTP statuses
SIGNAL_CATALOG: list[tuple[str, str, int]] = [
    (
        "Requested quantity exceeds available stock for the given dates",
        "STOCK_UNAVAILABLE",
        status.HTTP_409_CONFLICT,
    ),
    (
        "Cannot book equipment: equipment status is not active",
        "EQUIPMENT_INACTIVE",
        status.HTTP_400_BAD_REQUEST,
    ),
    (
        "Cannot book equipment: vendor is not approved",
        "VENDOR_NOT_APPROVED",
        status.HTTP_400_BAD_REQUEST,
    ),
    (
        "Rental duration is less than minimum rental days required for this equipment",
        "MIN_RENTAL_DAYS_VIOLATION",
        status.HTTP_422_UNPROCESSABLE_CONTENT,
    ),
    (
        "Booking address must belong to the booking customer",
        "INVALID_BOOKING_ADDRESS",
        status.HTTP_403_FORBIDDEN,
    ),
    (
        "Only one default address allowed per user",
        "MULTIPLE_DEFAULT_ADDRESSES",
        status.HTTP_409_CONFLICT,
    ),
    (
        "Only one primary image allowed per equipment",
        "MULTIPLE_PRIMARY_IMAGES",
        status.HTTP_409_CONFLICT,
    ),
    (
        "Cannot create vendor profile: user.role must be 'vendor'",
        "USER_NOT_VENDOR",
        status.HTTP_400_BAD_REQUEST,
    ),
    (
        "Cannot reassign vendor profile: user.role must be 'vendor'",
        "USER_NOT_VENDOR",
        status.HTTP_400_BAD_REQUEST,
    ),
    (
        "Cannot change role away from 'vendor': delete the vendors row first",
        "CANNOT_CHANGE_VENDOR_ROLE",
        status.HTTP_409_CONFLICT,
    ),
    (
        "booking_items.booking_id must match its vendor_order booking_id",
        "BOOKING_MISMATCH",
        status.HTTP_400_BAD_REQUEST,
    ),
    (
        "booking_items.vendor_id must match vendor_orders and equipment vendor_id",
        "VENDOR_MISMATCH",
        status.HTTP_400_BAD_REQUEST,
    ),
    (
        "return_items.booking_item_id must belong to the return's vendor order",
        "RETURN_ITEM_MISMATCH",
        status.HTTP_400_BAD_REQUEST,
    ),
    (
        "quantity_returned cannot exceed booked quantity",
        "EXCESS_RETURN_QUANTITY",
        status.HTTP_422_UNPROCESSABLE_CONTENT,
    ),
    (
        "Review requires booking_item.item_status = 'returned'",
        "REVIEW_ITEM_NOT_RETURNED",
        status.HTTP_400_BAD_REQUEST,
    ),
    (
        "Review user_id must match the booking owner",
        "REVIEW_USER_MISMATCH",
        status.HTTP_403_FORBIDDEN,
    ),
    (
        "Review equipment_id must match the booking_item equipment_id",
        "REVIEW_EQUIPMENT_MISMATCH",
        status.HTTP_400_BAD_REQUEST,
    ),
    (
        "Review vendor_id must match the booking_item vendor_id",
        "REVIEW_VENDOR_MISMATCH",
        status.HTTP_400_BAD_REQUEST,
    ),
    (
        "Refund amount exceeds total successful payments for this booking",
        "REFUND_EXCEEDS_PAYMENTS",
        status.HTTP_400_BAD_REQUEST,
    ),
]


def map_mysql_signal_message(raw_msg: str) -> tuple[str, str, int] | None:
    """
    Looks up trigger message in the catalog.
    Returns: (error_code, user_friendly_message, http_status) or None if unmapped.
    """
    for trigger_text, code, http_status in SIGNAL_CATALOG:
        if trigger_text in raw_msg:
            return code, trigger_text, http_status
    return None


def get_request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown-request-id")


def build_error_response(
    code: str,
    message: str,
    status_code: int,
    request_id: str,
    details: Any | None = None,
) -> JSONResponse:
    payload = {
        "error": {
            "code": code,
            "message": message,
            "details": details,
            "request_id": request_id,
        }
    }
    return JSONResponse(status_code=status_code, content=payload)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    def handle_domain_error(request: Request, exc: DomainError) -> JSONResponse:
        req_id = get_request_id(request)
        return build_error_response(
            code=exc.code,
            message=exc.message,
            status_code=exc.status_code,
            request_id=req_id,
            details=exc.details,
        )

    @app.exception_handler(RequestValidationError)
    def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        req_id = get_request_id(request)
        # Format field level validation details
        details = [
            {
                "field": ".".join(str(loc) for loc in err.get("loc", [])),
                "message": err.get("msg", "Invalid field"),
                "type": err.get("type", "value_error"),
            }
            for err in exc.errors()
        ]
        return build_error_response(
            code="validation_failed",
            message="Request validation failed. Check details.",
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            request_id=req_id,
            details=details,
        )

    @app.exception_handler(HTTPException)
    def handle_http_exception(request: Request, exc: HTTPException) -> JSONResponse:
        req_id = get_request_id(request)
        code = "HTTP_ERROR"
        if exc.status_code == 404:
            code = "NOT_FOUND"
        elif exc.status_code == 401:
            code = "UNAUTHORIZED"
        elif exc.status_code == 403:
            code = "FORBIDDEN"
        elif exc.status_code == 409:
            code = "CONFLICT"
        elif exc.status_code == 429:
            code = "rate_limited"
        return build_error_response(
            code=code,
            message=str(exc.detail),
            status_code=exc.status_code,
            request_id=req_id,
        )

    @app.exception_handler(Exception)
    def handle_unhandled_exception(request: Request, exc: Exception) -> JSONResponse:
        req_id = get_request_id(request)

        # Intercept PyMySQL / MySQL trigger SIGNAL exceptions (SQLSTATE 45000)
        # Check both class names and error strings without hard-importing PyMySQL
        exc_str = str(exc)
        if "1644" in exc_str or "45000" in exc_str:
            mapped = map_mysql_signal_message(exc_str)
            if mapped:
                code, msg, http_status = mapped
                return build_error_response(
                    code=code,
                    message=msg,
                    status_code=http_status,
                    request_id=req_id,
                )

        # Log unhandled exceptions with full traceback internally; never leak to client
        logger.exception("Unhandled server error [request_id=%s]: %s", req_id, exc)
        return build_error_response(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected error occurred. Please try again later.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            request_id=req_id,
        )
