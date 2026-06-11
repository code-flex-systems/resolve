drop table if exists comment;
drop table if exists action_log;
drop table if exists action;
drop table if exists auth_events;
drop table if exists admin_action_logs;
drop table if exists response_audit_logs;
drop table if exists question_response_answer;
drop table if exists question_response;
drop table if exists answer cascade;
drop table if exists question cascade;
drop table if exists page_instance_status cascade;
drop table if exists page_instance cascade;
drop table if exists page cascade;
drop table if exists checklist_claim;
drop table if exists claim;
drop table if exists checklist;
drop table if exists doc_requirement_fulfillment;
drop table if exists doc_requirement;
drop table if exists doc cascade;
drop table if exists doc_group cascade;
drop table if exists verification_tokens;
drop table if exists sessions;
drop table if exists accounts;
drop table if exists feeds;
drop table if exists password_reset_tokens;
drop table if exists users;
drop table if exists client;

create table client(
	id uuid not null primary key default gen_random_uuid(),
	name text not null
);

create table users(
        id uuid not null primary key default gen_random_uuid(),
    client_id uuid references client(id),
        email text not null,
	email_verified timestamp with time zone,
	password_hash text not null,
	first text not null,
	last text not null,
    phone varchar(16),
    phone_verified timestamp with time zone,
	role text,
	disabled boolean not null default false,
	created_by uuid references users(id),
    created_at timestamp not null default now(),
    updated_by uuid references users(id),
    updated_at timestamp not null default now(),
    must_change_password boolean not null default true,
    mfa_secret text,
    mfa_enabled boolean not null default false,
    onboarding_email_sent boolean not null default false,
    last_login timestamp,
    unique(email)
);

create index idx_users_client_disabled_name on users (client_id, disabled, last, first);
create index idx_users_client_last_login on users (client_id, last_login);

create table accounts (
  id                serial primary key,
  user_id           uuid not null references users(id) on delete cascade,
  type              text not null,
  provider          text not null,
  provider_account_id text not null,
  refresh_token     text,
  access_token      text,
  expires_at        integer,
  token_type        text,
  scope             text,
  id_token          text,
  session_state     text
);

create table sessions (
  id           serial primary key,
  session_token text not null unique,
  user_id      uuid not null references users(id) on delete cascade,
  expires      timestamp with time zone not null
);

create table verification_tokens (
  identifier text not null,
  token      text not null,
  expires    timestamp with time zone not null,
  primary key (identifier, token)
);

create table checklist(
        id serial not null primary key,
    client_id uuid not null references client(id),
        name text not null,
    created_by uuid not null references users(id),
    created_at timestamp not null default now(),
    updated_by uuid references users(id),
    updated_at timestamp not null default now(),
    published boolean not null default false
);

create index idx_checklist_client_published on checklist (client_id, published);
create index idx_checklist_lower_name on checklist (lower(name));

-- Table: public.feeds

CREATE TABLE public.feeds (
    id                  SERIAL PRIMARY KEY,
    client_id uuid not null references client(id),
    name                TEXT NOT NULL UNIQUE,
    schedule            INTEGER NOT NULL CHECK (schedule BETWEEN 0 AND 23),
    feed_type           TEXT NOT NULL CHECK (feed_type IN ('sftp', 'rest_api', 'database')),
    connection_options  JSONB NOT NULL,
    status              TEXT NOT NULL DEFAULT 'Inactive' 
                        CHECK (status IN ('Online', 'Muted', 'Offline', 'Inactive')),
    last_synced_at      TIMESTAMPTZ,
    created_by uuid not null references users(id),
    created_at timestamp not null default now(),
    updated_by uuid references users(id),
    updated_at timestamp not null default now()
);

-- Indexes for common queries
-- Index on feed_type for filtering by type
CREATE INDEX idx_feeds_feed_type ON public.feeds (feed_type);
-- Partial index on status = 'Online' for quickly finding active feeds
CREATE INDEX idx_feeds_active_status ON public.feeds (id)
WHERE status = 'Online';
-- GIN index on connection_options if you need to query inside the JSONB
CREATE INDEX idx_feeds_conn_opts ON public.feeds USING GIN (connection_options);
CREATE INDEX idx_feeds_client_status ON public.feeds (client_id, status);

