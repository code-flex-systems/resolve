// generateUsers.js
'use strict';

// Install: npm i bcryptjs
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { FIRST_NAMES, LAST_NAMES } from './constants.js'; // adjust path if needed

// --- Config ---
const TOTAL = 1000;
const ADMINS = 5;
const DISABLED = 30; // ~3%
const INACTIVE = 50; // ~5%
const CLIENT_ID = '1c118f90-3153-4dfb-b350-953e42f0d1aa';

// --- Random helpers (inlined for Node) ---
function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomDate(start, end) {
	const t = randomInt(start.getTime(), end.getTime());
	return new Date(t);
}
function randomElement(arr) {
	return arr[randomInt(0, arr.length - 1)];
}
function randomSample(arr, n) {
	if (n > arr.length) throw new Error('Sample size exceeds array length');
	const copy = arr.slice();
	const out = [];
	for (let i = 0; i < n; i++) {
		const idx = randomInt(0, copy.length - 1);
		out.push(copy[idx]);
		copy.splice(idx, 1);
	}
	return out;
}
const now = new Date();
const daysMs = (n) => 1000 * 60 * 60 * 24 * n;
function iso(d) {
	return d ? d.toISOString() : null;
}
function randomRecentBetween(daysAgoStart, daysAgoEnd) {
	const start = new Date(now.getTime() - daysMs(daysAgoStart));
	const end = new Date(now.getTime() - daysMs(daysAgoEnd));
	const a = start < end ? start : end;
	const b = start < end ? end : start;
	return randomDate(a, b);
}
// NANP-compliant-ish US phone in E.164
function randomUsPhone() {
	const d2to9 = () => randomInt(2, 9);
	const d0to9 = () => randomInt(0, 9);
	const area = `${d2to9()}${d0to9()}${d0to9()}`;
	const exch = `${d2to9()}${d0to9()}${d0to9()}`;
	const line = `${d0to9()}${d0to9()}${d0to9()}${d0to9()}`;
	return `+1${area}${exch}${line}`;
}

// --- Name pairing & distributions ---
function uniqueNamePairs(count) {
	if (FIRST_NAMES.length * LAST_NAMES.length < count) {
		throw new Error('Not enough (first,last) combinations to reach requested count.');
	}
	const used = new Set();
	const pairs = [];
	while (pairs.length < count) {
		const first = String(randomElement(FIRST_NAMES)).trim();
		const last = String(randomElement(LAST_NAMES)).trim();
		const key = (first + '|' + last).toLowerCase();
		if (!used.has(key)) {
			used.add(key);
			pairs.push({ first, last });
		}
	}
	return pairs;
}

function buildIndexSets(total) {
	const all = Array.from({ length: total }, (_, i) => i);

	const disabledIdx = new Set(randomSample(all, DISABLED));
	const remainingAfterDisabled = all.filter((i) => !disabledIdx.has(i));

	const inactiveIdx = new Set(randomSample(remainingAfterDisabled, INACTIVE));
	const remainingAfterInactive = remainingAfterDisabled.filter((i) => !inactiveIdx.has(i));

	const adminIdx = new Set(randomSample(remainingAfterInactive, ADMINS)); // avoid disabled/inactive
	return { disabledIdx, inactiveIdx, adminIdx };
}

// --- Main generator ---
function generateUsersSync() {
	const PASSWORD_HASH = bcrypt.hashSync('password', 10);

	const namePairs = uniqueNamePairs(TOTAL);
	const { disabledIdx, inactiveIdx, adminIdx } = buildIndexSets(TOTAL);

	const users = [];

	for (let i = 0; i < TOTAL; i++) {
		const { first, last } = namePairs[i];

		const isDisabled = disabledIdx.has(i);
		const isInactive = inactiveIdx.has(i);
		const isAdmin = adminIdx.has(i);
		const isActive = !isDisabled && !isInactive;

		const created_at = randomRecentBetween(730, 0); // within last 2 years
		const updated_at = randomDate(created_at, now);

		let last_login = null;
		if (isActive) {
			last_login = randomRecentBetween(30, 0); // active = last 30 days
		} else if (isInactive) {
			last_login = randomRecentBetween(365, 90); // inactive = 90+ days ago
		} else if (isDisabled) {
			last_login = Math.random() < 0.7 ? randomRecentBetween(730, 365) : null;
		}

		const email_verified = isActive
			? randomRecentBetween(90, 0)
			: isInactive
				? Math.random() < 0.85
					? randomRecentBetween(365, 30)
					: null
				: Math.random() < 0.5
					? randomRecentBetween(730, 180)
					: null;

		const phone_verified = isActive
			? randomRecentBetween(90, 0)
			: isInactive
				? Math.random() < 0.8
					? randomRecentBetween(365, 30)
					: null
				: Math.random() < 0.5
					? randomRecentBetween(730, 180)
					: null;

		const phone = phone_verified ? randomUsPhone() : null;

		const email = (first + '.' + last).toLowerCase().replace(/[^a-z0-9.]+/g, '') + '@example.com';

		users.push({
			id: randomUUID(),
			client_id: CLIENT_ID,
			email,
			email_verified: iso(email_verified),
			password_hash: PASSWORD_HASH,
			first,
			last,
			phone,
			phone_verified: iso(phone_verified),
			role: isAdmin ? 'Admin' : null,
			disabled: isDisabled,
			created_by: null,
			created_at: iso(created_at),
			updated_by: null,
			updated_at: iso(updated_at),
			must_change_password: false,
			mfa_secret: null,
			mfa_enabled: false,
			onboarding_email_sent: isActive || isInactive,
			last_login: iso(last_login),
		});
	}

	return users;
}

// --- Optional SQL output ---
function toBulkInsertSQL(users, table = 'users') {
	const cols = [
		'id',
		'client_id',
		'email',
		'email_verified',
		'password_hash',
		'first',
		'last',
		'phone',
		'phone_verified',
		'role',
		'disabled',
		'created_by',
		'created_at',
		'updated_by',
		'updated_at',
		'must_change_password',
		'mfa_secret',
		'mfa_enabled',
		'onboarding_email_sent',
		'last_login',
	];
	const esc = (v) => {
		if (v === null || v === undefined) return 'NULL';
		if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
		return `'${String(v).replace(/'/g, "''")}'`;
	};
	const values = users.map(
		(u) =>
			`(${[
				u.id,
				u.client_id,
				u.email,
				u.email_verified,
				u.password_hash,
				u.first,
				u.last,
				u.phone,
				u.phone_verified,
				u.role,
				u.disabled,
				u.created_by,
				u.created_at,
				u.updated_by,
				u.updated_at,
				u.must_change_password,
				u.mfa_secret,
				u.mfa_enabled,
				u.onboarding_email_sent,
				u.last_login,
			]
				.map(esc)
				.join(',')})`
	);
	return `INSERT INTO ${table} (${cols.join(',')}) VALUES\n${values.join(',\n')};`;
}

// --- CLI ---
(function main() {
	const fmt = (process.argv[2] || 'json').toLowerCase(); // 'json' or 'sql'
	const users = generateUsersSync();
	// if (fmt === 'sql') {
	process.stdout.write(toBulkInsertSQL(users));
	// } else {
	// 	process.stdout.write(JSON.stringify(users, null, 2));
	// }
})();
