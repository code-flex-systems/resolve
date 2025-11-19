import * as coverageQueries from '@/api/queries/coverageQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import { logAdminAction, AdminAction, EntityName } from '@/api/utils/adminActionLogger';
import type { CreateCoverageInput, UpdateCoverageInput } from '@/schemas/coverageSchemas';

/**
 * Get all coverages for a specific claim.
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @returns array of coverages
 */
export async function getCoverages(ctx: ProtectedContext, { claimId }: { claimId: number }) {
	return await coverageQueries.getCoverages(ctx, claimId);
}

/**
 * Create a new coverage for a claim.
 *
 * @param ctx - request context
 * @param params - coverage data
 * @returns created coverage
 */
export async function createCoverage(ctx: ProtectedContext, params: CreateCoverageInput) {
	// Create coverage and log admin action within transaction
	const coverage = await ctx.db.transaction().execute(async (trx) => {
		const newCoverage = await coverageQueries.createCoverage({ ...ctx, db: trx }, params);

		// Log admin action
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: newCoverage.id,
				entityName: EntityName.CLAIM_COVERAGE,
				action: AdminAction.CREATE,
				value: {
					claim_id: newCoverage.claim_id,
					coverage_type: newCoverage.coverage_type,
					coverage_amount: newCoverage.coverage_amount,
				},
			}
		);

		return newCoverage;
	});

	return coverage;
}

/**
 * Update an existing coverage.
 *
 * @param ctx - request context
 * @param input - coverage id and fields to update
 * @returns updated coverage
 */
export async function updateCoverage(ctx: ProtectedContext, input: UpdateCoverageInput) {
	const { id, ...params } = input;

	// Update coverage and log admin action within transaction
	const coverage = await ctx.db.transaction().execute(async (trx) => {
		const updatedCoverage = await coverageQueries.updateCoverage({ ...ctx, db: trx }, id, params);

		// Log admin action
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: updatedCoverage.id,
				entityName: EntityName.CLAIM_COVERAGE,
				action: AdminAction.UPDATE,
				value: params,
			}
		);

		return updatedCoverage;
	});

	return coverage;
}

/**
 * Delete a coverage.
 *
 * @param ctx - request context
 * @param id - coverage identifier
 */
export async function deleteCoverage(ctx: ProtectedContext, { id }: { id: number }) {
	// Delete coverage and log admin action within transaction
	await ctx.db.transaction().execute(async (trx) => {
		await coverageQueries.deleteCoverage({ ...ctx, db: trx }, id);

		// Log admin action
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.CLAIM_COVERAGE,
				action: AdminAction.DELETE,
				value: { id },
			}
		);
	});
}
