-- seed_documents.sql
-- Seeds ~400 documents with doc_groups per claim
-- Depends on: users, claims

DO $$
DECLARE
  v_client_id CONSTANT uuid := '00000000-0000-4000-8000-000000000001';
  v_user_ids uuid[];
  v_claim_rec RECORD;
  v_doc_group_id uuid;
  v_doc_id uuid;
  v_num_docs int;
  v_j int;
  v_rand float;
  v_doc_type text;
  v_doc_status text;
  v_mime_type text;
  v_extension text;
  v_filename text;
  v_created_at timestamp;
  v_now timestamp := now();
  v_user_id uuid;
  v_claim_number text;
  v_insured text;
  v_total_docs int := 0;
  v_doc_types text[] := ARRAY['police_report','medical_record','invoice','correspondence','settlement','photo','estimate','repair_invoice','proof_of_payment','demand_letter','legal_filing','other'];
  v_mime_types text[] := ARRAY['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  v_extensions text[] := ARRAY['.pdf','.jpg','.png','.docx'];
  -- Filename templates by doc_type (index matches v_doc_types)
  v_filename_prefixes text[] := ARRAY[
    'Police_Report','Medical_Records','Invoice','Correspondence',
    'Settlement_Agreement','Photo_Evidence','Damage_Estimate',
    'Repair_Invoice','Proof_of_Payment','Demand_Letter',
    'Legal_Filing','Supporting_Document'
  ];
BEGIN
  -- Gather existing reference data
  SELECT array_agg(id ORDER BY created_at) INTO v_user_ids
  FROM users WHERE client_id = v_client_id;

  IF v_user_ids IS NULL THEN
    RAISE EXCEPTION 'No users found. Run seed scripts 1-3 first.';
  END IF;

  -- Wipe existing documents and doc groups
  DELETE FROM doc WHERE client_id = v_client_id;
  DELETE FROM doc_group WHERE client_id = v_client_id;

  -- Loop through all claims
  FOR v_claim_rec IN
    SELECT id, claim_number, insured, created_at
    FROM claim
    WHERE client_id = v_client_id
    ORDER BY claim_number
  LOOP
    v_claim_number := COALESCE(v_claim_rec.claim_number, 'CLM');
    v_insured := COALESCE(v_claim_rec.insured, 'Unknown');

    -- Create root doc_group per claim (claim_folder, system=true)
    v_doc_group_id := gen_random_uuid();
    v_user_id := v_user_ids[1 + floor(random() * array_length(v_user_ids, 1))::int];

    INSERT INTO doc_group (
      id, client_id, claim_id, name, group_type, system,
      created_by, created_at
    ) VALUES (
      v_doc_group_id,
      v_client_id,
      v_claim_rec.id,
      'Claim ' || v_claim_number,
      'claim_folder',
      true,
      v_user_id,
      COALESCE(v_claim_rec.created_at, v_now - interval '6 months')
    );

    -- 1-5 docs per claim
    v_num_docs := 1 + floor(random() * 5)::int;

    FOR v_j IN 1..v_num_docs LOOP
      v_doc_id := gen_random_uuid();
      v_user_id := v_user_ids[1 + floor(random() * array_length(v_user_ids, 1))::int];
      v_created_at := v_now - (interval '1 day' * floor(random() * 365)::int);

      -- Pick a doc type
      v_rand := random();
      IF v_rand < 0.12 THEN v_doc_type := 'police_report';
      ELSIF v_rand < 0.22 THEN v_doc_type := 'medical_record';
      ELSIF v_rand < 0.32 THEN v_doc_type := 'invoice';
      ELSIF v_rand < 0.44 THEN v_doc_type := 'correspondence';
      ELSIF v_rand < 0.50 THEN v_doc_type := 'settlement';
      ELSIF v_rand < 0.60 THEN v_doc_type := 'photo';
      ELSIF v_rand < 0.70 THEN v_doc_type := 'estimate';
      ELSIF v_rand < 0.78 THEN v_doc_type := 'repair_invoice';
      ELSIF v_rand < 0.84 THEN v_doc_type := 'proof_of_payment';
      ELSIF v_rand < 0.90 THEN v_doc_type := 'demand_letter';
      ELSIF v_rand < 0.95 THEN v_doc_type := 'legal_filing';
      ELSE v_doc_type := 'other';
      END IF;

      -- Pick mime type (weighted toward PDF)
      v_rand := random();
      IF v_doc_type = 'photo' THEN
        IF v_rand < 0.6 THEN
          v_mime_type := 'image/jpeg'; v_extension := '.jpg';
        ELSE
          v_mime_type := 'image/png'; v_extension := '.png';
        END IF;
      ELSIF v_rand < 0.70 THEN
        v_mime_type := 'application/pdf'; v_extension := '.pdf';
      ELSIF v_rand < 0.85 THEN
        v_mime_type := 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; v_extension := '.docx';
      ELSIF v_rand < 0.93 THEN
        v_mime_type := 'image/jpeg'; v_extension := '.jpg';
      ELSE
        v_mime_type := 'image/png'; v_extension := '.png';
      END IF;

      -- Build realistic filename
      v_filename := CASE v_doc_type
        WHEN 'police_report' THEN 'Police_Report_' || v_claim_number
        WHEN 'medical_record' THEN 'Medical_Records_' || replace(v_insured, ' ', '_')
        WHEN 'invoice' THEN 'Invoice_' || v_claim_number || '_' || v_j
        WHEN 'correspondence' THEN 'Correspondence_' || replace(v_insured, ' ', '_') || '_' || to_char(v_created_at, 'YYYYMMDD')
        WHEN 'settlement' THEN 'Settlement_Agreement_' || v_claim_number
        WHEN 'photo' THEN 'Photo_Evidence_' || v_claim_number || '_' || v_j
        WHEN 'estimate' THEN 'Damage_Estimate_' || v_claim_number
        WHEN 'repair_invoice' THEN 'Repair_Invoice_' || v_claim_number || '_' || v_j
        WHEN 'proof_of_payment' THEN 'Proof_of_Payment_' || v_claim_number
        WHEN 'demand_letter' THEN 'Demand_Letter_' || replace(v_insured, ' ', '_')
        WHEN 'legal_filing' THEN 'Legal_Filing_' || v_claim_number
        ELSE 'Document_' || v_claim_number || '_' || v_j
      END || v_extension;

      -- Doc status: 80% approved, 15% pending_review, 5% draft
      v_rand := random();
      IF v_rand < 0.80 THEN v_doc_status := 'approved';
      ELSIF v_rand < 0.95 THEN v_doc_status := 'pending_review';
      ELSE v_doc_status := 'draft';
      END IF;

      INSERT INTO doc (
        id, client_id, claim_id, doc_group_id,
        filename, alias, title, doc_type, doc_status,
        mime_type, file_size, storage_key,
        is_current_version, version,
        created_by, created_at
      ) VALUES (
        v_doc_id,
        v_client_id,
        v_claim_rec.id,
        v_doc_group_id,
        v_filename,
        v_filename,
        replace(replace(v_filename, '_', ' '), v_extension, ''),
        v_doc_type,
        v_doc_status,
        v_mime_type,
        50000 + floor(random() * 4950000)::bigint,
        'demo/' || v_doc_id,
        true,
        1,
        v_user_id,
        v_created_at
      );

      v_total_docs := v_total_docs + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seeded % documents with doc_groups for client %', v_total_docs, v_client_id;
END $$;
