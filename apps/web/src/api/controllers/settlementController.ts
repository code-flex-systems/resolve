import * as settlementQueries from '@/api/queries/settlementQueries';
import * as recoveryQueries from '@/api/queries/recoveryQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import type { SettlementParams, SettlementUpdateParams } from '@/schemas/settlementSchemas';
import { logAdminAction, logAdminActions, AdminAction } from '@/api/utils/adminActionLogger';
import { EntityName } from '@/api/utils/activityLogger';

// =====================================================================
// SETTLEMENT CONTROLLERS
// =====================================================================

/**
 * Create a settlement (demand sent to adverse carrier).
 *
 * @param ctx - request context
 * @param input - claim id and settlement parameters
 * @returns the newly created settlement
 */
export async function createSettlement(
	ctx: ProtectedContext,
	{
		claimId,
		params,
	}: {
		claimId: number;
		params: SettlementParams;
	}
) {
	// Create settlement and log admin action within transaction
	const created = await ctx.db.transaction().execute(async (trx) => {
		const settlement = await settlementQueries.createSettlement({ ...ctx, db: trx }, claimId, params);

		// Log settlement creation
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: settlement.id,
			entityName: EntityName.SETTLEMENT,
			action: AdminAction.CREATE,
			value: {
				claimId,
				claim_party_id: settlement.claim_party_id,
				coverage_id: settlement.coverage_id,
				demand_amount: settlement.demand_amount,
				demand_date: settlement.demand_date,
				status: settlement.status,
			},
		});

		return settlement;
	});

	return created;
}

/**
 * Get a single settlement by ID with related party and coverage info.
 *
 * @param ctx - request context
 * @param input - settlement id
 * @returns settlement with party and coverage details
 */
export async function getSettlement(
	ctx: ProtectedContext,
	{ settlementId }: { settlementId: number }
) {
	return await settlementQueries.getSettlement(ctx, settlementId);
}

/**
 * List settlements for a claim.
 *
 * @param ctx - request context
 * @param input - claim id
 * @returns list of settlements with party and coverage details
 */
export async function listSettlements(
	ctx: ProtectedContext,
	{ claimId }: { claimId: number }
) {
	return await settlementQueries.getSettlementsByClaimId(ctx, claimId);
}

/**
 * Get settlements for dropdown selection (simplified list for forms).
 *
 * @param ctx - request context
 * @param input - claim id
 * @returns list of settlements with minimal info for dropdown
 */
export async function getSettlementsForDropdown(
	ctx: ProtectedContext,
	{ claimId }: { claimId: number }
) {
	return await settlementQueries.getSettlementsForDropdown(ctx, claimId);
}

/**
 * Update a settlement.
 *
 * @param ctx - request context
 * @param input - settlement id and update parameters
 * @returns the updated settlement
 */
export async function updateSettlement(
	ctx: ProtectedContext,
	{
		settlementId,
		params,
	}: {
		settlementId: number;
		params: SettlementUpdateParams;
	}
) {
	// Update settlement and log admin action within transaction
	const updated = await ctx.db.transaction().execute(async (trx) => {
		const settlement = await settlementQueries.updateSettlement({ ...ctx, db: trx }, settlementId, params);

		// Log settlement update
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: settlement.id,
			entityName: EntityName.SETTLEMENT,
			action: AdminAction.UPDATE,
			value: params,
		});

		return settlement;
	});

	return updated;
}

/**
 * Archive (soft delete) a settlement and its associated recovery events.
 * Uses bulk operations and bulk logging - no loops.
 *
 * @param ctx - request context
 * @param input - settlement id and claim id
 */
export async function deleteSettlement(
	ctx: ProtectedContext,
	{
		settlementId,
		claimId,
	}: {
		settlementId: number;
		claimId: number;
	}
) {
	await ctx.db.transaction().execute(async (trx) => {
		const trxCtx = { ...ctx, db: trx };

		// Bulk archive recovery events - returns all archived data via RETURNING, updates claim.actual_recovery
		const archivedEvents = await recoveryQueries.archiveRecoveryEventsForSettlement(trxCtx, settlementId, claimId);

		// Archive settlement - returns all fields via RETURNING
		const archivedSettlement = await settlementQueries.archiveSettlement(trxCtx, settlementId, claimId);

		// Calculate total for settlement log
		const totalRecoveryDeducted = archivedEvents.reduce(
			(sum, event) => sum + parseFloat(event.recovery_amount),
			0
		);

		// Bulk log recovery event deletions (if any)
		if (archivedEvents.length > 0) {
			await logAdminActions(trxCtx, archivedEvents.map(event => ({
				entityId: event.id,
				entityName: EntityName.RECOVERY_EVENT,
				action: AdminAction.DELETE,
				value: {
					claimId: event.claim_id,
					settlementId,
					recovery_amount: event.recovery_amount,
					recovery_date: event.recovery_date,
					recovery_source: event.recovery_source,
					reason: 'Cascade from settlement archive',
				},
			})));
		}

		// Log settlement archive
		await logAdminAction(trxCtx, {
			entityId: archivedSettlement.id,
			entityName: EntityName.SETTLEMENT,
			action: AdminAction.DELETE,
			value: {
				claimId: archivedSettlement.claim_id,
				claim_party_id: archivedSettlement.claim_party_id,
				coverage_id: archivedSettlement.coverage_id,
				demand_amount: archivedSettlement.demand_amount,
				demand_date: archivedSettlement.demand_date,
				status: archivedSettlement.status,
				cascaded_recovery_events: archivedEvents.length,
				total_recovery_deducted: totalRecoveryDeducted,
			},
		});
	});
}
