import { sql, Transaction } from 'kysely';
import { ProtectedContext } from '@/server/trpc/trpc';
import { PaymentParams, PaymentUpdateParams } from '@/schemas/paymentSchemas';
import { DB } from '@/api/database/types.d';
import { formatDateForDB } from '@/api/utils/dateUtils';

// =====================================================================
// CLAIM PAYMENT QUERIES
// =====================================================================

/**
 * Create a payment for a claim and update claim_amount using delta increment.
 * NOTE: This function expects to be called within a transaction from the controller.
 *
 * @param ctx - request context (should have transaction as db)
 * @param claimId - claim identifier
 * @param params - payment parameters
 * @returns created payment
 */
export async function createPayment(ctx: ProtectedContext, claimId: string, params: PaymentParams) {
	const clientId = ctx.session.user.client_id!;

	const payment = await ctx.db
		.insertInto('claim_payment')
		.values({
			claim_id: claimId,
			client_id: clientId,
			coverage_id: params.coverage_id,
			// Format as YYYY-MM-DD string to avoid timezone conversion
			payment_date: formatDateForDB(params.payment_date),
			payment_amount: params.payment_amount.toString(),
			is_subrogable: params.is_subrogable,
			is_expense: params.is_expense,
			created_by: ctx.session.user.id,
			created_at: sql`now()`,
			...(params.payee_claim_party_id && {
				payee_claim_party_id: params.payee_claim_party_id,
			}),
			...(params.description && { description: params.description }),
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	// Update claim.claim_amount using delta increment (only if is_subrogable)
	if (params.is_subrogable) {
		const amount = params.payment_amount;

		await ctx.db
			.updateTable('claim')
			.set({
				// Use ::numeric casting to preserve precision in PostgreSQL, avoiding JavaScript float arithmetic
				claim_amount: sql`COALESCE(claim_amount::numeric, 0) + ${amount}::numeric`,
			})
			.where('id', '=', claimId)
			.where('client_id', '=', clientId)
			.execute();
	}

	return payment;
}

/**
 * List payments for a claim with coverage and payee info.
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @returns list of payments with coverage and payee details
 */
export async function getPayments(ctx: ProtectedContext, claimId: string) {
	return await ctx.db
		.selectFrom('claim_payment')
		.innerJoin('claim_coverage', 'claim_payment.coverage_id', 'claim_coverage.id')
		.leftJoin('claim_party', 'claim_payment.payee_claim_party_id', 'claim_party.id')
		.leftJoin('party', 'claim_party.party_id', 'party.id')
		.select([
			'claim_payment.id',
			'claim_payment.claim_id',
			'claim_payment.coverage_id',
			'claim_payment.payment_date',
			'claim_payment.payment_amount',
			'claim_payment.is_subrogable',
			'claim_payment.is_expense',
			'claim_payment.payee_claim_party_id',
			'claim_payment.description',
			'claim_payment.external_reference',
			'claim_payment.feed_id',
			'claim_payment.payment_code',
			'claim_payment.manually_overridden',
			'claim_payment.created_by',
			'claim_payment.created_at',
			'claim_payment.updated_by',
			'claim_payment.updated_at',
			'claim_coverage.loss_type',
		])
		.select((eb) => eb.ref('party.name').as('payee_name'))
		.where('claim_payment.claim_id', '=', claimId)
		.where('claim_payment.client_id', '=', ctx.session.user.client_id)
		.where('claim_payment.deleted_at', 'is', null)
		.orderBy('claim_payment.payment_date', 'desc')
		.orderBy('claim_payment.created_at', 'desc')
		.execute();
}

/**
 * Update a payment and recalculate claim_amount if amount changed.
 * NOTE: This function expects to be called within a transaction from the controller.
 *
 * @param ctx - request context (should have transaction as db)
 * @param paymentId - payment identifier
 * @param params - fields to update
 * @returns updated payment
 */
export async function updatePayment(
	ctx: ProtectedContext,
	paymentId: string,
	params: PaymentUpdateParams
) {
	const clientId = ctx.session.user.client_id!;

	// First get the existing payment to find the claim_id
	const existing = await ctx.db
		.selectFrom('claim_payment')
		.select(['id', 'claim_id', 'payment_amount', 'is_subrogable'])
		.where('claim_payment.id', '=', paymentId)
		.where('claim_payment.client_id', '=', clientId)
		.where('claim_payment.deleted_at', 'is', null)
		.executeTakeFirst();

	if (!existing) {
		throw new Error('Payment not found');
	}

	// Build update values object
	const updateValues: Record<string, unknown> = {
		updated_by: ctx.session.user.id,
		updated_at: sql`now()`,
	};

	if (params.coverage_id !== undefined) {
		updateValues.coverage_id = params.coverage_id;
	}
	if (params.payment_date !== undefined) {
		updateValues.payment_date = formatDateForDB(params.payment_date);
	}
	if (params.payment_amount !== undefined) {
		updateValues.payment_amount = params.payment_amount.toString();
	}
	if (params.is_subrogable !== undefined) {
		updateValues.is_subrogable = params.is_subrogable;
	}
	if (params.is_expense !== undefined) {
		updateValues.is_expense = params.is_expense;
	}
	if (params.payee_claim_party_id !== undefined) {
		updateValues.payee_claim_party_id = params.payee_claim_party_id;
	}
	if (params.description !== undefined) {
		updateValues.description = params.description;
	}

	const updated = await ctx.db
		.updateTable('claim_payment')
		.set(updateValues)
		.where('claim_payment.id', '=', paymentId)
		.where('claim_payment.client_id', '=', clientId)
		.where('claim_payment.deleted_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();

	// Update claim.claim_amount using delta increment if amount or subrogable flag changed
	const oldIsSubrogable = existing.is_subrogable;
	const oldAmount = existing.payment_amount;
	const newIsSubrogable = params.is_subrogable !== undefined ? params.is_subrogable : oldIsSubrogable;
	const newAmount = params.payment_amount !== undefined ? params.payment_amount : oldAmount;

	// Check if contribution to claim_amount changed (only subrogable payments count)
	// Need to check for changes to avoid unnecessary queries
	const contributionChanged =
		(oldIsSubrogable !== newIsSubrogable) ||
		(newIsSubrogable && oldAmount !== newAmount);

	if (contributionChanged) {
		await ctx.db
			.updateTable('claim')
			.set({
				// Use ::numeric casting and CASE to preserve precision in PostgreSQL, avoiding JavaScript float arithmetic
				// Only subrogable payments contribute to claim_amount
				claim_amount: sql`COALESCE(claim_amount::numeric, 0)
					+ (CASE WHEN ${newIsSubrogable} THEN ${newAmount}::numeric ELSE 0 END)
					- (CASE WHEN ${oldIsSubrogable} THEN ${oldAmount}::numeric ELSE 0 END)`,
			})
			.where('id', '=', existing.claim_id)
			.where('client_id', '=', clientId)
			.execute();
	}

	return updated;
}

/**
 * Get payment for archive (for logging purposes).
 *
 * @param ctx - request context
 * @param paymentId - payment identifier
 * @returns payment fields for logging
 */
export async function getPaymentForArchive(ctx: ProtectedContext, paymentId: string) {
	return await ctx.db
		.selectFrom('claim_payment')
		.select([
			'id',
			'claim_id',
			'coverage_id',
			'payment_date',
			'payment_amount',
			'is_subrogable',
			'is_expense',
			'payee_claim_party_id',
		])
		.where('claim_payment.id', '=', paymentId)
		.where('claim_payment.client_id', '=', ctx.session.user.client_id)
		.where('claim_payment.deleted_at', 'is', null)
		.executeTakeFirst();
}

/**
 * Soft delete (archive) a payment and update claim_amount using delta decrement.
 * NOTE: This function expects to be called within a transaction from the controller.
 *
 * @param ctx - request context (should have transaction as db)
 * @param paymentId - payment identifier
 * @param claimId - claim identifier (for verification)
 * @returns archived payment
 */
export async function archivePayment(ctx: ProtectedContext, paymentId: string, claimId: string) {
	const clientId = ctx.session.user.client_id!;

	const archived = await ctx.db
		.updateTable('claim_payment')
		.set({
			deleted_at: sql`now()`,
			deleted_by: ctx.session.user.id,
		})
		.where('claim_payment.id', '=', paymentId)
		.where('claim_payment.claim_id', '=', claimId)
		.where('claim_payment.client_id', '=', clientId)
		.where('claim_payment.deleted_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();

	// Update claim.claim_amount using delta decrement (only if was subrogable)
	if (archived.is_subrogable) {
		const amount = archived.payment_amount;

		await ctx.db
			.updateTable('claim')
			.set({
				// Use ::numeric casting to preserve precision in PostgreSQL, avoiding JavaScript float arithmetic
				claim_amount: sql`COALESCE(claim_amount::numeric, 0) - ${amount}::numeric`,
			})
			.where('id', '=', claimId)
			.where('client_id', '=', clientId)
			.execute();
	}

	return archived;
}

/**
 * Manually recalculate claim's claim_amount by summing all subrogable payments.
 * This is kept for data recovery/correction scenarios - normal operations use delta updates.
 *
 * IMPORTANT: Normal payment operations (create/update/archive) use delta increments for performance.
 * Only use this function for:
 * - Manual data correction
 * - Data integrity verification
 * - Recovery from corrupted state
 *
 * @param db - database connection or transaction
 * @param claimId - claim identifier
 * @param clientId - client identifier
 */
export async function recalculateClaimAmount(
	db: ProtectedContext['db'] | Transaction<DB>,
	claimId: string,
	clientId: string
) {
	// Sum all subrogable payments for this claim (excluding soft-deleted)
	const result = await db
		.selectFrom('claim_payment')
		.select((eb) => eb.fn.sum('payment_amount').as('total'))
		.where('claim_payment.claim_id', '=', claimId)
		.where('claim_payment.client_id', '=', clientId)
		.where('claim_payment.is_subrogable', '=', true)
		.where('claim_payment.deleted_at', 'is', null)
		.executeTakeFirst();

	const totalAmount = result?.total ? result.total.toString() : null;

	// Update claim's claim_amount
	await db
		.updateTable('claim')
		.set({
			claim_amount: totalAmount,
		})
		.where('claim.id', '=', claimId)
		.where('claim.client_id', '=', clientId)
		.execute();
}
