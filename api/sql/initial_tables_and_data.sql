drop table if exists response_audit_logs;
drop table if exists question_response_answer;
drop table if exists question_response;
drop table if exists answer cascade;
drop table if exists question cascade;
drop table if exists page_instance cascade;
drop table if exists page cascade;
drop table if exists claim_dummy;
drop table if exists checklist;
drop table if exists doc;

create table checklist(
	id serial not null primary key,
	name text not null
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

create table page(
	id serial not null primary key,
	title text not null,
	hidden boolean not null default false
);

create table page_instance(
	id serial not null primary key,
	page_id integer not null references page(id) on delete cascade,
	checklist_id integer not null references checklist(id) on delete cascade,
	parent_instance_id integer references page_instance(id) on delete cascade
);

create table doc(
	id serial not null primary key,
	filename text not null,
	alias text not null
);

create table question(
	id serial not null primary key,
    page_id integer not null references page(id) on delete cascade,
	text text not null,
	type text not null check (type in ('multi', 'single', 'dropdown', 'freeform')),
	description_text text,
    description_image_url text,
    placeholder text,
    num_lines integer check (num_lines > 0),
    hidden boolean default false
);

create table answer(
	id serial not null primary key,
	question_id INTEGER NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    text text not null,
    position INTEGER NOT NULL,
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

-- Insert checklists
INSERT INTO checklist (name) VALUES 
('Checklist A'),
('Checklist B');

-- Insert claims
INSERT INTO claim (
    checklist_id, claim_number, client, client_adjuster, insured, claim_amount,
    total_incurred, date_of_loss, loss_location, last_updated_by, last_update, expected_recovery
) VALUES
(1, 'CLM123456', 'Acme Corp', 'John Doe', 'Jane Smith', 10000.00, 7500.00, '2024-01-15', '123 Main St', 'audit_bot', '2024-03-01', 2000.00),
(2, 'CLM654321', 'Beta Inc', 'Alice Roe', 'Bob White', 25000.00, 12000.00, '2024-02-20', '456 Elm St', 'user_admin', '2024-03-05', 5000.00);

-- Insert pages
INSERT INTO page (title, hidden) VALUES 
('Welcome Page', false),
('Details Page', false);

-- Insert page instances
INSERT INTO page_instance (page_id, checklist_id, parent_instance_id) VALUES
(1, 1, NULL),
(2, 1, 1),
(1, 2, NULL);

-- Insert documents
INSERT INTO doc (filename, alias) VALUES 
('policy.pdf', 'Insurance Policy'),
('photo.jpg', 'Loss Site Photo');

-- Insert questions
INSERT INTO question (page_id, text, type, description_text, description_image_url, placeholder, num_lines, hidden) VALUES 
(2, 'What is the cause of loss?', 'freeform', 'Describe how the damage occurred.', NULL, 'Enter details here...', 3, false),
(2, 'Select all applicable damages:', 'multi', NULL, NULL, NULL, NULL, false),
(2, 'Is the policyholder satisfied?', 'single', NULL, NULL, NULL, NULL, false);

-- Insert answers
INSERT INTO answer (question_id, text, position, has_additional_info, additional_info_placeholder, additional_info_num_lines, hidden) VALUES
(2, 'Water Damage', 1, false, NULL, NULL, false),
(2, 'Fire Damage', 2, true, 'Explain fire source...', 2, false),
(3, 'Yes', 1, false, NULL, NULL, false),
(3, 'No', 2, true, 'Please explain dissatisfaction...', 3, false);

-- Insert question responses
INSERT INTO question_response (checklist_id, instance_id, claim_id, question_id, response_text) VALUES 
(1, 1, 1, 1, 'Water leak from pipe burst'),
(1, 2, 1, 2, NULL),
(1, 2, 1, 3, NULL);

-- Insert response answers
INSERT INTO question_response_answer (response_id, answer_id, additional_info) VALUES
(2, 1, NULL),
(2, 2, 'Electrical fire from kitchen appliance'),
(3, 4, 'Delayed response from adjuster');

-- Insert audit logs
INSERT INTO response_audit_logs (
    response_id, user_id, checklist_id, instance_id, claim_id, question_id, action,
    old_response_text, new_response_text, old_answer_ids, new_answer_ids,
    old_additional_info, new_additional_info
) VALUES 
(3, 1001, 1, 2, 1, 3, 'update', 
 NULL, 'No', 
 '["3"]', '["4"]',
 NULL, '{"4": "Delayed response from adjuster"}');
