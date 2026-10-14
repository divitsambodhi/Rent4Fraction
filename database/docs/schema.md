# Database Schema Reference — Event Equipment Rental Platform

MySQL 8.4 · InnoDB · utf8mb4 · utf8mb4_0900_ai_ci
22 tables · BIGINT UNSIGNED PKs · DECIMAL(12,2) money

---

## Table Index

| # | Table | Purpose |
|---|-------|---------|
| 1 | `users` | All authenticated users (customers, vendors, admins) |
| 2 | `vendors` | Vendor business profiles linked 1-to-1 to a `vendor`-role user |
| 3 | `addresses` | Saved delivery addresses per user |
| 4 | `categories` | Self-referencing category tree (Sound > Speakers, etc.) |
| 5 | `equipment` | Rentable items listed by vendors |
| 6 | `equipment_images` | Images per equipment item |
| 7 | `availability` | Vendor-defined blocked date ranges |
| 8 | `coupons` | Discount coupon codes |
| 9 | `bookings` | Customer booking header |
| 10 | `vendor_orders` | Per-vendor sub-order within a booking |
| 11 | `booking_items` | Individual line items |
| 12 | `payments` | Payment and refund transactions |
| 13 | `deliveries` | Delivery / pickup records per vendor_order |
| 14 | `returns` | Return header per vendor_order |
| 15 | `return_items` | Per-item return condition |
| 16 | `damage_reports` | Damage claim per return_item |
| 17 | `reviews` | Customer review per booking_item |
| 18 | `cart_items` | Shopping cart |
| 19 | `wishlist` | Wishlist (composite PK) |
| 20 | `payouts` | Vendor payout per completed vendor_order |
| 21 | `notifications` | In-app notifications |
| 22 | `messages` | Direct messages between users |

---

## 1. users

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| firebase_uid | VARCHAR(128) | UNIQUE, NOT NULL |
| name | VARCHAR(255) | NOT NULL |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| phone | VARCHAR(20) | nullable |
| role | ENUM('customer','vendor','admin') | NOT NULL DEFAULT 'customer' |
| is_active | TINYINT(1) | NOT NULL DEFAULT 1 |
| email_verified | TINYINT(1) | NOT NULL DEFAULT 0 |
| last_login | DATETIME | nullable |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE |

**Notes:** No password column — Firebase Auth is the identity provider.
Changing `role` away from `vendor` is blocked by a trigger while a `vendors` row exists.

---

## 2. vendors

| Column | Type | Constraints |
|--------|------|-------------|
| vendor_id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| user_id | BIGINT UNSIGNED | FK → users, UNIQUE, RESTRICT |
| business_name | VARCHAR(255) | NOT NULL |
| description | TEXT | |
| address | TEXT | |
| phone | VARCHAR(20) | |
| logo_url | VARCHAR(500) | |
| gst_number | VARCHAR(20) | |
| approval_status | ENUM('pending','approved','rejected','suspended') | DEFAULT 'pending' |
| rejection_reason | TEXT | |
| approved_by | BIGINT UNSIGNED | FK → users, nullable, SET NULL |
| approved_at | DATETIME | |
| commission_rate | DECIMAL(5,2) | DEFAULT 10.00 |
| created_at / updated_at | DATETIME | |

**Trigger:** INSERT blocked if `users.role != 'vendor'`.

---

## 3. addresses

| Column | Type | Notes |
|--------|------|-------|
| address_id | BIGINT UNSIGNED PK | |
| user_id | BIGINT UNSIGNED FK → users CASCADE | |
| label | VARCHAR(100) | e.g. Home, Office |
| line1, line2 | VARCHAR(255) | |
| city, state, pincode | VARCHAR | |
| country | VARCHAR(100) | DEFAULT 'India' |
| is_default | TINYINT(1) | |
| created_at | DATETIME | |

---

## 4. categories

Self-referencing tree. `UNIQUE(parent_id, name)` prevents duplicate sibling names.

| Column | Type | Notes |
|--------|------|-------|
| category_id | BIGINT UNSIGNED PK | |
| name | VARCHAR(100) NOT NULL | |
| description | TEXT | |
| parent_id | BIGINT UNSIGNED FK → categories SET NULL | NULL = top-level |
| is_active | TINYINT(1) DEFAULT 1 | |

