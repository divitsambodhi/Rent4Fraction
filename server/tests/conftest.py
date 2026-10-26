import os
from collections.abc import Generator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings, set_settings


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
    session_factory = sessionmaker(bind=connection)
    session = session_factory()

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()
        engine.dispose()
