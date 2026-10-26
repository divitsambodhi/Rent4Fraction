from __future__ import annotations

from collections.abc import Generator
from contextlib import contextmanager
from typing import Any

from sqlalchemy import Engine, create_engine
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
        _engine = create_engine(
            settings.DATABASE_URL,
            pool_size=5,
            max_overflow=10,
            pool_recycle=1800,
            pool_pre_ping=True,
            connect_args={
                "charset": "utf8mb4",
                "init_command": "SET time_zone = '+00:00', sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'",
            },
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
