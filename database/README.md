# Event Equipment Rental Platform — Database

MySQL 8.4 local development environment: plain SQL migrations, Docker Compose, Python migration runner.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Docker Desktop | ≥ 4.x | Provides `docker compose` |
| Python | ≥ 3.11 | For migration / seed scripts |
| pip or uv | any | Package installer |

> **Windows users:** all commands below work in PowerShell.
> No bash-only scripts are used anywhere.

---

## Quick Start

### 1. Copy and configure `.env`

```powershell
# PowerShell
Copy-Item database\.env.example database\.env
```

```bash
# macOS / Linux
cp database/.env.example database/.env
```

Edit `database/.env` and set your passwords.
If port 3306 is already taken, change `MYSQL_PORT=3307` (the runner reads it automatically).

### 2. Start MySQL + Adminer

```powershell
# PowerShell — from repo root
docker compose -f database/docker-compose.yml up -d
```

```bash
# macOS / Linux — from repo root
docker compose -f database/docker-compose.yml up -d
```

MySQL exposes the port defined by `MYSQL_PORT` (default 3306).
Adminer is available at `http://localhost:<ADMINER_PORT>` (default 8080).

### 3. Install Python dependencies

```powershell
# PowerShell
python -m pip install -r database\requirements.txt
```

```bash
# macOS / Linux
pip install -r database/requirements.txt
```

### 4. Run migrations

```powershell
python database\scripts\migrate.py up
```

```bash
python database/scripts/migrate.py up
```

Expected output: `Applied 13 migration(s).`
Running `up` a **second time** is a no-op: `Already up to date — no migrations to apply.`

### 5. Seed development data

```powershell
python database\scripts\seed.py
```

```bash
python database/scripts/seed.py
```

Running seed a second time is safe (idempotent).

### 6. Check migration status

```powershell
python database\scripts\migrate.py status
```

### 7. Run integrity checks

```powershell
python database\scripts\run_checks.py
```

Expected output: `Results: 8/8 passed, 0 failed`

---

## Reset (drop + recreate + re-migrate)

> ⚠️ **Destructive.** Only allowed when `MYSQL_HOST` is `localhost` or `127.0.0.1`.

```powershell
# PowerShell
python database\scripts\migrate.py reset --yes
python database\scripts\seed.py
```

```bash
# macOS / Linux
python database/scripts/migrate.py reset --yes
python database/scripts/seed.py
```

---

## Full Verification Sequence

```powershell
# Start fresh
docker compose -f database/docker-compose.yml down -v
docker compose -f database/docker-compose.yml up -d

# First run
python database\scripts\migrate.py up       # applies 13 migrations
python database\scripts\seed.py             # seeds dev data

# Idempotency check — second run must be a no-op
python database\scripts\migrate.py up       # prints "Already up to date"
python database\scripts\seed.py             # no duplicate rows

# Reset and rebuild from scratch
python database\scripts\migrate.py reset --yes
python database\scripts\seed.py

# Run checks
python database\scripts\run_checks.py
```

---

## FastAPI Connection String

Add to `/server/.env`:

```
DATABASE_URL=mysql+pymysql://rental_user:rental_pass@localhost:3306/event_rental
```

Replace credentials and port with your `.env` values.
Use this with SQLAlchemy: `create_engine(os.getenv("DATABASE_URL"))`.

### Overbooking — Application-Level Locking

The database trigger `trg_booking_items_before_insert` is a safety net.
The **FastAPI booking transaction** MUST also acquire a row-level lock before
checking availability, to prevent race conditions between concurrent requests:

```python
# Inside your FastAPI create_booking transaction:
db.execute(
    "SELECT equipment_id, quantity FROM equipment WHERE equipment_id = :id FOR UPDATE",
    {"id": equipment_id}
)
available = db.execute(
    "SELECT get_available_quantity(:eq_id, :start, :end)",
    {"eq_id": equipment_id, "start": start_date, "end": end_date}
).scalar()
if requested_qty > available:
    raise HTTPException(409, "Equipment not available for requested dates")
# ... insert booking_items ...
```

---

## Firebase Authentication Flow

```
Client (React)
  │
  │  1. User signs in with Firebase (email/password, Google, etc.)
  │
  │  2. Firebase returns an ID token (JWT)
  │
  ▼
FastAPI backend
  │
  │  3. Client sends:  Authorization: Bearer <firebase_id_token>
  │
  │  4. Firebase Admin SDK verifies the token:
  │       firebase_admin.auth.verify_id_token(token)
  │       → returns decoded payload with uid, email, etc.
  │
  │  5. Backend looks up or creates the users row:
  │       SELECT * FROM users WHERE firebase_uid = :uid
  │       (first login → INSERT with firebase_uid, email, name from token)
  │
  │  6. users.role is the source of truth for authorization:
  │       - customer  → browse, book, review
  │       - vendor    → vendor portal (requires vendors.approval_status = 'approved')
  │       - admin     → full admin panel
  │
  ▼
MySQL DB
```

