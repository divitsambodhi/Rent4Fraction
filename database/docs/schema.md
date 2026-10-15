# Database Schema Reference — Event Equipment Rental Platform

MySQL 8.4 · InnoDB · utf8mb4 · utf8mb4_0900_ai_ci  
22 tables · BIGINT UNSIGNED PKs · DECIMAL(12,2) money · Strict SQL mode · UTC (+00:00)

---

## Table Index

| # | Table | Purpose |
|---|-------|---------|
| 1 | `users` | All authenticated users (customers, vendors, admins) |
| 2 | `vendors` | Vendor business profiles linked 1-to-1 to a `vendor`-role user |
| 3 | `addresses` | Saved delivery addresses per user |
| 4 | `categories` | Self-referencing category tree (Sound > Speakers, etc.) |
| 5 | `equipment` | Rentable items listed by vendors |
| 6 | `equipment_images` | Images per equipment item (single primary image enforced) |
| 7 | `availability` | Vendor-defined blocked date ranges |
| 8 | `coupons` | Discount coupon codes |
| 9 | `bookings` | Customer booking header |
| 10 | `vendor_orders` | Per-vendor sub-order within a booking |
| 11 | `booking_items` | Individual line items |
| 12 | `payments` | Payment and refund transactions |
| 13 | `deliveries` | Delivery / pickup records per vendor_order |
| 14 | `returns` | Return header per vendor_order |
| 15 | `return_items` | Per-item return condition (`item_condition`) |
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
Changing `role` away from `vendor` is blocked by trigger `trg_users_before_update_role` while a `vendors` row exists.

---

## 2. vendors

| Column | Type | Constraints |
|--------|------|-------------|
| vendor_id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| user_id | BIGINT UNSIGNED | FK → users (ON DELETE RESTRICT), UNIQUE, NOT NULL |
| business_name | VARCHAR(255) | NOT NULL |
| description | TEXT | nullable |
| address | TEXT | nullable |
| phone | VARCHAR(20) | nullable |
| logo_url | VARCHAR(500) | nullable |
| gst_number | VARCHAR(20) | nullable |
| approval_status | ENUM('pending','approved','rejected','suspended') | NOT NULL DEFAULT 'pending' |
| rejection_reason | TEXT | nullable |
| approved_by | BIGINT UNSIGNED | FK → users (ON DELETE SET NULL), nullable |
| approved_at | DATETIME | nullable |
| commission_rate | DECIMAL(5,2) | NOT NULL DEFAULT 10.00, CHECK (0.00..100.00) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE |

**Triggers:**  
- `trg_vendors_before_insert`: Rejects if `users.role != 'vendor'`.  
- `trg_vendors_before_update`: Rejects reassignment if target `users.role != 'vendor'`.

---

## 3. addresses

| Column | Type | Notes |
|--------|------|-------|
| address_id | BIGINT UNSIGNED PK | AUTO_INCREMENT |
| user_id | BIGINT UNSIGNED | FK → users (ON DELETE CASCADE), NOT NULL |
| label | VARCHAR(100) | e.g. Home, Office |
| line1, line2 | VARCHAR(255) | line1 NOT NULL |
| city, state, pincode | VARCHAR | NOT NULL |
| country | VARCHAR(100) | NOT NULL DEFAULT 'India' |
| is_default | TINYINT(1) | NOT NULL DEFAULT 0 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**Triggers:**  
- `trg_addresses_before_insert` & `trg_addresses_before_update`: Enforces at most one default address (`is_default = 1`) per user.

---

## 4. categories

Self-referencing tree. `UNIQUE(parent_id, name)` prevents duplicate sibling names.

| Column | Type | Notes |
|--------|------|-------|
| category_id | BIGINT UNSIGNED PK | AUTO_INCREMENT |
| name | VARCHAR(100) NOT NULL | |
| description | TEXT | nullable |
| parent_id | BIGINT UNSIGNED | FK → categories (ON DELETE SET NULL), nullable |
| is_active | TINYINT(1) | NOT NULL DEFAULT 1 |

