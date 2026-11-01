from __future__ import annotations

import logging
import time
import uuid
from collections.abc import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("rent4fraction.access")

# Maximum permitted payload size: 10MB
MAX_REQUEST_SIZE_BYTES = 10 * 1024 * 1024


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware managing:
    - X-Request-ID propagation (accepts incoming or generates UUIDv4)
    - Security headers (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS for prod)
    - Request payload size guard (rejects > 10MB)
    - Structured access logging (duration, status, method, path; scrubbed headers)
    """

    def __init__(self, app: Callable, is_production: bool = False) -> None:  # type: ignore[type-arg]
        super().__init__(app)
        self.is_production = is_production

    async def dispatch(self, request: Request, call_next: Callable) -> Response:  # type: ignore[type-arg]
        # 1. Establish or propagate Request ID
        req_id = request.headers.get("X-Request-ID")
        if not req_id or not req_id.strip():
            req_id = f"req_{uuid.uuid4().hex[:16]}"
        request.state.request_id = req_id

        # 2. Check Content-Length to guard memory exhaustion
        content_length_header = request.headers.get("content-length")
        if content_length_header:
            try:
                length = int(content_length_header)
                if length > MAX_REQUEST_SIZE_BYTES:
                    from app.core.errors import build_error_response

                    return build_error_response(
                        code="PAYLOAD_TOO_LARGE",
                        message="Request payload exceeds the 10MB size limit.",
                        status_code=413,
                        request_id=req_id,
                    )
            except ValueError:
                pass

        start_time = time.perf_counter()
        response: Response | None = None
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            from app.core.errors import build_error_response

            logger.error(
                "Unhandled error in middleware execution [%s %s] [request_id=%s]: %s",
                request.method,
                request.url.path,
                req_id,
                exc,
                exc_info=exc,
            )
            response = build_error_response(
                code="INTERNAL_SERVER_ERROR",
                message="An unexpected error occurred. Please try again later.",
                status_code=500,
                request_id=req_id,
                request=request,
            )
            return response
        finally:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            status_code = response.status_code if response else 500

            # Attach headers to response if response exists
            if response is not None:
                response.headers["X-Request-ID"] = req_id
                response.headers["X-Content-Type-Options"] = "nosniff"
                response.headers["X-Frame-Options"] = "DENY"
                response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

                # Allow Swagger UI and ReDoc to load CDN bundles and stylesheets on doc paths;
                # enforce strict default-src 'none' on API routes.
                path = request.url.path
                if path in ("/docs", "/redoc", "/openapi.json") or path.startswith(
                    ("/docs/", "/redoc/")
                ):
                    response.headers["Content-Security-Policy"] = (
                        "default-src 'self'; "
                        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                        "img-src 'self' data: https://fastapi.tiangolo.com https://cdn.jsdelivr.net; "
                        "font-src 'self' data: https://cdn.jsdelivr.net; "
                        "connect-src 'self' http: https:; "
                        "frame-ancestors 'none';"
                    )
                else:
                    response.headers["Content-Security-Policy"] = (
                        "default-src 'none'; frame-ancestors 'none';"
                    )

                if self.is_production:
                    response.headers["Strict-Transport-Security"] = (
                        "max-age=31536000; includeSubDomains"
                    )

            # Access Log (excluding passwords, tokens, auth headers)
            client_host = request.client.host if request.client else "unknown"
            logger.info(
                "%s %s -> %s (%sms) [%s]",
                request.method,
                request.url.path,
                status_code,
                duration_ms,
                req_id,
                extra={"request_id": req_id, "ip": client_host},
            )
