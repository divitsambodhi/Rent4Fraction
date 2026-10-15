# Database Static Review & Audit Report

## Verdict: STATICALLY READY

> **IMPORTANT NOTICE:**  
> This evaluation is the result of an exhaustive **static review and mental execution** of all 13 migrations, 4 seed files, 3 Python scripts, and test files against MySQL 8.4 syntax, InnoDB constraints, and strict SQL rules. **Nothing was executed in Docker, MySQL, or the terminal during this review**, in strict accordance with the project instructions.

All critical, high, and medium issues identified across the schema, migrations, triggers, views, seeds, and scripts have been **fixed directly in-place**. The database schema is statically verified, mathematically sound, and ready for FastAPI backend and React frontend code generation.

---

## 1. Findings & Actions Table

| ID | Severity | Area | Issue Description | Fix Applied | Status |
|:---|:---:|:---|:---|:---|:---:|
| **F-01** | **CRITICAL** | MySQL 8.4 Syntax | Column name `condition` in `return_items` is a MySQL reserved word. | Renamed to `item_condition` in migration `008`, seed `004`, `schema.md`, `erd.mmd`, `checks.sql`, and `run_checks.py`. | **FIXED** |
| **F-02** | **CRITICAL** | MySQL 8.4 Syntax | `CREATE INDEX IF NOT EXISTS` syntax used in migration `012` is not supported in MySQL 8.4 (throws syntax error 1064). | Removed `IF NOT EXISTS` and used standard `CREATE INDEX` in `012_indexes_and_views.sql`. | **FIXED** |
| **F-03** | **HIGH** | Views / Queries | `v_vendor_dashboard` performed multi-table joins on `equipment`, `vendor_orders`, and `reviews` simultaneously, causing a Cartesian product explosion that multiplied `total_earnings` and corrupted `avg_rating`. | Rewrote `v_vendor_dashboard` in `012` using isolated derived table aggregations before joining vendors. | **FIXED** |
| **F-04** | **HIGH** | Views / Queries | `v_customer_bookings` used `MAX(d.status)` and `MAX(pay.status)` on ENUM columns, which compares strings alphabetically rather than chronological progression (e.g. `'scheduled' > 'delivered'`). | Replaced with correlated subqueries ordering by descending ID/timestamp to retrieve the true latest status. | **FIXED** |
| **F-05** | **HIGH** | Referential Integrity | `vendor_orders` had `ON DELETE CASCADE` from `bookings`, risking accidental cascading deletion of vendor orders, deliveries, returns, and payout history. | Changed `fk_vendor_orders_booking_id` to `ON DELETE RESTRICT` in `006_bookings_vendor_orders_items.sql`. | **FIXED** |
| **F-06** | **HIGH** | Data Integrity | `booking_items.booking_id` could diverge from its parent `vendor_orders.booking_id`. | Added cross-table integrity validation in `trg_booking_items_before_insert` and `trg_booking_items_before_update`. | **FIXED** |
| **F-07** | **HIGH** | Data Integrity | `booking_items.vendor_id` was not verified against `vendor_orders.vendor_id` and `equipment.vendor_id`. | Added equality assertion trigger in `trg_booking_items_before_insert` and `trg_booking_items_before_update`. | **FIXED** |
| **F-08** | **HIGH** | Data Integrity | Inactive equipment or equipment belonging to unapproved vendors could be booked. | Added status checks (`equipment.status = 'active'`, `vendors.approval_status = 'approved'`) in booking items triggers. | **FIXED** |
| **F-09** | **HIGH** | Data Integrity | Booking duration could violate equipment `min_rental_days`. | Added rental duration validation (`DATEDIFF(end, start) + 1 >= min_rental_days`) in booking items triggers. | **FIXED** |
| **F-10** | **HIGH** | Data Integrity | Customers could book equipment using a delivery address belonging to a different user. | Added ownership verification triggers `trg_bookings_before_insert` and `trg_bookings_before_update`. | **FIXED** |
| **F-11** | **HIGH** | Data Integrity | Multiple default addresses (`is_default = 1`) could be created for a single user. | Added single-default address guard triggers on `addresses` (insert & update). | **FIXED** |
| **F-12** | **HIGH** | Data Integrity | Multiple primary images (`is_primary = 1`) could be assigned to a single equipment. | Added single-primary image guard triggers on `equipment_images` (insert & update). | **FIXED** |
| **F-13** | **HIGH** | Data Integrity | `return_items.booking_item_id` was not verified to belong to the return's vendor order, and returned quantity could exceed booked quantity. | Added validation triggers `trg_return_items_before_insert` and `trg_return_items_before_update`. | **FIXED** |
| **F-14** | **HIGH** | Data Integrity | `reviews` did not check that `equipment_id` and `vendor_id` matched the `booking_item_id` being reviewed, and only validated on insert (not update). | Enhanced `trg_reviews_before_insert` and added `trg_reviews_before_update` with complete 4-point verification. | **FIXED** |
| **F-15** | **HIGH** | Data Integrity | Payments table lacked check for positive amounts, and refund amounts could exceed total successful payments on a booking. | Added `chk_payments_amount CHECK (amount > 0)` and triggers `trg_payments_before_insert/update` to enforce refund ceilings. | **FIXED** |
| **F-16** | **HIGH** | Overbooking Logic | Overbooking guard was only implemented on `BEFORE INSERT` and omitted `BEFORE UPDATE`, and `get_available_quantity()` counted items from cancelled bookings or rejected vendor orders. | Added `trg_booking_items_before_update` with stock reconciliation and refined `get_available_quantity()` in `013`. | **FIXED** |
| **F-17** | **HIGH** | Seeds Coverage | Seed files omitted records for `availability`, `cart_items`, `wishlist`, `payouts`, `notifications`, and `messages` (leaving 6 of 22 tables empty). | Added complete, idempotent seed records for all remaining tables in `004_sample_bookings.sql`. | **FIXED** |
| **F-18** | **MEDIUM** | Seeds Idempotency | Top-level categories in `002_categories.sql` had `parent_id = NULL`. In MySQL, `UNIQUE(parent_id, name)` permits duplicate NULLs, causing duplicate inserts on re-running seed.py. | Replaced `ON DUPLICATE KEY UPDATE` with `WHERE NOT EXISTS` for top-level categories. | **FIXED** |
| **F-19** | **MEDIUM** | Query Performance | Search queries by equipment name and description lacked a FULLTEXT index. | Added `FULLTEXT INDEX ft_equipment_name_desc (name, description)` in `003_categories_equipment.sql`. | **FIXED** |
| **F-20** | **MEDIUM** | Query Performance | Message thread queries between two users and unread notification queries lacked optimal composite indexes. | Added composite indexes `idx_messages_sender_receiver`, `idx_messages_receiver_sender`, and `idx_notifications_user_unread` in `011`. | **FIXED** |
| **F-21** | **MEDIUM** | Tooling / Script | `migrate.py reset` failed if database did not exist yet because `wait_for_mysql()` required the database to exist before dropping it; and MySQL 8 `GRANT` failed if user did not exist. | Updated `wait_for_mysql()` to check root connectivity for reset, and added `CREATE USER IF NOT EXISTS` before `GRANT`. | **FIXED** |
| **F-22** | **MEDIUM** | Configuration | `docker-compose.yml` did not explicitly enforce UTC (`--default-time-zone=+00:00`) or strict `sql-mode`. | Added explicit timezone and strict SQL mode arguments to `docker-compose.yml`, and added `init_command="SET time_zone = '+00:00'"` in PyMySQL scripts. | **FIXED** |
| **F-23** | **LOW** | Schema Constraints | Missing non-negative and logical CHECK constraints on monetary and quantity fields across tables (`coupons`, `equipment`, `bookings`, `vendor_orders`, `booking_items`, `payouts`, `cart_items`). | Added explicit named CHECK constraints to migrations `001`, `003`, `004`, `005`, `006`, `008`, `010`, `011`. | **FIXED** |

