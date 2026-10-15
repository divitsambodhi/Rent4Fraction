# Event Equipment Rental Platform — Database

MySQL 8.4 local development environment: plain SQL migrations, Docker Compose or standalone MySQL Community Server, and Python tooling.

---

## Quick Start for Backend Developers (5 Commands)

```powershell
# 1. Copy environment template
Copy-Item database\.env.example database\.env

# 2. Start MySQL 8.4 in Docker (or see Option B below if running without Docker)
docker compose -f database/docker-compose.yml up -d

# 3. Install Python migration dependencies
python -m pip install -r database\requirements.txt

# 4. Apply all migrations
python database\scripts\migrate.py up

# 5. Populate development seed data
python database\scripts\seed.py
```

Verify everything is working:
```powershell
python database\scripts\run_checks.py
```

---

## Setup Options

### Option A: Run with Docker (Recommended)

Requires Docker Desktop (>= 4.x).

1. **Configure `.env`:**
   ```powershell
   Copy-Item database\.env.example database\.env
   ```
   If port 3306 is in use by a local service, set `MYSQL_PORT=3307` in `.env`.

2. **Start the containers:**
   ```powershell
   docker compose -f database/docker-compose.yml up -d
   ```
   MySQL 8.4 starts on the configured port with strict SQL mode and UTC timezone.
   Adminer Web UI is available at `http://localhost:8080`.

3. **Install script dependencies:**
   ```powershell
   python -m pip install -r database\requirements.txt
   ```

4. **Run migrations and seed:**
   ```powershell
   python database\scripts\migrate.py up
   python database\scripts\seed.py
   python database\scripts\run_checks.py
   ```

---

### Option B: Run without Docker (Windows Standalone MySQL)

If you haven't learned Docker yet or cannot run Docker on your machine, you can run MySQL directly on Windows:

1. **Download & Install MySQL Community Server 8.4 LTS:**
   - Go to the official download page: https://dev.mysql.com/downloads/installer/
   - Download the MySQL Installer for Windows (`mysql-installer-community-8.4.x.msi`).
   - Run the installer. Choose **Server only** (or Developer Default).
   - In **Type and Networking**, leave port as `3306`.
   - In **Accounts and Roles**, set a root password (e.g. `rootpassword`).
   - In **Windows Service**, keep "Standard System Account" and start MySQL on boot.
   - Click Execute to finish the installation.

2. **Create the Database and Application User:**
   - Open **MySQL Command Line Client** from the Windows Start menu (or open PowerShell and run `mysql -u root -p`).
   - Enter your root password.
   - Run the following SQL statements:
     ```sql
     CREATE DATABASE event_rental CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
     CREATE USER IF NOT EXISTS 'rental_user'@'localhost' IDENTIFIED BY 'rental_pass';
     GRANT ALL PRIVILEGES ON event_rental.* TO 'rental_user'@'localhost';
     CREATE USER IF NOT EXISTS 'rental_user'@'%' IDENTIFIED BY 'rental_pass';
     GRANT ALL PRIVILEGES ON event_rental.* TO 'rental_user'@'%';
     FLUSH PRIVILEGES;
     EXIT;
     ```

3. **Configure `.env`:**
   ```powershell
   Copy-Item database\.env.example database\.env
   ```
   Make sure `database\.env` matches your MySQL root and user credentials:
   ```env
   MYSQL_ROOT_PASSWORD=rootpassword
   MYSQL_DATABASE=event_rental
   MYSQL_USER=rental_user
   MYSQL_PASSWORD=rental_pass
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   ```

4. **Install Python dependencies:**
   ```powershell
   python -m pip install -r database\requirements.txt
   ```

5. **Run migrations, seeds, and verification:**
   ```powershell
   python database\scripts\migrate.py up
   python database\scripts\seed.py
   python database\scripts\run_checks.py
   ```

---

## Reset Database (Drop + Recreate + Re-migrate)

> ⚠️ **Destructive.** Only allowed when `MYSQL_HOST` is `localhost` or `127.0.0.1`.

```powershell
python database\scripts\migrate.py reset --yes
python database\scripts\seed.py
python database\scripts\run_checks.py
```

---

## Verification Test Suite

You can execute the verification suite in two ways:

1. **Python Assertion Runner (Recommended):**
   ```powershell
   python database\scripts\run_checks.py
   ```
   Runs 19 isolated tests inside transactions with rollback.

2. **Direct SQL Checks Runner:**
   ```powershell
   python database\scripts\run_checks.py --sql
   ```
   Executes `tests/checks.sql` directly using PyMySQL without needing a MySQL client binary.

