import * as pageQueries from '@/api/queries/pageQueries';
import * as questionQueries from '@/api/queries/questionQueries';
import * as responseQueries from '@/api/queries/responseQueries';
import { getUpdatedPageStatus } from '@/api/utils/utils';
import { Interval, QuestionResponse } from '@/types/types';

export async function evaluateResponses({
	checklistId,
	claimId,
	instanceId,
}: {
	checklistId: number;
	claimId: number;
	instanceId: number;
}) {
	const pageInstance = await pageQueries.getPageInstance(instanceId);
	if (!pageInstance) throw new Error('Invalid instance');
	const [questionCount = 0, responseCount = 0] = await Promise.all([
		questionQueries.getQuestionCount(pageInstance.id),
		responseQueries.getResponseCount(checklistId, claimId, instanceId),
	]);
	const updatedPageStatus = getUpdatedPageStatus(questionCount, responseCount);
	await pageQueries.modifyPageInstanceStatus({
		claimId,
		instanceIds: [instanceId],
		newStatus: updatedPageStatus,
		templateVersion: pageInstance.version,
	});
	return updatedPageStatus;
}

export async function getResponsesForAnswer({ answerId, interval }: { answerId: number; interval?: Interval<string> }) {
	let results = await responseQueries.getResponsesForAnswer(answerId, interval);
	return results;
}

export async function getResponsesForClaimChecklist({
	checklistId,
	claimId,
	instanceId,
}: {
	checklistId: number;
	claimId: number;
	instanceId?: number;
}) {
	let results = await responseQueries.getResponsesForClaimChecklist(checklistId, claimId, instanceId);
	return results;
}

export async function upsertQuestionResponses({ params }: { params: object }) {
	const sampleResponse = params.responses?.[0] as QuestionResponse;
	if (!sampleResponse) throw new Error('Invalid responses');
	const newStatus = await responseQueries.upsertQuestionResponses(params);
	const visibleIds = await pageQueries.getVisiblePageInstances(sampleResponse.checklist_id, sampleResponse.claim_id);
	return {
		status: newStatus,
		visibleIds,
	};
}
