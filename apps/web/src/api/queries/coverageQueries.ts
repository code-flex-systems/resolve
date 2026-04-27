import { sql } from 'kysely';
import { ProtectedContext } from '@/server/trpc/trpc';
import type { CreateCoverageInput, UpdateCoverageInput } from '@/schemas/coverageSchemas';
import { determineSubroApplicable } from '@/api/utils/subroUtils';
import { calculateStatuteDate } from '@/api/utils/statuteUtils';
import {
	shouldIncludeDeductibleInClaimAmount,
	validateDeductibleAmount,
} from '@/api/utils/deductibleUtils';
import type { Claim } from '@/api/database/types';
import { DeductibleStatus } from '@/config/enums';

/**
 * Get all coverages for a specific claim (active only, excludes soft-deleted).
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @returns array of coverages for the claim
 */
export async function getCoverages(ctx: ProtectedContext, claimId: string) {
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
export async function getCoveragesByClaimParty(ctx: ProtectedContext, claimPartyId: string) {
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
 * Calculates statute_date, determines subro_applicable, and handles deductible impact.
 *
 * @param ctx - request context
 * @param params - coverage data including claim_party_id
 * @returns created coverage and updated total_incurred
 */
export async function createCoverage(ctx: ProtectedContext, params: CreateCoverageInput) {
	// Get claim record for statute calculation and subro determination
	const claim = (await ctx.db
		.selectFrom('claim')
		.selectAll()
		.where('id', '=', params.claim_id)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirstOrThrow()) as unknown as Claim;

	// Calculate statute_date using placeholder function
	const statuteDate = calculateStatuteDate(claim);

	// Determine subro_applicable if not provided by user
	const subroApplicable = params.subro_applicable ?? determineSubroApplicable(claim);

	// Default deductible_amount to 0 if not provided
	const deductibleAmount = params.deductible_amount ?? 0;

	// Validate deductible amount matches status
	validateDeductibleAmount(deductibleAmount, params.deductible_status);

	// Calculate deltas for both reserves and deductible
	const reserveDelta = params.amount_reserved ?? 0;
	const deductibleIncluded = shouldIncludeDeductibleInClaimAmount(params.deductible_status);
	const deductibleDelta = deductibleIncluded ? deductibleAmount : 0;
	const totalDelta = reserveDelta + deductibleDelta;

	// Insert coverage with all new fields
	const coverage = await ctx.db
		.insertInto('claim_coverage')
		.values({
			claim_id: params.claim_id,
			claim_party_id: params.claim_party_id,
			loss_type: params.loss_type,
			coverage_amount: params.coverage_amount ?? null,
			amount_reserved: params.amount_reserved ?? null,
			// New fields
			deductible_amount: deductibleAmount,
			deductible_status: params.deductible_status,
			subro_applicable: subroApplicable,
			statute_date: statuteDate,
			statute_preserved: params.statute_preserved ?? false,
			client_id: ctx.session.user.client_id!,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	// Update claim.total_incurred using delta increment (no-op if delta is 0, but still returns current value)
	const updated = await ctx.db
		.updateTable('claim')
		.set({
			total_incurred: sql`COALESCE(total_incurred::numeric, 0) + ${totalDelta}::numeric`,
		})
		.where('id', '=', params.claim_id)
		.where('client_id', '=', ctx.session.user.client_id!)
		.returning('total_incurred')
		.executeTakeFirstOrThrow();

	const totalIncurred = updated.total_incurred ? parseFloat(updated.total_incurred) : 0;

	return { coverage, totalIncurred };
}

/**
 * Update an existing coverage.
 * Updates claim.total_incurred using delta increment if amount_reserved or deductible changed.
 *
 * @param ctx - request context
 * @param id - coverage identifier
 * @param params - fields to update
 * @returns updated coverage and updated total_incurred
 */
export async function updateCoverage(
	ctx: ProtectedContext,
	id: string,
	params: Omit<UpdateCoverageInput, 'id'>
) {
	// Get old coverage values for delta calculation
	const oldCoverage = await ctx.db
		.selectFrom('claim_coverage')
		.select(['amount_reserved', 'deductible_amount', 'deductible_status', 'claim_id'])
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.executeTakeFirstOrThrow();

	// Calculate reserve delta
	const oldReserve = oldCoverage.amount_reserved ?? 0;
	const newReserve =
		params.amount_reserved !== undefined ? (params.amount_reserved ?? 0) : oldReserve;
	const reserveDelta = Number(newReserve) - Number(oldReserve);

	// Calculate deductible delta
	const oldDeductibleAmount = Number(oldCoverage.deductible_amount ?? 0);
	const newDeductibleAmount =
		params.deductible_amount !== undefined ? (params.deductible_amount ?? 0) : oldDeductibleAmount;

	const oldDeductibleStatus = oldCoverage.deductible_status as DeductibleStatus;
	const newDeductibleStatus = params.deductible_status ?? oldDeductibleStatus;

	// Validate new deductible if status is NO_DEDUCTIBLE
	if (params.deductible_status || params.deductible_amount !== undefined) {
		validateDeductibleAmount(newDeductibleAmount, newDeductibleStatus);
	}

	// Calculate old and new deductible impacts on total_incurred
	const oldDeductibleIncluded = shouldIncludeDeductibleInClaimAmount(oldDeductibleStatus);
	const newDeductibleIncluded = shouldIncludeDeductibleInClaimAmount(newDeductibleStatus);

	const oldDeductibleImpact = oldDeductibleIncluded ? Number(oldDeductibleAmount) : 0;
	const newDeductibleImpact = newDeductibleIncluded ? Number(newDeductibleAmount) : 0;
	const deductibleDelta = newDeductibleImpact - oldDeductibleImpact;

	// Build update set object dynamically to only update changed fields
	const updateSet: any = {
		updated_by: ctx.session.user.id,
		updated_at: new Date(),
	};

	if (params.loss_type !== undefined) updateSet.loss_type = params.loss_type;
	if (params.coverage_amount !== undefined) updateSet.coverage_amount = params.coverage_amount;
	if (params.amount_reserved !== undefined) updateSet.amount_reserved = params.amount_reserved;
	if (params.deductible_amount !== undefined)
		updateSet.deductible_amount = params.deductible_amount;
	if (params.deductible_status !== undefined)
		updateSet.deductible_status = params.deductible_status;
	if (params.subro_applicable !== undefined)
		updateSet.subro_applicable = params.subro_applicable;
	if (params.statute_preserved !== undefined)
		updateSet.statute_preserved = params.statute_preserved;

	// Update coverage with new values
	const coverage = await ctx.db
		.updateTable('claim_coverage')
		.set(updateSet)
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();

	// Update claim.total_incurred using delta increment (no-op if delta is 0, but still returns current value)
	const totalDelta = reserveDelta + deductibleDelta;

	const updated = await ctx.db
		.updateTable('claim')
		.set({
			total_incurred: sql`COALESCE(total_incurred::numeric, 0) + ${totalDelta}::numeric`,
		})
		.where('id', '=', oldCoverage.claim_id)
		.where('client_id', '=', ctx.session.user.client_id)
		.returning('total_incurred')
		.executeTakeFirstOrThrow();

	const totalIncurred = updated.total_incurred ? parseFloat(updated.total_incurred) : 0;

	return { coverage, totalIncurred };
}

/**
 * Soft delete a coverage (archive).
 * Updates claim.total_incurred using delta decrement for both amount_reserved and deductible.
 *
 * @param ctx - request context
 * @param id - coverage identifier
 * @returns claimId and updated total_incurred
 */
export async function archiveCoverage(ctx: ProtectedContext, id: string) {
	// Archive coverage and get needed fields via RETURNING
	const coverage = await ctx.db
		.updateTable('claim_coverage')
		.set({
			deleted_at: new Date(),
			deleted_by: ctx.session.user.id,
		})
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.returning(['claim_id', 'amount_reserved', 'deductible_amount', 'deductible_status'])
		.executeTakeFirstOrThrow();

	// Calculate total impact to reverse (reserve + deductible if included)
	const reserveImpact = coverage.amount_reserved ?? 0;
	const deductibleImpact = shouldIncludeDeductibleInClaimAmount(coverage.deductible_status as DeductibleStatus)
		? (coverage.deductible_amount ?? 0)
		: 0;
	const totalImpact = Number(reserveImpact) + Number(deductibleImpact);

	// Update claim.total_incurred by removing both impacts (no-op if 0, but still returns current value)
	const updated = await ctx.db
		.updateTable('claim')
		.set({
			total_incurred: sql`COALESCE(total_incurred::numeric, 0) - ${totalImpact}::numeric`,
		})
		.where('id', '=', coverage.claim_id)
		.where('client_id', '=', ctx.session.user.client_id)
		.returning('total_incurred')
		.executeTakeFirstOrThrow();

	const totalIncurred = updated.total_incurred ? parseFloat(updated.total_incurred) : 0;

	return { claimId: coverage.claim_id, totalIncurred };
}

/**
 * Hard delete a coverage (for admin cleanup only).
 * Updates claim.total_incurred using delta decrement for both amount_reserved and deductible.
 *
 * @param ctx - request context
 * @param id - coverage identifier
 * @returns claimId and updated total_incurred
 */
export async function deleteCoverage(ctx: ProtectedContext, id: string) {
	// Delete coverage and get needed fields via RETURNING
	const coverage = await ctx.db
		.deleteFrom('claim_coverage')
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.returning(['claim_id', 'amount_reserved', 'deductible_amount', 'deductible_status'])
		.executeTakeFirstOrThrow();

	// Calculate total impact to reverse (reserve + deductible if included)
	const reserveImpact = coverage.amount_reserved ?? 0;
	const deductibleImpact = shouldIncludeDeductibleInClaimAmount(coverage.deductible_status as DeductibleStatus)
		? (coverage.deductible_amount ?? 0)
		: 0;
	const totalImpact = Number(reserveImpact) + Number(deductibleImpact);

	// Update claim.total_incurred by removing both impacts (no-op if 0, but still returns current value)
	const updated = await ctx.db
		.updateTable('claim')
		.set({
			total_incurred: sql`COALESCE(total_incurred::numeric, 0) - ${totalImpact}::numeric`,
		})
		.where('id', '=', coverage.claim_id)
		.where('client_id', '=', ctx.session.user.client_id)
		.returning('total_incurred')
		.executeTakeFirstOrThrow();

	const totalIncurred = updated.total_incurred ? parseFloat(updated.total_incurred) : 0;

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
export async function getCoverageReservedTotal(ctx: ProtectedContext, claimId: string) {
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
export async function archiveCoveragesByClaimParty(ctx: ProtectedContext, claimPartyId: string) {
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
	claimPartyIds: string[]
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
