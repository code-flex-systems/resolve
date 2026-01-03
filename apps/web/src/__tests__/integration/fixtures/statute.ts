/**
 * Statute Rule Fixtures
 *
 * Note: The statute_rule table is GLOBAL (not client-scoped).
 * It is seeded with all 54 US jurisdictions during migration.
 * These fixtures help update/modify rules for testing.
 */

import { Kysely, sql } from 'kysely';
import type { DB } from '@/api/database/types';
import type { StatuteRules, NegligenceType } from '@/schemas/statuteSchemas';

/**
 * Update a statute rule for testing purposes.
 * Returns the updated rule.
 */
export async function updateTestStatuteRule(
	db: Kysely<DB>,
	stateCode: string,
	overrides: {
		rules?: StatuteRules;
		negligence_type?: NegligenceType | null;
		negligence_bar_percent?: number | null;
		negligence_notes?: string | null;
		updated_by?: string | null;
	}
) {
	return db
		.updateTable('statute_rule')
		.set({
			...(overrides.rules !== undefined && { rules: JSON.stringify(overrides.rules) }),
			...(overrides.negligence_type !== undefined && { negligence_type: overrides.negligence_type }),
			...(overrides.negligence_bar_percent !== undefined && {
				negligence_bar_percent: overrides.negligence_bar_percent,
			}),
			...(overrides.negligence_notes !== undefined && { negligence_notes: overrides.negligence_notes }),
			...(overrides.updated_by !== undefined && { updated_by: overrides.updated_by }),
			updated_at: sql`now()`,
		})
		.where('state_code', '=', stateCode)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Reset a statute rule to empty/default state for testing.
 * Useful before tests to ensure clean state.
 */
export async function resetTestStatuteRule(db: Kysely<DB>, stateCode: string) {
	return db
		.updateTable('statute_rule')
		.set({
			rules: JSON.stringify({}),
			negligence_type: null,
			negligence_bar_percent: null,
			negligence_notes: null,
			updated_at: sql`now()`,
			updated_by: null,
		})
		.where('state_code', '=', stateCode)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Get a statute rule by state code.
 */
export async function getTestStatuteRule(db: Kysely<DB>, stateCode: string) {
	return db
		.selectFrom('statute_rule')
		.selectAll()
		.where('state_code', '=', stateCode)
		.executeTakeFirst();
}
