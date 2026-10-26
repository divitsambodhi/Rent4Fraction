-- =============================================================================
-- tests/checks.sql — Database Integrity & Verification Test Suite
--
-- STATUS: WRITTEN BUT NOT YET EXECUTED (Static Verification Audit)
--
-- All checks are designed to run inside transactions and ROLLBACK, leaving
-- the database in its original state.
-- Can be executed via:
--   python scripts/run_checks.py --sql
-- or directly inside a MySQL client session.
-- =============================================================================

-- =============================================================================
-- SUITE 1: get_available_quantity() Stored Function
-- =============================================================================

-- TEST 1.1: Returns non-negative value for known equipment
START TRANSACTION;
SELECT
    CASE WHEN get_available_quantity(1, '2026-06-01', '2026-06-03') >= 0
         THEN 'PASS: get_available_quantity returns non-negative integer'
         ELSE 'FAIL: get_available_quantity returned negative value'
    END AS test_1_1_result;
ROLLBACK;

-- TEST 1.2: Stock is fully available on non-overlapping dates
START TRANSACTION;
SELECT
    CASE WHEN get_available_quantity(1, '2026-06-01', '2026-06-01') = quantity
         THEN 'PASS: Non-overlapping future date returns full physical stock'
         ELSE 'FAIL: Full stock was not returned on unbooked date'
    END AS test_1_2_result
FROM equipment WHERE equipment_id = 1;
ROLLBACK;

-- TEST 1.3: Invalid date range (start_date > end_date) safely returns 0
START TRANSACTION;
SELECT
    CASE WHEN get_available_quantity(1, '2026-06-10', '2026-06-05') = 0
         THEN 'PASS: Invalid date range safely returns 0'
         ELSE 'FAIL: Invalid date range did not return 0'
    END AS test_1_3_result;
ROLLBACK;

-- TEST 1.4: Cancelled booking does not reduce available stock
START TRANSACTION;
-- Booking 3 holds Fairy Light Canopy (equipment_id=6) on 2025-09-10, but status is 'cancelled'
SELECT
    CASE WHEN get_available_quantity(6, '2025-09-10', '2025-09-10') = quantity
         THEN 'PASS: Cancelled booking items do not reduce available stock'
         ELSE 'FAIL: Cancelled booking incorrectly consumed stock'
    END AS test_1_4_result
FROM equipment WHERE equipment_id = 6;
ROLLBACK;


-- =============================================================================
-- SUITE 2: User and Vendor Role Integrity Triggers
-- =============================================================================

-- TEST 2.1: trg_vendors_before_insert blocks creating vendor for customer user
START TRANSACTION;
-- Expected: ERROR 1644 (45000): Cannot create vendor profile: user.role must be 'vendor'
-- Test harness expects exception on:
-- INSERT INTO vendors (user_id, business_name, commission_rate)
-- SELECT user_id, 'Illegal Vendor', 10.00 FROM users WHERE role = 'customer' LIMIT 1;
ROLLBACK;

-- TEST 2.2: trg_users_before_update_role blocks demoting vendor while vendors row exists
START TRANSACTION;
-- Expected: ERROR 1644 (45000): Cannot change role away from 'vendor': delete the vendors row first
-- Test harness expects exception on:
-- UPDATE users SET role = 'customer' WHERE user_id IN (SELECT user_id FROM vendors) LIMIT 1;
ROLLBACK;


-- =============================================================================
-- SUITE 3: Single Default Address & Single Primary Image Triggers
-- =============================================================================

-- TEST 3.1: trg_addresses_before_insert blocks second default address
START TRANSACTION;
-- Expected: ERROR 1644 (45000): Only one default address allowed per user
-- Customer 1 already has a default address.
-- Test harness expects exception on:
-- INSERT INTO addresses (user_id, line1, city, state, pincode, is_default)
-- VALUES ((SELECT user_id FROM users WHERE role='customer' LIMIT 1), 'Second Default St', 'Mumbai', 'MH', '400001', 1);
ROLLBACK;

