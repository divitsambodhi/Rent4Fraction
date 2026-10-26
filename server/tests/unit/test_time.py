from datetime import UTC, date, datetime

import pytest

from app.core.time import (
    calculate_inclusive_rental_days,
    ensure_utc,
    format_iso8601_z,
    utc_now,
)


@pytest.mark.unit
def test_inclusive_rental_days() -> None:
    # 2026-11-12 to 2026-11-14 = 3 days
    assert calculate_inclusive_rental_days("2026-11-12", "2026-11-14") == 3
    # Same day = 1 day
    assert calculate_inclusive_rental_days("2026-11-12", "2026-11-12") == 1
    # Date objects
    d1 = date(2026, 11, 1)
    d2 = date(2026, 11, 5)
    assert calculate_inclusive_rental_days(d1, d2) == 5


@pytest.mark.unit
def test_utc_now_and_ensure_utc() -> None:
    now = utc_now()
    assert now.tzinfo is not None
    assert now.tzinfo == UTC

    naive = datetime(2026, 10, 26, 12, 0, 0)
    aware = ensure_utc(naive)
    assert aware.tzinfo == UTC


@pytest.mark.unit
def test_format_iso8601_z() -> None:
    dt = datetime(2026, 11, 12, 10, 30, 45, tzinfo=UTC)
    formatted = format_iso8601_z(dt)
    assert formatted == "2026-11-12T10:30:45Z"
