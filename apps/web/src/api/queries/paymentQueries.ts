import { sql, Transaction } from 'kysely';
import { ProtectedContext } from '@/server/trpc/trpc';
import { PaymentParams, PaymentUpdateParams } from '@/schemas/paymentSchemas';
import { DB } from '@/api/database/types.d';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// =====================================================================
// CLAIM PAYMENT QUERIES
// =====================================================================

/**
 * Create a payment for a claim and recalculate claim_amount.
 * NOTE: This function expects to be called within a transaction from the controller.
 *
 * @param ctx - request context (should have transaction as db)
 * @param claimId - claim identifier
 * @param params - payment parameters
 * @returns created payment
 */
export async function createPayment(ctx: ProtectedContext, claimId: number, params: PaymentParams) {
	const clientId = ctx.session.user.client_id!;

	const payment = await ctx.db
		.insertInto('claim_payment')
		.values({
			claim_id: claimId,
			client_id: clientId,
			coverage_id: params.coverage_id,
			// Format as YYYY-MM-DD string to avoid timezone conversion
			payment_date: dayjs.utc(params.payment_date).format('YYYY-MM-DD'),
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

	// Recalculate claim_amount
	await recalculateClaimAmount(ctx.db, claimId, clientId);

	return payment;
}

/**
 * List payments for a claim with coverage and payee info.
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @returns list of payments with coverage and payee details
 */
export async function getPayments(ctx: ProtectedContext, claimId: number) {
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
			'claim_coverage.coverage_type',
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
	paymentId: number,
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
		updateValues.payment_date = dayjs.utc(params.payment_date).format('YYYY-MM-DD');
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

	// Recalculate claim_amount if amount or subrogable flag changed
	const amountChanged =
		params.payment_amount !== undefined &&
		params.payment_amount.toString() !== existing.payment_amount?.toString();
	const subrogableChanged =
		params.is_subrogable !== undefined && params.is_subrogable !== existing.is_subrogable;

	if (amountChanged || subrogableChanged) {
		await recalculateClaimAmount(ctx.db, existing.claim_id, clientId);
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
export async function getPaymentForArchive(ctx: ProtectedContext, paymentId: number) {
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
 * Soft delete (archive) a payment and recalculate claim_amount.
 * NOTE: This function expects to be called within a transaction from the controller.
 *
 * @param ctx - request context (should have transaction as db)
 * @param paymentId - payment identifier
 * @param claimId - claim identifier (for verification)
 * @returns archived payment
 */
export async function archivePayment(ctx: ProtectedContext, paymentId: number, claimId: number) {
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

	// Recalculate claim_amount
	await recalculateClaimAmount(ctx.db, claimId, clientId);

	return archived;
}

/**
 * Recalculate claim_amount as the sum of subrogable payments.
 *
 * @param db - database connection or transaction
 * @param claimId - claim identifier
 * @param clientId - client identifier
 */
async function recalculateClaimAmount(
	db: ProtectedContext['db'] | Transaction<DB>,
	claimId: number,
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
