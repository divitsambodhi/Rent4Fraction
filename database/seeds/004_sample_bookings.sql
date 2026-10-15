-- =============================================================================
-- Seed 004 — 3 sample bookings
--
--  Booking 1 (multi-vendor, confirmed):
--      Customer: Aisha Sharma
--      Items: Pro Speaker System 5000 (vendor1) + LED Par Stage Lights (vendor2)
--
--  Booking 2 (completed — with return, damage report, review):
--      Customer: Rahul Mehta
--      Items: Wireless Microphone Set (vendor1)
--      item_status is set to 'returned' BEFORE the review is inserted
--      so the review trigger passes.
--
--  Booking 3 (cancelled):
--      Customer: Priya Nair
--      Items: Fairy Light Canopy (vendor2)
--
-- Idempotent: each section uses WHERE NOT EXISTS keyed on (user_id, event_name).
-- =============================================================================

-- ── Resolve user IDs ──────────────────────────────────────────────────────────
SET @cust1_id   = (SELECT user_id FROM users WHERE firebase_uid = 'dev-customer-1-uid-replace-me');
SET @cust2_id   = (SELECT user_id FROM users WHERE firebase_uid = 'dev-customer-2-uid-replace-me');
SET @cust3_id   = (SELECT user_id FROM users WHERE firebase_uid = 'dev-customer-3-uid-replace-me');
SET @admin_id   = (SELECT user_id FROM users WHERE firebase_uid = 'dev-admin-uid-replace-me');

-- ── Resolve vendor IDs ────────────────────────────────────────────────────────
SET @vendor1_id = (SELECT v.vendor_id FROM vendors v JOIN users u ON u.user_id = v.user_id WHERE u.firebase_uid = 'dev-vendor-1-uid-replace-me');
SET @vendor2_id = (SELECT v.vendor_id FROM vendors v JOIN users u ON u.user_id = v.user_id WHERE u.firebase_uid = 'dev-vendor-2-uid-replace-me');

-- ── Resolve equipment IDs ─────────────────────────────────────────────────────
SET @eq_speaker_id  = (SELECT equipment_id FROM equipment WHERE name = 'Pro Speaker System 5000');
SET @eq_mic_id      = (SELECT equipment_id FROM equipment WHERE name = 'Wireless Microphone Set');
SET @eq_led_id      = (SELECT equipment_id FROM equipment WHERE name = 'LED Par Stage Lights');
SET @eq_fairy_id    = (SELECT equipment_id FROM equipment WHERE name = 'Fairy Light Canopy');

-- ── Insert a coupon (for booking 3) ──────────────────────────────────────────
INSERT INTO coupons (code, type, value, min_order_amount, valid_from, valid_to, usage_limit, used_count, is_active)
VALUES ('WELCOME100', 'flat', 100.00, 500.00, '2025-01-01 00:00:00', '2025-12-31 23:59:59', 100, 0, 1)
AS new_data
ON DUPLICATE KEY UPDATE
    value            = new_data.value,
    min_order_amount = new_data.min_order_amount,
    is_active        = new_data.is_active;

SET @coupon_id = (SELECT coupon_id FROM coupons WHERE code = 'WELCOME100');

-- ============================================================
-- Addresses
-- ============================================================
INSERT INTO addresses (user_id, label, line1, city, state, pincode, country, is_default)
SELECT @cust1_id, 'Home', 'Flat 204, Sea View Apartments, Marine Drive', 'Mumbai', 'Maharashtra', '400020', 'India', 1
WHERE NOT EXISTS (SELECT 1 FROM addresses WHERE user_id = @cust1_id AND label = 'Home');

SET @addr1_id = (SELECT address_id FROM addresses WHERE user_id = @cust1_id AND label = 'Home' LIMIT 1);

INSERT INTO addresses (user_id, label, line1, city, state, pincode, country, is_default)
SELECT @cust2_id, 'Home', '45 Rajouri Garden, Block A', 'New Delhi', 'Delhi', '110027', 'India', 1
WHERE NOT EXISTS (SELECT 1 FROM addresses WHERE user_id = @cust2_id AND label = 'Home');

