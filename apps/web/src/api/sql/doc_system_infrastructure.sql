-- Document System Infrastructure
-- Date: 2025-10-30
-- Purpose: Comprehensive document management with hierarchical organization, version tracking, and relationship support

-- =====================================================================
-- DROP EXISTING DOC TABLE (no data to preserve)
-- =====================================================================

DROP TABLE IF EXISTS doc CASCADE;

-- =====================================================================
-- DOC GROUP TABLE (Hierarchical Organization)
-- =====================================================================

CREATE TABLE doc_group (
    id                  SERIAL PRIMARY KEY,
    client_id           UUID NOT NULL REFERENCES client(id),
    name                TEXT NOT NULL,
    description         TEXT,
    parent_group_id     INTEGER REFERENCES doc_group(id) ON DELETE CASCADE,
    group_type          TEXT NOT NULL DEFAULT 'custom',
    claim_id            INTEGER REFERENCES claim(id) ON DELETE CASCADE,
    color               TEXT,
    icon                TEXT,
    sort_order          INTEGER DEFAULT 0,
    created_by          UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by          UUID REFERENCES users(id),
    updated_at          TIMESTAMP,
    CONSTRAINT doc_group_type_check CHECK (group_type = ANY(ARRAY['claim_folder', 'category', 'custom']))
);

-- Indexes for doc_group
CREATE INDEX idx_doc_group_client ON doc_group (client_id);
CREATE INDEX idx_doc_group_parent ON doc_group (parent_group_id) WHERE parent_group_id IS NOT NULL;
CREATE INDEX idx_doc_group_claim ON doc_group (claim_id) WHERE claim_id IS NOT NULL;
CREATE INDEX idx_doc_group_type ON doc_group (group_type);

-- =====================================================================
-- DOC TABLE (Enhanced with Azure Storage Integration)
-- =====================================================================

CREATE TABLE doc (
    id                  SERIAL PRIMARY KEY,
    client_id           UUID NOT NULL REFERENCES client(id),

    -- File identification
    filename            TEXT NOT NULL,
    alias               TEXT NOT NULL,
    title               TEXT,

    -- File metadata
    file_size           BIGINT,
    mime_type           TEXT,
    storage_key         TEXT NOT NULL,
    preview_url         TEXT,

    -- Business metadata
    description         TEXT,
    doc_type            TEXT NOT NULL DEFAULT 'other',
    doc_status          TEXT NOT NULL DEFAULT 'approved',

    -- Organization
    doc_group_id        INTEGER REFERENCES doc_group(id) ON DELETE SET NULL,

    -- Relationships (all nullable, multiple possible)
    claim_id            INTEGER REFERENCES claim(id) ON DELETE CASCADE,
    recovery_event_id   INTEGER REFERENCES recovery_event(id) ON DELETE CASCADE,
    deadline_id         INTEGER REFERENCES deadline(id) ON DELETE CASCADE,
    page_instance_id    INTEGER REFERENCES page_instance(id) ON DELETE CASCADE,
    question_id         INTEGER REFERENCES question(id) ON DELETE CASCADE,
    answer_id           INTEGER REFERENCES answer(id) ON DELETE CASCADE,

    -- Version tracking
    version             INTEGER DEFAULT 1,
    replaces_doc_id     INTEGER REFERENCES doc(id) ON DELETE SET NULL,
    is_current_version  BOOLEAN DEFAULT true,

    -- Audit fields
    created_by          UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by          UUID REFERENCES users(id),
    updated_at          TIMESTAMP,

    -- Constraints
    CONSTRAINT doc_type_check CHECK (doc_type = ANY(ARRAY[
        'police_report', 'medical_record', 'invoice', 'correspondence',
        'settlement', 'photo', 'estimate', 'repair_invoice',
        'proof_of_payment', 'demand_letter', 'legal_filing', 'other'
    ])),
    CONSTRAINT doc_status_check CHECK (doc_status = ANY(ARRAY['draft', 'pending_review', 'approved', 'archived']))
);

