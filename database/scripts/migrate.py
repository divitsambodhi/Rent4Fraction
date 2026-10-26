#!/usr/bin/env python3
"""
migrate.py — Database migration runner for Event Equipment Rental Platform.

Commands
--------
  python scripts/migrate.py check         Pre-flight environment and connectivity check
  python scripts/migrate.py up            Apply all pending migrations
  python scripts/migrate.py status        Show applied / pending migrations
  python scripts/migrate.py reset --yes   Wipe & rebuild tables via drop+recreate DB, then run up
                                          (localhost / 127.0.0.1 only)

SQL splitting
-------------
Migration files that contain stored programs (functions, triggers, procedures)
MUST separate each program with a marker line:

    -- //

The runner splits on that marker instead of on semicolons, so you never need
the DELIMITER keyword. Ordinary DDL files (no stored programs) are split on
semicolons as usual.
"""
from __future__ import annotations

import argparse
import os
import re
import sys
import time
from pathlib import Path

try:
    import pymysql
except ImportError:
    print(
        "ERROR: Required Python package 'pymysql' is missing.\n"
        "       Please run:  pip install -r database\\requirements.txt"
    )
    sys.exit(1)

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Paths & config
# ---------------------------------------------------------------------------
BASE_DIR       = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR = BASE_DIR / "migrations"
SPLIT_MARKER   = "-- //"
ENV_FILE       = BASE_DIR / ".env"

load_dotenv(ENV_FILE)


# ---------------------------------------------------------------------------
# Connection helpers
# ---------------------------------------------------------------------------
def _base_cfg() -> dict:
    return dict(
        host            = os.getenv("MYSQL_HOST", "127.0.0.1"),
        port            = int(os.getenv("MYSQL_PORT", "3306")),
        charset         = "utf8mb4",
        connect_timeout = 5,
        autocommit      = False,
        init_command    = "SET time_zone = '+00:00'",
    )


def get_connection(database: str | None = None) -> pymysql.Connection:
    """Connect using application credentials (rental_user)."""
    cfg = _base_cfg()
    target_db = database if database is not None else os.getenv("MYSQL_DATABASE", "event_rental")
    cfg.update(
        user     = os.getenv("MYSQL_USER",     "rental_user"),
        password = os.getenv("MYSQL_PASSWORD", ""),
    )
    if target_db:
        cfg["database"] = target_db
    return pymysql.connect(**cfg)


def get_root_connection(database: str | None = None) -> pymysql.Connection:
    """
    Connect using MySQL root user.
    Used ONLY by cmd_reset to drop and recreate the database when requested.
    """
    cfg = _base_cfg()
    cfg.update(
        user     = "root",
        password = os.getenv("MYSQL_ROOT_PASSWORD", ""),
    )
    if database:
        cfg["database"] = database
    return pymysql.connect(**cfg)


def explain_connection_error(exc: Exception) -> str:
    """Translate common MySQL operational errors into friendly instructions."""
    msg = str(exc)
    host = os.getenv("MYSQL_HOST", "127.0.0.1")
    port = os.getenv("MYSQL_PORT", "3306")
    user = os.getenv("MYSQL_USER", "rental_user")
    db   = os.getenv("MYSQL_DATABASE", "event_rental")

    if "2003" in msg or "Can't connect" in msg or "Connection refused" in msg or "timed out" in msg:
        return (
            f"-> Cannot connect to MySQL server at {host}:{port}.\n"
            f"   Fix: Verify that your MySQL Windows service (e.g. MySQL80) is RUNNING\n"
            f"        and that port {port} matches your MySQL configuration."
        )
    if "1044" in msg:
        return (
            f"-> Access denied for user '{user}' to database '{db}'.\n"
            f"   The database '{db}' might not exist or '{user}' does not have permissions granted on it.\n"
            f"   Fix: In MySQL Workbench / CLI as root, run:\n"
            f"        CREATE DATABASE IF NOT EXISTS {db} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;\n"
            f"        GRANT ALL PRIVILEGES ON {db}.* TO '{user}'@'localhost';\n"
            f"        GRANT ALL PRIVILEGES ON {db}.* TO '{user}'@'127.0.0.1';\n"
            f"        FLUSH PRIVILEGES;"
        )
    if "1045" in msg:
        return (
            f"-> Access denied for user '{user}' (wrong password or user does not exist).\n"
            f"   Fix: Check that MYSQL_USER and MYSQL_PASSWORD in database\\.env\n"
            f"        match the password you set in database\\manual\\00_create_database_and_user.sql."
        )
    if "1049" in msg or "Unknown database" in msg:
        return (
            f"-> Database '{db}' does not exist.\n"
            f"   Fix: Open database\\manual\\00_create_database_and_user.sql in MySQL Workbench\n"
            f"        and execute it as root first to create the database and user."
        )
    return f"-> {exc}"



