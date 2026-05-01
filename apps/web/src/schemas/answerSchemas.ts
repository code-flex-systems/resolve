import { parseNumber } from '@/lib/parsers/zodParsers';
import { z } from 'zod';

export const answerParams = z.object({
	text: z.string(),
	position: z.number().int(),
	grade: parseNumber().nullable().optional(),
	description_text: z.string().nullable().optional(),
	description_image_url: z.string().nullable().optional(),
	has_additional_info: z.boolean().nullable().optional(),
	additional_info_placeholder: z.string().nullable().optional(),
	additional_info_num_lines: parseNumber().nullable().optional(),
	calls_instance_id: z.string().uuid().nullable().optional(),
	hidden: z.boolean().nullable().optional(),
	requires_upload: z.boolean().nullable().optional(),
	allowed_extensions: z.string().nullable().optional(),
});
export type AnswerParams = z.infer<typeof answerParams>;

export const answerUpdateParams = answerParams.partial();
export type AnswerUpdateParams = z.infer<typeof answerUpdateParams>;

export const createAnswerInput = z.object({
	pageId: z.string().uuid(),
	questionId: z.string().uuid(),
	params: answerParams,
});
export type CreateAnswerInput = z.infer<typeof createAnswerInput>;

export const copyAnswerInput = z.object({
	pageId: z.string().uuid(),
	questionId: z.string().uuid(),
	answerId: z.string().uuid(),
});
export type CopyAnswerInput = z.infer<typeof copyAnswerInput>;

export const deleteAnswerInput = z.object({
	pageId: z.string().uuid(),
	answerId: z.string().uuid(),
});
export type DeleteAnswerInput = z.infer<typeof deleteAnswerInput>;

export const getAnswerInput = z.object({
	id: z.string().uuid(),
});
export type GetAnswerInput = z.infer<typeof getAnswerInput>;

export const getAnswersInput = z.object({
	questionId: z.string().uuid(),
});
export type GetAnswersInput = z.infer<typeof getAnswersInput>;

export const modifyAnswerInput = z.object({
	pageId: z.string().uuid(),
	answerId: z.string().uuid(),
	params: answerUpdateParams,
});
export type ModifyAnswerInput = z.infer<typeof modifyAnswerInput>;

export const getAnswerCallGraphInput = z.object({
	checklistId: z.string().uuid(),
});
export type GetAnswerCallGraphInput = z.infer<typeof getAnswerCallGraphInput>;
