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
	interval: intervalSchema.optional(),
});
export type GetResponsesForAnswerInput = z.infer<typeof getResponsesForAnswerInput>;

export const getResponsesForClaimChecklistInput = z.object({
	checklistId: z.number().int(),
	claimId: z.number().int(),
	instanceId: z.number().int().optional(),
});
export type GetResponsesForClaimChecklistInput = z.infer<typeof getResponsesForClaimChecklistInput>;

export const upsertQuestionResponsesParams = z.object({});
export type UpsertQuestionResponsesParams = z.infer<typeof upsertQuestionResponsesParams>;

export const upsertQuestionResponsesInput = z.object({
	params: upsertQuestionResponsesParams,
});
export type UpsertQuestionResponsesInput = z.infer<typeof upsertQuestionResponsesInput>;
