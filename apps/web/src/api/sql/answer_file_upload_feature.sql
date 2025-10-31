-- Migration: Add file upload requirement feature for answers
-- Date: 2025-10-31
-- Description: Adds support for answers to require file uploads with optional file type restrictions,
--              and automatic organization of user uploads into Users/[userId]/ folder structure

-- ====================================================================
-- 1. Add file upload fields to answer table
-- ====================================================================

ALTER TABLE answer
  ADD COLUMN IF NOT EXISTS requires_upload BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed_extensions TEXT;

COMMENT ON COLUMN answer.requires_upload IS 'When true, this answer requires the user to upload a file instead of providing free-form text';
COMMENT ON COLUMN answer.allowed_extensions IS 'Comma-separated list of allowed file extensions (e.g., ''.pdf,.docx,.jpg''). NULL means all allowed file types are permitted';

-- ====================================================================
-- 2. Add response document reference to question_response table
-- ====================================================================

ALTER TABLE question_response
  ADD COLUMN IF NOT EXISTS response_doc_id INTEGER REFERENCES doc(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_question_response_doc
  ON question_response(response_doc_id)
  WHERE response_doc_id IS NOT NULL;

COMMENT ON COLUMN question_response.response_doc_id IS 'Reference to uploaded document when answer requires file upload';

-- ====================================================================
-- 3. Add user association to doc_group table for user folder display
-- ====================================================================

ALTER TABLE doc_group
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_doc_group_user
  ON doc_group(user_id)
  WHERE user_id IS NOT NULL;

COMMENT ON COLUMN doc_group.user_id IS 'Links user folders to their owner. Used to display user name/email in Documents tab for folders under Users/';

-- ====================================================================
-- 4. Add response_doc_id to doc table (for linking uploaded files to responses)
-- ====================================================================

ALTER TABLE doc
  ADD COLUMN IF NOT EXISTS response_doc_id INTEGER REFERENCES question_response(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_doc_response
  ON doc(response_doc_id)
  WHERE response_doc_id IS NOT NULL;

COMMENT ON COLUMN doc.response_doc_id IS 'Reference to question_response when this document is uploaded as part of a response to a question requiring file upload';

-- ====================================================================
-- 5. Update doc_group_type_check constraint to include 'user' type
-- ====================================================================

-- Drop the existing constraint
ALTER TABLE doc_group DROP CONSTRAINT IF EXISTS doc_group_type_check;

-- Add updated constraint with 'user' included
ALTER TABLE doc_group
  ADD CONSTRAINT doc_group_type_check
  CHECK (group_type = ANY (ARRAY['claim_folder'::text, 'category'::text, 'custom'::text, 'user'::text]));

-- Add unique constraints to prevent duplicate folder creation
CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_group_user_folder_unique
  ON doc_group(client_id, user_id)
  WHERE group_type = 'user' AND user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_group_users_root_unique
  ON doc_group(client_id, name)
  WHERE group_type = 'category' AND name = 'Users' AND parent_group_id IS NULL;

-- ====================================================================
-- 6. Add constraint to prevent both has_additional_info and requires_upload
-- ====================================================================

ALTER TABLE answer
  ADD CONSTRAINT answer_upload_or_additional_info_check
  CHECK (
    NOT (has_additional_info = true AND requires_upload = true)
  );

COMMENT ON CONSTRAINT answer_upload_or_additional_info_check ON answer
  IS 'Ensures an answer cannot require both additional info text and file upload';

-- ====================================================================
-- End of migration
-- ====================================================================
