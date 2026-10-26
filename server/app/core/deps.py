from __future__ import annotations

import collections
import time

from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    """
    In-memory sliding window rate limiter for development and single-instance environments.
    Production deployments should back rate-limiting with Redis.
    """

    def __init__(self, requests_per_minute: int = 60) -> None:
        self.requests_per_minute = requests_per_minute
        self._history: dict[str, collections.deque[float]] = collections.defaultdict(
            collections.deque
        )

    def check(self, key: str) -> None:
        now = time.time()
        window_start = now - 60.0
        q = self._history[key]

        # Prune timestamps older than 60 seconds
        while q and q[0] < window_start:
            q.popleft()

        if len(q) >= self.requests_per_minute:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {self.requests_per_minute} requests per minute.",
            )

        q.append(now)


# Standard rate limiters
_auth_limiter = InMemoryRateLimiter(requests_per_minute=20)
_payment_limiter = InMemoryRateLimiter(requests_per_minute=30)


def rate_limit_auth(request: Request) -> None:
    """Dependency applying 20 req/min limit by client IP for sensitive auth routes."""
    client_ip = request.client.host if request.client else "unknown"
    _auth_limiter.check(f"auth:{client_ip}")


def rate_limit_payments(request: Request) -> None:
    """Dependency applying 30 req/min limit by client IP for payment routes."""
    client_ip = request.client.host if request.client else "unknown"
    _payment_limiter.check(f"pay:{client_ip}")