SET @addr2_id = (SELECT address_id FROM addresses WHERE user_id = @cust2_id AND label = 'Home' LIMIT 1);

INSERT INTO addresses (user_id, label, line1, city, state, pincode, country, is_default)
SELECT @cust3_id, 'Home', '12 Indiranagar 100 Feet Road, 12th Cross', 'Bengaluru', 'Karnataka', '560038', 'India', 1
WHERE NOT EXISTS (SELECT 1 FROM addresses WHERE user_id = @cust3_id AND label = 'Home');

SET @addr3_id = (SELECT address_id FROM addresses WHERE user_id = @cust3_id AND label = 'Home' LIMIT 1);

-- ============================================================
-- BOOKING 1 — multi-vendor, confirmed, paid
-- subtotal=10000, discount=0, tax=1800, delivery=500, deposit=2000, total=14300
-- ============================================================
INSERT INTO bookings (user_id, address_id, start_date, end_date, event_name, event_type, event_date, venue_address, subtotal, discount, tax, delivery_fee, security_deposit, total_amount, payment_status, status)
SELECT @cust1_id, @addr1_id,
    '2025-12-20', '2025-12-21',
    'Grand Wedding Reception',
    'Wedding',
    '2025-12-20',
    'Taj Lands End, Bandra West, Mumbai 400050',
    10000.00, 0.00, 1800.00, 500.00, 2000.00, 14300.00,
    'paid', 'confirmed'
WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE user_id = @cust1_id AND event_name = 'Grand Wedding Reception');

SET @booking1_id = (SELECT booking_id FROM bookings WHERE user_id = @cust1_id AND event_name = 'Grand Wedding Reception');

-- Vendor orders
INSERT INTO vendor_orders (booking_id, vendor_id, subtotal, status)
SELECT @booking1_id, @vendor1_id, 6000.00, 'accepted'
WHERE NOT EXISTS (SELECT 1 FROM vendor_orders WHERE booking_id = @booking1_id AND vendor_id = @vendor1_id);

INSERT INTO vendor_orders (booking_id, vendor_id, subtotal, status)
SELECT @booking1_id, @vendor2_id, 4000.00, 'accepted'
WHERE NOT EXISTS (SELECT 1 FROM vendor_orders WHERE booking_id = @booking1_id AND vendor_id = @vendor2_id);

SET @vo1a_id = (SELECT vendor_order_id FROM vendor_orders WHERE booking_id = @booking1_id AND vendor_id = @vendor1_id);
SET @vo1b_id = (SELECT vendor_order_id FROM vendor_orders WHERE booking_id = @booking1_id AND vendor_id = @vendor2_id);

-- Booking items  (overbooking trigger runs; quantities are within stock limits)
-- E1: Pro Speaker System 5000 x2 @ 1500/day x2 days = 6000
INSERT INTO booking_items (vendor_order_id, booking_id, vendor_id, equipment_id, quantity, price_per_day, days, total_price, item_status)
SELECT @vo1a_id, @booking1_id, @vendor1_id, @eq_speaker_id, 2, 1500.00, 2, 6000.00, 'confirmed'
WHERE NOT EXISTS (SELECT 1 FROM booking_items WHERE vendor_order_id = @vo1a_id AND equipment_id = @eq_speaker_id);

-- E5: LED Par Stage Lights x4 @ 500/day x2 days = 4000
INSERT INTO booking_items (vendor_order_id, booking_id, vendor_id, equipment_id, quantity, price_per_day, days, total_price, item_status)
SELECT @vo1b_id, @booking1_id, @vendor2_id, @eq_led_id, 4, 500.00, 2, 4000.00, 'confirmed'
WHERE NOT EXISTS (SELECT 1 FROM booking_items WHERE vendor_order_id = @vo1b_id AND equipment_id = @eq_led_id);

-- Payment
INSERT INTO payments (booking_id, amount, type, method, currency, transaction_id, status, payment_date)
SELECT @booking1_id, 14300.00, 'full', 'upi', 'INR', 'TXN-B1-WEDDING-001', 'success', '2025-12-15 10:30:00'
WHERE NOT EXISTS (SELECT 1 FROM payments WHERE booking_id = @booking1_id AND transaction_id = 'TXN-B1-WEDDING-001');

