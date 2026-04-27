import { z } from 'zod';
import { DeductibleStatus } from '@/config/enums';

export const getCoveragesInput = z.object({
	claimId: z.string().uuid(),
});
export type GetCoveragesInput = z.infer<typeof getCoveragesInput>;

export const getCoveragesByClaimPartyInput = z.object({
	claimPartyId: z.string().uuid(),
});
export type GetCoveragesByClaimPartyInput = z.infer<typeof getCoveragesByClaimPartyInput>;

export const createCoverageInput = z.object({
	claim_id: z.string().uuid(),
	claim_party_id: z.string().uuid().optional(),
	loss_type: z.string(),
	coverage_amount: z.number().nullable().optional(),
	amount_reserved: z.number().nullable().optional(),
	// Deductible fields
	deductible_amount: z.number().min(0).nullable().optional(),
	deductible_status: z.nativeEnum(DeductibleStatus),
	// Subrogation and statute fields
	subro_applicable: z.boolean().optional(), // Will default via placeholder function
	statute_preserved: z.boolean().optional(), // Defaults to false
});
export type CreateCoverageInput = z.infer<typeof createCoverageInput>;

export const updateCoverageInput = z.object({
	id: z.string().uuid(),
	loss_type: z.string().optional(),
	coverage_amount: z.number().nullable().optional(),
	amount_reserved: z.number().nullable().optional(),
	// Deductible fields
	deductible_amount: z.number().min(0).nullable().optional(),
	deductible_status: z.nativeEnum(DeductibleStatus).optional(),
	// Subrogation and statute fields
	subro_applicable: z.boolean().optional(),
	statute_preserved: z.boolean().optional(),
});
export type UpdateCoverageInput = z.infer<typeof updateCoverageInput>;

export const deleteCoverageInput = z.object({
	id: z.string().uuid(),
});
export type DeleteCoverageInput = z.infer<typeof deleteCoverageInput>;

export const archiveCoverageInput = z.object({
	id: z.string().uuid(),
});
export type ArchiveCoverageInput = z.infer<typeof archiveCoverageInput>;
