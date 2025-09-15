// generateChecklistClaims.js
'use strict';

/**
 * Generates SQL INSERT statements for `checklist_claim` using subqueries that
 * pick random ids from claim/checklist/users tables for each row.
 *
 * Assumptions:
 * - claim(id) and checklist(id) exist (your schema shows integer ids).
 * - users(id) is UUID.
 * - All three tables have rows for the given client_id filter (if present).
 * - This script ONLY emits SQL text to stdout.
 */

const CLIENT_ID = '1c118f90-3153-4dfb-b350-953e42f0d1aa';
const DEFAULT_COUNT = Number(process.argv[2] || 1000);

// ---- Helpers (string builders for SQL fragments) ----

// Random day offset helper as SQL: now() - (floor(random()*N) * interval '1 day')
const daysAgo = (maxDays) => `now() - (floor(random()*${maxDays}) * interval '1 day')`;

// Random timestamp in a range: between A and B days ago (A >= B)
const daysAgoBetween = (maxDays, minDays) =>
	`now() - (floor(${minDays} + random()*(${maxDays - minDays})) * interval '1 day')`;

// Subselect helpers (filter by client_id when present)
const randClaimId = () => `(SELECT id FROM claim WHERE client_id = '${CLIENT_ID}' ORDER BY random() LIMIT 1)`;

const randChecklistId = () => `(SELECT id FROM checklist WHERE client_id = '${CLIENT_ID}' ORDER BY random() LIMIT 1)`;

const randUserId = (opts = {}) => {
	const { onlyActive = false } = opts;
	// If you track disabled on users, exclude disabled when onlyActive = true.
	// Otherwise just drop the filter.
	return `(SELECT id FROM users WHERE client_id = '${CLIENT_ID}'${
		onlyActive ? ' AND disabled = FALSE' : ''
	} ORDER BY random() LIMIT 1)`;
};

// Choose a status with weighted distribution
function pickStatus() {
	// Weights: Unworked 35%, In Progress 40%, Submitted 15%, Completed 10%
	const r = Math.random();
	if (r < 0.35) return 'Unworked';
	if (r < 0.75) return 'In Progress';
	if (r < 0.9) return 'Submitted';
	return 'Completed';
}

// Build a single VALUES row SQL string for checklist_claim
function buildRowSQL() {
	const status = pickStatus();

	// Timestamps: tune per status
	// created_at: up to ~180 days ago
	const created_at = daysAgo(180);

	// last_opened: more recent for in-progress, older for unworked
	const last_opened =
		status === 'In Progress'
			? daysAgoBetween(10, 0) // within last 0–10 days
			: status === 'Submitted'
				? daysAgoBetween(60, 10) // within last 10–60 days
				: status === 'Completed'
					? daysAgoBetween(120, 15) // within last 15–120 days
					: daysAgoBetween(365, 90); // Unworked: 90–365 days

	// updated_at: often after created_at; allow NULL for Unworked sometimes
	const updated_at = status === 'Unworked' && Math.random() < 0.4 ? 'NULL' : daysAgoBetween(90, 1);

	// submitted_* only for Submitted/Completed
	const includeSubmission = status === 'Submitted' || status === 'Completed';
	const submitted_by = includeSubmission ? randUserId({ onlyActive: true }) : 'NULL';
	const submitted_at = includeSubmission ? daysAgoBetween(30, 0) : 'NULL';

	// assignee: set for all but sometimes NULL for Unworked
	const assignee = status === 'Unworked' && Math.random() < 0.5 ? 'NULL' : randUserId({ onlyActive: true });

	// created_by is required and not null
	const created_by = randUserId({ onlyActive: true });

	// updated_by often present when updated_at present
	const updated_by = updated_at === 'NULL' ? 'NULL' : randUserId({ onlyActive: true });

	// Compose row (note: claim_id & checklist_id use subselects)
	return `(
    ${randClaimId()},            -- claim_id (int)
    ${randChecklistId()},        -- checklist_id (int)
    ${last_opened},              -- last_opened (ts)
    '${CLIENT_ID}',              -- client_id (uuid)
    ${created_by},               -- created_by (uuid)
    ${created_at},               -- created_at (ts)
    '${status.replace(/'/g, "''")}', -- status (text)
    ${updated_by},               -- updated_by (uuid)
    ${updated_at},               -- updated_at (ts)
    ${submitted_by},             -- submitted_by (uuid)
    ${submitted_at},             -- submitted_at (ts)
    ${assignee}                  -- assignee (uuid)
  )`;
}

// Build the full INSERT
function buildInsertSQL(count) {
	const header = `INSERT INTO checklist_claim (
  claim_id,
  checklist_id,
  last_opened,
  client_id,
  created_by,
  created_at,
  status,
  updated_by,
  updated_at,
  submitted_by,
  submitted_at,
  assignee
) VALUES`;

	// Build rows; duplicates on (checklist_id, claim_id) will be skipped by ON CONFLICT
	const rows = Array.from({ length: count }, () => buildRowSQL());
	const footer = `ON CONFLICT (checklist_id, claim_id) DO NOTHING;`;

	return `${header}\n${rows.join(',\n')}\n${footer}\n`;
}

// Emit SQL
process.stdout.write(buildInsertSQL(DEFAULT_COUNT));
