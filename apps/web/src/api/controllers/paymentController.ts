import * as paymentQueries from '@/api/queries/paymentQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import type { PaymentParams, PaymentUpdateParams } from '@/schemas/paymentSchemas';
import { logAdminAction, AdminAction, EntityName } from '@/api/utils/adminActionLogger';

// =====================================================================
// CLAIM PAYMENT CONTROLLERS
// =====================================================================

/**
 * Create a payment on a claim.
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
		claimId: number;
		params: PaymentParams;
	}
) {
	// Create payment and log admin action within transaction
	const created = await ctx.db.transaction().execute(async (trx) => {
		const payment = await paymentQueries.createPayment({ ...ctx, db: trx }, claimId, params);

		// Log payment creation
		await logAdminAction({ ...ctx, db: trx }, {
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
		});

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
export async function listPayments(
	ctx: ProtectedContext,
	{ claimId }: { claimId: number }
) {
	return await paymentQueries.getPayments(ctx, claimId);
}

/**
 * Update a payment.
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
		paymentId: number;
		params: PaymentUpdateParams;
	}
) {
	// Update payment and log admin action within transaction
	const updated = await ctx.db.transaction().execute(async (trx) => {
		const payment = await paymentQueries.updatePayment({ ...ctx, db: trx }, paymentId, params);

		// Log payment update
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: payment.id,
			entityName: EntityName.CLAIM_PAYMENT,
			action: AdminAction.UPDATE,
			value: params,
		});

		return payment;
	});

	return updated;
}

/**
 * Archive (soft delete) a payment.
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
		paymentId: number;
		claimId: number;
	}
) {
	// Archive payment and log admin action within transaction
	await ctx.db.transaction().execute(async (trx) => {
		// Fetch payment data BEFORE archiving for logging
		const payment = await paymentQueries.getPaymentForArchive({ ...ctx, db: trx }, paymentId);

		// Archive the payment
		await paymentQueries.archivePayment({ ...ctx, db: trx }, paymentId, claimId);

		// Log admin action for payment archive
		if (payment) {
			await logAdminAction({ ...ctx, db: trx }, {
				entityId: paymentId,
				entityName: EntityName.CLAIM_PAYMENT,
				action: AdminAction.DELETE,
				value: {
					claimId: payment.claim_id,
					coverage_id: payment.coverage_id,
					payment_date: payment.payment_date,
					payment_amount: payment.payment_amount,
					is_subrogable: payment.is_subrogable,
					is_expense: payment.is_expense,
				},
			});
		}
	});
}
