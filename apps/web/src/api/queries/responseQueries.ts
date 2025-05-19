import { sql } from 'kysely';
import { db } from '@/api/database/kysely';
import { getUpdatedPageStatus } from '@/api/utils/utils';
import * as pageQueries from '@/api/queries/pageQueries';
import { Interval, QuestionResponse, QuestionResponseAnswer } from '@/types/types';

export async function getResponseCount(checklistId: number, claimId: number, instanceId: number) {
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
		.executeTakeFirstOrThrow();
	return parseInt(countRow.count?.toString() ?? '0');
}

export async function getResponsesForAnswer(answerId: number, interval?: Interval<string>) {
	let results = await db
		.selectFrom('question_response as qr')
		.innerJoin('question_response_answer as qra', 'qr.id', 'qra.response_id')
		.innerJoin('claim as c', 'qr.claim_id', 'c.id')
		.select(['qr.id', 'qr.created_at', 'qra.additional_info', 'c.claim_number', 'c.client'])
		.where((eb) => {
			let andClause = [eb('qra.answer_id', '=', answerId)];
			if (interval) {
				if (interval.from) andClause.push(eb('qr.created_at', '>=', new Date(interval.from)));
				if (interval.to) andClause.push(eb('qr.created_at', '<=', new Date(interval.to)));
			} else {
				andClause.push(eb('qr.created_at', '>=', sql`CURRENT_DATE - INTERVAL '30 days'`.$castTo<Date>()));
			}
			return eb.and(andClause);
		})
		.orderBy('qr.created_at desc')
		.execute();
	return results;
}

export async function getResponsesForClaimChecklist(checklistId: number, claimId: number, instanceId?: number) {
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
}

export async function upsertQuestionResponses(responses: QuestionResponse[]) {
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
}
