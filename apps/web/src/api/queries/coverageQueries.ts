import { ProtectedContext } from '@/server/trpc/trpc';
import type { CreateCoverageInput, UpdateCoverageInput } from '@/schemas/coverageSchemas';
import { recalculateTotalIncurred } from './claimQueries';

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
 * Recalculates total_incurred on the claim if amount_reserved is set.
 *
 * @param ctx - request context
 * @param params - coverage data
 * @returns created coverage and updated total_incurred
 */
export async function createCoverage(ctx: ProtectedContext, params: CreateCoverageInput) {
	const coverage = await ctx.db
		.insertInto('claim_coverage')
		.values({
			claim_id: params.claim_id,
			coverage_type: params.coverage_type,
			coverage_amount: params.coverage_amount ?? null,
			amount_reserved: params.amount_reserved ?? null,
			client_id: ctx.session.user.client_id!,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	// Recalculate total_incurred and return the new value
	const totalIncurred = await recalculateTotalIncurred(ctx, params.claim_id);

	return { coverage, totalIncurred };
}

/**
 * Update an existing coverage.
 * Recalculates total_incurred on the claim if amount_reserved is changed.
 *
 * @param ctx - request context
 * @param id - coverage identifier
 * @param params - fields to update
 * @returns updated coverage and updated total_incurred
 */
export async function updateCoverage(ctx: ProtectedContext, id: number, params: Omit<UpdateCoverageInput, 'id'>) {
	const coverage = await ctx.db
		.updateTable('claim_coverage')
		.set({
			coverage_type: params.coverage_type,
			coverage_amount: params.coverage_amount,
			amount_reserved: params.amount_reserved,
			updated_by: ctx.session.user.id,
			updated_at: new Date(),
		})
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();

	// Recalculate total_incurred and return the new value
	const totalIncurred = await recalculateTotalIncurred(ctx, coverage.claim_id);

	return { coverage, totalIncurred };
}

/**
 * Delete a coverage.
 * Recalculates total_incurred on the claim after deletion.
 *
 * @param ctx - request context
 * @param id - coverage identifier
 * @returns claimId and updated total_incurred
 */
export async function deleteCoverage(ctx: ProtectedContext, id: number) {
	// Get the claim_id before deleting so we can recalculate afterward
	const coverage = await ctx.db
		.selectFrom('claim_coverage')
		.select(['claim_id'])
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();

	if (!coverage) {
		throw new Error('Coverage not found');
	}

	await ctx.db
		.deleteFrom('claim_coverage')
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.execute();

	// Recalculate total_incurred and return the new value
	const totalIncurred = await recalculateTotalIncurred(ctx, coverage.claim_id);

	return { claimId: coverage.claim_id, totalIncurred };
}

/**
 * Get total amount_reserved for a claim (sum of all coverage reserved amounts).
 * This is used to calculate total_incurred.
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @returns total reserved amount as a number
 */
export async function getCoverageReservedTotal(ctx: ProtectedContext, claimId: number) {
	const result = await ctx.db
		.selectFrom('claim_coverage')
		.select(({ fn }) => fn.sum<string>('amount_reserved').as('total_reserved'))
		.where('claim_id', '=', claimId)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();

	return result?.total_reserved ? parseFloat(result.total_reserved) : 0;
}
