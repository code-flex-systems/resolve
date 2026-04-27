import { z } from 'zod';
import { ClaimSearch, ClaimStatus, ClaimSubstatus, RecoveryStatus } from '@/config/enums';
import { parseDate, parseNumber } from '@/lib/parsers/zodParsers';
import { lossAddressSchema } from './addressSchemas';

export const assignClaimInput = z.object({
	checklistId: z.string().uuid(),
	claimId: z.string().uuid(),
	assignee: z.string(),
});

export const getClaimInput = z.object({
	checklistId: z.string().uuid().optional(),
	claimId: z.string().uuid(),
});
export type GetClaimInput = z.infer<typeof getClaimInput>;

export const getClaimDetailInput = z.object({
	claimId: z.string().uuid(),
});
export type GetClaimDetailInput = z.infer<typeof getClaimDetailInput>;

export const getNextClaimToAssignInput = z.object({
	feedId: z.string().uuid(),
	offset: z.number().int().optional(),
});

export const getClaimsInput = z.object({
	feedId: z.string().uuid().nullable().optional(),
	searchTerm: z
		.object({
			value: z.string(),
			type: z.nativeEnum(ClaimSearch),
		})
		.optional(),
	line_of_business: z.string().optional(),
	loss_type: z.string().optional(),
	recovery_status: z.nativeEnum(RecoveryStatus).optional(),
	substatus: z.nativeEnum(ClaimSubstatus).optional(),
	insured: z.string().optional(),
	client: z.string().optional(),
	limit: z.number().optional(),
	offset: z.number().optional(),
});
export type GetClaimsInput = z.infer<typeof getClaimsInput>;

export const getClaimCountInput = z.object({ clientId: z.string().optional() });

// Schema for individual claim data when creating
// Note: loss_type is no longer on the claim table - it's set per claim_liability
// Note: claim_amount, total_incurred and expected_recovery are calculated fields (not set during creation)
export const claimDataSchema = z
	.object({
		claim_number: z.string().nullable(),
		client: z.string().nullable(),
		client_adjuster: z.string().nullable(),
		insured: z.string().nullable(),
		date_of_loss: parseDate().nullable(),
		line_of_business: z.string().nullable(),
		last_updated_by: z.string().nullable(),
		last_update: parseDate().nullable(),
	})
	.merge(lossAddressSchema);
export type ClaimData = z.infer<typeof claimDataSchema>;

export const createClaimInput = z.object({
	claims: z.array(claimDataSchema),
});
export type CreateClaimInput = z.infer<typeof createClaimInput>;

// Note: loss_type is no longer on the claim table - it's set per claim_liability
// Note: All amount fields (claim_amount, total_incurred, expected_recovery) are now calculated
export const updateClaimInput = z
	.object({
		claimId: z.string().uuid(),
		claim_number: z.string().nullable().optional(),
		client: z.string().nullable().optional(),
		client_adjuster: z.string().nullable().optional(),
		insured: z.string().nullable().optional(),
		date_of_loss: parseDate().nullable().optional(),
		line_of_business: z.string().nullable().optional(),
		recovery_status: z.nativeEnum(RecoveryStatus).optional(),
		substatus: z.string().optional(),
	})
	.merge(lossAddressSchema);
export type UpdateClaimInput = z.infer<typeof updateClaimInput>;

// Recovery tracking schemas
export const updateClaimRecoveryInput = z.object({
	claimId: z.string().uuid(),
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
	substatus: z.nativeEnum(ClaimSubstatus).optional(),
	recoveryStatus: z.nativeEnum(RecoveryStatus).optional(),
	limit: z.number().int().positive().optional(),
	offset: z.number().int().nonnegative().optional(),
});
export type ListMyDeskClaimsInput = z.infer<typeof listMyDeskClaimsInput>;
