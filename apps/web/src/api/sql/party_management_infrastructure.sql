-- ============================================================================
-- PARTY MANAGEMENT INFRASTRUCTURE
-- ============================================================================
-- Created: 2025-11-11
-- Purpose: External party and facilitator management for subrogation workflow
-- Tables: party, claim_party, party_office, party_representative
-- ============================================================================

-- ============================================================================
-- TABLE: party
-- ============================================================================
-- Main party record - organizations and individuals involved in claims
-- Includes both entities (directly involved) and facilitators (representatives)
-- Unique constraint on (name, client_id) prevents duplicate party names per client
-- ============================================================================

CREATE TABLE IF NOT EXISTS party (
  id SERIAL PRIMARY KEY,

  -- Client scoping (multi-tenant isolation)
  client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,

  -- Party classification
  party_type TEXT NOT NULL CHECK (party_type IN ('entity', 'facilitator')),
  party_category TEXT NOT NULL, -- Validated at application layer based on party_type

  -- Core party information
  name TEXT NOT NULL,
  organization TEXT, -- Company/firm name (optional)

  -- Contact information
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT unique_party_name_per_client UNIQUE (name, client_id)
);

-- Indexes for performance
CREATE INDEX idx_party_client_id ON party(client_id);
CREATE INDEX idx_party_type ON party(party_type);
CREATE INDEX idx_party_name ON party(name);
CREATE INDEX idx_party_name_lower ON party(LOWER(name)); -- For ILIKE searches

-- ============================================================================
-- TABLE: claim_party
-- ============================================================================
-- Links parties to claims with role-specific information
-- Supports multiple parties per claim with different roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS claim_party (
  id SERIAL PRIMARY KEY,

  -- Foreign keys
  claim_id INT NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
  party_id INT NOT NULL REFERENCES party(id) ON DELETE CASCADE,

  -- Role information
  role TEXT NOT NULL, -- 'adverse_carrier', 'our_attorney', 'their_attorney', 'expert', 'responsible_party', etc.

  -- Role-specific data
  liability_percentage DECIMAL(5, 2), -- For responsible parties (0.00 to 100.00)
  coverage_amount DECIMAL(12, 2), -- For adverse carriers (coverage limits)
  is_primary BOOLEAN NOT NULL DEFAULT false, -- Primary contact for this role
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT unique_claim_party_role UNIQUE (claim_id, party_id, role)
);

-- Indexes for performance
CREATE INDEX idx_claim_party_claim_id ON claim_party(claim_id);
CREATE INDEX idx_claim_party_party_id ON claim_party(party_id);
CREATE INDEX idx_claim_party_role ON claim_party(role);

-- ============================================================================
-- TABLE: party_office
-- ============================================================================
-- Office locations for a party (supports organizational hierarchy)
-- Optional - not all parties have multiple offices
-- ============================================================================

CREATE TABLE IF NOT EXISTS party_office (
  id SERIAL PRIMARY KEY,

  -- Foreign key
  party_id INT NOT NULL REFERENCES party(id) ON DELETE CASCADE,

  -- Office information
  office_name TEXT,
  address TEXT,
  phone TEXT,
  fax TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false, -- Primary/headquarters office

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_party_office_party_id ON party_office(party_id);

-- ============================================================================
-- TABLE: party_representative
-- ============================================================================
-- Individual contacts at a party or party office
-- Examples: Attorneys, adjusters, experts
-- ============================================================================

CREATE TABLE IF NOT EXISTS party_representative (
  id SERIAL PRIMARY KEY,

  -- Foreign keys
  party_id INT NOT NULL REFERENCES party(id) ON DELETE CASCADE,
  office_id INT REFERENCES party_office(id) ON DELETE SET NULL, -- Optional office association

  -- Representative information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT, -- Job title (e.g., "Senior Adjuster", "Partner")

  -- Contact information
  email TEXT,
  phone TEXT,
  mobile_phone TEXT,
  fax TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false, -- Primary contact for this party

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_party_rep_party_id ON party_representative(party_id);
CREATE INDEX idx_party_rep_office_id ON party_representative(office_id);
CREATE INDEX idx_party_rep_name ON party_representative(last_name, first_name);

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE party IS 'External parties and facilitators involved in claims (entities, adverse carriers, attorneys, experts)';
COMMENT ON TABLE claim_party IS 'Links parties to claims with role-specific information (liability %, coverage amount, etc.)';
COMMENT ON TABLE party_office IS 'Office locations for parties with multi-office structures';
COMMENT ON TABLE party_representative IS 'Individual contacts at parties (attorneys, adjusters, experts)';

COMMENT ON COLUMN party.party_type IS 'entity = directly involved in loss, facilitator = representative/service provider';
COMMENT ON COLUMN party.party_category IS 'For facilitators: adverse_carrier, attorney, expert, vendor. For entities: responsible_party, claimant, witness, property_owner';
COMMENT ON COLUMN claim_party.role IS 'Role this party plays on this specific claim (e.g., adverse_carrier, our_attorney, responsible_party)';
COMMENT ON COLUMN claim_party.liability_percentage IS 'Percentage of liability attributed to this party (for responsible parties)';
COMMENT ON COLUMN claim_party.coverage_amount IS 'Coverage limit for this adverse carrier';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