create table claim(
        id serial not null primary key,
        claim_number text,
        client text,
	client_adjuster text,
	insured text,
	claim_amount numeric,
	total_incurred numeric,
	date_of_loss date,
	loss_location text,
	last_updated_by text,
	last_update date,
	expected_recovery numeric,
    client_id uuid not null references client(id),
    feed_id integer references feeds(id),
    created_by uuid references users(id),
    created_at timestamp,
    unique(claim_number)
);

create index idx_claim_client_feed on claim (client_id, feed_id);
create index idx_claim_client_created_at on claim (client_id, created_at);

create table checklist_claim(
    claim_id integer not null references claim(id),
        checklist_id integer not null references checklist(id),
    last_opened timestamp not null default now(),
    client_id uuid not null references client(id),
    created_by uuid not null references users(id),
    created_at timestamp not null default now(),
    status text not null,
    updated_by uuid references users(id),
    updated_at timestamp,
    submitted_by uuid references users(id),
    submitted_at timestamp,
    assignee uuid references users(id),
    unique(checklist_id, claim_id)
);

create index idx_checklist_claim_claim_id on checklist_claim (claim_id);
create index idx_checklist_claim_client_status on checklist_claim (client_id, status);
create index idx_checklist_claim_client_assignee on checklist_claim (client_id, assignee);
create index idx_checklist_claim_client_created_at on checklist_claim (client_id, created_at);

create table page(
        id serial not null primary key,
    client_id uuid not null references client(id),
        title text not null,
	hidden boolean not null default false,
    version integer not null default 0,
    created_by uuid not null references users(id),
    created_at timestamp not null default now(),
    updated_by uuid references users(id),
    updated_at timestamp not null default now()
);

create index idx_page_client_hidden on page (client_id, hidden);

create table page_instance(
        id serial not null primary key,
    client_id uuid not null references client(id),
        page_id integer not null references page(id) on delete cascade,
	checklist_id integer not null references checklist(id) on delete cascade,
	parent_instance_id integer references page_instance(id) on delete cascade,
    position integer not null,
    created_by uuid not null references users(id),
    created_at timestamp not null default now(),
    updated_by uuid references users(id),
    updated_at timestamp not null default now()
);

create index idx_page_instance_client_checklist_parent on page_instance (client_id, checklist_id, parent_instance_id);

CREATE TABLE page_instance_status (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
    page_instance_id INTEGER NOT NULL REFERENCES page_instance(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('unstarted', 'in-progress', 'complete')),
    template_version INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    client_id uuid not null references client(id),
    UNIQUE (claim_id, page_instance_id)
);
CREATE INDEX idx_status_lookup ON page_instance_status (claim_id, page_instance_id);
CREATE INDEX idx_status_template_version ON page_instance_status (template_version);

-- Note: the doc table is created in the DOCUMENT SYSTEM (Phase 2) section
-- below (an earlier minimal definition was removed - it shadowed the real
-- one and broke single-transaction execution of this file).

create table question(
        id serial not null primary key,
    client_id uuid not null references client(id),
    page_id integer not null references page(id) on delete cascade,
	text text not null,
    position integer not null,
	type text not null check (type in ('multi', 'single', 'dropdown', 'freeform')),
	description_text text,
    description_image_url text,
    placeholder text,
    hidden boolean default false,
    created_by uuid not null references users(id),
    created_at timestamp not null default now(),
    updated_by uuid references users(id),
    updated_at timestamp not null default now()
);

create index idx_question_client_page on question (client_id, page_id);

create table answer(
        id serial not null primary key,
    client_id uuid not null references client(id),
        question_id INTEGER NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    text text not null,
    position INTEGER NOT NULL,
    grade NUMERIC,
    description_text TEXT,
    description_image_url TEXT,
    has_additional_info BOOLEAN DEFAULT FALSE,
    additional_info_placeholder TEXT,
    additional_info_num_lines INTEGER CHECK (additional_info_num_lines > 0),
    calls_instance_id INTEGER REFERENCES page_instance(id) ON DELETE SET NULL,
    hidden boolean default false,
    created_by uuid not null references users(id),
    created_at timestamp not null default now(),
    updated_by uuid references users(id),
    updated_at timestamp not null default now()
);

create index idx_answer_client_question_position on answer (client_id, question_id, position);
create index idx_answer_client_calls_instance on answer (client_id, calls_instance_id);

