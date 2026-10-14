#!/usr/bin/env python3
"""
seed.py — Apply development seed data to the database.

Seed files are idempotent: safe to run multiple times (uses
ON DUPLICATE KEY UPDATE or WHERE NOT EXISTS patterns).

Usage
-----
  python scripts/seed.py
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import pymysql
from dotenv import load_dotenv

BASE_DIR  = Path(__file__).resolve().parent.parent
SEEDS_DIR = BASE_DIR / "seeds"
SPLIT_MARKER = "-- //"

load_dotenv(BASE_DIR / ".env")


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


def wait_for_mysql(max_retries: int = 30, delay: float = 2.0) -> None:
    print("Waiting for MySQL ...")
    for attempt in range(1, max_retries + 1):
        try:
            conn = get_connection()
            conn.close()
            print("MySQL is ready.")
            return
        except Exception as exc:
            print(f"  [{attempt}/{max_retries}] {exc}")
            time.sleep(delay)
    print("ERROR: MySQL did not become ready in time.")
    sys.exit(1)


def split_sql(sql_text: str) -> list[str]:
    if SPLIT_MARKER in sql_text:
        raw_parts = sql_text.split(SPLIT_MARKER)
    else:
        raw_parts = sql_text.split(";")

    result: list[str] = []
    for part in raw_parts:
        meaningful = [
            line for line in part.splitlines()
            if line.strip() and not line.strip().startswith("--")
        ]
        if meaningful:
            result.append(part.strip())
    return result


def apply_seed(conn: pymysql.Connection, filepath: Path) -> None:
    sql_text   = filepath.read_text(encoding="utf-8")
    statements = split_sql(sql_text)
    with conn.cursor() as cur:
        for stmt in statements:
            cur.execute(stmt)
    conn.commit()


def main() -> None:
    wait_for_mysql()
    conn       = get_connection()
    seed_files = sorted(SEEDS_DIR.glob("*.sql"))

    if not seed_files:
        print("No seed files found in seeds/.")
        conn.close()
        return

    for sf in seed_files:
        print(f"  Seeding   {sf.name} ...", end=" ", flush=True)
        try:
            apply_seed(conn, sf)
            print("done")
        except Exception as exc:
            conn.rollback()
            print(f"\nERROR in {sf.name}: {exc}")
            conn.close()
            sys.exit(1)

    print("All seeds applied.")
    conn.close()


if __name__ == "__main__":
    main()
