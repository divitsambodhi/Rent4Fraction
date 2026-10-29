-- ============================================================================
-- Migration 020: Cloudinary Image Storage & Pending Uploads
-- Replaces Firebase Storage with Cloudinary Direct Signed Uploads.
-- Adds provider/public_id/version columns to media entities.
-- Creates pending_uploads table for signed upload verification and orphan cleanup.
-- ============================================================================

-- ── 1. Create pending_uploads table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_uploads (
    upload_id    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    owner_id     BIGINT UNSIGNED NOT NULL,
    kind         VARCHAR(50)     NOT NULL,
    entity_id    BIGINT UNSIGNED NULL,
    public_id    VARCHAR(255)    NOT NULL UNIQUE,
    asset_type   VARCHAR(20)     NOT NULL DEFAULT 'upload',
    status       VARCHAR(20)     NOT NULL DEFAULT 'pending',
    format       VARCHAR(10)     NULL,
    bytes        INT UNSIGNED    NULL,
    width        INT UNSIGNED    NULL,
    height       INT UNSIGNED    NULL,
    version      INT UNSIGNED    NULL,
    expires_at   DATETIME        NOT NULL,
    created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pending_uploads_owner FOREIGN KEY (owner_id) REFERENCES users (user_id) ON DELETE CASCADE,
    INDEX idx_pending_uploads_owner_kind (owner_id, kind),
    INDEX idx_pending_uploads_status_expires (status, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- //

-- ── 2. Alter equipment_images: add Cloudinary identifier metadata ───────────
ALTER TABLE equipment_images
    ADD COLUMN provider   VARCHAR(20)  NOT NULL DEFAULT 'cloudinary' AFTER equipment_id,
    ADD COLUMN public_id  VARCHAR(255) NULL AFTER storage_path,
    ADD COLUMN version    INT UNSIGNED NULL AFTER public_id,
    ADD COLUMN format     VARCHAR(10)  NULL AFTER version,
    ADD COLUMN bytes      INT UNSIGNED NULL AFTER format,
    ADD COLUMN alt_text   VARCHAR(255) NULL AFTER bytes;

-- //

-- ── 3. Alter vendors: add Cloudinary logo fields ─────────────────────────────
ALTER TABLE vendors
    ADD COLUMN logo_public_id VARCHAR(255) NULL AFTER logo_storage_path,
    ADD COLUMN logo_version   INT UNSIGNED NULL AFTER logo_public_id;

-- //

-- ── 4. Alter deliveries: add Cloudinary delivery proof fields ────────────────
ALTER TABLE deliveries
    ADD COLUMN proof_public_id VARCHAR(255) NULL AFTER proof_url,
    ADD COLUMN proof_version   INT UNSIGNED NULL AFTER proof_public_id;

-- //

-- ── 5. Alter damage_reports: add Cloudinary damage evidence fields ───────────
ALTER TABLE damage_reports
    ADD COLUMN evidence_public_id VARCHAR(255) NULL AFTER images_notes,
    ADD COLUMN evidence_version   INT UNSIGNED NULL AFTER evidence_public_id;

-- //

