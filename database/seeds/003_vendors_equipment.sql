-- =============================================================================
-- Seed 003 — Vendors + equipment + images
-- Idempotent: ON DUPLICATE KEY UPDATE keyed on unique constraints.
-- vendor3 (Deepak / PartyEssentials) is left in 'pending' status.
-- =============================================================================

-- ── Resolve IDs into session variables ────────────────────────────────────────
SET @admin_id   = (SELECT user_id FROM users WHERE firebase_uid = 'dev-admin-uid-replace-me');
SET @v1_user_id = (SELECT user_id FROM users WHERE firebase_uid = 'dev-vendor-1-uid-replace-me');
SET @v2_user_id = (SELECT user_id FROM users WHERE firebase_uid = 'dev-vendor-2-uid-replace-me');
SET @v3_user_id = (SELECT user_id FROM users WHERE firebase_uid = 'dev-vendor-3-uid-replace-me');

-- ── Vendors ───────────────────────────────────────────────────────────────────
-- vendor1 — SoundMaster Pro (approved, 10% commission, 250 delivery fee)
INSERT INTO vendors (user_id, business_name, description, address, phone, logo_url, gst_number, approval_status, approved_by, approved_at, commission_rate, delivery_fee)
SELECT @v1_user_id,
       'SoundMaster Pro',
       'Premium audio equipment rental for weddings, corporate events and concerts.',
       '12 Andheri Industrial Area, Mumbai, Maharashtra 400053',
       '+91-9200000001',
       'https://placehold.co/200x200/1a1a2e/e94560?text=SMP',
       '27AABCU9603R1ZX',
       'approved',
       @admin_id,
       '2025-01-15 10:00:00',
       10.00,
       250.00
ON DUPLICATE KEY UPDATE
    business_name   = 'SoundMaster Pro',
    approval_status = 'approved',
    approved_by     = @admin_id,
    approved_at     = '2025-01-15 10:00:00',
    delivery_fee    = 250.00;

-- vendor2 — LightUp Events (approved, NULL commission inherits from category/platform, 200 delivery fee)
INSERT INTO vendors (user_id, business_name, description, address, phone, logo_url, gst_number, approval_status, approved_by, approved_at, commission_rate, delivery_fee)
SELECT @v2_user_id,
       'LightUp Events',
       'State-of-the-art lighting and furniture hire for every occasion.',
       '45 Koramangala 4th Block, Bengaluru, Karnataka 560034',
       '+91-9200000002',
       'https://placehold.co/200x200/0f3460/e94560?text=LUE',
       '29AADFL3456B1ZY',
       'approved',
       @admin_id,
       '2025-01-20 11:00:00',
       NULL,
       200.00
ON DUPLICATE KEY UPDATE
    business_name   = 'LightUp Events',
    approval_status = 'approved',
    approved_by     = @admin_id,
    approved_at     = '2025-01-20 11:00:00',
    delivery_fee    = 200.00;

-- vendor3 — Party Essentials (pending — not yet approved, 150 delivery fee)
INSERT INTO vendors (user_id, business_name, description, address, phone, logo_url, gst_number, approval_status, commission_rate, delivery_fee)
SELECT @v3_user_id,
       'Party Essentials',
       'One-stop shop for tents, furniture and decorative rentals.',
       '78 Lajpat Nagar II, New Delhi 110024',
       '+91-9200000003',
       'https://placehold.co/200x200/533483/e94560?text=PE',
       '07AACFP7890C1ZZ',
       'pending',
       NULL,
       150.00
ON DUPLICATE KEY UPDATE
    business_name   = 'Party Essentials',
    approval_status = 'pending',
    delivery_fee    = 150.00;


-- ── Resolve vendor_ids ────────────────────────────────────────────────────────
SET @vendor1_id = (SELECT vendor_id FROM vendors WHERE user_id = @v1_user_id);
SET @vendor2_id = (SELECT vendor_id FROM vendors WHERE user_id = @v2_user_id);
SET @vendor3_id = (SELECT vendor_id FROM vendors WHERE user_id = @v3_user_id);

