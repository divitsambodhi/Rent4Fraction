#!/usr/bin/env python3
"""
migrate.py — Database migration runner for Event Equipment Rental Platform.

Commands
--------
  python scripts/migrate.py up            Apply all pending migrations
  python scripts/migrate.py status        Show applied / pending migrations
  python scripts/migrate.py reset --yes   Drop + recreate DB, then run up
                                          (localhost / 127.0.0.1 only)

SQL splitting
-------------
Migration files that contain stored programs (functions, triggers, procedures)
MUST separate each program with a marker line:

    -- //

The runner splits on that marker instead of on semicolons, so you never need
the DELIMITER keyword.  Ordinary DDL files (no stored programs) are split on
semicolons as usual.
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import pymysql
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Paths & config
# ---------------------------------------------------------------------------
BASE_DIR       = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR = BASE_DIR / "migrations"
SPLIT_MARKER   = "-- //"

load_dotenv(BASE_DIR / ".env")


# ---------------------------------------------------------------------------
# Connection helpers
# ---------------------------------------------------------------------------
def _base_cfg() -> dict:
    return dict(
        host            = os.getenv("MYSQL_HOST", "localhost"),
        port            = int(os.getenv("MYSQL_PORT", "3306")),
        charset         = "utf8mb4",
        connect_timeout = 5,
        autocommit      = False,
        init_command    = "SET time_zone = '+00:00'",
    )


def get_connection() -> pymysql.Connection:
    cfg = _base_cfg()
    cfg.update(
        user     = os.getenv("MYSQL_USER",     "rental_user"),
        password = os.getenv("MYSQL_PASSWORD", "rental_pass"),
        database = os.getenv("MYSQL_DATABASE", "event_rental"),
    )
    return pymysql.connect(**cfg)


def get_root_connection(database: str | None = None) -> pymysql.Connection:
    cfg = _base_cfg()
    cfg.update(
        user     = "root",
        password = os.getenv("MYSQL_ROOT_PASSWORD", "rootpassword"),
    )
    if database:
        cfg["database"] = database
    return pymysql.connect(**cfg)


# ---------------------------------------------------------------------------
# MySQL readiness wait
# ---------------------------------------------------------------------------
def wait_for_mysql(database: str | None = None, max_retries: int = 30, delay: float = 2.0) -> None:
    host = os.getenv("MYSQL_HOST", "localhost")
    port = os.getenv("MYSQL_PORT", "3306")
    print(f"Waiting for MySQL at {host}:{port} ...")
    for attempt in range(1, max_retries + 1):
        try:
            if database:
                conn = get_connection()
            else:
                conn = get_root_connection()
            conn.close()
            print("MySQL is ready.")
            return
        except Exception as exc:
            print(f"  [{attempt}/{max_retries}] {exc}")
            time.sleep(delay)
    print("ERROR: MySQL did not become ready in time.")
    sys.exit(1)


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
def split_sql(sql_text: str) -> list[str]:
    """
    Split a migration file into executable statements.

    - If the file contains the '-- //' marker, split on that marker.
      Used for files that contain stored functions / triggers / procedures
      (which have semicolons inside their bodies).
    - Otherwise, split on semicolons (standard DDL files).

    Empty segments and comment-only segments are discarded.
    """
    if SPLIT_MARKER in sql_text:
        raw_parts = sql_text.split(SPLIT_MARKER)
    else:
        raw_parts = sql_text.split(";")

    result: list[str] = []
    for part in raw_parts:
        # Keep lines that are not blank and not pure SQL line-comments
        meaningful = [
            line for line in part.splitlines()
            if line.strip() and not line.strip().startswith("--")
        ]
        if meaningful:
            result.append(part.strip())
    return result


# ---------------------------------------------------------------------------
# Apply one migration file
# ---------------------------------------------------------------------------
def apply_migration(conn: pymysql.Connection, filepath: Path) -> None:
    sql_text  = filepath.read_text(encoding="utf-8")
    statements = split_sql(sql_text)
    with conn.cursor() as cur:
        for stmt in statements:
            cur.execute(stmt)
        cur.execute(
            "INSERT INTO schema_migrations (migration) VALUES (%s)",
            (filepath.name,),
        )
    conn.commit()


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------
def cmd_up() -> None:
    db = os.getenv("MYSQL_DATABASE", "event_rental")
    wait_for_mysql(database=db)
    conn = get_connection()
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

    for mig in pending:
        print(f"  Applying  {mig.name} ...", end=" ", flush=True)
        try:
            apply_migration(conn, mig)
            print("done")
        except Exception as exc:
            conn.rollback()
            print(f"\nERROR applying {mig.name}: {exc}")
            conn.close()
            sys.exit(1)

    print(f"Applied {len(pending)} migration(s).")
    conn.close()


def cmd_status() -> None:
    db = os.getenv("MYSQL_DATABASE", "event_rental")
    wait_for_mysql(database=db)
    conn = get_connection()
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
    host = os.getenv("MYSQL_HOST", "localhost")
    db   = os.getenv("MYSQL_DATABASE", "event_rental")
    user = os.getenv("MYSQL_USER",     "rental_user")
    user_pass = os.getenv("MYSQL_PASSWORD", "rental_pass")

    if host not in ("localhost", "127.0.0.1"):
        print(
            f"ERROR: reset is only allowed against localhost / 127.0.0.1.\n"
            f"       Current MYSQL_HOST = '{host}'"
        )
        sys.exit(1)

    if not yes:
        print(
            "ERROR: reset requires the --yes flag to confirm the destructive operation.\n"
            "       Example: python scripts/migrate.py reset --yes"
        )
        sys.exit(1)

    wait_for_mysql()

    root_conn = get_root_connection()
    with root_conn.cursor() as cur:
        print(f"Dropping   database '{db}' ...")
        cur.execute(f"DROP DATABASE IF EXISTS `{db}`")
        print(f"Creating   database '{db}' (utf8mb4 / utf8mb4_0900_ai_ci) ...")
        cur.execute(
            f"CREATE DATABASE `{db}` "
            f"CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
        )
        cur.execute(f"CREATE USER IF NOT EXISTS '{user}'@'%' IDENTIFIED BY '{user_pass}'")
        cur.execute(f"GRANT ALL PRIVILEGES ON `{db}`.* TO '{user}'@'%'")
        cur.execute(f"CREATE USER IF NOT EXISTS '{user}'@'localhost' IDENTIFIED BY '{user_pass}'")
        cur.execute(f"GRANT ALL PRIVILEGES ON `{db}`.* TO '{user}'@'localhost'")
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
    subs.add_parser("up",     help="Apply all pending migrations")
    subs.add_parser("status", help="Show migration status")
    reset_p = subs.add_parser(
        "reset",
        help="Drop + recreate database, then run migrations (localhost only)"
    )
    reset_p.add_argument(
        "--yes",
        action="store_true",
        help="Confirm destructive reset"
    )

    args = parser.parse_args()
    if args.command == "up":
        cmd_up()
    elif args.command == "status":
        cmd_status()
    elif args.command == "reset":
        cmd_reset(yes=args.yes)


if __name__ == "__main__":
    main()
