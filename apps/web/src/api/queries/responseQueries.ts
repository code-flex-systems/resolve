import { CompiledQuery, ExpressionWrapper, sql, SqlBool } from 'kysely';
import { getUpdatedPageStatus, isEqual, sqlFilters } from '@/api/utils/utils';
import * as pageQueries from '@/api/queries/pageQueries';
import { DateRange, DateRangeStrict, Interval, QuestionResponse, QuestionResponseAnswer } from '@/types/types';
import { ProtectedContext } from '@/server/trpc/trpc';
import { DB } from '../database/types';

/**
 * Count question responses for a specific claim checklist instance.
 * Only counts responses that have actual content (response_text, response_doc_id,
 * or selected answers that don't require an upload without one).
 *
 * @param ctx - request context
 * @param checklistId - checklist identifier
 * @param claimId - claim identifier
 * @param instanceId - page instance id
 * @returns number of answered responses
 */
export async function getResponseCount(
	ctx: ProtectedContext,
	checklistId: string,
	claimId: string,
	instanceId: string
) {
	const countRow = await ctx.db
		.selectFrom('question_response')
		.leftJoin('question_response_answer', 'question_response_answer.response_id', 'question_response.id')
		.select((eb) =>
			eb.fn
				.count('question_response.id')
				.distinct()
				.filterWhere((f) =>
					f.or([
						f('question_response.response_text', 'is not', null),
						f('question_response.response_doc_id', 'is not', null),
						f.and([
							f('question_response_answer.id', 'is not', null),
							sql<boolean>`not exists (
								select 1 from question_response_answer qra
								join answer a on a.id = qra.answer_id
								where qra.response_id = question_response.id
								and a.requires_upload = true
								and question_response.response_doc_id is null
							)`,
						]),
					])
				)
				.as('count')
		)
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
	answerId: string,
	filters: { claimId?: string; range: DateRangeStrict; checklistId?: string; users?: string[] },
	limit: number,
	offset: number
) {
	const results = await ctx.db
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
				.else(sql`concat(${eb.ref('users.first')}, ' ', ${eb.ref('users.last')})`)
				.end()
				.as('responder'),
		])
		.where('question_response.client_id', '=', ctx.session.user.client_id)
		.where((eb) => {
			const andClause = [eb('question_response_answer.answer_id', '=', answerId)];
			if (filters.claimId) andClause.push(eb('question_response.claim_id', '=', filters.claimId));
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
 * Gather all responses for a specific page instance keyed by question id.
 *
 * @param ctx - request context
 * @param checklistId - checklist identifier
 * @param claimId - claim identifier
 * @param instanceId - page instance id (required)
 * @returns map of question id to response
 */
export async function getResponsesForPageInstance(
	ctx: ProtectedContext,
	checklistId: string,
	claimId: string,
	instanceId: string
) {
	// Fetch all responses for the given page instance
	const responses = await ctx.db
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
			'question_response.response_doc_id',
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
		.where('question_response.checklist_id', '=', checklistId)
		.where('question_response.claim_id', '=', claimId)
		.where('question_response.instance_id', '=', instanceId)
		.groupBy('question_response.id')
		.orderBy('question_response.instance_id')
		.execute();
	// Build map keyed by question_id, excluding nulls
	type ResponseWithNonNullQuestionId = Omit<(typeof responses)[0], 'question_id'> & { question_id: string };
	const responseMap: Record<string, ResponseWithNonNullQuestionId> = {};
	responses.forEach((r) => {
		if (r.question_id !== null) {
			responseMap[r.question_id] = r as ResponseWithNonNullQuestionId;
		}
	});
	return responseMap;
}

export async function getResponseAuditLogs(
	ctx: ProtectedContext,
	filters: { checklistId?: string; claimId?: string; emails?: string[]; range?: DateRange; searchTerm?: string },
	limit: number,
	offset: number
) {
	// Use COUNT(*) OVER() window function for single-query count+data
	const rowsWithCount = await ctx.db
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
		})
		.selectAll('response_audit_logs')
		.select([
			'users.first',
			'users.last',
			'users.email',
			sql<string>`COUNT(*) OVER()`.as('total_count'),
		])
		.orderBy('created_at desc')
		.limit(limit)
		.offset(offset)
		.execute();

	const count = rowsWithCount.length > 0 ? parseInt(rowsWithCount[0].total_count ?? '0') : 0;
	// Strip total_count from rows before returning
	const rows = rowsWithCount.map(({ total_count, ...rest }) => rest);

	return { rows, count };
}

