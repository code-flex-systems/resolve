import responseQueries from '../queries/responseQueries';

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
		await responseQueries.upsertQuestionResponses(params);
	} catch (e) {
		console.error(e);
	}
}
