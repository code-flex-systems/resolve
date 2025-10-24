-- Migration: Fix Foreign Key Constraints for Data Preservation Policy
-- Date: 2025-01-24
-- Purpose: Update foreign key constraints to preserve historical data when structural changes occur
--
-- Policy:
-- - Structural/template resources (page, question, answer): CASCADE delete to avoid trailing references
-- - Response/metadata resources (comments, question_response, question_response_answer): SET NULL to preserve historical data

-- ============================================================================
-- 1. Fix comment table - Add ON DELETE SET NULL for instance_id and question_id
-- ============================================================================

-- Drop existing constraints if they exist (they currently don't, but this makes the script idempotent)
ALTER TABLE comment
  DROP CONSTRAINT IF EXISTS comment_instance_id_fkey;

ALTER TABLE comment
  DROP CONSTRAINT IF EXISTS comment_question_id_fkey;

-- Add new constraints with ON DELETE SET NULL
ALTER TABLE comment
  ADD CONSTRAINT comment_instance_id_fkey
  FOREIGN KEY (instance_id)
  REFERENCES page_instance(id)
  ON DELETE SET NULL;

ALTER TABLE comment
  ADD CONSTRAINT comment_question_id_fkey
  FOREIGN KEY (question_id)
  REFERENCES question(id)
  ON DELETE SET NULL;

-- ============================================================================
-- 2. Fix answer table - Add ON DELETE SET NULL for calls_instance_id
-- ============================================================================

-- Drop existing constraint if it exists
ALTER TABLE answer
  DROP CONSTRAINT IF EXISTS answer_calls_instance_id_fkey;

-- Add new constraint with ON DELETE SET NULL
ALTER TABLE answer
  ADD CONSTRAINT answer_calls_instance_id_fkey
  FOREIGN KEY (calls_instance_id)
  REFERENCES page_instance(id)
  ON DELETE SET NULL;

-- ============================================================================
-- 3. Fix question_response_answer table - Add ON DELETE SET NULL for answer_id
-- ============================================================================

-- First, make answer_id nullable (required for ON DELETE SET NULL to work)
ALTER TABLE question_response_answer
  ALTER COLUMN answer_id DROP NOT NULL;

-- Drop existing constraint if it exists
ALTER TABLE question_response_answer
  DROP CONSTRAINT IF EXISTS question_response_answer_answer_id_fkey;

-- Add new constraint with ON DELETE SET NULL
ALTER TABLE question_response_answer
  ADD CONSTRAINT question_response_answer_answer_id_fkey
  FOREIGN KEY (answer_id)
  REFERENCES answer(id)
  ON DELETE SET NULL;

-- ============================================================================
-- 4. Fix question_response table - Change question_id from CASCADE to SET NULL
-- ============================================================================

-- This one is more complex because question_response currently has ON DELETE CASCADE
-- for question_id, but we want to preserve the response data even if the question
-- structure changes.

-- First, make question_id nullable (required for ON DELETE SET NULL to work)
ALTER TABLE question_response
  ALTER COLUMN question_id DROP NOT NULL;

-- Drop existing constraint
ALTER TABLE question_response
  DROP CONSTRAINT IF EXISTS question_response_question_id_fkey;

-- Add new constraint with ON DELETE SET NULL
ALTER TABLE question_response
  ADD CONSTRAINT question_response_question_id_fkey
  FOREIGN KEY (question_id)
  REFERENCES question(id)
  ON DELETE SET NULL;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- After running this migration, the deletion behavior will be:
--
-- 1. When a page_instance is deleted:
--    - comments.instance_id → NULL (preserves comment)
--    - answer.calls_instance_id → NULL (preserves answer template)
--    - question_response CASCADE (entire response deleted - this is debatable)
--    - page_instance_status CASCADE (tracking data deleted)
--
-- 2. When a question is deleted:
--    - comments.question_id → NULL (preserves comment)
--    - question_response.question_id → NULL (preserves response data)
--    - answers CASCADE (template answers deleted with question)
--
-- 3. When an answer is deleted:
--    - question_response_answer.answer_id → NULL (preserves response selection)
--    - actions CASCADE (actions tied to answer template)
--
-- This ensures that historical claim response data is preserved even when
-- the underlying checklist templates are modified or deleted.
