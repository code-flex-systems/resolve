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
drop table if exists doc;
drop table if exists verification_tokens;
drop table if exists sessions;
drop table if exists accounts;
drop table if exists feeds;
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
    unique(email)
);

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
    unique(checklist_id, claim_id)
);

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

create table doc(
	id serial not null primary key,
    client_id uuid not null references client(id),
	filename text not null,
	alias text not null,
    created_by uuid not null references users(id),
    created_at timestamp not null default now()
);

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
    calls_instance_id INTEGER REFERENCES page_instance(id),
    hidden boolean default false,
    created_by uuid not null references users(id),
    created_at timestamp not null default now(),
    updated_by uuid references users(id),
    updated_at timestamp not null default now()
);

CREATE TABLE question_response (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER NOT NULL REFERENCES checklist(id) ON DELETE CASCADE,
    instance_id INTEGER NOT NULL REFERENCES page_instance(id) ON DELETE CASCADE,
    claim_id INTEGER NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    response_text TEXT,
    created_by uuid not null references users(id),
    created_at timestamp not null DEFAULT NOW(),
    updated_by uuid references users(id),
    updated_at timestamp not null DEFAULT NOW(),
    client_id uuid not null references client(id),
    UNIQUE(checklist_id, instance_id, claim_id, question_id)
);

CREATE TABLE question_response_answer (
    id SERIAL PRIMARY KEY,
    response_id INTEGER NOT NULL REFERENCES question_response(id) ON DELETE CASCADE,
    answer_id INTEGER NOT NULL REFERENCES answer(id),
    additional_info TEXT
);

CREATE TABLE response_audit_logs (
    id SERIAL PRIMARY KEY,
    client_id uuid not null references client(id),
    response_id INTEGER REFERENCES question_response(id) ON DELETE SET NULL,
    user_id uuid not null references users(id),
    checklist_id INTEGER NOT NULL REFERENCES checklist(id) ON DELETE CASCADE,
    instance_id INTEGER NOT NULL REFERENCES page_instance(id) ON DELETE CASCADE,
    claim_id INTEGER NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES question(id) ON DELETE CASCADE,

    action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
    old_response_text TEXT,
    new_response_text TEXT,

    old_answers JSONB,
    new_answers JSONB,

    old_additional_info JSONB,
    new_additional_info JSONB,

    timestamp TIMESTAMP DEFAULT NOW()
);

-- admin action logs table

create table admin_action_logs(
	id serial not null primary key,
	client_id uuid not null references client(id),
    user_id uuid not null references users(id),
	entity_id integer not null,
	entity_name text not null,
	action text not null check (action in ('DELETE', 'GET', 'PATCH', 'POST')),
	value jsonb,
	created_at timestamp with time zone not null default now()
);

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

create table action_log(
	id serial not null primary key,
	client_id uuid not null references client(id),
	action_id integer not null references action(id),
    status text not null,
	created_by uuid not null references users(id),
	created_at timestamp not null default now()
);