---

## 5. equipment

| Column | Type | Notes |
|--------|------|-------|
| equipment_id | BIGINT UNSIGNED PK | |
| vendor_id | BIGINT UNSIGNED FK → vendors RESTRICT | |
| category_id | BIGINT UNSIGNED FK → categories RESTRICT | |
| name | VARCHAR(255) NOT NULL | |
| description | TEXT | |
| price_per_day | DECIMAL(12,2) NOT NULL | |
| security_deposit | DECIMAL(12,2) DEFAULT 0 | |
| quantity | INT CHECK(>=0) | |
| min_rental_days | INT DEFAULT 1 | |
| delivery_available | TINYINT(1) DEFAULT 1 | |
| specifications | JSON | Flexible key-value specs |
| avg_rating | DECIMAL(3,2) DEFAULT 0 | Maintained by triggers |
| review_count | INT UNSIGNED DEFAULT 0 | Maintained by triggers |
| status | ENUM('active','inactive','out_of_stock','archived') | |
| created_at / updated_at | DATETIME | |

---

## 6. equipment_images

| Column | Type | Notes |
|--------|------|-------|
| image_id | BIGINT UNSIGNED PK | |
| equipment_id | BIGINT UNSIGNED FK → equipment CASCADE | |
| url | VARCHAR(500) | |
| is_primary | TINYINT(1) | 1 = main listing image |
| sort_order | INT | |

---

## 7. availability

Vendor-managed blocked date ranges (maintenance, manual blocks, etc.).

| Column | Type | Notes |
|--------|------|-------|
| availability_id | BIGINT UNSIGNED PK | |
| equipment_id | BIGINT UNSIGNED FK → equipment CASCADE | |
| start_date | DATE NOT NULL | |
| end_date | DATE NOT NULL | CHECK(end_date >= start_date) |
| quantity_blocked | INT DEFAULT 1 | |
| reason | ENUM('maintenance','vendor_blocked','booked') | |
| status | ENUM('active','inactive') DEFAULT 'active' | |

---

## 8. coupons

| Column | Type | Notes |
|--------|------|-------|
| coupon_id | BIGINT UNSIGNED PK | |
| code | VARCHAR(50) UNIQUE | |
| type | ENUM('percent','flat') | |
| value | DECIMAL(12,2) | |
| min_order_amount | DECIMAL(12,2) | |
| valid_from / valid_to | DATETIME | |
| usage_limit | INT UNSIGNED nullable | NULL = unlimited |
| used_count | INT UNSIGNED DEFAULT 0 | |
| is_active | TINYINT(1) DEFAULT 1 | |

---

## 9. bookings

| Column | Type | Notes |
|--------|------|-------|
| booking_id | BIGINT UNSIGNED PK | |
| user_id | BIGINT UNSIGNED FK → users RESTRICT | |
| address_id | BIGINT UNSIGNED FK → addresses RESTRICT | |
| booking_date | DATETIME DEFAULT NOW | |
| start_date / end_date | DATE | CHECK(end >= start) |
| event_name, event_type, event_date | VARCHAR/DATE | |
| venue_address | TEXT | |
| subtotal | DECIMAL(12,2) | |
| discount | DECIMAL(12,2) DEFAULT 0 | |
| coupon_id | BIGINT UNSIGNED FK → coupons SET NULL nullable | |
| tax / delivery_fee / security_deposit | DECIMAL(12,2) | |
| total_amount | DECIMAL(12,2) | CHECK: = subtotal − discount + tax + delivery_fee + security_deposit |
| payment_status | ENUM('unpaid','partial','paid','refunded') | |
| status | ENUM('pending','confirmed','in_progress','completed','cancelled') | |
| notes | TEXT | |
| created_at / updated_at | DATETIME | |

---

## 10. vendor_orders

One row per vendor within a booking. `UNIQUE(booking_id, vendor_id)`.

