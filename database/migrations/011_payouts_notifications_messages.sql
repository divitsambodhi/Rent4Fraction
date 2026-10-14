-- =============================================================================
-- Migration 011 — payouts, notifications, messages
-- =============================================================================

CREATE TABLE IF NOT EXISTS payouts (
    payout_id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vendor_id         BIGINT UNSIGNED NOT NULL,
    vendor_order_id   BIGINT UNSIGNED NOT NULL,
    gross_amount      DECIMAL(12,2)   NOT NULL,
    commission_amount DECIMAL(12,2)   NOT NULL,
    net_amount        DECIMAL(12,2)   NOT NULL,
    status            ENUM('pending','processing','paid') NOT NULL DEFAULT 'pending',
    paid_at           DATETIME,
    created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (payout_id),
    UNIQUE KEY uq_payouts_vendor_order_id (vendor_order_id),
    INDEX idx_payouts_vendor_id (vendor_id),
    INDEX idx_payouts_status    (status),
    CONSTRAINT fk_payouts_vendor_id
        FOREIGN KEY (vendor_id)       REFERENCES vendors       (vendor_id)           ON DELETE RESTRICT,
    CONSTRAINT fk_payouts_vendor_order_id
        FOREIGN KEY (vendor_order_id) REFERENCES vendor_orders (vendor_order_id)     ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS notifications (
    notification_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    type            VARCHAR(100)    NOT NULL,
    title           VARCHAR(255)    NOT NULL,
    message         TEXT            NOT NULL,
    is_read         TINYINT(1)      NOT NULL DEFAULT 0,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notification_id),
    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_is_read (is_read),
    CONSTRAINT fk_notifications_user_id
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS messages (
    message_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sender_id    BIGINT UNSIGNED NOT NULL,
    receiver_id  BIGINT UNSIGNED NOT NULL,
    equipment_id BIGINT UNSIGNED,
    body         TEXT            NOT NULL,
    is_read      TINYINT(1)      NOT NULL DEFAULT 0,
    created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id),
    INDEX idx_messages_sender_id    (sender_id),
    INDEX idx_messages_receiver_id  (receiver_id),
    INDEX idx_messages_equipment_id (equipment_id),
    CONSTRAINT fk_messages_sender_id
        FOREIGN KEY (sender_id)    REFERENCES users     (user_id)      ON DELETE RESTRICT,
    CONSTRAINT fk_messages_receiver_id
        FOREIGN KEY (receiver_id)  REFERENCES users     (user_id)      ON DELETE RESTRICT,
    CONSTRAINT fk_messages_equipment_id
        FOREIGN KEY (equipment_id) REFERENCES equipment (equipment_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
