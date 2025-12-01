-- ============================================================================
-- CLAIM SUBSTATUS FIELD
-- ============================================================================
-- Created: 2025-11-12
-- Purpose: Add substatus field to claim table for granular workflow tracking
-- Minimal implementation to support active claim checks and future workflow features
-- ============================================================================

-- Add substatus column to claim table
ALTER TABLE claim
ADD COLUMN IF NOT EXISTS substatus TEXT;

-- Add comment
COMMENT ON COLUMN claim.substatus IS 'Granular workflow state: investigation, demand_sent, negotiation, settlement_reached, litigation, closed_recovered, closed_no_recovery, cancelled';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