| Column | Type | Notes |
|--------|------|-------|
| vendor_order_id | BIGINT UNSIGNED PK | |
| booking_id | BIGINT UNSIGNED FK → bookings CASCADE | |
| vendor_id | BIGINT UNSIGNED FK → vendors RESTRICT | |
| subtotal | DECIMAL(12,2) | |
| status | ENUM('pending','accepted','rejected','dispatched','delivered','returned','completed','cancelled') | |
| rejection_reason | TEXT | |
| created_at / updated_at | DATETIME | |

---

## 11. booking_items

| Column | Type | Notes |
|--------|------|-------|
| booking_item_id | BIGINT UNSIGNED PK | |
| vendor_order_id | BIGINT UNSIGNED FK → vendor_orders RESTRICT | |
| booking_id | BIGINT UNSIGNED FK → bookings RESTRICT | |
| vendor_id | BIGINT UNSIGNED FK → vendors RESTRICT | |
| equipment_id | BIGINT UNSIGNED FK → equipment RESTRICT | |
| quantity | INT CHECK(>0) | |
| price_per_day | DECIMAL(12,2) | Snapshot at booking time |
| days | INT | |
| total_price | DECIMAL(12,2) | |
| item_status | ENUM('pending','confirmed','delivered','returned','cancelled') | |

**Trigger:** BEFORE INSERT checks `get_available_quantity()` — rejects if `quantity > available`.

---

## 12. payments

| Column | Type | Notes |
|--------|------|-------|
| payment_id | BIGINT UNSIGNED PK | |
| booking_id | BIGINT UNSIGNED FK → bookings RESTRICT | |
| amount | DECIMAL(12,2) | |
| type | ENUM('advance','full','deposit','refund','deposit_refund') | |
| method | ENUM('upi','card','netbanking','cod','wallet') | |
| gateway | VARCHAR(100) | |
| currency | VARCHAR(10) DEFAULT 'INR' | |
| transaction_id | VARCHAR(255) UNIQUE nullable | |
| status | ENUM('pending','success','failed','refunded') | |
| refund_reference | VARCHAR(255) | |
| payment_date | DATETIME | |
| created_at | DATETIME | |

---

## 13. deliveries

One row per `vendor_order`. `UNIQUE(vendor_order_id)`.

| Column | Type | Notes |
|--------|------|-------|
| delivery_id | BIGINT UNSIGNED PK | |
| vendor_order_id | BIGINT UNSIGNED FK → vendor_orders RESTRICT | |
| type | ENUM('delivery','pickup') | |
| scheduled_start / scheduled_end | DATETIME | |
| delivery_date | DATETIME | |
| status | ENUM('scheduled','out_for_delivery','delivered','failed') | |
| tracking_info, delivered_by, proof_url | TEXT/VARCHAR | |

---

## 14. returns

One row per `vendor_order`. `UNIQUE(vendor_order_id)`.

| Column | Type |
|--------|------|
| return_id | BIGINT UNSIGNED PK |
| vendor_order_id | FK → vendor_orders RESTRICT |
| return_date | DATE |
| status | ENUM('scheduled','returned','late','incomplete') |

---

## 15. return_items

| Column | Type | Notes |
|--------|------|-------|
| return_item_id | BIGINT UNSIGNED PK | |
| return_id | BIGINT UNSIGNED FK → returns CASCADE | |
| booking_item_id | BIGINT UNSIGNED FK → booking_items RESTRICT | |
| quantity_returned | INT | |
| condition | ENUM('good','minor_damage','major_damage','lost') | |

---

## 16. damage_reports

One report per `return_item`. `UNIQUE(return_item_id)`.

| Column | Type |
|--------|------|
| report_id | BIGINT UNSIGNED PK |
| return_item_id | FK → return_items RESTRICT |
| description | TEXT NOT NULL |
| damage_cost | DECIMAL(12,2) |
| deducted_from_deposit | TINYINT(1) |
| status | ENUM('reported','disputed','resolved') |
| images_notes | TEXT |
| resolved_by | FK → users SET NULL nullable |
| created_at | DATETIME |

---

## 17. reviews

One review per `booking_item`. `UNIQUE(booking_item_id)`.

