#!/usr/bin/env python3
"""
run_checks.py — Execute database integrity checks.

Each check runs inside a transaction that is always rolled back, so
the database is never mutated.  Prints PASS or FAIL for each check
and exits with code 0 (all pass) or 1 (any fail).

Usage
-----
  python scripts/run_checks.py
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path
from typing import Callable, Optional

import pymysql
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


# ---------------------------------------------------------------------------
# Connection
# ---------------------------------------------------------------------------
def get_connection() -> pymysql.Connection:
    return pymysql.connect(
        host            = os.getenv("MYSQL_HOST",     "localhost"),
        port            = int(os.getenv("MYSQL_PORT", "3306")),
        user            = os.getenv("MYSQL_USER",     "rental_user"),
        password        = os.getenv("MYSQL_PASSWORD", "rental_pass"),
        database        = os.getenv("MYSQL_DATABASE", "event_rental"),
        charset         = "utf8mb4",
        autocommit      = False,
        connect_timeout = 5,
    )


def wait_for_mysql(max_retries: int = 20, delay: float = 2.0) -> None:
    for attempt in range(1, max_retries + 1):
        try:
            conn = get_connection(); conn.close(); return
        except Exception as exc:
            print(f"  Waiting for MySQL [{attempt}/{max_retries}]: {exc}")
            time.sleep(delay)
    print("ERROR: MySQL not ready."); sys.exit(1)


# ---------------------------------------------------------------------------
# Test harness
# ---------------------------------------------------------------------------
Results: list[tuple[str, bool, str]] = []


def check(
    name: str,
    fn: Callable[[pymysql.Connection], str],
    *,
    expect_error: Optional[str] = None,
) -> None:
    """
    Runs fn(conn) inside a transaction that is always rolled back.

    If expect_error is None  → fn must succeed; its return value is the detail.
    If expect_error is set   → fn must raise an exception whose str contains
                               expect_error (case-insensitive).
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("START TRANSACTION")
            try:
                detail = fn(cur)
                conn.rollback()
                if expect_error:
                    msg = f"Expected error containing '{expect_error}' but none raised"
                    Results.append((name, False, msg))
                    print(f"  FAIL  {name}: {msg}")
                else:
                    Results.append((name, True, detail))
                    print(f"  PASS  {name}: {detail}")
            except Exception as exc:
                conn.rollback()
                exc_str = str(exc).lower()
                if expect_error:
                    if expect_error.lower() in exc_str:
                        Results.append((name, True, f"Correctly rejected: {exc}"))
                        print(f"  PASS  {name}: correctly rejected ({exc.args[0] if exc.args else exc})")
                    else:
                        msg = f"Got unexpected error: {exc}"
                        Results.append((name, False, msg))
                        print(f"  FAIL  {name}: {msg}")
                else:
                    msg = f"Unexpected error: {exc}"
                    Results.append((name, False, msg))
                    print(f"  FAIL  {name}: {msg}")
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Helper: fetch one scalar
# ---------------------------------------------------------------------------
def scalar(cur: pymysql.cursors.Cursor, sql: str, args=()) -> object:
    cur.execute(sql, args)
    row = cur.fetchone()
    return row[0] if row else None


# ---------------------------------------------------------------------------
# Individual checks
# ---------------------------------------------------------------------------
def chk1_function_non_negative(cur):
    eq_id = scalar(cur, "SELECT equipment_id FROM equipment WHERE name = 'Pro Speaker System 5000'")
    result = scalar(cur, "SELECT get_available_quantity(%s, '2026-06-01', '2026-06-03')", (eq_id,))
    assert result is not None and int(result) >= 0, f"Expected >= 0, got {result}"
    return f"get_available_quantity = {result} (>= 0)"


def chk2_function_correct_value(cur):
    """
    Pro Speaker System 5000 has quantity=3.
    Booking 1 holds 2 units on 2025-12-20..2025-12-21 (item_status='confirmed').
    On a non-overlapping future date the full 3 should be available.
    """
    eq_id = scalar(cur, "SELECT equipment_id FROM equipment WHERE name = 'Pro Speaker System 5000'")
    total_qty = scalar(cur, "SELECT quantity FROM equipment WHERE equipment_id = %s", (eq_id,))
    avail = scalar(cur, "SELECT get_available_quantity(%s, '2026-06-01', '2026-06-01')", (eq_id,))
    assert int(avail) == int(total_qty), f"Expected {total_qty}, got {avail}"
    return f"Non-overlapping date: available = {avail} = stock ({total_qty})"


