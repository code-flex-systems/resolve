import { parseDate } from '@/lib/parsers/zodParsers';
import { z } from 'zod';
import { QuestionType } from '@/config/enums';

const questionBaseParams = z
	.object({
		text: z.string().min(1),
		type: z.nativeEnum(QuestionType),
		position: z.number().int().min(1),
		description_text: z.string().nullable().optional(),
		description_image_url: z.string().nullable().optional(),
		placeholder: z.string().nullable().optional(),
		page_id: z.string().uuid().optional(),
		hidden: z.boolean().nullable().optional(),
		id: z.string().uuid().optional(),
	})
	.strict();

export const questionParams = questionBaseParams;
export type QuestionParams = z.infer<typeof questionParams>;

export const questionUpdateParams = questionBaseParams.partial();
export type QuestionUpdateParams = z.infer<typeof questionUpdateParams>;

export const createQuestionInput = z.object({
	pageId: z.string().uuid(),
	params: questionParams,
});
export type CreateQuestionInput = z.infer<typeof createQuestionInput>;

export const copyQuestionInput = z.object({
	pageId: z.string().uuid(),
	questionId: z.string().uuid(),
});
export type CopyQuestionInput = z.infer<typeof copyQuestionInput>;

export const deleteQuestionInput = z.object({
	pageId: z.string().uuid(),
	questionId: z.string().uuid(),
});
export type DeleteQuestionInput = z.infer<typeof deleteQuestionInput>;

export const getQuestionInput = z.object({
	id: z.string().uuid(),
});
export type GetQuestionInput = z.infer<typeof getQuestionInput>;

export const getQuestionsInput = z.object({
	pageId: z.string().uuid(),
});
export type GetQuestionsInput = z.infer<typeof getQuestionsInput>;

export const intervalSchema = z.object({
	from: z.string().optional(),
	to: z.string().optional(),
});

export const getQuestionStatsInput = z.object({
	pageId: z.string().uuid(),
	filters: z.object({
		claimId: z.string().uuid().optional(),
		users: z.array(z.string()).optional(),
		range: z.tuple([parseDate(), parseDate()]),
	}),
});
export type GetQuestionStatsInput = z.infer<typeof getQuestionStatsInput>;

export const modifyQuestionInput = z.object({
	pageId: z.string().uuid(),
	questionId: z.string().uuid(),
	params: questionUpdateParams,
});
export type ModifyQuestionInput = z.infer<typeof modifyQuestionInput>;
