-- =====================================================
-- 10-generate-tasks-deadlines.sql
-- Generate tasks and deadlines for selected claims
-- Attributes records to the oldest seeded user (acts as the dev admin)
-- Claims selected by claim_number (spread across distribution):
--   PROP-2024-00003, GL-2024-00015, WC-2024-00028, PL-2024-00040, GL-2024-00048
-- Distribution:
--   - Each claim gets 2-4 tasks in various statuses
--   - Each task has a linked deadline (entity_type='task')
--   - Some claims have standalone deadlines (entity_type='claim')
-- =====================================================

DO $$
DECLARE
    v_client_id UUID;
    v_user_id UUID;
    v_desk_location_id UUID;
    v_desk_location_type_id UUID;
    v_claim_id UUID;
    v_task_id UUID;
BEGIN
    SELECT id INTO v_client_id FROM client LIMIT 1;
    SELECT id INTO v_user_id FROM users ORDER BY created_at ASC LIMIT 1;

    -- Get or create a desk location for tasks
    SELECT id INTO v_desk_location_id FROM desk_location WHERE client_id = v_client_id LIMIT 1;

    IF v_desk_location_id IS NULL THEN
        -- Get or create a desk_location_type first
        SELECT id INTO v_desk_location_type_id FROM desk_location_type WHERE client_id = v_client_id LIMIT 1;

        IF v_desk_location_type_id IS NULL THEN
            INSERT INTO desk_location_type (
                client_id, name, description, created_by, created_at
            ) VALUES (
                v_client_id, 'General Processing', 'Default workflow phase for task processing', v_user_id, NOW()
            ) RETURNING id INTO v_desk_location_type_id;
        END IF;

        -- Create a desk_location
        INSERT INTO desk_location (
            client_id, desk_location_type_id, name, is_active, created_by, created_at
        ) VALUES (
            v_client_id,
            v_desk_location_type_id,
            'General Queue',
            true,
            v_user_id,
            NOW()
        ) RETURNING id INTO v_desk_location_id;
    END IF;

    -- =====================================================
    -- CLAIM 3: Simple/Clean claim (PROP-2024-00003)
    -- 2 tasks: 1 pending, 1 completed on time
    -- Plus 1 standalone claim deadline (regulatory)
    -- =====================================================
    SELECT id INTO v_claim_id FROM claim WHERE claim_number = 'PROP-2024-00003' AND client_id = v_client_id;

    -- Task 1: Pending review task (future deadline)
    INSERT INTO task (
        client_id, claim_id, desk_location_id, task_type, status,
        title, description, work_units, assigned_to, assigned_at, created_at
    ) VALUES (
        v_client_id, v_claim_id, v_desk_location_id, 'review', 'pending',
        'Initial coverage review', 'Review policy coverage and verify claim eligibility',
        3, v_user_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
    ) RETURNING id INTO v_task_id;

    -- Deadline for task 1 (pending, due in 5 days)
    INSERT INTO deadline (
        client_id, claim_id, deadline_date, deadline_type, description, status,
        entity_type, entity_id, created_by, created_at
    ) VALUES (
        v_client_id, v_claim_id, NOW() + INTERVAL '5 days', 'review',
        'Complete initial coverage review', 'pending',
        'task', v_task_id, v_user_id, NOW() - INTERVAL '2 days'
    );

    -- Task 2: Completed on time - document request
    INSERT INTO task (
        client_id, claim_id, desk_location_id, task_type, status,
        title, description, work_units, assigned_to, assigned_at,
        started_at, completed_at, completion_notes, created_at
    ) VALUES (
        v_client_id, v_claim_id, v_desk_location_id, 'request_document', 'completed',
        'Request proof of loss', 'Request signed proof of loss form from insured',
        2, v_user_id, NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days',
        'Proof of loss received via email', NOW() - INTERVAL '10 days'
    ) RETURNING id INTO v_task_id;

    -- Deadline for task 2 (met)
    INSERT INTO deadline (
        client_id, claim_id, deadline_date, deadline_type, description, status,
        entity_type, entity_id, completed_at, completed_by, created_by, created_at
    ) VALUES (
        v_client_id, v_claim_id, NOW() - INTERVAL '3 days', 'request_document',
        'Obtain proof of loss', 'met',
        'task', v_task_id, NOW() - INTERVAL '5 days', v_user_id, v_user_id, NOW() - INTERVAL '10 days'
    );

    -- Standalone claim deadline (regulatory - no task)
    INSERT INTO deadline (
        client_id, claim_id, deadline_date, deadline_type, description, status,
        entity_type, entity_id, created_by, created_at
    ) VALUES (
        v_client_id, v_claim_id, NOW() + INTERVAL '30 days', 'regulatory',
        '30-day acknowledgment letter required', 'pending',
        'claim', v_claim_id, v_user_id, NOW() - INTERVAL '5 days'
    );

    -- =====================================================
    -- CLAIM 15: Active Settlement claim (GL-2024-00015)
    -- 3 tasks: 1 in_progress, 1 completed late, 1 cancelled
    -- Plus 1 standalone deadline
    -- =====================================================
    SELECT id INTO v_claim_id FROM claim WHERE claim_number = 'GL-2024-00015' AND client_id = v_client_id;

    -- Task 1: In progress - send demand
    INSERT INTO task (
        client_id, claim_id, desk_location_id, task_type, status,
        title, description, work_units, assigned_to, assigned_at,
        started_at, created_at
    ) VALUES (
        v_client_id, v_claim_id, v_desk_location_id, 'send_demand', 'in_progress',
        'Send demand letter to adverse party', 'Prepare and send demand letter with supporting documentation',
        4, v_user_id, NOW() - INTERVAL '7 days',
        NOW() - INTERVAL '5 days', NOW() - INTERVAL '7 days'
    ) RETURNING id INTO v_task_id;

    -- Deadline for in-progress task (due in 3 days)
    INSERT INTO deadline (
        client_id, claim_id, deadline_date, deadline_type, description, status,
        entity_type, entity_id, created_by, created_at
    ) VALUES (
        v_client_id, v_claim_id, NOW() + INTERVAL '3 days', 'send_demand',
        'Demand letter deadline', 'pending',
        'task', v_task_id, v_user_id, NOW() - INTERVAL '7 days'
    );

    -- Task 2: Completed late - follow up call
    INSERT INTO task (
        client_id, claim_id, desk_location_id, task_type, status,
        title, description, work_units, assigned_to, assigned_at,
        started_at, completed_at, completion_notes, created_at
    ) VALUES (
        v_client_id, v_claim_id, v_desk_location_id, 'outbound_call', 'completed',
        'Follow up with claimant', 'Call claimant to discuss claim status and next steps',
        2, v_user_id, NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '18 days', NOW() - INTERVAL '10 days',
        'Spoke with claimant, they understand the process', NOW() - INTERVAL '20 days'
    ) RETURNING id INTO v_task_id;

    -- Deadline for task 2 (missed - completed after deadline)
    INSERT INTO deadline (
        client_id, claim_id, deadline_date, deadline_type, description, status,
        entity_type, entity_id, completed_at, completed_by, created_by, created_at
    ) VALUES (
        v_client_id, v_claim_id, NOW() - INTERVAL '15 days', 'outbound_call',
        'Complete claimant follow-up call', 'missed',
        'task', v_task_id, NOW() - INTERVAL '10 days', v_user_id, v_user_id, NOW() - INTERVAL '20 days'
    );

    -- Task 3: Cancelled task
    INSERT INTO task (
        client_id, claim_id, desk_location_id, task_type, status,
        title, description, work_units, assigned_to, assigned_at, created_at
    ) VALUES (
        v_client_id, v_claim_id, v_desk_location_id, 'send_document', 'cancelled',
        'Send preliminary estimate', 'Send initial damage estimate to insured (cancelled - superseded)',
        2, v_user_id, NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'
    ) RETURNING id INTO v_task_id;

    -- Deadline for cancelled task (cancelled)
    INSERT INTO deadline (
        client_id, claim_id, deadline_date, deadline_type, description, status,
        entity_type, entity_id, cancelled_at, cancelled_by, cancellation_reason,
        created_by, created_at
    ) VALUES (
        v_client_id, v_claim_id, NOW() - INTERVAL '20 days', 'send_document',
        'Send estimate deadline', 'cancelled',
        'task', v_task_id, NOW() - INTERVAL '22 days', v_user_id, 'Task superseded by updated estimate process',
        v_user_id, NOW() - INTERVAL '25 days'
    );

    -- Standalone deadline for negotiations
    INSERT INTO deadline (
        client_id, claim_id, deadline_date, deadline_type, description, status,
        entity_type, entity_id, created_by, created_at
    ) VALUES (
        v_client_id, v_claim_id, NOW() + INTERVAL '14 days', 'negotiation',
        'Settlement negotiation response deadline', 'pending',
        'claim', v_claim_id, v_user_id, NOW() - INTERVAL '3 days'
    );

    -- =====================================================
    -- CLAIM 28: Recovery Focus claim (WC-2024-00028)
    -- 3 tasks: 2 pending (1 overdue), 1 completed
    -- =====================================================
    SELECT id INTO v_claim_id FROM claim WHERE claim_number = 'WC-2024-00028' AND client_id = v_client_id;

    -- Task 1: Pending - overdue (deadline already passed)
    INSERT INTO task (
        client_id, claim_id, desk_location_id, task_type, status,
        title, description, work_units, assigned_to, assigned_at, created_at
    ) VALUES (
        v_client_id, v_claim_id, v_desk_location_id, 'follow_up', 'pending',
        'Follow up on subrogation demand', 'Contact adverse carrier regarding outstanding subrogation demand',
        3, v_user_id, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'
    ) RETURNING id INTO v_task_id;

    -- Deadline for overdue task (pending but past due date)
    INSERT INTO deadline (
        client_id, claim_id, deadline_date, deadline_type, description, status,
        entity_type, entity_id, created_by, created_at
    ) VALUES (
        v_client_id, v_claim_id, NOW() - INTERVAL '2 days', 'follow_up',
        'Subrogation follow-up deadline', 'pending',
        'task', v_task_id, v_user_id, NOW() - INTERVAL '10 days'
    );

    -- Task 2: Pending - future deadline
    INSERT INTO task (
        client_id, claim_id, desk_location_id, task_type, status,
        title, description, work_units, assigned_to, assigned_at, created_at
    ) VALUES (
        v_client_id, v_claim_id, v_desk_location_id, 'letter', 'pending',
        'Send recovery status update', 'Send status update letter to insured regarding recovery efforts',
        2, v_user_id, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
    ) RETURNING id INTO v_task_id;

    -- Deadline for future task
    INSERT INTO deadline (
        client_id, claim_id, deadline_date, deadline_type, description, status,
        entity_type, entity_id, created_by, created_at
    ) VALUES (
        v_client_id, v_claim_id, NOW() + INTERVAL '7 days', 'letter',
        'Recovery update letter deadline', 'pending',
        'task', v_task_id, v_user_id, NOW() - INTERVAL '3 days'
    );

    -- Task 3: Completed on time - inbound call
    INSERT INTO task (
        client_id, claim_id, desk_location_id, task_type, status,
        title, description, work_units, assigned_to, assigned_at,
        started_at, completed_at, completion_notes, created_at
    ) VALUES (
        v_client_id, v_claim_id, v_desk_location_id, 'inbound_call', 'completed',
        'Handle adverse carrier callback', 'Return call from adverse carrier claims department',
        2, v_user_id, NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days',
        'Discussed settlement terms, carrier requested additional documentation', NOW() - INTERVAL '15 days'
    ) RETURNING id INTO v_task_id;

    -- Deadline for completed task (met)
    INSERT INTO deadline (
        client_id, claim_id, deadline_date, deadline_type, description, status,
        entity_type, entity_id, completed_at, completed_by, created_by, created_at
    ) VALUES (
        v_client_id, v_claim_id, NOW() - INTERVAL '13 days', 'inbound_call',
        'Return adverse carrier call', 'met',
        'task', v_task_id, NOW() - INTERVAL '14 days', v_user_id, v_user_id, NOW() - INTERVAL '15 days'
    );

    -- =====================================================
    -- CLAIM 40: Party Variations claim (PL-2024-00040)
    -- 4 tasks: various types and statuses
    -- Plus 2 standalone deadlines
    -- =====================================================
    SELECT id INTO v_claim_id FROM claim WHERE claim_number = 'PL-2024-00040' AND client_id = v_client_id;

    -- Task 1: Pending generic task
    INSERT INTO task (
        client_id, claim_id, desk_location_id, task_type, status,
        title, description, work_units, assigned_to, assigned_at, created_at
    ) VALUES (
        v_client_id, v_claim_id, v_desk_location_id, 'generic', 'pending',
        'Review expert report', 'Review independent expert report and summarize findings',
        4, v_user_id, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
    ) RETURNING id INTO v_task_id;

    INSERT INTO deadline (
        client_id, claim_id, deadline_date, deadline_type, description, status,
        entity_type, entity_id, created_by, created_at
    ) VALUES (
        v_client_id, v_claim_id, NOW() + INTERVAL '10 days', 'generic',
        'Expert report review deadline', 'pending',
        'task', v_task_id, v_user_id, NOW() - INTERVAL '1 day'
    );

    -- Task 2: In progress - document request
    INSERT INTO task (
        client_id, claim_id, desk_location_id, task_type, status,
        title, description, work_units, assigned_to, assigned_at,
        started_at, created_at
    ) VALUES (
        v_client_id, v_claim_id, v_desk_location_id, 'request_document', 'in_progress',
        'Request medical records', 'Request updated medical records from treating physician',
        3, v_user_id, NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '4 days', NOW() - INTERVAL '5 days'
    ) RETURNING id INTO v_task_id;

    INSERT INTO deadline (
        client_id, claim_id, deadline_date, deadline_type, description, status,
        entity_type, entity_id, created_by, created_at
    ) VALUES (
        v_client_id, v_claim_id, NOW() + INTERVAL '2 days', 'request_document',
        'Medical records request follow-up', 'pending',
        'task', v_task_id, v_user_id, NOW() - INTERVAL '5 days'
    );

    -- Task 3: Completed - review task
    INSERT INTO task (
        client_id, claim_id, desk_location_id, task_type, status,
        title, description, work_units, assigned_to, assigned_at,
        started_at, completed_at, completion_notes, created_at
    ) VALUES (
        v_client_id, v_claim_id, v_desk_location_id, 'review', 'completed',
        'Liability assessment', 'Complete liability assessment and document findings',
        5, v_user_id, NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '19 days', NOW() - INTERVAL '12 days',
        'Liability assessed at 70/30 split, documented in claim notes', NOW() - INTERVAL '20 days'
    ) RETURNING id INTO v_task_id;

    INSERT INTO deadline (
        client_id, claim_id, deadline_date, deadline_type, description, status,
        entity_type, entity_id, completed_at, completed_by, created_by, created_at
    ) VALUES (
        v_client_id, v_claim_id, NOW() - INTERVAL '10 days', 'review',
        'Liability assessment deadline', 'met',
        'task', v_task_id, NOW() - INTERVAL '12 days', v_user_id, v_user_id, NOW() - INTERVAL '20 days'
    );

    -- Task 4: Completed late
    INSERT INTO task (
        client_id, claim_id, desk_location_id, task_type, status,
        title, description, work_units, assigned_to, assigned_at,
        started_at, completed_at, completion_notes, created_at
    ) VALUES (
        v_client_id, v_claim_id, v_desk_location_id, 'outbound_call', 'completed',
        'Contact claimant attorney', 'Discuss case status with claimant attorney',
        2, v_user_id, NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '28 days', NOW() - INTERVAL '20 days',
        'Attorney requests extension on document production', NOW() - INTERVAL '30 days'
    ) RETURNING id INTO v_task_id;

    INSERT INTO deadline (
        client_id, claim_id, deadline_date, deadline_type, description, status,
        entity_type, entity_id, completed_at, completed_by, created_by, created_at
    ) VALUES (
        v_client_id, v_claim_id, NOW() - INTERVAL '25 days', 'outbound_call',
        'Attorney contact deadline', 'missed',
        'task', v_task_id, NOW() - INTERVAL '20 days', v_user_id, v_user_id, NOW() - INTERVAL '30 days'
    );

    -- Standalone deadlines for claim 40
    INSERT INTO deadline (
        client_id, claim_id, deadline_date, deadline_type, description, status,
        entity_type, entity_id, created_by, created_at
    ) VALUES (
        v_client_id, v_claim_id, NOW() + INTERVAL '45 days', 'litigation',
        'Discovery response deadline', 'pending',
        'claim', v_claim_id, v_user_id, NOW() - INTERVAL '5 days'
    );

    INSERT INTO deadline (
        client_id, claim_id, deadline_date, deadline_type, description, status,
        entity_type, entity_id, created_by, created_at
    ) VALUES (
        v_client_id, v_claim_id, NOW() + INTERVAL '90 days', 'litigation',
        'Mediation conference scheduled', 'pending',
        'claim', v_claim_id, v_user_id, NOW() - INTERVAL '10 days'
    );

    -- =====================================================
    -- CLAIM 48: Edge case - Closed with full recovery (GL-2024-00048)
    -- 2 completed tasks (all met), no pending items
    -- =====================================================
    SELECT id INTO v_claim_id FROM claim WHERE claim_number = 'GL-2024-00048' AND client_id = v_client_id;

    -- Task 1: Completed - send document
    INSERT INTO task (
        client_id, claim_id, desk_location_id, task_type, status,
        title, description, work_units, assigned_to, assigned_at,
        started_at, completed_at, completion_notes, created_at
    ) VALUES (
        v_client_id, v_claim_id, v_desk_location_id, 'send_document', 'completed',
        'Send closing statement', 'Send final closing statement and recovery documentation to insured',
        2, v_user_id, NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days',
        'Closing statement sent with full recovery confirmation', NOW() - INTERVAL '30 days'
    ) RETURNING id INTO v_task_id;

    INSERT INTO deadline (
        client_id, claim_id, deadline_date, deadline_type, description, status,
        entity_type, entity_id, completed_at, completed_by, created_by, created_at
    ) VALUES (
        v_client_id, v_claim_id, NOW() - INTERVAL '25 days', 'send_document',
        'Closing statement deadline', 'met',
        'task', v_task_id, NOW() - INTERVAL '28 days', v_user_id, v_user_id, NOW() - INTERVAL '30 days'
    );

    -- Task 2: Completed - final review
    INSERT INTO task (
        client_id, claim_id, desk_location_id, task_type, status,
        title, description, work_units, assigned_to, assigned_at,
        started_at, completed_at, completion_notes, created_at
    ) VALUES (
        v_client_id, v_claim_id, v_desk_location_id, 'review', 'completed',
        'Final file review', 'Complete final review before closing claim file',
        3, v_user_id, NOW() - INTERVAL '35 days',
        NOW() - INTERVAL '35 days', NOW() - INTERVAL '32 days',
        'All documentation complete, file ready for closure', NOW() - INTERVAL '35 days'
    ) RETURNING id INTO v_task_id;

    INSERT INTO deadline (
        client_id, claim_id, deadline_date, deadline_type, description, status,
        entity_type, entity_id, completed_at, completed_by, created_by, created_at
    ) VALUES (
        v_client_id, v_claim_id, NOW() - INTERVAL '30 days', 'review',
        'Final file review deadline', 'met',
        'task', v_task_id, NOW() - INTERVAL '32 days', v_user_id, v_user_id, NOW() - INTERVAL '35 days'
    );