---

## 2. Decisions Needed From You

**None.**  
All fixes strictly adhered to the pre-approved scope and business rules established in the project context. The only column rename performed was the reserved word `return_items.condition` → `return_items.item_condition`, which was pre-approved.

---

## 3. First-Run Checklist (When You First Run MySQL)

When you are ready to start the database environment for the first time, follow these exact steps:

### Execution Steps
1. **Prepare Environment File:**
   ```powershell
   Copy-Item database\.env.example database\.env
   ```
   Verify passwords in `database\.env`. If port `3306` is already occupied on your Windows system, change `MYSQL_PORT=3307` in `database\.env` and `database\docker-compose.yml`.

2. **Start MySQL Server:**
   - **With Docker:** Run `docker compose -f database/docker-compose.yml up -d`
   - **Without Docker:** Follow "Option B: Run without Docker" in `README.md` to start MySQL Community Server 8.4 on Windows.

3. **Install Python Tooling:**
   ```powershell
   python -m pip install -r database\requirements.txt
   ```

4. **Run Migrations:**
   ```powershell
   python database\scripts\migrate.py up
   ```
   *Expected output:* `Applied 13 migration(s).`

5. **Apply Seed Data:**
   ```powershell
   python database\scripts\seed.py
   ```
   *Expected output:* `All seeds applied.`

