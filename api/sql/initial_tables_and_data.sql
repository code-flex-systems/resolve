drop table if exists response_audit_logs;
drop table if exists question_response_answer;
drop table if exists question_response;
drop table if exists answer cascade;
drop table if exists question cascade;
drop table if exists page_instance cascade;
drop table if exists page cascade;
drop table if exists checklist_claim;
drop table if exists claim;
drop table if exists checklist;
drop table if exists doc;

create table checklist(
	id serial not null primary key,
	name text not null,
    created_by text not null,
    created_at text not null default now(),
    updated_at text not null default now()
);

create table claim(
	id serial not null primary key,
    checklist_id integer not null references checklist(id) on delete cascade,
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
	expected_recovery numeric
);

create table checklist_claim(
    claim_id integer not null references claim(id),
	checklist_id integer not null references checklist(id),
    last_opened not null timestamp without time zone default now(),
    unique(checklist_id, claim_id)
);

create table page(
	id serial not null primary key,
	title text not null,
	hidden boolean not null default false,
    version integer not null default 0
);

create table page_instance(
	id serial not null primary key,
	page_id integer not null references page(id) on delete cascade,
	checklist_id integer not null references checklist(id) on delete cascade,
	parent_instance_id integer references page_instance(id) on delete cascade,
    position integer not null
);

CREATE TABLE page_instance_status (
  id SERIAL PRIMARY KEY,
  claim_id INTEGER NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
  page_instance_id INTEGER NOT NULL REFERENCES page_instance(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('unstarted', 'in-progress', 'complete')),
  template_version INTEGER NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (claim_id, page_instance_id)
);
CREATE INDEX idx_status_lookup ON page_instance_status (claim_id, page_instance_id);
CREATE INDEX idx_status_template_version ON page_instance_status (template_version);

create table doc(
	id serial not null primary key,
	filename text not null,
	alias text not null
);

create table question(
	id serial not null primary key,
    page_id integer not null references page(id) on delete cascade,
	text text not null,
    position integer not null,
	type text not null check (type in ('multi', 'single', 'dropdown', 'freeform')),
	description_text text,
    description_image_url text,
    placeholder text,
    hidden boolean default false
);

create table answer(
	id serial not null primary key,
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
    hidden boolean default false
);

CREATE TABLE question_response (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER NOT NULL REFERENCES checklist(id) ON DELETE CASCADE,
    instance_id INTEGER NOT NULL REFERENCES page_instance(id) ON DELETE CASCADE,
    claim_id INTEGER NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    response_text TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
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
    response_id INTEGER REFERENCES question_response(id) ON DELETE SET NULL,
    user_id INTEGER NOT NULL, -- assuming a users table will be added
    checklist_id INTEGER NOT NULL REFERENCES checklist(id) ON DELETE CASCADE,
    instance_id INTEGER NOT NULL REFERENCES page_instance(id) ON DELETE CASCADE,
    claim_id INTEGER NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES question(id) ON DELETE CASCADE,

    action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
    old_response_text TEXT,
    new_response_text TEXT,

    old_answer_ids JSONB,
    new_answer_ids JSONB,

    old_additional_info JSONB,
    new_additional_info JSONB,

    timestamp TIMESTAMP DEFAULT NOW()
);