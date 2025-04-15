import responseQueries from '../queries/responseQueries';

export default {
	getResponsesForClaimChecklist,
	upsertQuestionResponses,
};

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
