-- =============================================================================
-- Seed 001 — Admin + customers + vendor users
-- Idempotent: ON DUPLICATE KEY UPDATE on firebase_uid.
--
-- !! IMPORTANT !! Replace placeholder firebase_uid values with real UIDs
-- from the Firebase Console, or use Firebase Auth Emulator UIDs.
-- See README.md § Firebase Auth Emulator.
-- =============================================================================

INSERT INTO users
    (firebase_uid, name, email, phone, role, is_active, email_verified)
VALUES
    ('dev-admin-uid-replace-me',     'Platform Admin',    'admin@eventrental.dev',          '+91-9000000001', 'admin',    1, 1),
    ('dev-customer-1-uid-replace-me','Aisha Sharma',      'aisha.sharma@example.com',        '+91-9100000001', 'customer', 1, 1),
    ('dev-customer-2-uid-replace-me','Rahul Mehta',       'rahul.mehta@example.com',         '+91-9100000002', 'customer', 1, 1),
    ('dev-customer-3-uid-replace-me','Priya Nair',        'priya.nair@example.com',          '+91-9100000003', 'customer', 1, 1),
    ('dev-vendor-1-uid-replace-me',  'Suresh Kumar',      'suresh@soundmasterpro.dev',       '+91-9200000001', 'vendor',   1, 1),
    ('dev-vendor-2-uid-replace-me',  'Meera Iyer',        'meera@lightupevents.dev',         '+91-9200000002', 'vendor',   1, 1),
    ('dev-vendor-3-uid-replace-me',  'Deepak Verma',      'deepak@partyessentials.dev',      '+91-9200000003', 'vendor',   1, 1)
AS new_data
ON DUPLICATE KEY UPDATE
    name           = new_data.name,
    email          = new_data.email,
    phone          = new_data.phone,
    role           = new_data.role,
    is_active      = new_data.is_active,
    email_verified = new_data.email_verified;
