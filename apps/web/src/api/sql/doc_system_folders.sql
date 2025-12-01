-- Document System Folders Enhancement
-- Date: 2025-11-12
-- Purpose: Add system folder support and shared folder infrastructure

-- =====================================================================
-- ADD SYSTEM AND USER_ID FIELDS TO DOC_GROUP
-- =====================================================================

-- Add system boolean field to mark system-managed folders
ALTER TABLE doc_group
ADD COLUMN IF NOT EXISTS system BOOLEAN DEFAULT false;

-- Add user_id field for user-specific folders
ALTER TABLE doc_group
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Update group_type constraint to include 'user' type
ALTER TABLE doc_group
DROP CONSTRAINT IF EXISTS doc_group_type_check;

ALTER TABLE doc_group
ADD CONSTRAINT doc_group_type_check
CHECK (group_type = ANY(ARRAY['claim_folder', 'category', 'custom', 'user']));

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_doc_group_user ON doc_group (user_id) WHERE user_id IS NOT NULL;

-- Create index for system folders
CREATE INDEX IF NOT EXISTS idx_doc_group_system ON doc_group (system) WHERE system = true;

-- Create unique constraint for Users folder (one per client)
CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_group_users_folder
ON doc_group (client_id, name)
WHERE name = 'Users' AND group_type = 'category' AND parent_group_id IS NULL;

-- Create unique constraint for user folders (one per user per client)
CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_group_user_folder
ON doc_group (client_id, user_id)
WHERE group_type = 'user' AND user_id IS NOT NULL;

-- Create unique constraint for Shared folder (one per client)
CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_group_shared_folder
ON doc_group (client_id, name)
WHERE name = 'Shared' AND group_type = 'category' AND parent_group_id IS NULL;

-- =====================================================================
-- MARK EXISTING USERS FOLDERS AS SYSTEM
-- =====================================================================

UPDATE doc_group
SET system = true
WHERE name = 'Users'
  AND group_type = 'category'
  AND parent_group_id IS NULL;

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON COLUMN doc_group.system IS 'System-managed folder that cannot be edited or deleted by regular admins';
COMMENT ON COLUMN doc_group.user_id IS 'Associated user ID for user-specific folders under Users/';