export async function getResponseAuditLogStats(
	ctx: ProtectedContext,
	filters: { range: DateRangeStrict; checklistId?: string; claimId?: string; users?: string[]; searchTerm?: string }
) {
	// Format dates as YYYY-MM-DD strings to avoid timezone issues with generate_series
	const startDate = filters.range[0].toISOString().split('T')[0];
	const endDate = filters.range[1].toISOString().split('T')[0];

	const query: CompiledQuery<{ activity_date: string; event_count: number }> = sql`
        select
            gs.day::date as activity_date,
            count(r.id)::int as event_count
        from generate_series(
            ${startDate}::date,
            ${endDate}::date,
            interval '1 day'
        ) as gs(day)
        left join response_audit_logs r on date(r.created_at) = gs.day::date
            and r.client_id = ${ctx.session.user.client_id}
            ${sqlFilters.eq('r.checklist_id', filters.checklistId)}
            ${sqlFilters.eq('r.claim_id', filters.claimId)}
            ${sqlFilters.inArray('r.user_id', filters.users)}
            ${sqlFilters.ilike('r.question_text', filters.searchTerm)}
        group by gs.day
        order by gs.day
    `.compile(ctx.db);
	return (await ctx.db.executeQuery(query))?.rows ?? [];
}

/**
 * Export all response audit logs matching filters (for CSV export).
 *
 * @param ctx - request context
 * @param filters - filters for audit logs
 * @returns all matching audit log entries
 */
export async function exportResponseAuditLogs(
	ctx: ProtectedContext,
	filters: { checklistId?: string; claimId?: string; emails?: string[]; range?: DateRange; searchTerm?: string }
) {
	const query = ctx.db
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
		})
		.selectAll('response_audit_logs')
		.select(['users.first', 'users.last', 'users.email'])
		.orderBy('created_at desc');

	return await query.execute();
}

/**
 * Insert or update multiple question responses and their selected answers.
 * Uses batched operations to minimize database round-trips.
 *
 * @param ctx - request context
 * @param responses - array of responses to upsert
 * @returns updated status for the associated page instance
 */
