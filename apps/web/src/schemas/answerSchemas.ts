import { z } from 'zod';

export const answerParams = z.object({
	text: z.string(),
	position: z.number().int(),
	descriptionText: z.string().optional(),
	descriptionImageUrl: z.string().optional(),
	hasAdditionalInfo: z.boolean().optional(),
	additionalInfoPlaceholder: z.string().optional(),
	additionalInfoNumLines: z.number().int().optional(),
	callsInstanceId: z.number().int().optional(),
	hidden: z.boolean().optional(),
});

export const createAnswerInput = z.object({
	pageId: z.number().int(),
	questionId: z.number().int(),
	params: answerParams,
});
export type CreateAnswerInput = z.infer<typeof createAnswerInput>;

export const copyAnswerInput = z.object({
	pageId: z.number().int(),
	questionId: z.number().int(),
	answerId: z.number().int(),
});
export type CopyAnswerInput = z.infer<typeof copyAnswerInput>;

export const deleteAnswerInput = z.object({
	pageId: z.number().int(),
	answerId: z.number().int(),
});
export type DeleteAnswerInput = z.infer<typeof deleteAnswerInput>;

export const getAnswerInput = z.object({
	id: z.number().int(),
});
export type GetAnswerInput = z.infer<typeof getAnswerInput>;

export const getAnswersInput = z.object({
	questionId: z.number().int(),
});
export type GetAnswersInput = z.infer<typeof getAnswersInput>;

export const modifyAnswerInput = z.object({
	pageId: z.number().int(),
	answerId: z.number().int(),
	// params: answerParams,
	params: z.record(z.unknown()),
});
export type ModifyAnswerInput = z.infer<typeof modifyAnswerInput>;
