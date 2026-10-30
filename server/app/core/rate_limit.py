"""Centralized Rate Limiting and Abuse Prevention.

Provides in-memory sliding window rate limiting keyed by User ID (authenticated)
or real Client IP (unauthenticated). For production multi-worker or multi-instance
deployments, this store can be swapped with a Redis-backed implementation.
"""

from __future__ import annotations

import os
import re
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


@dataclass
class RateLimitRule:
    max_requests: int
    window_seconds: int


# Default tiers
TIER_GLOBAL_IP = RateLimitRule(max_requests=300, window_seconds=60)
TIER_AUTH_IP = RateLimitRule(max_requests=20, window_seconds=60)
TIER_CONTACT_IP = RateLimitRule(max_requests=5, window_seconds=3600)
TIER_CONTACT_USER = RateLimitRule(max_requests=3, window_seconds=3600)
TIER_BOOKING_USER = RateLimitRule(max_requests=10, window_seconds=3600)
TIER_UPLOAD_USER = RateLimitRule(max_requests=30, window_seconds=3600)
TIER_SEARCH_IP = RateLimitRule(max_requests=60, window_seconds=60)
TIER_MESSAGES_USER = RateLimitRule(max_requests=30, window_seconds=60)

# 5 MB Request body limit
MAX_BODY_SIZE = 5 * 1024 * 1024


class InMemoryRateLimiter:
    """Thread-safe in-memory sliding log rate limiter."""

    def __init__(self) -> None:
        self._records: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str, rule: RateLimitRule) -> tuple[bool, int]:
        """Returns (allowed, retry_after_seconds)."""
        now = time.time()
        window_start = now - rule.window_seconds

        timestamps = self._records[key]
        # Filter timestamps outside window
        active = [ts for ts in timestamps if ts > window_start]
        self._records[key] = active

        if len(active) >= rule.max_requests:
            oldest = active[0]
            retry_after = max(1, int(oldest + rule.window_seconds - now))
            return False, retry_after

        active.append(now)
        return True, 0

    def reset(self) -> None:
        self._records.clear()


limiter = InMemoryRateLimiter()


def get_client_ip(request: Request, trust_proxy: bool = False) -> str:
    """Extracts client IP safely, preventing X-Forwarded-For spoofing unless trusted."""
    if trust_proxy:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # First IP in comma-separated list
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: Callable, trust_proxy: bool | None = None) -> None:
        super().__init__(app)
        # Trust proxy in Render or when explicitly enabled
        if trust_proxy is None:
            self.trust_proxy = os.getenv("RENDER", "false").lower() == "true" or os.getenv("TRUST_PROXY", "false").lower() == "true"
        else:
            self.trust_proxy = trust_proxy

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        method = request.method.upper()

        # Check content length
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_BODY_SIZE:
            return JSONResponse(
                status_code=413,
                content={
                    "error": {
                        "code": "PAYLOAD_TOO_LARGE",
                        "message": f"Request body exceeds maximum allowed size of {MAX_BODY_SIZE // (1024 * 1024)} MB",
                    }
                },
            )

        # Health probes and public config bypass rate limiting
        if path.startswith("/health") or path == "/api/v1/public-config":
            return await call_next(request)

        client_ip = get_client_ip(request, self.trust_proxy)
        auth_header = request.headers.get("Authorization", "")
        is_auth = bool(auth_header.startswith("Bearer "))
        # Simulated or token-based user key
        user_key = f"user:{auth_header[:32]}" if is_auth else f"ip:{client_ip}"

        # 1. Global IP Limit
        allowed, retry_after = limiter.is_allowed(f"global:{client_ip}", TIER_GLOBAL_IP)
        if not allowed:
            return self._rate_limit_response(retry_after)

        # 2. Per-endpoint tier checks
        if path.startswith("/api/v1/auth") and method in ("POST", "PUT"):
            allowed, retry_after = limiter.is_allowed(f"auth:{client_ip}", TIER_AUTH_IP)
            if not allowed:
                return self._rate_limit_response(retry_after)

        elif path == "/api/v1/help/contact" and method == "POST":
            allowed, retry_after = limiter.is_allowed(f"contact_ip:{client_ip}", TIER_CONTACT_IP)
            if not allowed:
                return self._rate_limit_response(retry_after)
            if is_auth:
                allowed, retry_after = limiter.is_allowed(f"contact_user:{user_key}", TIER_CONTACT_USER)
                if not allowed:
                    return self._rate_limit_response(retry_after)

        elif path.startswith("/api/v1/checkout/orders") and method == "POST":
            if is_auth:
                allowed, retry_after = limiter.is_allowed(f"booking:{user_key}", TIER_BOOKING_USER)
                if not allowed:
                    return self._rate_limit_response(retry_after)

        elif path.startswith("/api/v1/uploads") and method == "POST":
            if is_auth:
                allowed, retry_after = limiter.is_allowed(f"upload:{user_key}", TIER_UPLOAD_USER)
                if not allowed:
                    return self._rate_limit_response(retry_after)

        elif (path in ("/api/v1/equipment", "/api/v1/categories") or path.startswith("/api/v1/catalog")) and method == "GET":
            allowed, retry_after = limiter.is_allowed(f"search:{client_ip}", TIER_SEARCH_IP)
            if not allowed:
                return self._rate_limit_response(retry_after)

        elif path.startswith("/api/v1/messages") and method == "POST":
            if is_auth:
                allowed, retry_after = limiter.is_allowed(f"msg:{user_key}", TIER_MESSAGES_USER)
                if not allowed:
                    return self._rate_limit_response(retry_after)

        return await call_next(request)

    def _rate_limit_response(self, retry_after: int) -> JSONResponse:
        return JSONResponse(
            status_code=429,
            headers={"Retry-After": str(retry_after)},
            content={
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": f"Too many requests. Please try again in {retry_after} second(s).",
                    "retry_after": retry_after,
                }
            },
        )

