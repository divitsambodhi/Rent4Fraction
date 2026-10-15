# Database Architecture & Reference Guide — Rent4Fraction

> **Project:** Event Equipment Rental Platform (Rent4Fraction)  
> **Directory Scope:** `/database`  
> **Target Audience:** Developers & AI Assistants reviewing or extending the database layer.

---

## 1. Directory Structure

```text
database/
├── .env.example                                  # Template for DB connection strings & ports
├── .gitignore                                    # Excludes .env, *.pyc, and local artifacts
├── docker-compose.yml                            # MySQL 8.4 + Adminer container setup
├── requirements.txt                              # Python tooling dependencies (PyMySQL, dotenv, cryptography)
├── README.md                                     # Setup, commands, and operator guide
├── SUMMARY.md                                    # This comprehensive architecture & explanation guide
│
├── docs/
│   ├── erd.mmd                                   # Complete Mermaid ER diagram (22 tables + relationships)
│   └── schema.md                                 # Full table-by-table column specification & design notes
│
├── migrations/                                   # Plain SQL migrations (applied chronologically)
│   ├── 001_users_vendors.sql                     # users, vendors
│   ├── 002_addresses.sql                         # addresses (multi-purpose, user/vendor linked)
│   ├── 003_categories_equipment.sql              # categories (self-referencing tree), equipment, equipment_images
│   ├── 004_availability.sql                     # availability (maintenance/vendor blackout dates)
│   ├── 005_coupons.sql                           # coupons (platform & vendor discounts)
│   ├── 006_bookings_vendor_orders_items.sql      # bookings (master), vendor_orders (split), booking_items (line items)
│   ├── 007_payments.sql                          # payments (multi-gateway transactions)
│   ├── 008_delivery_returns_damage.sql           # delivery_tracking, item_returns, damage_reports, damage_photos
│   ├── 009_reviews.sql                           # reviews (equipment feedback & rating)
│   ├── 010_cart_wishlist.sql                     # cart_items, wishlist
│   ├── 011_payouts_notifications_messages.sql    # vendor_payouts, notifications, chat_messages
│   ├── 012_indexes_and_views.sql                 # Composite indexes, query views (active listings, vendor revenue)
│   └── 013_functions_and_triggers.sql            # Stock calculation function + 20 integrity/sync triggers
│
├── scripts/                                      # Python CLI orchestration (no heavy ORM required)
│   ├── migrate.py                                # Migration runner (up, status, reset) with custom delimiter support
│   ├── seed.py                                   # Idempotent seed data injector
│   └── run_checks.py                             # Test runner for database constraints, triggers, and edge cases
│
├── seeds/                                        # Ordered sample datasets (ON DUPLICATE KEY UPDATE)
│   ├── 001_admin_and_users.sql                   # Platform admin, vendor accounts, customer accounts
│   ├── 002_categories.sql                        # Category tree (Audio, Lighting, Staging, Furniture)
│   ├── 003_vendors_equipment.sql                 # Vendor profiles, gear listings, rental tiers, images
│   └── 004_sample_bookings.sql                   # Completed, confirmed, and multi-vendor booking flows
│
└── tests/
    └── checks.sql                                # Documentation of the 8 automated verification assertions
```

---

## 2. Technology Stack & Technical Rationale

