# Event Equipment Rental Platform — Database

MySQL local development environment for Windows: plain SQL migrations, seed scripts, and verification tooling.

Written for MySQL 8.4 LTS and also compatible with 8.0.16 or newer. (MySQL 8.0 has reached end of life, so plan to upgrade to 8.4 LTS later).

---

## Quick Start (First Time Setup)

Follow the complete step-by-step beginner guide in:
👉 **[RUN_ME_FIRST.md](file:///d:/DBMS%20project/Rent4Fraction/database/RUN_ME_FIRST.md)**

Summary of the sequence:
1. Turn ON the MySQL Windows Service (`MySQL80` or `MySQL84`).
2. Run `database/manual/00_create_database_and_user.sql` in MySQL Workbench as root to create the `event_rental` database and `rental_user`.
3. Copy `database/.env.example` to `database/.env` and enter your password.
4. Run `python -m pip install -r database\requirements.txt`.
5. Run `python database\scripts\migrate.py check` to verify configuration.
6. Run `python database\scripts\migrate.py up` to apply migrations.
7. Run `python database\scripts\seed.py` to insert test data.
8. Run `python database\scripts\run_checks.py` to run verification checks.

---

## Commands Reference

All standard migration, seeding, and verification commands require **only `rental_user`** credentials:

```powershell
# Pre-flight environment check (verifies .env, MySQL connection, and permissions)
python database\scripts\migrate.py check

# Apply all pending schema migrations
python database\scripts\migrate.py up

# Check which migrations are applied or pending
python database\scripts\migrate.py status

# Populate development seed data
python database\scripts\seed.py

# Run comprehensive integrity and business logic checks
python database\scripts\run_checks.py

# Run check suite directly from SQL
python database\scripts\run_checks.py --sql
```

---

## Resetting the Database (Starting Over)

> ⚠️ **Destructive.** Only allowed when `MYSQL_HOST` is `localhost` or `127.0.0.1`.
> Dropping and recreating the database requires root privileges (via `MYSQL_ROOT_PASSWORD` in `.env` or executed manually in MySQL Workbench).

```powershell
python database\scripts\migrate.py reset --yes
python database\scripts\seed.py
python database\scripts\run_checks.py
```

---

## Deployment Later

When the app goes live, the database will run on a hosted MySQL 8.x service (not on your local PC). Use a real MySQL 8.x service because this schema relies on triggers, stored functions, views, and foreign keys. The migrations are reused on a fresh production database. Sample seed data must never be loaded in production.

---

## Database ER Diagram

To inspect or generate an Entity-Relationship (ER) diagram:
- Use **MySQL Workbench > Database > Reverse Engineer** against your live `event_rental` database after running migrations.
- Alternatively, import `database/er_schema.sql` into MySQL Workbench for ER modeling only.

---

## Backend Connection Reference

When building your backend (FastAPI / Express / Flask), configure the database connection string:

```env
DATABASE_URL=mysql+pymysql://rental_user:YOUR_PASSWORD@127.0.0.1:3306/event_rental
```
