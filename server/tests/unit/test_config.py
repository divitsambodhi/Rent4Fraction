import pytest
from pydantic import ValidationError

from app.core.config import Settings


@pytest.mark.unit
def test_config_requires_database_url() -> None:
    # DATABASE_URL cannot be missing or empty
    with pytest.raises(ValidationError):
        Settings(DATABASE_URL="")


@pytest.mark.unit
def test_config_validates_pymysql_prefix() -> None:
    # Must start with mysql+pymysql://
    with pytest.raises(ValidationError):
        Settings(DATABASE_URL="postgresql://user:pass@localhost/db")

    # Valid prefix succeeds
    cfg = Settings(DATABASE_URL="mysql+pymysql://user:pass@localhost:3306/db?charset=utf8mb4")
    assert cfg.DATABASE_URL.startswith("mysql+pymysql://")
