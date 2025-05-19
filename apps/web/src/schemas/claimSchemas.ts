import { z } from 'zod';
import { ClaimSearch } from '@/config/enums';

export const getClaimInput = z.object({
	checklistId: z.number().int(),
	claimId: z.number().int(),
});
export type GetClaimInput = z.infer<typeof getClaimInput>;

export const getClaimsInput = z.object({
	searchTerm: z
		.object({
			value: z.string(),
			type: z.nativeEnum(ClaimSearch),
		})
		.optional(),
});
export type GetClaimsInput = z.infer<typeof getClaimsInput>;
