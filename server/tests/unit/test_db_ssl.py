"""Regression tests for DB SSL configuration in db.py.

PyMySQL 2.x exposes dedicated ssl_verify_cert / ssl_verify_identity parameters.
Passing ssl=SSLContext does NOT work because SQLAlchemy merges URL query params
(e.g. ssl-mode=require) into connect args first; PyMySQL then re-creates a strict
CERT_REQUIRED context, overriding any SSLContext we pass.

The correct fix: use ssl_verify_cert=False + ssl_verify_identity=False, which
PyMySQL 2.2+ handles explicitly and which take priority over URL-derived SSL params.
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
    """Run get_engine() with patched create_engine; return the connect_args passed to it."""
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
def test_db_ssl_no_verify_flag_sets_pymysql_params() -> None:
    """DB_SSL_NO_VERIFY=True must set ssl_verify_cert=False and ssl_verify_identity=False."""
    args = _captured_connect_args(DB_SSL_NO_VERIFY=True)
    assert args.get("ssl_verify_cert") is False, "ssl_verify_cert must be False"
    assert args.get("ssl_verify_identity") is False, "ssl_verify_identity must be False"
    assert "ssl" not in args, "raw ssl key must not be set when using dedicated params"


@pytest.mark.unit
def test_aiven_hostname_triggers_ssl_bypass() -> None:
    """DATABASE_URL containing aivencloud.com must disable cert verification."""
    args = _captured_connect_args(
        DATABASE_URL="mysql+pymysql://user:pass@rent4fraction-mysql.a.aivencloud.com:12345/db"
    )
    assert args.get("ssl_verify_cert") is False
    assert args.get("ssl_verify_identity") is False


@pytest.mark.unit
def test_remote_host_triggers_ssl_bypass_by_default() -> None:
    """Any non-localhost remote host must disable cert verification by default."""
    args = _captured_connect_args(
        DATABASE_URL="mysql+pymysql://user:pass@some-managed-db.example.com:3306/db"
    )
    assert args.get("ssl_verify_cert") is False
    assert args.get("ssl_verify_identity") is False


@pytest.mark.unit
def test_localhost_has_no_ssl_params() -> None:
    """Plain localhost URL must not set any SSL verification params (local dev unaffected)."""
    args = _captured_connect_args()
    assert "ssl_verify_cert" not in args
    assert "ssl_verify_identity" not in args
    assert "ssl" not in args


@pytest.mark.unit
def test_db_ssl_ca_sets_custom_ca_context(tmp_path) -> None:
    """DB_SSL_CA must use ssl.create_default_context(cafile=...) and NOT set ssl_verify_cert."""
    ca_file = tmp_path / "ca.pem"
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
    assert "ssl_verify_cert" not in args_holder
