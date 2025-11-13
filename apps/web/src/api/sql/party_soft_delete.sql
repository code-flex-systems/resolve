-- ============================================================================
-- PARTY SOFT DELETE INFRASTRUCTURE
-- ============================================================================
-- Created: 2025-11-12
-- Purpose: Add soft delete support to party management tables
-- Adds deleted_at and deleted_by columns for audit trail and data preservation
-- ============================================================================

-- Add soft delete columns to party table
ALTER TABLE party
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- Add soft delete columns to party_office table
ALTER TABLE party_office
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- Add soft delete columns to party_representative table
ALTER TABLE party_representative
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- Add soft delete columns to claim_party table
ALTER TABLE claim_party
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- Create indexes for better performance on deleted_at queries
CREATE INDEX IF NOT EXISTS idx_party_deleted_at ON party(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_party_office_deleted_at ON party_office(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_party_representative_deleted_at ON party_representative(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_claim_party_deleted_at ON claim_party(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN party.deleted_at IS 'Soft delete timestamp - party is archived when not null';
COMMENT ON COLUMN party.deleted_by IS 'Email of user who archived this party';
COMMENT ON COLUMN party_office.deleted_at IS 'Soft delete timestamp - cascades from party deletion';
COMMENT ON COLUMN party_office.deleted_by IS 'Email of user who archived this office';
COMMENT ON COLUMN party_representative.deleted_at IS 'Soft delete timestamp - cascades from party deletion';
COMMENT ON COLUMN party_representative.deleted_by IS 'Email of user who archived this representative';
COMMENT ON COLUMN claim_party.deleted_at IS 'Soft delete timestamp - unlinks party from claim';
COMMENT ON COLUMN claim_party.deleted_by IS 'Email of user who unlinked this party from claim';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