**Passwords are NEVER stored in the database.** Firebase manages credentials.
`users.firebase_uid` is the bridge between Firebase and the application database.

---

## Firebase UID Placeholders

The seed files contain placeholder `firebase_uid` values:

| Placeholder | Role | Email |
|-------------|------|-------|
| `dev-admin-uid-replace-me` | admin | admin@eventrental.dev |
| `dev-customer-1-uid-replace-me` | customer | aisha.sharma@example.com |
| `dev-customer-2-uid-replace-me` | customer | rahul.mehta@example.com |
| `dev-customer-3-uid-replace-me` | customer | priya.nair@example.com |
| `dev-vendor-1-uid-replace-me` | vendor | suresh@soundmasterpro.dev |
| `dev-vendor-2-uid-replace-me` | vendor | meera@lightupevents.dev |
| `dev-vendor-3-uid-replace-me` | vendor | deepak@partyessentials.dev |

**Option A — Replace with real UIDs:**
In the Firebase Console, create the users above and copy their UIDs into the
seed files before running `seed.py`.

**Option B — Firebase Auth Emulator (recommended for dev):**
Start the emulator and create users with the placeholder UIDs directly.
The emulator accepts any UID you specify.

```bash
firebase emulators:start --only auth
# In emulator UI, create users with the placeholder UIDs above.
```

Set `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099` in your FastAPI `.env`.

---

## Adminer

Open `http://localhost:<ADMINER_PORT>` (default 8080) in your browser.

| Field | Value |
|-------|-------|
| System | MySQL |
| Server | mysql (inside Docker) |
| Username | rental_user |
| Password | (from `.env`) |
| Database | event_rental |

---

## Table Reference

| Table | Rows in seeds | Key constraint |
|-------|---------------|----------------|
| users | 7 | UNIQUE(firebase_uid), UNIQUE(email) |
| vendors | 3 | UNIQUE(user_id) |
| addresses | 3 | — |
| categories | 11 | UNIQUE(parent_id, name) |
| equipment | 15 | — |
| equipment_images | 16 | — |
| availability | 0 | CHECK(end_date>=start_date) |
| coupons | 1 | UNIQUE(code) |
| bookings | 3 | CHECK(total_amount formula) |
| vendor_orders | 4 | UNIQUE(booking_id, vendor_id) |
| booking_items | 4 | CHECK(quantity>0) |
| payments | 4 | UNIQUE(transaction_id) |
| deliveries | 1 | UNIQUE(vendor_order_id) |
| returns | 1 | UNIQUE(vendor_order_id) |
| return_items | 1 | — |
| damage_reports | 1 | UNIQUE(return_item_id) |
| reviews | 1 | UNIQUE(booking_item_id), CHECK(1<=rating<=5) |
| cart_items | 0 | UNIQUE(user_id, equipment_id, start_date, end_date) |
| wishlist | 0 | PK(user_id, equipment_id) |
| payouts | 0 | UNIQUE(vendor_order_id) |
| notifications | 0 | — |
| messages | 0 | — |

---

## Migration Files

| File | Description |
|------|-------------|
| 001_users_vendors.sql | users, vendors tables |
| 002_addresses.sql | addresses table |
| 003_categories_equipment.sql | categories, equipment, equipment_images |
| 004_availability.sql | availability (blocked ranges) |
| 005_coupons.sql | coupons |
| 006_bookings_vendor_orders_items.sql | bookings, vendor_orders, booking_items |
| 007_payments.sql | payments |
| 008_delivery_returns_damage.sql | deliveries, returns, return_items, damage_reports |
| 009_reviews.sql | reviews |
| 010_cart_wishlist.sql | cart_items, wishlist |
| 011_payouts_notifications_messages.sql | payouts, notifications, messages |
| 012_indexes_and_views.sql | Composite indexes + 4 views |
| 013_functions_and_triggers.sql | `get_available_quantity()` + 7 triggers |

Migration 013 uses `-- //` as the statement separator (not DELIMITER).

---

## Stopping / Cleanup

```powershell
# Stop containers (data preserved in named volume)
docker compose -f database/docker-compose.yml down

# Stop AND delete all data
docker compose -f database/docker-compose.yml down -v
```
