import { ExpressionWrapper, sql, SqlBool, Transaction } from 'kysely';
import { db } from '@/api/database/kysely';
import { ClaimStatus, SummarySegment } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { applyClientScope } from '../database/clientScoped';
import { DB } from '../database/types';
import { TRPCError } from '@trpc/server';

/**
 * Create a new checklist and optionally copy page instances from an existing checklist.
 *
 * @param ctx - request context
 * @param name - display name for the checklist
 * @param username - creator username
 * @param existingChecklistId - if provided, page instances are copied from this checklist
 * @returns the created checklist record
 */
export async function createChecklist(ctx: ProtectedContext, name: string, existingChecklistId?: number) {
	let newChecklist: any;
	await db.transaction().execute(async (trx) => {
		newChecklist = await trx
			.insertInto('checklist')
			.values({
				name,
				created_by: ctx.session.user.id,
				client_id: ctx.session.user.client_id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
		if (existingChecklistId) {
			await trx
				.insertInto('page_instance')
				.columns(['page_id', 'parent_instance_id', 'checklist_id', 'position', 'client_id', 'created_by'])
				.expression((eb) =>
					eb
						.selectFrom('page_instance')
						.select([
							'page_id',
							'parent_instance_id',
							eb.val(newChecklist.id).as('checklist_id'),
							'position',
							'client_id',
							eb.val(ctx.session.user.id).as('created_by'),
						])
						.where('checklist_id', '=', existingChecklistId)
				)
				.execute();
		}
	});
	return newChecklist;
}

/**
 * Permanently remove a checklist.
 *
 * @param ctx - request context
 * @param checklistId - identifier of the checklist
 */
export async function deleteChecklist(ctx: ProtectedContext, checklistId: number) {
	await db.deleteFrom('checklist').where('id', '=', checklistId).execute();
}

export async function modifyChecklistClaim(
	ctx: ProtectedContext,
	checklistId: number,
	claimId: number,
	status?: ClaimStatus,
	assignee?: string,
	trx?: Transaction<DB>
) {
	let assigneeId: string | undefined;
	if (assignee) {
		assigneeId = (
			await (trx ?? db)
				.selectFrom('users')
				.select('id')
				.where((eb) => eb.and([eb('email', '=', assignee), eb('client_id', '=', ctx.session.user.client_id)]))
				.executeTakeFirstOrThrow(() => new TRPCError({ code: 'BAD_REQUEST', message: 'Could not find user' }))
		).id;
	}
	await (trx ?? db)
		.updateTable('checklist_claim')
		.set({
			status,
			assignee: assigneeId,
			...(status !== ClaimStatus.SUBMITTED
				? {
						updated_by: ctx.session.user.id,
						updated_at: new Date(),
					}
				: {}),
			...(status === ClaimStatus.SUBMITTED
				? {
						submitted_by: ctx.session.user.id,
						submitted_at: new Date(),
					}
				: {}),
		})
		.where((eb) => eb.and([eb('checklist_id', '=', checklistId), eb('claim_id', '=', claimId)]))
		.execute();
}

/**
 * Retrieve a single checklist by id.
 *
 * @param ctx - request context
 * @param checklistId - checklist identifier
 * @returns the checklist record
 */
export async function getChecklist(ctx: ProtectedContext, checklistId: number) {
	return await applyClientScope(
		db.selectFrom('checklist').selectAll().where('id', '=', checklistId),
		ctx.session.user.client_id
	).executeTakeFirstOrThrow();
}

/**
 * List checklists with an optional search term.
 *
 * @param ctx - request context
 * @param searchTerm - optional name prefix filter
 * @returns array of checklists with page counts
 */
export async function getChecklists(ctx: ProtectedContext, searchTerm?: string) {
	let query = db
		.selectFrom('checklist')
		.innerJoin('page_instance', 'checklist.id', 'page_instance.checklist_id')
		.leftJoin('users', 'checklist.created_by', 'users.id')
		.selectAll('checklist')
		.select((eb) => [
			eb
				.case()
				.when('users.id', 'is', null)
				.then(null)
				.else(sql`concat(${eb.ref('users.last')}, ', ', ${eb.ref('users.first')})`)
				.end()
				.as('creator'),
		])
		.select(({ fn }) => fn.countAll().as('page_count'))
		.groupBy(['checklist.id', 'users.id'])
		.orderBy('checklist.id');
	if (searchTerm) {
		query = query.where((eb) => eb(sql`lower(${eb.ref('name')})`, 'like', `${searchTerm.toLowerCase()}%`));
	}
	return await applyClientScope(query, ctx.session.user.client_id, 'checklist').execute();
}

/**
 * Count published/unpublished checklists with client ID.
 *
 * @param ctx - request context
 * @param clientId - client ID
 * @returns published/unpublished count
 */
export async function getChecklistCount(ctx: ProtectedContext, clientId: string) {
	const results = await applyClientScope(
		db
			.selectFrom('checklist')
			.select(({ fn }) => ['published', fn.count('id').as('count')])
			.groupBy('published'),
		clientId
	).execute();
	let total = 0;
	const formattedResults = results.map((r) => {
		const count = parseInt(r.count.toString());
		total += count;
		return { ...r, count };
	});
	return {
		total,
		published: formattedResults.find((r) => r.published)?.count ?? 0,
		unpublished: formattedResults.find((r) => !r.published)?.count ?? 0,
	};
}

/**
 * Fetch the mapping row for a checklist and claim.
 *
 * @param ctx - request context
 * @param checklistId - checklist identifier
 * @param claimId - claim identifier
 * @returns the checklist_claim row
 */
export async function getChecklistClaim(ctx: ProtectedContext, checklistId: number, claimId: number) {
	return await applyClientScope(
		db
			.selectFrom('checklist_claim')
			.innerJoin('users', 'checklist_claim.assignee', 'users.id')
			.selectAll('checklist_claim')
			.select(['users.first', 'users.last', 'users.email'])
			.where((eb) => eb.and([eb('checklist_id', '=', checklistId), eb('claim_id', '=', claimId)])),
		ctx.session.user.client_id,
		'checklist_claim'
	).executeTakeFirst();
}

export async function getChecklistClaimProgress(ctx: ProtectedContext, checklistId: number, claimId: number) {
	const unlockedPages = db.withRecursive('unlocked_pages', (db) =>
		applyClientScope(
			db
				.selectFrom('page_instance')
				.select('id')
				.where('checklist_id', '=', checklistId)
				.where('parent_instance_id', 'is', null),
			ctx.session.user.client_id,
			'page_instance'
		).unionAll(
			db
				.selectFrom('unlocked_pages')
				.innerJoin('page_instance', 'page_instance.id', 'unlocked_pages.id')
				.innerJoin('page', 'page.id', 'page_instance.page_id')
				.innerJoin('question', 'question.page_id', 'page.id')
				.innerJoin('answer', 'answer.question_id', 'question.id')
				.innerJoin('question_response', (join) =>
					join
						.onRef('question_response.question_id', '=', 'question.id')
						.on('question_response.claim_id', '=', claimId)
						.on('question_response.checklist_id', '=', checklistId)
				)
				.innerJoin('question_response_answer', 'question_response_answer.response_id', 'question_response.id')
				.whereRef('question_response_answer.answer_id', '=', 'answer.id')
				.where('answer.calls_instance_id', 'is not', null)
				.select((eb) => eb.ref('answer.calls_instance_id').$notNull().as('id'))
		)
	);

	const result = await unlockedPages
		.selectFrom('unlocked_pages')
		.innerJoin('page_instance', 'page_instance.id', 'unlocked_pages.id')
		.innerJoin('page', 'page.id', 'page_instance.page_id')
		.innerJoin('question', 'question.page_id', 'page.id')
		.leftJoin('question_response', (join) =>
			join
				.onRef('question_response.question_id', '=', 'question.id')
				.on('question_response.claim_id', '=', claimId)
				.on('question_response.checklist_id', '=', checklistId)
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
						f('question_response_answer.id', 'is not', null),
					])
				)
				.as('answered_count'),
		])
		.executeTakeFirst();

	const answerCount = parseInt(result?.answered_count?.toString() ?? '0');
	const totalQuestionCount = parseInt(result?.total_question_count?.toString() ?? '0');
	return { answerCount, totalQuestionCount };
}

