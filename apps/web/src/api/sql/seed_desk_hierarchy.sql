-- =============================================================================
-- DESK HIERARCHY SEED SCRIPT
-- =============================================================================
-- Populates desk location types and desk locations based on workflow documentation
-- NOT intended for production use - development/testing only
-- =============================================================================

DO $$
DECLARE
    v_client_id UUID;
    v_user_id UUID;
    v_type_id INT;
    v_location_ids INT[];
    v_claim_ids INT[];
    v_claim_id INT;
    i INT;
BEGIN
    -- Get client_id
    SELECT id INTO v_client_id FROM client LIMIT 1;

    IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'No client found. Please ensure at least one client exists.';
    END IF;

    -- Get a user for created_by
    SELECT id INTO v_user_id FROM users WHERE client_id = v_client_id LIMIT 1;

    RAISE NOTICE 'Using client_id: %, user_id: %', v_client_id, v_user_id;

    -- =============================================================================
    -- UPDATE EXISTING DESK LOCATIONS WITH WORK UNITS
    -- =============================================================================

    RAISE NOTICE 'Updating existing desk locations with work units...';

    UPDATE desk_location SET daily_work_units = CASE
        WHEN name ILIKE '%transactional%' THEN 96  -- 8 hours (96 x 5 min = 480 min)
        WHEN name ILIKE '%pending%' THEN 48        -- 4 hours
        WHEN name ILIKE '%hold%' THEN 24           -- 2 hours
        WHEN name ILIKE '%closed%' THEN 12         -- 1 hour
        WHEN name ILIKE '%referral%' THEN 72       -- 6 hours
        WHEN name ILIKE '%rfi%' OR name ILIKE '%request%' THEN 36  -- 3 hours
        WHEN name ILIKE '%review%' THEN 48         -- 4 hours
        ELSE 48                                     -- Default 4 hours
    END
    WHERE client_id = v_client_id AND deleted_at IS NULL;

    -- =============================================================================
    -- DESK LOCATION TYPES (Workflow Phases)
    -- =============================================================================

    RAISE NOTICE 'Creating desk location types...';

    -- Phase 1: Initial Triage (may already exist as "Evaluation")
    INSERT INTO desk_location_type (client_id, name, created_by)
    SELECT v_client_id, 'Initial Triage & Assessment', v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM desk_location_type
        WHERE client_id = v_client_id AND name = 'Initial Triage & Assessment' AND deleted_at IS NULL
    );

    -- Phase 2: Subrogation Investigation
    INSERT INTO desk_location_type (client_id, name, created_by)
    SELECT v_client_id, 'Subrogation Investigation', v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM desk_location_type
        WHERE client_id = v_client_id AND name = 'Subrogation Investigation' AND deleted_at IS NULL
    );

    -- Phase 3: Party Identification & Coverage Verification
    INSERT INTO desk_location_type (client_id, name, created_by)
    SELECT v_client_id, 'Adverse Coverage Verification', v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM desk_location_type
        WHERE client_id = v_client_id AND name = 'Adverse Coverage Verification' AND deleted_at IS NULL
    );

    -- Phase 4: Document Assembly & Demand
    INSERT INTO desk_location_type (client_id, name, created_by)
    SELECT v_client_id, 'Documentation and Demand Packages', v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM desk_location_type
        WHERE client_id = v_client_id AND name = 'Documentation and Demand Packages' AND deleted_at IS NULL
    );

    -- Phase 5: Settlement Negotiation
    INSERT INTO desk_location_type (client_id, name, created_by)
    SELECT v_client_id, 'Pursuit of Recovery', v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM desk_location_type
        WHERE client_id = v_client_id AND name = 'Pursuit of Recovery' AND deleted_at IS NULL
    );

    -- Phase 6: Arbitration
    INSERT INTO desk_location_type (client_id, name, created_by)
    SELECT v_client_id, 'Arbitration', v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM desk_location_type
        WHERE client_id = v_client_id AND name = 'Arbitration' AND deleted_at IS NULL
    );

    -- Phase 7: Litigation
    INSERT INTO desk_location_type (client_id, name, created_by)
    SELECT v_client_id, 'Litigation', v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM desk_location_type
        WHERE client_id = v_client_id AND name = 'Litigation' AND deleted_at IS NULL
    );

    -- =============================================================================
    -- DESK LOCATIONS (Work Queues within each Type)
    -- Standard locations: Pending, Transactional, RFI, Review for Closure, Closed
    -- =============================================================================

    RAISE NOTICE 'Creating desk locations...';

    -- For each type, create standard desk locations
    FOR v_type_id IN
        SELECT id FROM desk_location_type
        WHERE client_id = v_client_id AND deleted_at IS NULL
        AND name != 'Evaluation'  -- Skip existing Evaluation type
    LOOP
        -- Pending (low capacity - waiting on others)
        INSERT INTO desk_location (client_id, desk_location_type_id, name, daily_work_units, is_active, created_by)
        SELECT v_client_id, v_type_id, 'Pending', 48, TRUE, v_user_id
        WHERE NOT EXISTS (
            SELECT 1 FROM desk_location
            WHERE desk_location_type_id = v_type_id AND name = 'Pending' AND deleted_at IS NULL
        );

        -- Transactional (high capacity - active work)
        INSERT INTO desk_location (client_id, desk_location_type_id, name, daily_work_units, is_active, created_by)
        SELECT v_client_id, v_type_id, 'Transactional', 96, TRUE, v_user_id
        WHERE NOT EXISTS (
            SELECT 1 FROM desk_location
            WHERE desk_location_type_id = v_type_id AND name = 'Transactional' AND deleted_at IS NULL
        );

        -- Request for Information (medium capacity)
        INSERT INTO desk_location (client_id, desk_location_type_id, name, daily_work_units, is_active, created_by)
        SELECT v_client_id, v_type_id, 'Request for Information', 36, TRUE, v_user_id
        WHERE NOT EXISTS (
            SELECT 1 FROM desk_location
            WHERE desk_location_type_id = v_type_id AND name = 'Request for Information' AND deleted_at IS NULL
        );

        -- Review for Closure (medium capacity)
        INSERT INTO desk_location (client_id, desk_location_type_id, name, daily_work_units, is_active, created_by)
        SELECT v_client_id, v_type_id, 'Review for Closure', 48, TRUE, v_user_id
        WHERE NOT EXISTS (
            SELECT 1 FROM desk_location
            WHERE desk_location_type_id = v_type_id AND name = 'Review for Closure' AND deleted_at IS NULL
        );

        -- Closed (low capacity - final processing)
        INSERT INTO desk_location (client_id, desk_location_type_id, name, daily_work_units, is_active, created_by)
        SELECT v_client_id, v_type_id, 'Closed', 12, TRUE, v_user_id
        WHERE NOT EXISTS (
            SELECT 1 FROM desk_location
            WHERE desk_location_type_id = v_type_id AND name = 'Closed' AND deleted_at IS NULL
        );
    END LOOP;

    -- =============================================================================
    -- ASSIGN CLAIMS TO DESK LOCATIONS
    -- =============================================================================

    RAISE NOTICE 'Assigning claims to desk locations...';

    -- Get all active desk location IDs (excluding Closed locations)
    SELECT ARRAY_AGG(id) INTO v_location_ids
    FROM desk_location
    WHERE client_id = v_client_id
    AND deleted_at IS NULL
    AND is_active = TRUE
    AND name != 'Closed';

    -- Get claims that don't have a desk location assigned
    SELECT ARRAY_AGG(id) INTO v_claim_ids
    FROM claim
    WHERE client_id = v_client_id
    AND desk_location_id IS NULL
    LIMIT 40;

    IF v_location_ids IS NOT NULL AND v_claim_ids IS NOT NULL THEN
        -- Assign each claim to a random desk location
        FOREACH v_claim_id IN ARRAY v_claim_ids LOOP
            UPDATE claim SET
                desk_location_id = v_location_ids[1 + (RANDOM() * (array_length(v_location_ids, 1) - 1))::INT]
            WHERE id = v_claim_id;
        END LOOP;

        RAISE NOTICE 'Assigned % claims to desk locations', array_length(v_claim_ids, 1);
    ELSE
        RAISE NOTICE 'No claims to assign or no desk locations available';
    END IF;

    -- Also assign some claims that already have desk locations to different ones
    -- (simulating claims moving through workflow)
    UPDATE claim SET
        desk_location_id = (
            SELECT id FROM desk_location
            WHERE client_id = v_client_id AND deleted_at IS NULL AND is_active = TRUE
            ORDER BY RANDOM() LIMIT 1
        )
    WHERE client_id = v_client_id
    AND id IN (
        SELECT id FROM claim WHERE client_id = v_client_id ORDER BY RANDOM() LIMIT 20
    );

    -- =============================================================================
    -- SUMMARY
    -- =============================================================================

    RAISE NOTICE '=== DESK HIERARCHY SEED SUMMARY ===';
    RAISE NOTICE 'Desk Location Types: %', (SELECT COUNT(*) FROM desk_location_type WHERE client_id = v_client_id AND deleted_at IS NULL);
    RAISE NOTICE 'Desk Locations: %', (SELECT COUNT(*) FROM desk_location WHERE client_id = v_client_id AND deleted_at IS NULL);
    RAISE NOTICE 'Desk Locations with work units: %', (SELECT COUNT(*) FROM desk_location WHERE client_id = v_client_id AND deleted_at IS NULL AND daily_work_units IS NOT NULL);
    RAISE NOTICE 'Claims with desk location: %', (SELECT COUNT(*) FROM claim WHERE client_id = v_client_id AND desk_location_id IS NOT NULL);

END $$;
