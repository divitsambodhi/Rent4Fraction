-- =============================================================================
-- Migration 008 — deliveries, returns, return_items, damage_reports
-- =============================================================================

CREATE TABLE IF NOT EXISTS deliveries (
    delivery_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vendor_order_id BIGINT UNSIGNED NOT NULL,
    type            ENUM('delivery','pickup') NOT NULL DEFAULT 'delivery',
    scheduled_start DATETIME,
    scheduled_end   DATETIME,
    delivery_date   DATETIME,
    status          ENUM('scheduled','out_for_delivery','delivered','failed') NOT NULL DEFAULT 'scheduled',
    tracking_info   TEXT,
    delivered_by    VARCHAR(255),
    proof_url       VARCHAR(500),
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (delivery_id),
    UNIQUE KEY uq_deliveries_vendor_order_id (vendor_order_id),
    CONSTRAINT fk_deliveries_vendor_order_id
        FOREIGN KEY (vendor_order_id) REFERENCES vendor_orders (vendor_order_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS returns (
    return_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vendor_order_id BIGINT UNSIGNED NOT NULL,
    return_date     DATE,
    status          ENUM('scheduled','returned','late','incomplete') NOT NULL DEFAULT 'scheduled',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (return_id),
    UNIQUE KEY uq_returns_vendor_order_id (vendor_order_id),
    CONSTRAINT fk_returns_vendor_order_id
        FOREIGN KEY (vendor_order_id) REFERENCES vendor_orders (vendor_order_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS return_items (
    return_item_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    return_id         BIGINT UNSIGNED NOT NULL,
    booking_item_id   BIGINT UNSIGNED NOT NULL,
    quantity_returned INT             NOT NULL,
    condition         ENUM('good','minor_damage','major_damage','lost') NOT NULL DEFAULT 'good',
    PRIMARY KEY (return_item_id),
    INDEX idx_return_items_return_id       (return_id),
    INDEX idx_return_items_booking_item_id (booking_item_id),
    CONSTRAINT fk_return_items_return_id
        FOREIGN KEY (return_id)       REFERENCES returns       (return_id)           ON DELETE CASCADE,
    CONSTRAINT fk_return_items_booking_item_id
        FOREIGN KEY (booking_item_id) REFERENCES booking_items (booking_item_id)     ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS damage_reports (
    report_id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    return_item_id        BIGINT UNSIGNED NOT NULL,
    description           TEXT            NOT NULL,
    damage_cost           DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    deducted_from_deposit TINYINT(1)      NOT NULL DEFAULT 0,
    status                ENUM('reported','disputed','resolved') NOT NULL DEFAULT 'reported',
    images_notes          TEXT,
    resolved_by           BIGINT UNSIGNED,
    created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (report_id),
    UNIQUE KEY uq_damage_reports_return_item_id (return_item_id),
    INDEX idx_damage_reports_resolved_by (resolved_by),
    CONSTRAINT fk_damage_reports_return_item_id
        FOREIGN KEY (return_item_id) REFERENCES return_items (return_item_id) ON DELETE RESTRICT,
    CONSTRAINT fk_damage_reports_resolved_by
        FOREIGN KEY (resolved_by)    REFERENCES users        (user_id)        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