-- ============================================================
-- BOOKING 2 — completed: return + damage report + review
-- subtotal=2400, discount=0, tax=432, delivery=300, deposit=500, total=3632
-- ============================================================
INSERT INTO bookings (user_id, address_id, start_date, end_date, event_name, event_type, event_date, venue_address, subtotal, discount, tax, delivery_fee, security_deposit, total_amount, payment_status, status)
SELECT @cust2_id, @addr2_id,
    '2025-08-15', '2025-08-17',
    'Corporate Annual Meet',
    'Corporate',
    '2025-08-15',
    'India Habitat Centre, Lodhi Road, New Delhi 110003',
    2400.00, 0.00, 432.00, 300.00, 500.00, 3632.00,
    'paid', 'completed'
WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE user_id = @cust2_id AND event_name = 'Corporate Annual Meet');

SET @booking2_id = (SELECT booking_id FROM bookings WHERE user_id = @cust2_id AND event_name = 'Corporate Annual Meet');

INSERT INTO vendor_orders (booking_id, vendor_id, subtotal, status)
SELECT @booking2_id, @vendor1_id, 2400.00, 'completed'
WHERE NOT EXISTS (SELECT 1 FROM vendor_orders WHERE booking_id = @booking2_id AND vendor_id = @vendor1_id);

SET @vo2_id = (SELECT vendor_order_id FROM vendor_orders WHERE booking_id = @booking2_id AND vendor_id = @vendor1_id);

-- Insert booking item with initial status 'pending'
INSERT INTO booking_items (vendor_order_id, booking_id, vendor_id, equipment_id, quantity, price_per_day, days, total_price, item_status)
SELECT @vo2_id, @booking2_id, @vendor1_id, @eq_mic_id, 1, 800.00, 3, 2400.00, 'pending'
WHERE NOT EXISTS (SELECT 1 FROM booking_items WHERE vendor_order_id = @vo2_id AND equipment_id = @eq_mic_id);

SET @bi2_id = (SELECT booking_item_id FROM booking_items WHERE vendor_order_id = @vo2_id AND equipment_id = @eq_mic_id);

-- Now update item to 'returned' so the review trigger will pass
UPDATE booking_items SET item_status = 'returned' WHERE booking_item_id = @bi2_id;

-- Delivery record
INSERT INTO deliveries (vendor_order_id, type, scheduled_start, scheduled_end, delivery_date, status, delivered_by)
SELECT @vo2_id, 'delivery',
    '2025-08-15 09:00:00', '2025-08-15 11:00:00',
    '2025-08-15 10:30:00', 'delivered', 'Ravi Transport Co.'
WHERE NOT EXISTS (SELECT 1 FROM deliveries WHERE vendor_order_id = @vo2_id);

-- Return record
INSERT INTO returns (vendor_order_id, return_date, status)
SELECT @vo2_id, '2025-08-18', 'returned'
WHERE NOT EXISTS (SELECT 1 FROM returns WHERE vendor_order_id = @vo2_id);

SET @return2_id = (SELECT return_id FROM returns WHERE vendor_order_id = @vo2_id);

-- Return item
INSERT INTO return_items (return_id, booking_item_id, quantity_returned, item_condition)
SELECT @return2_id, @bi2_id, 1, 'minor_damage'
WHERE NOT EXISTS (SELECT 1 FROM return_items WHERE return_id = @return2_id AND booking_item_id = @bi2_id);

SET @ri2_id = (SELECT return_item_id FROM return_items WHERE return_id = @return2_id AND booking_item_id = @bi2_id);

-- Damage report
INSERT INTO damage_reports (return_item_id, description, damage_cost, deducted_from_deposit, status, images_notes, resolved_by)
SELECT @ri2_id,
    'Minor scuff marks on one microphone handset. Cosmetic damage only.',
    250.00, 1, 'resolved',
    'Single scuff mark ~2cm on body. Photos on file.',
    @admin_id
WHERE NOT EXISTS (SELECT 1 FROM damage_reports WHERE return_item_id = @ri2_id);