-- ── Resolve category IDs ──────────────────────────────────────────────────────
SET @cat_sound_id        = (SELECT category_id FROM categories WHERE name = 'Sound'        AND parent_id IS NULL);
SET @cat_lighting_id     = (SELECT category_id FROM categories WHERE name = 'Lighting'     AND parent_id IS NULL);
SET @cat_furniture_id    = (SELECT category_id FROM categories WHERE name = 'Furniture'    AND parent_id IS NULL);
SET @cat_tents_id        = (SELECT category_id FROM categories WHERE name = 'Tents & Decor' AND parent_id IS NULL);
SET @cat_speakers_id     = (SELECT category_id FROM categories WHERE name = 'Speakers'     AND parent_id = @cat_sound_id);
SET @cat_mics_id         = (SELECT category_id FROM categories WHERE name = 'Microphones'  AND parent_id = @cat_sound_id);
SET @cat_dj_id           = (SELECT category_id FROM categories WHERE name = 'DJ Equipment' AND parent_id = @cat_sound_id);
SET @cat_stage_lights_id = (SELECT category_id FROM categories WHERE name = 'Stage Lights' AND parent_id = @cat_lighting_id);
SET @cat_fairy_id        = (SELECT category_id FROM categories WHERE name = 'Fairy Lights' AND parent_id = @cat_lighting_id);
SET @cat_chairs_id       = (SELECT category_id FROM categories WHERE name = 'Chairs'       AND parent_id = @cat_furniture_id);
SET @cat_tables_id       = (SELECT category_id FROM categories WHERE name = 'Tables'       AND parent_id = @cat_furniture_id);

-- =============================================================================
-- Equipment — vendor1 (SoundMaster Pro)
-- =============================================================================
-- E1: Pro Speaker System 5000
INSERT INTO equipment (vendor_id, category_id, name, description, price_per_day, security_deposit, quantity, min_rental_days, commission_rate, delivery_available, specifications, status)
SELECT @vendor1_id, @cat_speakers_id,
    'Pro Speaker System 5000',
    '2× 15-inch full-range PA speakers with 1000W RMS power, suitable for audiences up to 500.',
    1500.00, 3000.00, 3, 1, 8.00, 1,
    JSON_OBJECT('power_rms','1000W','coverage','100°x15°','weight_kg',28,'impedance','8 Ohm'),
    'active'
WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE vendor_id = @vendor1_id AND name = 'Pro Speaker System 5000');

UPDATE equipment SET commission_rate = 8.00 WHERE vendor_id = @vendor1_id AND name = 'Pro Speaker System 5000';

SET @eq1_id = (SELECT equipment_id FROM equipment WHERE vendor_id = @vendor1_id AND name = 'Pro Speaker System 5000');

-- E2: Wireless Microphone Set
INSERT INTO equipment (vendor_id, category_id, name, description, price_per_day, security_deposit, quantity, min_rental_days, delivery_available, specifications, status)
SELECT @vendor1_id, @cat_mics_id,
    'Wireless Microphone Set',
    'Dual-channel wireless handheld microphone system with 100m range. Includes receiver, 2 handhelds and clips.',
    800.00, 1500.00, 5, 1, 1,
    JSON_OBJECT('channels',2,'range_m',100,'frequency_mhz','600-698','battery','AA x4'),
    'active'
WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE vendor_id = @vendor1_id AND name = 'Wireless Microphone Set');

SET @eq2_id = (SELECT equipment_id FROM equipment WHERE vendor_id = @vendor1_id AND name = 'Wireless Microphone Set');

-- E3: DJ Console Setup
INSERT INTO equipment (vendor_id, category_id, name, description, price_per_day, security_deposit, quantity, min_rental_days, delivery_available, specifications, status)
SELECT @vendor1_id, @cat_dj_id,
    'DJ Console Setup',
    'Pioneer DDJ-1000 controller with 4-channel mixer, laptop stand and audio interface included.',
    2500.00, 5000.00, 2, 1, 1,
    JSON_OBJECT('channels',4,'interface','USB-C','jog_wheel_mm',206,'includes','laptop stand'),
    'active'
WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE vendor_id = @vendor1_id AND name = 'DJ Console Setup');

SET @eq3_id = (SELECT equipment_id FROM equipment WHERE vendor_id = @vendor1_id AND name = 'DJ Console Setup');