END $$;

-- =====================================================
-- Summary Reports
-- =====================================================

SELECT 'Tasks by type and status:' AS info;
SELECT status, task_type, COUNT(*) as count
FROM task t
JOIN claim c ON t.claim_id = c.id
WHERE c.claim_number IN ('PROP-2024-00003', 'GL-2024-00015', 'WC-2024-00028', 'PL-2024-00040', 'GL-2024-00048')
GROUP BY status, task_type
ORDER BY status, task_type;

SELECT 'Task status summary:' AS info;
SELECT status, COUNT(*) as count
FROM task t
JOIN claim c ON t.claim_id = c.id
WHERE c.claim_number IN ('PROP-2024-00003', 'GL-2024-00015', 'WC-2024-00028', 'PL-2024-00040', 'GL-2024-00048')
GROUP BY status
ORDER BY count DESC;

SELECT 'Deadlines by status and entity type:' AS info;
SELECT status, entity_type, COUNT(*) as count
FROM deadline d
JOIN claim c ON d.claim_id = c.id
WHERE c.claim_number IN ('PROP-2024-00003', 'GL-2024-00015', 'WC-2024-00028', 'PL-2024-00040', 'GL-2024-00048')
GROUP BY status, entity_type
ORDER BY status, entity_type;

SELECT 'Deadline status summary:' AS info;
SELECT status, COUNT(*) as count
FROM deadline d
JOIN claim c ON d.claim_id = c.id
WHERE c.claim_number IN ('PROP-2024-00003', 'GL-2024-00015', 'WC-2024-00028', 'PL-2024-00040', 'GL-2024-00048')
GROUP BY status
ORDER BY count DESC;