---

## 5. equipment

| Column | Type | Notes |
|--------|------|-------|
| equipment_id | BIGINT UNSIGNED PK | AUTO_INCREMENT |
| vendor_id | BIGINT UNSIGNED | FK → vendors (ON DELETE RESTRICT), NOT NULL |
| category_id | BIGINT UNSIGNED | FK → categories (ON DELETE RESTRICT), NOT NULL |
| name | VARCHAR(255) NOT NULL | |
| description | TEXT | nullable |
| price_per_day | DECIMAL(12,2) | NOT NULL, CHECK (price_per_day >= 0.00) |
| security_deposit | DECIMAL(12,2) | NOT NULL DEFAULT 0.00, CHECK (security_deposit >= 0.00) |
| quantity | INT | NOT NULL DEFAULT 1, CHECK (quantity >= 0) |
| min_rental_days | INT | NOT NULL DEFAULT 1, CHECK (min_rental_days >= 1) |
| delivery_available | TINYINT(1) | NOT NULL DEFAULT 1 |
| specifications | JSON | Flexible key-value specs |
| avg_rating | DECIMAL(3,2) | NOT NULL DEFAULT 0.00, maintained by triggers |
| review_count | INT UNSIGNED | NOT NULL DEFAULT 0, maintained by triggers |
| status | ENUM('active','inactive','out_of_stock','archived') | NOT NULL DEFAULT 'active' |
| created_at / updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**Indexes:** `idx_equipment_vendor_id`, `idx_equipment_category_id`, `idx_equipment_status`, `idx_equipment_vendor_status`, `idx_equipment_price`, `idx_equipment_avg_rating`, `FULLTEXT INDEX ft_equipment_name_desc (name, description)`.

---

## 6. equipment_images

| Column | Type | Notes |
|--------|------|-------|
| image_id | BIGINT UNSIGNED PK | AUTO_INCREMENT |
| equipment_id | BIGINT UNSIGNED | FK → equipment (ON DELETE CASCADE), NOT NULL |
| url | VARCHAR(500) | NOT NULL |
| is_primary | TINYINT(1) | NOT NULL DEFAULT 0 |
| sort_order | INT | NOT NULL DEFAULT 0 |

**Triggers:**  
- `trg_equipment_images_before_insert` & `trg_equipment_images_before_update`: Enforces at most one primary image (`is_primary = 1`) per equipment.

---

## 7. availability

Vendor-managed blocked date ranges (maintenance, manual blocks, etc.).

| Column | Type | Notes |
|--------|------|-------|
| availability_id | BIGINT UNSIGNED PK | AUTO_INCREMENT |
| equipment_id | BIGINT UNSIGNED | FK → equipment (ON DELETE CASCADE), NOT NULL |
| start_date | DATE NOT NULL | |
| end_date | DATE NOT NULL | CHECK (end_date >= start_date) |
| quantity_blocked | INT | NOT NULL DEFAULT 1, CHECK (quantity_blocked > 0) |
| reason | ENUM('maintenance','vendor_blocked','booked') | NOT NULL |
| status | ENUM('active','inactive') | NOT NULL DEFAULT 'active' |

**Indexes:** `idx_availability_equipment_id`, `idx_availability_dates`, `idx_availability_status`, `idx_availability_lookup (equipment_id, status, start_date, end_date)`.

---

## 8. coupons

| Column | Type | Notes |
|--------|------|-------|
| coupon_id | BIGINT UNSIGNED PK | AUTO_INCREMENT |
| code | VARCHAR(50) UNIQUE | NOT NULL |
| type | ENUM('percent','flat') | NOT NULL |
| value | DECIMAL(12,2) | NOT NULL, CHECK (value > 0.00), CHECK (type != 'percent' OR value <= 100.00) |
| min_order_amount | DECIMAL(12,2) | NOT NULL DEFAULT 0.00, CHECK (min_order_amount >= 0.00) |
| valid_from / valid_to | DATETIME | NOT NULL, CHECK (valid_to >= valid_from) |
| usage_limit | INT UNSIGNED nullable | NULL = unlimited |
| used_count | INT UNSIGNED | NOT NULL DEFAULT 0 |
| is_active | TINYINT(1) | NOT NULL DEFAULT 1 |

