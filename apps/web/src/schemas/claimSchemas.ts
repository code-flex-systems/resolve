import { z } from 'zod';
import { ClaimSearch, RecoveryStatus } from '@/config/enums';
import { parseDate, parseNumber } from '@/lib/parsers/zodParsers';

export const assignClaimInput = z.object({
	checklistId: z.number().int(),
	claimId: z.number().int(),
	assignee: z.string(),
});

export const getClaimInput = z.object({
	checklistId: z.number().int(),
	claimId: z.number().int(),
});
export type GetClaimInput = z.infer<typeof getClaimInput>;

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
			claim_amount: parseNumber().nullable(),
			total_incurred: parseNumber().nullable(),
			date_of_loss: parseDate().nullable(),
			loss_location: z.string().nullable(),
			last_updated_by: z.string().nullable(),
			last_update: parseDate().nullable(),
			expected_recovery: parseNumber().nullable(),
		})
	),
});

// Recovery tracking schemas
export const updateClaimRecoveryInput = z.object({
	claimId: z.number().int(),
	recovery_status: z.nativeEnum(RecoveryStatus).optional(),
	// actual_recovery is calculated from recovery_event records, not set directly
});
