-- =============================================================================
-- Migration 015 — booking snapshots, delivery address snapshots & vendor orders
-- Statements are separated by:  -- //
-- The migration runner splits on that marker; DELIMITER is NOT used.
-- Compatible with MySQL 8.0.16+ and 8.4 LTS
-- =============================================================================

-- ── 1. Alter booking_items: add snapshot columns & backfill ───────────────────
ALTER TABLE booking_items
    ADD COLUMN commission_rate   DECIMAL(5,2)  NOT NULL DEFAULT 0.00 AFTER total_price,
    ADD COLUMN commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER commission_rate,
    ADD COLUMN deposit_amount    DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER commission_amount,
    ADD CONSTRAINT chk_booking_items_commission_rate
        CHECK (commission_rate >= 0.00 AND commission_rate <= 100.00),
    ADD CONSTRAINT chk_booking_items_commission_amount
        CHECK (commission_amount >= 0.00 AND commission_amount <= total_price),
    ADD CONSTRAINT chk_booking_items_deposit_amount
        CHECK (deposit_amount >= 0.00);
-- //

-- ── 2. Backfill existing booking_items rows ───────────────────────────────────
UPDATE booking_items bi
JOIN equipment e ON e.equipment_id = bi.equipment_id
SET
    bi.commission_rate   = get_effective_commission(bi.equipment_id),
    bi.commission_amount = ROUND(bi.total_price * get_effective_commission(bi.equipment_id) / 100.0, 2),
    bi.deposit_amount    = ROUND(e.security_deposit * bi.quantity, 2);
-- //

-- ── 3. Trigger: prevent mutation of booking_items financial snapshots ─────────
DROP TRIGGER IF EXISTS trg_booking_items_before_update_snapshots;
-- //

CREATE TRIGGER trg_booking_items_before_update_snapshots
BEFORE UPDATE ON booking_items

FOR EACH ROW
BEGIN
    IF OLD.commission_rate <> NEW.commission_rate
       OR OLD.commission_amount <> NEW.commission_amount
       OR OLD.deposit_amount <> NEW.deposit_amount
       OR OLD.price_per_day <> NEW.price_per_day
       OR OLD.total_price <> NEW.total_price THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'booking_items financial snapshots (commission_rate, commission_amount, deposit_amount, price_per_day, total_price) are immutable';
    END IF;
END;
-- //

-- ── 4. Alter bookings: add address snapshot and cancellation audit fields ─────
-- We add delivery_address_snapshot as NULLABLE first so we can backfill existing rows
ALTER TABLE bookings
    ADD COLUMN delivery_address_snapshot JSON NULL AFTER venue_address,
    ADD COLUMN delivery_city VARCHAR(100) GENERATED ALWAYS AS (
        JSON_UNQUOTE(JSON_EXTRACT(delivery_address_snapshot, '$.city'))
    ) STORED AFTER delivery_address_snapshot,
    ADD COLUMN expires_at DATETIME NULL AFTER notes,
    ADD COLUMN cancelled_by ENUM('customer','vendor','admin','system') NULL AFTER expires_at,
    ADD COLUMN cancelled_reason VARCHAR(255) NULL AFTER cancelled_by,
    ADD COLUMN cancelled_at DATETIME NULL AFTER cancelled_reason;
-- //

-- ── 5. Backfill delivery_address_snapshot from addresses and users ────────────
UPDATE bookings b
JOIN addresses a ON a.address_id = b.address_id
JOIN users u     ON u.user_id = b.user_id
SET b.delivery_address_snapshot = JSON_OBJECT(
    'name',     COALESCE(u.name, 'Customer'),
    'phone',    COALESCE(u.phone, ''),
    'line1',    a.line1,
    'line2',    COALESCE(a.line2, ''),
    'city',     a.city,
    'state',    a.state,
    'pincode',  a.pincode,
    'country',  a.country
);
-- //

-- Backfill cancelled bookings audit metadata
UPDATE bookings
SET
    cancelled_by     = 'customer',
    cancelled_reason = notes,
    cancelled_at     = updated_at
WHERE status = 'cancelled' AND cancelled_at IS NULL;
-- //

-- ── 6. Enforce NOT NULL and JSON_VALID on delivery_address_snapshot ───────────
ALTER TABLE bookings
    MODIFY COLUMN delivery_address_snapshot JSON NOT NULL,
    ADD CONSTRAINT chk_bookings_address_snapshot_valid
        CHECK (JSON_VALID(delivery_address_snapshot)),
    ADD INDEX idx_bookings_status_payment_expires (status, payment_status, expires_at),
    ADD INDEX idx_bookings_delivery_city (delivery_city);
-- //

-- ── 7. Alter vendor_orders: add fulfilment_type and delivery_fee ──────────────
ALTER TABLE vendor_orders
    ADD COLUMN fulfilment_type ENUM('delivery','pickup') NOT NULL DEFAULT 'delivery' AFTER subtotal,
    ADD COLUMN delivery_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER fulfilment_type,
    ADD CONSTRAINT chk_vendor_orders_delivery_fee
        CHECK (delivery_fee >= 0.00);
-- //

-- ── 8. Backfill vendor_orders delivery_fee from deliveries if available ───────
UPDATE vendor_orders vo
JOIN bookings b ON b.booking_id = vo.booking_id
JOIN (
    SELECT booking_id, COUNT(*) AS vo_count
    FROM vendor_orders
    GROUP BY booking_id
) counts ON counts.booking_id = b.booking_id
SET vo.delivery_fee = b.delivery_fee
WHERE counts.vo_count = 1;
-- //