6. **Run Verification Suite:**
   ```powershell
   python database\scripts\run_checks.py
   ```
   *Expected output:* `Results: 19/19 passed, 0 failed`

---

### Top 5 Potential First-Run Issues & Quick Fixes

1. **Port Conflict (`bind: address already in use` or Port 3306 Error):**
   - *Cause:* A previously installed MySQL, MariaDB, or XAMPP service is already listening on Windows port 3306.
   - *Fix:* In `database/.env`, change `MYSQL_PORT=3307`. In `docker-compose.yml`, ports will automatically map to `3307:3306`. Update `DATABASE_URL` in `/server/.env` to port `3307`.

2. **Access Denied for User `rental_user`@'localhost':**
   - *Cause:* Connecting from localhost via Python PyMySQL on Windows may match `'rental_user'@'localhost'` instead of `'rental_user'@'%'`.
   - *Fix:* Our updated `migrate.py reset` grants privileges to both `'rental_user'@'%'` and `'rental_user'@'localhost'`. If running standalone, execute the grant statements listed in `README.md` § Option B.

3. **Docker Engine Not Running:**
   - *Cause:* Running docker compose before Docker Desktop is fully started.
   - *Fix:* Launch Docker Desktop and wait until the whale icon in the Windows taskbar shows "Engine running". Alternatively, use Option B (Standalone Windows MySQL Installer) which does not require Docker.

4. **PyMySQL `cryptography` Authentication Plugin Error:**
   - *Cause:* MySQL 8.4 uses `caching_sha2_password` by default. Connecting requires the Python `cryptography` package.
   - *Fix:* `cryptography>=41.0.0` is already included in `database/requirements.txt`. Ensure `pip install -r database/requirements.txt` was executed.

5. **Stored Function Binary Log Error (Error 1418):**
   - *Cause:* Stored function `get_available_quantity()` created while binary logging is active.
   - *Fix:* Already resolved in code. The function explicitly declares `READS SQL DATA NOT DETERMINISTIC`, and `docker-compose.yml` passes `--log-bin-trust-function-creators=1`.

---

## 4. Known Limitations & Recommended Future Improvements

1. **Calendar Date Overlap Granularity:**
   - `get_available_quantity()` uses interval intersection `(start_a <= end_b AND end_a >= start_b)`. If multiple non-contiguous availability blocks exist within the requested window, summing blocked quantities assumes worst-case overlap. This is standard for event equipment rentals where equipment must remain available for the duration. If fine-grained, day-by-day partial inventory scheduling is needed in future, a dedicated daily calendar table can be added.
2. **Dynamic Tax & Coupon Calculation:**
   - In accordance with the data contract, `bookings.tax` and `bookings.discount` formulas are validated by MySQL CHECK constraints for arithmetic consistency, but the calculation of tax percentages (e.g. GST 18%) and coupon rules (minimum order amounts, expiry) must be performed by FastAPI before inserting the row.
3. **Optimistic vs Pessimistic Concurrency:**
   - The trigger `trg_booking_items_before_insert` acts as an absolute safety net. As documented in `README.md` and `data-contract.md`, the FastAPI backend booking transaction must execute `SELECT equipment_id, quantity FROM equipment WHERE equipment_id = :id FOR UPDATE` before calling `get_available_quantity()` to prevent race conditions during high concurrent traffic.