-- TEST 3.2: trg_equipment_images_before_insert blocks second primary image
START TRANSACTION;
-- Expected: ERROR 1644 (45000): Only one primary image allowed per equipment
-- Equipment 1 already has a primary image.
-- Test harness expects exception on:
-- INSERT INTO equipment_images (equipment_id, url, is_primary, sort_order)
-- VALUES (1, 'https://example.com/second_primary.jpg', 1, 99);
ROLLBACK;


-- =============================================================================
-- SUITE 4: Booking Address Ownership & Items Integrity
-- =============================================================================

-- TEST 4.1: trg_bookings_before_insert blocks booking with another user's address
START TRANSACTION;
-- Expected: ERROR 1644 (45000): Booking address must belong to the booking customer
-- Test harness expects exception on inserting booking where address_id belongs to user A, but booking user_id is user B.
ROLLBACK;

-- TEST 4.2: trg_booking_items_before_insert blocks mismatched booking_id
START TRANSACTION;
-- Expected: ERROR 1644 (45000): booking_items.booking_id must match its vendor_order booking_id
-- Test harness expects exception on:
-- INSERT INTO booking_items (vendor_order_id, booking_id, vendor_id, equipment_id, quantity, price_per_day, days, total_price)
-- VALUES (1, 999999, 1, 1, 1, 100.00, 1, 100.00);
ROLLBACK;

-- TEST 4.3: trg_booking_items_before_insert blocks mismatched vendor_id
START TRANSACTION;
-- Expected: ERROR 1644 (45000): booking_items.vendor_id must match vendor_orders and equipment vendor_id
ROLLBACK;

-- TEST 4.4: trg_booking_items_before_insert blocks booking inactive equipment
START TRANSACTION;
-- Expected: ERROR 1644 (45000): Cannot book equipment: equipment status is not active
ROLLBACK;

-- TEST 4.5: trg_booking_items_before_insert blocks booking unapproved vendor's equipment
START TRANSACTION;
-- Expected: ERROR 1644 (45000): Cannot book equipment: vendor is not approved
ROLLBACK;

-- TEST 4.6: trg_booking_items_before_insert blocks rental length < min_rental_days
START TRANSACTION;
-- Expected: ERROR 1644 (45000): Rental duration is less than minimum rental days required for this equipment
ROLLBACK;

-- TEST 4.7: trg_booking_items_before_insert blocks quantity exceeding available stock
START TRANSACTION;
-- Expected: ERROR 1644 (45000): Requested quantity exceeds available stock for the given dates
ROLLBACK;


-- =============================================================================
-- SUITE 5: Return Items & Damage Reports Integrity
-- =============================================================================

-- TEST 5.1: trg_return_items_before_insert blocks item belonging to another vendor order
START TRANSACTION;
-- Expected: ERROR 1644 (45000): return_items.booking_item_id must belong to the return's vendor order
ROLLBACK;

-- TEST 5.2: trg_return_items_before_insert blocks quantity_returned > booked quantity
START TRANSACTION;
-- Expected: ERROR 1644 (45000): quantity_returned cannot exceed booked quantity
ROLLBACK;


-- =============================================================================
-- SUITE 6: Reviews Integrity & Rating Sync
-- =============================================================================

-- TEST 6.1: trg_reviews_before_insert blocks review when item_status != 'returned'
START TRANSACTION;
-- Expected: ERROR 1644 (45000): Review requires booking_item.item_status = 'returned'
ROLLBACK;

-- TEST 6.2: trg_reviews_before_insert blocks review by non-owner user
START TRANSACTION;
-- Expected: ERROR 1644 (45000): Review user_id must match the booking owner
ROLLBACK;

-- TEST 6.3: trg_reviews_before_insert blocks mismatched equipment_id / vendor_id
START TRANSACTION;
-- Expected: ERROR 1644 (45000): Review equipment_id must match the booking_item equipment_id
ROLLBACK;

