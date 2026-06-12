-- Seed reference data and feeds
DO $$
DECLARE
    v_client_id uuid := '00000000-0000-4000-8000-000000000001';
    v_admin_id uuid;
BEGIN
    SELECT id INTO v_admin_id FROM users WHERE role IN ('Super Admin', 'Admin') AND client_id = v_client_id LIMIT 1;

    -- Create a feed if none exists
    INSERT INTO feeds (id, name, feed_type, status, connection_options, schedule, client_id, created_by)
    SELECT gen_random_uuid(), 'Primary Claims Feed', 'database', 'Online', '{}'::jsonb, 12, v_client_id, v_admin_id
    WHERE NOT EXISTS (SELECT 1 FROM feeds WHERE client_id = v_client_id);

    RAISE NOTICE 'Reference data seeded';
END $$;
