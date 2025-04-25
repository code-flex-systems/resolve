import pageQueries from '../queries/pageQueries';
import responseQueries from '../queries/responseQueries';
import { QuestionResponse } from '../types/types';

export default {
	getResponsesForAnswer,
	getResponsesForClaimChecklist,
	upsertQuestionResponses,
};

async function getResponsesForAnswer(answerId: number) {
	try {
		let results = await responseQueries.getResponsesForAnswer(answerId);
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
		await responseQueries.upsertQuestionResponses(params);
		return await pageQueries.getVisiblePageInstances(sampleResponse.checklist_id, sampleResponse.claim_id);
	} catch (e) {
		console.error(e);
	}
}
