import { z } from 'zod';
import { ClaimSearch, LineOfBusiness, LossType, RecoveryStatus } from '@/config/enums';
import { parseDate, parseNumber } from '@/lib/parsers/zodParsers';

export const assignClaimInput = z.object({
	checklistId: z.number().int(),
	claimId: z.number().int(),
	assignee: z.string(),
});

export const getClaimInput = z.object({
	checklistId: z.number().int().optional(),
	claimId: z.number().int(),
});
export type GetClaimInput = z.infer<typeof getClaimInput>;

export const getClaimDetailInput = z.object({
	claimId: z.number().int(),
});
export type GetClaimDetailInput = z.infer<typeof getClaimDetailInput>;

export const getNextClaimToAssignInput = z.object({
	feedId: z.number().int(),
	offset: z.number().int().optional(),
});

export const getClaimsInput = z.object({
	feedId: z.number().nullable().optional(),
	searchTerm: z
		.object({
			value: z.string(),
			type: z.nativeEnum(ClaimSearch),
		})
		.optional(),
	line_of_business: z.nativeEnum(LineOfBusiness).optional(),
	loss_type: z.nativeEnum(LossType).optional(),
	recovery_status: z.nativeEnum(RecoveryStatus).optional(),
	insured: z.string().optional(),
	client: z.string().optional(),
	limit: z.number().optional(),
	offset: z.number().optional(),
});
export type GetClaimsInput = z.infer<typeof getClaimsInput>;

export const getClaimCountInput = z.object({ clientId: z.string().optional() });

export const createClaimInput = z.object({
	claims: z.array(
		z.object({
			claim_number: z.string().nullable(),
			client: z.string().nullable(),
			client_adjuster: z.string().nullable(),
			insured: z.string().nullable(),
			claim_amount: z.union([parseNumber(), z.number()]).nullable(),
			total_incurred: z.union([parseNumber(), z.number()]).nullable(),
			date_of_loss: parseDate().nullable(),
			loss_location: z.string().nullable(),
			last_updated_by: z.string().nullable(),
			last_update: parseDate().nullable(),
			reserved_recovery: z.union([parseNumber(), z.number()]).nullable(), // Client's expected recovery (from feed/manual)
			paid_recovery: z.union([parseNumber(), z.number()]).nullable(), // Client's reported paid amount (from feed/manual)
			line_of_business: z.nativeEnum(LineOfBusiness),
			loss_type: z.nativeEnum(LossType),
		})
	),
	party_id: z.number().int().nullable().optional(),
	representative_id: z.number().int().nullable().optional(),
});

export const updateClaimInput = z.object({
	claimId: z.number().int(),
	claim_number: z.string().nullable().optional(),
	client: z.string().nullable().optional(),
	client_adjuster: z.string().nullable().optional(),
	insured: z.string().nullable().optional(),
	claim_amount: z.number().nullable().optional(),
	total_incurred: z.number().nullable().optional(),
	date_of_loss: parseDate().nullable().optional(),
	loss_location: z.string().nullable().optional(),
	reserved_recovery: z.number().nullable().optional(), // Client's expected recovery (from feed/manual)
	paid_recovery: z.number().nullable().optional(), // Client's reported paid amount (from feed/manual)
	expected_recovery: z.number().nullable().optional(), // Team's forecasted recovery (manual, eventually auto-calculated)
	line_of_business: z.nativeEnum(LineOfBusiness).optional(),
	loss_type: z.nativeEnum(LossType).optional(),
	recovery_status: z.nativeEnum(RecoveryStatus).optional(),
	substatus: z.string().optional(),
	party_id: z.number().int().nullable().optional(),
	representative_id: z.number().int().nullable().optional(),
});
export type UpdateClaimInput = z.infer<typeof updateClaimInput>;

// Recovery tracking schemas
export const updateClaimRecoveryInput = z.object({
	claimId: z.number().int(),
	recovery_status: z.nativeEnum(RecoveryStatus).optional(),
	// actual_recovery is calculated from recovery_event records, not set directly
});
