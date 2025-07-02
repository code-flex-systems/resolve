import { z } from 'zod';
import { ClaimSearch } from '@/config/enums';
import { parseDate, parseNumber } from '@/lib/parsers/zodParsers';

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
