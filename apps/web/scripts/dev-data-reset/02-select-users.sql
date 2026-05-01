-- =====================================================
-- 02-select-users.sql
-- Preserve 10 users: 3 Clerk users + 7 others
-- Delete all other users
-- =====================================================

-- Create a temp table to store user IDs to keep
CREATE TEMP TABLE users_to_keep AS
-- Add 10 users with variety of names for realistic claim assignments
-- Use subquery to apply ORDER BY and LIMIT correctly
SELECT id FROM (
    SELECT id, created_at FROM users
    ORDER BY created_at ASC
    LIMIT 10
) AS other_users;

-- Show users being kept
SELECT 'Users to keep:' AS info;
SELECT u.id, u.email, u.first, u.last
FROM users u
INNER JOIN users_to_keep k ON u.id = k.id;

-- Update FKs that reference users being deleted
-- Point them to a user we're keeping (first Clerk user)
UPDATE desk_location_type SET created_by = (
    SELECT id FROM users ORDER BY created_at ASC LIMIT 1
) WHERE created_by NOT IN (SELECT id FROM users_to_keep);

UPDATE desk_location_type SET updated_by = (
    SELECT id FROM users ORDER BY created_at ASC LIMIT 1
) WHERE updated_by IS NOT NULL AND updated_by NOT IN (SELECT id FROM users_to_keep);

UPDATE desk_location SET created_by = (
    SELECT id FROM users ORDER BY created_at ASC LIMIT 1
) WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM users_to_keep);

UPDATE desk_location SET updated_by = (
    SELECT id FROM users ORDER BY created_at ASC LIMIT 1
) WHERE updated_by IS NOT NULL AND updated_by NOT IN (SELECT id FROM users_to_keep);

UPDATE feeds SET created_by = (
    SELECT id FROM users ORDER BY created_at ASC LIMIT 1
) WHERE created_by NOT IN (SELECT id FROM users_to_keep);

UPDATE feeds SET updated_by = (
    SELECT id FROM users ORDER BY created_at ASC LIMIT 1
) WHERE updated_by IS NOT NULL AND updated_by NOT IN (SELECT id FROM users_to_keep);

-- Delete users not in the keep list
DELETE FROM users WHERE id NOT IN (SELECT id FROM users_to_keep);

-- Show final user count
SELECT COUNT(*) AS remaining_users FROM users;

-- Clean up temp table
DROP TABLE users_to_keep;
