import { router, publicProcedure } from '../trpc';

import {
	evaluateResponses,
	getResponsesForAnswer,
	getResponsesForClaimChecklist,
	upsertQuestionResponses,
} from '@/api/controllers/responseController';
import {
	evaluateResponsesInput,
	getResponsesForAnswerInput,
	getResponsesForClaimChecklistInput,
	upsertQuestionResponsesInput,
} from '@/schemas/responseSchemas';

export const responseRouter = router({
	evaluateResponses: publicProcedure.input(evaluateResponsesInput).query(async ({ input }) => {
		return evaluateResponses(input);
	}),

	getResponsesForAnswer: publicProcedure.input(getResponsesForAnswerInput).query(async ({ input }) => {
		return getResponsesForAnswer(input);
	}),

	getResponsesForChecklist: publicProcedure.input(getResponsesForClaimChecklistInput).query(async ({ input }) => {
		return getResponsesForClaimChecklist(input);
	}),

	upsertQuestionResponses: publicProcedure.input(upsertQuestionResponsesInput).mutation(async ({ input }) => {
		return upsertQuestionResponses(input);
	}),
});
