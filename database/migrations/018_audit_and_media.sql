-- =============================================================================
-- Migration 018 — audit_log (append-only) and media metadata
-- Statements are separated by:  -- //
-- The migration runner splits on that marker; DELIMITER is NOT used.
-- Compatible with MySQL 8.0.16+ and 8.4 LTS
-- =============================================================================

-- ── 1. Create table audit_log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    audit_id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    actor_user_id   BIGINT UNSIGNED NULL,
    actor_role      VARCHAR(20)     NOT NULL,
    action          VARCHAR(80)     NOT NULL,
    entity_type     VARCHAR(40)     NOT NULL,
    entity_id       BIGINT UNSIGNED NULL,
    before_json     JSON            NULL,
    after_json      JSON            NULL,
    ip_address      VARCHAR(45)     NULL,
    user_agent      VARCHAR(255)    NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (audit_id),
    INDEX idx_audit_log_entity     (entity_type, entity_id),
    INDEX idx_audit_log_created_at (created_at),
    INDEX idx_audit_log_actor      (actor_user_id),
    CONSTRAINT fk_audit_log_actor_user_id
        FOREIGN KEY (actor_user_id) REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT chk_audit_log_before_json CHECK (before_json IS NULL OR JSON_VALID(before_json)),
    CONSTRAINT chk_audit_log_after_json  CHECK (after_json  IS NULL OR JSON_VALID(after_json))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- //

-- ── 2. Triggers: audit_log is strictly append-only ────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_log_before_update;
-- //

CREATE TRIGGER trg_audit_log_before_update
BEFORE UPDATE ON audit_log
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'audit_log is append-only: updates are prohibited';
END;
-- //

DROP TRIGGER IF EXISTS trg_audit_log_before_delete;
-- //

CREATE TRIGGER trg_audit_log_before_delete
BEFORE DELETE ON audit_log
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'audit_log is append-only: deletions are prohibited';
END;

-- //

-- ── 3. Alter equipment_images: add Cloud Storage & image dimension metadata ───
ALTER TABLE equipment_images
    ADD COLUMN storage_path      VARCHAR(500)  NULL AFTER url,
    ADD COLUMN width             INT UNSIGNED  NULL AFTER is_primary,
    ADD COLUMN height            INT UNSIGNED  NULL AFTER width,
    ADD COLUMN placeholder_color CHAR(7)       NULL AFTER height,
    ADD COLUMN content_type      VARCHAR(50)   NULL AFTER placeholder_color,
    ADD COLUMN size_bytes        INT UNSIGNED  NULL AFTER content_type;
-- //

-- ── 4. Alter vendors: add logo_storage_path ───────────────────────────────────
ALTER TABLE vendors
    ADD COLUMN logo_storage_path VARCHAR(500) NULL AFTER logo_url;
-- //
