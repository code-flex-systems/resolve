import { sql } from 'kysely';
import { db } from '../database/kysely';
import { QuestionResponse } from '../types/types';
import { QuestionResponseAnswer } from '../types/types';
import { getUpdatedPageStatus } from '../utils/utils';
import pageQueries from './pageQueries';

export default {
	getResponseCount,
	getResponsesForAnswer,
	getResponsesForClaimChecklist,
	upsertQuestionResponses,
};

async function getResponseCount(checklistId: number, claimId: number, instanceId: number) {
	try {
		const countRow = await db
			.selectFrom('question_response')
			.select(({ fn }) => fn.countAll().as('count'))
			.where((eb) =>
				eb.and([
					eb('checklist_id', '=', checklistId),
					eb('claim_id', '=', claimId),
					eb('instance_id', '=', instanceId),
				])
			)
			.executeTakeFirst();
		return parseInt(countRow?.count?.toString() ?? '0');
	} catch (e) {
		console.error(e);
	}
}

async function getResponsesForAnswer(answerId: number) {
	try {
		let results = await db
			.selectFrom('question_response as qr')
			.innerJoin('question_response_answer as qra', 'qr.id', 'qra.response_id')
			.innerJoin('claim as c', 'qr.claim_id', 'c.id')
			.select(['qr.id', 'qr.created_at', 'qra.additional_info', 'c.claim_number', 'c.client'])
			.where('qra.answer_id', '=', answerId)
			.orderBy('qr.created_at desc')
			.execute();
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function getResponsesForClaimChecklist(checklistId: number, claimId: number, instanceId?: number) {
	try {
		let responses: QuestionResponse[] = await db
			.selectFrom('question_response as r')
			.innerJoin('page_instance as p', 'p.id', 'r.instance_id')
			.select([
				'r.id',
				'r.checklist_id',
				'r.instance_id',
				'r.claim_id',
				'r.question_id',
				'r.response_text',
				'r.created_at',
				'r.updated_at',
				sql`jsonb_agg(jsonb_build_object(
                    'answer_id', ra.answer_id,
                    'additional_info', ra.additional_info
                )) filter (where ra.id is not null)`
					.$castTo<QuestionResponseAnswer[]>()
					.as('selected_answers'),
			])
			.leftJoin('question_response_answer as ra', 'ra.response_id', 'r.id')
			.where((eb) => {
				let andClause = [eb('r.checklist_id', '=', checklistId), eb('r.claim_id', '=', claimId)];
				if (instanceId) andClause.push(eb('r.instance_id', '=', instanceId));
				return eb.and(andClause);
			})
			.groupBy('r.id')
			.orderBy('r.instance_id')
			.execute();
		const responseMap: Record<number, QuestionResponse> = {};
		responses.forEach((r) => {
			responseMap[r.question_id] = r;
		});
		return responseMap;
	} catch (e) {
		console.error(e);
	}
}

async function upsertQuestionResponses(params: { responses: QuestionResponse[] }) {
	try {
		const { responses } = params;
		const updatedPageStatus = getUpdatedPageStatus(
			responses.length,
			responses.filter((r) => !!r.response_text || r.selected_answers.length).length
		);

		await db.transaction().execute(async (trx) => {
			for (const response of responses) {
				const shouldClear =
					!response.response_text && (!response.selected_answers || response.selected_answers.length === 0);

				if (shouldClear) {
					await trx
						.deleteFrom('question_response')
						.where('checklist_id', '=', response.checklist_id)
						.where('instance_id', '=', response.instance_id)
						.where('claim_id', '=', response.claim_id)
						.where('question_id', '=', response.question_id)
						.execute();
					continue;
				}

				const [saved] = await trx
					.insertInto('question_response')
					.values({
						checklist_id: response.checklist_id,
						instance_id: response.instance_id,
						claim_id: response.claim_id,
						question_id: response.question_id,
						response_text: response.response_text ?? null,
					})
					.onConflict((oc) =>
						oc.columns(['checklist_id', 'instance_id', 'claim_id', 'question_id']).doUpdateSet({
							response_text: response.response_text ?? null,
							updated_at: new Date(),
						})
					)
					.returningAll()
					.execute();

				await trx.deleteFrom('question_response_answer').where('response_id', '=', saved.id).execute();

				if (response.selected_answers?.length) {
					await trx
						.insertInto('question_response_answer')
						.values(
							response.selected_answers.map((a) => ({
								response_id: saved.id,
								answer_id: a.answer_id,
								additional_info: a.additional_info ?? null,
							}))
						)
						.execute();
				}
			}

			// Update page instance status
			const sampleResponse = responses[0];
			let template = await trx
				.selectFrom('page as p')
				.innerJoin('page_instance as i', 'p.id', 'i.page_id')
				.select('version')
				.where('i.id', '=', sampleResponse.instance_id)
				.executeTakeFirstOrThrow();
			await pageQueries.modifyPageInstanceStatus({
				claimId: sampleResponse.claim_id,
				instanceIds: [sampleResponse.instance_id],
				newStatus: updatedPageStatus,
				templateVersion: template.version,
				trx,
			});
		});

		return updatedPageStatus;
	} catch (e) {
		console.error(e);
	}
}