export async function upsertQuestionResponses(ctx: ProtectedContext, responses: QuestionResponse[]) {
	const sample = responses[0];
	const clientId = ctx.session.user.client_id;
	const userId = ctx.session.user.id;

	// 1. Batch fetch all existing responses
	const questionIds = responses.map((r) => r.question_id);
	const existingResponses = await ctx.db
		.selectFrom('question_response')
		.select(['id', 'question_id', 'response_text', 'response_doc_id', 'created_by', 'updated_by'])
		.where('question_response.client_id', '=', clientId)
		.where('checklist_id', '=', sample.checklist_id)
		.where('instance_id', '=', sample.instance_id)
		.where('claim_id', '=', sample.claim_id)
		.where('question_id', 'in', questionIds)
		.execute();

	// Create lookup map by question_id
	const existingByQuestionId = new Map(existingResponses.map((r) => [r.question_id, r]));
	const existingResponseIds = existingResponses.map((r) => r.id);

	// 2. Batch fetch all existing answers for those responses
	const existingAnswers =
		existingResponseIds.length > 0
			? await ctx.db
					.selectFrom('question_response_answer')
					.innerJoin('answer', 'answer.id', 'question_response_answer.answer_id')
					.select([
						'question_response_answer.response_id',
						'answer.id as answer_id',
						'answer.text as label',
						'question_response_answer.additional_info',
					])
					.where('question_response_answer.response_id', 'in', existingResponseIds)
					.execute()
			: [];

	// Group answers by response_id
	const answersByResponseId = new Map<string, typeof existingAnswers>();
	for (const ans of existingAnswers) {
		if (!answersByResponseId.has(ans.response_id)) {
			answersByResponseId.set(ans.response_id, []);
		}
		answersByResponseId.get(ans.response_id)!.push(ans);
	}

	// 3. Categorize responses into: unchanged (skip), deletes, upserts
	type DeleteInfo = {
		response: QuestionResponse;
		oldRow: (typeof existingResponses)[0];
		oldAnswerSnapshots: AuditAnswerSnapshot[];
	};
	type UpsertInfo = {
		response: QuestionResponse;
		oldRow: (typeof existingResponses)[0] | undefined;
		oldAnswerSnapshots: AuditAnswerSnapshot[];
		oldDocId: string | null;
		newDocId: string | null;
	};

	const toDelete: DeleteInfo[] = [];
	const toUpsert: UpsertInfo[] = [];
	const docsToUnlink: string[] = [];
	const docsToLink: { docId: string; questionId: string }[] = [];

	for (const response of responses) {
		const oldRow = existingByQuestionId.get(response.question_id);
		const oldAnswers = oldRow ? answersByResponseId.get(oldRow.id) ?? [] : [];

		const newText = response.response_text ?? null;
		const oldText = oldRow?.response_text ?? null;
		const newDocId = response.response_doc_id ?? null;
		// response_doc_id is a legacy integer column in the DB; normalize to string for comparison
		const oldDocId = oldRow?.response_doc_id != null ? String(oldRow.response_doc_id) : null;

		// Check if unchanged
		if (
			oldText === newText &&
			oldDocId === newDocId &&
			isEqual(
				oldAnswers.map((r) => ({ answer_id: r.answer_id, additional_info: r.additional_info ?? null })),
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
			!response.response_text &&
			!response.response_doc_id &&
			(!response.selected_answers || response.selected_answers.length === 0);

		if (shouldClear && oldRow) {
			toDelete.push({ response, oldRow, oldAnswerSnapshots });
		} else {
			toUpsert.push({ response, oldRow, oldAnswerSnapshots, oldDocId, newDocId });
			// Track doc changes
			if (oldDocId && oldDocId !== newDocId) {
				docsToUnlink.push(oldDocId);
			}
			if (newDocId && newDocId !== oldDocId) {
				docsToLink.push({ docId: newDocId, questionId: response.question_id });
			}
		}
	}

	// 4. Batch delete responses that need clearing
	if (toDelete.length > 0) {
		const deleteIds = toDelete.map((d) => d.oldRow.id);
		await ctx.db
			.deleteFrom('question_response')
			.where('id', 'in', deleteIds)
			.where('client_id', '=', clientId)
			.execute();
	}

	// 5. Batch upsert responses
	let savedResponses: {
		id: string;
		question_id: string | null;
		checklist_id: string;
		instance_id: string;
		claim_id: string;
		response_text: string | null;
		response_doc_id: string | null;
		created_by: string;
		updated_by: string | null;
		client_id: string;
		created_at: Date;
		updated_at: Date;
	}[] = [];
	if (toUpsert.length > 0) {
		const insertValues = toUpsert.map((u) => ({
			checklist_id: u.response.checklist_id,
			instance_id: u.response.instance_id,
			claim_id: u.response.claim_id,
			question_id: u.response.question_id,
			response_text: u.response.response_text ?? null,
			// response_doc_id is a legacy integer column; cast to any for type compatibility
			response_doc_id: (u.response.response_doc_id ?? null) as any,
			client_id: clientId as string,
			created_by: userId as string,
		}));
		savedResponses = (await ctx.db
			.insertInto('question_response')
			.values(insertValues as any)
			.onConflict((oc) =>
				oc.columns(['checklist_id', 'instance_id', 'claim_id', 'question_id']).doUpdateSet({
					response_text: sql`excluded.response_text`,
					response_doc_id: sql`excluded.response_doc_id`,
					updated_by: userId,
					updated_at: new Date(),
				})
			)
			.returningAll()
			.execute()) as typeof savedResponses;
	}

	// Create lookup for saved responses by question_id
	const savedByQuestionId = new Map(savedResponses.map((s) => [s.question_id, s]));

	// 6. Batch delete old answers for upserted responses
	const upsertResponseIds = savedResponses.map((s) => s.id);
	if (upsertResponseIds.length > 0) {
		await ctx.db.deleteFrom('question_response_answer').where('response_id', 'in', upsertResponseIds).execute();
	}

	// 7. Batch insert new answers
	const allNewAnswers: { response_id: string; answer_id: string; additional_info: string | null }[] = [];
	for (const u of toUpsert) {
		const saved = savedByQuestionId.get(u.response.question_id);
		if (saved && u.response.selected_answers?.length) {
			for (const a of u.response.selected_answers) {
				allNewAnswers.push({
					response_id: saved.id,
					answer_id: a.answer_id,
					additional_info: a.additional_info ?? null,
				});
			}
		}
	}
	if (allNewAnswers.length > 0) {
		await ctx.db.insertInto('question_response_answer').values(allNewAnswers).execute();
	}

	// 8. Batch unlink old docs
	if (docsToUnlink.length > 0) {
		await ctx.db
			.updateTable('doc')
			.set({ response_doc_id: null })
			.where('id', 'in', docsToUnlink)
			.where('client_id', '=', clientId)
			.execute();
	}

	// 9. Batch link new docs (each doc links to its response)
	for (const { docId, questionId } of docsToLink) {
		const saved = savedByQuestionId.get(questionId);
		if (saved) {
			await ctx.db
				.updateTable('doc')
				.set({ response_doc_id: saved.id })
				.where('id', '=', docId)
				.where('client_id', '=', clientId)
				.execute();
		}
	}

	// 10. Fetch question/page info for audit logs (batch)
	const allQuestionIds = [
		...toDelete.map((d) => d.response.question_id),
		...toUpsert.map((u) => u.response.question_id),
	];
	const questionPageInfo =
		allQuestionIds.length > 0
			? await ctx.db
					.selectFrom('question')
					.innerJoin('page', 'page.id', 'question.page_id')
					.select(['question.id as question_id', 'question.text as question_text', 'page.title as page_label'])
					.where('question.id', 'in', allQuestionIds)
					.execute()
			: [];
	const questionInfoMap = new Map(questionPageInfo.map((q) => [q.question_id, q]));

	// 11. Fetch new answer labels for audit logs (batch)
	const newAnswerLabels =
		allNewAnswers.length > 0
			? await ctx.db
					.selectFrom('question_response_answer')
					.innerJoin('answer', 'answer.id', 'question_response_answer.answer_id')
					.select([
						'question_response_answer.response_id',
						'answer.text as label',
						'question_response_answer.additional_info',
					])
					.where('question_response_answer.response_id', 'in', upsertResponseIds)
					.execute()
			: [];
	const newAnswerLabelsByResponseId = new Map<string, AuditAnswerSnapshot[]>();
	for (const ans of newAnswerLabels) {
		if (!newAnswerLabelsByResponseId.has(ans.response_id)) {
			newAnswerLabelsByResponseId.set(ans.response_id, []);
		}
		newAnswerLabelsByResponseId.get(ans.response_id)!.push({
			label: ans.label,
			additional_info: ans.additional_info,
		});
	}

	// 12. Batch insert audit logs
	// Note: response_audit_logs has checklist_id/claim_id as legacy integer columns,
	// but the main tables now use UUIDs. We cast to any for these FK mismatches.
	const auditEntries: any[] = [];

	// Add delete audit entries
	for (const d of toDelete) {
		const qInfo = questionInfoMap.get(d.response.question_id);
		const deleteUserId = (d.oldRow.updated_by ?? d.oldRow.created_by ?? userId) as string;
		auditEntries.push({
			client_id: clientId as string,
			user_id: deleteUserId,
			checklist_id: d.response.checklist_id,
			instance_id: d.response.instance_id,
			claim_id: d.response.claim_id,
			response_id: d.oldRow.id,
			question_id: d.response.question_id,
			question_text: qInfo?.question_text ?? '',
			page_label: qInfo?.page_label ?? '',
			action: 'delete',
			old_response_text: d.oldRow.response_text,
			new_response_text: null,
			old_answers: JSON.stringify(d.oldAnswerSnapshots),
			new_answers: JSON.stringify([]),
		});
	}

	// Add upsert audit entries
	for (const u of toUpsert) {
		const saved = savedByQuestionId.get(u.response.question_id);
		if (!saved) continue;
		const qInfo = questionInfoMap.get(u.response.question_id);
		const newSnapshots = newAnswerLabelsByResponseId.get(saved.id) ?? [];
		const upsertUserId = (saved.updated_by ?? saved.created_by ?? userId) as string;
		auditEntries.push({
			client_id: clientId as string,
			user_id: upsertUserId,
			checklist_id: saved.checklist_id,
			instance_id: saved.instance_id,
			claim_id: saved.claim_id,
			response_id: saved.id,
			question_id: u.response.question_id,
			question_text: qInfo?.question_text ?? '',
			page_label: qInfo?.page_label ?? '',
			action: u.oldRow ? 'update' : 'insert',
			old_response_text: u.oldRow?.response_text ?? null,
			new_response_text: saved.response_text,
			old_answers: JSON.stringify(u.oldAnswerSnapshots),
			new_answers: JSON.stringify(newSnapshots),
		});
	}

	if (auditEntries.length > 0) {
		await ctx.db.insertInto('response_audit_logs').values(auditEntries).execute();
	}

	// Update page instance status based on ALL responses for this page instance
	// Get total question count and answered count for this page instance
	const statusResult = await ctx.db
		.selectFrom('question')
		.innerJoin('page', 'page.id', 'question.page_id')
		.innerJoin('page_instance', 'page.id', 'page_instance.page_id')
		.leftJoin(
			'question_response',
			(join) =>
				join
					.onRef('question_response.question_id', '=', 'question.id')
					.on('question_response.instance_id', '=', sample.instance_id)
					.on('question_response.claim_id', '=', sample.claim_id)
					.on('question_response.checklist_id', '=', sample.checklist_id)
		)
		.leftJoin('question_response_answer', 'question_response_answer.response_id', 'question_response.id')
		.select((eb) => [
			eb.fn.count('question.id').distinct().as('total_question_count'),
			eb.fn
				.count('question_response.id')
				.distinct()
				.filterWhere((f) =>
					f.or([
						f('question_response.response_text', 'is not', null),
						f('question_response.response_doc_id', 'is not', null),
						f.and([
							f('question_response_answer.id', 'is not', null),
							sql<boolean>`not exists (
								select 1 from question_response_answer qra
								join answer a on a.id = qra.answer_id
								where qra.response_id = question_response.id
								and a.requires_upload = true
								and question_response.response_doc_id is null
							)`,
						]),
					])
				)
				.as('answered_count'),
			'page.version',
		])
		.where('page.client_id', '=', ctx.session.user.client_id)
		.where('page_instance.id', '=', sample.instance_id)
		.groupBy('page.version')
		.executeTakeFirstOrThrow();

	const totalQuestions = parseInt(statusResult.total_question_count?.toString() ?? '0');
	const answeredQuestions = parseInt(statusResult.answered_count?.toString() ?? '0');
	const updatedPageStatus = getUpdatedPageStatus(totalQuestions, answeredQuestions);

	await pageQueries.modifyPageInstanceStatus(ctx, {
		claimId: sample.claim_id,
		instanceIds: [sample.instance_id],
		newStatus: updatedPageStatus,
		templateVersion: statusResult.version,
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
	checklistId: string;
	instanceId: string;
	claimId: string;
	responseId: string;
	questionId: string;
	action: 'insert' | 'update' | 'delete';
	oldResponseText: string | null;
	newResponseText: string | null;
	oldAnswers: AuditAnswerSnapshot[];
	newAnswers: AuditAnswerSnapshot[];
	// AI training instrumentation (optional)
	decision_confidence?: number | null;
	decision_rationale?: string | null;
	expert_flag?: boolean;
}

/**
 * Inserts an audit log into response_audit_logs, snapshotting question text,
 * page label, response texts, and answer labels/info.
 */
export async function insertResponseAuditLog(trx: any, audit: ResponseAuditInput) {
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
			// AI training instrumentation (optional)
			decision_confidence:
				audit.decision_confidence !== undefined ? (audit.decision_confidence?.toString() ?? null) : undefined,
			decision_rationale: audit.decision_rationale !== undefined ? audit.decision_rationale : undefined,
			expert_flag: audit.expert_flag !== undefined ? audit.expert_flag : undefined,
		})
		.execute();
}
