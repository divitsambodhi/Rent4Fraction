from __future__ import annotations

from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo
import pytest

from app.core.time import (
    IST,
    ist_date_bounds,
    now_ist,
    now_utc,
    to_ist,
    format_ist_display,
)


@pytest.mark.unit
def test_ist_conversion_around_midnight() -> None:
    # 18:30 UTC on Oct 29 is 00:00 IST on Oct 30
    utc_dt = datetime(2026, 10, 29, 18, 30, 0, tzinfo=UTC)
    ist_dt = to_ist(utc_dt)

    assert ist_dt.year == 2026
    assert ist_dt.month == 10
    assert ist_dt.day == 30
    assert ist_dt.hour == 0
    assert ist_dt.minute == 0
    assert "IST" in format_ist_display(utc_dt)


@pytest.mark.unit
def test_ist_date_bounds() -> None:
    target_date = date(2026, 11, 1)
    start_utc, end_utc = ist_date_bounds(target_date)

    # 2026-11-01 00:00 IST is 2026-10-31 18:30 UTC
    assert start_utc == datetime(2026, 10, 31, 18, 30, 0, tzinfo=UTC)
    # End of day is 23:59:59.999999 IST
    assert end_utc.hour == 18
    assert end_utc.minute == 29

