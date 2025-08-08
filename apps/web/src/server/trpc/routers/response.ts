import config from '@/config/config';
import { router, protectedProcedure } from '../trpc';

import {
	evaluateResponses,
	getResponseAuditLogs,
	getResponsesForAnswer,
	getResponsesForClaimChecklist,
	upsertQuestionResponses,
} from '@/api/controllers/responseController';
import { ClaimStatus } from '@/config/enums';
import { requireRole } from '@/lib/auth/requireRole';
import {
	evaluateResponsesInput,
	getResponseAuditLogsInput,
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

	getResponseAuditLogs: protectedProcedure.input(getResponseAuditLogsInput).query(async ({ input, ctx }) => {
		return getResponseAuditLogs(ctx, input);
	}),

	upsertQuestionResponses: protectedProcedure.input(upsertQuestionResponsesInput).mutation(async ({ input, ctx }) => {
		return upsertQuestionResponses(ctx, input);
	}),
});
