import { ProtectedContext } from '@/server/trpc/trpc';
import type { CreateCoverageInput, UpdateCoverageInput } from '@/schemas/coverageSchemas';
import { recalculateTotalIncurred } from './claimQueries';

/**
 * Get all coverages for a specific claim (active only, excludes soft-deleted).
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
		.where('deleted_at', 'is', null)
		.orderBy('id', 'asc')
		.execute();
}

/**
 * Get all coverages for a specific claim_party (active only, excludes soft-deleted).
 *
 * @param ctx - request context
 * @param claimPartyId - claim_party identifier
 * @returns array of coverages for the claim party
 */
export async function getCoveragesByClaimParty(ctx: ProtectedContext, claimPartyId: number) {
	return await ctx.db
		.selectFrom('claim_coverage')
		.selectAll()
		.where('claim_party_id', '=', claimPartyId)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.orderBy('id', 'asc')
		.execute();
}

/**
 * Create a new coverage for a claim party.
 * Recalculates total_incurred on the claim if amount_reserved is set.
 *
 * @param ctx - request context
 * @param params - coverage data including claim_party_id
 * @returns created coverage and updated total_incurred
 */
export async function createCoverage(ctx: ProtectedContext, params: CreateCoverageInput) {
	const coverage = await ctx.db
		.insertInto('claim_coverage')
		.values({
			claim_id: params.claim_id,
			claim_party_id: params.claim_party_id,
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
		.where('deleted_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();

	// Recalculate total_incurred and return the new value
	const totalIncurred = await recalculateTotalIncurred(ctx, coverage.claim_id);

	return { coverage, totalIncurred };
}

/**
 * Soft delete a coverage (archive).
 * Recalculates total_incurred on the claim after archiving.
 *
 * @param ctx - request context
 * @param id - coverage identifier
 * @returns claimId and updated total_incurred
 */
export async function archiveCoverage(ctx: ProtectedContext, id: number) {
	// Get the claim_id before soft-deleting so we can recalculate afterward
	const coverage = await ctx.db
		.selectFrom('claim_coverage')
		.select(['claim_id'])
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.executeTakeFirst();

	if (!coverage) {
		throw new Error('Coverage not found');
	}

	await ctx.db
		.updateTable('claim_coverage')
		.set({
			deleted_at: new Date(),
			deleted_by: ctx.session.user.id,
		})
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.execute();

	// Recalculate total_incurred and return the new value
	const totalIncurred = await recalculateTotalIncurred(ctx, coverage.claim_id);

	return { claimId: coverage.claim_id, totalIncurred };
}

/**
 * Hard delete a coverage (for admin cleanup only).
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
 * Get total amount_reserved for a claim (sum of all active coverage reserved amounts).
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
		.where('deleted_at', 'is', null)
		.executeTakeFirst();

	return result?.total_reserved ? parseFloat(result.total_reserved) : 0;
}

/**
 * Soft delete all coverages for a claim party.
 * Used when unlinking a party from a claim to cascade the deletion.
 * Also nullifies the claim_party_id FK to allow the claim_party record to be deleted.
 *
 * @param ctx - request context
 * @param claimPartyId - claim_party identifier
 */
export async function archiveCoveragesByClaimParty(ctx: ProtectedContext, claimPartyId: number) {
	await ctx.db
		.updateTable('claim_coverage')
		.set({
			deleted_at: new Date(),
			deleted_by: ctx.session.user.id,
			claim_party_id: null, // Nullify FK to allow claim_party deletion
		})
		.where('claim_party_id', '=', claimPartyId)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.execute();
}
