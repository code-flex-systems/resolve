import { sql } from 'kysely';
import { db } from '@/api/database/kysely';
import { getUpdatedPageStatus } from '@/api/utils/utils';
import * as pageQueries from '@/api/queries/pageQueries';
import { Interval, QuestionResponse, QuestionResponseAnswer } from '@/types/types';
import { ProtectedContext } from '@/server/trpc/trpc';
import { applyClientScope } from '../database/clientScoped';

/**
 * Count question responses for a specific claim checklist instance.
 *
 * @param ctx - request context
 * @param checklistId - checklist identifier
 * @param claimId - claim identifier
 * @param instanceId - page instance id
 * @returns number of responses
 */
export async function getResponseCount(
	ctx: ProtectedContext,
	checklistId: number,
	claimId: number,
	instanceId: number
) {
	const countRow = await applyClientScope(
		db
			.selectFrom('question_response')
			.select(({ fn }) => fn.countAll().as('count'))
			.where((eb) =>
				eb.and([
					eb('checklist_id', '=', checklistId),
					eb('claim_id', '=', claimId),
					eb('instance_id', '=', instanceId),
				])
			),
		ctx.session.user.client_id
	).executeTakeFirstOrThrow();
	return parseInt(countRow.count?.toString() ?? '0');
}

/**
 * Retrieve responses selecting a specific answer within an optional interval.
 *
 * @param ctx - request context
 * @param answerId - answer identifier
 * @param interval - optional date range
 * @returns list of answer responses
 */
export async function getResponsesForAnswer(ctx: ProtectedContext, answerId: number, interval?: Interval<string>) {
	let results = await applyClientScope(
		db
			.selectFrom('question_response')
			.innerJoin('question_response_answer', 'question_response.id', 'question_response_answer.response_id')
			.innerJoin('claim', 'question_response.claim_id', 'claim.id')
			.select([
				'question_response.id',
				'question_response.created_at',
				'question_response_answer.additional_info',
				'claim.claim_number',
				'claim.client',
			])
			.where((eb) => {
				let andClause = [eb('question_response_answer.answer_id', '=', answerId)];
				if (interval) {
					if (interval.from)
						andClause.push(eb('question_response.created_at', '>=', new Date(interval.from)));
					if (interval.to) andClause.push(eb('question_response.created_at', '<=', new Date(interval.to)));
				} else {
					andClause.push(
						eb('question_response.created_at', '>=', sql`CURRENT_DATE - INTERVAL '30 days'`.$castTo<Date>())
					);
				}
				return eb.and(andClause);
			})
			.orderBy('question_response.created_at desc'),
		ctx.session.user.client_id,
		'question_response'
	).execute();
	return results;
}

/**
 * Gather all responses for a claim on a checklist keyed by question id.
 *
 * @param ctx - request context
 * @param checklistId - checklist identifier
 * @param claimId - claim identifier
 * @param instanceId - optional instance filter
 * @returns map of question id to response
 */
export async function getResponsesForClaimChecklist(
	ctx: ProtectedContext,
	checklistId: number,
	claimId: number,
	instanceId?: number
) {
	// Fetch all responses for the given claim and checklist
	let responses: QuestionResponse[] = await applyClientScope(
		db
			.selectFrom('question_response')
			.innerJoin('page_instance', 'page_instance.id', 'question_response.instance_id')
			.leftJoin('question_response_answer', 'question_response_answer.response_id', 'question_response.id')
			.select((eb) => [
				'question_response.id',
				'question_response.checklist_id',
				'question_response.instance_id',
				'question_response.claim_id',
				'question_response.question_id',
				'question_response.response_text',
				'question_response.created_at',
				'question_response.updated_at',
				sql`jsonb_agg(jsonb_build_object(
                    'answer_id', ${eb.ref('question_response_answer.answer_id')},
                    'additional_info', ${eb.ref('question_response_answer.additional_info')}
                )) filter (where ${eb.ref('question_response_answer.id')} is not null)`
					.$castTo<QuestionResponseAnswer[]>()
					.as('selected_answers'),
			])
			.where((eb) => {
				let andClause = [
					eb('question_response.checklist_id', '=', checklistId),
					eb('question_response.claim_id', '=', claimId),
				];
				if (instanceId) andClause.push(eb('question_response.instance_id', '=', instanceId));
				return eb.and(andClause);
			})
			.groupBy('question_response.id')
			.orderBy('question_response.instance_id'),
		ctx.session.user.client_id,
		'question_response'
	).execute();
	const responseMap: Record<number, QuestionResponse> = {};
	responses.forEach((r) => {
		responseMap[r.question_id] = r;
	});
	return responseMap;
}

/**
 * Insert or update multiple question responses and their selected answers.
 *
 * @param ctx - request context
 * @param responses - array of responses to upsert
 * @returns updated status for the associated page instance
 */
export async function upsertQuestionResponses(ctx: ProtectedContext, responses: QuestionResponse[]) {
	const updatedPageStatus = getUpdatedPageStatus(
		responses.length,
		responses.filter((r) => !!r.response_text || r.selected_answers.length).length
	);

	// Insert or update each response and associated answers within a single transaction
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
					client_id: ctx.session.user.client_id,
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
							client_id: ctx.session.user.client_id,
						}))
					)
					.execute();
			}
		}

		// Update page instance status
		const sampleResponse = responses[0];
		let template = await applyClientScope(
			trx
				.selectFrom('page')
				.innerJoin('page_instance', 'page.id', 'page_instance.page_id')
				.select('version')
				.where('page_instance.id', '=', sampleResponse.instance_id),
			ctx.session.user.client_id,
			'page'
		).executeTakeFirstOrThrow();
		await pageQueries.modifyPageInstanceStatus(ctx, {
			claimId: sampleResponse.claim_id,
			instanceIds: [sampleResponse.instance_id],
			newStatus: updatedPageStatus,
			templateVersion: template.version,
			trx,
		});
	});

	return updatedPageStatus;
}