export async function getChecklistClaimStats(ctx: ProtectedContext, checklistId?: number, users?: string[]) {
	return await applyClientScope(
		db
			.selectFrom('checklist_claim')
			.innerJoin('checklist', 'checklist_claim.checklist_id', 'checklist.id')
			.innerJoin('claim', 'checklist_claim.claim_id', 'claim.id')
			.leftJoin('users', 'checklist_claim.assignee', 'users.id')
			.select(({ fn }) => [
				'checklist_claim.checklist_id',
				'checklist.name',
				'checklist_claim.status',
				fn.countAll().as('count'),
			])
			.where((eb) => {
				let andClause: ExpressionWrapper<DB, 'checklist_claim' | 'checklist' | 'claim', SqlBool>[] = [];
				if (checklistId) andClause.push(eb('checklist.id', '=', checklistId));
				if (users) andClause.push(eb('users.email', 'in', users));
				return eb.and(andClause);
			})
			.groupBy(['checklist_claim.checklist_id', 'checklist.name', 'claim.id', 'checklist_claim.status'])
			.orderBy(['checklist_claim.checklist_id', 'checklist.name', 'checklist_claim.status']),
		ctx.session.user.client_id,
		'checklist_claim'
	).execute();
}

/**
 * Summarize how a claim was answered across all questions on a checklist.
 *
 * @param ctx - request context
 * @param checklistId - checklist identifier
 * @param claimId - claim identifier
 * @returns totals for answered, known and unknown answers
 */
