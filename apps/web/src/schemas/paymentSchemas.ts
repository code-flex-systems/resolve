import { z } from 'zod';
import { parseDate, parseNumber } from '@/lib/parsers/zodParsers';

// =====================================================================
// CLAIM PAYMENT SCHEMAS
// =====================================================================

export const paymentParams = z
	.object({
		coverage_id: z.string().uuid(),
		payment_date: parseDate(),
		payment_amount: parseNumber(), // Allow negative for credits/reversals
		is_subrogable: z.boolean(),
		is_expense: z.boolean(),
		payee_claim_party_id: z.string().uuid().nullable().optional(),
		description: z.string().nullable().optional(),
	})
	.strict();

export type PaymentParams = z.infer<typeof paymentParams>;

export const paymentUpdateParams = paymentParams.partial();

export type PaymentUpdateParams = z.infer<typeof paymentUpdateParams>;

export const createPaymentInput = z.object({
	claimId: z.string().uuid(),
	params: paymentParams,
});

export const updatePaymentInput = z.object({
	paymentId: z.string().uuid(),
	params: paymentUpdateParams,
});

export const archivePaymentInput = z.object({
	paymentId: z.string().uuid(),
	claimId: z.string().uuid(),
});

export const listPaymentsInput = z.object({
	claimId: z.string().uuid(),
});
