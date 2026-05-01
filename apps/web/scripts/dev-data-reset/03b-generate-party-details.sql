-- =====================================================
-- 03b-generate-party-details.sql
-- Add addresses, phones, emails to parties
-- =====================================================

DO $$
DECLARE
    v_user_id UUID;
    v_client_id UUID;
    v_party RECORD;
    v_party_int INTEGER;
BEGIN
    SELECT id INTO v_client_id FROM client LIMIT 1;
    SELECT id INTO v_user_id FROM users ORDER BY created_at ASC LIMIT 1;

    -- Add addresses for all parties (using party name pattern for variety)
    FOR v_party IN SELECT id, name, is_business FROM party LOOP
        -- Derive a deterministic integer from the UUID
        v_party_int := abs(('x' || right(v_party.id::text, 8))::bit(32)::int);

        -- Add primary address
        INSERT INTO party_address (party_id, street_address, city, state, postal_code, country, address_type, address_status, created_by)
        SELECT
            v_party.id,
            CASE (v_party_int % 10)
                WHEN 0 THEN '123 Main Street'
                WHEN 1 THEN '456 Oak Avenue'
                WHEN 2 THEN '789 Elm Boulevard'
                WHEN 3 THEN '321 Pine Road'
                WHEN 4 THEN '555 Cedar Lane'
                WHEN 5 THEN '777 Maple Drive'
                WHEN 6 THEN '888 Birch Court'
                WHEN 7 THEN '999 Walnut Way'
                WHEN 8 THEN '111 Cherry Street'
                ELSE '222 Spruce Avenue'
            END,
            CASE (v_party_int % 8)
                WHEN 0 THEN 'Los Angeles'
                WHEN 1 THEN 'San Francisco'
                WHEN 2 THEN 'Phoenix'
                WHEN 3 THEN 'Denver'
                WHEN 4 THEN 'Seattle'
                WHEN 5 THEN 'Portland'
                WHEN 6 THEN 'San Diego'
                ELSE 'Las Vegas'
            END,
            CASE (v_party_int % 8)
                WHEN 0 THEN 'CA'
                WHEN 1 THEN 'CA'
                WHEN 2 THEN 'AZ'
                WHEN 3 THEN 'CO'
                WHEN 4 THEN 'WA'
                WHEN 5 THEN 'OR'
                WHEN 6 THEN 'CA'
                ELSE 'NV'
            END,
            LPAD((10000 + (v_party_int % 90000))::TEXT, 5, '0'),
            'USA',
            CASE WHEN v_party.is_business THEN 'business' ELSE 'home' END,
            'valid',
            v_user_id;

        -- Add phone for all parties
        INSERT INTO party_phone (client_id, party_id, phone_number, area_code, country_code, phone_type, phone_status, created_by)
        VALUES (
            v_client_id,
            v_party.id,
            LPAD((1000000 + (v_party_int % 9000000))::TEXT, 7, '0'),
            CASE (v_party_int % 5)
                WHEN 0 THEN '213'
                WHEN 1 THEN '415'
                WHEN 2 THEN '602'
                WHEN 3 THEN '303'
                ELSE '206'
            END,
            '1',
            CASE WHEN v_party.is_business THEN 'work' ELSE 'mobile' END,
            'valid',
            v_user_id
        );

        -- Add email for all parties
        INSERT INTO party_email (client_id, party_id, email_address, email_type, created_by)
        VALUES (
            v_client_id,
            v_party.id,
            LOWER(REPLACE(v_party.name, ' ', '.')) || '@example.com',
            CASE WHEN v_party.is_business THEN 'business' ELSE 'personal' END,
            v_user_id
        );
    END LOOP;
END $$;

-- Add representatives for facilitator parties (insurance/law firms)
DO $$
DECLARE
    v_user_id UUID;
    v_party RECORD;
    v_party_int INTEGER;
    v_address_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM users ORDER BY created_at ASC LIMIT 1;

    FOR v_party IN SELECT p.id, p.name FROM party p WHERE p.party_type = 'facilitator' LOOP
        -- Derive a deterministic integer from the UUID
        v_party_int := abs(('x' || right(v_party.id::text, 8))::bit(32)::int);

        -- Get the primary address for this party
        SELECT id INTO v_address_id FROM party_address WHERE party_id = v_party.id LIMIT 1;

        -- Add 1-2 representatives per facilitator
        INSERT INTO party_representative (party_id, address_id, first_name, last_name, title, email, phone, is_primary, created_by)
        VALUES (
            v_party.id,
            v_address_id,
            CASE (v_party_int % 5)
                WHEN 0 THEN 'John'
                WHEN 1 THEN 'Mary'
                WHEN 2 THEN 'Richard'
                WHEN 3 THEN 'Patricia'
                ELSE 'William'
            END,
            CASE (v_party_int % 5)
                WHEN 0 THEN 'Smith'
                WHEN 1 THEN 'Johnson'
                WHEN 2 THEN 'Williams'
                WHEN 3 THEN 'Jones'
                ELSE 'Brown'
            END,
            CASE
                WHEN v_party.name LIKE '%Insurance%' THEN 'Claims Adjuster'
                WHEN v_party.name LIKE '%Law%' OR v_party.name LIKE '%Attorney%' OR v_party.name LIKE '%LLP%' THEN 'Attorney'
                ELSE 'Account Manager'
            END,
            'rep.' || left(v_party.id::text, 8) || '@example.com',
            '555-' || LPAD((1000 + v_party_int % 9000)::TEXT, 4, '0'),
            true,
            v_user_id
        );
    END LOOP;
END $$;

SELECT 'Party details added:' AS info;
SELECT 'Addresses:' AS type, COUNT(*) AS count FROM party_address
UNION ALL
SELECT 'Phones:', COUNT(*) FROM party_phone
UNION ALL
SELECT 'Emails:', COUNT(*) FROM party_email
UNION ALL
SELECT 'Representatives:', COUNT(*) FROM party_representative;
