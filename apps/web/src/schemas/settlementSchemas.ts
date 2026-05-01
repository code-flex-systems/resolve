import { z } from 'zod';
import { parseDate, parseNumber } from '@/lib/parsers/zodParsers';
import { SettlementStatus, SettlementStructure, PaymentFrequency } from '@/config/enums';

// =====================================================================
// SETTLEMENT SCHEMAS
// =====================================================================

// Base object schema (without refinements) for reuse
const settlementParamsBase = z.object({
	claim_party_id: z.string().uuid(),
	coverage_id: z.string().uuid(),
	demand_amount: parseNumber(),
	demand_date: parseDate(),
	agreed_liability_percentage: parseNumber().nullable().optional(),
	settlement_amount: parseNumber().nullable().optional(),
	settlement_date: parseDate().nullable().optional(),
	status: z.nativeEnum(SettlementStatus).optional(),
	notes: z.string().nullable().optional(),
	// New fields
	adverse_party_reference: z.string().max(255).nullable().optional(),
	settlement_structure: z.nativeEnum(SettlementStructure).nullable().optional(),
	payment_amount: parseNumber().nullable().optional(),
	payment_frequency: z.nativeEnum(PaymentFrequency).nullable().optional(),
	settled_by: z.string().uuid().nullable().optional(),
	is_drop_check: z.boolean().nullable().optional(),
});

// Refinement for payment plan validation
const paymentPlanRefinement = (data: {
	settlement_structure?: string | null;
	payment_amount?: number | null;
	payment_frequency?: string | null;
}) => {
	// If settlement_structure is payment_plan, payment_amount and payment_frequency are required
	if (data.settlement_structure === SettlementStructure.PAYMENT_PLAN) {
		return (
			data.payment_amount !== null &&
			data.payment_amount !== undefined &&
			data.payment_frequency !== null &&
			data.payment_frequency !== undefined
		);
	}
	return true;
};

// Refinement for mutual exclusivity of settled_by and is_drop_check
const settledByRefinement = (data: {
	settled_by?: string | null;
	is_drop_check?: boolean | null;
}) => {
	// settled_by and is_drop_check are mutually exclusive
	if (data.settled_by && data.is_drop_check) {
		return false;
	}
	return true;
};

export const settlementParams = settlementParamsBase
	.strict()
	.refine(paymentPlanRefinement, {
		message: 'Payment amount and frequency are required for payment plan settlements',
	})
	.refine(settledByRefinement, { message: 'Cannot set both settled_by and is_drop_check' });

export type SettlementParams = z.infer<typeof settlementParams>;

// For updates, use partial base and apply same refinements
export const settlementUpdateParams = settlementParamsBase
	.partial()
	.refine(paymentPlanRefinement, {
		message: 'Payment amount and frequency are required for payment plan settlements',
	})
	.refine(settledByRefinement, { message: 'Cannot set both settled_by and is_drop_check' });

export type SettlementUpdateParams = z.infer<typeof settlementUpdateParams>;

export const createSettlementInput = z.object({
	claimId: z.string().uuid(),
	params: settlementParams,
});

export const updateSettlementInput = z.object({
	settlementId: z.string().uuid(),
	params: settlementUpdateParams,
});

export const deleteSettlementInput = z.object({
	settlementId: z.string().uuid(),
	claimId: z.string().uuid(),
});

export const listSettlementsInput = z.object({
	claimId: z.string().uuid(),
});

export const getSettlementInput = z.object({
	settlementId: z.string().uuid(),
});
