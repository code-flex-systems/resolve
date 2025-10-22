import { CompiledQuery, ExpressionWrapper, sql, SqlBool, Transaction } from 'kysely';
import { db } from '@/api/database/kysely';
import { getUpdatedPageStatus, isEqual } from '@/api/utils/utils';
import * as pageQueries from '@/api/queries/pageQueries';
import { DateRange, DateRangeStrict, Interval, QuestionResponse, QuestionResponseAnswer } from '@/types/types';
import { ProtectedContext } from '@/server/trpc/trpc';
import { DB } from '../database/types';

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
	const countRow = await db
		.selectFrom('question_response')
		.select(({ fn }) => fn.countAll().as('count'))
		.where('question_response.client_id', '=', ctx.session.user.client_id)
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

/**
 * Retrieve responses selecting a specific answer within an optional interval.
 *
 * @param ctx - request context
 * @param answerId - answer identifier
 * @param interval - optional date range
 * @returns list of answer responses
 */
export async function getResponsesForAnswer(
	ctx: ProtectedContext,
	answerId: number,
	filters: { range: DateRangeStrict; checklistId?: number; users?: string[] },
	limit: number,
	offset: number
) {
	const results = await db
		.selectFrom('question_response')
		.innerJoin('question_response_answer', 'question_response.id', 'question_response_answer.response_id')
		.innerJoin('claim', 'question_response.claim_id', 'claim.id')
		.leftJoin('users', 'users.id', 'question_response.created_by')
		.select((eb) => [
			'question_response.id',
			'question_response.created_at',
			'question_response_answer.additional_info',
			'claim.claim_number',
			'claim.client',
			eb
				.case()
				.when('users.id', 'is', null)
				.then(null)
				.else(sql`concat(${eb.ref('users.last')}, ', ', ${eb.ref('users.first')})`)
				.end()
				.as('responder'),
		])
		.where('question_response.client_id', '=', ctx.session.user.client_id)
		.where((eb) => {
			const andClause = [eb('question_response_answer.answer_id', '=', answerId)];
			if (filters.users?.length) andClause.push(eb('question_response.created_by', 'in', filters.users));
			if (filters.range && filters.range.some((d) => !!d)) {
				if (filters.range[0]) {
					andClause.push(eb('question_response.created_at', '>=', filters.range[0]));
				}
				if (filters.range[1]) {
					andClause.push(eb('question_response.created_at', '<=', filters.range[1]));
				}
			} else {
				andClause.push(
					eb('question_response.created_at', '>=', sql`CURRENT_DATE - INTERVAL '30 days'`.$castTo<Date>())
				);
			}
			return eb.and(andClause);
		})
		.orderBy('question_response.created_at desc')
		.limit(limit)
		.offset(offset)
		.execute();
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
	const responses: QuestionResponse[] = await db
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
		.where('question_response.client_id', '=', ctx.session.user.client_id)
		.where((eb) => {
			const andClause = [
				eb('question_response.checklist_id', '=', checklistId),
				eb('question_response.claim_id', '=', claimId),
			];
			if (instanceId) andClause.push(eb('question_response.instance_id', '=', instanceId));
			return eb.and(andClause);
		})
		.groupBy('question_response.id')
		.orderBy('question_response.instance_id')
		.execute();
	const responseMap: Record<number, QuestionResponse> = {};
	responses.forEach((r) => {
		responseMap[r.question_id] = r;
	});
	return responseMap;
}

export async function getResponseAuditLogs(
	ctx: ProtectedContext,
	filters: { checklistId?: number; claimId?: number; emails?: string[]; range?: DateRange; searchTerm?: string },
	limit: number,
	offset: number
) {
	const baseQuery = db
		.selectFrom('response_audit_logs')
		.leftJoin('users', 'response_audit_logs.user_id', 'users.id')
		.where('response_audit_logs.client_id', '=', ctx.session.user.client_id)
		.where((eb) => {
			const whereClause: ExpressionWrapper<DB, 'response_audit_logs' | 'users', SqlBool>[] = [];
			if (filters.checklistId) whereClause.push(eb('response_audit_logs.checklist_id', '=', filters.checklistId));
			if (filters.claimId) whereClause.push(eb('response_audit_logs.claim_id', '=', filters.claimId));
			if (filters.emails?.length) whereClause.push(eb('users.email', 'in', filters.emails));
			if (filters.range && filters.range.some((d) => !!d)) {
				if (filters.range[0]) {
					whereClause.push(eb('response_audit_logs.created_at', '>=', filters.range[0]));
				}
				if (filters.range[1]) {
					whereClause.push(eb('response_audit_logs.created_at', '<=', filters.range[1]));
				}
			}
			if (filters.searchTerm) whereClause.push(eb('question_text', 'ilike', `%${filters.searchTerm}%`));
			return eb.and(whereClause);
		});
	const dataQuery = baseQuery
		.selectAll('response_audit_logs')
		.select(['users.first', 'users.last', 'users.email'])
		.orderBy('created_at desc')
		.limit(limit)
		.offset(offset);
	const countQuery = baseQuery.select(({ fn }) => fn.countAll().as('count'));
	const [data, count] = await Promise.all([dataQuery.execute(), countQuery.executeTakeFirst()]);
	return {
		rows: data,
		count: parseInt(count?.count?.toString() ?? '0'),
	};
}

