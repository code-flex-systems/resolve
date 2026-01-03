import { Kysely, sql } from 'kysely';

/**
 * Migration: add_statute_rules
 * Created: 2025-12-24T01:41:17.182Z
 *
 * Creates the statute_rule table for managing statute of limitations rules by state.
 * This is a GLOBAL table (not client-scoped) since statute limits are legal requirements.
 * Also seeds the tort_type reference list for all existing clients.
 */

// Helper to create simple rule config (no conditional rules)
const simple = (years: number) => ({ default_years: years, rules: [] });

// Helper to create LOB-conditional rule config
const lobBased = (autoYears: number, nonAutoYears: number) => ({
	default_years: nonAutoYears,
	rules: [{ lob: 'auto', years: autoYears }],
});

// Helper to create date-conditional rule config
const dateBased = (beforeDate: string, beforeYears: number, afterYears: number) => ({
	default_years: afterYears,
	rules: [{ date_to: beforeDate, years: beforeYears }],
});

// Negligence law types
type NegligenceType = 'contributory' | 'pure_comparative' | 'comparative_49' | 'comparative_50' | 'slight';

// Helper to get bar percent from negligence type
const getBarPercent = (type: NegligenceType): number | null => {
	switch (type) {
		case 'contributory':
			return 1;
		case 'pure_comparative':
			return 100;
		case 'comparative_49':
			return 50;
		case 'comparative_50':
			return 51;
		case 'slight':
			return null;
	}
};

// Negligence law data by state
const NEGLIGENCE_DATA: Record<
	string,
	{ type: NegligenceType; notes?: string }
> = {
	AL: { type: 'contributory' },
	AK: { type: 'pure_comparative' },
	AZ: { type: 'pure_comparative' },
	AR: { type: 'comparative_49' },
	CA: { type: 'pure_comparative' },
	CO: { type: 'comparative_49' },
	CT: { type: 'comparative_50' },
	DE: { type: 'comparative_50' },
	DC: { type: 'contributory' },
	FL: {
		type: 'comparative_50',
		notes: 'Losses prior to 03/24/2023: Pure Comparative. Losses on or after 03/24/2023: 50% Comparative.',
	},
	GA: { type: 'comparative_49' },
	HI: { type: 'comparative_50' },
	ID: { type: 'comparative_49' },
	IL: { type: 'comparative_50' },
	IN: { type: 'comparative_50' },
	IA: { type: 'comparative_50' },
	KS: { type: 'comparative_49' },
	KY: { type: 'pure_comparative' },
	LA: { type: 'pure_comparative' },
	ME: { type: 'comparative_49' },
	MD: { type: 'contributory' },
	MA: { type: 'comparative_50' },
	MI: { type: 'comparative_50' },
	MN: { type: 'comparative_50' },
	MS: { type: 'pure_comparative' },
	MO: { type: 'pure_comparative' },
	MT: {
		type: 'comparative_50',
		notes: 'No pursuit without QA to SME. See handling instructions under PIP and Medpay tab.',
	},
	NE: { type: 'comparative_49' },
	NV: { type: 'comparative_50' },
	NH: { type: 'comparative_50' },
	NJ: { type: 'comparative_50' },
	NM: { type: 'pure_comparative' },
	NY: { type: 'pure_comparative' },
	NC: { type: 'contributory' },
	ND: { type: 'comparative_49' },
	OH: {
		type: 'comparative_50',
		notes: 'For municipality claims: Ohio Government Immunity [ORC Ann. 2744.05 (2006) Limitations on damages awarded].',
	},
	OK: { type: 'comparative_50' },
	OR: { type: 'comparative_50' },
	PA: { type: 'comparative_50', notes: 'New Wisconsin Rule.' },
	PR: { type: 'pure_comparative' },
	RI: { type: 'pure_comparative' },
	SC: { type: 'comparative_50' },
	SD: {
		type: 'slight',
		notes: 'Rule of thumb: if the Insured is more than 30% at fault, it will likely bar recovery.',
	},
	TN: { type: 'comparative_49' },
	TX: { type: 'comparative_50' },
	UT: { type: 'comparative_49' },
	VT: { type: 'comparative_50' },
	VI: { type: 'pure_comparative' },
	VA: { type: 'contributory' },
	WA: {
		type: 'pure_comparative',
		notes: 'No pursuit without QA to SME before moving claim out of SAER. See handling instructions under PIP and Medpay tab.',
	},
	WV: { type: 'comparative_50' },
	WI: { type: 'comparative_50' },
	WY: { type: 'comparative_49' },
};

