from __future__ import annotations

from datetime import UTC, date, datetime, time as dt_time, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30), name="IST")


def utc_now() -> datetime:
    """Returns current UTC datetime with tzinfo explicitly set."""
    return datetime.now(UTC)


def now_utc() -> datetime:
    """Alias for utc_now()."""
    return datetime.now(UTC)


def now_ist() -> datetime:
    """Returns current datetime in Asia/Kolkata (IST, UTC+05:30)."""
    return datetime.now(IST)


def to_ist(dt: datetime) -> datetime:
    """Converts any datetime to Asia/Kolkata (IST)."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(IST)


def ist_date_bounds(d: date) -> tuple[datetime, datetime]:
    """Returns (start_of_day_utc, end_of_day_utc) for a given calendar date in IST."""
    start_ist = datetime.combine(d, dt_time.min, tzinfo=IST)
    end_ist = datetime.combine(d, dt_time.max, tzinfo=IST)
    return start_ist.astimezone(UTC), end_ist.astimezone(UTC)


def format_ist_display(dt: datetime) -> str:
    """Formats datetime as readable string in IST e.g. '29 Oct 2026, 3:45 PM IST'."""
    ist_dt = to_ist(dt)
    return ist_dt.strftime("%d %b %Y, %I:%M %p IST")


def ensure_utc(dt: datetime) -> datetime:
    """Ensures a datetime object is timezone-aware and converted to UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def format_iso8601_z(dt: datetime) -> str:
    """Formats datetime as ISO 8601 string ending with Z (e.g. 2026-11-12T10:30:00Z)."""
    utc_dt = ensure_utc(dt)
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_iso_date(date_str: str) -> date:
    """Parses a YYYY-MM-DD string into a datetime.date object."""
    return date.fromisoformat(date_str.strip())


def calculate_inclusive_rental_days(start_date: date | str, end_date: date | str) -> int:
    """Calculates inclusive rental days: (end_date - start_date).days + 1."""
    s = parse_iso_date(start_date) if isinstance(start_date, str) else start_date
    e = parse_iso_date(end_date) if isinstance(end_date, str) else end_date

    diff = (e - s).days
    return max(1, diff + 1)