SELECT 'Tasks by claim:' AS info;
SELECT
    c.claim_number,
    COUNT(t.id) as task_count,
    COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN t.status = 'cancelled' THEN 1 END) as cancelled
FROM claim c
LEFT JOIN task t ON c.id = t.claim_id
WHERE c.claim_number IN ('PROP-2024-00003', 'GL-2024-00015', 'WC-2024-00028', 'PL-2024-00040', 'GL-2024-00048')
GROUP BY c.id, c.claim_number
ORDER BY c.claim_number;

SELECT 'Deadlines by claim:' AS info;
SELECT
    c.claim_number,
    COUNT(d.id) as deadline_count,
    COUNT(CASE WHEN d.status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN d.status = 'met' THEN 1 END) as met,
    COUNT(CASE WHEN d.status = 'missed' THEN 1 END) as missed,
    COUNT(CASE WHEN d.status = 'cancelled' THEN 1 END) as cancelled
FROM claim c
LEFT JOIN deadline d ON c.id = d.claim_id
WHERE c.claim_number IN ('PROP-2024-00003', 'GL-2024-00015', 'WC-2024-00028', 'PL-2024-00040', 'GL-2024-00048')
GROUP BY c.id, c.claim_number
ORDER BY c.claim_number;

SELECT 'Total tasks created:', COUNT(*)
FROM task t JOIN claim c ON t.claim_id = c.id
WHERE c.claim_number IN ('PROP-2024-00003', 'GL-2024-00015', 'WC-2024-00028', 'PL-2024-00040', 'GL-2024-00048');
SELECT 'Total deadlines created:', COUNT(*)
FROM deadline d JOIN claim c ON d.claim_id = c.id
WHERE c.claim_number IN ('PROP-2024-00003', 'GL-2024-00015', 'WC-2024-00028', 'PL-2024-00040', 'GL-2024-00048');
