import { ClaimStatus } from '@/config/enums';
import { parseDate } from '@/lib/parsers/zodParsers';
import { z } from 'zod';

export const evaluateResponsesInput = z.object({
	checklistId: z.number().int(),
	claimId: z.number().int(),
	instanceId: z.number().int(),
});
export type EvaluateResponsesInput = z.infer<typeof evaluateResponsesInput>;

export const intervalSchema = z.object({
	from: z.string().optional(),
	to: z.string().optional(),
});

export const getResponsesForAnswerInput = z.object({
	answerId: z.number().int(),
	filters: z.object({
		users: z.array(z.string()).optional(),
		range: z.tuple([parseDate(), parseDate()]),
	}),
	limit: z.number().int(),
	offset: z.number().int(),
});
export type GetResponsesForAnswerInput = z.infer<typeof getResponsesForAnswerInput>;

export const getResponsesForClaimChecklistInput = z.object({
	checklistId: z.number().int(),
	claimId: z.number().int(),
	instanceId: z.number().int().optional(),
});
export type GetResponsesForClaimChecklistInput = z.infer<typeof getResponsesForClaimChecklistInput>;

export const getResponseAuditLogsInput = z.object({
	filters: z.object({
		checklistId: z.number().int().optional(),
		claimId: z.number().int().optional(),
		emails: z.array(z.string().email()).optional(),
		range: z.tuple([parseDate().nullable(), parseDate().nullable()]).optional(),
		searchTerm: z.string().optional(),
	}),
	limit: z.number().int(),
	offset: z.number().int(),
});

export const getResponseAuditLogStatsInput = z.object({
	filters: z.object({
		range: z.tuple([parseDate(), parseDate()]),
		checklistId: z.number().int().optional(),
		claimId: z.number().int().optional(),
		users: z.array(z.string()).optional(),
		searchTerm: z.string().optional(),
	}),
});

export const upsertQuestionResponsesParams = z.any().array();
export type UpsertQuestionResponsesParams = z.infer<typeof upsertQuestionResponsesParams>;

export const upsertQuestionResponsesInput = z.object({
	responses: upsertQuestionResponsesParams,
	claimStatus: z.nativeEnum(ClaimStatus)?.optional(),
});
export type UpsertQuestionResponsesInput = z.infer<typeof upsertQuestionResponsesInput>;