-- Indexes for doc
CREATE INDEX idx_doc_client ON doc (client_id);
CREATE INDEX idx_doc_group ON doc (doc_group_id) WHERE doc_group_id IS NOT NULL;
CREATE INDEX idx_doc_claim ON doc (claim_id) WHERE claim_id IS NOT NULL;
CREATE INDEX idx_doc_recovery_event ON doc (recovery_event_id) WHERE recovery_event_id IS NOT NULL;
CREATE INDEX idx_doc_deadline ON doc (deadline_id) WHERE deadline_id IS NOT NULL;
CREATE INDEX idx_doc_page_instance ON doc (page_instance_id) WHERE page_instance_id IS NOT NULL;
CREATE INDEX idx_doc_question ON doc (question_id) WHERE question_id IS NOT NULL;
CREATE INDEX idx_doc_answer ON doc (answer_id) WHERE answer_id IS NOT NULL;
CREATE INDEX idx_doc_type ON doc (doc_type);
CREATE INDEX idx_doc_status ON doc (doc_status);
CREATE INDEX idx_doc_current_version ON doc (is_current_version) WHERE is_current_version = true;
CREATE INDEX idx_doc_storage_key ON doc (storage_key);
CREATE INDEX idx_doc_created_at ON doc (created_at DESC);

-- =====================================================================
-- DOC REQUIREMENT TABLES (Document Completeness Tracking)
-- =====================================================================

-- Define what documents are required for different scenarios
CREATE TABLE doc_requirement (
    id                      SERIAL PRIMARY KEY,
    client_id               UUID NOT NULL REFERENCES client(id),
    requirement_name        TEXT NOT NULL,
    description             TEXT,
    required_doc_type       TEXT NOT NULL,
    is_required             BOOLEAN DEFAULT true,
    checklist_id            INTEGER REFERENCES checklist(id) ON DELETE CASCADE,
    claim_id                INTEGER REFERENCES claim(id) ON DELETE CASCADE,
    created_by              UUID NOT NULL REFERENCES users(id),
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT doc_requirement_type_check CHECK (required_doc_type = ANY(ARRAY[
        'police_report', 'medical_record', 'invoice', 'correspondence',
        'settlement', 'photo', 'estimate', 'repair_invoice',
        'proof_of_payment', 'demand_letter', 'legal_filing', 'other'
    ]))
);

-- Track fulfillment of document requirements
CREATE TABLE doc_requirement_fulfillment (
    id                          SERIAL PRIMARY KEY,
    doc_requirement_id          INTEGER NOT NULL REFERENCES doc_requirement(id) ON DELETE CASCADE,
    doc_id                      INTEGER REFERENCES doc(id) ON DELETE SET NULL,
    manually_marked_complete    BOOLEAN DEFAULT false,
    notes                       TEXT,
    fulfilled_at                TIMESTAMP NOT NULL DEFAULT NOW(),
    fulfilled_by                UUID NOT NULL REFERENCES users(id)
);

-- Indexes for doc_requirement
CREATE INDEX idx_doc_requirement_client ON doc_requirement (client_id);
CREATE INDEX idx_doc_requirement_checklist ON doc_requirement (checklist_id) WHERE checklist_id IS NOT NULL;
CREATE INDEX idx_doc_requirement_claim ON doc_requirement (claim_id) WHERE claim_id IS NOT NULL;
CREATE INDEX idx_doc_requirement_type ON doc_requirement (required_doc_type);

-- Indexes for doc_requirement_fulfillment
CREATE INDEX idx_doc_fulfillment_requirement ON doc_requirement_fulfillment (doc_requirement_id);
CREATE INDEX idx_doc_fulfillment_doc ON doc_requirement_fulfillment (doc_id) WHERE doc_id IS NOT NULL;

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON TABLE doc_group IS 'Hierarchical organization of documents with parent-child relationships';
COMMENT ON TABLE doc IS 'Enhanced document storage with Azure Blob Storage integration, relationships, and version tracking';
COMMENT ON TABLE doc_requirement IS 'Define required documents for checklists or claims';
COMMENT ON TABLE doc_requirement_fulfillment IS 'Track which requirements have been satisfied';

COMMENT ON COLUMN doc.storage_key IS 'Azure Blob Storage key/path for the document';
COMMENT ON COLUMN doc.doc_type IS 'Categorical classification of document';
COMMENT ON COLUMN doc.doc_status IS 'Workflow status: draft, pending_review, approved, archived';
COMMENT ON COLUMN doc.version IS 'Version number for document versioning';
COMMENT ON COLUMN doc.replaces_doc_id IS 'Previous version of this document (if applicable)';
COMMENT ON COLUMN doc.is_current_version IS 'Flag to identify the latest version';

COMMENT ON COLUMN doc_group.parent_group_id IS 'Parent group for hierarchical folder structure';
COMMENT ON COLUMN doc_group.group_type IS 'claim_folder (auto-created), category (system), or custom (user-created)';
COMMENT ON COLUMN doc_group.claim_id IS 'Associated claim for auto-created claim folders';