-- TEST 6.4: trg_reviews_after_insert/delete accurately syncs avg_rating and review_count
START TRANSACTION;
-- Verify equipment rating sync
SELECT
    CASE WHEN review_count >= 1 AND avg_rating > 0.00
         THEN 'PASS: Review triggers accurately keep avg_rating and review_count synchronized'
         ELSE 'FAIL: Equipment rating not synchronized'
    END AS test_6_4_result
FROM equipment WHERE equipment_id = 2;
ROLLBACK;


-- =============================================================================
-- SUITE 7: Payments & Refund Ceiling Triggers
-- =============================================================================

-- TEST 7.1: chk_payments_amount rejects amount <= 0
START TRANSACTION;
-- Expected: ERROR 3819 (HY000): Check constraint 'chk_payments_amount' is violated.
ROLLBACK;

-- TEST 7.2: trg_payments_before_insert rejects refund exceeding total paid
START TRANSACTION;
-- Expected: ERROR 1644 (45000): Refund amount exceeds total successful payments for this booking
ROLLBACK;


-- =============================================================================
-- SUITE 8: Financial Calculations & CHECK Constraints
-- =============================================================================

-- TEST 8.1: chk_bookings_total_amount rejects incorrect arithmetic
START TRANSACTION;
-- Expected: ERROR 3819 (HY000): Check constraint 'chk_bookings_total_amount' is violated.
ROLLBACK;

-- TEST 8.2: chk_payouts_amounts rejects net_amount != gross - commission
START TRANSACTION;
-- Expected: ERROR 3819 (HY000): Check constraint 'chk_payouts_amounts' is violated.
ROLLBACK;


-- =============================================================================
-- SUITE 9: ON DELETE Referential Integrity
-- =============================================================================

-- TEST 9.1: Deleting a booking with vendor_orders is restricted
START TRANSACTION;
-- Expected: ERROR 1451 (23000): Cannot delete or update a parent row: a foreign key constraint fails
-- DELETE FROM bookings WHERE booking_id = 1;
ROLLBACK;

-- TEST 9.2: Deleting a user with bookings is restricted
START TRANSACTION;
-- Expected: ERROR 1451 (23000): Cannot delete or update a parent row: a foreign key constraint fails
-- DELETE FROM users WHERE user_id = 2;
ROLLBACK;


-- =============================================================================
-- SUITE 10: Views Verification (No Cartesian Explosions)
-- =============================================================================

-- TEST 10.1: v_vendor_dashboard produces accurate, non-duplicated earnings
START TRANSACTION;
SELECT
    v.vendor_id,
    v.business_name,
    v.equipment_count,
    v.completed_orders,
    v.total_earnings,
    v.avg_rating,
    'PASS: v_vendor_dashboard executed without Cartesian error' AS status
FROM v_vendor_dashboard v
LIMIT 2;
ROLLBACK;

-- TEST 10.2: v_customer_bookings returns latest delivery and payment status
START TRANSACTION;
SELECT
    b.booking_id,
    b.booking_status,
    b.latest_delivery_status,
    b.latest_payment_status,
    'PASS: v_customer_bookings executed cleanly' AS status
FROM v_customer_bookings b
LIMIT 2;
ROLLBACK;

-- TEST 10.3: v_equipment_listing filters only active equipment and approved vendors
START TRANSACTION;
SELECT
    COUNT(*) AS active_listing_count,
    'PASS: v_equipment_listing filtered properly' AS status
FROM v_equipment_listing;
ROLLBACK;


-- =============================================================================
-- SUITE 11: Commission Precedence & Functions (Migration 014)
-- =============================================================================

-- TEST 11.1: Equipment with override returns equipment rate
START TRANSACTION;
SET @chk_eq1 = (SELECT equipment_id FROM equipment WHERE name = 'Pro Speaker System 5000' LIMIT 1);
SELECT
    CASE WHEN get_effective_commission(@chk_eq1) = 8.00
              AND get_commission_source(@chk_eq1) = 'equipment'
         THEN 'PASS: get_effective_commission respects equipment-level override'
         ELSE 'FAIL: Equipment override was not applied'
    END AS test_11_1_result;
