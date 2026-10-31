"""Regression tests for DB SSL context creation in db.py.

Covers:
- DB_SSL_NO_VERIFY=True → ssl.CERT_NONE context
- Aiven hostname in DATABASE_URL → ssl.CERT_NONE context
- ssl-mode=require in DATABASE_URL → ssl.CERT_NONE context
- No SSL indicators → no ssl context added
- DB_SSL_CA set → custom CA context
"""
from __future__ import annotations

import ssl
from unittest.mock import MagicMock, patch

import pytest

from app.core.config import Settings, set_settings
from app.core.db import get_engine, reset_engine


def _make_settings(**kwargs) -> Settings:
    base = dict(
        DATABASE_URL="mysql+pymysql://user:pass@localhost:3306/db?charset=utf8mb4",
        DB_SSL_NO_VERIFY=False,
        DB_SSL_CA=None,
    )
    base.update(kwargs)
    return Settings(**base)


def _captured_connect_args(**settings_kwargs) -> dict:
    """Run get_engine() with patched create_engine and return the connect_args passed to it."""
    captured: dict = {}

    def fake_create_engine(url, **kw):
        captured.update(kw.get("connect_args", {}))
        engine = MagicMock()
        engine.dispose = MagicMock()
        return engine

    settings = _make_settings(**settings_kwargs)
    set_settings(settings)
    reset_engine()
    with patch("app.core.db.create_engine", side_effect=fake_create_engine):
        with patch("app.core.db.sessionmaker"):
            get_engine()
    reset_engine()
    return captured


@pytest.mark.unit
def test_db_ssl_no_verify_flag_sets_cert_none() -> None:
    """DB_SSL_NO_VERIFY=True must create an ssl context with CERT_NONE."""
    args = _captured_connect_args(DB_SSL_NO_VERIFY=True)
    assert "ssl" in args, "ssl key missing from connect_args"
    ctx = args["ssl"]
    assert isinstance(ctx, ssl.SSLContext)
    assert ctx.verify_mode == ssl.CERT_NONE
    assert ctx.check_hostname is False


@pytest.mark.unit
def test_aiven_hostname_triggers_ssl_bypass() -> None:
    """DATABASE_URL containing aivencloud.com must bypass cert verification."""
    args = _captured_connect_args(
        DATABASE_URL="mysql+pymysql://user:pass@rent4fraction-mysql.a.aivencloud.com:12345/db"
    )
    assert "ssl" in args
    ctx = args["ssl"]
    assert isinstance(ctx, ssl.SSLContext)
    assert ctx.verify_mode == ssl.CERT_NONE


@pytest.mark.unit
def test_ssl_mode_require_triggers_ssl_bypass() -> None:
    """ssl-mode=require in DATABASE_URL must bypass cert verification."""
    args = _captured_connect_args(
        DATABASE_URL="mysql+pymysql://user:pass@somehost:3306/db?ssl-mode=require"
    )
    assert "ssl" in args
    ctx = args["ssl"]
    assert ctx.verify_mode == ssl.CERT_NONE


@pytest.mark.unit
def test_no_ssl_indicators_adds_no_ssl() -> None:
    """Plain localhost URL must not add an ssl context (local dev is unaffected)."""
    args = _captured_connect_args()
    assert "ssl" not in args


@pytest.mark.unit
def test_remote_host_triggers_ssl_bypass_by_default() -> None:
    """Any non-localhost remote host must get ssl CERT_NONE context by default."""
    args = _captured_connect_args(
        DATABASE_URL="mysql+pymysql://user:pass@some-managed-db.example.com:3306/db"
    )
    assert "ssl" in args
    ctx = args["ssl"]
    assert isinstance(ctx, ssl.SSLContext)
    assert ctx.verify_mode == ssl.CERT_NONE


@pytest.mark.unit
def test_db_ssl_ca_sets_custom_ca_context(tmp_path) -> None:
    """DB_SSL_CA must create an ssl context loaded from the given CA file."""
    # Create a dummy (non-functional) PEM file to satisfy the cafile path check
    ca_file = tmp_path / "ca.pem"
    # We'll mock ssl.create_default_context to avoid needing a real cert
    mock_ctx = MagicMock(spec=ssl.SSLContext)

    def fake_default_context(cafile=None):
        assert cafile == str(ca_file)
        return mock_ctx

    args_holder: dict = {}

    def fake_create_engine(url, **kw):
        args_holder.update(kw.get("connect_args", {}))
        engine = MagicMock()
        engine.dispose = MagicMock()
        return engine

    settings = _make_settings(DB_SSL_CA=str(ca_file))
    set_settings(settings)
    reset_engine()

    with patch("app.core.db.create_engine", side_effect=fake_create_engine):
        with patch("app.core.db.sessionmaker"):
            with patch("ssl.create_default_context", side_effect=fake_default_context):
                get_engine()

    reset_engine()
    assert "ssl" in args_holder
    assert args_holder["ssl"] is mock_ctx

