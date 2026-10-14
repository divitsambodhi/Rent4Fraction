-- =============================================================================
-- Migration 007 — payments
-- =============================================================================

CREATE TABLE IF NOT EXISTS payments (
    payment_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    booking_id       BIGINT UNSIGNED NOT NULL,
    amount           DECIMAL(12,2)   NOT NULL,
    type             ENUM('advance','full','deposit','refund','deposit_refund') NOT NULL,
    method           ENUM('upi','card','netbanking','cod','wallet') NOT NULL,
    gateway          VARCHAR(100),
    currency         VARCHAR(10)     NOT NULL DEFAULT 'INR',
    transaction_id   VARCHAR(255),
    status           ENUM('pending','success','failed','refunded') NOT NULL DEFAULT 'pending',
    refund_reference VARCHAR(255),
    payment_date     DATETIME,
    created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (payment_id),
    UNIQUE KEY uq_payments_transaction_id (transaction_id),
    INDEX idx_payments_booking_id (booking_id),
    INDEX idx_payments_status     (status),
    CONSTRAINT fk_payments_booking_id
        FOREIGN KEY (booking_id) REFERENCES bookings (booking_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
