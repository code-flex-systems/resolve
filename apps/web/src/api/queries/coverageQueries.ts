import { ProtectedContext } from '@/server/trpc/trpc';
import type { CreateCoverageInput, UpdateCoverageInput } from '@/schemas/coverageSchemas';

/**
 * Get all coverages for a specific claim.
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @returns array of coverages for the claim
 */
export async function getCoverages(ctx: ProtectedContext, claimId: number) {
	return await ctx.db
		.selectFrom('claim_coverage')
		.selectAll()
		.where('claim_id', '=', claimId)
		.where('client_id', '=', ctx.session.user.client_id)
		.orderBy('id', 'asc')
		.execute();
}

/**
 * Create a new coverage for a claim.
 *
 * @param ctx - request context
 * @param params - coverage data
 * @returns created coverage
 */
export async function createCoverage(ctx: ProtectedContext, params: CreateCoverageInput) {
	return await ctx.db
		.insertInto('claim_coverage')
		.values({
			claim_id: params.claim_id,
			coverage_type: params.coverage_type,
			coverage_amount: params.coverage_amount ?? null,
			client_id: ctx.session.user.client_id!,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Update an existing coverage.
 *
 * @param ctx - request context
 * @param id - coverage identifier
 * @param params - fields to update
 * @returns updated coverage
 */
export async function updateCoverage(ctx: ProtectedContext, id: number, params: Omit<UpdateCoverageInput, 'id'>) {
	return await ctx.db
		.updateTable('claim_coverage')
		.set({
			coverage_type: params.coverage_type,
			coverage_amount: params.coverage_amount,
			updated_by: ctx.session.user.id,
			updated_at: new Date(),
		})
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Delete a coverage.
 *
 * @param ctx - request context
 * @param id - coverage identifier
 */
export async function deleteCoverage(ctx: ProtectedContext, id: number) {
	await ctx.db
		.deleteFrom('claim_coverage')
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.execute();
}
