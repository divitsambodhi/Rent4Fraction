-- =============================================================================
-- tests/checks.sql — Documentation of assertions verified by run_checks.py
--
-- This file describes the 8 checks.  The actual executable tests live in
-- scripts/run_checks.py which runs them in transactions and rolls back.
-- =============================================================================

-- CHECK 1: get_available_quantity returns a non-negative integer
-- SELECT get_available_quantity(<equipment_id>, '2026-06-01', '2026-06-03');
-- EXPECT: result >= 0

-- CHECK 2: get_available_quantity produces correct value for known stock
-- Pro Speaker System 5000 has quantity=3.
-- Booking 1 holds 2 units on 2025-12-20..2025-12-21.
-- Querying a different date should return 3.
-- EXPECT: get_available_quantity(eq_id, '2026-01-01', '2026-01-01') = 3

-- CHECK 3: overbooking trigger fires
-- Insert a booking_item requesting quantity > available.
-- EXPECT: OperationalError 1644, message contains 'exceeds available stock'

-- CHECK 4: review trigger blocks non-returned item
-- Insert a review for a booking_item with item_status = 'pending'.
-- EXPECT: OperationalError 1644, message contains 'returned'

-- CHECK 5: review trigger blocks wrong user
-- Insert a review where user_id does not own the booking.
-- EXPECT: OperationalError 1644, message contains 'booking owner'

-- CHECK 6: vendor-role trigger blocks non-vendor user
-- Insert a vendors row for a user whose role = 'customer'.
-- EXPECT: OperationalError 1644, message contains 'must be ''vendor'''

-- CHECK 7: role-change trigger blocks while vendor row exists
-- UPDATE users SET role = 'customer' WHERE the user has a vendors row.
-- EXPECT: OperationalError 1644, message contains 'delete the vendors row first'

-- CHECK 8: total_amount CHECK constraint fires on bad arithmetic
-- Insert a booking where total_amount != subtotal-discount+tax+delivery_fee+security_deposit.
-- EXPECT: OperationalError 3819 (check constraint violated)
