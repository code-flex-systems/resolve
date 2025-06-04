import { z } from 'zod';
import { ClaimSearch } from '@/config/enums';

export const getClaimInput = z.object({
	checklistId: z.number().int(),
	claimId: z.number().int(),
});
export type GetClaimInput = z.infer<typeof getClaimInput>;

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

export const createClaimInput = z.object({
	params: z.object({
		claim_number: z.string().nullable(),
		client: z.string().nullable(),
		client_adjuster: z.string().nullable(),
		insured: z.string().nullable(),
		claim_amount: z.number().nullable(),
		total_incurred: z.number().nullable(),
		date_of_loss: z.date().nullable(),
		loss_location: z.string().nullable(),
		last_updated_by: z.string().nullable(),
		last_update: z.date().nullable(),
		expected_recovery: z.number().nullable(),
	}),
});
