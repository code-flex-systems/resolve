import { PageInstanceStatus } from '../config/enums';
import pageQueries from '../queries/pageQueries';
import questionQueries from '../queries/questionQueries';
import responseQueries from '../queries/responseQueries';
import { Interval, QuestionResponse } from '../types/types';
import { getUpdatedPageStatus } from '../utils/utils';

export default {
	evaluateResponses,
	getResponsesForAnswer,
	getResponsesForClaimChecklist,
	upsertQuestionResponses,
};

async function evaluateResponses(checklistId: number, claimId: number, instanceId: number) {
	try {
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
	} catch (e) {
		console.error(e);
	}
}

async function getResponsesForAnswer(answerId: number, interval?: Interval<string>) {
	try {
		let results = await responseQueries.getResponsesForAnswer(answerId, interval);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function getResponsesForClaimChecklist(checklistId: number, claimId: number, instanceId?: number) {
	try {
		let results = await responseQueries.getResponsesForClaimChecklist(checklistId, claimId, instanceId);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function upsertQuestionResponses(params: object) {
	try {
		const sampleResponse = params.responses?.[0] as QuestionResponse;
		if (!sampleResponse) throw new Error('Invalid responses');
		const newStatus = await responseQueries.upsertQuestionResponses(params);
		const visibleIds = await pageQueries.getVisiblePageInstances(
			sampleResponse.checklist_id,
			sampleResponse.claim_id
		);
		return {
			status: newStatus,
			visibleIds,
		};
	} catch (e) {
		console.error(e);
	}
}
