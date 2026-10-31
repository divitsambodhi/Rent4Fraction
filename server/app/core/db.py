from __future__ import annotations

import ssl as ssl_module
from collections.abc import Generator
from contextlib import contextmanager
from typing import Any

from sqlalchemy import Engine, create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 DeclarativeBase."""

    pass


_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    """
    Initializes and returns the singleton SQLAlchemy engine.
    Strict MySQL settings: utf8mb4 charset, UTC timezone, connection pool pre-ping.
    Never creates tables automatically.
    """
    global _engine, _session_factory
    if _engine is None:
        settings = get_settings()
        connect_args: dict[str, Any] = {
            "charset": "utf8mb4",
            "init_command": "SET time_zone = '+00:00', sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'",
            "connect_timeout": 5,
            "read_timeout": 10,
            "write_timeout": 10,
        }

        # ------------------------------------------------------------------ #
        # SSL handling for managed MySQL databases (Aiven, PlanetScale, …)   #
        # ------------------------------------------------------------------ #
        # Actual root cause (confirmed from Render traceback):               #
        #   The Aiven DATABASE_URL contains ?ssl_ca=/path/to/ca.pem.         #
        #   SQLAlchemy forwards that query param to PyMySQL, which calls     #
        #   ssl.create_default_context(cafile="/path/to/ca.pem").            #
        #   That path does NOT exist on Render → FileNotFoundError.          #
        #                                                                    #
        # Fix:                                                               #
        #   1. Strip all ssl-* query params from the URL (remove the bad     #
        #      ca path and mode flags before SQLAlchemy can forward them).   #
        #   2. Pass ssl={"verify_mode": False} as a connect_arg.             #
        #      • Truthy dict → PyMySQL sets CLIENT.SSL flag (Aiven needs it) #
        #      • No "ca" key → _create_ssl_ctx does NOT load any file        #
        #      • verify_mode=False → CERT_NONE → no cert chain verification  #
        # ------------------------------------------------------------------ #
        db_url_lower = settings.DATABASE_URL.lower()
        _is_remote_host = (
            "localhost" not in db_url_lower
            and "127.0.0.1" not in db_url_lower
            and "::1" not in db_url_lower
        )
        _wants_ssl_bypass = (
            settings.DB_SSL_NO_VERIFY
            or "aivencloud.com" in db_url_lower
            or _is_remote_host  # any remote MySQL host: skip self-signed cert errors
        )

        # Parse the URL and remove ssl-related query params so they cannot
        # be forwarded to PyMySQL. PyMySQL does NOT accept params like ssl_mode / ssl-mode
        # (raises TypeError: Connection.__init__() got an unexpected keyword argument 'ssl_mode')
        # nor does it accept invalid local cafile paths (raises FileNotFoundError).
        # We handle SSL cleanly and explicitly through connect_args["ssl"].
        url_obj = make_url(settings.DATABASE_URL)
        cleaned_query = {
            k: v
            for k, v in url_obj.query.items()
            if not k.lower().replace("-", "_").startswith("ssl")
        }
        url_obj = url_obj.set(query=cleaned_query)

        if _wants_ssl_bypass and not settings.DB_SSL_CA:
            # Truthy dict without a "ca" key → PyMySQL sends CLIENT.SSL flag
            # but calls create_default_context(cafile=None) → no file I/O →
            # then sets verify_mode=CERT_NONE because verify_mode=False (bool).
            connect_args["ssl"] = {"verify_mode": False, "check_hostname": False}
        elif settings.DB_SSL_CA:
            connect_args["ssl"] = ssl_module.create_default_context(cafile=settings.DB_SSL_CA)
        _engine = create_engine(
            url_obj,
            pool_size=5,
            max_overflow=10,
            pool_recycle=1800,
            pool_pre_ping=True,
            pool_timeout=10,
            connect_args=connect_args,
        )
        _session_factory = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return _engine


def reset_engine() -> None:
    """Disposes and clears the cached singleton engine (e.g. for testing)."""
    global _engine, _session_factory
    if _engine is not None:
        _engine.dispose()
        _engine = None
        _session_factory = None


def get_session_factory() -> sessionmaker[Session]:
    if _session_factory is None:
        get_engine()
    assert _session_factory is not None
    return _session_factory


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI request-scoped dependency yielding a single database session.
    Automatically closes session on request completion.
    """
    factory = get_session_factory()
    session = factory()
    try:
        yield session
    finally:
        session.close()


@contextmanager
def transaction(session: Session) -> Generator[Session, None, None]:
    """
    Transactional boundary context manager for service layers.
    Auto-commits on completion, rolls back on any exception.
    """
    if session.in_transaction():
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
    else:
        try:
            with session.begin():
                yield session
        except Exception:
            session.rollback()
            raise


def for_update(query: Any) -> Any:
    """Helper to apply SELECT ... FOR UPDATE pessimistic row locking on a query."""
    return query.with_for_update()
