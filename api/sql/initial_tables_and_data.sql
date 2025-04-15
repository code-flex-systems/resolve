drop table if exists claim_dummy;
drop table if exists question_answer;
drop table if exists answer;
drop table if exists page_question;
drop table if exists question;
drop table if exists page_instance cascade;
drop table if exists page_instance_parent;
drop table if exists page;
drop table if exists checklist;
drop table if exists doc;

create table claim_dummy(
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
	expected_recovery numeric
);

create table checklist(
	id serial not null primary key,
	name text not null
);

create table checklist_claim(
	checklist_id integer not null references checklist(id),
	claim_id integer not null references claim_dummy(id)
);
insert into checklist_claim
values
(1, 1);

create table page(
	id serial not null primary key,
	title text not null,
	hidden boolean not null default false
);

create table page_instance(
	id serial not null primary key,
	page_id integer not null references page(id) on delete cascade,
	checklist_id integer not null references checklist(id) on delete cascade
);

create table page_instance_parent(
	instance_id integer not null references page_instance(id) on delete cascade,
	parent_instance_id integer references page_instance(id) on delete cascade
);

create table doc(
	id serial not null primary key,
	filename text not null,
	alias text not null
);

create table question(
	id serial not null primary key,
	q_text text not null,
	q_type text not null,
	q_desc text,
	doc_id integer references doc(id),
    hidden boolean default false
);

create table page_question(
    page_id integer not null references page(id) on delete cascade,
    question_id integer not null references question(id) on delete cascade
);

create table answer(
	id serial not null primary key,
	a_order integer not null,
	a_text text not null,
    a_type text not null,
    a_desc text,
    a_freeform_lines integer,
	a_freeform_placeholder text,
	doc_id integer references doc(id),
	calls_page_id integer references page(id),
    hidden boolean default false
);

create table question_answer(
    question_id integer not null references question(id) on delete cascade,
    answer_id integer not null references answer(id) on delete cascade
);

insert into checklist
values
(default, 'Checklist 1'),
(default, 'Checklist 2');

insert into page
values
(default, 'Page 1'),
(default, 'Page 2'),
(default, 'Page 3'),
(default, 'Page 4'),
(default, 'Page 5'),
(default, 'Page 6'),
(default, 'Page 7'),
(default, 'Page 8'),
(default, 'Page 9'),
(default, 'Page 10');

insert into page_instance
values
(default, 1, 1),
(default, 2, 1),
(default, 3, 1),
(default, 4, 1),
(default, 5, 1),
(default, 6, 1),
(default, 7, 1),
(default, 8, 1),
(default, 9, 1),
(default, 10, 1);

insert into page_instance_parent
values
(3, 1),
(2, 1),
(7, 6),
(8, 6),
(9, 8),
(10, 8);

insert into doc
values
(default, '12345.txt', 'File 1'),
(default, '12345.txt', 'File 2'),
(default, '12345.txt', 'File 3'),
(default, '12345.txt', 'File 4'),
(default, '12345.txt', 'File 5');

insert into question
values
(default, 'Who are you?', 'single', 'Tell me who you are', null),
(default, 'What are you?', 'single', null, 1),
(default, 'How are you?', 'multi', null, 2),
(default, 'Why are you?', 'single', null, null);

insert into page_question
values
(2, 1),
(2, 2),
(2, 3),
(2, 4);

insert into answer
values
(default, 1, 'John', 'standard', null, null, null, null, null),
(default, 2, 'Mary', 'standard', null, null, null, null, null),
(default, 3, 'Joe', 'standard', 'Joe is a great guy', null, null, null, null),
(default, 1, 'Great', 'standard', null, null, null, null, null),
(default, 2, 'Fine', 'standard', null, null, null, null, null),
(default, 3, 'Okay', 'standard', null, null, null, 3, null),
(default, 4, 'Awful', 'standard', null, null, null, null, 3),
(default, 1, 'N/A', 'freeform', null, 2, 'You should fill this in', null, 3);

insert into question_answer
values
(1, 1),
(1, 2),
(1, 3),
(3, 4),
(3, 5),
(3, 6),
(3, 7),
(4, 8);

insert into claim_dummy
values
(default, '52B53112100001', 'The Main Street America Group', 'Adjuster Not Found on CLMS', 'MICHELE AXTMANN', 77249.31, 77249.31, '01/09/2015', '40 Web Avenue North Kingstown, RI', 'KYOUNG', '04/08/2025', 0);