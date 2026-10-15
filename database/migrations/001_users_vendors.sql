-- =============================================================================
-- Migration 001 — users, vendors
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    user_id        BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    firebase_uid   VARCHAR(128)     NOT NULL,
    name           VARCHAR(255)     NOT NULL,
    email          VARCHAR(255)     NOT NULL,
    phone          VARCHAR(20),
    role           ENUM('customer','vendor','admin') NOT NULL DEFAULT 'customer',
    is_active      TINYINT(1)       NOT NULL DEFAULT 1,
    email_verified TINYINT(1)       NOT NULL DEFAULT 0,
    last_login     DATETIME,
    created_at     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_firebase_uid (firebase_uid),
    UNIQUE KEY uq_users_email        (email),
    INDEX idx_users_role             (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS vendors (
    vendor_id       BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED  NOT NULL,
    business_name   VARCHAR(255)     NOT NULL,
    description     TEXT,
    address         TEXT,
    phone           VARCHAR(20),
    logo_url        VARCHAR(500),
    gst_number      VARCHAR(20),
    approval_status ENUM('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    approved_by     BIGINT UNSIGNED,
    approved_at     DATETIME,
    commission_rate DECIMAL(5,2)     NOT NULL DEFAULT 10.00,
    created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (vendor_id),
    CONSTRAINT chk_vendors_commission_rate
        CHECK (commission_rate >= 0.00 AND commission_rate <= 100.00),
    UNIQUE KEY uq_vendors_user_id (user_id),
    INDEX idx_vendors_approval_status (approval_status),
    CONSTRAINT fk_vendors_user_id
        FOREIGN KEY (user_id)    REFERENCES users (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_vendors_approved_by
        FOREIGN KEY (approved_by) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
