-- Phase 1: Recovery Tracking & AI Data Infrastructure
-- Date: 2025-10-28
-- Purpose: Add recovery event tracking, deadline management, and AI training data capture

-- =====================================================================
-- NEW TABLES
-- =====================================================================

-- Recovery Event: Track actual recovery amounts, dates, and sources
CREATE TABLE recovery_event (
    id                  SERIAL PRIMARY KEY,
    claim_id            INTEGER NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
    client_id           UUID NOT NULL REFERENCES client(id),
    recovery_date       DATE NOT NULL,
    recovery_amount     NUMERIC NOT NULL,
    recovery_source     TEXT,
    notes               TEXT,
    created_by          UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by          UUID REFERENCES users(id),
    updated_at          TIMESTAMP
);

CREATE INDEX idx_recovery_event_claim ON recovery_event (claim_id);
CREATE INDEX idx_recovery_event_client ON recovery_event (client_id);
CREATE INDEX idx_recovery_event_client_date ON recovery_event (client_id, recovery_date);

-- Deadline: Track critical dates (statute of limitations, demand deadlines, etc.)
CREATE TABLE deadline (
    id                  SERIAL PRIMARY KEY,
    claim_id            INTEGER NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
    client_id           UUID NOT NULL REFERENCES client(id),
    deadline_type       TEXT NOT NULL,
    deadline_date       DATE NOT NULL,
    description         TEXT,
    status              TEXT NOT NULL DEFAULT 'pending',
    created_by          UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by          UUID REFERENCES users(id),
    updated_at          TIMESTAMP,
    CONSTRAINT deadline_status_check CHECK (status = ANY(ARRAY['pending', 'met', 'missed', 'extended']))
);

CREATE INDEX idx_deadline_claim ON deadline (claim_id);
CREATE INDEX idx_deadline_client ON deadline (client_id);
CREATE INDEX idx_deadline_client_date ON deadline (client_id, deadline_date);
CREATE INDEX idx_deadline_client_status ON deadline (client_id, status);

-- =====================================================================
-- SCHEMA ALTERATIONS
-- =====================================================================

-- Claim: Add recovery tracking fields
ALTER TABLE claim
    ADD COLUMN actual_recovery NUMERIC,
    ADD COLUMN recovery_status TEXT,
    ADD CONSTRAINT claim_recovery_status_check CHECK (recovery_status IS NULL OR recovery_status = ANY(ARRAY['pending', 'in_progress', 'recovered', 'closed_no_recovery']));

CREATE INDEX idx_claim_client_recovery_status ON claim (client_id, recovery_status);

-- Checklist Claim: Add outcome capture fields
ALTER TABLE checklist_claim
    ADD COLUMN outcome_snapshot JSONB,
    ADD COLUMN time_to_resolution_days INTEGER;

-- Response Audit Logs: Add AI training instrumentation
-- These fields are distinct from operational additional_info and enable AI training data capture
ALTER TABLE response_audit_logs
    ADD COLUMN decision_confidence NUMERIC CHECK (decision_confidence >= 0 AND decision_confidence <= 1),
    ADD COLUMN decision_rationale TEXT,
    ADD COLUMN expert_flag BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_response_audit_logs_expert_flag ON response_audit_logs (client_id, expert_flag) WHERE expert_flag = TRUE;

-- =====================================================================
-- COMMENTS (for documentation)
-- =====================================================================

COMMENT ON TABLE recovery_event IS 'Tracks actual recovery events with amounts, dates, and sources for claims';
COMMENT ON TABLE deadline IS 'Tracks critical dates such as statute of limitations, demand deadlines, etc.';

COMMENT ON COLUMN claim.actual_recovery IS 'Sum of all recovery_event amounts for this claim';
COMMENT ON COLUMN claim.recovery_status IS 'Current status of recovery efforts (RecoveryStatus enum enforced in TypeScript)';

COMMENT ON COLUMN checklist_claim.outcome_snapshot IS 'JSONB snapshot of key decisions and answers when checklist is submitted';
COMMENT ON COLUMN checklist_claim.time_to_resolution_days IS 'Auto-calculated days from created_at to submitted_at';

COMMENT ON COLUMN response_audit_logs.decision_confidence IS 'Expert confidence level (0-1) for AI training metadata';
COMMENT ON COLUMN response_audit_logs.decision_rationale IS 'Expert reasoning for AI training (distinct from operational additional_info)';
COMMENT ON COLUMN response_audit_logs.expert_flag IS 'Marks high-quality responses suitable for AI training data';