---

## 9. bookings

| Column | Type | Notes |
|--------|------|-------|
| booking_id | BIGINT UNSIGNED PK | AUTO_INCREMENT |
| user_id | BIGINT UNSIGNED | FK → users (ON DELETE RESTRICT), NOT NULL |
| address_id | BIGINT UNSIGNED | FK → addresses (ON DELETE RESTRICT), NOT NULL |
| booking_date | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| start_date, end_date | DATE NOT NULL | CHECK (end_date >= start_date) |
| event_name, event_type | VARCHAR | |
| event_date | DATE | nullable |
| venue_address | TEXT | nullable |
| subtotal, discount, tax, delivery_fee, security_deposit, total_amount | DECIMAL(12,2) | CHECK (total_amount = subtotal - discount + tax + delivery_fee + security_deposit) and all components >= 0.00 |
| coupon_id | BIGINT UNSIGNED | FK → coupons (ON DELETE SET NULL), nullable |
| payment_status | ENUM('unpaid','partial','paid','refunded') | NOT NULL DEFAULT 'unpaid' |
| status | ENUM('pending','confirmed','in_progress','completed','cancelled') | NOT NULL DEFAULT 'pending' |
| notes | TEXT | nullable |

**Triggers:**  
- `trg_bookings_before_insert` & `trg_bookings_before_update`: Enforces that `address_id` belongs to `user_id`.

---

## 10. vendor_orders

Sub-order per vendor within a booking.

| Column | Type | Notes |
|--------|------|-------|
| vendor_order_id | BIGINT UNSIGNED PK | AUTO_INCREMENT |
| booking_id | BIGINT UNSIGNED | FK → bookings (ON DELETE RESTRICT), NOT NULL |
| vendor_id | BIGINT UNSIGNED | FK → vendors (ON DELETE RESTRICT), NOT NULL |
| subtotal | DECIMAL(12,2) | NOT NULL, CHECK (subtotal >= 0.00) |
| status | ENUM('pending','accepted','rejected','dispatched','delivered','returned','completed','cancelled') | NOT NULL DEFAULT 'pending' |
| rejection_reason | TEXT | nullable |

**Constraints:** `UNIQUE KEY uq_vendor_orders_booking_vendor (booking_id, vendor_id)`.

---

## 11. booking_items

| Column | Type | Notes |
|--------|------|-------|
| booking_item_id | BIGINT UNSIGNED PK | AUTO_INCREMENT |
| vendor_order_id | BIGINT UNSIGNED | FK → vendor_orders (ON DELETE RESTRICT), NOT NULL |
| booking_id | BIGINT UNSIGNED | FK → bookings (ON DELETE RESTRICT), NOT NULL |
| vendor_id | BIGINT UNSIGNED | FK → vendors (ON DELETE RESTRICT), NOT NULL |
| equipment_id | BIGINT UNSIGNED | FK → equipment (ON DELETE RESTRICT), NOT NULL |
| quantity | INT | NOT NULL, CHECK (quantity > 0) |
| price_per_day | DECIMAL(12,2) | NOT NULL, CHECK (price_per_day >= 0.00) |
| days | INT | NOT NULL, CHECK (days >= 1) |
| total_price | DECIMAL(12,2) | NOT NULL, CHECK (total_price >= 0.00) |
| item_status | ENUM('pending','confirmed','delivered','returned','cancelled') | NOT NULL DEFAULT 'pending' |