| Column | Type | Notes |
|--------|------|-------|
| review_id | BIGINT UNSIGNED PK | |
| user_id | FK → users RESTRICT | |
| booking_item_id | FK → booking_items RESTRICT | |
| equipment_id | FK → equipment RESTRICT | |
| vendor_id | FK → vendors RESTRICT | |
| rating | TINYINT CHECK(1..5) | |
| comment, vendor_reply | TEXT | |
| review_date | DATETIME | |

**Triggers:** BEFORE INSERT validates `item_status='returned'` and user ownership.
AFTER INSERT/UPDATE/DELETE sync `equipment.avg_rating` and `review_count`.

---

## 18. cart_items

`UNIQUE(user_id, equipment_id, start_date, end_date)`.

| Column | Type |
|--------|------|
| cart_item_id | BIGINT UNSIGNED PK |
| user_id | FK → users CASCADE |
| equipment_id | FK → equipment CASCADE |
| quantity | INT DEFAULT 1 |
| start_date / end_date | DATE |

---

## 19. wishlist

Composite PK `(user_id, equipment_id)`.

| Column | Type |
|--------|------|
| user_id | FK → users CASCADE |
| equipment_id | FK → equipment CASCADE |
| created_at | DATETIME |

---

## 20. payouts

One payout per `vendor_order`. `UNIQUE(vendor_order_id)`.

| Column | Type |
|--------|------|
| payout_id | BIGINT UNSIGNED PK |
| vendor_id | FK → vendors RESTRICT |
| vendor_order_id | FK → vendor_orders RESTRICT |
| gross_amount / commission_amount / net_amount | DECIMAL(12,2) |
| status | ENUM('pending','processing','paid') |
| paid_at | DATETIME |

---

## 21. notifications

| Column | Type |
|--------|------|
| notification_id | BIGINT UNSIGNED PK |
| user_id | FK → users CASCADE |
| type | VARCHAR(100) |
| title | VARCHAR(255) |
| message | TEXT |
| is_read | TINYINT(1) DEFAULT 0 |
| created_at | DATETIME |

---

## 22. messages

| Column | Type | Notes |
|--------|------|-------|
| message_id | BIGINT UNSIGNED PK | |
| sender_id | FK → users RESTRICT | |
| receiver_id | FK → users RESTRICT | |
| equipment_id | FK → equipment SET NULL nullable | |
| body | TEXT | |
| is_read | TINYINT(1) | |
| created_at | DATETIME | |

---

## Stored Function

### `get_available_quantity(equipment_id, start_date, end_date) → INT`

Returns `equipment.quantity − SUM(committed booking_item quantities) − SUM(availability blocks)` for the given date range. Rows with `item_status IN ('cancelled','returned')` and `availability.status = 'inactive'` are excluded. Returns at minimum 0.

---

## Triggers (migration 013)

| Trigger | Table | Event | Effect |
|---------|-------|-------|--------|
| `trg_vendors_before_insert` | vendors | BEFORE INSERT | Rejects if `users.role != 'vendor'` |
| `trg_users_before_update_role` | users | BEFORE UPDATE | Rejects role change away from `vendor` while a vendors row exists |
| `trg_reviews_before_insert` | reviews | BEFORE INSERT | Rejects if item not returned or wrong user |
| `trg_reviews_after_insert` | reviews | AFTER INSERT | Syncs `equipment.avg_rating` and `review_count` |
| `trg_reviews_after_update` | reviews | AFTER UPDATE | Syncs `equipment.avg_rating` and `review_count` |
| `trg_reviews_after_delete` | reviews | AFTER DELETE | Syncs `equipment.avg_rating` and `review_count` |
| `trg_booking_items_before_insert` | booking_items | BEFORE INSERT | Calls `get_available_quantity()`; rejects if overbooked |

---

## Views (migration 012)

| View | Description |
|------|-------------|
| `v_vendor_dashboard` | Per-vendor counts of orders, equipment, earnings, avg rating |
| `v_vendor_incoming_orders` | vendor_orders joined with booking, customer, items |
| `v_customer_bookings` | Bookings with vendor order / delivery / payment summary |
| `v_equipment_listing` | Active equipment with primary image, category path, vendor |
