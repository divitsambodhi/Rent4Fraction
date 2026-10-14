-- =============================================================================
-- Migration 012 — Additional composite indexes + Views
-- Regular DDL; no stored programs; split on semicolons.
-- =============================================================================

-- ── Composite / filter indexes not already on tables ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_equipment_price        ON equipment  (price_per_day);
CREATE INDEX IF NOT EXISTS idx_equipment_avg_rating   ON equipment  (avg_rating);
CREATE INDEX IF NOT EXISTS idx_bookings_dates         ON bookings   (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_availability_eq_status ON availability (equipment_id, status);

-- ── View: v_vendor_dashboard ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_vendor_dashboard AS
SELECT
    v.vendor_id,
    v.business_name,
    v.approval_status,
    COUNT(DISTINCT e.equipment_id)                                                   AS equipment_count,
    COUNT(DISTINCT CASE WHEN vo.status IN ('pending','accepted') THEN vo.vendor_order_id END) AS pending_orders,
    COUNT(DISTINCT CASE WHEN vo.status IN ('dispatched','delivered') THEN vo.vendor_order_id END) AS active_orders,
    COUNT(DISTINCT CASE WHEN vo.status = 'completed' THEN vo.vendor_order_id END)    AS completed_orders,
    COALESCE(SUM(CASE WHEN vo.status = 'completed' THEN vo.subtotal ELSE 0 END), 0.00) AS total_earnings,
    COALESCE(ROUND(AVG(r.rating), 2), 0.00)                                          AS avg_rating,
    COUNT(DISTINCT r.review_id)                                                      AS total_reviews
FROM vendors v
LEFT JOIN equipment    e  ON e.vendor_id    = v.vendor_id
LEFT JOIN vendor_orders vo ON vo.vendor_id  = v.vendor_id
LEFT JOIN reviews       r  ON r.vendor_id   = v.vendor_id
GROUP BY v.vendor_id, v.business_name, v.approval_status;

-- ── View: v_vendor_incoming_orders ────────────────────────────────────────────
CREATE OR REPLACE VIEW v_vendor_incoming_orders AS
SELECT
    vo.vendor_order_id,
    vo.vendor_id,
    vo.booking_id,
    vo.status           AS order_status,
    vo.subtotal         AS order_subtotal,
    vo.rejection_reason,
    b.start_date,
    b.end_date,
    b.event_name,
    b.event_type,
    b.event_date,
    b.venue_address,
    b.status            AS booking_status,
    b.payment_status,
    u.user_id           AS customer_id,
    u.name              AS customer_name,
    u.email             AS customer_email,
    u.phone             AS customer_phone,
    GROUP_CONCAT(
        CONCAT(eq.name, ' x', bi.quantity, ' (', bi.days, 'd)')
        ORDER BY bi.booking_item_id
        SEPARATOR ' | '
    )                   AS items_summary
FROM vendor_orders   vo
JOIN bookings        b   ON b.booking_id      = vo.booking_id
JOIN users           u   ON u.user_id         = b.user_id
JOIN booking_items   bi  ON bi.vendor_order_id = vo.vendor_order_id
JOIN equipment       eq  ON eq.equipment_id    = bi.equipment_id
GROUP BY
    vo.vendor_order_id, vo.vendor_id, vo.booking_id, vo.status,
    vo.subtotal, vo.rejection_reason,
    b.start_date, b.end_date, b.event_name, b.event_type, b.event_date,
    b.venue_address, b.status, b.payment_status,
    u.user_id, u.name, u.email, u.phone;

-- ── View: v_customer_bookings ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_customer_bookings AS
SELECT
    b.booking_id,
    b.user_id,
    b.start_date,
    b.end_date,
    b.event_name,
    b.event_type,
    b.total_amount,
    b.status            AS booking_status,
    b.payment_status,
    GROUP_CONCAT(DISTINCT v.business_name  ORDER BY v.vendor_id SEPARATOR ', ')  AS vendors,
    GROUP_CONCAT(DISTINCT vo.status        ORDER BY vo.vendor_order_id SEPARATOR ', ') AS vendor_order_statuses,
    MAX(d.status)       AS latest_delivery_status,
    MAX(pay.status)     AS latest_payment_status
FROM bookings        b
LEFT JOIN vendor_orders vo  ON vo.booking_id      = b.booking_id
LEFT JOIN vendors       v   ON v.vendor_id         = vo.vendor_id
LEFT JOIN deliveries    d   ON d.vendor_order_id   = vo.vendor_order_id
LEFT JOIN payments      pay ON pay.booking_id       = b.booking_id
GROUP BY
    b.booking_id, b.user_id, b.start_date, b.end_date,
    b.event_name, b.event_type, b.total_amount, b.status, b.payment_status;

-- ── View: v_equipment_listing ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_equipment_listing AS
SELECT
    e.equipment_id,
    e.name,
    e.description,
    e.price_per_day,
    e.security_deposit,
    e.quantity,
    e.min_rental_days,
    e.delivery_available,
    e.avg_rating,
    e.review_count,
    e.specifications,
    v.vendor_id,
    v.business_name     AS vendor_name,
    c.category_id,
    c.name              AS category_name,
    pc.category_id      AS parent_category_id,
    pc.name             AS parent_category_name,
    ei.url              AS primary_image_url
FROM equipment       e
JOIN vendors         v   ON v.vendor_id    = e.vendor_id
JOIN categories      c   ON c.category_id  = e.category_id
LEFT JOIN categories pc  ON pc.category_id = c.parent_id
LEFT JOIN equipment_images ei ON ei.equipment_id = e.equipment_id AND ei.is_primary = 1
WHERE e.status = 'active'
  AND v.approval_status = 'approved';