export async function getChecklistSummary(ctx: ProtectedContext, checklistId: number, claimId: number) {
	// Aggregate counts for a claim across all questions on the checklist
	return await applyClientScope(
		db
			.selectFrom('page_instance')
			.innerJoin('question', 'question.page_id', 'page_instance.page_id')
			.leftJoin('question_response', (join) =>
				join
					.onRef('question_response.question_id', '=', 'question.id')
					.onRef('question_response.instance_id', '=', 'page_instance.id')
					.onRef('question_response.checklist_id', '=', 'page_instance.checklist_id')
					.on('question_response.claim_id', '=', sql.lit(claimId))
			)
			.select([
				// All questions
				sql<number>`count(distinct question.id)`.as('total_questions'),
				// All answered questions
				sql<number>`count(distinct question_response.id)
                filter (
                where question_response.response_text is not null
                    or exists (
                        select 1 from question_response_answer
                        where question_response_answer.response_id = question_response.id
                    )
                )`.as('total_answered'),
				// All answers that do not include unknown
				sql<number>`count(distinct question_response.id)
                filter (
                    where exists (
                    select 1 from question_response_answer qra
                    join answer a on a.id = qra.answer_id
                    where qra.response_id = question_response.id
                        and lower(a.text) not like '%unknown%'
                        and lower(coalesce(question_response.response_text, '')) not like '%unknown%'
                    )
                )`.as('total_known'),
				// All answers that include unknown
				// We cannot simply calculate this with answered - known
				// because a multiple-choice question can have both known and unknown answers
				sql<number>`count(distinct question_response.id)
                filter (
                    where exists (
                    select 1 from question_response_answer qra
                    join answer a on a.id = qra.answer_id
                    where qra.response_id = question_response.id
                        and (lower(a.text) like '%unknown%' or lower(question_response.response_text) like '%unknown%')
                    )
                )`.as('total_unknown'),
			])
			.where('page_instance.checklist_id', '=', checklistId),
		ctx.session.user.client_id,
		'page_instance'
	).executeTakeFirstOrThrow();
}

/**
 * Fetch paginated rows summarizing answers for a claim or just the count.
 *
 * @param ctx - request context
 * @param checklistId - checklist to inspect
 * @param claimId - claim being summarized
 * @param segment - which portion of answers to return
 * @param mode - whether to return row data or just a count
 * @param limit - pagination size
 * @param offset - pagination offset
 */
