// generatePagesAndInstances_withParentsAndOrdering.js
'use strict';

/**
 * Outputs SQL to:
 * 1) Insert page templates into `page` (title-based).
 * 2) Insert page instances into `page_instance` (position temp placeholder).
 * 3) Assign `parent_instance_id` with depth ≤ 5 and no cycles (per checklist).
 * 4) Recompute `position` per checklist using a preorder traversal so parents
 *    precede children and siblings are ordered by created_at,id.
 *
 * Tables:
 *   page(id serial PK, client_id uuid, title text, hidden bool default false, version int default 0,
 *       created_by uuid, created_at ts, updated_by uuid, updated_at ts)
 *   page_instance(id serial PK, client_id uuid, page_id int, checklist_id int,
 *       parent_instance_id int NULL, position int, created_by uuid, created_at ts, updated_by uuid, updated_at ts)
 */

const CLIENT_ID = '1c118f90-3153-4dfb-b350-953e42f0d1aa';

// ---------- tiny JS helpers ----------
const esc = (s) => String(s).replace(/'/g, "''");
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = (arr) => {
	const a = arr.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
};
const sample = (arr, n) => shuffle(arr).slice(0, n);

// ---------- Postgres-side time helpers ----------
const daysAgo = (maxDays) => `now() - (floor(random()*${maxDays}) * interval '1 day')`;
const daysAgoBetween = (maxDays, minDays) =>
	`now() - (floor(${minDays} + random()*(${maxDays - minDays})) * interval '1 day')`;

// ---------- Subqueries ----------
const randAdmin = `(
  SELECT id FROM users
  WHERE client_id = '${CLIENT_ID}' AND role = 'Admin'
  ORDER BY random() LIMIT 1
)`;

const checklistIdByName = (name) => `(
  SELECT id FROM checklist
  WHERE client_id = '${CLIENT_ID}' AND name = '${esc(name)}'
  ORDER BY id LIMIT 1
)`;

const pageIdByTitle = (title) => `(
  SELECT id FROM page
  WHERE client_id = '${CLIENT_ID}' AND title = '${esc(title)}'
  ORDER BY id LIMIT 1
)`;

// ---------- Template name banks ----------
const genericTemplates = [
	'Subrogation Opportunity Review',
	'SIU Referral Screening',
	'Litigation Referral Assessment',
	'Demand Letter Preparation',
	'Lien Holders & Recovery Parties',
	'Arbitration File Preparation',
	'Witness Statements Collection',
];

const autoTemplates = [
	'FNOL Intake – Auto',
	'Coverage Verification – Auto Policy',
	'Insured Vehicle Identification',
	'Adverse Vehicle Identification',
	'Liability Assessment – Comparative Negligence (Auto)',
	'Police Report & Citation Review – Auto',
	'Photographic Evidence Review – Auto',
	'Damage Appraisal – Auto Body',
	'Mechanical Damage Assessment – Auto',
	'Total Loss Evaluation – Auto',
	'Salvage Coordination – Auto',
	'Rental / Loss of Use Handling – Auto',
	'Medical Payments (MedPay) Review – Auto',
	'PIP Eligibility & Limits – Auto',
	'Bodily Injury Evaluation – Auto',
	'Repair Estimate Audit – Auto',
	'Diminished Value Assessment – Auto',
	'Towing & Storage Validation – Auto',
	'Event Data Recorder (EDR) Request',
	'Insured Recorded Statement – Auto',
	'Adverse Carrier Contact & Demand – Auto',
	'Coverage Denial Justification – Auto',
	'Arbitration File Preparation – Auto',
];

const homeTemplates = [
	'FNOL Intake – Property',
	'Coverage Verification – Homeowners',
	'Peril Determination – Fire/Water/Wind/Hail/Theft',
	'Cause & Origin Investigation – Property',
	'Emergency Services Authorization (Mitigation)',
	'Mitigation Invoice Review – Property',
	'Structural Damage Assessment – Property',
	'Contents Inventory & Valuation',
	'Additional Living Expense (ALE) Review',
	'Exclusions & Endorsements Review – Homeowners',
	'Property Photos & Measurements',
	'Vendor Assignment – Contractor/IA',
	'Estimate Review – Xactimate Audit',
	'Depreciation / Recoverable Depreciation',
	'Fraud Indicators Screening – Property',
	'Subrogation Potential – Property',
	'Salvage & Recovery – Property',
	'Mortgagee / Lienholder Communication',
	'Ordinance or Law (Code Upgrade) Review',
	'CAT Event Handling – Property',
	'Proof of Loss Review – Property',
	'Adverse Weather Data Corroboration',
	'Claim Closure Checklist – Property',
	'Litigation Referral – Property',
];

const injuryTemplates = [
	'FNOL Intake – Injury',
	'Coverage Verification – Health/MedPay',
	'HIPAA Authorization & Records Request',
	'Medical Records Review – Injury',
	'ICD/CPT Code Validation',
	'Treatment Plan Reasonableness – Injury',
	'Subrogation Potential – Health Lien',
	'ERISA/Plan Language Review',
	'Provider Billing Audit – Injury',
	'Medicare/Medicaid Lien Check',
	'Lost Wages Verification',
	'Disability Assessment – Injury',
	'Liability Evaluation – Bodily Injury',
	'Demand Package Review – BI',
	'IME / Peer Review Referral',
	'Settlement Authority Checklist – BI',
	'Release & Indemnity Review – Injury',
	'SIU Referral Screening – Injury',
	'Pain & Suffering Evaluation',
	'MMI (Maximum Medical Improvement) Check',
	'Reserve Adequacy Review – Injury',
	'Litigation Referral – Injury',
];

const subroTemplates = [
	'Subrogation Intake & Assignment',
	'Coverage & Right of Recovery Review',
	'Adverse Party Identification – Subro',
	'Demand Letter Preparation – Subro',
	'Evidence Preservation & Chain of Custody',
	'Liability Theory Development – Subro',
	'Damages Calculation & Allocation – Subro',
	'Statute of Limitations Tracking – Subro',
	'Insured Cooperation & Statements – Subro',
	'Third-Party Carrier Contact – Subro',
	'Arbitration Strategy – PIP/Property',
	'Waiver & Release Review – Subro',
	'Recovery Accounting & Posting',
	'Settlement Documentation & Closure',
	'Vendor/Expert Assignment – Subro',
	'Intercompany Arbitration Filing',
	'Product Liability Screening – Subro',
	'Scene Inspection / Photography – Subro',
	'Police/Fire Report Procurement – Subro',
];

// ---------- Checklists & planning ----------
const CHECKLISTS = ['Auto', 'Home', 'Health & Personal Injury', 'General Subrogation'];

const perChecklistPlan = CHECKLISTS.map((name) => ({
	name,
	targetCount: randInt(20, 30),
}));

// Sparse reuse controls
const genericUsageCap = 3;
const genericUsageCount = Object.fromEntries(genericTemplates.map((t) => [t, 0]));

// Global set of unique template titles to insert into `page`
const allTemplateTitles = new Set();
// Per-checklist plan: array of template titles (with some duplicates to simulate in-checklist reuse)
const checklistInstances = new Map();

function planForChecklist(checklistName, domainTemplates) {
	const target = perChecklistPlan.find((p) => p.name === checklistName).targetCount;

	const genericToUseCount = randInt(2, 4);
	const inChecklistReuseCount = randInt(0, 2); // 0–2 duplicates within same checklist

	const availableGenerics = genericTemplates.filter((t) => genericUsageCount[t] < genericUsageCap);
	const chosenGenerics = sample(availableGenerics, Math.min(genericToUseCount, availableGenerics.length));
	chosenGenerics.forEach((t) => {
		genericUsageCount[t]++;
	});

	const remainingUniqueNeeded = Math.max(0, target - chosenGenerics.length - inChecklistReuseCount);
	const chosenDomain = sample(domainTemplates, Math.min(remainingUniqueNeeded, domainTemplates.length));

	let uniqueList = [...chosenGenerics, ...chosenDomain];

	// top up from generics if still short
	if (uniqueList.length < target - inChecklistReuseCount) {
		const moreGenerics = availableGenerics
			.filter((t) => !uniqueList.includes(t))
			.slice(0, target - inChecklistReuseCount - uniqueList.length);
		moreGenerics.forEach((t) => {
			genericUsageCount[t]++;
		});
		uniqueList = [...uniqueList, ...moreGenerics];
	}

	// duplicate a couple within the checklist
	let instances = uniqueList.slice();
	if (inChecklistReuseCount > 0 && uniqueList.length > 0) {
		const toDuplicate = sample(uniqueList, Math.min(inChecklistReuseCount, uniqueList.length));
		instances = [...instances, ...toDuplicate];
	}

	// ensure final size equals target
	if (instances.length > target) instances = instances.slice(0, target);
	while (instances.length < target) {
		instances.push(instances[randInt(0, Math.max(0, instances.length - 1))]);
	}

	uniqueList.forEach((t) => allTemplateTitles.add(t));
	checklistInstances.set(checklistName, instances);
}

planForChecklist('Auto', autoTemplates);
planForChecklist('Home', homeTemplates);
planForChecklist('Health & Personal Injury', injuryTemplates);
planForChecklist('General Subrogation', subroTemplates);

// ---------- SQL emitters ----------
function emitInsertTemplates() {
	const titles = Array.from(allTemplateTitles);
	if (titles.length === 0) return '';

	const rows = titles.map(
		(title) => `(
    '${CLIENT_ID}',     -- client_id
    '${esc(title)}',    -- title
    ${randAdmin},       -- created_by
    ${daysAgo(240)},    -- created_at (~8 months)
    ${randAdmin},       -- updated_by
    ${daysAgoBetween(180, 1)}  -- updated_at
  )`
	);

	return `
-- 1) Insert page templates (table: page). Hidden/version use defaults.
INSERT INTO page (
  client_id, title, created_by, created_at, updated_by, updated_at
) VALUES
${rows.join(',\n')};
`;
}

function emitInsertInstances() {
	let sql = `\n-- 2) Insert page instances (parent_instance_id initially NULL; position temporary)\n`;

	CHECKLISTS.forEach((checklistName) => {
		const instances = checklistInstances.get(checklistName) || [];
		if (!instances.length) return;

		// Position initially set sequentially; we'll recompute after parenting.
		const rows = instances.map(
			(title, idx) => `(
      '${CLIENT_ID}',                     -- client_id
      ${pageIdByTitle(title)},            -- page_id (template)
      ${checklistIdByName(checklistName)},-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      ${idx + 1},                         -- position (placeholder)
      ${randAdmin},                       -- created_by
      ${daysAgo(120)},                    -- created_at
      ${randAdmin},                       -- updated_by
      ${daysAgoBetween(90, 1)}            -- updated_at
    )`
		);

		sql += `
-- Checklist: ${checklistName} (${instances.length} instances)
INSERT INTO page_instance (
  client_id, page_id, checklist_id, parent_instance_id, position,
  created_by, created_at, updated_by, updated_at
) VALUES
${rows.join(',\n')};
`;
	});

	return sql;
}

/**
 * 3) Assign parents:
 *    - NTILE(5) per checklist on created_at (generations 1..5).
 *    - ~70% of gen >= 2 rows get a parent from an earlier generation.
 *    - Guarantees no cycles, max depth ≤ 5, leaves many roots.
 */
function emitAssignParents() {
	let sql = `\n-- 3) Assign parent_instance_id safely (max depth 5, no cycles)\n`;

	CHECKLISTS.forEach((checklistName) => {
		const chk = checklistIdByName(checklistName);
		sql += `
-- Parent assignment for checklist: ${checklistName}
WITH ranked AS (
  SELECT id, created_at, NTILE(5) OVER (ORDER BY created_at) AS gen
  FROM page_instance
  WHERE client_id = '${CLIENT_ID}'
    AND checklist_id = ${chk}
),
candidates AS (
  SELECT c.id AS child_id,
         (
           SELECT p.id
           FROM ranked p
           WHERE p.gen < c.gen
           ORDER BY random()
           LIMIT 1
         ) AS parent_id
  FROM ranked c
  WHERE c.gen >= 2
    AND random() < 0.7
)
UPDATE page_instance pi
SET parent_instance_id = cand.parent_id
FROM candidates cand
WHERE pi.id = cand.child_id
  AND pi.parent_instance_id IS NULL
  AND cand.parent_id IS NOT NULL;
`;
	});

	return sql;
}

/**
 * 4) Recompute `position` per checklist using a preorder traversal:
 *    - Roots first, ordered by created_at,id.
 *    - Children immediately after their parent, ordered by created_at,id.
 *    - `position` becomes row_number() over that traversal, per checklist.
 */
function emitReorderPositions() {
	let sql = `\n-- 4) Recompute positions to reflect hierarchy (preorder: parent before children)\n`;

	CHECKLISTS.forEach((checklistName) => {
		const chk = checklistIdByName(checklistName);

		sql += `
-- Position reorder for checklist: ${checklistName}
WITH RECURSIVE tree AS (
  -- roots
  SELECT
    pi.id,
    pi.parent_instance_id,
    pi.created_at,
    1 AS depth,
    -- sort key for stable ordering: created_at then id
    to_char(pi.created_at, 'YYYYMMDDHH24MISSMS') || '-' || lpad(pi.id::text, 10, '0') AS sortkey
  FROM page_instance pi
  WHERE pi.client_id = '${CLIENT_ID}'
    AND pi.checklist_id = ${chk}
    AND pi.parent_instance_id IS NULL

  UNION ALL

  -- children
  SELECT
    c.id,
    c.parent_instance_id,
    c.created_at,
    t.depth + 1 AS depth,
    t.sortkey || '.' ||
      to_char(c.created_at, 'YYYYMMDDHH24MISSMS') || '-' || lpad(c.id::text, 10, '0') AS sortkey
  FROM page_instance c
  JOIN tree t ON c.parent_instance_id = t.id
  WHERE c.client_id = '${CLIENT_ID}'
    AND c.checklist_id = ${chk}
),
ordered AS (
  SELECT id, row_number() OVER (ORDER BY sortkey) AS pos
  FROM tree
)
UPDATE page_instance p
SET position = o.pos
FROM ordered o
WHERE p.id = o.id;
`;
	});

	return sql;
}

// ---------- Emit full SQL ----------
process.stdout.write(
	[
		'-- Seed: page templates + page instances + parents + hierarchical positions',
		`-- Client: ${CLIENT_ID}`,
		// 1
		emitInsertTemplates(),
		// 2
		emitInsertInstances(),
		// 3
		emitAssignParents(),
		// 4
		emitReorderPositions(),
	].join('\n')
);