-- E4: Stage Monitor Speakers
INSERT INTO equipment (vendor_id, category_id, name, description, price_per_day, security_deposit, quantity, min_rental_days, delivery_available, specifications, status)
SELECT @vendor1_id, @cat_speakers_id,
    'Stage Monitor Speakers',
    '12-inch wedge floor monitors, 300W each. Set of 4.',
    600.00, 1200.00, 4, 1, 1,
    JSON_OBJECT('power_w',300,'size_inch',12,'set_count',4,'dispersion','60°'),
    'active'
WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE vendor_id = @vendor1_id AND name = 'Stage Monitor Speakers');

SET @eq4_id = (SELECT equipment_id FROM equipment WHERE vendor_id = @vendor1_id AND name = 'Stage Monitor Speakers');

-- =============================================================================
-- Equipment — vendor2 (LightUp Events)
-- =============================================================================
-- E5: LED Par Stage Lights
INSERT INTO equipment (vendor_id, category_id, name, description, price_per_day, security_deposit, quantity, min_rental_days, delivery_available, specifications, status)
SELECT @vendor2_id, @cat_stage_lights_id,
    'LED Par Stage Lights',
    'RGBWA 18×10W LED par cans. Set of 8 with DMX controller and mounting clamps.',
    500.00, 1000.00, 10, 1, 1,
    JSON_OBJECT('leds_per_unit',18,'watt_per_led',10,'dmx_channels',6,'set_count',8,'controller','included'),
    'active'
WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE vendor_id = @vendor2_id AND name = 'LED Par Stage Lights');

SET @eq5_id = (SELECT equipment_id FROM equipment WHERE vendor_id = @vendor2_id AND name = 'LED Par Stage Lights');

-- E6: Fairy Light Canopy
INSERT INTO equipment (vendor_id, category_id, name, description, price_per_day, security_deposit, quantity, min_rental_days, delivery_available, specifications, status)
SELECT @vendor2_id, @cat_fairy_id,
    'Fairy Light Canopy',
    'Warm-white LED fairy light canopy covering 6m × 6m. Includes mounting poles and extension cables.',
    1200.00, 2000.00, 2, 1, 1,
    JSON_OBJECT('coverage_m','6x6','led_count',2000,'colour','warm white','voltage','220V'),
    'active'
WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE vendor_id = @vendor2_id AND name = 'Fairy Light Canopy');

SET @eq6_id = (SELECT equipment_id FROM equipment WHERE vendor_id = @vendor2_id AND name = 'Fairy Light Canopy');

-- E7: Moving Head Spotlights
INSERT INTO equipment (vendor_id, category_id, name, description, price_per_day, security_deposit, quantity, min_rental_days, delivery_available, specifications, status)
SELECT @vendor2_id, @cat_stage_lights_id,
    'Moving Head Spotlights',
    '75W LED moving head beam lights with 540°/270° movement. Set of 4 with DMX cables.',
    1800.00, 3500.00, 4, 1, 1,
    JSON_OBJECT('power_w',75,'pan_degrees',540,'tilt_degrees',270,'dmx_channels',16,'set_count',4),
    'active'
WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE vendor_id = @vendor2_id AND name = 'Moving Head Spotlights');

SET @eq7_id = (SELECT equipment_id FROM equipment WHERE vendor_id = @vendor2_id AND name = 'Moving Head Spotlights');

-- E8: Banquet Chair Set
INSERT INTO equipment (vendor_id, category_id, name, description, price_per_day, security_deposit, quantity, min_rental_days, delivery_available, specifications, status)
SELECT @vendor2_id, @cat_chairs_id,
    'Banquet Chair Set',
    'Gold Chiavari banquet chairs. Priced per set of 10. Includes cushions.',
    450.00, 500.00, 20, 1, 1,
    JSON_OBJECT('chairs_per_set',10,'material','beech wood','finish','gold','cushion','included'),
    'active'
WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE vendor_id = @vendor2_id AND name = 'Banquet Chair Set');

SET @eq8_id = (SELECT equipment_id FROM equipment WHERE vendor_id = @vendor2_id AND name = 'Banquet Chair Set');

