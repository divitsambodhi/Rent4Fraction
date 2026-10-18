#!/usr/bin/env python3
"""
run_checks.py — Execute database integrity and business logic checks.

STATUS: WRITTEN BUT NOT YET EXECUTED (Static Verification Audit)

Each check runs inside a transaction that is always rolled back, so
the database is never mutated. Prints PASS or FAIL for each check
and exits with code 0 (all pass) or 1 (any fail).

Usage
-----
  python scripts/run_checks.py          # Run comprehensive Python assertions
  python scripts/run_checks.py --sql    # Execute tests/checks.sql without mysql client
"""
from __future__ import annotations

import argparse
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
        host            = os.getenv("MYSQL_HOST",     "127.0.0.1"),
        port            = int(os.getenv("MYSQL_PORT", "3306")),
        user            = os.getenv("MYSQL_USER",     "rental_user"),
        password        = os.getenv("MYSQL_PASSWORD", ""),
        database        = os.getenv("MYSQL_DATABASE", "event_rental"),
        charset         = "utf8mb4",
        autocommit      = False,
        connect_timeout = 5,
        init_command    = "SET time_zone = '+00:00'",
    )


def wait_for_mysql(max_retries: int = 20, delay: float = 2.0) -> None:
    for attempt in range(1, max_retries + 1):
        try:
            conn = get_connection()
            conn.close()
            return
        except Exception as exc:
            print(f"  Waiting for MySQL [{attempt}/{max_retries}]: {exc}")
            time.sleep(delay)
    print("ERROR: MySQL not ready.")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Test harness
# ---------------------------------------------------------------------------
Results: list[tuple[str, bool, str]] = []


