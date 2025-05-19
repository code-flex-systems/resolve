import { z } from 'zod';

export const questionParams = z.object({});

export const createQuestionInput = z.object({
	pageId: z.number().int(),
	params: questionParams,
});
export type CreateQuestionInput = z.infer<typeof createQuestionInput>;

export const copyQuestionInput = z.object({
	pageId: z.number().int(),
	questionId: z.number().int(),
});
export type CopyQuestionInput = z.infer<typeof copyQuestionInput>;

export const deleteQuestionInput = z.object({
	pageId: z.number().int(),
	questionId: z.number().int(),
});
export type DeleteQuestionInput = z.infer<typeof deleteQuestionInput>;

export const getQuestionInput = z.object({
	id: z.number().int(),
});
export type GetQuestionInput = z.infer<typeof getQuestionInput>;

export const getQuestionsInput = z.object({
	pageId: z.number().int(),
});
export type GetQuestionsInput = z.infer<typeof getQuestionsInput>;

export const intervalSchema = z.object({
	from: z.string().optional(),
	to: z.string().optional(),
});

export const getQuestionStatsInput = z.object({
	pageId: z.number().int(),
	interval: intervalSchema.optional(),
});
export type GetQuestionStatsInput = z.infer<typeof getQuestionStatsInput>;

export const modifyQuestionInput = z.object({
	pageId: z.number().int(),
	questionId: z.number().int(),
	params: questionParams,
});
export type ModifyQuestionInput = z.infer<typeof modifyQuestionInput>;