export async function getResponseAuditLogStats(
	ctx: ProtectedContext,
	filters: { range: DateRangeStrict; checklistId?: number; claimId?: number; users?: string[]; searchTerm?: string }
) {
	const query: CompiledQuery<{ activity_date: string; event_count: number }> = sql`
        select
            gs.day::date as activity_date,
            count(r.id)::int as event_count
        from generate_series(
            ${filters.range[0]},
            ${filters.range[1]},
            interval '1 day'
        ) as gs(day)
        left join response_audit_logs r on date(r.created_at) = gs.day
            and r.client_id = ${ctx.session.user.client_id}
            ${sql.raw(filters.checklistId ? `and r.checklist_id = ${filters.checklistId}` : '')}
            ${sql.raw(filters.claimId ? `and r.claim_id = ${filters.claimId}` : '')}
            ${sql.raw(filters.users?.length ? `and r.user_id in (${filters.users.map((u) => `'${u}'`)})` : '')}
            ${sql.raw(filters.searchTerm ? `and r.question_text ilike '%${filters.searchTerm}%'` : '')}
        group by gs.day
    `.compile(db);
	return (await db.executeQuery(query))?.rows ?? [];
}

/**
 * Insert or update multiple question responses and their selected answers.
 *
 * @param ctx - request context
 * @param responses - array of responses to upsert
 * @returns updated status for the associated page instance
 */
