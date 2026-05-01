-- =====================================================
-- 03-generate-parties.sql
-- Generate 30 realistic parties for test data
-- 15 entity-type (individuals/businesses involved in loss)
-- 15 facilitator-type (law firms, adjusters, contractors)
-- =====================================================

-- Get client_id for inserts (assuming single client in dev)
DO $$
DECLARE
    v_client_id UUID;
    v_user_id UUID;
BEGIN
    SELECT id INTO v_client_id FROM client LIMIT 1;
    SELECT id INTO v_user_id FROM users ORDER BY created_at ASC LIMIT 1;

    -- =====================================================
    -- ENTITY PARTIES (15 - individuals/businesses involved in loss)
    -- =====================================================

    -- Individual entities (10)
    INSERT INTO party (client_id, name, first_name, last_name, party_type, is_business, created_by) VALUES
    (v_client_id, 'Michael Thompson', 'Michael', 'Thompson', 'entity', false, v_user_id),
    (v_client_id, 'Sarah Martinez', 'Sarah', 'Martinez', 'entity', false, v_user_id),
    (v_client_id, 'David Chen', 'David', 'Chen', 'entity', false, v_user_id),
    (v_client_id, 'Jennifer Williams', 'Jennifer', 'Williams', 'entity', false, v_user_id),
    (v_client_id, 'Robert Johnson', 'Robert', 'Johnson', 'entity', false, v_user_id),
    (v_client_id, 'Emily Davis', 'Emily', 'Davis', 'entity', false, v_user_id),
    (v_client_id, 'James Wilson', 'James', 'Wilson', 'entity', false, v_user_id),
    (v_client_id, 'Amanda Brown', 'Amanda', 'Brown', 'entity', false, v_user_id),
    (v_client_id, 'Christopher Lee', 'Christopher', 'Lee', 'entity', false, v_user_id),
    (v_client_id, 'Jessica Garcia', 'Jessica', 'Garcia', 'entity', false, v_user_id);

    -- Business entities (5)
    INSERT INTO party (client_id, name, organization, party_type, is_business, created_by) VALUES
    (v_client_id, 'Metro Transit Authority', 'Metro Transit Authority', 'entity', true, v_user_id),
    (v_client_id, 'Sunrise Properties LLC', 'Sunrise Properties LLC', 'entity', true, v_user_id),
    (v_client_id, 'Pacific Manufacturing Inc', 'Pacific Manufacturing Inc', 'entity', true, v_user_id),
    (v_client_id, 'Downtown Medical Center', 'Downtown Medical Center', 'entity', true, v_user_id),
    (v_client_id, 'Valley Construction Co', 'Valley Construction Co', 'entity', true, v_user_id);

    -- =====================================================
    -- FACILITATOR PARTIES (15 - service providers)
    -- =====================================================

    -- Insurance carriers (5)
    INSERT INTO party (client_id, name, organization, party_type, is_business, created_by) VALUES
    (v_client_id, 'State Farm Insurance', 'State Farm Insurance', 'facilitator', true, v_user_id),
    (v_client_id, 'Allstate Insurance Company', 'Allstate Insurance Company', 'facilitator', true, v_user_id),
    (v_client_id, 'Progressive Insurance', 'Progressive Insurance', 'facilitator', true, v_user_id),
    (v_client_id, 'GEICO', 'GEICO', 'facilitator', true, v_user_id),
    (v_client_id, 'Liberty Mutual', 'Liberty Mutual', 'facilitator', true, v_user_id);

    -- Law firms (5)
    INSERT INTO party (client_id, name, organization, party_type, is_business, created_by) VALUES
    (v_client_id, 'Morrison & Associates', 'Morrison & Associates', 'facilitator', true, v_user_id),
    (v_client_id, 'Campbell Law Group', 'Campbell Law Group', 'facilitator', true, v_user_id),
    (v_client_id, 'Sterling Legal Partners', 'Sterling Legal Partners', 'facilitator', true, v_user_id),
    (v_client_id, 'Hartley Davis LLP', 'Hartley Davis LLP', 'facilitator', true, v_user_id),
    (v_client_id, 'Rodriguez & Kim Attorneys', 'Rodriguez & Kim Attorneys', 'facilitator', true, v_user_id);

    -- Contractors / Medical providers / Consultants (5)
    INSERT INTO party (client_id, name, organization, party_type, is_business, created_by) VALUES
    (v_client_id, 'Premier Restoration Services', 'Premier Restoration Services', 'facilitator', true, v_user_id),
    (v_client_id, 'Allied Building Contractors', 'Allied Building Contractors', 'facilitator', true, v_user_id),
    (v_client_id, 'Metro Physical Therapy', 'Metro Physical Therapy', 'facilitator', true, v_user_id),
    (v_client_id, 'Expert Property Appraisers', 'Expert Property Appraisers', 'facilitator', true, v_user_id),
    (v_client_id, 'Advanced Diagnostic Imaging', 'Advanced Diagnostic Imaging', 'facilitator', true, v_user_id);

END $$;

SELECT 'Parties created:' AS info, COUNT(*) AS count FROM party;
