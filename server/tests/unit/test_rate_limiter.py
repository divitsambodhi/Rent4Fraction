from __future__ import annotations

import time
import pytest
from app.core.rate_limit import (
    InMemoryRateLimiter,
    RateLimitRule,
    get_client_ip,
)
from starlette.requests import Request


@pytest.mark.unit
def test_rate_limiter_allows_under_limit() -> None:
    limiter = InMemoryRateLimiter()
    rule = RateLimitRule(max_requests=3, window_seconds=10)

    for _ in range(3):
        allowed, retry_after = limiter.is_allowed("test-key", rule)
        assert allowed is True
        assert retry_after == 0

    # 4th request must be rejected
    allowed, retry_after = limiter.is_allowed("test-key", rule)
    assert allowed is False
    assert retry_after > 0


@pytest.mark.unit
def test_rate_limiter_resets_after_window() -> None:
    limiter = InMemoryRateLimiter()
    rule = RateLimitRule(max_requests=2, window_seconds=1)

    assert limiter.is_allowed("k1", rule)[0] is True
    assert limiter.is_allowed("k1", rule)[0] is True
    assert limiter.is_allowed("k1", rule)[0] is False

    # Wait for window to expire
    time.sleep(1.05)
    assert limiter.is_allowed("k1", rule)[0] is True


@pytest.mark.unit
def test_get_client_ip_spoof_prevention() -> None:
    scope = {
        "type": "http",
        "client": ("192.168.1.50", 12345),
        "headers": [(b"x-forwarded-for", b"203.0.113.195")],
    }
    req = Request(scope)

    # When untrusted, X-Forwarded-For must be ignored
    ip = get_client_ip(req, trust_proxy=False)
    assert ip == "192.168.1.50"

    # When trusted, first IP in X-Forwarded-For is used
    ip_trusted = get_client_ip(req, trust_proxy=True)
    assert ip_trusted == "203.0.113.195"