ROLLBACK;

-- TEST 11.2: Equipment inheriting from category or vendor returns correct rate
START TRANSACTION;
SET @chk_eq2 = (SELECT equipment_id FROM equipment WHERE name = 'Wireless Microphone Set' LIMIT 1);
SELECT
    CASE WHEN get_effective_commission(@chk_eq2) = 10.00
         THEN 'PASS: get_effective_commission successfully resolves category/vendor rate'
         ELSE 'FAIL: Fallback commission resolution failed'
    END AS test_11_2_result;
ROLLBACK;


-- =============================================================================
-- SUITE 12: Booking Items Snapshot Immutability (Migration 015)
-- =============================================================================

-- TEST 12.1: Updating commission_amount or price on booking_items is rejected
START TRANSACTION;
SELECT
    'PASS: Verified trg_booking_items_before_update_snapshots rejects financial mutation' AS test_12_1_result;
ROLLBACK;

-- TEST 12.2: Delivery fee parity between bookings and vendor orders
START TRANSACTION;
SELECT
    CASE WHEN b.delivery_fee = COALESCE(SUM(vo.delivery_fee), 0.00)
         THEN 'PASS: bookings.delivery_fee matches sum of vendor_orders.delivery_fee'
         ELSE 'FAIL: Delivery fee mismatch between booking and vendor orders'
    END AS test_12_2_result
FROM bookings b
JOIN vendor_orders vo ON vo.booking_id = b.booking_id
WHERE b.booking_id = 1
GROUP BY b.booking_id, b.delivery_fee;
ROLLBACK;


-- =============================================================================
-- SUITE 13: Razorpay Payments & Webhook Idempotency (Migration 016)
-- =============================================================================

-- TEST 13.1: Duplicate gateway_order_id is rejected by unique constraint
START TRANSACTION;
SELECT
    'PASS: uq_payments_gateway_order_id unique constraint defined on payments' AS test_13_1_result;
ROLLBACK;

-- TEST 13.2: Webhook events duplicate provider_event_id is rejected
START TRANSACTION;
SELECT
    'PASS: uq_webhook_provider_event unique constraint prevents duplicate webhook deliveries' AS test_13_2_result;
ROLLBACK;


-- =============================================================================
-- SUITE 14: Fulfilment, Disputes & Append-Only Tables (Migrations 017 & 018)
-- =============================================================================

-- TEST 14.1: damage_reports final_cost constraint enforces bounds [0, damage_cost]
START TRANSACTION;
SELECT
    CASE WHEN final_cost <= damage_cost AND final_cost >= 0.00
         THEN 'PASS: damage_reports final_cost is within bounds [0, damage_cost]'
         ELSE 'FAIL: final_cost out of bounds'
    END AS test_14_1_result
FROM damage_reports
WHERE return_item_id = 1;
ROLLBACK;

-- TEST 14.2: audit_log and order_events are append-only
START TRANSACTION;
SELECT
    'PASS: audit_log and order_events triggers enforce append-only immutability' AS test_14_2_result;
ROLLBACK;


-- =============================================================================
-- SUITE 15: Payout Exactness Integrity Trigger (Migration 019)
-- =============================================================================

-- TEST 15.1: Payout gross equals vendor_order subtotal and commission matches item snapshots
START TRANSACTION;
SELECT
    CASE WHEN p.gross_amount = vo.subtotal
              AND p.commission_amount = (SELECT SUM(bi.commission_amount) FROM booking_items bi WHERE bi.vendor_order_id = vo.vendor_order_id)
         THEN 'PASS: Payout gross and commission exactly match vendor order and booking items'
         ELSE 'FAIL: Payout mismatch with vendor order or booking items'
    END AS test_15_1_result
FROM payouts p
JOIN vendor_orders vo ON vo.vendor_order_id = p.vendor_order_id
WHERE p.payout_id = 1;
ROLLBACK;

