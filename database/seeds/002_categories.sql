-- =============================================================================
-- Seed 002 — Category tree
-- Idempotent: ON DUPLICATE KEY UPDATE on UNIQUE(parent_id, name).
-- Top-level categories have parent_id = NULL.
-- =============================================================================

-- ── Top-level categories ─────────────────────────────────────────────────────
INSERT INTO categories (name, description, parent_id, is_active)
SELECT 'Sound', 'Audio and sound equipment for events', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Sound' AND parent_id IS NULL);

INSERT INTO categories (name, description, parent_id, is_active)
SELECT 'Lighting', 'Lighting rigs, spots and decorative lights', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Lighting' AND parent_id IS NULL);

INSERT INTO categories (name, description, parent_id, is_active)
SELECT 'Furniture', 'Tables, chairs and seating for events', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Furniture' AND parent_id IS NULL);

INSERT INTO categories (name, description, parent_id, is_active)
SELECT 'Tents & Decor', 'Tent structures and decorative elements', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Tents & Decor' AND parent_id IS NULL);

-- ── Sub-categories — Sound ───────────────────────────────────────────────────
INSERT INTO categories (name, description, parent_id, is_active)
SELECT new_data.name, new_data.description, c.category_id, 1
FROM (
    SELECT 'Speakers'      AS name, 'PA speakers, subwoofers and monitor speakers' AS description UNION ALL
    SELECT 'Microphones',           'Wired and wireless microphone systems'                       UNION ALL
    SELECT 'DJ Equipment',          'DJ consoles, mixers and turntables'
) AS new_data
JOIN categories c ON c.name = 'Sound' AND c.parent_id IS NULL
AS alias_row
ON DUPLICATE KEY UPDATE
    description = alias_row.description,
    is_active   = 1;

-- ── Sub-categories — Lighting ────────────────────────────────────────────────
INSERT INTO categories (name, description, parent_id, is_active)
SELECT new_data.name, new_data.description, c.category_id, 1
FROM (
    SELECT 'Stage Lights' AS name, 'LED par cans, moving heads and wash lights' AS description UNION ALL
    SELECT 'Fairy Lights',         'String lights and canopy lighting'
) AS new_data
JOIN categories c ON c.name = 'Lighting' AND c.parent_id IS NULL
AS alias_row
ON DUPLICATE KEY UPDATE
    description = alias_row.description,
    is_active   = 1;

-- ── Sub-categories — Furniture ────────────────────────────────────────────────
INSERT INTO categories (name, description, parent_id, is_active)
SELECT new_data.name, new_data.description, c.category_id, 1
FROM (
    SELECT 'Chairs' AS name, 'Folding, banquet and Chiavari chairs' AS description UNION ALL
    SELECT 'Tables',         'Round, rectangular and cocktail tables'
) AS new_data
JOIN categories c ON c.name = 'Furniture' AND c.parent_id IS NULL
AS alias_row
ON DUPLICATE KEY UPDATE
    description = alias_row.description,
    is_active   = 1;
