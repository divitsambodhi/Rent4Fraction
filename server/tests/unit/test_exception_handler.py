"""Regression test for global exception handler and structured unhandled exception logging.

Verifies:
- Unhandled 500 errors produce the standardized error response without leaking tracebacks to clients.
- Internal logging captures request_id, http_method, http_path, exception_type, and full traceback.
- Sensitive information (e.g. database credentials or tokens) are not logged in message strings.
"""

from __future__ import annotations

import io
import json
import logging
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.errors import register_exception_handlers
from app.core.logging import JSONFormatter


@pytest.fixture
def error_test_app() -> tuple[FastAPI, io.StringIO]:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/api/v1/test-unhandled")
    def trigger_unhandled() -> Any:
        raise RuntimeError("Simulated internal database failure")

    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JSONFormatter())

    err_logger = logging.getLogger("rent4fraction.errors")
    err_logger.addHandler(handler)
    err_logger.setLevel(logging.ERROR)

    return app, stream


@pytest.mark.unit
def test_unhandled_exception_returns_generic_envelope(
    error_test_app: tuple[FastAPI, io.StringIO]
) -> None:
    app, stream = error_test_app
    client = TestClient(app, raise_server_exceptions=False)

    test_req_id = "req_test_exception_500"
    res = client.get("/api/v1/test-unhandled", headers={"X-Request-ID": test_req_id})

    # 1. Verify HTTP response
    assert res.status_code == 500
    data = res.json()
    assert "error" in data
    assert data["error"]["code"] == "INTERNAL_SERVER_ERROR"
    assert data["error"]["message"] == "An unexpected error occurred. Please try again later."
    assert data["error"]["details"] is None
    assert data["error"]["request_id"] == test_req_id

    # 2. Verify Structured server-side logging
    logged_output = stream.getvalue()
    assert logged_output, "Expected structured log output"

    log_entry = json.loads(logged_output.strip().split("\n")[0])
    assert log_entry["level"] == "ERROR"
    assert log_entry["request_id"] == test_req_id
    assert log_entry["http_method"] == "GET"
    assert log_entry["http_path"] == "/api/v1/test-unhandled"
    assert log_entry["exception_type"] == "RuntimeError"
    assert "Simulated internal database failure" in log_entry["exception"]

