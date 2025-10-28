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
                page_id: z.number().int().optional(),
                hidden: z.boolean().nullable().optional(),
                id: z.number().int().optional(),
        })
        .strict();

export const questionParams = questionBaseParams;
export type QuestionParams = z.infer<typeof questionParams>;

export const questionUpdateParams = questionBaseParams.partial();
export type QuestionUpdateParams = z.infer<typeof questionUpdateParams>;

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
	filters: z.object({
		claimId: z.number().int().optional(),
		users: z.array(z.string()).optional(),
		range: z.tuple([parseDate(), parseDate()]),
	}),
});
export type GetQuestionStatsInput = z.infer<typeof getQuestionStatsInput>;

export const modifyQuestionInput = z.object({
        pageId: z.number().int(),
        questionId: z.number().int(),
        params: questionUpdateParams,
});
export type ModifyQuestionInput = z.infer<typeof modifyQuestionInput>;
