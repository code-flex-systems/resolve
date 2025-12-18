import { z } from 'zod';
import { parseDate, parseNumber } from '@/lib/parsers/zodParsers';
import { SettlementStatus } from '@/config/enums';

// =====================================================================
// SETTLEMENT SCHEMAS
// =====================================================================

export const settlementParams = z
	.object({
		claim_party_id: z.number().int(),
		coverage_id: z.number().int(),
		demand_amount: parseNumber(),
		demand_date: parseDate(),
		agreed_liability_percentage: parseNumber().nullable().optional(),
		settlement_amount: parseNumber().nullable().optional(),
		settlement_date: parseDate().nullable().optional(),
		status: z.nativeEnum(SettlementStatus).optional(),
		notes: z.string().nullable().optional(),
	})
	.strict();

export type SettlementParams = z.infer<typeof settlementParams>;

export const settlementUpdateParams = settlementParams.partial();

export type SettlementUpdateParams = z.infer<typeof settlementUpdateParams>;

export const createSettlementInput = z.object({
	claimId: z.number().int(),
	params: settlementParams,
});

export const updateSettlementInput = z.object({
	settlementId: z.number().int(),
	params: settlementUpdateParams,
});

export const deleteSettlementInput = z.object({
	settlementId: z.number().int(),
	claimId: z.number().int(),
});

export const listSettlementsInput = z.object({
	claimId: z.number().int(),
});

export const getSettlementInput = z.object({
	settlementId: z.number().int(),
});
