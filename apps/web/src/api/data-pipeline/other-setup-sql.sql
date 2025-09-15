insert into checklist
values
	(default, '1c118f90-3153-4dfb-b350-953e42f0d1aa', 'General Subrogation', '82c1aaec-ef0d-4b95-9234-e1ad31e0d3ce', now() - interval '1 year', '23a5709b-f7a8-413e-a47d-1266744170fe', now() - interval '30 days', true),
	(default, '1c118f90-3153-4dfb-b350-953e42f0d1aa', 'Auto', '23a5709b-f7a8-413e-a47d-1266744170fe', now() - interval '6 months', '82c1aaec-ef0d-4b95-9234-e1ad31e0d3ce', now() - interval '60 days', true),
	(default, '1c118f90-3153-4dfb-b350-953e42f0d1aa', 'Home', '82c1aaec-ef0d-4b95-9234-e1ad31e0d3ce', now() - interval '3 months', '82c1aaec-ef0d-4b95-9234-e1ad31e0d3ce', now(), true),
	(default, '1c118f90-3153-4dfb-b350-953e42f0d1aa', 'Health & Personal Damage', '3912a28f-2132-4f47-873a-e5fb6747dc1b', now() - interval '6 months', '215814cd-aa6a-43f3-9985-ce554f3b6889', now(), true);


insert into feeds
values
(default, '1c118f90-3153-4dfb-b350-953e42f0d1aa', 'Client External', 5, 'database', '{}', 'Online', now() - interval '1 day', '82c1aaec-ef0d-4b95-9234-e1ad31e0d3ce', now() - interval '1 year', null, now() - interval '1 year'),
(default, '1c118f90-3153-4dfb-b350-953e42f0d1aa', 'Client Internal', 12, 'database', '{}', 'Online', now() - interval '7 days', '82c1aaec-ef0d-4b95-9234-e1ad31e0d3ce', now() - interval '1 year', '215814cd-aa6a-43f3-9985-ce554f3b6889', now());