| Layer / Tool | Technology / Choice | Rationale & Why It Is Used |
| :--- | :--- | :--- |
| **Database Engine** | **MySQL 8.4 LTS** (`InnoDB`) | Industry standard relational database; supports strict `CHECK` constraints, window functions, generated columns, and ACID transactions. |
| **Character Set** | `utf8mb4` with `utf8mb4_0900_ai_ci` | Full Unicode support (emojis, international names, symbols) with accent-insensitive and case-insensitive collation. |
| **Authentication Strategy** | **Firebase Authentication** | **No passwords exist in the database.** Only `firebase_uid` (`VARCHAR(128) UNIQUE`) is stored. Security and credential management remain offloaded to Firebase. |
| **Migration Strategy** | **Plain SQL Files (001–013)** | Framework-agnostic. Decoupled from backend frameworks (FastAPI/SQLAlchemy or Node.js) so schemas can be applied by CI/CD, raw CLI, or container boot scripts. |
| **Containerization** | **Docker & Docker Compose** | Spins up identical, reproducible environments containing both MySQL 8.4 and Adminer Web GUI with single commands. |
| **Admin UI** | **Adminer (`adminer:latest`)** | Lightweight browser interface (listening on port 8080) for visual database management without needing desktop software. |
| **Scripting & Tooling** | **Python 3.11+** | Native cross-platform scripting for migration management, seeding, and verification without heavy external framework bloat. |
| **Driver / Libraries** | `PyMySQL==1.1.1`, `cryptography>=41.0.0`, `python-dotenv==1.0.1` | Pure-Python MySQL client; `cryptography` enables secure `caching_sha2_password` authentication used by MySQL 8+. |

---

## 3. Database Schema Overview (22 Tables)

The platform is designed as a **multi-vendor equipment rental marketplace** (customers rent gear across multiple vendors in a single checkout).

```
                 ┌──────────┐
                 │  users   │◄─────────────────────────────┐
                 └────┬─────┘                              │
                      │ 1:1                                │
                      ▼                                    │
                 ┌──────────┐                              │
                 │ vendors  │                              │
                 └────┬─────┘                              │
                      │ 1:N                                │
                      ▼                                    │
┌────────────┐   ┌───────────┐   ┌───────────────────┐     │
│ categories ├──►│ equipment ├──►│  equipment_images │     │
└────────────┘   └─────┬─────┘   └───────────────────┘     │
                       │ 1:N                               │
         ┌─────────────┼─────────────┐                     │
         ▼             ▼             ▼                     │
   ┌────────────┐┌───────────┐┌──────────────┐             │
   │availability││cart_items ││   wishlist   │             │
   └────────────┘└───────────┘└──────────────┘             │
                       │                                   │
                       ▼                                   │
               ┌───────────────┐                           │
               │   bookings    │ (Customer master order)   │
               └───────┬───────┘                           │
                       │ 1:N                               │
                       ▼                                   │
               ┌───────────────┐                           │
               │ vendor_orders │ (Split per vendor)        │
               └───────┬───────┘                           │
                       │ 1:N                               │
                       ▼                                   │
               ┌───────────────┐                           │
               │ booking_items │◄──────────────────────────┘
               └───────┬───────┘ (Item rental detail & review link)
         ┌─────────────┼───────────────┐
         ▼             ▼               ▼
   ┌───────────┐ ┌────────────┐ ┌──────────────┐
   │  reviews  │ │item_returns│ │damage_reports│
   └───────────┘ └────────────┘ └──────────────┘
```

### Table Categories

1. **Identity & Parties**:
   - `users`: Core profile (`role`: `'customer'`, `'vendor'`, `'admin'`). Identified by `firebase_uid`.
   - `vendors`: Vendor store details, commission rate, verification status, bank details.
   - `addresses`: Shipping/pickup/billing addresses for customers and vendors.

2. **Catalog & Inventory**:
   - `categories`: Hierarchical category tree using `parent_id REFERENCES categories(category_id)`.
   - `equipment`: Listed products, daily/weekly/monthly pricing, replacement value, security deposit, base stock count (`quantity`), `avg_rating`, and `review_count`.
   - `equipment_images`: Photos with `is_primary` flag and display sorting.
   - `availability`: Calendar blockouts for maintenance or offline reservations.

3. **Rental Lifecycle & Transactions**:
   - `coupons`: Percentage or flat-rate discounts with usage limits, date windows, and optional vendor restriction.
   - `bookings`: Master order placed by customer. Contains global dates, monetary totals, deposit, and `booking_status`.
   - `vendor_orders`: Sub-orders splitting the master booking per vendor (supports vendor-specific statuses and commission math).
   - `booking_items`: Concrete rented items, quantity, item-level pricing, and status (`'reserved'`, `'dispatched'`, `'returned'`, etc.).
   - `payments`: Records gateway transactions (Stripe, Razorpay, Cash), transaction IDs, and refund tracking.

