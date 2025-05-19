-- Step 1: Insert Checklist
INSERT INTO checklist (name)
VALUES ('Property Checklist')
RETURNING id;

WITH distinct_pages AS (
  SELECT UNNEST(ARRAY[
    'Insured Out of Pocket Expense Details',
    'Unsuccessful Recovery Details',
    'Documents Required Pursuing a Claim - Documents Present',
    'Contract - Lease Details',
    'Condominium / Cooperative Bylaws Details',
    'Subrogation Questions',
    'Additional Insured Endorsement - Property Details',
    'Under Construction: Completed vs Non Completed Operations Detail',
    'Appraisal/Claim Valuation/Repair Estimate Details - Prop',
    'Unsuccessful Recovery Details/Insured Out of Pocket Expense Details',
    'Equipment/Product Checklist',
    'Municipality Details',
    'Physical Evidence Details',
    'Expert Retained by Client',
    'Origin & Cause Expert Detail',
    'Potential Responsible Parties Checklist',
    'Evaluation Page',
    'Regarding Vandalism, Malicious Mischief or Theft',
    'Security Camera/Video Footage Detail',
    'Property evaluations',
    'Fire/Smoke Checklist',
    'Adverse/Potentially Responsible Party''s Details',
    'Alarm/Surpression System Details',
    'Documents Required Pursuing a Claim - Documents Present/Alarm/Surpression System Details',
    'Loss Investigation - New Checklist 2022',
    'Contractor Negligence Details',
    'Weather Event Checklist',
    'Water Damage - Sewer Line Backed-up/Clogged',
    'Appraisal/Claim Valuation/Repair Estimates Details',
    'Supp Appraisal/Claim Valuation/Repair Estimates Details - Prop',
    'Business Income Receipts Details',
    'Salvage Invoice Details',
    'Additional Living Receipts Details',
    'Less than 100% of Expected Amount Details'
  ]) AS title
),

-- Step 2: Insert into page table, avoiding duplicates
inserted_pages AS (
  INSERT INTO page (title)
  SELECT title FROM distinct_pages
  RETURNING id, title
),

-- Include existing pages in case of duplicates
all_pages AS (
  SELECT id, title FROM inserted_pages
  UNION
  SELECT id, title FROM page WHERE title IN (SELECT title FROM distinct_pages)
)

-- Step 3: Insert into page_instance for checklist_id = 1
INSERT INTO page_instance (page_id, checklist_id, parent_instance_id)
SELECT p.id, 3, NULL
FROM all_pages p;



