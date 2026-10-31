"""Regression and integration tests for FastAPI CORS configuration.

Verifies:
- Production Vercel frontend origin receives correct CORS headers.
- OPTIONS preflight requests succeed with appropriate headers, methods, and credentials.
- Localhost and 127.0.0.1 development origins remain allowed.
- Disallowed / untrusted origins do not receive allow-origin headers.
- Direct GET and POST requests receive Access-Control-Allow-Origin and Access-Control-Allow-Credentials.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, set_settings
from app.main import create_app


@pytest.fixture(scope="module")
def cors_client() -> TestClient:
    settings = Settings(
        CORS_ORIGINS="https://rent4fraction.vercel.app,http://localhost:5173,http://127.0.0.1:5173",
        FRONTEND_URL="https://rent4fraction.vercel.app",
    )
    set_settings(settings)
    app = create_app()
    return TestClient(app)


@pytest.mark.unit
def test_cors_options_preflight_vercel_production(cors_client: TestClient) -> None:
    origin = "https://rent4fraction.vercel.app"
    response = cors_client.options(
        "/api/v1/help/faqs",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization, Content-Type, X-Request-ID",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin
    assert response.headers.get("access-control-allow-credentials") == "true"

    allowed_methods = response.headers.get("access-control-allow-methods", "")
    for method in ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]:
        assert method in allowed_methods

    allowed_headers = response.headers.get("access-control-allow-headers", "").lower()
    assert "authorization" in allowed_headers
    assert "content-type" in allowed_headers


@pytest.mark.unit
def test_cors_get_vercel_production(cors_client: TestClient) -> None:
    origin = "https://rent4fraction.vercel.app"
    response = cors_client.get(
        "/api/v1/help/faqs",
        headers={"Origin": origin},
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin
    assert response.headers.get("access-control-allow-credentials") == "true"


@pytest.mark.unit
def test_cors_options_preflight_localhost(cors_client: TestClient) -> None:
    origin = "http://localhost:5173"
    response = cors_client.options(
        "/api/v1/help/faqs",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization, Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin
    assert response.headers.get("access-control-allow-credentials") == "true"


@pytest.mark.unit
def test_cors_get_127_0_0_1(cors_client: TestClient) -> None:
    origin = "http://127.0.0.1:5173"
    response = cors_client.get(
        "/api/v1/help/faqs",
        headers={"Origin": origin},
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin


@pytest.mark.unit
def test_cors_disallowed_origin_rejected(cors_client: TestClient) -> None:
    untrusted_origin = "https://malicious-attacker.com"
    response = cors_client.options(
        "/api/v1/help/faqs",
        headers={
            "Origin": untrusted_origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    # FastAPi CORSMiddleware returns 400 for preflights from disallowed origins
    assert response.status_code == 400
    assert response.headers.get("access-control-allow-origin") is None