4. **Fulfillment, Returns & Quality**:
   - `delivery_tracking`: Courier / self-delivery milestone timestamps and tracking numbers.
   - `item_returns`: Return intake inspection, condition check, and late fee tracking.
   - `damage_reports` & `damage_photos`: Incident logging, assessment fee, customer dispute, and security deposit deductions.
   - `reviews`: Star ratings (1–5) and comments. **Guarded by DB trigger to require item return**.

5. **Customer Experience & Operations**:
   - `cart_items`: Pre-checkout cart storing dates and equipment quantity.
   - `wishlist`: Saved gear.
   - `vendor_payouts`: Payout transfers to vendor accounts minus platform fee.
   - `notifications`: User alert feed (`'booking'`, `'payment'`, `'damage'`, `'system'`).
   - `chat_messages`: Communication between customer, vendor, and support.

---

## 4. Stored Logic: Functions, Triggers & Invariants

Located in [`migrations/013_functions_and_triggers.sql`](file:///d:/DBMS%20project/Rent4Fraction/database/migrations/013_functions_and_triggers.sql).

### Function: `get_available_quantity`
```sql
get_available_quantity(p_equipment_id, p_start_date, p_end_date) -> INT
```
- **Formula:** `Total Stock` - `Overlapping Active Booking Items` - `Overlapping Availability Blocks`.
- Discards returned or cancelled items.
- Returns `GREATEST(..., 0)`.

### Active Triggers (20 Triggers Across 9 Tables)

| Trigger Name | Target Table | Timing | Description / Business Rule |
| :--- | :--- | :--- | :--- |
| `trg_vendors_before_insert` | `vendors` | `BEFORE INSERT` | Ensures the referenced `user_id` has `role = 'vendor'`. |
| `trg_vendors_before_update` | `vendors` | `BEFORE UPDATE` | Rejects reassigning vendor profile to a non-vendor user. |
| `trg_users_before_update_role` | `users` | `BEFORE UPDATE` | Blocks changing `role` away from `'vendor'` if a `vendors` row still exists. |
| `trg_addresses_before_insert` | `addresses` | `BEFORE INSERT` | **Single Default Guard**: Rejects second default address for the user. |
| `trg_addresses_before_update` | `addresses` | `BEFORE UPDATE` | **Single Default Guard**: Enforces single default address per user on update. |
| `trg_equipment_images_before_insert` | `equipment_images` | `BEFORE INSERT` | **Single Primary Guard**: Rejects second primary image for equipment. |
| `trg_equipment_images_before_update` | `equipment_images` | `BEFORE UPDATE` | **Single Primary Guard**: Enforces single primary image per equipment on update. |
| `trg_bookings_before_insert` | `bookings` | `BEFORE INSERT` | **Address Ownership**: Verifies `address_id` belongs to `user_id`. |
| `trg_bookings_before_update` | `bookings` | `BEFORE UPDATE` | **Address Ownership**: Re-validates address ownership on update. |
| `trg_booking_items_before_insert` | `booking_items` | `BEFORE INSERT` | **Integrity & Overbooking**: Enforces matching `booking_id`, `vendor_id`, active equipment, approved vendor, min rental days, and stock capacity. |
| `trg_booking_items_before_update` | `booking_items` | `BEFORE UPDATE` | **Integrity & Overbooking**: Re-validates rules and checks available capacity accounting for previous item quantity. |
| `trg_return_items_before_insert` | `return_items` | `BEFORE INSERT` | **Return Item Guard**: Ensures booking_item belongs to return's vendor order and returned qty <= booked qty. |
| `trg_return_items_before_update` | `return_items` | `BEFORE UPDATE` | **Return Item Guard**: Enforces vendor order match and quantity limit on update. |
| `trg_reviews_before_insert` | `reviews` | `BEFORE INSERT` | **Review Integrity**: Verifies booking belongs to reviewer, item status is 'returned', and equipment/vendor IDs match. |
| `trg_reviews_before_update` | `reviews` | `BEFORE UPDATE` | **Review Integrity**: Re-validates all 4 review integrity rules on update. |
| `trg_reviews_after_insert` | `reviews` | `AFTER INSERT` | Recalculates and updates `avg_rating` and `review_count` on `equipment`. |
| `trg_reviews_after_update` | `reviews` | `AFTER UPDATE` | Syncs `avg_rating` and `review_count` on `equipment` (both old and new equipment if changed). |
| `trg_reviews_after_delete` | `reviews` | `AFTER DELETE` | Syncs `avg_rating` and decrements `review_count` on `equipment` if a review is removed. |
| `trg_payments_before_insert` | `payments` | `BEFORE INSERT` | **Refund Ceiling**: Ensures total refund amount cannot exceed total successful payments on booking. |
| `trg_payments_before_update` | `payments` | `BEFORE UPDATE` | **Refund Ceiling**: Enforces refund ceiling on payment updates. |

> **Concurrency Note:** While the overbooking trigger is an automated safety net, the FastAPI backend must use `SELECT ... FOR UPDATE` on `equipment` inside the booking transaction to serialize concurrent checkouts.

---

## 5. Tooling Scripts Reference

All operational tasks are managed via scripts in [`scripts/`](file:///d:/DBMS%20project/Rent4Fraction/database/scripts/):

### 1. `migrate.py` (Migration Engine)
- **Commands:**
  - `python scripts/migrate.py up`: Applies all unapplied migration files in chronological order.
  - `python scripts/migrate.py status`: Shows applied and pending migrations.
  - `python scripts/migrate.py reset --yes`: Drops database, recreates it with `utf8mb4`, grants user permissions, and re-runs all migrations (local environment only).
- **Custom Splitter Feature:** Ordinary DDL splits on `;`. Complex stored programs (triggers & functions) use `-- //` as statement boundaries, avoiding MySQL `DELIMITER` client incompatibility.

### 2. `seed.py` (Database Seeder)
- Executes files in [`seeds/`](file:///d:/DBMS%20project/Rent4Fraction/database/seeds/) in sequence (001 to 004).
- Uses `WHERE NOT EXISTS` and `ON DUPLICATE KEY UPDATE` to ensure safe, idempotent re-runs covering all 22 tables.

### 3. `run_checks.py` (Integrity Verification Suite)
Runs automated integration checks against the database inside isolated transactions that are immediately rolled back:
- Tests `get_available_quantity()` calculations and boundary conditions.
- Tests overbooking rejection on both INSERT and UPDATE.
- Tests review ownership, status, and ID mismatch guards.
- Tests vendor role and demotion prevention guards.
- Tests single-default address and single-primary image guards.
- Tests booking address ownership and min rental days validation.
- Tests refund ceiling triggers and financial arithmetic CHECK constraints.
- Tests view execution ensuring zero Cartesian join multiplication.
- Optional `--sql` flag to run `tests/checks.sql` directly without requiring MySQL CLI.

---

## 6. How to Explain or Query This Setup

If you or another AI assistant need to work with this database:

- **To understand table columns & keys:** Reference [`docs/schema.md`](file:///d:/DBMS%20project/Rent4Fraction/database/docs/schema.md).
- **To view entity relationships & foreign keys:** Inspect the Mermaid diagram in [`docs/erd.mmd`](file:///d:/DBMS%20project/Rent4Fraction/database/docs/erd.mmd).
- **To inspect business rules & validation logic:** Review [`migrations/013_functions_and_triggers.sql`](file:///d:/DBMS%20project/Rent4Fraction/database/migrations/013_functions_and_triggers.sql).
- **To test or replicate bugs:** Inspect the test test cases inside [`scripts/run_checks.py`](file:///d:/DBMS%20project/Rent4Fraction/database/scripts/run_checks.py) and [`tests/checks.sql`](file:///d:/DBMS%20project/Rent4Fraction/database/tests/checks.sql).
