import type { ProtectedContext } from '@/server/trpc/trpc';
import * as statuteQueries from '@/api/queries/statuteQueries';
import { logAdminAction, AdminAction, EntityName } from '@/api/utils/adminActionLogger';
import type { StatuteRules, NegligenceType } from '@/schemas/statuteSchemas';

// ============================================================================
// STATUTE RULE OPERATIONS
// ============================================================================

/**
 * Get all statute rules (all 54 jurisdictions).
 * This is a global table so no client filtering is needed.
 */
export async function getStatuteRules(ctx: ProtectedContext) {
	return await statuteQueries.getStatuteRules(ctx.db);
}

/**
 * Get single statute rule by state code.
 */
export async function getStatuteRule(ctx: ProtectedContext, { stateCode }: { stateCode: string }) {
	return await statuteQueries.getStatuteRule(ctx.db, stateCode);
}

/**
 * Update statute rule for a state with admin logging.
 * Wraps the update in a transaction to ensure atomicity.
 */
export async function updateStatuteRule(
	ctx: ProtectedContext,
	{
		stateCode,
		rules,
		negligenceType,
		negligenceNotes,
	}: {
		stateCode: string;
		rules: StatuteRules;
		negligenceType?: NegligenceType | null;
		negligenceNotes?: string | null;
	}
) {
	const updated = await ctx.db.transaction().execute(async (trx) => {
		const result = await statuteQueries.updateStatuteRule(
			{ ...ctx, db: trx },
			stateCode,
			rules,
			negligenceType,
			negligenceNotes
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: result.id,
				entityName: EntityName.STATUTE_RULE,
				action: AdminAction.UPDATE,
				value: {
					state_code: stateCode,
					rules,
					negligence_type: negligenceType,
					negligence_notes: negligenceNotes,
				},
			}
		);

		return result;
	});

	return updated;
}

/**
 * Calculate statute limit for a specific scenario.
 * Used by claim workflows to determine statute dates.
 */
export async function calculateStatuteLimit(
	ctx: ProtectedContext,
	{
		stateCode,
		tortType,
		lob,
		dateOfLoss,
	}: {
		stateCode: string;
		tortType: string;
		lob?: string;
		dateOfLoss?: string;
	}
) {
	const rule = await statuteQueries.getStatuteRule(ctx.db, stateCode);
	if (!rule) {
		return { years: null, stateCode, tortType };
	}

	const years = statuteQueries.calculateStatuteLimit(
		rule.rules as StatuteRules,
		tortType,
		lob,
		dateOfLoss
	);

	return { years, stateCode, tortType, lob, dateOfLoss };
}