# ---------------------------------------------------------------------------
# MySQL readiness wait
# ---------------------------------------------------------------------------
def wait_for_mysql(database: str | None = None, max_retries: int = 15, delay: float = 1.5) -> None:
    host = os.getenv("MYSQL_HOST", "127.0.0.1")
    port = os.getenv("MYSQL_PORT", "3306")
    for attempt in range(1, max_retries + 1):
        try:
            conn = get_connection(database=database)
            conn.close()
            return
        except Exception as exc:
            if attempt == max_retries:
                print(f"ERROR: Cannot connect to MySQL at {host}:{port}.\n{explain_connection_error(exc)}")
                sys.exit(1)
            time.sleep(delay)


# ---------------------------------------------------------------------------
# Tracking table
# ---------------------------------------------------------------------------
_CREATE_TRACKING = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    migration  VARCHAR(255) NOT NULL,
    applied_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (migration)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
"""


def ensure_tracking(conn: pymysql.Connection) -> None:
    with conn.cursor() as cur:
        cur.execute(_CREATE_TRACKING)
    conn.commit()


def applied_set(conn: pymysql.Connection) -> set[str]:
    with conn.cursor() as cur:
        cur.execute("SELECT migration FROM schema_migrations ORDER BY migration")
        return {row[0] for row in cur.fetchall()}


# ---------------------------------------------------------------------------
# SQL splitting
# ---------------------------------------------------------------------------
def clean_sql_comments(sql_text: str) -> str:
    """Remove line comments starting with -- from sql_text while preserving content."""
    clean_lines = []
    for line in sql_text.splitlines():
        stripped = line.strip()
        # Keep lines that are not SQL comments
        if stripped.startswith("--"):
            clean_lines.append("")  # preserve line count
        else:
            clean_lines.append(line)
    return "\n".join(clean_lines)


def split_sql(sql_text: str) -> list[str]:
    """
    Split a migration file into executable statements.

    - If the file contains the '-- //' marker, split on that marker.
      Used for files that contain stored functions / triggers / procedures
      (which have semicolons inside their bodies).
    - Otherwise, strip line comments and split on semicolons (standard DDL files).

    Empty segments are discarded.
    """
    if SPLIT_MARKER in sql_text:
        raw_parts = sql_text.split(SPLIT_MARKER)
        result: list[str] = []
        for part in raw_parts:
            # Strip comments from trigger/function chunks
            meaningful = [
                line for line in part.splitlines()
                if line.strip() and not line.strip().startswith("--")
            ]
            if meaningful:
                result.append("\n".join(meaningful).strip())
        return result

    # Standard DDL: clean comments first, then split on semicolons
    cleaned = clean_sql_comments(sql_text)
    raw_parts = cleaned.split(";")
    result: list[str] = []
    for part in raw_parts:
        trimmed = part.strip()
        if trimmed:
            result.append(trimmed)
    return result


# ---------------------------------------------------------------------------
# Apply one migration file
# ---------------------------------------------------------------------------
def apply_migration(conn: pymysql.Connection, filepath: Path) -> None:
    sql_text   = filepath.read_text(encoding="utf-8-sig")
    statements = split_sql(sql_text)
    with conn.cursor() as cur:
        for stmt in statements:
            cur.execute(stmt)
        # ONLY record as applied if all statements in this file succeeded
        cur.execute(
            "INSERT INTO schema_migrations (migration) VALUES (%s)",
            (filepath.name,),
        )
    conn.commit()


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------
def cmd_check() -> None:
    """Pre-flight check: .env, host connectivity, version, db presence, privileges."""
    print("── Pre-flight Migration Check ──")

    # (a) Check .env presence
    if not ENV_FILE.exists():
        print("[FAIL] database/.env file not found.")
        print("       Fix: Copy database/.env.example to database/.env and configure your password.")
        sys.exit(1)
    print("[PASS] database/.env file found.")

    host = os.getenv("MYSQL_HOST", "127.0.0.1")
    port = int(os.getenv("MYSQL_PORT", "3306"))
    user = os.getenv("MYSQL_USER", "rental_user")
    db   = os.getenv("MYSQL_DATABASE", "event_rental")

    # (b) Can connect to MySQL host and port with rental_user
    try:
        conn_server = get_connection(database="")
    except Exception as exc:
        print(f"[FAIL] Cannot connect to MySQL server at {host}:{port} as user '{user}'.")
        print(f"       {explain_connection_error(exc)}")
        sys.exit(1)
    print(f"[PASS] Connected to MySQL at {host}:{port} as user '{user}'.")

    # (c) Server version check
    try:
        with conn_server.cursor() as cur:
            cur.execute("SELECT VERSION()")
            ver_str = cur.fetchone()[0]
            print(f"[PASS] MySQL Server version: {ver_str}")
            # Parse major.minor.patch
            m = re.match(r"^(\d+)\.(\d+)\.(\d+)", ver_str)
            if m:
                major, minor, patch = int(m.group(1)), int(m.group(2)), int(m.group(3))
                if (major, minor, patch) < (8, 0, 16):
                    print(
                        f"[WARN] MySQL version {ver_str} is older than 8.0.16.\n"
                        f"       CHECK constraints and schema features require MySQL 8.0.16 or newer (8.4 LTS recommended)."
                    )
    except Exception as exc:
        print(f"[WARN] Could not determine MySQL version: {exc}")
    finally:
        conn_server.close()

    # (d) Database event_rental exists
    try:
        conn_db = get_connection(database=db)
    except Exception as exc:
        print(f"[FAIL] Cannot access database '{db}'.")
        print(f"       {explain_connection_error(exc)}")
        sys.exit(1)
    print(f"[PASS] Database '{db}' exists and is accessible.")

    # (e) Check user privileges (create tables, views, triggers, functions)
    try:
        with conn_db.cursor() as cur:
            cur.execute("SHOW GRANTS FOR CURRENT_USER()")
            grants = [row[0] for row in cur.fetchall()]
            grants_joined = " ".join(grants).upper()

            has_all = "ALL PRIVILEGES" in grants_joined
            has_essentials = all(
                p in grants_joined for p in ("CREATE", "SELECT", "INSERT", "TRIGGER")
            )
            if has_all or has_essentials:
                print(f"[PASS] User '{user}' has sufficient schema and execution privileges on '{db}'.")
            else:
                print(f"[WARN] User '{user}' grants might be limited.")

            # (f) Check binary logging trust for stored routines
            cur.execute("SHOW VARIABLES LIKE 'log_bin_trust_function_creators'")
            trust_row = cur.fetchone()
            if trust_row and trust_row[1].upper() in ('ON', '1'):
                print(f"[PASS] log_bin_trust_function_creators is ON.")
            else:
                print(f"[WARN] log_bin_trust_function_creators is OFF (needed for 013_functions_and_triggers.sql).")
                print(f"       Execute in MySQL Workbench as root:  SET GLOBAL log_bin_trust_function_creators = 1;")
    except Exception as exc:
        print(f"[WARN] Could not inspect user grants / variables: {exc}")
    finally:
        conn_db.close()

    print("\nPre-flight check completed! Next: python database\\scripts\\migrate.py up")


def cmd_up() -> None:
    db = os.getenv("MYSQL_DATABASE", "event_rental")
    wait_for_mysql(database=db)
    try:
        conn = get_connection(database=db)
    except Exception as exc:
        print(f"ERROR: Cannot connect to '{db}':\n{explain_connection_error(exc)}")
        sys.exit(1)

    ensure_tracking(conn)
    applied = applied_set(conn)
    pending = [
        f for f in sorted(MIGRATIONS_DIR.glob("*.sql"))
        if f.name not in applied
    ]

    if not pending:
        print("Already up to date — no migrations to apply.")
        conn.close()
        return

    # If migration 013 is pending, try to ensure log_bin_trust_function_creators is ON
    if any(m.name.startswith("013") for m in pending):
        try:
            root_pwd = os.getenv("MYSQL_ROOT_PASSWORD")
            if root_pwd is not None:
                r_conn = get_root_connection()
                with r_conn.cursor() as r_cur:
                    r_cur.execute("SET GLOBAL log_bin_trust_function_creators = 1")
                r_conn.close()
        except Exception:
            pass

    for mig in pending:
        print(f"  Applying  {mig.name} ...", end=" ", flush=True)
        try:
            apply_migration(conn, mig)
            print("done")
        except Exception as exc:
            conn.rollback()
            print("FAILED")
            print(f"\n================================================================================")
            print(f"ERROR applying migration file: {mig.name}")
            print(f"MySQL error: {exc}")
            print(f"================================================================================")
            if "1419" in str(exc) or "log_bin_trust_function_creators" in str(exc):
                print(
                    "\n-> Cause: MySQL binary logging is enabled on your server.\n"
                    "   Creating stored functions requires either SUPER privilege or enabling trust.\n\n"
                    "   Quick Fix (One command in MySQL Workbench as root):\n"
                    "     SET GLOBAL log_bin_trust_function_creators = 1;\n"
                )
            print(
                "\nNote: MySQL DDL statements (CREATE TABLE, ALTER TABLE, etc.) cause implicit\n"
                "commits and cannot be fully rolled back. This failed migration was NOT recorded\n"
                "in schema_migrations.\n\n"
                "Safe Recovery:\n"
                "  To wipe partial tables and start fresh, run (localhost only):\n"
                "    python database\\scripts\\migrate.py reset --yes\n"
            )
            conn.close()
            sys.exit(1)

    print(f"Applied {len(pending)} migration(s).")
    conn.close()


def cmd_status() -> None:
    db = os.getenv("MYSQL_DATABASE", "event_rental")
    wait_for_mysql(database=db)
    try:
        conn = get_connection(database=db)
    except Exception as exc:
        print(f"ERROR: Cannot connect to '{db}':\n{explain_connection_error(exc)}")
        sys.exit(1)

    ensure_tracking(conn)
    applied = applied_set(conn)
    files   = sorted(MIGRATIONS_DIR.glob("*.sql"))

    print(f"\n{'Migration':<48} {'Status'}")
    print("-" * 62)
    for f in files:
        status = "applied" if f.name in applied else "pending"
        print(f"  {f.name:<46} {status}")
    print()
    conn.close()


def cmd_reset(yes: bool = False) -> None:
    host = os.getenv("MYSQL_HOST", "127.0.0.1")
    db   = os.getenv("MYSQL_DATABASE", "event_rental")
    user = os.getenv("MYSQL_USER",     "rental_user")
    user_pass = os.getenv("MYSQL_PASSWORD", "")

    if host not in ("localhost", "127.0.0.1"):
        print(
            f"ERROR: reset is only allowed against localhost / 127.0.0.1.\n"
            f"       Current MYSQL_HOST = '{host}'"
        )
        sys.exit(1)

    if not yes:
        print(
            "ERROR: reset requires the --yes flag to confirm the destructive operation.\n"
            "       Example: python database\\scripts\\migrate.py reset --yes"
        )
        sys.exit(1)

    print(
        "Notice: 'reset' drops and recreates database 'event_rental' and re-applies all migrations.\n"
        "Attempting root connection (requires MYSQL_ROOT_PASSWORD in .env if your root user has a password)..."
    )

    try:
        root_conn = get_root_connection()
    except Exception as exc:
        print(f"ERROR connecting as root for database reset:\n{exc}")
        print(
            "\nTip: 'reset' requires root privileges to execute DROP DATABASE and CREATE DATABASE.\n"
            "If your root user requires a password, temporarily set MYSQL_ROOT_PASSWORD in database\\.env,\n"
            "or drop and recreate the database manually in MySQL Workbench using:\n"
            "  database\\manual\\00_create_database_and_user.sql"
        )
        sys.exit(1)

    with root_conn.cursor() as cur:
        print(f"Dropping database '{db}' ...")
        cur.execute(f"DROP DATABASE IF EXISTS `{db}`")
        print(f"Creating database '{db}' (utf8mb4 / utf8mb4_0900_ai_ci) ...")
        cur.execute(
            f"CREATE DATABASE `{db}` "
            f"CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
        )
        # Re-grant privileges to localhost and 127.0.0.1 ONLY (never '%')
        cur.execute(f"DROP USER IF EXISTS '{user}'@'localhost'")
        cur.execute(f"CREATE USER '{user}'@'localhost' IDENTIFIED BY '{user_pass}'")
        cur.execute(f"GRANT ALL PRIVILEGES ON `{db}`.* TO '{user}'@'localhost'")
        cur.execute(f"DROP USER IF EXISTS '{user}'@'127.0.0.1'")
        cur.execute(f"CREATE USER '{user}'@'127.0.0.1' IDENTIFIED BY '{user_pass}'")
        cur.execute(f"GRANT ALL PRIVILEGES ON `{db}`.* TO '{user}'@'127.0.0.1'")
        cur.execute("FLUSH PRIVILEGES")
    root_conn.commit()
    root_conn.close()
    print("Database reset complete. Running migrations ...\n")
    cmd_up()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(
        description="Event Equipment Rental Platform — migration runner"
    )
    subs = parser.add_subparsers(dest="command", required=True)
    subs.add_parser("check",  help="Run pre-flight environment & connection checks")
    subs.add_parser("up",     help="Apply all pending migrations")
    subs.add_parser("status", help="Show migration status")
    reset_p = subs.add_parser(
        "reset",
        help="Drop + recreate database, then run migrations (localhost only, requires root)"
    )
    reset_p.add_argument(
        "--yes",
        action="store_true",
        help="Confirm destructive reset"
    )

    args = parser.parse_args()
    if args.command == "check":
        cmd_check()
    elif args.command == "up":
        cmd_up()
    elif args.command == "status":
        cmd_status()
    elif args.command == "reset":
        cmd_reset(yes=args.yes)


if __name__ == "__main__":
    main()
