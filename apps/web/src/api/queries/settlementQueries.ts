import { sql } from 'kysely';
import { ProtectedContext } from '@/server/trpc/trpc';
import { SettlementParams, SettlementUpdateParams } from '@/schemas/settlementSchemas';
import { SettlementStatus, SettlementStructure } from '@/config/enums';
import { formatDateForDB } from '@/api/utils/dateUtils';

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
	claimId: string,
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
			demand_date: formatDateForDB(params.demand_date),
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
				settlement_date: formatDateForDB(params.settlement_date),
			}),
			...(params.notes && { notes: params.notes }),
			// New fields
			...(params.adverse_party_reference && { adverse_party_reference: params.adverse_party_reference }),
			settlement_structure: params.settlement_structure || SettlementStructure.LUMP_SUM,
			...(params.payment_amount !== undefined &&
				params.payment_amount !== null && {
					payment_amount: params.payment_amount.toString(),
				}),
			...(params.payment_frequency && { payment_frequency: params.payment_frequency }),
			...(params.settled_by && { settled_by: params.settled_by }),
			is_drop_check: params.is_drop_check || false,
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
export async function getSettlement(ctx: ProtectedContext, settlementId: string) {
	return await ctx.db
		.selectFrom('settlement')
		.innerJoin('claim_party', 'settlement.claim_party_id', 'claim_party.id')
		.innerJoin('party', 'claim_party.party_id', 'party.id')
		.innerJoin('claim_coverage', 'settlement.coverage_id', 'claim_coverage.id')
		.leftJoin('users as settled_by_user', 'settlement.settled_by', 'settled_by_user.id')
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
			// New fields
			'settlement.adverse_party_reference',
			'settlement.settlement_structure',
			'settlement.payment_amount',
			'settlement.payment_frequency',
			'settlement.settled_by',
			'settlement.is_drop_check',
			eb.ref('party.name').as('party_name'),
			'claim_coverage.loss_type',
			'claim_coverage.coverage_amount',
			// Settled by user info
			eb.ref('settled_by_user.first').as('settled_by_first'),
			eb.ref('settled_by_user.last').as('settled_by_last'),
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
export async function getSettlementsByClaimId(ctx: ProtectedContext, claimId: string) {
	const clientId = ctx.session.user.client_id;

	// Use CTE to fetch adverse roles once per request instead of per row
	return await ctx.db
		.with('adverse_roles', (db) =>
			db
				.selectFrom('reference_option')
				.innerJoin('reference_list', 'reference_list.id', 'reference_option.reference_list_id')
				.select((eb) => eb.fn.agg<string[]>('array_agg', ['reference_option.value']).as('roles'))
				.where('reference_list.entity', '=', 'adverse_party_role')
				.where('reference_list.client_id', '=', clientId)
				.where('reference_list.deleted_at', 'is', null)
				.where('reference_option.deleted_at', 'is', null)
				.where('reference_option.is_active', '=', true)
		)
		.selectFrom('settlement')
		.innerJoin('claim_party', 'settlement.claim_party_id', 'claim_party.id')
		.innerJoin('party', 'claim_party.party_id', 'party.id')
		.innerJoin('claim_coverage', 'settlement.coverage_id', 'claim_coverage.id')
		.leftJoin('users as settled_by_user', 'settlement.settled_by', 'settled_by_user.id')
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
			// New fields
			'settlement.adverse_party_reference',
			'settlement.settlement_structure',
			'settlement.payment_amount',
			'settlement.payment_frequency',
			'settlement.settled_by',
			'settlement.is_drop_check',
			eb.ref('party.name').as('party_name'),
			'claim_coverage.loss_type',
			'claim_coverage.coverage_amount',
			// Settled by user info
			eb.ref('settled_by_user.first').as('settled_by_first'),
			eb.ref('settled_by_user.last').as('settled_by_last'),
		])
		.where('settlement.claim_id', '=', claimId)
		.where('settlement.client_id', '=', clientId)
		.where('settlement.deleted_at', 'is', null)
		// Filter to only adverse parties: check if claim_party.role array overlaps with adverse_party_role values
		.where(sql<boolean>`claim_party.role && (SELECT roles FROM adverse_roles)`)
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
	settlementId: string,
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
		updateValues.demand_date = formatDateForDB(params.demand_date);
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
			? formatDateForDB(params.settlement_date)
			: null;
	}
	if (params.status !== undefined) {
		updateValues.status = params.status;
	}
	if (params.notes !== undefined) {
		updateValues.notes = params.notes;
	}
	// New fields
	if (params.adverse_party_reference !== undefined) {
		updateValues.adverse_party_reference = params.adverse_party_reference;
	}
	if (params.settlement_structure !== undefined) {
		updateValues.settlement_structure = params.settlement_structure;
	}
	if (params.payment_amount !== undefined) {
		updateValues.payment_amount = params.payment_amount?.toString() ?? null;
	}
	if (params.payment_frequency !== undefined) {
		updateValues.payment_frequency = params.payment_frequency;
	}
	if (params.settled_by !== undefined) {
		updateValues.settled_by = params.settled_by;
	}
	if (params.is_drop_check !== undefined) {
		updateValues.is_drop_check = params.is_drop_check;
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
	settlementId: string,
	claimId: string
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
export async function getSettlementsForDropdown(ctx: ProtectedContext, claimId: string) {
	const clientId = ctx.session.user.client_id;

	// Use CTE to fetch adverse roles once per request instead of per row
	return await ctx.db
		.with('adverse_roles', (db) =>
			db
				.selectFrom('reference_option')
				.innerJoin('reference_list', 'reference_list.id', 'reference_option.reference_list_id')
				.select((eb) => eb.fn.agg<string[]>('array_agg', ['reference_option.value']).as('roles'))
				.where('reference_list.entity', '=', 'adverse_party_role')
				.where('reference_list.client_id', '=', clientId)
				.where('reference_list.deleted_at', 'is', null)
				.where('reference_option.deleted_at', 'is', null)
				.where('reference_option.is_active', '=', true)
		)
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
		.where('settlement.client_id', '=', clientId)
		.where('settlement.deleted_at', 'is', null)
		// Filter to only adverse parties: check if claim_party.role array overlaps with adverse_party_role values
		.where(sql<boolean>`claim_party.role && (SELECT roles FROM adverse_roles)`)
		.orderBy('settlement.demand_date', 'desc')
		.execute();
}