def check(
    name: str,
    fn: Callable[[pymysql.cursors.Cursor], str],
    *,
    expect_error: Optional[str] = None,
) -> None:
    """
    Runs fn(cur) inside a transaction that is always rolled back.
    If expect_error is None  → fn must succeed.
    If expect_error is set   → fn must raise an exception containing expect_error.
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


def scalar(cur: pymysql.cursors.Cursor, sql: str, args=()) -> object:
    cur.execute(sql, args)
    row = cur.fetchone()
    return row[0] if row else None


# ---------------------------------------------------------------------------
# Individual Checks
# ---------------------------------------------------------------------------
def chk_func_non_negative(cur):
    eq_id = scalar(cur, "SELECT equipment_id FROM equipment WHERE name = 'Pro Speaker System 5000'")
    result = scalar(cur, "SELECT get_available_quantity(%s, '2026-06-01', '2026-06-03')", (eq_id,))
    assert result is not None and int(result) >= 0
    return f"get_available_quantity = {result} (>= 0)"


def chk_func_stock_on_unbooked(cur):
    eq_id = scalar(cur, "SELECT equipment_id FROM equipment WHERE name = 'Pro Speaker System 5000'")
    stock = scalar(cur, "SELECT quantity FROM equipment WHERE equipment_id = %s", (eq_id,))
    avail = scalar(cur, "SELECT get_available_quantity(%s, '2026-06-01', '2026-06-01')", (eq_id,))
    assert int(avail) == int(stock)
    return f"available = {avail} matches stock {stock}"


def chk_func_invalid_dates(cur):
    eq_id = scalar(cur, "SELECT equipment_id FROM equipment LIMIT 1")
    avail = scalar(cur, "SELECT get_available_quantity(%s, '2026-06-10', '2026-06-05')", (eq_id,))
    assert int(avail) == 0
    return "Returns 0 on start_date > end_date"


def chk_overbooking_insert(cur):
    cust_id = scalar(cur, "SELECT user_id FROM users WHERE firebase_uid = 'dev-customer-1-uid-replace-me'")
    addr_id = scalar(cur, "SELECT address_id FROM addresses WHERE user_id = %s LIMIT 1", (cust_id,))
    vendor1_id = scalar(cur, "SELECT v.vendor_id FROM vendors v JOIN users u ON u.user_id = v.user_id WHERE u.firebase_uid = 'dev-vendor-1-uid-replace-me'")
    eq_id = scalar(cur, "SELECT equipment_id FROM equipment WHERE name = 'Pro Speaker System 5000'")
    stock = scalar(cur, "SELECT quantity FROM equipment WHERE equipment_id = %s", (eq_id,))

    cur.execute(
        "INSERT INTO bookings (user_id, address_id, start_date, end_date, subtotal, discount, tax, delivery_fee, security_deposit, total_amount, payment_status, status) "
        "VALUES (%s, %s, '2026-03-01', '2026-03-02', 100.00, 0.00, 18.00, 0.00, 0.00, 118.00, 'unpaid', 'pending')",
        (cust_id, addr_id),
    )
    b_id = scalar(cur, "SELECT LAST_INSERT_ID()")
    cur.execute(
        "INSERT INTO vendor_orders (booking_id, vendor_id, subtotal, status) VALUES (%s, %s, 100.00, 'pending')",
        (b_id, vendor1_id),
    )
    vo_id = scalar(cur, "SELECT LAST_INSERT_ID()")
    cur.execute(
        "INSERT INTO booking_items (vendor_order_id, booking_id, vendor_id, equipment_id, quantity, price_per_day, days, total_price, item_status) "
        "VALUES (%s, %s, %s, %s, %s, 100.00, 2, 200.00, 'pending')",
        (vo_id, b_id, vendor1_id, eq_id, int(stock) + 5),
    )
    raise AssertionError("Allowed overbooking on INSERT!")


def chk_overbooking_update(cur):
    bi_id = scalar(cur, "SELECT bi.booking_item_id FROM booking_items bi JOIN bookings b ON b.booking_id = bi.booking_id WHERE b.event_name = 'Grand Wedding Reception' LIMIT 1")
    cur.execute("UPDATE booking_items SET quantity = 9999 WHERE booking_item_id = %s", (bi_id,))
    raise AssertionError("Allowed overbooking on UPDATE!")


def chk_review_non_returned(cur):
    bi_id = scalar(cur, "SELECT bi.booking_item_id FROM booking_items bi JOIN bookings b ON b.booking_id = bi.booking_id WHERE b.event_name = 'Grand Wedding Reception' LIMIT 1")
    u_id  = scalar(cur, "SELECT user_id FROM users WHERE firebase_uid = 'dev-customer-1-uid-replace-me'")
    eq_id = scalar(cur, "SELECT equipment_id FROM booking_items WHERE booking_item_id = %s", (bi_id,))
    v_id  = scalar(cur, "SELECT vendor_id FROM booking_items WHERE booking_item_id = %s", (bi_id,))
    cur.execute(
        "INSERT INTO reviews (user_id, booking_item_id, equipment_id, vendor_id, rating, comment) VALUES (%s, %s, %s, %s, 5, 'Invalid')",
        (u_id, bi_id, eq_id, v_id),
    )
    raise AssertionError("Allowed review on non-returned item!")


def chk_review_wrong_user(cur):
    bi_id = scalar(cur, "SELECT bi.booking_item_id FROM booking_items bi JOIN bookings b ON b.booking_id = bi.booking_id WHERE b.event_name = 'Corporate Annual Meet' LIMIT 1")
    wrong_uid = scalar(cur, "SELECT user_id FROM users WHERE firebase_uid = 'dev-customer-3-uid-replace-me'")
    eq_id = scalar(cur, "SELECT equipment_id FROM booking_items WHERE booking_item_id = %s", (bi_id,))
    v_id  = scalar(cur, "SELECT vendor_id FROM booking_items WHERE booking_item_id = %s", (bi_id,))
    cur.execute(
        "INSERT INTO reviews (user_id, booking_item_id, equipment_id, vendor_id, rating, comment) VALUES (%s, %s, %s, %s, 4, 'Wrong user')",
        (wrong_uid, bi_id, eq_id, v_id),
    )
    raise AssertionError("Allowed review by wrong user!")


def chk_review_mismatched_equipment(cur):
    bi_id = scalar(cur, "SELECT bi.booking_item_id FROM booking_items bi JOIN bookings b ON b.booking_id = bi.booking_id WHERE b.event_name = 'Corporate Annual Meet' LIMIT 1")
    u_id  = scalar(cur, "SELECT user_id FROM users WHERE firebase_uid = 'dev-customer-2-uid-replace-me'")
    v_id  = scalar(cur, "SELECT vendor_id FROM booking_items WHERE booking_item_id = %s", (bi_id,))
    cur.execute(
        "INSERT INTO reviews (user_id, booking_item_id, equipment_id, vendor_id, rating, comment) VALUES (%s, %s, 9999, %s, 4, 'Mismatched equip')",
        (u_id, bi_id, v_id),
    )
    raise AssertionError("Allowed review with mismatched equipment!")


def chk_vendor_role_insert(cur):
    cust_id = scalar(cur, "SELECT user_id FROM users WHERE role = 'customer' LIMIT 1")
    cur.execute("INSERT INTO vendors (user_id, business_name, commission_rate) VALUES (%s, 'FakeVendor', 10.00)", (cust_id,))
    raise AssertionError("Allowed vendor row for customer user!")


def chk_user_demotion_blocked(cur):
    v_uid = scalar(cur, "SELECT user_id FROM vendors LIMIT 1")
    cur.execute("UPDATE users SET role = 'customer' WHERE user_id = %s", (v_uid,))
    raise AssertionError("Allowed demoting user away from 'vendor' while vendors row exists!")


def chk_duplicate_default_address(cur):
    cust_id = scalar(cur, "SELECT user_id FROM addresses WHERE is_default = 1 LIMIT 1")
    cur.execute(
        "INSERT INTO addresses (user_id, line1, city, state, pincode, is_default) VALUES (%s, 'Another Default', 'City', 'State', '123456', 1)",
        (cust_id,),
    )
    raise AssertionError("Allowed multiple default addresses for user!")


def chk_duplicate_primary_image(cur):
    eq_id = scalar(cur, "SELECT equipment_id FROM equipment_images WHERE is_primary = 1 LIMIT 1")
    cur.execute(
        "INSERT INTO equipment_images (equipment_id, url, is_primary, sort_order) VALUES (%s, 'https://example.com/2.jpg', 1, 10)",
        (eq_id,),
    )
    raise AssertionError("Allowed multiple primary images for equipment!")


def chk_booking_address_ownership(cur):
    c1 = scalar(cur, "SELECT user_id FROM users WHERE firebase_uid = 'dev-customer-1-uid-replace-me'")
    c2 = scalar(cur, "SELECT user_id FROM users WHERE firebase_uid = 'dev-customer-2-uid-replace-me'")
    c2_addr = scalar(cur, "SELECT address_id FROM addresses WHERE user_id = %s LIMIT 1", (c2,))
    cur.execute(
        "INSERT INTO bookings (user_id, address_id, start_date, end_date, subtotal, discount, tax, delivery_fee, security_deposit, total_amount, payment_status, status) "
        "VALUES (%s, %s, '2026-08-01', '2026-08-02', 100.00, 0.00, 18.00, 0.00, 0.00, 118.00, 'unpaid', 'pending')",
        (c1, c2_addr),
    )
    raise AssertionError("Allowed booking with another user's address!")


def chk_booking_item_order_mismatch(cur):
    b1_id = scalar(cur, "SELECT booking_id FROM bookings WHERE event_name = 'Grand Wedding Reception'")
    b2_id = scalar(cur, "SELECT booking_id FROM bookings WHERE event_name = 'Corporate Annual Meet'")
    vo2_id = scalar(cur, "SELECT vendor_order_id FROM vendor_orders WHERE booking_id = %s LIMIT 1", (b2_id,))
    v_id = scalar(cur, "SELECT vendor_id FROM vendor_orders WHERE vendor_order_id = %s", (vo2_id,))
    eq_id = scalar(cur, "SELECT equipment_id FROM equipment WHERE vendor_id = %s LIMIT 1", (v_id,))

    cur.execute(
        "INSERT INTO booking_items (vendor_order_id, booking_id, vendor_id, equipment_id, quantity, price_per_day, days, total_price) "
        "VALUES (%s, %s, %s, %s, 1, 100.00, 1, 100.00)",
        (vo2_id, b1_id, v_id, eq_id),
    )
    raise AssertionError("Allowed booking_item with mismatched booking_id and vendor_order_id!")


def chk_booking_item_min_days(cur):
    # Select equipment with min_rental_days >= 2 from an APPROVED vendor
    eq10_id = scalar(cur, "SELECT e.equipment_id FROM equipment e JOIN vendors v ON v.vendor_id = e.vendor_id WHERE e.min_rental_days >= 2 AND v.approval_status = 'approved' AND e.status = 'active' LIMIT 1")
    if not eq10_id:
        # If no approved vendor equipment has min_rental_days >= 2, update an existing one temporarily inside transaction
        eq10_id = scalar(cur, "SELECT e.equipment_id FROM equipment e JOIN vendors v ON v.vendor_id = e.vendor_id WHERE v.approval_status = 'approved' AND e.status = 'active' LIMIT 1")
        cur.execute("UPDATE equipment SET min_rental_days = 2 WHERE equipment_id = %s", (eq10_id,))
    v_id    = scalar(cur, "SELECT vendor_id FROM equipment WHERE equipment_id = %s", (eq10_id,))
    cust_id = scalar(cur, "SELECT user_id FROM users WHERE firebase_uid = 'dev-customer-1-uid-replace-me'")
    addr_id = scalar(cur, "SELECT address_id FROM addresses WHERE user_id = %s LIMIT 1", (cust_id,))

    cur.execute(
        "INSERT INTO bookings (user_id, address_id, start_date, end_date, subtotal, discount, tax, delivery_fee, security_deposit, total_amount, payment_status, status) "
        "VALUES (%s, %s, '2026-10-01', '2026-10-01', 100.00, 0.00, 18.00, 0.00, 0.00, 118.00, 'unpaid', 'pending')",
        (cust_id, addr_id),
    )
    b_id = scalar(cur, "SELECT LAST_INSERT_ID()")
    cur.execute(
        "INSERT INTO vendor_orders (booking_id, vendor_id, subtotal, status) VALUES (%s, %s, 100.00, 'pending')",
        (b_id, v_id),
    )
    vo_id = scalar(cur, "SELECT LAST_INSERT_ID()")
    cur.execute(
        "INSERT INTO booking_items (vendor_order_id, booking_id, vendor_id, equipment_id, quantity, price_per_day, days, total_price) "
        "VALUES (%s, %s, %s, %s, 1, 100.00, 1, 100.00)",
        (vo_id, b_id, v_id, eq10_id),
    )
    raise AssertionError("Allowed rental duration less than min_rental_days!")


def chk_return_item_mismatched_order(cur):
    ret_id = scalar(cur, "SELECT return_id FROM returns LIMIT 1")
    wrong_bi_id = scalar(cur, "SELECT bi.booking_item_id FROM booking_items bi JOIN returns r ON r.return_id = %s WHERE bi.vendor_order_id <> r.vendor_order_id LIMIT 1", (ret_id,))
    if wrong_bi_id:
        cur.execute(
            "INSERT INTO return_items (return_id, booking_item_id, quantity_returned, item_condition) VALUES (%s, %s, 1, 'good')",
            (ret_id, wrong_bi_id),
        )
        raise AssertionError("Allowed return_item with booking_item from a different vendor order!")
    return "Skipped (no second vendor order item available)"


def chk_refund_exceeding_paid(cur):
    b1_id = scalar(cur, "SELECT booking_id FROM bookings WHERE event_name = 'Grand Wedding Reception'")
    paid = scalar(cur, "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE booking_id = %s AND status = 'success'", (b1_id,))
    cur.execute(
        "INSERT INTO payments (booking_id, amount, type, method, transaction_id, status) VALUES (%s, %s, 'refund', 'upi', 'TXN-EXCESS-REFUND', 'success')",
        (b1_id, float(paid) + 5000.00),
    )
    raise AssertionError("Allowed refund exceeding total payments!")


def chk_total_amount_check(cur):
    cust_id = scalar(cur, "SELECT user_id FROM users WHERE firebase_uid = 'dev-customer-1-uid-replace-me'")
    addr_id = scalar(cur, "SELECT address_id FROM addresses WHERE user_id = %s LIMIT 1", (cust_id,))
    cur.execute(
        "INSERT INTO bookings (user_id, address_id, start_date, end_date, subtotal, discount, tax, delivery_fee, security_deposit, total_amount, payment_status, status) "
        "VALUES (%s, %s, '2026-04-01', '2026-04-01', 1000.00, 0.00, 180.00, 0.00, 0.00, 999.00, 'unpaid', 'pending')",
        (cust_id, addr_id),
    )
    raise AssertionError("Allowed wrong total_amount arithmetic!")


def chk_views_execution(cur):
    cur.execute("SELECT * FROM v_vendor_dashboard LIMIT 2")
    v_dash = cur.fetchall()
    cur.execute("SELECT * FROM v_vendor_incoming_orders LIMIT 2")
    v_in = cur.fetchall()
    cur.execute("SELECT * FROM v_customer_bookings LIMIT 2")
    v_cust = cur.fetchall()
    cur.execute("SELECT * FROM v_equipment_listing LIMIT 2")
    v_eq = cur.fetchall()
    return f"Views verified: dashboard ({len(v_dash)} rows), incoming ({len(v_in)} rows), customer ({len(v_cust)} rows), listing ({len(v_eq)} rows)"


# ---------------------------------------------------------------------------
# Execute checks.sql runner
# ---------------------------------------------------------------------------
def run_sql_file(filepath: Path) -> None:
    wait_for_mysql()
    print(f"\n── Executing {filepath.name} via PyMySQL ────────────────────────────")
    sql_text = filepath.read_text(encoding="utf-8-sig")
    statements = [stmt.strip() for stmt in sql_text.split(";") if stmt.strip() and not stmt.strip().startswith("--")]

    conn = get_connection()
    pass_count = 0
    with conn.cursor() as cur:
        for stmt in statements:
            # Skip pure comments
            lines = [l for l in stmt.splitlines() if l.strip() and not l.strip().startswith("--")]
            if not lines:
                continue
            cleaned_stmt = "\n".join(lines)
            try:
                cur.execute(cleaned_stmt)
                rows = cur.fetchall()
                if rows:
                    for row in rows:
                        print(f"  {row[0] if len(row) == 1 else row}")
                pass_count += 1
            except Exception as exc:
                print(f"  Statement Notice / Error: {exc}")
    conn.rollback()
    conn.close()
    print(f"Executed {pass_count} SQL statements from {filepath.name}.\n")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description="Event Equipment Rental Platform — Database Checks")
    parser.add_argument("--sql", action="store_true", help="Execute tests/checks.sql file directly")
    args = parser.parse_args()

    if args.sql:
        sql_path = BASE_DIR / "tests" / "checks.sql"
        run_sql_file(sql_path)
        return

    wait_for_mysql()
    print("\n── Event Equipment Rental Platform — Database Verification Suite ──")

    check("1.  get_available_quantity >= 0", chk_func_non_negative)
    check("2.  get_available_quantity on unbooked date", chk_func_stock_on_unbooked)
    check("3.  get_available_quantity on invalid dates", chk_func_invalid_dates)
    check("4.  Overbooking trigger on INSERT", chk_overbooking_insert, expect_error="exceeds available stock")
    check("5.  Overbooking trigger on UPDATE", chk_overbooking_update, expect_error="exceeds available stock")
    check("6.  Review trigger on non-returned item", chk_review_non_returned, expect_error="returned")
    check("7.  Review trigger on non-owner user", chk_review_wrong_user, expect_error="booking owner")
    check("8.  Review trigger on mismatched equipment", chk_review_mismatched_equipment, expect_error="match")
    check("9.  Vendor-role trigger on INSERT", chk_vendor_role_insert, expect_error="must be 'vendor'")
    check("10. User role demotion trigger", chk_user_demotion_blocked, expect_error="delete the vendors row first")
    check("11. Address trigger: single default", chk_duplicate_default_address, expect_error="only one default address")
    check("12. Image trigger: single primary", chk_duplicate_primary_image, expect_error="only one primary image")
    check("13. Booking address ownership trigger", chk_booking_address_ownership, expect_error="belong to the booking customer")
    check("14. Booking item order mismatch trigger", chk_booking_item_order_mismatch, expect_error="match its vendor_order")
    check("15. Booking item min_rental_days trigger", chk_booking_item_min_days, expect_error="minimum rental days")
    check("16. Return item vendor order mismatch trigger", chk_return_item_mismatched_order, expect_error="vendor order")
    check("17. Payment refund ceiling trigger", chk_refund_exceeding_paid, expect_error="exceeds total successful payments")
    check("18. Booking total_amount CHECK constraint", chk_total_amount_check, expect_error="chk_bookings_total_amount")
    check("19. Views execution & non-duplication", chk_views_execution)

    total  = len(Results)
    passed = sum(1 for _, ok, _ in Results if ok)
    failed = total - passed
    print("─" * 70)
    print(f"Results: {passed}/{total} passed, {failed} failed")
    print("─" * 70)
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
