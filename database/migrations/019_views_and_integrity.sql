-- =============================================================================
-- Migration 019 — views and integrity triggers (payout exactness & vendor dashboard)
-- Statements are separated by:  -- //
-- The migration runner splits on that marker; DELIMITER is NOT used.
-- Compatible with MySQL 8.0.16+ and 8.4 LTS
-- =============================================================================

-- ── 1. View: v_payout_breakdown ──────────────────────────────────────────────
-- Exposes per-vendor-order and per-item financial breakdowns
CREATE OR REPLACE VIEW v_payout_breakdown AS
SELECT
    p.payout_id,
    p.vendor_id,
    v.business_name,
    vo.vendor_order_id,
    vo.booking_id,
    p.status AS payout_status,
    bi.booking_item_id,
    bi.equipment_id,
    e.name AS equipment_name,
    bi.quantity,
    bi.price_per_day,
    bi.days,
    bi.total_price AS item_gross,
    bi.commission_rate,
    bi.commission_amount AS item_commission,
    (bi.total_price - bi.commission_amount) AS item_net,
    p.gross_amount AS payout_gross,
    p.commission_amount AS payout_commission,
    p.net_amount AS payout_net,
    p.paid_at
FROM payouts p
JOIN vendors v ON v.vendor_id = p.vendor_id
JOIN vendor_orders vo ON vo.vendor_order_id = p.vendor_order_id
JOIN booking_items bi ON bi.vendor_order_id = vo.vendor_order_id
JOIN equipment e ON e.equipment_id = bi.equipment_id;
-- //

-- ── 2. Update View: v_vendor_dashboard ───────────────────────────────────────
-- Preserves all column names; total_earnings is the SUM of payouts.net_amount for paid/processing payouts
CREATE OR REPLACE VIEW v_vendor_dashboard AS
SELECT
    v.vendor_id,
    v.business_name,
    v.approval_status,
    COALESCE(eq.equipment_count, 0)   AS equipment_count,
    COALESCE(ord.pending_orders, 0)   AS pending_orders,
    COALESCE(ord.active_orders, 0)    AS active_orders,
    COALESCE(ord.completed_orders, 0) AS completed_orders,
    COALESCE(pay.total_earnings, 0.00) AS total_earnings,
    COALESCE(rev.avg_rating, 0.00)    AS avg_rating,
    COALESCE(rev.total_reviews, 0)    AS total_reviews
FROM vendors v
LEFT JOIN (
    SELECT vendor_id, COUNT(*) AS equipment_count
    FROM equipment
    GROUP BY vendor_id
) eq ON eq.vendor_id = v.vendor_id
LEFT JOIN (
    SELECT
        vendor_id,
        COUNT(DISTINCT CASE WHEN status IN ('pending','accepted') THEN vendor_order_id END) AS pending_orders,
        COUNT(DISTINCT CASE WHEN status IN ('dispatched','delivered') THEN vendor_order_id END) AS active_orders,
        COUNT(DISTINCT CASE WHEN status = 'completed' THEN vendor_order_id END) AS completed_orders
    FROM vendor_orders
    GROUP BY vendor_id
) ord ON ord.vendor_id = v.vendor_id
LEFT JOIN (
    SELECT
        vendor_id,
        COALESCE(SUM(net_amount), 0.00) AS total_earnings
    FROM payouts
    WHERE status IN ('processing', 'paid')
    GROUP BY vendor_id
) pay ON pay.vendor_id = v.vendor_id
LEFT JOIN (
    SELECT
        vendor_id,
        COALESCE(ROUND(AVG(rating), 2), 0.00) AS avg_rating,
        COUNT(*) AS total_reviews
    FROM reviews
    GROUP BY vendor_id
) rev ON rev.vendor_id = v.vendor_id;
-- //

-- ── 3. Triggers on payouts: gross & commission must match child item snapshots ─
DROP TRIGGER IF EXISTS trg_payouts_before_insert_integrity;
-- //

CREATE TRIGGER trg_payouts_before_insert_integrity
BEFORE INSERT ON payouts
FOR EACH ROW
BEGIN
    DECLARE v_expected_gross      DECIMAL(12,2);
    DECLARE v_expected_commission DECIMAL(12,2);

    -- Expected gross equals vendor_orders.subtotal
    SELECT subtotal
    INTO v_expected_gross
    FROM vendor_orders
    WHERE vendor_order_id = NEW.vendor_order_id;

    -- Expected commission equals the sum of item commission snapshots
    SELECT COALESCE(SUM(commission_amount), 0.00)
    INTO v_expected_commission
    FROM booking_items
    WHERE vendor_order_id = NEW.vendor_order_id;

    IF NEW.gross_amount <> v_expected_gross THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'payout gross_amount must equal vendor_order.subtotal';
    END IF;

    IF NEW.commission_amount <> v_expected_commission THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'payout commission_amount must equal the SUM of booking_items.commission_amount';
    END IF;
END;
-- //

DROP TRIGGER IF EXISTS trg_payouts_before_update_integrity;
-- //

CREATE TRIGGER trg_payouts_before_update_integrity
BEFORE UPDATE ON payouts
FOR EACH ROW
BEGIN
    DECLARE v_expected_gross      DECIMAL(12,2);
    DECLARE v_expected_commission DECIMAL(12,2);

    SELECT subtotal
    INTO v_expected_gross
    FROM vendor_orders
    WHERE vendor_order_id = NEW.vendor_order_id;

    SELECT COALESCE(SUM(commission_amount), 0.00)
    INTO v_expected_commission
    FROM booking_items
    WHERE vendor_order_id = NEW.vendor_order_id;

    IF NEW.gross_amount <> v_expected_gross THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'payout gross_amount must equal vendor_order.subtotal';
    END IF;

    IF NEW.commission_amount <> v_expected_commission THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'payout commission_amount must equal the SUM of booking_items.commission_amount';
    END IF;
END;

-- //