export async function getChecklistSummaryDetail(
	ctx: ProtectedContext,
	{
		checklistId,
		claimId,
		segment,
		mode,
		limit,
		offset,
	}: {
		checklistId: number;
		claimId: number;
		segment: SummarySegment;
		mode: 'rows' | 'count';
		limit?: number;
		offset?: number;
	}
) {
	// Build the base query for pulling questions, answers and responses
	let query = applyClientScope(
		db
			.selectFrom('page_instance')
			.innerJoin('page', 'page.id', 'page_instance.page_id')
			.innerJoin('question', 'question.page_id', 'page.id')
			.leftJoin('question_response', (join) =>
				join
					.onRef('question_response.question_id', '=', 'question.id')
					.onRef('question_response.instance_id', '=', 'page_instance.id')
					.onRef('question_response.checklist_id', '=', 'page_instance.checklist_id')
					.on('question_response.claim_id', '=', sql.lit(claimId))
			)
			.where('page_instance.checklist_id', '=', checklistId),
		ctx.session.user.client_id,
		'page_instance'
	);

	// Join answers only when we care about answered or known/unknown stats
	if (segment !== SummarySegment.UNANSWERED) {
		query = query
			.leftJoin('question_response_answer', 'question_response_answer.response_id', 'question_response.id')
			.leftJoin('answer', 'answer.id', 'question_response_answer.answer_id');
	}

	switch (segment) {
		case SummarySegment.ANSWERED:
			query = query.where((qb) =>
				qb.or([
					qb('question_response.response_text', 'is not', null),
					qb('question_response_answer.id', 'is not', null),
				])
			);
			break;
		case SummarySegment.UNANSWERED:
			query = query.where('question_response.id', 'is', null);
			break;
		case SummarySegment.KNOWN:
			query = query.where((qb) =>
				qb.and([
					qb.or([
						qb('question_response.response_text', 'is not', null),
						qb('question_response_answer.id', 'is not', null),
					]),
					sql<boolean>`lower(coalesce(question_response.response_text, '')) not like '%unknown%'`,
					sql<boolean>`lower(answer.text) not like '%unknown%'`,
				])
			);
			break;
		case SummarySegment.UNKNOWN:
			query = query.where(
				sql<boolean>`lower(question_response.response_text) like '%unknown%' or lower(answer.text) like '%unknown%'`
			);
			break;
		default:
			break;
	}

	if (mode === 'count') {
		const result = await query
			.select(sql<number>`count(distinct question.id)`.as('count'))
			.executeTakeFirstOrThrow();
		return Number(result?.count ?? 0);
	} else {
		const baseSelect = [
			'page_instance.id as page_id',
			'page.title as page_title',
			'question.id as question_id',
			'question.text as question_text',
		];
		const fullSelect = [
			...baseSelect,
			'question_response.response_text as response_text',
			sql<string>`string_agg(distinct answer.text, ', ')`.as('answer_texts'),
		];
		const rows = await query
			.select(segment === SummarySegment.UNANSWERED ? baseSelect : fullSelect)
			.groupBy([
				'page_instance.id',
				'page.title',
				'question.id',
				'question.text',
				'question_response.response_text',
			])
			.orderBy('page_instance.id')
			.limit(limit ?? 50)
			.offset(offset ?? 0)
			.execute();

		return rows;
	}
}

/**
 * Retrieve the most recently opened claims for any checklist.
 *
 * @param ctx - request context
 * @returns list of recent checklist/claim pairs
 */
export async function getRecentChecklistClaims(ctx: ProtectedContext) {
	return await applyClientScope(
		db
			.selectFrom('checklist')
			.innerJoin('checklist_claim', 'checklist.id', 'checklist_claim.checklist_id')
			.innerJoin('claim', 'claim.id', 'checklist_claim.claim_id')
			.selectAll('checklist_claim')
			.select(['checklist.name as checklist_name', 'claim.claim_number', 'claim.client'])
			.orderBy('checklist_claim.last_opened desc')
			.limit(5),
		ctx.session.user.client_id,
		'checklist'
	).execute();
}

/**
 * Update checklist properties.
 *
 * @param ctx - request context
 * @param checklistId - checklist to update
 * @param params - fields to change
 * @returns the updated checklist
 */
export async function modifyChecklist(ctx: ProtectedContext, checklistId: number, params: object) {
	return await db
		.updateTable('checklist')
		.set({
			...params,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('id', '=', checklistId)
		.returningAll()
		.executeTakeFirstOrThrow();
}
