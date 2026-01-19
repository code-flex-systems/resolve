-- =====================================================
-- 06-generate-claim-parties.sql
-- Link parties to claims with roles
-- Each claim gets 1-4 parties:
--   - At least 1 entity (claimant/insured)
--   - 0-2 facilitators (insurance, law firm, repair shop)
-- =====================================================

DO $$
DECLARE
    v_client_id UUID;
    v_user_id UUID;
    v_claim RECORD;
    v_entity_parties INT[];
    v_facilitator_parties INT[];
    v_party_id INT;
    v_coverage_id INT;
    v_address_id INT;
    v_rep_id INT;
    v_num_facilitators INT;
    v_responsible_party_claim_party_id INT;
    i INT;
BEGIN
    SELECT id INTO v_client_id FROM client LIMIT 1;
    SELECT id INTO v_user_id FROM users WHERE email = 'owenfarthing@craig680.onmicrosoft.com' LIMIT 1;

    -- Get entity party IDs
    SELECT ARRAY_AGG(id ORDER BY id) INTO v_entity_parties
    FROM party WHERE party_type = 'entity';

    -- Get facilitator party IDs
    SELECT ARRAY_AGG(id ORDER BY id) INTO v_facilitator_parties
    FROM party WHERE party_type = 'facilitator';

    FOR v_claim IN SELECT id, claim_number FROM claim ORDER BY id LOOP

        -- Add primary entity party (insured/claimant)
        v_party_id := v_entity_parties[1 + (v_claim.id % array_length(v_entity_parties, 1))];

        INSERT INTO claim_party (
            client_id, claim_id, party_id, role, is_primary,
            liability_percentage, notes, created_by, created_at
        ) VALUES (
            v_client_id,
            v_claim.id,
            v_party_id,
            ARRAY['claimant', 'insured'],
            true,
            NULL, -- Primary party typically doesn't have liability
            'Primary insured party',
            v_user_id,
            NOW() - INTERVAL '1 day' * (v_claim.id % 100)
        );

        -- Add adverse entity party for ~70% of claims
        v_responsible_party_claim_party_id := NULL;
        IF (v_claim.id % 10) < 7 THEN
            v_party_id := v_entity_parties[1 + ((v_claim.id + 3) % array_length(v_entity_parties, 1))];

            INSERT INTO claim_party (
                client_id, claim_id, party_id, role, is_primary,
                liability_percentage, notes, created_by, created_at
            ) VALUES (
                v_client_id,
                v_claim.id,
                v_party_id,
                ARRAY['responsible_party'],
                false,
                -- Liability percentage for responsible party
                CASE (v_claim.id % 4)
                    WHEN 0 THEN 100
                    WHEN 1 THEN 75
                    WHEN 2 THEN 50
                    ELSE 25
                END,
                'Responsible party - at fault',
                v_user_id,
                NOW() - INTERVAL '1 day' * (v_claim.id % 100)
            )
            RETURNING id INTO v_responsible_party_claim_party_id;
        END IF;

        -- Add facilitator parties (insurance carriers, law firms) - nested under responsible_party
        v_num_facilitators := CASE WHEN v_responsible_party_claim_party_id IS NOT NULL THEN v_claim.id % 3 ELSE 0 END;

        FOR i IN 1..v_num_facilitators LOOP
            v_party_id := v_facilitator_parties[1 + ((v_claim.id + i) % array_length(v_facilitator_parties, 1))];

            -- Get address and rep for this facilitator
            SELECT id INTO v_address_id FROM party_address WHERE party_id = v_party_id LIMIT 1;
            SELECT id INTO v_rep_id FROM party_representative WHERE party_id = v_party_id LIMIT 1;

            -- Get a coverage for this facilitator (adverse carrier scenario)
            SELECT id INTO v_coverage_id FROM claim_coverage WHERE claim_id = v_claim.id LIMIT 1;

            INSERT INTO claim_party (
                client_id, claim_id, party_id, role, is_primary,
                parent_claim_party_id, address_id, representative_id, policy_limit, loss_type,
                notes, created_by, created_at
            ) VALUES (
                v_client_id,
                v_claim.id,
                v_party_id,
                CASE
                    WHEN i = 1 THEN ARRAY['adverse_carrier']
                    ELSE ARRAY['their_attorney']
                END,
                false,
                v_responsible_party_claim_party_id,
                v_address_id,
                v_rep_id,
                CASE WHEN i = 1 THEN (50000 + v_claim.id * 1000)::NUMERIC ELSE NULL END,
                CASE WHEN i = 1 THEN 'property_damage' ELSE NULL END,
                CASE
                    WHEN i = 1 THEN 'Adverse carrier for liability coverage'
                    ELSE 'Legal representation'
                END,
                v_user_id,
                NOW() - INTERVAL '1 day' * ((v_claim.id + i) % 100)
            );
        END LOOP;
    END LOOP;
END $$;

-- Link coverages to their claimant/insured claim_party
UPDATE claim_coverage cc
SET claim_party_id = (
    SELECT cp.id
    FROM claim_party cp
    WHERE cp.claim_id = cc.claim_id
      AND cp.deleted_at IS NULL
      AND cp.is_primary = true
      AND ('claimant' = ANY(cp.role) OR 'insured' = ANY(cp.role))
    LIMIT 1
)
WHERE cc.claim_party_id IS NULL;

SELECT 'Claim parties created:' AS info;
SELECT unnest(role) as role, COUNT(*) as count
FROM claim_party
GROUP BY unnest(role)
ORDER BY count DESC;
SELECT 'Total claim_party links:', COUNT(*) FROM claim_party;
SELECT 'Coverages linked to claimant parties:', COUNT(*) FROM claim_coverage WHERE claim_party_id IS NOT NULL;