// All 54 US jurisdictions with their statute of limitations rules
// Structure: { injury, personal_property, real_property }
const STATUTE_RULES: Record<string, Record<string, { default_years: number | null; rules: any[] }>> = {
	AL: { injury: simple(2), personal_property: simple(2), real_property: simple(2) },
	AK: { injury: simple(2), personal_property: simple(2), real_property: simple(6) },
	AZ: { injury: simple(2), personal_property: simple(2), real_property: simple(2) },
	AR: { injury: simple(3), personal_property: simple(3), real_property: simple(3) },
	CA: { injury: simple(2), personal_property: simple(3), real_property: simple(3) },
	// Colorado: LOB-based - Auto=3yrs, Non-Auto=2yrs for all tort types
	CO: { injury: lobBased(3, 2), personal_property: lobBased(3, 2), real_property: lobBased(3, 2) },
	CT: { injury: simple(2), personal_property: simple(2), real_property: simple(2) },
	DE: { injury: simple(2), personal_property: simple(2), real_property: simple(3) },
	DC: { injury: simple(3), personal_property: simple(3), real_property: simple(3) },
	// Florida: Injury is date-based - before 2023-03-24=4yrs, after=2yrs
	FL: { injury: dateBased('2023-03-23', 4, 2), personal_property: simple(4), real_property: simple(4) },
	GA: { injury: simple(2), personal_property: simple(4), real_property: simple(4) },
	HI: { injury: simple(2), personal_property: simple(2), real_property: simple(2) },
	ID: { injury: simple(2), personal_property: simple(3), real_property: simple(3) },
	IL: { injury: simple(2), personal_property: simple(5), real_property: simple(5) },
	IN: { injury: simple(2), personal_property: simple(2), real_property: simple(6) },
	IA: { injury: simple(2), personal_property: simple(5), real_property: simple(5) },
	KS: { injury: simple(2), personal_property: simple(2), real_property: simple(2) },
	// Kentucky: Injury is LOB-based - Auto=2yrs, Non-Auto=1yr
	KY: { injury: lobBased(2, 1), personal_property: simple(2), real_property: simple(5) },
	// Louisiana: All are date-based - before 2024-07-01=1yr, after=2yrs
	LA: {
		injury: dateBased('2024-06-30', 1, 2),
		personal_property: dateBased('2024-06-30', 1, 2),
		real_property: dateBased('2024-06-30', 1, 2),
	},
	ME: { injury: simple(6), personal_property: simple(6), real_property: simple(6) },
	MD: { injury: simple(3), personal_property: simple(3), real_property: simple(3) },
	MA: { injury: simple(3), personal_property: simple(3), real_property: simple(3) },
	// Michigan: LOB-based - Auto=1yr, Non-Auto=3yrs for all tort types
	MI: { injury: lobBased(1, 3), personal_property: lobBased(1, 3), real_property: lobBased(1, 3) },
	MN: { injury: simple(2), personal_property: simple(6), real_property: simple(6) },
	MS: { injury: simple(3), personal_property: simple(3), real_property: simple(3) },
	MO: { injury: simple(5), personal_property: simple(5), real_property: simple(5) },
	MT: { injury: simple(3), personal_property: simple(2), real_property: simple(2) },
	NE: { injury: simple(4), personal_property: simple(4), real_property: simple(4) },
	NV: { injury: simple(2), personal_property: simple(3), real_property: simple(3) },
	NH: { injury: simple(3), personal_property: simple(3), real_property: simple(3) },
	NJ: { injury: simple(2), personal_property: simple(6), real_property: simple(6) },
	NM: { injury: simple(3), personal_property: simple(4), real_property: simple(4) },
	NY: { injury: simple(3), personal_property: simple(3), real_property: simple(3) },
	NC: { injury: simple(3), personal_property: simple(3), real_property: simple(3) },
	ND: { injury: simple(6), personal_property: simple(6), real_property: simple(6) },
	OH: { injury: simple(2), personal_property: simple(2), real_property: simple(4) },
	OK: { injury: simple(2), personal_property: simple(2), real_property: simple(2) },
	OR: { injury: simple(2), personal_property: simple(6), real_property: simple(6) },
	PA: { injury: simple(2), personal_property: simple(2), real_property: simple(2) },
	PR: { injury: simple(1), personal_property: simple(1), real_property: simple(1) },
	RI: { injury: simple(3), personal_property: simple(10), real_property: simple(10) },
	SC: { injury: simple(3), personal_property: simple(3), real_property: simple(3) },
	SD: { injury: simple(3), personal_property: simple(6), real_property: simple(6) },
	TN: { injury: simple(1), personal_property: simple(3), real_property: simple(3) },
	TX: { injury: simple(2), personal_property: simple(2), real_property: simple(2) },
	// Utah: Injury fixed, Personal/Real are LOB-based - Auto=4yrs, Non-Auto=3yrs
	UT: { injury: simple(4), personal_property: lobBased(4, 3), real_property: lobBased(4, 3) },
	VT: { injury: simple(3), personal_property: simple(3), real_property: simple(6) },
	VI: { injury: simple(2), personal_property: simple(6), real_property: simple(6) },
	VA: { injury: simple(2), personal_property: simple(5), real_property: simple(5) },
	WA: { injury: simple(3), personal_property: simple(3), real_property: simple(3) },
	WV: { injury: simple(2), personal_property: simple(2), real_property: simple(2) },
	// Wisconsin: Injury fixed, Personal/Real are LOB-based - Auto=3yrs, Non-Auto=6yrs
	WI: { injury: simple(3), personal_property: lobBased(3, 6), real_property: lobBased(3, 6) },
	WY: { injury: simple(4), personal_property: simple(4), real_property: simple(4) },
};