CREATE TABLE question_response (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER NOT NULL REFERENCES checklist(id) ON DELETE CASCADE,
    instance_id INTEGER NOT NULL REFERENCES page_instance(id) ON DELETE CASCADE,
    claim_id INTEGER NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES question(id) ON DELETE SET NULL,
    response_text TEXT,
    -- Added out-of-band in the original environment; required by later
    -- migrations (2026-04-28 retypes it to uuid)
    response_doc_id INTEGER,
    created_by uuid not null references users(id),
    created_at timestamp not null DEFAULT NOW(),
    updated_by uuid references users(id),
    updated_at timestamp not null DEFAULT NOW(),
    client_id uuid not null references client(id),
    UNIQUE(checklist_id, instance_id, claim_id, question_id)
);

CREATE INDEX idx_question_response_client_scope ON question_response (client_id, checklist_id, claim_id, instance_id);

CREATE TABLE question_response_answer (
    id SERIAL PRIMARY KEY,
    response_id INTEGER NOT NULL REFERENCES question_response(id) ON DELETE CASCADE,
    answer_id INTEGER REFERENCES answer(id) ON DELETE SET NULL,
    additional_info TEXT
);

CREATE INDEX idx_qra_response_id ON question_response_answer (response_id);
CREATE INDEX idx_qra_answer_id ON question_response_answer (answer_id);

CREATE TABLE response_audit_logs (
  id                SERIAL PRIMARY KEY,
  client_id         UUID    NOT NULL REFERENCES client(id),
  response_id       INTEGER REFERENCES question_response(id) ON DELETE SET NULL,
  user_id           UUID    REFERENCES users(id) ON DELETE SET NULL,
  checklist_id      INTEGER REFERENCES checklist(id) ON DELETE SET NULL,
  instance_id       INTEGER REFERENCES page_instance(id) ON DELETE SET NULL,
  claim_id          INTEGER REFERENCES claim(id) ON DELETE SET NULL,
  question_id       INTEGER REFERENCES question(id) ON DELETE SET NULL,

  -- snapshot of the question & page at the moment of change
  question_text     TEXT    NOT NULL,
  page_label        TEXT    NOT NULL,

  action            TEXT    NOT NULL 
                         CHECK (action IN ('insert','update','delete')),

  -- old vs new free‐text responses
  old_response_text TEXT,
  new_response_text TEXT,

  -- arrays of { label, additional_info } snapshots
  old_answers       JSONB   NOT NULL DEFAULT '[]', 
  new_answers       JSONB   NOT NULL DEFAULT '[]',

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_response_audit_logs_client_created_at ON response_audit_logs (client_id, created_at);
CREATE INDEX idx_response_audit_logs_scope ON response_audit_logs (client_id, checklist_id, claim_id);
CREATE INDEX idx_response_audit_logs_client_user ON response_audit_logs (client_id, user_id);


-- admin action logs table

create table admin_action_logs(
	id serial not null primary key,
	client_id uuid not null references client(id),
    user_id uuid not null references users(id),
	entity_id text not null,
	entity_name text not null,
	action text not null check (action in ('CREATE', 'UPDATE', 'DELETE', 'BULK_UPDATE', 'BULK_DELETE')),
	value jsonb,
	created_at timestamp with time zone not null default now()
);

create index idx_admin_action_logs_client_entity on admin_action_logs (client_id, entity_name, entity_id);
create index idx_admin_action_logs_client_user_created on admin_action_logs (client_id, user_id, created_at desc);
create index idx_admin_action_logs_entity on admin_action_logs (entity_name, entity_id);

-- auth events

create table auth_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id) on delete cascade,
    event_type text not null, -- e.g. 'login_success', 'login_failure', 'password_reset', 'mfa_setup'
    event_details jsonb,      -- optional structured metadata
    ip_address inet,          -- optional
    user_agent text,          -- optional
    created_at timestamp not null default now()
);

-- Optional index for frequent queries (e.g. latest events per user)
create index idx_auth_events_user_created on auth_events(user_id, created_at desc);

-- Optional index for querying by event type
create index idx_auth_events_event_type on auth_events(event_type);

-- password tokens

create table password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token text not null,
  expires_at timestamp not null,
  used boolean not null default false,
  created_at timestamp not null default now()
);
create unique index on password_reset_tokens(token);

create index idx_password_reset_tokens_user_created_at on password_reset_tokens (user_id, created_at);

-- actions
create table action(
        id serial not null primary key,
        client_id uuid not null references client(id),
	answer_id integer not null references answer(id) on delete cascade,
	type text not null,
	definition jsonb not null,
	created_by uuid not null references users(id),
	created_at timestamp not null default now(),
	updated_by uuid references users(id),
        updated_at timestamp,
        unique(answer_id)
);

