import { sql } from 'kysely';
import { ProtectedContext } from '@/server/trpc/trpc';
import type { CreateCoverageInput, UpdateCoverageInput } from '@/schemas/coverageSchemas';

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
 * Updates claim.total_incurred using delta increment if amount_reserved is set.
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
			loss_type: params.loss_type,
			coverage_amount: params.coverage_amount ?? null,
			amount_reserved: params.amount_reserved ?? null,
			client_id: ctx.session.user.client_id!,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	// Update claim.total_incurred using delta increment and return new value
	let totalIncurred = 0;
	if (params.amount_reserved !== null && params.amount_reserved !== undefined) {
		const amount = params.amount_reserved;

		if (amount !== 0) {
			const updated = await ctx.db
				.updateTable('claim')
				.set({
					// Use ::numeric casting to preserve precision in PostgreSQL, avoiding JavaScript float arithmetic
					total_incurred: sql`COALESCE(total_incurred::numeric, 0) + ${amount}::numeric`,
				})
				.where('id', '=', params.claim_id)
				.where('client_id', '=', ctx.session.user.client_id!)
				.returning('total_incurred')
				.executeTakeFirstOrThrow();

			totalIncurred = updated.total_incurred ? parseFloat(updated.total_incurred) : 0;
		} else {
			// No delta, fetch current total_incurred
			const claim = await ctx.db
				.selectFrom('claim')
				.select('total_incurred')
				.where('id', '=', params.claim_id)
				.where('client_id', '=', ctx.session.user.client_id!)
				.executeTakeFirstOrThrow();

			totalIncurred = claim.total_incurred ? parseFloat(claim.total_incurred) : 0;
		}
	} else {
		// No amount_reserved, fetch current total_incurred
		const claim = await ctx.db
			.selectFrom('claim')
			.select('total_incurred')
			.where('id', '=', params.claim_id)
			.where('client_id', '=', ctx.session.user.client_id!)
			.executeTakeFirstOrThrow();

		totalIncurred = claim.total_incurred ? parseFloat(claim.total_incurred) : 0;
	}

	return { coverage, totalIncurred };
}

/**
 * Update an existing coverage.
 * Updates claim.total_incurred using delta increment if amount_reserved changed.
 *
 * @param ctx - request context
 * @param id - coverage identifier
 * @param params - fields to update
 * @returns updated coverage and updated total_incurred
 */