-- Review (item_status = 'returned' so trg_reviews_before_insert will pass)
SET @vendor1_vendor_id_check = (SELECT vendor_id FROM booking_items WHERE booking_item_id = @bi2_id);

INSERT INTO reviews (user_id, booking_item_id, equipment_id, vendor_id, rating, comment, review_date)
SELECT @cust2_id, @bi2_id, @eq_mic_id, @vendor1_id,
    5,
    'Excellent wireless microphone set! Crystal-clear audio, no dropouts. Delivery was punctual.',
    '2025-08-20 14:00:00'
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE booking_item_id = @bi2_id);

-- Payment
INSERT INTO payments (booking_id, amount, type, method, currency, transaction_id, status, payment_date)
SELECT @booking2_id, 3632.00, 'full', 'netbanking', 'INR', 'TXN-B2-CORP-001', 'success', '2025-08-10 09:15:00'
WHERE NOT EXISTS (SELECT 1 FROM payments WHERE booking_id = @booking2_id AND transaction_id = 'TXN-B2-CORP-001');

-- ============================================================
-- BOOKING 3 — cancelled with refund
-- subtotal=1200, discount=100 (WELCOME100), tax=198, delivery=200, deposit=300, total=1798
-- ============================================================
INSERT INTO bookings (user_id, address_id, start_date, end_date, event_name, event_type, event_date, venue_address, subtotal, discount, coupon_id, tax, delivery_fee, security_deposit, total_amount, payment_status, status, notes)
SELECT @cust3_id, @addr3_id,
    '2025-09-10', '2025-09-10',
    'Birthday Garden Party',
    'Birthday',
    '2025-09-10',
    'Cubbon Park Lawn, Bengaluru 560001',
    1200.00, 100.00, @coupon_id, 198.00, 200.00, 300.00, 1798.00,
    'refunded', 'cancelled',
    'Cancelled due to venue unavailability.'
WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE user_id = @cust3_id AND event_name = 'Birthday Garden Party');

SET @booking3_id = (SELECT booking_id FROM bookings WHERE user_id = @cust3_id AND event_name = 'Birthday Garden Party');

INSERT INTO vendor_orders (booking_id, vendor_id, subtotal, status)
SELECT @booking3_id, @vendor2_id, 1200.00, 'cancelled'
WHERE NOT EXISTS (SELECT 1 FROM vendor_orders WHERE booking_id = @booking3_id AND vendor_id = @vendor2_id);

SET @vo3_id = (SELECT vendor_order_id FROM vendor_orders WHERE booking_id = @booking3_id AND vendor_id = @vendor2_id);

INSERT INTO booking_items (vendor_order_id, booking_id, vendor_id, equipment_id, quantity, price_per_day, days, total_price, item_status)
SELECT @vo3_id, @booking3_id, @vendor2_id, @eq_fairy_id, 1, 1200.00, 1, 1200.00, 'cancelled'
WHERE NOT EXISTS (SELECT 1 FROM booking_items WHERE vendor_order_id = @vo3_id AND equipment_id = @eq_fairy_id);

-- Original payment (succeeded before cancellation)
INSERT INTO payments (booking_id, amount, type, method, currency, transaction_id, status, payment_date)
SELECT @booking3_id, 1798.00, 'full', 'upi', 'INR', 'TXN-B3-BDAY-001', 'success', '2025-09-01 16:00:00'
WHERE NOT EXISTS (SELECT 1 FROM payments WHERE booking_id = @booking3_id AND transaction_id = 'TXN-B3-BDAY-001');

-- Refund payment
INSERT INTO payments (booking_id, amount, type, method, currency, transaction_id, status, refund_reference, payment_date)
SELECT @booking3_id, 1798.00, 'refund', 'upi', 'INR', 'TXN-B3-REFUND-001', 'refunded', 'TXN-B3-BDAY-001', '2025-09-03 10:00:00'
WHERE NOT EXISTS (SELECT 1 FROM payments WHERE booking_id = @booking3_id AND transaction_id = 'TXN-B3-REFUND-001');

-- Update coupon used_count
UPDATE coupons SET used_count = 1 WHERE code = 'WELCOME100' AND used_count = 0;