**Triggers:**  
- `trg_booking_items_before_insert` & `trg_booking_items_before_update`:
  1. Enforces `booking_items.booking_id == vendor_orders.booking_id`.
  2. Enforces `booking_items.vendor_id == vendor_orders.vendor_id == equipment.vendor_id`.
  3. Enforces `equipment.status == 'active'` and `vendors.approval_status == 'approved'`.
  4. Enforces rental length >= `equipment.min_rental_days`.
  5. Prevents overbooking via `get_available_quantity()` (with proper old quantity reconciliation on update).

---

## 12. payments

| Column | Type | Notes |
|--------|------|-------|
| payment_id | BIGINT UNSIGNED PK | AUTO_INCREMENT |
| booking_id | BIGINT UNSIGNED | FK → bookings (ON DELETE RESTRICT), NOT NULL |
| amount | DECIMAL(12,2) | NOT NULL, CHECK (amount > 0.00) |
| type | ENUM('advance','full','deposit','refund','deposit_refund') | NOT NULL |
| method | ENUM('upi','card','netbanking','cod','wallet') | NOT NULL |
| gateway | VARCHAR(100) | nullable |
| currency | VARCHAR(10) | NOT NULL DEFAULT 'INR' |
| transaction_id | VARCHAR(255) UNIQUE | nullable |
| status | ENUM('pending','success','failed','refunded') | NOT NULL DEFAULT 'pending' |
| refund_reference | VARCHAR(255) | nullable |
| payment_date | DATETIME | nullable |

**Triggers:**  
- `trg_payments_before_insert` & `trg_payments_before_update`: Enforces that total refunds (`refund`, `deposit_refund`) cannot exceed total successful payments on the booking.

---

## 13. deliveries

One row per `vendor_order`. `UNIQUE(vendor_order_id)`.

| Column | Type | Notes |
|--------|------|-------|
| delivery_id | BIGINT UNSIGNED PK | AUTO_INCREMENT |
| vendor_order_id | BIGINT UNSIGNED | FK → vendor_orders (ON DELETE RESTRICT), UNIQUE, NOT NULL |
| type | ENUM('delivery','pickup') | NOT NULL DEFAULT 'delivery' |
| scheduled_start / scheduled_end | DATETIME | |
| delivery_date | DATETIME | |
| status | ENUM('scheduled','out_for_delivery','delivered','failed') | NOT NULL DEFAULT 'scheduled' |
| tracking_info, delivered_by, proof_url | TEXT/VARCHAR | |

---

## 14. returns

One row per `vendor_order`. `UNIQUE(vendor_order_id)`.

| Column | Type |
|--------|------|
| return_id | BIGINT UNSIGNED PK AUTO_INCREMENT |
| vendor_order_id | FK → vendor_orders (ON DELETE RESTRICT), UNIQUE, NOT NULL |
| return_date | DATE |
| status | ENUM('scheduled','returned','late','incomplete') |

---

## 15. return_items

| Column | Type | Notes |
|--------|------|-------|
| return_item_id | BIGINT UNSIGNED PK | AUTO_INCREMENT |
| return_id | BIGINT UNSIGNED | FK → returns (ON DELETE CASCADE), NOT NULL |
| booking_item_id | BIGINT UNSIGNED | FK → booking_items (ON DELETE RESTRICT), NOT NULL |
| quantity_returned | INT | NOT NULL, CHECK (quantity_returned > 0) |
| item_condition | ENUM('good','minor_damage','major_damage','lost') | NOT NULL DEFAULT 'good' (renamed from reserved word `condition`) |

**Triggers:**  
- `trg_return_items_before_insert` & `trg_return_items_before_update`: Enforces that `booking_item_id` belongs to the return's `vendor_order`, and `quantity_returned <= booking_item.quantity`.

---

## 16. damage_reports

One report per `return_item`. `UNIQUE(return_item_id)`.

