from __future__ import annotations

import re
from typing import Any

from app.core.errors import NotFoundError


def resolve_booking_id(raw: Any) -> int:
    """
    Resolves a booking identifier to an integer database ID.
    Supports formats:
      - Integer: 2 -> 2
      - Digit string: "2", "0002" -> 2
      - Prefixed string: "BK-0002", "bk-0002", "BK-2", "BK2" -> 2
    Raises NotFoundError (404) if invalid or <= 0.
    """
    if raw is None:
        raise NotFoundError("Booking identifier is required.")

    if isinstance(raw, int):
        if raw > 0:
            return raw
        raise NotFoundError("Booking", str(raw))

    s = str(raw).strip()
    match = re.match(r"^(?:[Bb][Kk]-?0*|0*)?(\d+)$", s)
    if match:
        val = int(match.group(1))
        if val > 0:
            return val

    raise NotFoundError("Booking", str(raw))


def resolve_vendor_order_id(raw: Any) -> int:
    """
    Resolves a vendor order identifier to an integer database ID.
    Supports: 1, "1", "VO-0001", "vo-0001", "VO-1", "VO1".
    """
    if raw is None:
        raise NotFoundError("VendorOrder identifier is required.")

    if isinstance(raw, int):
        if raw > 0:
            return raw
        raise NotFoundError("VendorOrder", str(raw))

    s = str(raw).strip()
    match = re.match(r"^(?:[Vv][Oo]-?0*|0*)?(\d+)$", s)
    if match:
        val = int(match.group(1))
        if val > 0:
            return val

    raise NotFoundError("VendorOrder", str(raw))


def resolve_item_id(raw: Any) -> int:
    """
    Resolves a booking item identifier to an integer database ID.
    Supports: 1, "1", "IT-0001", "it-0001", "IT-1", "IT1".
    """
    if raw is None:
        raise NotFoundError("BookingItem identifier is required.")

    if isinstance(raw, int):
        if raw > 0:
            return raw
        raise NotFoundError("BookingItem", str(raw))

    s = str(raw).strip()
    match = re.match(r"^(?:[Ii][Tt]-?0*|0*)?(\d+)$", s)
    if match:
        val = int(match.group(1))
        if val > 0:
            return val

    raise NotFoundError("BookingItem", str(raw))


def resolve_damage_report_id(raw: Any) -> int:
    """
    Resolves a damage report identifier to an integer database ID.
    Supports: 1, "1", "DR-0001", "dr-0001", "DR-1", "DR1".
    """
    if raw is None:
        raise NotFoundError("DamageReport identifier is required.")

    if isinstance(raw, int):
        if raw > 0:
            return raw
        raise NotFoundError("DamageReport", str(raw))

    s = str(raw).strip()
    match = re.match(r"^(?:[Dd][Rr]-?0*|0*)?(\d+)$", s)
    if match:
        val = int(match.group(1))
        if val > 0:
            return val

    raise NotFoundError("DamageReport", str(raw))