create index idx_action_client_answer on action (client_id, answer_id);

create table action_log(
        id serial not null primary key,
        client_id uuid not null references client(id),
        action_id integer not null references action(id),
    status text not null,
        created_by uuid not null references users(id),
        created_at timestamp not null default now()
);

create index idx_action_log_client_action on action_log (client_id, action_id);
create index idx_action_log_client_created_at on action_log (client_id, created_at);

-- comments

create table comment(
        id serial not null primary key,
        client_id uuid not null references client(id),
        body text not null,
	checklist_id integer not null references checklist(id),
	claim_id integer not null references claim(id),
	instance_id integer references page_instance(id) ON DELETE SET NULL,
        question_id integer references question(id) ON DELETE SET NULL,
        created_by uuid not null references users(id),
        created_at timestamp not null default now(),
        updated_at timestamp
);

create index idx_comment_scope on comment (client_id, checklist_id, claim_id, instance_id);
create index idx_comment_client_question on comment (client_id, question_id);
create index idx_comment_client_updated_at on comment (client_id, updated_at desc, created_at desc);

-- =====================================================================
-- PHASE 1: Recovery Tracking & AI Data Infrastructure
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

-- Comments for documentation
COMMENT ON TABLE recovery_event IS 'Tracks actual recovery events with amounts, dates, and sources for claims';
COMMENT ON TABLE deadline IS 'Tracks critical dates such as statute of limitations, demand deadlines, etc.';

COMMENT ON COLUMN claim.actual_recovery IS 'Sum of all recovery_event amounts for this claim';
COMMENT ON COLUMN claim.recovery_status IS 'Current status of recovery efforts (RecoveryStatus enum enforced in TypeScript)';

COMMENT ON COLUMN checklist_claim.outcome_snapshot IS 'JSONB snapshot of key decisions and answers when checklist is submitted';
COMMENT ON COLUMN checklist_claim.time_to_resolution_days IS 'Auto-calculated days from created_at to submitted_at';

COMMENT ON COLUMN response_audit_logs.decision_confidence IS 'Expert confidence level (0-1) for AI training metadata';
COMMENT ON COLUMN response_audit_logs.decision_rationale IS 'Expert reasoning for AI training (distinct from operational additional_info)';
COMMENT ON COLUMN response_audit_logs.expert_flag IS 'Marks high-quality responses suitable for AI training data';

-- =====================================================================
-- DOCUMENT SYSTEM (Phase 2)
-- =====================================================================

-- DOC GROUP TABLE (Hierarchical Organization)
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
    system              BOOLEAN DEFAULT false,
    user_id             UUID REFERENCES users(id),
    created_by          UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by          UUID REFERENCES users(id),
    updated_at          TIMESTAMP,
    CONSTRAINT doc_group_type_check CHECK (group_type = ANY(ARRAY['claim_folder', 'category', 'custom', 'user']))
);

-- Indexes for doc_group
CREATE INDEX idx_doc_group_client ON doc_group (client_id);
CREATE INDEX idx_doc_group_parent ON doc_group (parent_group_id) WHERE parent_group_id IS NOT NULL;
CREATE INDEX idx_doc_group_claim ON doc_group (claim_id) WHERE claim_id IS NOT NULL;
CREATE INDEX idx_doc_group_type ON doc_group (group_type);
CREATE INDEX idx_doc_group_user ON doc_group (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_doc_group_system ON doc_group (system) WHERE system = true;

-- Unique constraints for system folders
CREATE UNIQUE INDEX idx_doc_group_users_folder
ON doc_group (client_id, name)
WHERE name = 'Users' AND group_type = 'category' AND parent_group_id IS NULL;

CREATE UNIQUE INDEX idx_doc_group_user_folder
ON doc_group (client_id, user_id)
WHERE group_type = 'user' AND user_id IS NOT NULL;

CREATE UNIQUE INDEX idx_doc_group_shared_folder
ON doc_group (client_id, name)
WHERE name = 'Shared' AND group_type = 'category' AND parent_group_id IS NULL;

-- DOC TABLE (Enhanced with Azure Storage Integration)
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
    -- Added out-of-band in the original environment; required by later
    -- migrations (2026-03-21 retypes it to uuid)
    response_doc_id     INTEGER,
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

-- DOC REQUIREMENT TABLES (Document Completeness Tracking)
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

-- Comments for documentation
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
-- ============================================================================
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
