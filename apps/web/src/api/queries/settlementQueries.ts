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
		.where('settlement.deleted_at', 'is', null)
		.executeTakeFirst();
}

/**
 * List settlements for a claim with party and coverage info.
 * Only returns settlements linked to adverse parties (parties with roles from adverse_party_role).
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @returns list of settlements with party and coverage details, filtered to adverse parties only
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
		.where('settlement.deleted_at', 'is', null)
		// Filter to only adverse parties: check if claim_party.role array overlaps with adverse_party_role values
		.where((eb) =>
			eb(
				'claim_party.role',
				'&&',
				eb
					.selectFrom('reference_option')
					.innerJoin('reference_list', 'reference_list.id', 'reference_option.reference_list_id')
					.select((eb) => eb.fn.agg<string[]>('array_agg', ['reference_option.value']).as('values'))
					.where('reference_list.entity', '=', 'adverse_party_role')
					.where('reference_list.client_id', '=', ctx.session.user.client_id)
					.where('reference_list.deleted_at', 'is', null)
					.where('reference_option.deleted_at', 'is', null)
					.where('reference_option.is_active', '=', true)
			)
		)
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
		.where('settlement.deleted_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Soft delete (archive) a settlement.
 * Recovery events linked to this settlement should be handled by the controller.
 *
 * @param ctx - request context
 * @param settlementId - settlement identifier
 * @param claimId - claim identifier (for verification)
 * @returns archived settlement
 */
export async function archiveSettlement(
	ctx: ProtectedContext,
	settlementId: number,
	claimId: number
) {
	return await ctx.db
		.updateTable('settlement')
		.set({
			deleted_at: sql`now()`,
			deleted_by: ctx.session.user.id,
		})
		.where('settlement.id', '=', settlementId)
		.where('settlement.claim_id', '=', claimId)
		.where('settlement.client_id', '=', ctx.session.user.client_id)
		.where('settlement.deleted_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Get settlements for a dropdown (simplified list for forms).
 * Only returns settlements linked to adverse parties (parties with roles from adverse_party_role).
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @returns list of settlements with minimal info for dropdown, filtered to adverse parties only
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
		.where('settlement.deleted_at', 'is', null)
		// Filter to only adverse parties: check if claim_party.role array overlaps with adverse_party_role values
		.where((eb) =>
			eb(
				'claim_party.role',
				'&&',
				eb
					.selectFrom('reference_option')
					.innerJoin('reference_list', 'reference_list.id', 'reference_option.reference_list_id')
					.select((eb) => eb.fn.agg<string[]>('array_agg', ['reference_option.value']).as('values'))
					.where('reference_list.entity', '=', 'adverse_party_role')
					.where('reference_list.client_id', '=', ctx.session.user.client_id)
					.where('reference_list.deleted_at', 'is', null)
					.where('reference_option.deleted_at', 'is', null)
					.where('reference_option.is_active', '=', true)
			)
		)
		.orderBy('settlement.demand_date', 'desc')
		.execute();
}
