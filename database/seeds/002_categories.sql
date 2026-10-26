-- =============================================================================
-- Seed 002 — Category tree
-- Idempotent: ON DUPLICATE KEY UPDATE on UNIQUE(parent_id, name).
-- Top-level categories have parent_id = NULL.
-- =============================================================================

-- ── Top-level categories ─────────────────────────────────────────────────────
INSERT INTO categories (name, description, default_commission_rate, parent_id, is_active)
SELECT 'Sound', 'Audio and sound equipment for events', 12.00, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Sound' AND parent_id IS NULL);

INSERT INTO categories (name, description, default_commission_rate, parent_id, is_active)
SELECT 'Lighting', 'Lighting rigs, spots and decorative lights', 10.00, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Lighting' AND parent_id IS NULL);

INSERT INTO categories (name, description, default_commission_rate, parent_id, is_active)
SELECT 'Furniture', 'Tables, chairs and seating for events', 15.00, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Furniture' AND parent_id IS NULL);

INSERT INTO categories (name, description, default_commission_rate, parent_id, is_active)
SELECT 'Tents & Decor', 'Tent structures and decorative elements', 15.00, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Tents & Decor' AND parent_id IS NULL);

-- ── Sub-categories — Sound ───────────────────────────────────────────────────
INSERT INTO categories (name, description, default_commission_rate, parent_id, is_active)
SELECT new_data.name, new_data.description, new_data.rate, c.category_id, 1
FROM (
    SELECT 'Speakers'      AS name, 'PA speakers, subwoofers and monitor speakers' AS description, 12.00 AS rate UNION ALL
    SELECT 'Microphones',           'Wired and wireless microphone systems',                       10.00         UNION ALL
    SELECT 'DJ Equipment',          'DJ consoles, mixers and turntables',                          14.00
) AS new_data
JOIN categories c ON c.name = 'Sound' AND c.parent_id IS NULL
ON DUPLICATE KEY UPDATE
    description             = VALUES(description),
    default_commission_rate = VALUES(default_commission_rate),
    is_active               = 1;

-- ── Sub-categories — Lighting ────────────────────────────────────────────────
INSERT INTO categories (name, description, default_commission_rate, parent_id, is_active)
SELECT new_data.name, new_data.description, new_data.rate, c.category_id, 1
FROM (
    SELECT 'Stage Lights' AS name, 'LED par cans, moving heads and wash lights' AS description, 10.00 AS rate UNION ALL
    SELECT 'Fairy Lights',         'String lights and canopy lighting',                         10.00
) AS new_data
JOIN categories c ON c.name = 'Lighting' AND c.parent_id IS NULL
ON DUPLICATE KEY UPDATE
    description             = VALUES(description),
    default_commission_rate = VALUES(default_commission_rate),
    is_active               = 1;

-- ── Sub-categories — Furniture ────────────────────────────────────────────────
INSERT INTO categories (name, description, default_commission_rate, parent_id, is_active)
SELECT new_data.name, new_data.description, new_data.rate, c.category_id, 1
FROM (
    SELECT 'Chairs' AS name, 'Folding, banquet and Chiavari chairs' AS description, 15.00 AS rate UNION ALL
    SELECT 'Tables',         'Round, rectangular and cocktail tables',              15.00
) AS new_data
JOIN categories c ON c.name = 'Furniture' AND c.parent_id IS NULL
ON DUPLICATE KEY UPDATE
    description             = VALUES(description),
    default_commission_rate = VALUES(default_commission_rate),
    is_active               = 1;

