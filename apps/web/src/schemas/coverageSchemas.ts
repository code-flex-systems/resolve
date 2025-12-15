import { z } from 'zod';

export const getCoveragesInput = z.object({
	claimId: z.number().int(),
});
export type GetCoveragesInput = z.infer<typeof getCoveragesInput>;

export const getCoveragesByClaimPartyInput = z.object({
	claimPartyId: z.number().int(),
});
export type GetCoveragesByClaimPartyInput = z.infer<typeof getCoveragesByClaimPartyInput>;

export const createCoverageInput = z.object({
	claim_id: z.number().int(),
	claim_party_id: z.number().int(),
	coverage_type: z.string(),
	coverage_amount: z.number().nullable().optional(),
	amount_reserved: z.number().nullable().optional(),
});
export type CreateCoverageInput = z.infer<typeof createCoverageInput>;

export const updateCoverageInput = z.object({
	id: z.number().int(),
	coverage_type: z.string().optional(),
	coverage_amount: z.number().nullable().optional(),
	amount_reserved: z.number().nullable().optional(),
});
export type UpdateCoverageInput = z.infer<typeof updateCoverageInput>;

export const deleteCoverageInput = z.object({
	id: z.number().int(),
});
export type DeleteCoverageInput = z.infer<typeof deleteCoverageInput>;

export const archiveCoverageInput = z.object({
	id: z.number().int(),
});
export type ArchiveCoverageInput = z.infer<typeof archiveCoverageInput>;