| Column | Type |
|--------|------|
| report_id | BIGINT UNSIGNED PK AUTO_INCREMENT |
| return_item_id | FK → return_items (ON DELETE RESTRICT), UNIQUE, NOT NULL |
| description | TEXT NOT NULL |
| damage_cost | DECIMAL(12,2) NOT NULL DEFAULT 0.00, CHECK (damage_cost >= 0.00) |
| deducted_from_deposit | TINYINT(1) NOT NULL DEFAULT 0 |
| status | ENUM('reported','disputed','resolved') |
| images_notes | TEXT |
| resolved_by | FK → users (ON DELETE SET NULL), nullable |
| created_at | DATETIME |

---

## 17. reviews

One review per `booking_item`. `UNIQUE(booking_item_id)`.

| Column | Type | Notes |
|--------|------|-------|
| review_id | BIGINT UNSIGNED PK | AUTO_INCREMENT |
| user_id | FK → users (ON DELETE RESTRICT), NOT NULL | |
| booking_item_id | FK → booking_items (ON DELETE RESTRICT), NOT NULL | |
| equipment_id | FK → equipment (ON DELETE RESTRICT), NOT NULL | |
| vendor_id | FK → vendors (ON DELETE RESTRICT), NOT NULL | |
| rating | TINYINT NOT NULL | CHECK (rating >= 1 AND rating <= 5) |
| comment, vendor_reply | TEXT | |
| review_date | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP |

**Triggers:**  
- `trg_reviews_before_insert` & `trg_reviews_before_update`: Validates `item_status='returned'`, user ownership of booking, and matching `equipment_id` / `vendor_id`.  
- `trg_reviews_after_insert`, `trg_reviews_after_update`, `trg_reviews_after_delete`: Synchronize `equipment.avg_rating` and `review_count`.

---

## 18. cart_items

`UNIQUE(user_id, equipment_id, start_date, end_date)`.

| Column | Type |
|--------|------|
| cart_item_id | BIGINT UNSIGNED PK AUTO_INCREMENT |
| user_id | FK → users (ON DELETE CASCADE), NOT NULL |
| equipment_id | FK → equipment (ON DELETE CASCADE), NOT NULL |
| quantity | INT NOT NULL DEFAULT 1, CHECK (quantity > 0) |
| start_date, end_date | DATE NOT NULL, CHECK (end_date >= start_date) |

---

## 19. wishlist

Composite PK `(user_id, equipment_id)`.

| Column | Type |
|--------|------|
| user_id | FK → users (ON DELETE CASCADE), NOT NULL |
| equipment_id | FK → equipment (ON DELETE CASCADE), NOT NULL |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP |

---

## 20. payouts

One payout per `vendor_order`. `UNIQUE(vendor_order_id)`.

| Column | Type |
|--------|------|
| payout_id | BIGINT UNSIGNED PK AUTO_INCREMENT |
| vendor_id | FK → vendors (ON DELETE RESTRICT), NOT NULL |
| vendor_order_id | FK → vendor_orders (ON DELETE RESTRICT), UNIQUE, NOT NULL |
| gross_amount | DECIMAL(12,2) NOT NULL, CHECK (gross_amount >= 0.00) |
| commission_amount | DECIMAL(12,2) NOT NULL, CHECK (commission_amount >= 0.00) |
| net_amount | DECIMAL(12,2) NOT NULL, CHECK (net_amount = gross_amount - commission_amount) |
| status | ENUM('pending','processing','paid') NOT NULL DEFAULT 'pending' |
| paid_at | DATETIME |

---

## 21. notifications

| Column | Type |
|--------|------|
| notification_id | BIGINT UNSIGNED PK AUTO_INCREMENT |
| user_id | FK → users (ON DELETE CASCADE), NOT NULL |
| type | VARCHAR(100) NOT NULL |
| title | VARCHAR(255) NOT NULL |
| message | TEXT NOT NULL |
| is_read | TINYINT(1) NOT NULL DEFAULT 0 |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP |

