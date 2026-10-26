"""
Integration tests for /health/db readiness check.
Requires live database connection (TEST_DATABASE_URL).
"""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, set_settings
from app.main import create_app


@pytest.mark.integration
def test_database_health_endpoint() -> None:
    test_db_url = os.environ.get("TEST_DATABASE_URL")
    if not test_db_url:
        pytest.skip("TEST_DATABASE_URL not set. Skipping database health integration check.")

    settings = Settings(
        ENV="test",
        DATABASE_URL=test_db_url,
        TEST_DATABASE_URL=test_db_url,
    )
    set_settings(settings)
    app = create_app(settings)
    client = TestClient(app)

    response = client.get("/health/db")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert data["database"] == "connected"
    assert "mysql_version" in data
    assert data["migrations_count"] >= 13
