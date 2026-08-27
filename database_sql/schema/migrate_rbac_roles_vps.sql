-- RBAC migration for existing production users (Hostinger VPS)
-- Safe to run multiple times.

START TRANSACTION;

-- 1) Ensure core roles exist with stable IDs used by backend logic.
INSERT INTO roles (id, name, permissions)
VALUES (1, 'Super Admin', NULL)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO roles (id, name, permissions)
VALUES (2, 'Admin', NULL)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO roles (id, name, permissions)
VALUES (3, 'Cultivator', NULL)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 2) Normalize old "Guest" role naming if present.
UPDATE roles
SET name = 'Admin'
WHERE id = 2 AND name = 'Guest';

-- 3) Guardrail: if any user has NULL/invalid role, fallback to Admin (2).
UPDATE users u
LEFT JOIN roles r ON r.id = u.role_id
SET u.role_id = 2
WHERE u.role_id IS NULL OR r.id IS NULL;

-- 4) Optional: promote a known account to Super Admin.
-- Replace with your real username/email before running.
-- UPDATE users SET role_id = 1 WHERE username = 'replace_with_super_admin_username';
-- UPDATE users SET role_id = 1 WHERE email = 'replace_with_super_admin_email@example.com';

COMMIT;

-- Verification queries (run after COMMIT)
-- SELECT id, name FROM roles ORDER BY id;
-- SELECT id, username, email, role_id FROM users ORDER BY id;
