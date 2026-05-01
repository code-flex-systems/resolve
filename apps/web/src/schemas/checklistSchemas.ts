import { z } from 'zod';
import { ClaimStatus, SummarySegment } from '@/config/enums';
import { parseDate } from '@/lib/parsers/zodParsers';

export const checklistParams = z
	.object({
		name: z.string().min(1).optional(),
		published: z.boolean().optional(),
	})
	.strict();
export type ChecklistParams = z.infer<typeof checklistParams>;

export const createChecklistInput = z.object({
	name: z.string(),
	existingChecklistId: z.string().uuid().optional(),
});
export type CreateChecklistInput = z.infer<typeof createChecklistInput>;

export const deleteChecklistInput = z.object({
	id: z.string().uuid(),
});
export type DeleteChecklistInput = z.infer<typeof deleteChecklistInput>;

export const getChecklistInput = z.object({
	id: z.string().uuid(),
});
export type GetChecklistInput = z.infer<typeof getChecklistInput>;

export const getChecklistsInput = z.object({
	searchTerm: z.string().optional(),
});
export type GetChecklistsInput = z.infer<typeof getChecklistsInput>;

export const getChecklistCountInput = z.object({
	clientId: z.string().optional(),
});
export type GetChecklistCountInput = z.infer<typeof getChecklistCountInput>;

export const getChecklistClaimInput = z.object({
	checklistId: z.string().uuid(),
	claimId: z.string().uuid(),
});
export type GetChecklistClaimInput = z.infer<typeof getChecklistClaimInput>;

export const getChecklistClaimProgressInput = z.object({
	checklistId: z.string().uuid(),
	claimId: z.string().uuid(),
});

export const getChecklistSummaryInput = z.object({
	checklistId: z.string().uuid(),
	claimId: z.string().uuid(),
});
export type GetChecklistSummaryInput = z.infer<typeof getChecklistSummaryInput>;

export const getChecklistClaimStatsInput = z.object({
	checklistId: z.string().uuid().optional(),
	users: z.array(z.string()).optional(),
});

export const getChecklistClaimsInput = z.object({
	filters: z.object({
		checklistId: z.string().uuid().optional(),
		users: z.array(z.string()).optional(),
		range: z.tuple([parseDate(), parseDate()]),
		claimStatus: z.nativeEnum(ClaimStatus).optional(),
	}),
	limit: z.number().int(),
	offset: z.number().int(),
});

export const exportChecklistClaimsInput = z.object({
	filters: z.object({
		checklistId: z.string().uuid().optional(),
		users: z.array(z.string()).optional(),
		range: z.tuple([parseDate(), parseDate()]),
		claimStatus: z.nativeEnum(ClaimStatus).optional(),
	}),
});

export const getChecklistSummaryDetailInput = z.object({
	checklistId: z.string().uuid(),
	claimId: z.string().uuid(),
	segment: z.nativeEnum(SummarySegment),
	limit: z.number().int().optional(),
	offset: z.number().int().optional(),
});
export type GetChecklistSummaryDetailInput = z.infer<typeof getChecklistSummaryDetailInput>;

export const modifyChecklistInput = z.object({
	id: z.string().uuid(),
	params: checklistParams,
});
export type ModifyChecklistInput = z.infer<typeof modifyChecklistInput>;

export const modifyChecklistClaimInput = z.object({
	checklistId: z.string().uuid(),
	claimId: z.string().uuid(),
	status: z.nativeEnum(ClaimStatus).optional(),
	assignee: z.string().optional(),
});
