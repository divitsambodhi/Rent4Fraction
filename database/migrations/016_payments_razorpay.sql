-- =============================================================================
-- Migration 016 — payments (Razorpay enhancements), webhook_events, idempotency_keys
-- Statements are separated by:  -- //
-- The migration runner splits on that marker; DELIMITER is NOT used.
-- Compatible with MySQL 8.0.16+ and 8.4 LTS
-- =============================================================================

-- ── 1. Alter payments: add Razorpay gateway, refund, and attempt tracking ────
ALTER TABLE payments
    ADD COLUMN gateway_order_id      VARCHAR(64)   NULL AFTER transaction_id,
    ADD COLUMN gateway_refund_id     VARCHAR(64)   NULL AFTER gateway_order_id,
    ADD COLUMN signature_verified    TINYINT(1)    NOT NULL DEFAULT 0 AFTER gateway_refund_id,
    ADD COLUMN captured_at           DATETIME      NULL AFTER payment_date,
    ADD COLUMN failure_code          VARCHAR(100)  NULL AFTER captured_at,
    ADD COLUMN failure_reason        VARCHAR(255)  NULL AFTER failure_code,
    ADD COLUMN refund_of_payment_id  BIGINT UNSIGNED NULL AFTER failure_reason,
    ADD COLUMN vendor_order_id       BIGINT UNSIGNED NULL AFTER refund_of_payment_id,
    ADD COLUMN idempotency_key       VARCHAR(80)   NULL AFTER vendor_order_id,
    ADD COLUMN attempt_no            SMALLINT      NOT NULL DEFAULT 1 AFTER idempotency_key,
    ADD COLUMN raw_gateway_status    VARCHAR(40)   NULL AFTER attempt_no,
    ADD UNIQUE KEY uq_payments_gateway_order_id  (gateway_order_id),
    ADD UNIQUE KEY uq_payments_gateway_refund_id (gateway_refund_id),
    ADD INDEX idx_payments_booking_status (booking_id, status),
    ADD CONSTRAINT fk_payments_refund_of_payment_id
        FOREIGN KEY (refund_of_payment_id) REFERENCES payments (payment_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_payments_vendor_order_id
        FOREIGN KEY (vendor_order_id) REFERENCES vendor_orders (vendor_order_id) ON DELETE RESTRICT;

-- //

-- ── 2. Create table webhook_events ────────────────────────────────────────────
-- Deduplicates gateway deliveries (e.g., Razorpay unique event headers)
CREATE TABLE IF NOT EXISTS webhook_events (
    webhook_event_id  BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    provider          ENUM('razorpay') NOT NULL,
    provider_event_id VARCHAR(100)     NOT NULL,
    event_type        VARCHAR(60)      NOT NULL,
    signature_valid   TINYINT(1)       NOT NULL,
    payload           JSON             NOT NULL,
    status            ENUM('received','processed','ignored','failed') NOT NULL DEFAULT 'received',
    attempts          INT              NOT NULL DEFAULT 0,
    error_message     VARCHAR(500)     NULL,
    received_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at      DATETIME         NULL,
    PRIMARY KEY (webhook_event_id),
    UNIQUE KEY uq_webhook_provider_event (provider, provider_event_id),
    INDEX idx_webhook_status (status),
    INDEX idx_webhook_received_at (received_at),
    CONSTRAINT chk_webhook_payload_valid CHECK (JSON_VALID(payload))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- //

-- ── 3. Create table idempotency_keys ─────────────────────────────────────────
-- Persistent idempotency store across FastAPI mutation endpoints
CREATE TABLE IF NOT EXISTS idempotency_keys (
    user_id         BIGINT UNSIGNED NOT NULL,
    endpoint        VARCHAR(80)     NOT NULL,
    idempotency_key VARCHAR(80)     NOT NULL,
    request_hash    CHAR(64)        NOT NULL,
    response_status SMALLINT        NULL,
    response_body   JSON            NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      DATETIME        NOT NULL,
    PRIMARY KEY (user_id, endpoint, idempotency_key),
    INDEX idx_idempotency_expires_at (expires_at),
    CONSTRAINT fk_idempotency_keys_user_id
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- //
