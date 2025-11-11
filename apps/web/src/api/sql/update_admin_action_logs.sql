-- Migration: Update admin_action_logs table for better flexibility
-- Date: 2025-01-24
-- Purpose: Make entity_id more flexible (text instead of integer) and update action types

-- Change entity_id from integer to text to support both UUID and serial IDs
ALTER TABLE admin_action_logs
  ALTER COLUMN entity_id TYPE text;

-- Drop old check constraint on action
ALTER TABLE admin_action_logs
  DROP CONSTRAINT IF EXISTS admin_action_logs_action_check;

-- Add new check constraint with better action types
ALTER TABLE admin_action_logs
  ADD CONSTRAINT admin_action_logs_action_check
  CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'BULK_UPDATE', 'BULK_DELETE'));

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_client_entity
  ON admin_action_logs (client_id, entity_name, entity_id);

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_client_user_created
  ON admin_action_logs (client_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_entity
  ON admin_action_logs (entity_name, entity_id);