export async function up(db: Kysely<any>): Promise<void> {
	// 1. Create statute_rule table (global - no client_id)
	await db.schema
		.createTable('statute_rule')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('state_code', 'varchar(2)', (col) => col.notNull().unique())
		.addColumn('rules', 'jsonb', (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
		.addColumn('negligence_type', 'varchar(20)')
		.addColumn('negligence_bar_percent', 'integer')
		.addColumn('negligence_notes', 'text')
		.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
		.addColumn('created_by', 'uuid')
		.addColumn('updated_at', 'timestamp')
		.addColumn('updated_by', 'uuid')
		.execute();

	// 2. Add foreign key constraints
	await db.schema
		.alterTable('statute_rule')
		.addForeignKeyConstraint('statute_rule_created_by_fkey', ['created_by'], 'users', ['id'])
		.execute();

	await db.schema
		.alterTable('statute_rule')
		.addForeignKeyConstraint('statute_rule_updated_by_fkey', ['updated_by'], 'users', ['id'])
		.execute();

	// 3. Add index for quick lookups
	await db.schema
		.createIndex('idx_statute_rule_state_code')
		.on('statute_rule')
		.column('state_code')
		.execute();

	// 4. Add table and column comments
	await sql`COMMENT ON TABLE statute_rule IS 'Global statute of limitations rules by state/jurisdiction for subrogation'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN statute_rule.state_code IS 'US state/territory abbreviation (e.g., AL, DC, VI, PR)'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN statute_rule.rules IS 'JSONB mapping tort_type_value to {default_years, rules[]}'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN statute_rule.negligence_type IS 'Negligence law type: contributory, pure_comparative, comparative_49, comparative_50, slight'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN statute_rule.negligence_bar_percent IS 'Percentage at which recovery is barred (1, 50, 51, 100, or null for slight)'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN statute_rule.negligence_notes IS 'Additional notes about negligence law (e.g., date-based changes, special rules)'`.execute(
		db
	);

	// 5. Seed all 54 jurisdictions with their statute rules and negligence data
	for (const [code, rules] of Object.entries(STATUTE_RULES)) {
		const negligence = NEGLIGENCE_DATA[code];
		await db
			.insertInto('statute_rule')
			.values({
				state_code: code,
				rules,
				negligence_type: negligence?.type ?? null,
				negligence_bar_percent: negligence ? getBarPercent(negligence.type) : null,
				negligence_notes: negligence?.notes ?? null,
			})
			.execute();
	}

	// 6. Seed tort_type reference list for ALL existing clients
	const clients = await db.selectFrom('client').select('id').execute();

	for (const client of clients) {
		// Check if tort_type reference list already exists for this client
		const existingList = await db
			.selectFrom('reference_list')
			.select('id')
			.where('entity', '=', 'tort_type')
			.where('client_id', '=', client.id)
			.executeTakeFirst();

		if (!existingList) {
			// Create the reference list
			const list = await db
				.insertInto('reference_list')
				.values({
					entity: 'tort_type',
					display_name: 'Tort Type',
					description: 'Categories of legal claims for statute of limitations',
					client_id: client.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();

			// Create the reference options
			await db
				.insertInto('reference_option')
				.values([
					{
						reference_list_id: list.id,
						value: 'injury',
						display_label: 'Injury',
						is_system_default: true,
						is_active: true,
						sort_order: 1,
						client_id: client.id,
					},
					{
						reference_list_id: list.id,
						value: 'personal_property',
						display_label: 'Personal Property',
						is_system_default: true,
						is_active: true,
						sort_order: 2,
						client_id: client.id,
					},
					{
						reference_list_id: list.id,
						value: 'real_property',
						display_label: 'Real Property',
						is_system_default: true,
						is_active: true,
						sort_order: 3,
						client_id: client.id,
					},
				])
				.execute();
		}
	}
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop statute_rule table
	await db.schema.dropTable('statute_rule').execute();

	// Note: We leave the tort_type reference lists in place as they may be in use
	// They can be removed manually via the admin UI if needed
}
