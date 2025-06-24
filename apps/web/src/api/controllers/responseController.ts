import * as pageQueries from '@/api/queries/pageQueries';
import * as questionQueries from '@/api/queries/questionQueries';
import * as responseQueries from '@/api/queries/responseQueries';
import { getUpdatedPageStatus } from '@/api/utils/utils';
import { ProtectedContext } from '@/server/trpc/trpc';
import { Interval, QuestionResponse } from '@/types/types';
import { TRPCError } from '@trpc/server';

/**
 * Recalculate page instance status based on responses.
 *
 * @param ctx - request context
 * @param input - checklist, claim and instance ids
 */
export async function evaluateResponses(
	ctx: ProtectedContext,
	{
		checklistId,
		claimId,
		instanceId,
	}: {
		checklistId: number;
		claimId: number;
		instanceId: number;
	}
) {
	const pageInstance = await pageQueries.getPageInstance(ctx, instanceId);
	if (!pageInstance) throw new TRPCError({ code: 'NOT_FOUND', message: 'Instance not found' });
	const [questionCount = 0, responseCount = 0] = await Promise.all([
		questionQueries.getQuestionCount(ctx, pageInstance.id),
		responseQueries.getResponseCount(ctx, checklistId, claimId, instanceId),
	]);
	const updatedPageStatus = getUpdatedPageStatus(questionCount, responseCount);
	// Persist the new status for the page instance
	await pageQueries.modifyPageInstanceStatus(ctx, {
		claimId,
		instanceIds: [instanceId],
		newStatus: updatedPageStatus,
		templateVersion: pageInstance.version,
	});
	return updatedPageStatus;
}

/**
 * Get responses selecting a specific answer.
 *
 * @param ctx - request context
 * @param input - answer id and optional interval
 */
export async function getResponsesForAnswer(
	ctx: ProtectedContext,
	{ answerId, interval }: { answerId: number; interval?: Interval<string> }
) {
	const results = await responseQueries.getResponsesForAnswer(ctx, answerId, interval);
	return results;
}

/**
 * Fetch responses for a claim on a checklist.
 *
 * @param ctx - request context
 * @param input - checklist, claim and optional instance id
 */
export async function getResponsesForClaimChecklist(
	ctx: ProtectedContext,
	{
		checklistId,
		claimId,
		instanceId,
	}: {
		checklistId: number;
		claimId: number;
		instanceId?: number;
	}
) {
	const results = await responseQueries.getResponsesForClaimChecklist(ctx, checklistId, claimId, instanceId);
	return results;
}

/**
 * Insert or update multiple responses at once.
 *
 * @param ctx - request context
 * @param input - array of question responses
 * @returns updated instance visibility and status
 */
export async function upsertQuestionResponses(ctx: ProtectedContext, { responses }: { responses: any[] }) {
	const sampleResponse = responses?.[0] as QuestionResponse;
	if (!sampleResponse) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid responses' });
	const newStatus = await responseQueries.upsertQuestionResponses(ctx, responses);
	const visibleIds = await pageQueries.getVisiblePageInstances(
		ctx,
		sampleResponse.checklist_id,
		sampleResponse.claim_id
	);
	return {
		updatedInstanceId: sampleResponse.instance_id,
		status: newStatus,
		visibleIds,
	};
}
