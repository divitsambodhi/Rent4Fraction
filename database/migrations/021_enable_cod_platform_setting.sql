-- =============================================================================
-- Migration 021 — Enable Cash on Delivery (COD) in platform_settings
-- Statements are separated by:  -- //
-- Compatible with MySQL 8.0.16+ and 8.4 LTS
-- =============================================================================

-- ── 1. Ensure cod_enabled is set to '1' (enabled) in platform_settings ────────
INSERT INTO platform_settings (setting_key, setting_value, value_type, description, is_placeholder)
VALUES
    ('cod_enabled', '1', 'bool', 'Cash on delivery enabled toggle (0=disabled, 1=enabled)', 0)
ON DUPLICATE KEY UPDATE
    setting_value  = '1',
    is_placeholder = 0,
    updated_at     = CURRENT_TIMESTAMP;
-- //

