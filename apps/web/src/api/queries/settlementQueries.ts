import { sql } from 'kysely';
import { ProtectedContext } from '@/server/trpc/trpc';
import { SettlementParams, SettlementUpdateParams } from '@/schemas/settlementSchemas';
import { SettlementStatus } from '@/config/enums';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// =====================================================================
// SETTLEMENT QUERIES
// =====================================================================

/**
 * Create a settlement for a claim.
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @param params - settlement parameters
 * @returns created settlement
 */
export async function createSettlement(
	ctx: ProtectedContext,
	claimId: number,
	params: SettlementParams
) {
	const clientId = ctx.session.user.client_id!;

	return await ctx.db
		.insertInto('settlement')
		.values({
			claim_id: claimId,
			client_id: clientId,
			claim_party_id: params.claim_party_id,
			coverage_id: params.coverage_id,
			demand_amount: params.demand_amount.toString(),
			// Format as YYYY-MM-DD string to avoid timezone conversion when sending to PostgreSQL
			demand_date: dayjs.utc(params.demand_date).format('YYYY-MM-DD'),
			status: params.status || SettlementStatus.SENT,
			created_by: ctx.session.user.id,
			created_at: sql`now()`,
			...(params.agreed_liability_percentage !== undefined &&
				params.agreed_liability_percentage !== null && {
					agreed_liability_percentage: params.agreed_liability_percentage.toString(),
				}),
			...(params.settlement_amount !== undefined &&
				params.settlement_amount !== null && {
					settlement_amount: params.settlement_amount.toString(),
				}),
			...(params.settlement_date && {
				settlement_date: dayjs.utc(params.settlement_date).format('YYYY-MM-DD'),
			}),
			...(params.notes && { notes: params.notes }),
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Get a settlement by ID with related party and coverage info.
 *
 * @param ctx - request context
 * @param settlementId - settlement identifier
 * @returns settlement with party and coverage details
 */
export async function getSettlement(ctx: ProtectedContext, settlementId: number) {
	return await ctx.db
		.selectFrom('settlement')
		.innerJoin('claim_party', 'settlement.claim_party_id', 'claim_party.id')
		.innerJoin('party', 'claim_party.party_id', 'party.id')
		.innerJoin('claim_coverage', 'settlement.coverage_id', 'claim_coverage.id')
		.select((eb) => [
			'settlement.id',
			'settlement.claim_id',
			'settlement.claim_party_id',
			'settlement.coverage_id',
			'settlement.demand_amount',
			'settlement.demand_date',
			'settlement.agreed_liability_percentage',
			'settlement.settlement_amount',
			'settlement.settlement_date',
			'settlement.status',
			'settlement.notes',
			'settlement.created_by',
			'settlement.created_at',
			'settlement.updated_by',
			'settlement.updated_at',
			eb.ref('party.name').as('party_name'),
			'claim_coverage.loss_type',
			'claim_coverage.coverage_amount',
		])
		.where('settlement.id', '=', settlementId)
		.where('settlement.client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

/**
 * List settlements for a claim with party and coverage info.
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @returns list of settlements with party and coverage details
 */
export async function getSettlementsByClaimId(ctx: ProtectedContext, claimId: number) {
	return await ctx.db
		.selectFrom('settlement')
		.innerJoin('claim_party', 'settlement.claim_party_id', 'claim_party.id')
		.innerJoin('party', 'claim_party.party_id', 'party.id')
		.innerJoin('claim_coverage', 'settlement.coverage_id', 'claim_coverage.id')
		.select((eb) => [
			'settlement.id',
			'settlement.claim_id',
			'settlement.claim_party_id',
			'settlement.coverage_id',
			'settlement.demand_amount',
			'settlement.demand_date',
			'settlement.agreed_liability_percentage',
			'settlement.settlement_amount',
			'settlement.settlement_date',
			'settlement.status',
			'settlement.notes',
			'settlement.created_by',
			'settlement.created_at',
			'settlement.updated_by',
			'settlement.updated_at',
			eb.ref('party.name').as('party_name'),
			'claim_coverage.loss_type',
			'claim_coverage.coverage_amount',
		])
		.where('settlement.claim_id', '=', claimId)
		.where('settlement.client_id', '=', ctx.session.user.client_id)
		.orderBy('settlement.demand_date', 'desc')
		.orderBy('settlement.created_at', 'desc')
		.execute();
}

/**
 * Update a settlement.
 *
 * @param ctx - request context
 * @param settlementId - settlement identifier
 * @param params - fields to update
 * @returns updated settlement
 */
export async function updateSettlement(
	ctx: ProtectedContext,
	settlementId: number,
	params: SettlementUpdateParams
) {
	const updateValues: Record<string, any> = {
		updated_by: ctx.session.user.id,
		updated_at: sql`now()`,
	};

	if (params.claim_party_id !== undefined) {
		updateValues.claim_party_id = params.claim_party_id;
	}
	if (params.coverage_id !== undefined) {
		updateValues.coverage_id = params.coverage_id;
	}
	if (params.demand_amount !== undefined) {
		updateValues.demand_amount = params.demand_amount.toString();
	}
	if (params.demand_date !== undefined) {
		// Format as YYYY-MM-DD string to avoid timezone conversion when sending to PostgreSQL
		updateValues.demand_date = dayjs.utc(params.demand_date).format('YYYY-MM-DD');
	}
	if (params.agreed_liability_percentage !== undefined) {
		updateValues.agreed_liability_percentage =
			params.agreed_liability_percentage?.toString() ?? null;
	}
	if (params.settlement_amount !== undefined) {
		updateValues.settlement_amount = params.settlement_amount?.toString() ?? null;
	}
	if (params.settlement_date !== undefined) {
		// Format as YYYY-MM-DD string to avoid timezone conversion when sending to PostgreSQL
		updateValues.settlement_date = params.settlement_date
			? dayjs.utc(params.settlement_date).format('YYYY-MM-DD')
			: null;
	}
	if (params.status !== undefined) {
		updateValues.status = params.status;
	}
	if (params.notes !== undefined) {
		updateValues.notes = params.notes;
	}

	return await ctx.db
		.updateTable('settlement')
		.set(updateValues)
		.where('settlement.id', '=', settlementId)
		.where('settlement.client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Get settlement for deletion (for logging purposes).
 *
 * @param ctx - request context
 * @param settlementId - settlement identifier
 * @returns settlement fields for logging
 */
export async function getSettlementForDeletion(ctx: ProtectedContext, settlementId: number) {
	return await ctx.db
		.selectFrom('settlement')
		.select([
			'id',
			'claim_id',
			'claim_party_id',
			'coverage_id',
			'demand_amount',
			'demand_date',
			'settlement_amount',
			'status',
		])
		.where('settlement.id', '=', settlementId)
		.where('settlement.client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

/**
 * Delete a settlement (and cascade to its recovery events).
 *
 * @param ctx - request context
 * @param settlementId - settlement identifier
 * @param claimId - claim identifier (for verification)
 * @returns deleted settlement
 */
export async function deleteSettlement(
	ctx: ProtectedContext,
	settlementId: number,
	claimId: number
) {
	return await ctx.db
		.deleteFrom('settlement')
		.where('settlement.id', '=', settlementId)
		.where('settlement.claim_id', '=', claimId)
		.where('settlement.client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Get settlements for a dropdown (simplified list for forms).
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @returns list of settlements with minimal info for dropdown
 */
export async function getSettlementsForDropdown(ctx: ProtectedContext, claimId: number) {
	return await ctx.db
		.selectFrom('settlement')
		.innerJoin('claim_party', 'settlement.claim_party_id', 'claim_party.id')
		.innerJoin('party', 'claim_party.party_id', 'party.id')
		.innerJoin('claim_coverage', 'settlement.coverage_id', 'claim_coverage.id')
		.select((eb) => [
			'settlement.id',
			'settlement.demand_amount',
			'settlement.demand_date',
			'settlement.status',
			eb.ref('party.name').as('party_name'),
			'claim_coverage.loss_type',
		])
		.where('settlement.claim_id', '=', claimId)
		.where('settlement.client_id', '=', ctx.session.user.client_id)
		.orderBy('settlement.demand_date', 'desc')
		.execute();
}
