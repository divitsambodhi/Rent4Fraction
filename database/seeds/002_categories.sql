-- =============================================================================
-- Seed 002 — Final Marketplace Categories (16 Root Categories)
-- Platform: Rent4Fraction (COD-only Direct Marketplace, 0% Platform Commission)
-- =============================================================================

INSERT INTO categories (category_id, name, description, default_commission_rate, parent_id, is_active) VALUES
(1, 'Furniture & Seating', 'Tables, chairs, lounges, banquet and event seating arrangements', 0.00, NULL, 1),
(2, 'Tents, Canopies & Structures', 'Marquees, canopies, pagodas, gazebos, and structural setups', 0.00, NULL, 1),
(3, 'Decor & Backdrops', 'Photo backdrops, floral frames, stage decor, and drapery', 0.00, NULL, 1),
(4, 'Sound & DJ Equipment', 'PA systems, speakers, DJ mixers, consoles, and microphones', 0.00, NULL, 1),
(5, 'Lighting & Effects', 'Stage spotlights, LED pars, ambient lighting, smoke and haze machines', 0.00, NULL, 1),
(6, 'Screens & Visual Equipment', 'LED video walls, projectors, projection screens, and monitors', 0.00, NULL, 1),
(7, 'Catering & Dining', 'Chafing dishes, beverage dispensers, buffet counters, and food warmers', 0.00, NULL, 1),
(8, 'Photography & Videography', 'Cameras, camera lenses, stabilizers, tripods, and lighting kits', 0.00, NULL, 1),
(9, 'Power & Climate Control', 'Silent diesel generators, heavy-duty UPS, mist fans, and portable ACs', 0.00, NULL, 1),
(10, 'Flooring & Carpets', 'Dance floors, red carpets, wooden platforms, and artificial turf', 0.00, NULL, 1),
(11, 'Event Accessories', 'Stanchions, crowd control barriers, podiums, and welcome boards', 0.00, NULL, 1),
(12, 'Tableware & Serving', 'Plates, glassware, cutlery, serving trays, and fine tableware', 0.00, NULL, 1),
(13, 'Games & Entertainment', 'Carnival games, arcade machines, photo booths, and fun activities', 0.00, NULL, 1),
(14, 'Safety & Security', 'Fire extinguishers, walkie-talkies, metal detectors, and safety gear', 0.00, NULL, 1),
(15, 'Transport & Logistics Equipment', 'Hand trucks, equipment dollies, loading ramps, and trolleys', 0.00, NULL, 1),
(16, 'Others', 'Miscellaneous event gear, tools, and specialty rental equipment', 0.00, NULL, 1)
ON DUPLICATE KEY UPDATE
    name                    = VALUES(name),
    description             = VALUES(description),
    default_commission_rate = 0.00,
    parent_id               = NULL,
    is_active               = 1;
