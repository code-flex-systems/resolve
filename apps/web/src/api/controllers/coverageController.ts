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
 * Get all coverages for a specific claim party.
 *
 * @param ctx - request context
 * @param claimPartyId - claim party identifier
 * @returns array of coverages
 */
export async function getCoveragesByClaimParty(ctx: ProtectedContext, { claimPartyId }: { claimPartyId: number }) {
	return await coverageQueries.getCoveragesByClaimParty(ctx, claimPartyId);
}

/**
 * Create a new coverage for a claim party.
 *
 * @param ctx - request context
 * @param params - coverage data
 * @returns created coverage and updated totalIncurred
 */
export async function createCoverage(ctx: ProtectedContext, params: CreateCoverageInput) {
	// Create coverage and log admin action within transaction
	const result = await ctx.db.transaction().execute(async (trx) => {
		const { coverage, totalIncurred } = await coverageQueries.createCoverage({ ...ctx, db: trx }, params);

		// Log admin action
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: coverage.id,
				entityName: EntityName.CLAIM_COVERAGE,
				action: AdminAction.CREATE,
				value: {
					claim_id: coverage.claim_id,
					claim_party_id: coverage.claim_party_id,
					loss_type: coverage.loss_type,
					coverage_amount: coverage.coverage_amount,
				},
			}
		);

		return { coverage, totalIncurred };
	});

	return result;
}

/**
 * Update an existing coverage.
 *
 * @param ctx - request context
 * @param input - coverage id and fields to update
 * @returns updated coverage and updated totalIncurred
 */
export async function updateCoverage(ctx: ProtectedContext, input: UpdateCoverageInput) {
	const { id, ...params } = input;

	// Update coverage and log admin action within transaction
	const result = await ctx.db.transaction().execute(async (trx) => {
		const { coverage, totalIncurred } = await coverageQueries.updateCoverage({ ...ctx, db: trx }, id, params);

		// Log admin action
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: coverage.id,
				entityName: EntityName.CLAIM_COVERAGE,
				action: AdminAction.UPDATE,
				value: params,
			}
		);

		return { coverage, totalIncurred };
	});

	return result;
}

/**
 * Archive (soft delete) a coverage.
 *
 * @param ctx - request context
 * @param id - coverage identifier
 * @returns claimId and updated totalIncurred
 */
export async function archiveCoverage(ctx: ProtectedContext, { id }: { id: number }) {
	// Archive coverage and log admin action within transaction
	const result = await ctx.db.transaction().execute(async (trx) => {
		const { claimId, totalIncurred } = await coverageQueries.archiveCoverage({ ...ctx, db: trx }, id);

		// Log admin action
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.CLAIM_COVERAGE,
				action: AdminAction.DELETE,
				value: { id, archived: true },
			}
		);

		return { claimId, totalIncurred };
	});

	return result;
}

/**
 * Hard delete a coverage (admin cleanup only).
 *
 * @param ctx - request context
 * @param id - coverage identifier
 * @returns claimId and updated totalIncurred
 */
export async function deleteCoverage(ctx: ProtectedContext, { id }: { id: number }) {
	// Delete coverage and log admin action within transaction
	const result = await ctx.db.transaction().execute(async (trx) => {
		const { claimId, totalIncurred } = await coverageQueries.deleteCoverage({ ...ctx, db: trx }, id);

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

		return { claimId, totalIncurred };
	});

	return result;
}
