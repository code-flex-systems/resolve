-- =============================================================================
-- TEST DATA SEED SCRIPT
-- =============================================================================
-- This script populates test data for development and testing purposes.
-- NOT intended for production use.
-- =============================================================================

-- Get a client_id and user_id to use for created_by fields
DO $$
DECLARE
    v_client_id UUID;
    v_user_id UUID;
    v_user_ids UUID[];
    v_claim_ids INT[];
    v_desk_location_ids INT[];
    v_party_ids INT[];
    v_office_ids INT[];

    -- Party variables
    v_party_id INT;
    v_office_id INT;

    -- Loop variables
    v_claim_id INT;
    v_expected_recovery NUMERIC;
    v_recovery_amount NUMERIC;
    v_recovery_date DATE;
    i INT;
BEGIN
    -- Get client_id
    SELECT id INTO v_client_id FROM client LIMIT 1;

    IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'No client found. Please ensure at least one client exists.';
    END IF;

    -- Get a sample of user IDs
    SELECT ARRAY_AGG(id) INTO v_user_ids
    FROM (SELECT id FROM users WHERE client_id = v_client_id LIMIT 10) u;

    IF array_length(v_user_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'No users found. Please ensure at least one user exists.';
    END IF;

    v_user_id := v_user_ids[1];

    -- Get existing claim IDs
    SELECT ARRAY_AGG(id) INTO v_claim_ids
    FROM (SELECT id FROM claim WHERE client_id = v_client_id ORDER BY id LIMIT 50) c;

    IF array_length(v_claim_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'No claims found. Please ensure claims exist.';
    END IF;

    -- Get existing desk location IDs
    SELECT ARRAY_AGG(id) INTO v_desk_location_ids
    FROM desk_location WHERE client_id = v_client_id AND deleted_at IS NULL;

    RAISE NOTICE 'Using client_id: %, user_id: %', v_client_id, v_user_id;
    RAISE NOTICE 'Found % users, % claims, % desk locations',
        array_length(v_user_ids, 1),
        array_length(v_claim_ids, 1),
        COALESCE(array_length(v_desk_location_ids, 1), 0);

    -- =============================================================================
    -- PARTY DATA
    -- =============================================================================

    RAISE NOTICE 'Creating party data...';

    -- Insert Insurance Companies (Adverse Carriers) - Facilitator type
    INSERT INTO party (client_id, name, organization, party_type, party_category, email, phone, address, created_by)
    VALUES
        (v_client_id, 'State Farm Insurance', 'State Farm', 'facilitator', 'adverse_carrier', 'claims@statefarm.com', '800-732-5246', '1 State Farm Plaza, Bloomington, IL 61710', v_user_id),
        (v_client_id, 'Allstate Insurance', 'Allstate', 'facilitator', 'adverse_carrier', 'claims@allstate.com', '800-255-7828', '2775 Sanders Rd, Northbrook, IL 60062', v_user_id),
        (v_client_id, 'GEICO', 'GEICO', 'facilitator', 'adverse_carrier', 'claims@geico.com', '800-841-3000', '5260 Western Ave, Chevy Chase, MD 20815', v_user_id),
        (v_client_id, 'Progressive Insurance', 'Progressive', 'facilitator', 'adverse_carrier', 'claims@progressive.com', '800-776-4737', '6300 Wilson Mills Rd, Mayfield Village, OH 44143', v_user_id),
        (v_client_id, 'Liberty Mutual', 'Liberty Mutual', 'facilitator', 'adverse_carrier', 'claims@libertymutual.com', '800-290-8711', '175 Berkeley St, Boston, MA 02116', v_user_id),
        (v_client_id, 'Farmers Insurance', 'Farmers', 'facilitator', 'adverse_carrier', 'claims@farmers.com', '888-327-6335', '6301 Owensmouth Ave, Woodland Hills, CA 91367', v_user_id),
        (v_client_id, 'Nationwide Insurance', 'Nationwide', 'facilitator', 'adverse_carrier', 'claims@nationwide.com', '877-669-6877', '1 Nationwide Plaza, Columbus, OH 43215', v_user_id),
        (v_client_id, 'USAA', 'USAA', 'facilitator', 'adverse_carrier', 'claims@usaa.com', '800-531-8722', '9800 Fredericksburg Rd, San Antonio, TX 78288', v_user_id);

    -- Get all party IDs we just created
    SELECT ARRAY_AGG(id) INTO v_party_ids
    FROM party WHERE client_id = v_client_id AND party_category = 'adverse_carrier';

    -- Insert Law Firms (Attorneys) - Facilitator type
    INSERT INTO party (client_id, name, organization, party_type, party_category, email, phone, address, created_by)
    VALUES
        (v_client_id, 'Morgan & Morgan', 'Morgan & Morgan, P.A.', 'facilitator', 'attorney', 'intake@forthepeople.com', '800-959-1444', '20 N Orange Ave, Orlando, FL 32801', v_user_id),
        (v_client_id, 'Cellino & Barnes', 'Cellino Law', 'facilitator', 'attorney', 'info@cellinolaw.com', '800-888-8888', '69 Delaware Ave, Buffalo, NY 14202', v_user_id),
        (v_client_id, 'Jacoby & Meyers', 'Jacoby & Meyers LLP', 'facilitator', 'attorney', 'contact@jacobymeyers.com', '800-529-1555', '1450 Broadway, New York, NY 10018', v_user_id),
        (v_client_id, 'Johnson & Associates', 'Johnson Law Firm', 'facilitator', 'attorney', 'contact@johnsonlaw.com', '555-123-4567', '100 Main St, Suite 500, Dallas, TX 75201', v_user_id);

    -- Insert Experts - Facilitator type
    INSERT INTO party (client_id, name, organization, party_type, party_category, email, phone, address, created_by)
    VALUES
        (v_client_id, 'Dr. James Wilson', 'Metro Medical Experts', 'facilitator', 'expert', 'jwilson@metromedical.com', '555-234-5678', '500 Medical Center Dr, Chicago, IL 60601', v_user_id),
        (v_client_id, 'Sarah Chen, PE', 'Accident Reconstruction Associates', 'facilitator', 'expert', 'schen@accidentrecon.com', '555-345-6789', '750 Engineering Way, Detroit, MI 48201', v_user_id),
        (v_client_id, 'Michael Torres, CPA', 'Forensic Accounting Services', 'facilitator', 'expert', 'mtorres@forensicacct.com', '555-456-7890', '200 Financial Plaza, New York, NY 10004', v_user_id);

    -- Insert Vendors - Facilitator type
    INSERT INTO party (client_id, name, organization, party_type, party_category, email, phone, address, created_by)
    VALUES
        (v_client_id, 'ABC Auto Body', 'ABC Collision Center', 'facilitator', 'vendor', 'service@abcautobody.com', '555-567-8901', '1200 Industrial Blvd, Houston, TX 77001', v_user_id),
        (v_client_id, 'Quick Tow Services', 'Quick Tow Inc', 'facilitator', 'vendor', 'dispatch@quicktow.com', '555-678-9012', '800 Tow Truck Lane, Phoenix, AZ 85001', v_user_id),
        (v_client_id, 'ProCopy Document Services', 'ProCopy LLC', 'facilitator', 'vendor', 'orders@procopy.com', '555-789-0123', '450 Copy Center Dr, Atlanta, GA 30301', v_user_id);

    -- Insert Responsible Parties - Entity type
    INSERT INTO party (client_id, name, party_type, party_category, email, phone, address, notes, created_by)
    VALUES
        (v_client_id, 'John Smith', 'entity', 'responsible_party', 'jsmith@email.com', '555-111-2222', '123 Oak St, Springfield, IL 62701', 'At-fault driver in 3-car collision', v_user_id),
        (v_client_id, 'ABC Transport LLC', 'entity', 'responsible_party', 'contact@abctransport.com', '555-222-3333', '500 Trucking Way, Memphis, TN 38101', 'Commercial trucking company', v_user_id),
        (v_client_id, 'Maria Garcia', 'entity', 'responsible_party', 'mgarcia@email.com', '555-333-4444', '456 Elm Ave, Austin, TX 78701', 'Ran red light causing T-bone collision', v_user_id),
        (v_client_id, 'City of Riverside', 'entity', 'responsible_party', 'claims@riverside.gov', '555-444-5555', '3900 Main St, Riverside, CA 92501', 'Municipality - road maintenance issue', v_user_id),
        (v_client_id, 'Robert Johnson', 'entity', 'responsible_party', 'rjohnson@email.com', '555-555-6666', '789 Pine Rd, Denver, CO 80201', 'Property owner - slip and fall', v_user_id);

    -- Insert Claimants - Entity type
    INSERT INTO party (client_id, name, party_type, party_category, email, phone, address, created_by)
    VALUES
        (v_client_id, 'Emily Watson', 'entity', 'claimant', 'ewatson@email.com', '555-666-7777', '321 Maple Dr, Seattle, WA 98101', v_user_id),
        (v_client_id, 'David Brown', 'entity', 'claimant', 'dbrown@email.com', '555-777-8888', '654 Cedar Ln, Portland, OR 97201', v_user_id),
        (v_client_id, 'Lisa Anderson', 'entity', 'claimant', 'landerson@email.com', '555-888-9999', '987 Birch St, Miami, FL 33101', v_user_id);

    -- Insert Witnesses - Entity type
    INSERT INTO party (client_id, name, party_type, party_category, email, phone, address, notes, created_by)
    VALUES
        (v_client_id, 'Thomas Miller', 'entity', 'witness', 'tmiller@email.com', '555-999-0000', '147 Witness Way, Boston, MA 02101', 'Eyewitness to intersection collision', v_user_id),
        (v_client_id, 'Jennifer Lee', 'entity', 'witness', 'jlee@email.com', '555-000-1111', '258 Observer St, Philadelphia, PA 19101', 'Store employee who witnessed slip and fall', v_user_id);

    -- =============================================================================
    -- PARTY OFFICES
    -- =============================================================================

    RAISE NOTICE 'Creating party offices...';

    -- Add offices to insurance companies
    FOR v_party_id IN
        SELECT id FROM party WHERE client_id = v_client_id AND party_category = 'adverse_carrier'
    LOOP
        -- Primary office (headquarters)
        INSERT INTO party_office (party_id, office_name, address, phone, fax, is_primary, created_by)
        VALUES (v_party_id, 'Headquarters',
            (SELECT address FROM party WHERE id = v_party_id),
            (SELECT phone FROM party WHERE id = v_party_id),
            CONCAT('555-', (RANDOM() * 900 + 100)::INT, '-', (RANDOM() * 9000 + 1000)::INT),
            TRUE, v_user_id);

        -- Regional offices
        INSERT INTO party_office (party_id, office_name, address, phone, fax, is_primary, created_by)
        VALUES
            (v_party_id, 'Northeast Regional', '100 Park Ave, New York, NY 10017',
             CONCAT('212-', (RANDOM() * 900 + 100)::INT, '-', (RANDOM() * 9000 + 1000)::INT),
             CONCAT('212-', (RANDOM() * 900 + 100)::INT, '-', (RANDOM() * 9000 + 1000)::INT),
             FALSE, v_user_id),
            (v_party_id, 'Southeast Regional', '200 Peachtree St, Atlanta, GA 30303',
             CONCAT('404-', (RANDOM() * 900 + 100)::INT, '-', (RANDOM() * 9000 + 1000)::INT),
             CONCAT('404-', (RANDOM() * 900 + 100)::INT, '-', (RANDOM() * 9000 + 1000)::INT),
             FALSE, v_user_id),
            (v_party_id, 'West Regional', '300 California St, San Francisco, CA 94104',
             CONCAT('415-', (RANDOM() * 900 + 100)::INT, '-', (RANDOM() * 9000 + 1000)::INT),
             CONCAT('415-', (RANDOM() * 900 + 100)::INT, '-', (RANDOM() * 9000 + 1000)::INT),
             FALSE, v_user_id);
    END LOOP;

    -- Add offices to law firms
    FOR v_party_id IN
        SELECT id FROM party WHERE client_id = v_client_id AND party_category = 'attorney'
    LOOP
        INSERT INTO party_office (party_id, office_name, address, phone, fax, is_primary, created_by)
        VALUES (v_party_id, 'Main Office',
            (SELECT address FROM party WHERE id = v_party_id),
            (SELECT phone FROM party WHERE id = v_party_id),
            CONCAT('555-', (RANDOM() * 900 + 100)::INT, '-', (RANDOM() * 9000 + 1000)::INT),
            TRUE, v_user_id);
    END LOOP;

    -- =============================================================================
    -- PARTY REPRESENTATIVES
    -- =============================================================================

    RAISE NOTICE 'Creating party representatives...';

    -- Add representatives to insurance companies
    FOR v_party_id IN
        SELECT id FROM party WHERE client_id = v_client_id AND party_category = 'adverse_carrier'
    LOOP
        -- Get primary office for this party
        SELECT id INTO v_office_id FROM party_office
        WHERE party_id = v_party_id AND is_primary = TRUE LIMIT 1;

        INSERT INTO party_representative (party_id, office_id, first_name, last_name, title, email, phone, is_primary, created_by)
        VALUES
            (v_party_id, v_office_id, 'Claims', 'Department', 'Claims Manager',
             CONCAT('claims', v_party_id, '@insurance.com'),
             CONCAT('800-', (RANDOM() * 900 + 100)::INT, '-', (RANDOM() * 9000 + 1000)::INT),
             TRUE, v_user_id),
            (v_party_id, v_office_id, 'Senior', 'Adjuster', 'Senior Claims Adjuster',
             CONCAT('adjuster', v_party_id, '@insurance.com'),
             CONCAT('800-', (RANDOM() * 900 + 100)::INT, '-', (RANDOM() * 9000 + 1000)::INT),
             FALSE, v_user_id);
    END LOOP;

    -- Add representatives to law firms
    FOR v_party_id IN
        SELECT id FROM party WHERE client_id = v_client_id AND party_category = 'attorney'
    LOOP
        SELECT id INTO v_office_id FROM party_office
        WHERE party_id = v_party_id AND is_primary = TRUE LIMIT 1;

        INSERT INTO party_representative (party_id, office_id, first_name, last_name, title, email, phone, is_primary, created_by)
        VALUES
            (v_party_id, v_office_id, 'Lead', 'Attorney', 'Partner',
             CONCAT('attorney', v_party_id, '@lawfirm.com'),
             CONCAT('555-', (RANDOM() * 900 + 100)::INT, '-', (RANDOM() * 9000 + 1000)::INT),
             TRUE, v_user_id),
            (v_party_id, v_office_id, 'Legal', 'Assistant', 'Paralegal',
             CONCAT('paralegal', v_party_id, '@lawfirm.com'),
             CONCAT('555-', (RANDOM() * 900 + 100)::INT, '-', (RANDOM() * 9000 + 1000)::INT),
             FALSE, v_user_id);
    END LOOP;

    -- =============================================================================
    -- UPDATE CLAIMS WITH RECOVERY FIELDS
    -- =============================================================================

    RAISE NOTICE 'Updating claims with recovery fields...';

    -- Update claims with realistic recovery-related data
    FOR i IN 1..array_length(v_claim_ids, 1) LOOP
        v_claim_id := v_claim_ids[i];

        -- Generate expected recovery based on claim amount (typically 30-80% of claim)
        v_expected_recovery := (
            SELECT COALESCE(claim_amount, (RANDOM() * 50000 + 5000)::NUMERIC(12,2)) * (RANDOM() * 0.5 + 0.3)
            FROM claim WHERE id = v_claim_id
        );

        -- Update with line_of_business, loss_type, recovery fields
        UPDATE claim SET
            line_of_business = (ARRAY['auto', 'property', 'general_liability', 'workers_comp'])[1 + (RANDOM() * 3)::INT],
            loss_type = (ARRAY['collision', 'comprehensive', 'fire', 'theft', 'water_damage', 'bodily_injury', 'property_damage'])[1 + (RANDOM() * 6)::INT],
            expected_recovery = v_expected_recovery,
            reserved_recovery = v_expected_recovery * (RANDOM() * 0.3 + 0.7), -- 70-100% of expected
            paid_recovery = CASE WHEN RANDOM() > 0.6 THEN v_expected_recovery * (RANDOM() * 0.5 + 0.2) ELSE 0 END,
            recovery_status = (ARRAY['pending', 'in_progress', 'recovered', 'closed_no_recovery'])[1 + (RANDOM() * 3)::INT],
            substatus = (ARRAY['investigation', 'demand_sent', 'negotiation', 'settlement_reached', 'litigation', 'closed_recovered'])[1 + (RANDOM() * 5)::INT]
        WHERE id = v_claim_id;
    END LOOP;

    -- =============================================================================
    -- RECOVERY EVENTS
    -- =============================================================================

    RAISE NOTICE 'Creating recovery events...';

    -- Add recovery events for claims with paid_recovery > 0
    FOR v_claim_id IN
        SELECT id FROM claim
        WHERE client_id = v_client_id
        AND paid_recovery IS NOT NULL
        AND paid_recovery > 0
        LIMIT 30
    LOOP
        -- Get expected recovery for this claim
        SELECT expected_recovery INTO v_expected_recovery FROM claim WHERE id = v_claim_id;

        -- Create 1-3 recovery events per claim
        FOR i IN 1..(1 + (RANDOM() * 2)::INT) LOOP
            v_recovery_amount := (v_expected_recovery / (1 + (RANDOM() * 2)::INT)) * (RANDOM() * 0.4 + 0.1);
            v_recovery_date := CURRENT_DATE - (RANDOM() * 180)::INT; -- Within last 6 months

            INSERT INTO recovery_event (
                claim_id, client_id, recovery_amount, recovery_date, recovery_source, notes, created_by
            ) VALUES (
                v_claim_id,
                v_client_id,
                v_recovery_amount,
                v_recovery_date,
                (ARRAY['State Farm Insurance', 'Allstate Insurance', 'GEICO', 'Progressive Insurance', 'Liberty Mutual', 'Direct Payment'])[1 + (RANDOM() * 5)::INT],
                (ARRAY[
                    'Initial settlement payment received',
                    'Partial recovery - negotiated settlement',
                    'Final payment per settlement agreement',
                    'Subrogation recovery payment',
                    'Insurance reimbursement check received',
                    'Wire transfer from adverse carrier'
                ])[1 + (RANDOM() * 5)::INT],
                v_user_ids[1 + (RANDOM() * (array_length(v_user_ids, 1) - 1))::INT]
            );
        END LOOP;
    END LOOP;

    -- Update actual_recovery based on sum of recovery_events
    UPDATE claim c SET
        actual_recovery = COALESCE((
            SELECT SUM(recovery_amount)
            FROM recovery_event re
            WHERE re.claim_id = c.id
        ), 0)
    WHERE c.client_id = v_client_id;

    -- =============================================================================
    -- TASKS
    -- =============================================================================

    RAISE NOTICE 'Creating tasks...';

    -- Only create tasks if desk locations exist
    IF array_length(v_desk_location_ids, 1) > 0 THEN
        -- Create tasks for various claims
        FOR i IN 1..LEAST(40, array_length(v_claim_ids, 1)) LOOP
            v_claim_id := v_claim_ids[i];

            -- Create 1-3 tasks per claim
            FOR i IN 1..(1 + (RANDOM() * 2)::INT) LOOP
                INSERT INTO task (
                    claim_id, client_id, desk_location_id, title, description,
                    task_type, status, due_date, assigned_by, work_units,
                    claimed_by, claimed_at, completed_by, completed_at, completion_notes
                ) VALUES (
                    v_claim_id,
                    v_client_id,
                    v_desk_location_ids[1 + (RANDOM() * (array_length(v_desk_location_ids, 1) - 1))::INT],
                    (ARRAY[
                        'Review initial documentation',
                        'Send demand letter',
                        'Follow up with adverse carrier',
                        'Request medical records',
                        'Schedule IME appointment',
                        'Review settlement offer',
                        'Prepare litigation package',
                        'Contact claimant for statement',
                        'Verify coverage information',
                        'Process payment request'
                    ])[1 + (RANDOM() * 9)::INT],
                    (ARRAY[
                        'Review all submitted documentation for completeness and accuracy',
                        'Draft and send formal demand letter to adverse carrier',
                        'Contact adverse carrier claims department for status update',
                        'Request updated medical records from treating physicians',
                        'Coordinate with medical expert for independent examination',
                        'Analyze settlement offer and prepare counter-proposal',
                        'Compile all necessary documents for potential litigation',
                        'Obtain detailed statement from claimant regarding incident',
                        'Confirm policy limits and coverage with adverse carrier',
                        'Review and process subrogation payment request'
                    ])[1 + (RANDOM() * 9)::INT],
                    (ARRAY['generic', 'outbound_call', 'inbound_call', 'send_document', 'request_document', 'send_demand', 'review', 'follow_up', 'letter'])[1 + (RANDOM() * 8)::INT],
                    (ARRAY['pending', 'pending', 'pending', 'in_progress', 'in_progress', 'completed', 'cancelled'])[1 + (RANDOM() * 6)::INT],
                    CURRENT_DATE + (RANDOM() * 30 - 10)::INT, -- Due date: -10 to +20 days from now
                    v_user_ids[1 + (RANDOM() * (array_length(v_user_ids, 1) - 1))::INT],
                    (1 + (RANDOM() * 5)::INT), -- Work units: 1-6 (5-30 minutes)
                    CASE WHEN RANDOM() > 0.6 THEN v_user_ids[1 + (RANDOM() * (array_length(v_user_ids, 1) - 1))::INT] ELSE NULL END,
                    CASE WHEN RANDOM() > 0.6 THEN CURRENT_TIMESTAMP - INTERVAL '1 day' * (RANDOM() * 7)::INT ELSE NULL END,
                    NULL,
                    NULL,
                    NULL
                );
            END LOOP;
        END LOOP;

        -- Update completed tasks with completion info
        UPDATE task SET
            completed_by = claimed_by,
            completed_at = CURRENT_TIMESTAMP - INTERVAL '1 day' * (RANDOM() * 5)::INT,
            completion_notes = (ARRAY[
                'Task completed successfully',
                'Documentation reviewed and approved',
                'Letter sent via certified mail',
                'Contact made, follow-up scheduled',
                'Payment processed'
            ])[1 + (RANDOM() * 4)::INT]
        WHERE status = 'completed' AND claimed_by IS NOT NULL;

        -- Update in_progress tasks to have claimed_by if not set
        UPDATE task SET
            claimed_by = (SELECT id FROM users WHERE client_id = v_client_id ORDER BY RANDOM() LIMIT 1),
            claimed_at = CURRENT_TIMESTAMP - INTERVAL '1 hour' * (RANDOM() * 48)::INT
        WHERE status = 'in_progress' AND claimed_by IS NULL;

        -- Add some cancelled tasks with reasons
        UPDATE task SET
            cancellation_reason = (ARRAY[
                'Claim settled - task no longer needed',
                'Duplicate task created in error',
                'Reassigned to different desk location',
                'Claimant withdrew claim',
                'Superseded by updated instructions'
            ])[1 + (RANDOM() * 4)::INT],
            cancelled_by = (SELECT id FROM users WHERE client_id = v_client_id ORDER BY RANDOM() LIMIT 1),
            cancelled_at = CURRENT_TIMESTAMP - INTERVAL '1 day' * (RANDOM() * 10)::INT
        WHERE status = 'cancelled';

        -- Fix created_at dates to be before completion/cancellation dates
        UPDATE task
        SET created_at = completed_at - INTERVAL '1 day' * (1 + (RANDOM() * 10)::INT)
        WHERE status = 'completed' AND completed_at IS NOT NULL;

        UPDATE task
        SET created_at = claimed_at - INTERVAL '1 day' * (1 + (RANDOM() * 5)::INT)
        WHERE status = 'in_progress' AND claimed_at IS NOT NULL;

        UPDATE task
        SET created_at = cancelled_at - INTERVAL '1 day' * (1 + (RANDOM() * 7)::INT)
        WHERE status = 'cancelled' AND cancelled_at IS NOT NULL;

        UPDATE task
        SET created_at = CURRENT_TIMESTAMP - INTERVAL '1 day' * (1 + (RANDOM() * 14)::INT)
        WHERE status = 'pending';

        RAISE NOTICE 'Created tasks successfully';
    ELSE
        RAISE NOTICE 'No desk locations found - skipping task creation';
    END IF;

    -- =============================================================================
    -- SUMMARY
    -- =============================================================================

    RAISE NOTICE '=== SEED DATA SUMMARY ===';
    RAISE NOTICE 'Parties created: %', (SELECT COUNT(*) FROM party WHERE client_id = v_client_id);
    RAISE NOTICE 'Offices created: %', (SELECT COUNT(*) FROM party_office po JOIN party p ON po.party_id = p.id WHERE p.client_id = v_client_id);
    RAISE NOTICE 'Representatives created: %', (SELECT COUNT(*) FROM party_representative pr JOIN party p ON pr.party_id = p.id WHERE p.client_id = v_client_id);
    RAISE NOTICE 'Claims updated with recovery data: %', (SELECT COUNT(*) FROM claim WHERE client_id = v_client_id AND expected_recovery IS NOT NULL);
    RAISE NOTICE 'Recovery events created: %', (SELECT COUNT(*) FROM recovery_event WHERE client_id = v_client_id);
    RAISE NOTICE 'Tasks created: %', (SELECT COUNT(*) FROM task WHERE client_id = v_client_id);

END $$;
