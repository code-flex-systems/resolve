import { z } from 'zod';
import { ClaimSearch, ClaimStatus, RecoveryStatus } from '@/config/enums';
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
	line_of_business: z.string().optional(),
	loss_type: z.string().optional(),
	recovery_status: z.nativeEnum(RecoveryStatus).optional(),
	insured: z.string().optional(),
	client: z.string().optional(),
	limit: z.number().optional(),
	offset: z.number().optional(),
});
export type GetClaimsInput = z.infer<typeof getClaimsInput>;

export const getClaimCountInput = z.object({ clientId: z.string().optional() });

// Schema for individual claim data when creating
// Note: loss_type is no longer on the claim table - it's set per claim_liability
// Note: total_incurred is now calculated from claim_coverage.amount_reserved
export const claimDataSchema = z.object({
	claim_number: z.string().nullable(),
	client: z.string().nullable(),
	client_adjuster: z.string().nullable(),
	insured: z.string().nullable(),
	claim_amount: z.union([parseNumber(), z.number()]).nullable(),
	date_of_loss: parseDate().nullable(),
	loss_location: z.string().nullable(),
	last_updated_by: z.string().nullable(),
	last_update: parseDate().nullable(),
});
export type ClaimData = z.infer<typeof claimDataSchema>;

export const createClaimInput = z.object({
	claims: z.array(claimDataSchema),
	party_id: z.number().int().nullable().optional(),
	representative_id: z.number().int().nullable().optional(),
	role: z.string().nullable().optional(),
});
export type CreateClaimInput = z.infer<typeof createClaimInput>;

// Note: loss_type is no longer on the claim table - it's set per claim_liability
// Note: total_incurred is calculated from claim_coverage.amount_reserved
// Note: expected_recovery is calculated from liability percentages and amount_paid
export const updateClaimInput = z.object({
	claimId: z.number().int(),
	claim_number: z.string().nullable().optional(),
	client: z.string().nullable().optional(),
	client_adjuster: z.string().nullable().optional(),
	insured: z.string().nullable().optional(),
	claim_amount: z.number().nullable().optional(),
	date_of_loss: parseDate().nullable().optional(),
	loss_location: z.string().nullable().optional(),
	recovery_status: z.nativeEnum(RecoveryStatus).optional(),
	substatus: z.string().optional(),
	party_id: z.number().int().nullable().optional(),
	representative_id: z.number().int().nullable().optional(),
	role: z.string().nullable().optional(),
});
export type UpdateClaimInput = z.infer<typeof updateClaimInput>;

// Recovery tracking schemas
export const updateClaimRecoveryInput = z.object({
	claimId: z.number().int(),
	recovery_status: z.nativeEnum(RecoveryStatus).optional(),
	// actual_recovery is calculated from recovery_event records, not set directly
});

// My Claims list with filters and metrics
export const listMyClaimsInput = z.object({
	searchTerm: z.string().optional(),
	claimStatus: z.nativeEnum(ClaimStatus).optional(),
	recoveryStatus: z.nativeEnum(RecoveryStatus).optional(),
	limit: z.number().int().positive().optional(),
	offset: z.number().int().nonnegative().optional(),
	sortField: z.string().optional(),
	sortOrder: z.enum(['asc', 'desc']).optional(),
});
export type ListMyClaimsInput = z.infer<typeof listMyClaimsInput>;

// My Desk Claims list (desk hierarchy feature)
export const listMyDeskClaimsInput = z.object({
	searchTerm: z.string().optional(),
	claimStatus: z.nativeEnum(ClaimStatus).optional(),
	recoveryStatus: z.nativeEnum(RecoveryStatus).optional(),
	limit: z.number().int().positive().optional(),
	offset: z.number().int().nonnegative().optional(),
});
export type ListMyDeskClaimsInput = z.infer<typeof listMyDeskClaimsInput>;
