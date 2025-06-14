import { z } from 'zod';
import { SummarySegment } from '@/config/enums';

export const checklistParams = z.record(z.unknown());

export const createChecklistInput = z.object({
	name: z.string(),
	existingChecklistId: z.number().optional(),
});
export type CreateChecklistInput = z.infer<typeof createChecklistInput>;

export const deleteChecklistInput = z.object({
	id: z.number().int(),
});
export type DeleteChecklistInput = z.infer<typeof deleteChecklistInput>;

export const getChecklistInput = z.object({
	id: z.number().int(),
});
export type GetChecklistInput = z.infer<typeof getChecklistInput>;

export const getChecklistsInput = z.object({
	searchTerm: z.string().optional(),
});
export type GetChecklistsInput = z.infer<typeof getChecklistsInput>;

export const getChecklistClaimInput = z.object({
	checklistId: z.number().int(),
	claimId: z.number().int(),
});
export type GetChecklistClaimInput = z.infer<typeof getChecklistClaimInput>;

export const getChecklistSummaryInput = z.object({
	checklistId: z.number().int(),
	claimId: z.number().int(),
});
export type GetChecklistSummaryInput = z.infer<typeof getChecklistSummaryInput>;

export const getChecklistSummaryDetailInput = z.object({
	checklistId: z.number().int(),
	claimId: z.number().int(),
	segment: z.nativeEnum(SummarySegment),
	limit: z.number().int().optional(),
	offset: z.number().int().optional(),
});
export type GetChecklistSummaryDetailInput = z.infer<typeof getChecklistSummaryDetailInput>;

export const modifyChecklistInput = z.object({
	id: z.number().int(),
	params: checklistParams,
});
export type ModifyChecklistInput = z.infer<typeof modifyChecklistInput>;
