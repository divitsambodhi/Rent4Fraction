"""Regression tests for DB SSL configuration in db.py.

Confirmed root cause (from Render production traceback):
  The Aiven DATABASE_URL contains ?ssl_ca=/path/to/ca.pem.
  SQLAlchemy forwards that to PyMySQL → calls ssl.create_default_context(cafile=...)
  → FileNotFoundError because that path doesn't exist on Render.

Fix:
  Strip ssl-* query params from the URL before passing to create_engine.
  Pass connect_args["ssl"] = {"verify_mode": False, "check_hostname": False}.
  PyMySQL: truthy dict → sets CLIENT.SSL flag (required by Aiven), but no
  "ca" key → no file I/O → verify_mode=False → CERT_NONE.
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


def _capture(settings_kwargs: dict) -> tuple[str, dict]:
    """Run get_engine() with patched create_engine; return (url_str, connect_args)."""
    captured_url: list[str] = []
    captured_args: dict = {}

    def fake_create_engine(url, **kw):
        captured_url.append(str(url))
        captured_args.update(kw.get("connect_args", {}))
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
    return captured_url[0] if captured_url else "", captured_args


@pytest.mark.unit
def test_aiven_url_with_ssl_ca_strips_ca_from_url() -> None:
    """ssl_ca, ssl-mode, and ssl_mode query params must be stripped from URL."""
    url, args = _capture(
        {
            "DATABASE_URL": (
                "mysql+pymysql://user:pass@rent4fraction-mysql.a.aivencloud.com:12345/db"
                "?ssl_ca=/home/user/.aiven/ca.pem&ssl-mode=REQUIRED&ssl_mode=REQUIRED"
            )
        }
    )
    assert "ssl_ca" not in url, f"ssl_ca should be stripped from URL, got: {url}"
    assert "ssl-mode" not in url, f"ssl-mode should be stripped from URL, got: {url}"
    assert "ssl_mode" not in url, f"ssl_mode should be stripped from URL, got: {url}"
    # Verify connect_args do NOT contain unsupported parameters
    assert "ssl_mode" not in args
    assert "ssl-mode" not in args


@pytest.mark.unit
def test_aiven_ssl_bypass_sets_correct_ssl_dict() -> None:
    """ssl connect_arg must be a truthy dict with verify_mode=False and no ca key."""
    _, args = _capture(
        {
            "DATABASE_URL": (
                "mysql+pymysql://user:pass@rent4fraction-mysql.a.aivencloud.com:12345/db"
                "?ssl_ca=/home/user/.aiven/ca.pem"
            )
        }
    )
    assert "ssl" in args, "ssl key must be in connect_args"
    ssl_arg = args["ssl"]
    assert isinstance(ssl_arg, dict), "ssl must be a dict (not SSLContext)"
    assert ssl_arg.get("verify_mode") is False, "verify_mode must be False"
    assert "ca" not in ssl_arg, "ca must NOT be in ssl dict (would cause FileNotFoundError)"


@pytest.mark.unit
def test_remote_host_triggers_ssl_bypass() -> None:
    """Any non-localhost remote host must use the SSL bypass dict."""
    _, args = _capture(
        {"DATABASE_URL": "mysql+pymysql://user:pass@some-managed-db.example.com:3306/db"}
    )
    assert isinstance(args.get("ssl"), dict)
    assert args["ssl"].get("verify_mode") is False


@pytest.mark.unit
def test_db_ssl_no_verify_flag_triggers_bypass() -> None:
    """DB_SSL_NO_VERIFY=True must trigger the SSL bypass regardless of hostname."""
    _, args = _capture({"DB_SSL_NO_VERIFY": True})
    # localhost URL + DB_SSL_NO_VERIFY=True → bypass still applied
    assert isinstance(args.get("ssl"), dict)
    assert args["ssl"].get("verify_mode") is False


@pytest.mark.unit
def test_localhost_has_no_ssl_params() -> None:
    """Plain localhost URL without DB_SSL_NO_VERIFY must not modify SSL at all."""
    _, args = _capture({})
    assert "ssl" not in args
    assert "ssl_verify_cert" not in args
    assert "ssl_verify_identity" not in args


@pytest.mark.unit
def test_db_ssl_ca_sets_custom_ca_context(tmp_path) -> None:
    """DB_SSL_CA must use create_default_context(cafile=...) and NOT use bypass dict."""
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
    assert args_holder.get("ssl") is mock_ctx
    # Must NOT use the bypass dict when DB_SSL_CA is set
    assert not isinstance(args_holder.get("ssl"), dict) or "verify_mode" not in args_holder["ssl"]
