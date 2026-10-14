-- =============================================================================
-- Migration 005 — coupons
-- =============================================================================

CREATE TABLE IF NOT EXISTS coupons (
    coupon_id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code             VARCHAR(50)     NOT NULL,
    type             ENUM('percent','flat') NOT NULL,
    value            DECIMAL(12,2)   NOT NULL,
    min_order_amount DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    valid_from       DATETIME        NOT NULL,
    valid_to         DATETIME        NOT NULL,
    usage_limit      INT UNSIGNED,
    used_count       INT UNSIGNED    NOT NULL DEFAULT 0,
    is_active        TINYINT(1)      NOT NULL DEFAULT 1,
    PRIMARY KEY (coupon_id),
    UNIQUE KEY uq_coupons_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