export async function upsertQuestionResponses(
	ctx: ProtectedContext,
	responses: QuestionResponse[],
	trx: Transaction<DB>
) {
	const updatedPageStatus = getUpdatedPageStatus(
		responses.length,
		responses.filter((r) => !!r.response_text || r.selected_answers.length).length
	);

	for (const response of responses) {
		// Fetch existing response if any
		const oldRow = await trx
			.selectFrom('question_response')
			.select(['id', 'response_text', 'created_by', 'updated_by'])
			.where('question_response.client_id', '=', ctx.session.user.client_id)
			.where('checklist_id', '=', response.checklist_id)
			.where('instance_id', '=', response.instance_id)
			.where('claim_id', '=', response.claim_id)
			.where('question_id', '=', response.question_id)
			.executeTakeFirst();

		// Gather snapshots for logging
		const oldAnswers = oldRow
			? await trx
					.selectFrom('question_response_answer')
					.innerJoin('answer', 'answer.id', 'question_response_answer.answer_id')
					.select([
						'answer.id as answer_id',
						'answer.text as label',
						'question_response_answer.additional_info',
					])
					.where('question_response_answer.response_id', '=', oldRow.id)
					.execute()
			: [];

		// 3) build the “new” shape for comparison
		const newText = response.response_text ?? null;
		const oldText = oldRow?.response_text ?? null;

		// 4) if nothing changed, skip the rest
		if (
			oldText === newText &&
			isEqual(
				oldAnswers.map((r) => ({
					answer_id: r.answer_id,
					additional_info: r.additional_info ?? null,
				})),
				(response.selected_answers ?? []).map((r) => ({
					answer_id: r.answer_id,
					additional_info: r.additional_info ?? null,
				}))
			)
		) {
			continue;
		}

		const oldAnswerSnapshots: AuditAnswerSnapshot[] = oldAnswers.map((a) => ({
			label: a.label,
			additional_info: a.additional_info,
		}));

		const shouldClear =
			!response.response_text && (!response.selected_answers || response.selected_answers.length === 0);

		if (shouldClear && oldRow) {
			// Log the delete action (no new data)
			await insertResponseAuditLog(trx, {
				responseId: oldRow.id,
				clientId: ctx.session.user.client_id,
				userId: oldRow.updated_by ?? oldRow.created_by,
				checklistId: response.checklist_id,
				instanceId: response.instance_id,
				claimId: response.claim_id,
				questionId: response.question_id,
				action: 'delete',
				oldResponseText: oldRow.response_text,
				newResponseText: null,
				oldAnswers: oldAnswerSnapshots,
				newAnswers: [],
			});

			// Remove the response and its answers
			await trx.deleteFrom('question_response').where('id', '=', oldRow.id).execute();
			continue;
		}

		// Perform insert or update
		const [saved] = await trx
			.insertInto('question_response')
			.values({
				checklist_id: response.checklist_id,
				instance_id: response.instance_id,
				claim_id: response.claim_id,
				question_id: response.question_id,
				response_text: response.response_text ?? null,
				client_id: ctx.session.user.client_id,
				created_by: ctx.session.user.id,
			})
			.onConflict((oc) =>
				oc.columns(['checklist_id', 'instance_id', 'claim_id', 'question_id']).doUpdateSet({
					response_text: response.response_text ?? null,
					updated_by: ctx.session.user.id,
					updated_at: new Date(),
				})
			)
			.returningAll()
			.execute();

		// Delete existing answers
		await trx.deleteFrom('question_response_answer').where('response_id', '=', saved.id).execute();

		// Insert new answers if provided
		if (response?.selected_answers?.length) {
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

		const newAnswerSnapshots: AuditAnswerSnapshot[] = await trx
			.selectFrom('question_response_answer')
			.innerJoin('answer', 'answer.id', 'question_response_answer.answer_id')
			.select(['answer.text as label', 'question_response_answer.additional_info'])
			.where('question_response_answer.response_id', '=', saved.id)
			.execute();

		// Log the change
		await insertResponseAuditLog(trx, {
			responseId: saved.id,
			clientId: ctx.session.user.client_id,
			userId: saved.updated_by ?? saved.created_by,
			checklistId: saved.checklist_id,
			instanceId: saved.instance_id,
			claimId: saved.claim_id,
			questionId: saved.question_id,
			action: oldRow ? 'update' : 'insert',
			oldResponseText: oldRow?.response_text ?? null,
			newResponseText: saved.response_text,
			oldAnswers: oldAnswerSnapshots,
			newAnswers: newAnswerSnapshots,
		});
	}

	// Update page instance status
	const sample = responses[0];
	const template = await trx
		.selectFrom('page')
		.innerJoin('page_instance', 'page.id', 'page_instance.page_id')
		.select('version')
		.where('page.client_id', '=', ctx.session.user.client_id)
		.where('page_instance.id', '=', sample.instance_id)
		.executeTakeFirstOrThrow();

	await pageQueries.modifyPageInstanceStatus(ctx, {
		claimId: sample.claim_id,
		instanceIds: [sample.instance_id],
		newStatus: updatedPageStatus,
		templateVersion: template.version,
		trx,
	});

	return updatedPageStatus;
}

// private functions

export interface AuditAnswerSnapshot {
	label: string;
	additional_info: string | null;
}

export interface ResponseAuditInput {
	clientId: string;
	userId: string;
	checklistId: number;
	instanceId: number;
	claimId: number;
	responseId: number;
	questionId: number;
	action: 'insert' | 'update' | 'delete';
	oldResponseText: string | null;
	newResponseText: string | null;
	oldAnswers: AuditAnswerSnapshot[];
	newAnswers: AuditAnswerSnapshot[];
}

/**
 * Inserts an audit log into response_audit_logs, snapshotting question text,
 * page label, response texts, and answer labels/info.
 */
export async function insertResponseAuditLog(trx: Transaction<DB>, audit: ResponseAuditInput) {
	// 1) Fetch question text & page label
	const qPage = await trx
		.selectFrom('question')
		.innerJoin('page', 'page.id', 'question.page_id')
		.select(['question.text as question_text', 'page.title as page_label'])
		.where('question.id', '=', audit.questionId)
		.executeTakeFirstOrThrow();

	// 2) Prepare JSONB blobs
	const oldAnswersJson = JSON.stringify(audit.oldAnswers);
	const newAnswersJson = JSON.stringify(audit.newAnswers);

	// 3) Insert into audit table
	await trx
		.insertInto('response_audit_logs')
		.values({
			client_id: audit.clientId,
			user_id: audit.userId,
			checklist_id: audit.checklistId,
			instance_id: audit.instanceId,
			claim_id: audit.claimId,
			response_id: audit.responseId,
			question_id: audit.questionId,
			question_text: qPage.question_text,
			page_label: qPage.page_label,
			action: audit.action,
			old_response_text: audit.oldResponseText,
			new_response_text: audit.newResponseText,
			old_answers: oldAnswersJson,
			new_answers: newAnswersJson,
		})
		.execute();
}