def chk3_overbooking_trigger(cur):
    """Requesting quantity > available must be rejected by trg_booking_items_before_insert."""
    cust_id = scalar(cur, "SELECT user_id FROM users WHERE firebase_uid = 'dev-customer-1-uid-replace-me'")
    addr_id = scalar(cur, "SELECT address_id FROM addresses WHERE user_id = %s LIMIT 1", (cust_id,))
    vendor1_id = scalar(cur,
        "SELECT v.vendor_id FROM vendors v "
        "JOIN users u ON u.user_id = v.user_id "
        "WHERE u.firebase_uid = 'dev-vendor-1-uid-replace-me'"
    )
    eq_id  = scalar(cur, "SELECT equipment_id FROM equipment WHERE name = 'Pro Speaker System 5000'")
    eq_qty = scalar(cur, "SELECT quantity FROM equipment WHERE equipment_id = %s", (eq_id,))

    # Create a minimal booking that satisfies the total_amount CHECK
    # subtotal=100, discount=0, tax=18, delivery_fee=0, deposit=0  → total=118
    cur.execute(
        "INSERT INTO bookings "
        "(user_id, address_id, start_date, end_date, subtotal, discount, tax, delivery_fee, security_deposit, total_amount, payment_status, status) "
        "VALUES (%s, %s, '2026-03-01', '2026-03-02', 100.00, 0.00, 18.00, 0.00, 0.00, 118.00, 'unpaid', 'pending')",
        (cust_id, addr_id),
    )
    booking_id = scalar(cur, "SELECT LAST_INSERT_ID()")
    cur.execute(
        "INSERT INTO vendor_orders (booking_id, vendor_id, subtotal, status) VALUES (%s, %s, 0, 'pending')",
        (booking_id, vendor1_id),
    )
    vo_id = scalar(cur, "SELECT LAST_INSERT_ID()")

    # Now request qty > stock — trigger must fire
    cur.execute(
        "INSERT INTO booking_items "
        "(vendor_order_id, booking_id, vendor_id, equipment_id, quantity, price_per_day, days, total_price, item_status) "
        "VALUES (%s, %s, %s, %s, %s, 1000.00, 1, 1000.00, 'pending')",
        (vo_id, booking_id, vendor1_id, eq_id, int(eq_qty) + 10),   # clearly over limit
    )
    raise AssertionError("Trigger did not fire — overbooking was allowed!")


def chk4_review_non_returned_item(cur):
    """Review for a booking_item whose item_status != 'returned' must be rejected."""
    # booking 1's first item is 'confirmed', not 'returned'
    bi_id = scalar(
        cur,
        "SELECT bi.booking_item_id FROM booking_items bi "
        "JOIN bookings b ON b.booking_id = bi.booking_id "
        "WHERE b.event_name = 'Grand Wedding Reception' LIMIT 1",
    )
    u_id  = scalar(cur, "SELECT user_id FROM users WHERE firebase_uid = 'dev-customer-1-uid-replace-me'")
    eq_id = scalar(cur, "SELECT equipment_id FROM booking_items WHERE booking_item_id = %s", (bi_id,))
    v_id  = scalar(cur, "SELECT vendor_id  FROM booking_items WHERE booking_item_id = %s", (bi_id,))

    cur.execute(
        "INSERT INTO reviews (user_id, booking_item_id, equipment_id, vendor_id, rating, comment) "
        "VALUES (%s, %s, %s, %s, 5, 'Should not be allowed')",
        (u_id, bi_id, eq_id, v_id),
    )
    raise AssertionError("Trigger did not fire — review on non-returned item was allowed!")