export async function updateCoverage(
	ctx: ProtectedContext,
	id: number,
	params: Omit<UpdateCoverageInput, 'id'>
) {
	// First get the old amount_reserved and claim_id
	const oldCoverage = await ctx.db
		.selectFrom('claim_coverage')
		.select(['amount_reserved', 'claim_id'])
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.executeTakeFirstOrThrow();

	// Then update
	const coverage = await ctx.db
		.updateTable('claim_coverage')
		.set({
			loss_type: params.loss_type,
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

	// Update claim.total_incurred using delta increment and return new value
	const oldAmount = oldCoverage.amount_reserved ?? 0;
	const newAmount = params.amount_reserved !== undefined ? (params.amount_reserved ?? 0) : oldAmount;

	let totalIncurred = 0;
	// Check if delta would be non-zero before querying
	if (newAmount !== oldAmount) {
		const updated = await ctx.db
			.updateTable('claim')
			.set({
				// Use ::numeric casting to preserve precision in PostgreSQL, avoiding JavaScript float arithmetic
				total_incurred: sql`COALESCE(total_incurred::numeric, 0) + ${newAmount}::numeric - ${oldAmount}::numeric`,
			})
			.where('id', '=', oldCoverage.claim_id)
			.where('client_id', '=', ctx.session.user.client_id)
			.returning('total_incurred')
			.executeTakeFirstOrThrow();

		totalIncurred = updated.total_incurred ? parseFloat(updated.total_incurred) : 0;
	} else {
		// No delta, fetch current total_incurred
		const claim = await ctx.db
			.selectFrom('claim')
			.select('total_incurred')
			.where('id', '=', oldCoverage.claim_id)
			.where('client_id', '=', ctx.session.user.client_id)
			.executeTakeFirstOrThrow();

		totalIncurred = claim.total_incurred ? parseFloat(claim.total_incurred) : 0;
	}

	return { coverage, totalIncurred };
}

/**
 * Soft delete a coverage (archive).
 * Updates claim.total_incurred using delta decrement if amount_reserved was set.
 *
 * @param ctx - request context
 * @param id - coverage identifier
 * @returns claimId and updated total_incurred
 */
export async function archiveCoverage(ctx: ProtectedContext, id: number) {
	// Archive coverage and get claim_id + amount_reserved via RETURNING
	const coverage = await ctx.db
		.updateTable('claim_coverage')
		.set({
			deleted_at: new Date(),
			deleted_by: ctx.session.user.id,
		})
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.returning(['claim_id', 'amount_reserved'])
		.executeTakeFirstOrThrow();

	// Update claim.total_incurred using delta decrement and return new value
	let totalIncurred = 0;
	if (coverage.amount_reserved) {
		const amount = coverage.amount_reserved;

		if (Number(amount) !== 0) {
			const updated = await ctx.db
				.updateTable('claim')
				.set({
					// Use ::numeric casting to preserve precision in PostgreSQL, avoiding JavaScript float arithmetic
					total_incurred: sql`COALESCE(total_incurred::numeric, 0) - ${amount}::numeric`,
				})
				.where('id', '=', coverage.claim_id)
				.where('client_id', '=', ctx.session.user.client_id)
				.returning('total_incurred')
				.executeTakeFirstOrThrow();

			totalIncurred = updated.total_incurred ? parseFloat(updated.total_incurred) : 0;
		} else {
			// No delta, fetch current total_incurred
			const claim = await ctx.db
				.selectFrom('claim')
				.select('total_incurred')
				.where('id', '=', coverage.claim_id)
				.where('client_id', '=', ctx.session.user.client_id)
				.executeTakeFirstOrThrow();

			totalIncurred = claim.total_incurred ? parseFloat(claim.total_incurred) : 0;
		}
	} else {
		// No amount_reserved, fetch current total_incurred
		const claim = await ctx.db
			.selectFrom('claim')
			.select('total_incurred')
			.where('id', '=', coverage.claim_id)
			.where('client_id', '=', ctx.session.user.client_id)
			.executeTakeFirstOrThrow();

		totalIncurred = claim.total_incurred ? parseFloat(claim.total_incurred) : 0;
	}

	return { claimId: coverage.claim_id, totalIncurred };
}

/**
 * Hard delete a coverage (for admin cleanup only).
 * Updates claim.total_incurred using delta decrement if amount_reserved was set.
 *
 * @param ctx - request context
 * @param id - coverage identifier
 * @returns claimId and updated total_incurred
 */
export async function deleteCoverage(ctx: ProtectedContext, id: number) {
	// Delete coverage and get claim_id + amount_reserved via RETURNING
	const coverage = await ctx.db
		.deleteFrom('claim_coverage')
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.returning(['claim_id', 'amount_reserved'])
		.executeTakeFirstOrThrow();

	// Update claim.total_incurred using delta decrement and return new value
	let totalIncurred = 0;
	if (coverage.amount_reserved) {
		const amount = coverage.amount_reserved;

		if (Number(amount) !== 0) {
			const updated = await ctx.db
				.updateTable('claim')
				.set({
					// Use ::numeric casting to preserve precision in PostgreSQL, avoiding JavaScript float arithmetic
					total_incurred: sql`COALESCE(total_incurred::numeric, 0) - ${amount}::numeric`,
				})
				.where('id', '=', coverage.claim_id)
				.where('client_id', '=', ctx.session.user.client_id)
				.returning('total_incurred')
				.executeTakeFirstOrThrow();

			totalIncurred = updated.total_incurred ? parseFloat(updated.total_incurred) : 0;
		} else {
			// No delta, fetch current total_incurred
			const claim = await ctx.db
				.selectFrom('claim')
				.select('total_incurred')
				.where('id', '=', coverage.claim_id)
				.where('client_id', '=', ctx.session.user.client_id)
				.executeTakeFirstOrThrow();

			totalIncurred = claim.total_incurred ? parseFloat(claim.total_incurred) : 0;
		}
	} else {
		// No amount_reserved, fetch current total_incurred
		const claim = await ctx.db
			.selectFrom('claim')
			.select('total_incurred')
			.where('id', '=', coverage.claim_id)
			.where('client_id', '=', ctx.session.user.client_id)
			.executeTakeFirstOrThrow();

		totalIncurred = claim.total_incurred ? parseFloat(claim.total_incurred) : 0;
	}

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

/**
 * Archive coverages for multiple claim parties in a single batch query (Phase 1.2 optimization)
 * @param ctx - request context
 * @param claimPartyIds - array of claim_party IDs to archive coverages for
 */
export async function archiveCoveragesByClaimPartyIds(
	ctx: ProtectedContext,
	claimPartyIds: number[]
): Promise<void> {
	if (claimPartyIds.length === 0) return;

	await ctx.db
		.updateTable('claim_coverage')
		.set({
			deleted_at: new Date(),
			deleted_by: ctx.session.user.id,
			claim_party_id: null, // Nullify FK to allow claim_party deletion
		})
		.where('claim_party_id', 'in', claimPartyIds) // WHERE IN for batch operation
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.execute();
}
