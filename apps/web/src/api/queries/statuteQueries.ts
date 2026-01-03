import type { ProtectedContext } from '@/server/trpc/trpc';
import type { StatuteRules, TortTypeConfig, NegligenceType } from '@/schemas/statuteSchemas';
import { getBarPercentForType } from '@/schemas/statuteSchemas';
import { sql, Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

// NOTE: This table is GLOBAL - no client_id scoping!

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get all statute rules (all 54 jurisdictions)
 * Sorted by state code for consistent display
 */
export async function getStatuteRules(db: Kysely<DB>) {
	return await db
		.selectFrom('statute_rule')
		.select([
			'statute_rule.id',
			'statute_rule.state_code',
			'statute_rule.rules',
			'statute_rule.negligence_type',
			'statute_rule.negligence_bar_percent',
			'statute_rule.negligence_notes',
			'statute_rule.created_at',
			'statute_rule.updated_at',
		])
		.orderBy('statute_rule.state_code asc')
		.execute();
}

/**
 * Get single statute rule by state code
 */
export async function getStatuteRule(db: Kysely<DB>, stateCode: string) {
	return await db
		.selectFrom('statute_rule')
		.select([
			'statute_rule.id',
			'statute_rule.state_code',
			'statute_rule.rules',
			'statute_rule.negligence_type',
			'statute_rule.negligence_bar_percent',
			'statute_rule.negligence_notes',
			'statute_rule.created_at',
			'statute_rule.created_by',
			'statute_rule.updated_at',
			'statute_rule.updated_by',
		])
		.where('statute_rule.state_code', '=', stateCode)
		.executeTakeFirst();
}

/**
 * Update statute rule for a state.
 * Uses RETURNING for efficiency (Performance Pattern #1).
 * Auto-calculates negligence_bar_percent from negligence_type.
 */
export async function updateStatuteRule(
	ctx: ProtectedContext,
	stateCode: string,
	rules: StatuteRules,
	negligenceType?: NegligenceType | null,
	negligenceNotes?: string | null
) {
	return await ctx.db
		.updateTable('statute_rule')
		.set({
			rules: JSON.stringify(rules),
			...(negligenceType !== undefined && {
				negligence_type: negligenceType,
				negligence_bar_percent: getBarPercentForType(negligenceType),
			}),
			...(negligenceNotes !== undefined && { negligence_notes: negligenceNotes }),
			updated_at: sql`now()`,
			updated_by: ctx.session.user.id,
		})
		.where('state_code', '=', stateCode)
		.returning([
			'id',
			'state_code',
			'rules',
			'negligence_type',
			'negligence_bar_percent',
			'negligence_notes',
			'updated_at',
			'updated_by',
		])
		.executeTakeFirstOrThrow();
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Normalize a date string to YYYY-MM-DD format for reliable comparison.
 * Handles ISO strings with timestamps (2025-03-24T12:00:00Z) and Date objects.
 *
 * For date-only strings (YYYY-MM-DD), returns as-is to avoid timezone issues.
 * For timestamps, uses UTC to ensure consistent behavior across timezones.
 */
function normalizeToYYYYMMDD(dateInput: string | Date): string {
	// If already a YYYY-MM-DD string, return as-is
	if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
		return dateInput;
	}

	// Parse and use UTC methods to avoid timezone issues
	const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Calculate the applicable statute limit (years) for a given scenario.
 * This is a pure function that can be called without database access.
 *
 * @param rules - The rules JSONB from the statute_rule record
 * @param tortType - The tort type value (e.g., "injury", "personal_property")
 * @param lob - Optional line of business for LOB-based rules
 * @param dateOfLoss - Optional date of loss (ISO string or Date) for date-based rules
 * @returns The applicable statute limit in years, or null if N/A
 */
export function calculateStatuteLimit(
	rules: StatuteRules,
	tortType: string,
	lob?: string,
	dateOfLoss?: string | Date
): number | null {
	const tortConfig = rules[tortType] as TortTypeConfig | undefined;
	if (!tortConfig) return null;

	// Normalize dateOfLoss to YYYY-MM-DD for reliable comparison
	const normalizedDateOfLoss = dateOfLoss ? normalizeToYYYYMMDD(dateOfLoss) : undefined;

	// Check conditional rules first (first matching rule wins)
	if (tortConfig.rules && tortConfig.rules.length > 0) {
		for (const rule of tortConfig.rules) {
			let matches = true;

			// Check LOB condition
			if (rule.lob) {
				if (!lob || rule.lob !== lob) {
					matches = false;
				}
			}

			// Check date_from condition (date of loss must be >= date_from)
			if (matches && rule.date_from && normalizedDateOfLoss) {
				if (normalizedDateOfLoss < rule.date_from) {
					matches = false;
				}
			}

			// Check date_to condition (date of loss must be <= date_to)
			if (matches && rule.date_to && normalizedDateOfLoss) {
				if (normalizedDateOfLoss > rule.date_to) {
					matches = false;
				}
			}

			// If this rule has conditions and they all match, return its years
			const hasConditions = rule.lob || rule.date_from || rule.date_to;
			if (matches && hasConditions) {
				return rule.years;
			}
		}
	}

	// Fall back to default
	return tortConfig.default_years;
}

/**
 * Get statute limit for a specific state and scenario.
 * Convenience function that fetches the rule and calculates the limit.
 */
export async function getStatuteLimitForScenario(
	db: Kysely<DB>,
	stateCode: string,
	tortType: string,
	lob?: string,
	dateOfLoss?: string
): Promise<{ years: number | null; stateCode: string; tortType: string }> {
	const rule = await getStatuteRule(db, stateCode);
	if (!rule) {
		return { years: null, stateCode, tortType };
	}

	const years = calculateStatuteLimit(rule.rules as StatuteRules, tortType, lob, dateOfLoss);

	return { years, stateCode, tortType };
}
