from __future__ import annotations

from datetime import UTC, date, datetime


def utc_now() -> datetime:
    """Returns current UTC datetime with tzinfo explicitly set."""
    return datetime.now(UTC)


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
    """
    Calculates inclusive rental days: (end_date - start_date).days + 1.
    Matches frontend pricing.ts and MySQL database trigger requirements.
    """
    s = parse_iso_date(start_date) if isinstance(start_date, str) else start_date
    e = parse_iso_date(end_date) if isinstance(end_date, str) else end_date

    diff = (e - s).days
    return max(1, diff + 1)
