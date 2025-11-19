import { z } from 'zod';
import { CoverageType } from '@/config/enums';
import { parseNumber } from '@/lib/parsers/zodParsers';

export const getCoveragesInput = z.object({
	claimId: z.number().int(),
});
export type GetCoveragesInput = z.infer<typeof getCoveragesInput>;

export const createCoverageInput = z.object({
	claim_id: z.number().int(),
	coverage_type: z.nativeEnum(CoverageType),
	coverage_amount: parseNumber().nullable().optional(),
});
export type CreateCoverageInput = z.infer<typeof createCoverageInput>;

export const updateCoverageInput = z.object({
	id: z.number().int(),
	coverage_type: z.nativeEnum(CoverageType).optional(),
	coverage_amount: parseNumber().nullable().optional(),
});
export type UpdateCoverageInput = z.infer<typeof updateCoverageInput>;

export const deleteCoverageInput = z.object({
	id: z.number().int(),
});
export type DeleteCoverageInput = z.infer<typeof deleteCoverageInput>;