**Indexes:** `idx_notifications_user_id`, `idx_notifications_is_read`, `idx_notifications_user_unread (user_id, is_read, created_at)`.

---

## 22. messages

| Column | Type | Notes |
|--------|------|-------|
| message_id | BIGINT UNSIGNED PK | AUTO_INCREMENT |
| sender_id | FK → users (ON DELETE RESTRICT), NOT NULL | |
| receiver_id | FK → users (ON DELETE RESTRICT), NOT NULL | |
| equipment_id | FK → equipment (ON DELETE SET NULL), nullable | |
| body | TEXT NOT NULL | |
| is_read | TINYINT(1) | NOT NULL DEFAULT 0 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**Indexes:** `idx_messages_sender_id`, `idx_messages_receiver_id`, `idx_messages_equipment_id`, `idx_messages_sender_receiver (sender_id, receiver_id, created_at)`, `idx_messages_receiver_sender (receiver_id, sender_id, created_at)`.

---

## Stored Programs Summary

### Stored Function
- **`get_available_quantity(equipment_id, start_date, end_date) → INT`**  
  Computes physical stock minus committed active bookings minus active availability blocks. Excludes cancelled/returned items, cancelled bookings, and rejected/cancelled vendor orders. Handles edge cases and invalid date inputs safely.

### Triggers (20 triggers across 9 tables)
1. `trg_vendors_before_insert`: Enforces `users.role = 'vendor'`.
2. `trg_vendors_before_update`: Prevents reassigning vendor profile to non-vendor.
3. `trg_users_before_update_role`: Prevents demoting user from 'vendor' while vendors row exists.
4. `trg_addresses_before_insert`: Enforces single default address per user.
5. `trg_addresses_before_update`: Enforces single default address per user on update.
6. `trg_equipment_images_before_insert`: Enforces single primary image per equipment.
7. `trg_equipment_images_before_update`: Enforces single primary image per equipment on update.
8. `trg_bookings_before_insert`: Enforces booking address belongs to booking customer.
9. `trg_bookings_before_update`: Enforces booking address belongs to booking customer on update.
10. `trg_booking_items_before_insert`: Validates order/item IDs match, vendor IDs match, equipment is active, vendor is approved, duration >= min_rental_days, and overbooking stock capacity.
11. `trg_booking_items_before_update`: Re-validates all business rules on update and checks available stock adjusting for the item's previous quantity.
12. `trg_return_items_before_insert`: Enforces booking_item belongs to return's vendor_order and quantity_returned <= quantity.
13. `trg_return_items_before_update`: Enforces booking_item belongs to return's vendor_order and quantity_returned <= quantity on update.
14. `trg_reviews_before_insert`: Enforces item_status = 'returned', reviewer owns booking, equipment/vendor match.
15. `trg_reviews_before_update`: Re-validates review integrity rules on update.
16. `trg_reviews_after_insert`: Recomputes equipment avg_rating and review_count.
17. `trg_reviews_after_update`: Recomputes equipment avg_rating and review_count (for both new and old equipment if changed).
18. `trg_reviews_after_delete`: Recomputes equipment avg_rating and review_count.
19. `trg_payments_before_insert`: Ensures refund amounts cannot exceed total successful payments on booking.
20. `trg_payments_before_update`: Ensures refund amounts cannot exceed total successful payments on booking on update.

---

## Views (migration 012)

| View | Purpose |
|------|---------|
| `v_vendor_dashboard` | Pre-aggregated vendor KPIs (equipment count, pending/active/completed orders, total earnings, avg rating, review count) without Cartesian join explosions. |
| `v_vendor_incoming_orders` | Vendor sub-orders joined with booking schedule, event venue, customer info, and aggregated item summary string. |
| `v_customer_bookings` | Customer bookings with distinct vendor list, order statuses, and latest delivery/payment statuses. |
| `v_equipment_listing` | Customer catalog listing: active equipment from approved vendors with category hierarchy and primary image URL. |
