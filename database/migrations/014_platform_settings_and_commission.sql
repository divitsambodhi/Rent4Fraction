-- =============================================================================
-- Migration 014 — platform_settings, commission overrides & effective rate function
-- Statements are separated by:  -- //
-- The migration runner splits on that marker; DELIMITER is NOT used.
-- Compatible with MySQL 8.0.16+ and 8.4 LTS
-- =============================================================================

-- ── 1. Create table platform_settings ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
    setting_key    VARCHAR(60)  NOT NULL,
    setting_value  VARCHAR(255) NOT NULL,
    value_type     ENUM('string','int','decimal','bool') NOT NULL DEFAULT 'string',
    description    VARCHAR(255) NULL,
    is_placeholder TINYINT(1)   NOT NULL DEFAULT 1,
    updated_by     BIGINT UNSIGNED NULL,
    updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_key),
    CONSTRAINT fk_platform_settings_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- //

-- ── 2. Seed default platform settings ─────────────────────────────────────────
INSERT INTO platform_settings (setting_key, setting_value, value_type, description, is_placeholder)
VALUES
    ('default_commission_rate', '10.00', 'decimal', 'Default platform commission percentage across all equipment', 1),
    ('tax_rate_percent',        '18.00', 'decimal', 'GST/VAT percentage applied on subtotal (confirm with accountant)', 1),
    ('payment_hold_minutes',    '15',    'int',     'Minutes unpaid bookings are held before expiration', 1),
    ('cod_enabled',             '0',     'bool',    'Cash on delivery enabled toggle (0=disabled, 1=enabled)', 1),
    ('currency',                'INR',   'string',  'Default transaction currency code', 1)
ON DUPLICATE KEY UPDATE
    setting_value  = VALUES(setting_value),
    value_type     = VALUES(value_type),
    description    = VALUES(description),
    is_placeholder = VALUES(is_placeholder);
-- //

-- ── 3. Alter equipment: add commission_rate override ──────────────────────────
ALTER TABLE equipment
    ADD COLUMN commission_rate DECIMAL(5,2) NULL AFTER min_rental_days,
    ADD CONSTRAINT chk_equipment_commission_rate
        CHECK (commission_rate IS NULL OR (commission_rate >= 0.00 AND commission_rate <= 100.00));
-- //

-- ── 4. Alter categories: add default_commission_rate ──────────────────────────
ALTER TABLE categories
    ADD COLUMN default_commission_rate DECIMAL(5,2) NULL AFTER description,
    ADD CONSTRAINT chk_categories_default_commission_rate
        CHECK (default_commission_rate IS NULL OR (default_commission_rate >= 0.00 AND default_commission_rate <= 100.00));
-- //

-- ── 5. Alter vendors: make commission_rate nullable and add delivery_fee ───────
ALTER TABLE vendors
    MODIFY COLUMN commission_rate DECIMAL(5,2) NULL,
    ADD COLUMN delivery_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER commission_rate,
    ADD CONSTRAINT chk_vendors_delivery_fee
        CHECK (delivery_fee >= 0.00);
-- //

-- ── 6. Stored Function: get_effective_commission ─────────────────────────────
-- Precedence:
--  1. equipment.commission_rate (if NOT NULL)
--  2. categories.default_commission_rate (direct category, if NOT NULL)
--  3. categories.default_commission_rate (parent category, if NOT NULL)
--  4. vendors.commission_rate (if NOT NULL)
--  5. platform_settings.default_commission_rate (fallback, default 10.00)
DROP FUNCTION IF EXISTS get_effective_commission;
-- //

CREATE FUNCTION get_effective_commission(
    p_equipment_id BIGINT UNSIGNED
)

RETURNS DECIMAL(5,2)
READS SQL DATA
NOT DETERMINISTIC
BEGIN
    DECLARE v_eq_rate       DECIMAL(5,2);
    DECLARE v_cat_rate      DECIMAL(5,2);
    DECLARE v_parent_rate   DECIMAL(5,2);
    DECLARE v_vend_rate     DECIMAL(5,2);
    DECLARE v_platform_rate DECIMAL(5,2);

    IF p_equipment_id IS NULL THEN
        RETURN 10.00;
    END IF;

    -- Query rates from equipment, category, parent category, and vendor
    SELECT
        e.commission_rate,
        c.default_commission_rate,
        p.default_commission_rate,
        v.commission_rate
    INTO
        v_eq_rate,
        v_cat_rate,
        v_parent_rate,
        v_vend_rate
    FROM equipment e
    JOIN vendors v ON v.vendor_id = e.vendor_id
    JOIN categories c ON c.category_id = e.category_id
    LEFT JOIN categories p ON p.category_id = c.parent_id
    WHERE e.equipment_id = p_equipment_id;

    -- 1. Equipment override
    IF v_eq_rate IS NOT NULL THEN
        RETURN v_eq_rate;
    END IF;

    -- 2. Direct category default
    IF v_cat_rate IS NOT NULL THEN
        RETURN v_cat_rate;
    END IF;

    -- 3. Parent category default
    IF v_parent_rate IS NOT NULL THEN
        RETURN v_parent_rate;
    END IF;

    -- 4. Vendor profile default
    IF v_vend_rate IS NOT NULL THEN
        RETURN v_vend_rate;
    END IF;

    -- 5. Platform settings fallback
    SELECT CAST(setting_value AS DECIMAL(5,2))
    INTO v_platform_rate
    FROM platform_settings
    WHERE setting_key = 'default_commission_rate';

    RETURN COALESCE(v_platform_rate, 10.00);
END;
-- //

-- ── 7. Stored Function: get_commission_source ────────────────────────────────
DROP FUNCTION IF EXISTS get_commission_source;
-- //

CREATE FUNCTION get_commission_source(
    p_equipment_id BIGINT UNSIGNED
)

RETURNS VARCHAR(10)
READS SQL DATA
NOT DETERMINISTIC
BEGIN
    DECLARE v_eq_rate     DECIMAL(5,2);
    DECLARE v_cat_rate    DECIMAL(5,2);
    DECLARE v_parent_rate DECIMAL(5,2);
    DECLARE v_vend_rate   DECIMAL(5,2);

    IF p_equipment_id IS NULL THEN
        RETURN 'platform';
    END IF;

    SELECT
        e.commission_rate,
        c.default_commission_rate,
        p.default_commission_rate,
        v.commission_rate
    INTO
        v_eq_rate,
        v_cat_rate,
        v_parent_rate,
        v_vend_rate
    FROM equipment e
    JOIN vendors v ON v.vendor_id = e.vendor_id
    JOIN categories c ON c.category_id = e.category_id
    LEFT JOIN categories p ON p.category_id = c.parent_id
    WHERE e.equipment_id = p_equipment_id;

    IF v_eq_rate IS NOT NULL THEN
        RETURN 'equipment';
    END IF;

    IF v_cat_rate IS NOT NULL OR v_parent_rate IS NOT NULL THEN
        RETURN 'category';
    END IF;

    IF v_vend_rate IS NOT NULL THEN
        RETURN 'vendor';
    END IF;

    RETURN 'platform';
END;
-- //

-- ── 8. View: v_equipment_commission ──────────────────────────────────────────
CREATE OR REPLACE VIEW v_equipment_commission AS
SELECT
    e.equipment_id,
    e.vendor_id,
    e.category_id,
    get_effective_commission(e.equipment_id) AS effective_rate,
    get_commission_source(e.equipment_id)    AS source
FROM equipment e;
-- //
