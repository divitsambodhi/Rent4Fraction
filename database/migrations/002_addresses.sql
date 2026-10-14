-- =============================================================================
-- Migration 002 — addresses
-- =============================================================================

CREATE TABLE IF NOT EXISTS addresses (
    address_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    BIGINT UNSIGNED NOT NULL,
    label      VARCHAR(100),
    line1      VARCHAR(255)    NOT NULL,
    line2      VARCHAR(255),
    city       VARCHAR(100)    NOT NULL,
    state      VARCHAR(100)    NOT NULL,
    pincode    VARCHAR(20)     NOT NULL,
    country    VARCHAR(100)    NOT NULL DEFAULT 'India',
    is_default TINYINT(1)      NOT NULL DEFAULT 0,
    created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (address_id),
    INDEX idx_addresses_user_id (user_id),
    CONSTRAINT fk_addresses_user_id
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
