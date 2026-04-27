import * as paymentQueries from '@/api/queries/paymentQueries';
import { recalculateClaimExpectedRecovery } from '@/api/queries/claimQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import type { PaymentParams, PaymentUpdateParams } from '@/schemas/paymentSchemas';
import { logAdminAction, AdminAction } from '@/api/utils/adminActionLogger';
import { EntityName } from '../utils/activityLogger';

// =====================================================================
// CLAIM PAYMENT CONTROLLERS
// =====================================================================

/**
 * Create a payment on a claim.
 * Recalculates expected_recovery if payment is subrogable (affects claim_amount).
 *
 * @param ctx - request context
 * @param input - claim id and payment parameters
 * @returns the newly created payment
 */
export async function createPayment(
	ctx: ProtectedContext,
	{
		claimId,
		params,
	}: {
		claimId: string;
		params: PaymentParams;
	}
) {
	// Create payment and log admin action within transaction
	const created = await ctx.db.transaction().execute(async (trx) => {
		const payment = await paymentQueries.createPayment({ ...ctx, db: trx }, claimId, params);

		// Log payment creation
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: payment.id,
				entityName: EntityName.CLAIM_PAYMENT,
				action: AdminAction.CREATE,
				value: {
					claimId,
					coverage_id: payment.coverage_id,
					payment_date: payment.payment_date,
					payment_amount: payment.payment_amount,
					is_subrogable: payment.is_subrogable,
					is_expense: payment.is_expense,
				},
			}
		);

		// Recalculate expected_recovery if this is a subrogable payment (affects claim_amount)
		if (params.is_subrogable) {
			await recalculateClaimExpectedRecovery({ ...ctx, db: trx }, claimId);
		}

		return payment;
	});

	return created;
}

/**
 * List payments for a claim.
 *
 * @param ctx - request context
 * @param input - claim id
 * @returns list of payments with coverage and payee details
 */
export async function listPayments(ctx: ProtectedContext, { claimId }: { claimId: string }) {
	return await paymentQueries.getPayments(ctx, claimId);
}

/**
 * Update a payment.
 * Always recalculates expected_recovery since amount or is_subrogable flag may have changed.
 *
 * @param ctx - request context
 * @param input - payment id and update parameters
 * @returns the updated payment
 */
export async function updatePayment(
	ctx: ProtectedContext,
	{
		paymentId,
		params,
	}: {
		paymentId: string;
		params: PaymentUpdateParams;
	}
) {
	// Update payment and log admin action within transaction
	const updated = await ctx.db.transaction().execute(async (trx) => {
		const payment = await paymentQueries.updatePayment({ ...ctx, db: trx }, paymentId, params);

		// Log payment update
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: payment.id,
				entityName: EntityName.CLAIM_PAYMENT,
				action: AdminAction.UPDATE,
				value: params,
			}
		);

		// Only recalculate expected_recovery if payment_amount or is_subrogable changed
		if (params.payment_amount !== undefined || params.is_subrogable !== undefined) {
			await recalculateClaimExpectedRecovery({ ...ctx, db: trx }, payment.claim_id);
		}

		return payment;
	});

	return updated;
}

/**
 * Archive (soft delete) a payment.
 * Recalculates expected_recovery if payment was subrogable (affects claim_amount).
 *
 * @param ctx - request context
 * @param input - payment id and claim id
 */
export async function archivePayment(
	ctx: ProtectedContext,
	{
		paymentId,
		claimId,
	}: {
		paymentId: string;
		claimId: string;
	}
) {
	// Archive payment and log admin action within transaction
	await ctx.db.transaction().execute(async (trx) => {
		// Archive the payment (uses RETURNING to get all fields for logging)
		const archived = await paymentQueries.archivePayment({ ...ctx, db: trx }, paymentId, claimId);

		// Log admin action for payment archive
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: paymentId,
				entityName: EntityName.CLAIM_PAYMENT,
				action: AdminAction.DELETE,
				value: {
					claimId: archived.claim_id,
					coverage_id: archived.coverage_id,
					payment_date: archived.payment_date,
					payment_amount: archived.payment_amount,
					is_subrogable: archived.is_subrogable,
					is_expense: archived.is_expense,
				},
			}
		);

		// Recalculate expected_recovery if this was a subrogable payment (affects claim_amount)
		if (archived.is_subrogable) {
			await recalculateClaimExpectedRecovery({ ...ctx, db: trx }, claimId);
		}
	});
}