---

## FastAPI Connection String & Settings

Add to your FastAPI configuration (`/server/.env`):

```env
DATABASE_URL=mysql+pymysql://rental_user:rental_pass@localhost:3306/event_rental
```

### Recommended SQLAlchemy Engine Configuration

```python
from sqlalchemy import create_engine

engine = create_engine(
    os.getenv("DATABASE_URL"),
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
    pool_pre_ping=True,
    connect_args={
        "charset": "utf8mb4",
        "init_command": "SET time_zone = '+00:00'",
    },
)
```

### Overbooking — Concurrency Locking Protocol

While the database trigger `trg_booking_items_before_insert` prevents overbooking at the schema level, the **FastAPI booking transaction** MUST acquire a row-level lock before checking availability to prevent race conditions:

```python
# Inside your FastAPI booking transaction:
# 1. Acquire row lock
db.execute(
    text("SELECT equipment_id, quantity FROM equipment WHERE equipment_id = :id FOR UPDATE"),
    {"id": equipment_id}
)

# 2. Check available stock
available = db.execute(
    text("SELECT get_available_quantity(:eq_id, :start, :end)"),
    {"eq_id": equipment_id, "start": start_date, "end": end_date}
).scalar()

if requested_qty > available:
    raise HTTPException(409, "Equipment not available for requested dates")

# 3. Insert booking items
```

---

## Firebase Authentication Flow

```
Client (React + Vite)
  │
  │  1. User signs in with Firebase (Google, Email/Password)
  │  2. Firebase returns ID token (JWT)
  │
  ▼
FastAPI Backend
  │
  │  3. Client sends: Authorization: Bearer <firebase_id_token>
  │  4. Backend verifies token via Firebase Admin SDK:
  │       decoded = auth.verify_id_token(token)
  │  5. Backend checks users table by firebase_uid:
  │       - Exists: load role
  │       - First login: create row (name, email, firebase_uid, role='customer')
  │  6. users.role gates permissions:
  │       - customer : browse, cart, booking, reviews
  │       - vendor   : vendor portal (requires vendors.approval_status = 'approved')
  │       - admin    : admin dashboard
  ▼
MySQL Database (InnoDB)
```

**Passwords are NEVER stored in MySQL.** `users.firebase_uid` bridges Firebase Auth and the database.

---

## Seed Data & Table Reference

The development seed data covers all **22 tables**:

| Table | Rows in Seeds | Key Business Constraints Enforced |
|-------|---------------|-----------------------------------|
| `users` | 7 | UNIQUE(firebase_uid), UNIQUE(email), role-locked |
| `vendors` | 3 | UNIQUE(user_id), approval_status, commission_rate (0..100) |
| `addresses` | 3 | Single default address per user enforced via trigger |
| `categories` | 11 | UNIQUE(parent_id, name), self-referencing tree |
| `equipment` | 15 | FULLTEXT index on (name, description), rating sync |
| `equipment_images` | 16 | Single primary image per equipment enforced via trigger |
| `availability` | 1 | Blocked dates for maintenance, composite search index |
| `coupons` | 1 | Flat/percent discounts, date validity, usage limit |
| `bookings` | 3 | Total amount formula CHECK, customer address ownership trigger |
| `vendor_orders` | 4 | Sub-order per vendor, ON DELETE RESTRICT |
| `booking_items` | 4 | Overbooking trigger, min_rental_days guard, FK integrity |
| `payments` | 4 | Amount > 0 CHECK, refund ceiling trigger |
| `deliveries` | 1 | Delivery / pickup tracking attached to vendor_orders |
| `returns` | 1 | Return workflow header per vendor_order |
| `return_items` | 1 | `item_condition` ENUM, order match trigger, quantity guard |
| `damage_reports` | 1 | Deducted from deposit flag, resolution tracking |
| `reviews` | 1 | Guarded to returned items, owner match, auto-syncs ratings |
| `cart_items` | 1 | Shopping cart with dates and quantity checks |
| `wishlist` | 2 | Customer wishlist items with composite PK |
| `payouts` | 1 | Net amount formula CHECK, completed order payouts |
| `notifications` | 3 | Unread/read customer and vendor notifications |
| `messages` | 2 | Bidirectional message thread between customer and vendor |

---

## Stopping / Cleanup

```powershell
# Stop Docker containers (data preserved in named volume)
docker compose -f database/docker-compose.yml down

# Stop AND wipe database volume
docker compose -f database/docker-compose.yml down -v
```