def chk5_review_wrong_user(cur):
    """Review where user_id is not the booking owner must be rejected."""
    # booking 2's mic item is 'returned'
    bi_id = scalar(
        cur,
        "SELECT bi.booking_item_id FROM booking_items bi "
        "JOIN bookings b ON b.booking_id = bi.booking_id "
        "WHERE b.event_name = 'Corporate Annual Meet' LIMIT 1",
    )
    wrong_uid = scalar(cur, "SELECT user_id FROM users WHERE firebase_uid = 'dev-customer-3-uid-replace-me'")
    eq_id     = scalar(cur, "SELECT equipment_id FROM booking_items WHERE booking_item_id = %s", (bi_id,))
    v_id      = scalar(cur, "SELECT vendor_id  FROM booking_items WHERE booking_item_id = %s", (bi_id,))

    cur.execute(
        "INSERT INTO reviews (user_id, booking_item_id, equipment_id, vendor_id, rating, comment) "
        "VALUES (%s, %s, %s, %s, 4, 'Wrong user review — must fail')",
        (wrong_uid, bi_id, eq_id, v_id),
    )
    raise AssertionError("Trigger did not fire — review with wrong user was allowed!")


def chk6_vendor_role_trigger(cur):
    """Inserting a vendors row for a non-vendor user must be rejected."""
    cust_id = scalar(cur, "SELECT user_id FROM users WHERE firebase_uid = 'dev-customer-1-uid-replace-me'")
    cur.execute(
        "INSERT INTO vendors (user_id, business_name, commission_rate) VALUES (%s, 'BadVendor', 10.00)",
        (cust_id,),
    )
    raise AssertionError("Trigger did not fire — vendor row for customer was allowed!")


def chk7_role_change_trigger(cur):
    """Changing users.role away from 'vendor' while a vendors row exists must be rejected."""
    v_user_id = scalar(cur,
        "SELECT user_id FROM users WHERE firebase_uid = 'dev-vendor-1-uid-replace-me'",
    )
    cur.execute(
        "UPDATE users SET role = 'customer' WHERE user_id = %s",
        (v_user_id,),
    )
    raise AssertionError("Trigger did not fire — role change while vendor row exists was allowed!")


def chk8_total_amount_check(cur):
    """Booking with wrong total_amount must violate the CHECK constraint."""
    cust_id = scalar(cur, "SELECT user_id FROM users WHERE firebase_uid = 'dev-customer-1-uid-replace-me'")
    addr_id = scalar(cur, "SELECT address_id FROM addresses WHERE user_id = %s LIMIT 1", (cust_id,))
    # subtotal=1000, discount=0, tax=180, delivery=0, deposit=0 → correct total=1180
    # We deliberately write 999.00 (wrong) to trip the CHECK
    cur.execute(
        "INSERT INTO bookings "
        "(user_id, address_id, start_date, end_date, subtotal, discount, tax, delivery_fee, security_deposit, total_amount, payment_status, status) "
        "VALUES (%s, %s, '2026-04-01', '2026-04-01', 1000.00, 0.00, 180.00, 0.00, 0.00, 999.00, 'unpaid', 'pending')",
        (cust_id, addr_id),
    )
    raise AssertionError("CHECK constraint did not fire — wrong total_amount was accepted!")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    wait_for_mysql()
    print("\n── Event Equipment Rental Platform — Database Checks ────────────────")

    check("1. get_available_quantity >= 0",          chk1_function_non_negative)
    check("2. get_available_quantity correct value",  chk2_function_correct_value)
    check("3. Overbooking trigger fires",             chk3_overbooking_trigger,
          expect_error="exceeds available stock")
    check("4. Review trigger — non-returned item",   chk4_review_non_returned_item,
          expect_error="returned")
    check("5. Review trigger — wrong user",          chk5_review_wrong_user,
          expect_error="booking owner")
    check("6. Vendor-role trigger fires",            chk6_vendor_role_trigger,
          expect_error="must be")
    check("7. Role-change trigger fires",            chk7_role_change_trigger,
          expect_error="delete the vendors row first")
    check("8. total_amount CHECK constraint fires",  chk8_total_amount_check,
          expect_error="")   # any DB error is a pass for the CHECK violation

    # ── Summary ──────────────────────────────────────────────────────────────
    total   = len(Results)
    passed  = sum(1 for _, ok, _ in Results if ok)
    failed  = total - passed
    print("─" * 68)
    print(f"Results: {passed}/{total} passed, {failed} failed")
    print("─" * 68)
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
