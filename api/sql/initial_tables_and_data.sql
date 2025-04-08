drop table if exists answer;
drop table if exists question;
drop table if exists page_instance cascade;
drop table if exists page_instance_parent;
drop table if exists page;
drop table if exists checklist;
drop table if exists doc;

create table checklist(
	id serial not null primary key,
	name text not null
);

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
	page_id integer not null references page(id) on delete cascade,
	q_text text not null,
	q_type text not null,
	q_desc text,
	doc_id integer references doc(id)
);

create table answer(
	id serial not null primary key,
	question_id integer not null references question(id) on delete cascade,
	a_order integer not null,
	a_text text not null,
    a_desc text,
	a_type text,
    a_freeform_lines integer,
	a_freeform_placeholder text,
	doc_id integer references doc(id),
	calls_page_id integer references page(id)
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
(default, 2, 'Who are you?', 'single', 'Tell me who you are', null),
(default, 2, 'What are you?', 'single', null, 1),
(default, 2, 'How are you?', 'multi', null, 2),
(default, 2, 'Why are you?', 'single', null, null);

insert into answer
values
(default, 1, 1, 'John', null, null, null, null, null, null),
(default, 1, 2, 'Mary', null, null, null, null, null, null),
(default, 1, 3, 'Joe', 'Joe is a great guy', null, null, null, null, null),
(default, 3, 1, 'Great', null, null, null, null, null, null),
(default, 3, 2, 'Fine', null, null, null, null, null, null),
(default, 3, 3, 'Okay', null, null, null, null, 3, null),
(default, 3, 4, 'Awful', null, null, null, null, null, 3),
(default, 4, 1, 'N/A', null, 'freeform', 2, 'You should fill this in', null, 3);