-- ============================================================
-- Availability Blocks (Maintenance)
-- ============================================================
INSERT INTO availability (equipment_id, start_date, end_date, quantity_blocked, reason, status)
SELECT @eq_speaker_id, '2026-05-01', '2026-05-03', 1, 'maintenance', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM availability
    WHERE equipment_id = @eq_speaker_id AND start_date = '2026-05-01' AND end_date = '2026-05-03'
);

-- ============================================================
-- Payouts (for completed Booking 2 vendor order)
-- Gross: 2400.00, Commission (10%): 240.00, Net: 2160.00
-- ============================================================
INSERT INTO payouts (vendor_id, vendor_order_id, gross_amount, commission_amount, net_amount, status, paid_at)
SELECT @vendor1_id, @vo2_id, 2400.00, 240.00, 2160.00, 'paid', '2025-08-25 15:00:00'
WHERE NOT EXISTS (SELECT 1 FROM payouts WHERE vendor_order_id = @vo2_id);

-- ============================================================
-- Cart Items
-- ============================================================
INSERT INTO cart_items (user_id, equipment_id, quantity, start_date, end_date)
SELECT @cust1_id, @eq_mic_id, 1, '2026-07-10', '2026-07-12'
WHERE NOT EXISTS (
    SELECT 1 FROM cart_items
    WHERE user_id = @cust1_id AND equipment_id = @eq_mic_id
      AND start_date = '2026-07-10' AND end_date = '2026-07-12'
);

-- ============================================================
-- Wishlist
-- ============================================================
INSERT INTO wishlist (user_id, equipment_id)
SELECT @cust1_id, @eq_fairy_id
WHERE NOT EXISTS (SELECT 1 FROM wishlist WHERE user_id = @cust1_id AND equipment_id = @eq_fairy_id);

INSERT INTO wishlist (user_id, equipment_id)
SELECT @cust2_id, @eq_speaker_id
WHERE NOT EXISTS (SELECT 1 FROM wishlist WHERE user_id = @cust2_id AND equipment_id = @eq_speaker_id);

-- ============================================================
-- Notifications
-- ============================================================
SET @v1_user_id = (SELECT user_id FROM users WHERE firebase_uid = 'dev-vendor-1-uid-replace-me');

INSERT INTO notifications (user_id, type, title, message, is_read)
SELECT @cust1_id, 'booking_confirmed', 'Booking Confirmed!', 'Your booking for Grand Wedding Reception has been confirmed.', 0
WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = @cust1_id AND title = 'Booking Confirmed!');

INSERT INTO notifications (user_id, type, title, message, is_read)
SELECT @v1_user_id, 'order_received', 'New Order Received', 'You have an incoming order for Grand Wedding Reception.', 1
WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = @v1_user_id AND title = 'New Order Received');

INSERT INTO notifications (user_id, type, title, message, is_read)
SELECT @cust2_id, 'return_processed', 'Return Inspected', 'Your equipment return for Corporate Annual Meet has been completed.', 0
WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = @cust2_id AND title = 'Return Inspected');

-- ============================================================
-- Messages (Direct message thread between Customer 1 and Vendor 1)
-- ============================================================
INSERT INTO messages (sender_id, receiver_id, equipment_id, body, is_read, created_at)
SELECT @cust1_id, @v1_user_id, @eq_speaker_id, 'Hi Suresh, can we arrange venue delivery for 8:00 AM on Dec 20?', 1, '2025-12-14 11:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM messages
    WHERE sender_id = @cust1_id AND receiver_id = @v1_user_id AND equipment_id = @eq_speaker_id
);

INSERT INTO messages (sender_id, receiver_id, equipment_id, body, is_read, created_at)
SELECT @v1_user_id, @cust1_id, @eq_speaker_id, 'Hello Aisha, yes! 8:00 AM delivery to Taj Lands End is scheduled.', 0, '2025-12-14 11:20:00'
WHERE NOT EXISTS (
    SELECT 1 FROM messages
    WHERE sender_id = @v1_user_id AND receiver_id = @cust1_id AND equipment_id = @eq_speaker_id
);

