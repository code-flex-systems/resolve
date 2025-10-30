import { router, protectedProcedure } from '../trpc';
import {
	evaluateResponses,
	exportResponseAuditLogs,
	getResponseAuditLogs,
	getResponseAuditLogStats,
	getResponsesForAnswer,
	getResponsesForClaimChecklist,
	upsertQuestionResponses,
} from '@/api/controllers/responseController';
import config from '@/config/config';
import { checkRole } from '@/lib/auth/checkRole';
import { requireAssigned } from '@/lib/auth/requireAssigned';
import { requireOwnership } from '@/lib/auth/requireOwnership';
import { requireRole } from '@/lib/auth/requireRole';
import {
	evaluateResponsesInput,
	exportResponseAuditLogsInput,
	getResponseAuditLogsInput,
	getResponseAuditLogStatsInput,
	getResponsesForAnswerInput,
	getResponsesForClaimChecklistInput,
	upsertQuestionResponsesInput,
} from '@/schemas/responseSchemas';
import { TRPCError } from '@trpc/server';

export const responseRouter = router({
	evaluateResponses: protectedProcedure.input(evaluateResponsesInput).mutation(async ({ input, ctx }) => {
		if (!checkRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN])) {
			await requireOwnership(ctx, input.checklistId, input.claimId);
		}
		return evaluateResponses(ctx, input);
	}),

	getResponsesForAnswer: protectedProcedure.input(getResponsesForAnswerInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return getResponsesForAnswer(ctx, input);
	}),

	getResponsesForChecklist: protectedProcedure
		.input(getResponsesForClaimChecklistInput)
		.query(async ({ input, ctx }) => {
			if (!checkRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN])) {
				await requireOwnership(ctx, input.checklistId, input.claimId);
			}
			return getResponsesForClaimChecklist(ctx, input);
		}),

	getResponseAuditLogs: protectedProcedure.input(getResponseAuditLogsInput).query(async ({ input, ctx }) => {
		// Viewing all logs for a checklist requires privileged access
		if (!input.filters.claimId) {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		} else if (!checkRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN])) {
			// Contributors can only view audit logs for claims they own or are assigned to
			await requireOwnership(ctx, input.filters.checklistId!, input.filters.claimId);
		}
		return getResponseAuditLogs(ctx, input);
	}),

	exportResponseAuditLogs: protectedProcedure.input(exportResponseAuditLogsInput).query(async ({ input, ctx }) => {
		// Same authorization logic as getResponseAuditLogs
		if (!input.filters.claimId) {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		} else if (!checkRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN])) {
			await requireOwnership(ctx, input.filters.checklistId!, input.filters.claimId);
		}
		return exportResponseAuditLogs(ctx, input);
	}),

	getResponseAuditLogStats: protectedProcedure.input(getResponseAuditLogStatsInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return getResponseAuditLogStats(ctx, input);
	}),

	upsertQuestionResponses: protectedProcedure.input(upsertQuestionResponsesInput).mutation(async ({ input, ctx }) => {
		const sampleResponse = input.responses?.[0];
		if (!sampleResponse) throw new TRPCError({ code: 'BAD_REQUEST', message: 'At least one response is required' });
		if (!checkRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN])) {
			await requireAssigned(ctx, sampleResponse.checklist_id, sampleResponse.claim_id);
		}
		return upsertQuestionResponses(ctx, input);
	}),
});
