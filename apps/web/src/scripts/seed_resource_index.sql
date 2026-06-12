-- Seed resource_index table with existing data
-- Depends on: claims, parties, checklists, checklist_claim

DELETE FROM resource_index;

-- Claims
INSERT INTO resource_index (client_id, resource_type, resource_id, linked_resource_type, linked_resource_id, label, secondary_label, metadata, url)
SELECT
  client_id, 'claim', id,
  NULL, NULL,
  COALESCE(claim_number, 'Unknown'),
  insured,
  jsonb_build_object(
    'Insured', COALESCE(insured, 'N/A'),
    'Amount', COALESCE('$' || claim_amount::text, 'N/A'),
    'Status', COALESCE(recovery_status, 'N/A')
  ),
  '/admin/claims?selected=' || id
FROM claim
WHERE client_id = '00000000-0000-4000-8000-000000000001';

-- Parties
INSERT INTO resource_index (client_id, resource_type, resource_id, linked_resource_type, linked_resource_id, label, secondary_label, metadata, url)
SELECT
  client_id, 'party', id,
  NULL, NULL,
  name,
  NULL,
  jsonb_build_object(
    'Type', CASE WHEN is_business THEN 'Business' ELSE 'Individual' END
  ),
  '/admin/party-management/parties?selected=' || id
FROM party
WHERE client_id = '00000000-0000-4000-8000-000000000001';

-- Checklists
INSERT INTO resource_index (client_id, resource_type, resource_id, linked_resource_type, linked_resource_id, label, secondary_label, metadata, url)
SELECT
  client_id, 'checklist', id,
  NULL, NULL,
  name,
  NULL,
  jsonb_build_object(
    'Published', CASE WHEN published THEN 'Yes' ELSE 'No' END
  ),
  '/checklists/' || id
FROM checklist
WHERE client_id = '00000000-0000-4000-8000-000000000001';

-- Checklist+Claim linked entries
INSERT INTO resource_index (client_id, resource_type, resource_id, linked_resource_type, linked_resource_id, label, secondary_label, metadata, url)
SELECT
  cc.client_id, 'checklist', cc.checklist_id,
  'claim', cc.claim_id,
  ch.name,
  c.claim_number,
  jsonb_build_object('Claim', COALESCE(c.claim_number, 'N/A'), 'Insured', COALESCE(c.insured, 'N/A')),
  '/checklists/' || cc.checklist_id || '/claim/' || cc.claim_id
FROM checklist_claim cc
JOIN checklist ch ON ch.id = cc.checklist_id
JOIN claim c ON c.id = cc.claim_id
WHERE cc.client_id = '00000000-0000-4000-8000-000000000001';

-- Verification
SELECT resource_type, COUNT(*) as count FROM resource_index GROUP BY resource_type ORDER BY resource_type;
SELECT COUNT(*) as total_records FROM resource_index;
