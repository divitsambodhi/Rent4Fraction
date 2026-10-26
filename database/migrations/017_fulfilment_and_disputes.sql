-- =============================================================================
-- Migration 017 — fulfilment windows, damage dispute fields, order_events, notifications
-- Statements are separated by:  -- //
-- The migration runner splits on that marker; DELIMITER is NOT used.
-- Compatible with MySQL 8.0.16+ and 8.4 LTS
-- =============================================================================

-- ── 1. Alter returns: add scheduled window and note ───────────────────────────
ALTER TABLE returns
    ADD COLUMN scheduled_start DATETIME NULL AFTER return_date,
    ADD COLUMN scheduled_end   DATETIME NULL AFTER scheduled_start,
    ADD COLUMN note            VARCHAR(255) NULL AFTER status,
    ADD CONSTRAINT chk_returns_scheduled_window
        CHECK (scheduled_start IS NULL OR scheduled_end IS NULL OR scheduled_end >= scheduled_start);
-- //

-- ── 2. Alter damage_reports: add dispute, resolution note, and bounded final_cost
ALTER TABLE damage_reports
    ADD COLUMN dispute_reason  TEXT            NULL AFTER images_notes,
    ADD COLUMN disputed_at     DATETIME        NULL AFTER dispute_reason,
    ADD COLUMN resolution_note TEXT            NULL AFTER disputed_at,
    ADD COLUMN resolved_at     DATETIME        NULL AFTER resolution_note,
    ADD COLUMN final_cost      DECIMAL(12,2)   NULL AFTER resolved_at,
    ADD CONSTRAINT chk_damage_reports_final_cost
        CHECK (final_cost IS NULL OR (final_cost >= 0.00 AND final_cost <= damage_cost));
-- //

-- ── 3. Create table order_events (timeline log) ───────────────────────────────
CREATE TABLE IF NOT EXISTS order_events (
    order_event_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    booking_id      BIGINT UNSIGNED NOT NULL,
    vendor_order_id BIGINT UNSIGNED NULL,
    actor_user_id   BIGINT UNSIGNED NULL,
    actor_role      ENUM('customer','vendor','admin','system') NOT NULL,
    event_type      VARCHAR(60)     NOT NULL,
    from_status     VARCHAR(30)     NULL,
    to_status       VARCHAR(30)     NULL,
    note            VARCHAR(255)    NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (order_event_id),
    INDEX idx_order_events_booking_id      (booking_id),
    INDEX idx_order_events_vendor_order_id (vendor_order_id),
    INDEX idx_order_events_created_at      (created_at),
    CONSTRAINT fk_order_events_booking_id
        FOREIGN KEY (booking_id) REFERENCES bookings (booking_id) ON DELETE CASCADE,
    CONSTRAINT fk_order_events_vendor_order_id
        FOREIGN KEY (vendor_order_id) REFERENCES vendor_orders (vendor_order_id) ON DELETE CASCADE,
    CONSTRAINT fk_order_events_actor_user_id
        FOREIGN KEY (actor_user_id) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- //

-- ── 4. Trigger: order_events is append-only ───────────────────────────────────
DROP TRIGGER IF EXISTS trg_order_events_before_update;
-- //

CREATE TRIGGER trg_order_events_before_update
BEFORE UPDATE ON order_events
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'order_events is append-only: updates are prohibited';
END;
-- //

DROP TRIGGER IF EXISTS trg_order_events_before_delete;
-- //

CREATE TRIGGER trg_order_events_before_delete
BEFORE DELETE ON order_events
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'order_events is append-only: deletions are prohibited';
END;

-- //

-- ── 5. Alter notifications: add deep-link entity targets ──────────────────────
ALTER TABLE notifications
    ADD COLUMN entity_type VARCHAR(30)     NULL AFTER is_read,
    ADD COLUMN entity_id   BIGINT UNSIGNED NULL AFTER entity_type,
    ADD INDEX idx_notifications_entity (entity_type, entity_id);
-- //
