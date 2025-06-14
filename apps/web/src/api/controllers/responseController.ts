import * as pageQueries from '@/api/queries/pageQueries';
import * as questionQueries from '@/api/queries/questionQueries';
import * as responseQueries from '@/api/queries/responseQueries';
import { getUpdatedPageStatus } from '@/api/utils/utils';
import { ProtectedContext } from '@/server/trpc/trpc';
import { Interval, QuestionResponse } from '@/types/types';

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
	if (!pageInstance) throw new Error('Invalid instance');
	const [questionCount = 0, responseCount = 0] = await Promise.all([
		questionQueries.getQuestionCount(ctx, pageInstance.id),
		responseQueries.getResponseCount(ctx, checklistId, claimId, instanceId),
	]);
	const updatedPageStatus = getUpdatedPageStatus(questionCount, responseCount);
	await pageQueries.modifyPageInstanceStatus(ctx, {
		claimId,
		instanceIds: [instanceId],
		newStatus: updatedPageStatus,
		templateVersion: pageInstance.version,
	});
	return updatedPageStatus;
}

export async function getResponsesForAnswer(
	ctx: ProtectedContext,
	{ answerId, interval }: { answerId: number; interval?: Interval<string> }
) {
	let results = await responseQueries.getResponsesForAnswer(ctx, answerId, interval);
	return results;
}

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
	let results = await responseQueries.getResponsesForClaimChecklist(ctx, checklistId, claimId, instanceId);
	return results;
}

export async function upsertQuestionResponses(ctx: ProtectedContext, { responses }: { responses: any[] }) {
	const sampleResponse = responses?.[0] as QuestionResponse;
	if (!sampleResponse) throw new Error('Invalid responses');
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