-- E9: Round Banquet Tables
INSERT INTO equipment (vendor_id, category_id, name, description, price_per_day, security_deposit, quantity, min_rental_days, delivery_available, specifications, status)
SELECT @vendor2_id, @cat_tables_id,
    'Round Banquet Tables',
    '5-foot (60-inch) round banquet tables. Seats 8–10 guests. Price per table.',
    200.00, 300.00, 30, 1, 1,
    JSON_OBJECT('diameter_inch',60,'capacity','8-10 guests','foldable',true,'material','MDF with laminate'),
    'active'
WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE vendor_id = @vendor2_id AND name = 'Round Banquet Tables');

SET @eq9_id = (SELECT equipment_id FROM equipment WHERE vendor_id = @vendor2_id AND name = 'Round Banquet Tables');

-- =============================================================================
-- Equipment — vendor3 (Party Essentials — pending approval)
-- Equipment is seeded as 'active' for dev testing; approval gate is in FastAPI.
-- =============================================================================
-- E10: Party Marquee Tent
INSERT INTO equipment (vendor_id, category_id, name, description, price_per_day, security_deposit, quantity, min_rental_days, delivery_available, specifications, status)
SELECT @vendor3_id, @cat_tents_id,
    'Party Marquee Tent',
    'White PVC marquee tent, 6m × 9m (54 sq m). Includes sidewalls, pegs and carry bag.',
    3500.00, 7000.00, 3, 2, 1,
    JSON_OBJECT('size_m','6x9','material','PVC 550gsm','capacity','50 guests','includes','sidewalls,pegs'),
    'active'
WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE vendor_id = @vendor3_id AND name = 'Party Marquee Tent');

SET @eq10_id = (SELECT equipment_id FROM equipment WHERE vendor_id = @vendor3_id AND name = 'Party Marquee Tent');

-- E11: Rectangular Folding Tables
INSERT INTO equipment (vendor_id, category_id, name, description, price_per_day, security_deposit, quantity, min_rental_days, delivery_available, specifications, status)
SELECT @vendor3_id, @cat_tables_id,
    'Rectangular Folding Tables',
    '6-foot (72-inch) rectangular folding banquet tables. Price per table.',
    150.00, 200.00, 50, 1, 1,
    JSON_OBJECT('length_inch',72,'width_inch',30,'capacity','6-8 guests','foldable',true),
    'active'
WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE vendor_id = @vendor3_id AND name = 'Rectangular Folding Tables');

SET @eq11_id = (SELECT equipment_id FROM equipment WHERE vendor_id = @vendor3_id AND name = 'Rectangular Folding Tables');

-- E12: Cocktail Tables
INSERT INTO equipment (vendor_id, category_id, name, description, price_per_day, security_deposit, quantity, min_rental_days, delivery_available, specifications, status)
SELECT @vendor3_id, @cat_tables_id,
    'Cocktail Tables',
    'High-top cocktail / poseur tables, 110cm tall. Price per table.',
    300.00, 400.00, 15, 1, 1,
    JSON_OBJECT('height_cm',110,'top_diameter_cm',70,'finish','white matte','adjustable',false),
    'active'
WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE vendor_id = @vendor3_id AND name = 'Cocktail Tables');

SET @eq12_id = (SELECT equipment_id FROM equipment WHERE vendor_id = @vendor3_id AND name = 'Cocktail Tables');

-- E13: Fairy String Lights
INSERT INTO equipment (vendor_id, category_id, name, description, price_per_day, security_deposit, quantity, min_rental_days, delivery_available, specifications, status)
SELECT @vendor3_id, @cat_fairy_id,
    'Fairy String Lights',
    'Outdoor-rated warm white fairy string lights, 50m per roll. Minimum 2 rolls.',
    350.00, 500.00, 10, 1, 1,
    JSON_OBJECT('length_m',50,'led_count',500,'ip_rating','IP44','colour','warm white'),
    'active'
WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE vendor_id = @vendor3_id AND name = 'Fairy String Lights');

SET @eq13_id = (SELECT equipment_id FROM equipment WHERE vendor_id = @vendor3_id AND name = 'Fairy String Lights');

-- E14: Folding Chairs
INSERT INTO equipment (vendor_id, category_id, name, description, price_per_day, security_deposit, quantity, min_rental_days, delivery_available, specifications, status)
SELECT @vendor3_id, @cat_chairs_id,
    'Folding Chairs',
    'White plastic folding chairs. Stackable. Price per set of 20.',
    250.00, 300.00, 20, 1, 1,
    JSON_OBJECT('chairs_per_set',20,'material','HDPE plastic','colour','white','max_load_kg',120),
    'active'
WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE vendor_id = @vendor3_id AND name = 'Folding Chairs');

SET @eq14_id = (SELECT equipment_id FROM equipment WHERE vendor_id = @vendor3_id AND name = 'Folding Chairs');

-- E15: Stretch Ceiling Tent
INSERT INTO equipment (vendor_id, category_id, name, description, price_per_day, security_deposit, quantity, min_rental_days, delivery_available, specifications, status)
SELECT @vendor3_id, @cat_tents_id,
    'Stretch Ceiling Tent',
    'White lycra stretch ceiling tent creating an elegant indoor-style canopy. 8m × 8m.',
    4500.00, 9000.00, 2, 2, 1,
    JSON_OBJECT('size_m','8x8','material','lycra stretch','colour','white','install_time_hrs',3),
    'active'
WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE vendor_id = @vendor3_id AND name = 'Stretch Ceiling Tent');

SET @eq15_id = (SELECT equipment_id FROM equipment WHERE vendor_id = @vendor3_id AND name = 'Stretch Ceiling Tent');

-- =============================================================================
-- Equipment images (one primary image per item — placeholder URLs)
-- =============================================================================
INSERT INTO equipment_images (equipment_id, url, is_primary, sort_order)
SELECT eq.equipment_id, img.url, img.is_primary, img.sort_order
FROM (
    SELECT @eq1_id  AS eid, 'https://placehold.co/800x600/1a1a2e/ffffff?text=Speaker+System'    AS url, 1 AS is_primary, 1 AS sort_order UNION ALL
    SELECT @eq1_id,          'https://placehold.co/800x600/1a1a2e/ffffff?text=Speaker+Rear',      0, 2 UNION ALL
    SELECT @eq2_id,          'https://placehold.co/800x600/0f3460/ffffff?text=Wireless+Mic',      1, 1 UNION ALL
    SELECT @eq3_id,          'https://placehold.co/800x600/533483/ffffff?text=DJ+Console',        1, 1 UNION ALL
    SELECT @eq4_id,          'https://placehold.co/800x600/1a1a2e/ffffff?text=Stage+Monitors',    1, 1 UNION ALL
    SELECT @eq5_id,          'https://placehold.co/800x600/0f3460/ffffff?text=LED+Par+Lights',    1, 1 UNION ALL
    SELECT @eq6_id,          'https://placehold.co/800x600/533483/ffffff?text=Fairy+Canopy',      1, 1 UNION ALL
    SELECT @eq7_id,          'https://placehold.co/800x600/0f3460/ffffff?text=Moving+Heads',      1, 1 UNION ALL
    SELECT @eq8_id,          'https://placehold.co/800x600/1a1a2e/ffffff?text=Banquet+Chairs',    1, 1 UNION ALL
    SELECT @eq9_id,          'https://placehold.co/800x600/533483/ffffff?text=Round+Tables',      1, 1 UNION ALL
    SELECT @eq10_id,         'https://placehold.co/800x600/1a1a2e/ffffff?text=Marquee+Tent',      1, 1 UNION ALL
    SELECT @eq11_id,         'https://placehold.co/800x600/0f3460/ffffff?text=Folding+Tables',    1, 1 UNION ALL
    SELECT @eq12_id,         'https://placehold.co/800x600/533483/ffffff?text=Cocktail+Tables',   1, 1 UNION ALL
    SELECT @eq13_id,         'https://placehold.co/800x600/1a1a2e/ffffff?text=String+Lights',     1, 1 UNION ALL
    SELECT @eq14_id,         'https://placehold.co/800x600/0f3460/ffffff?text=Folding+Chairs',    1, 1 UNION ALL
    SELECT @eq15_id,         'https://placehold.co/800x600/533483/ffffff?text=Stretch+Tent',      1, 1
) AS img
JOIN equipment eq ON eq.equipment_id = img.eid
WHERE NOT EXISTS (
    SELECT 1 FROM equipment_images ei
    WHERE  ei.equipment_id = img.eid AND ei.url = img.url
);
