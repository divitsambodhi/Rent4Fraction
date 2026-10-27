from __future__ import annotations

import os
from collections.abc import Generator
from typing import Any

import pytest
from sqlalchemy import create_engine
from sqlalchemy.dialects.mysql import BIGINT, TINYINT
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.schema import Computed

import app.models  # noqa: F401
from app.core.config import Settings, set_settings
from app.core.db import Base


# Register SQLite compilation rules for MySQL types in unit tests
@compiles(TINYINT, "sqlite")
def _compile_tinyint_sqlite(_type: Any, _compiler: Any, **_kw: Any) -> str:
    return "INTEGER"


@compiles(BIGINT, "sqlite")
def _compile_bigint_sqlite(_type: Any, _compiler: Any, **_kw: Any) -> str:
    return "INTEGER"


@compiles(Computed, "sqlite")
def _compile_computed_sqlite(_element: Any, _compiler: Any, **_kw: Any) -> str:
    return ""


@pytest.fixture(scope="session", autouse=True)
def configure_test_environment() -> None:
    """Configures safe test environment settings."""
    test_db_url = os.environ.get("TEST_DATABASE_URL")
    if test_db_url:
        test_settings = Settings(
            ENV="test",
            DATABASE_URL=test_db_url,
            TEST_DATABASE_URL=test_db_url,
        )
        set_settings(test_settings)


@pytest.fixture
def integration_db() -> Generator[Session, None, None]:
    """
    Session fixture for integration tests against a live test database.
    Runs each test inside a transaction that automatically rolls back at the end.
    """
    test_db_url = os.environ.get("TEST_DATABASE_URL")
    if not test_db_url:
        pytest.skip("TEST_DATABASE_URL not set. Skipping live database test.")

    engine = create_engine(test_db_url, pool_pre_ping=True)
    connection = engine.connect()
    transaction = connection.begin()
    session_factory = sessionmaker(bind=connection, join_transaction_mode="create_savepoint")
    session = session_factory()

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()
        engine.dispose()


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """
    In-memory isolated SQLite session fixture for fast unit testing of repositories/services.
    Uses StaticPool so in-memory state is shared across threads and connections within a test.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()
