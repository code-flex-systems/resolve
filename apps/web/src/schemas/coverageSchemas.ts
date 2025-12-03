import { z } from 'zod';
import { parseNumber } from '@/lib/parsers/zodParsers';

export const getCoveragesInput = z.object({
	claimId: z.number().int(),
});
export type GetCoveragesInput = z.infer<typeof getCoveragesInput>;

export const createCoverageInput = z.object({
	claim_id: z.number().int(),
	coverage_type: z.string(),
	coverage_amount: parseNumber().nullable().optional(),
	amount_reserved: parseNumber().nullable().optional(),
});
export type CreateCoverageInput = z.infer<typeof createCoverageInput>;

export const updateCoverageInput = z.object({
	id: z.number().int(),
	coverage_type: z.string().optional(),
	coverage_amount: parseNumber().nullable().optional(),
	amount_reserved: parseNumber().nullable().optional(),
});
export type UpdateCoverageInput = z.infer<typeof updateCoverageInput>;

export const deleteCoverageInput = z.object({
	id: z.number().int(),
});
export type DeleteCoverageInput = z.infer<typeof deleteCoverageInput>;
