import config from '@/config/config';
import { router, protectedProcedure } from '../trpc';

import {
	evaluateResponses,
	getResponsesForAnswer,
	getResponsesForClaimChecklist,
	upsertQuestionResponses,
} from '@/api/controllers/responseController';
import { ClaimStatus } from '@/config/enums';
import { requireRole } from '@/lib/auth/requireRole';
import {
	evaluateResponsesInput,
	getResponsesForAnswerInput,
	getResponsesForClaimChecklistInput,
	upsertQuestionResponsesInput,
} from '@/schemas/responseSchemas';

export const responseRouter = router({
	evaluateResponses: protectedProcedure.input(evaluateResponsesInput).mutation(async ({ input, ctx }) => {
		return evaluateResponses(ctx, input);
	}),

	getResponsesForAnswer: protectedProcedure.input(getResponsesForAnswerInput).query(async ({ input, ctx }) => {
		return getResponsesForAnswer(ctx, input);
	}),

	getResponsesForChecklist: protectedProcedure
		.input(getResponsesForClaimChecklistInput)
		.query(async ({ input, ctx }) => {
			return getResponsesForClaimChecklist(ctx, input);
		}),

	upsertQuestionResponses: protectedProcedure.input(upsertQuestionResponsesInput).mutation(async ({ input, ctx }) => {
		// Only administrators can edit a submitted checklist on a claim
		if (input.claimStatus === ClaimStatus.SUBMITTED) {
			requireRole(ctx, [config.ROLES.SUPER_ADMIN, config.ROLES.ADMIN]);
		}
		return upsertQuestionResponses(ctx, input);
	}),
});
