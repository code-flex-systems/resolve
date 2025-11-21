import { ExpressionWrapper, sql, SqlBool } from 'kysely';
import { ClaimStatus, SummarySegment } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { DB } from '../database/types';
import { TRPCError } from '@trpc/server';
import { DateRangeStrict } from '@/types/types';
import config from '@/config/config';
import type { ChecklistParams } from '@/schemas/checklistSchemas';

const MAX_TREE_DEPTH = 30;

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
	const newChecklist = await ctx.db
		.insertInto('checklist')
		.values({
			name,
			created_by: ctx.session.user.id,
			client_id: ctx.session.user.client_id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	if (existingChecklistId) {
		await ctx.db
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

	return newChecklist;
}

/**
 * Fetch a checklist for logging before deletion.
 *
 * @param ctx - request context
 * @param checklistId - checklist identifier
 * @returns the checklist details
 */
export async function getChecklistForDeletion(ctx: ProtectedContext, checklistId: number) {
	return await ctx.db
		.selectFrom('checklist')
		.select(['id', 'name', 'published'])
		.where('id', '=', checklistId)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

/**
 * Permanently remove a checklist.
 *
 * @param ctx - request context
 * @param checklistId - identifier of the checklist
 */
export async function deleteChecklist(ctx: ProtectedContext, checklistId: number) {
	await ctx.db.deleteFrom('checklist').where('id', '=', checklistId).execute();
}

export async function modifyChecklistClaim(
	ctx: ProtectedContext,
	checklistId: number,
	claimId: number,
	status?: ClaimStatus,
	assignee?: string
) {
	let assigneeId: string | undefined;
	if (assignee) {
		assigneeId = (
			await ctx.db
				.selectFrom('users')
				.select('id')
				.where((eb) => eb.and([eb('email', '=', assignee), eb('client_id', '=', ctx.session.user.client_id)]))
				.executeTakeFirstOrThrow(() => new TRPCError({ code: 'BAD_REQUEST', message: 'Could not find user' }))
		).id;
	}
	await ctx.db
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
 * Admins can see all checklists, regular users can only see published checklists.
 *
 * @param ctx - request context
 * @param checklistId - checklist identifier
 * @returns the checklist record
 */
export async function getChecklist(ctx: ProtectedContext, checklistId: number) {
	const isAdmin = ctx.session.user.role === config.ROLES.ADMIN || ctx.session.user.role === config.ROLES.SUPER_ADMIN;
	return await ctx.db
		.selectFrom('checklist')
		.selectAll()
		.where('checklist.client_id', '=', ctx.session.user.client_id)
		.where((eb) => (isAdmin ? eb.lit(true) : eb('checklist.published', '=', true)))
		.where('id', '=', checklistId)
		.executeTakeFirstOrThrow();
}

/**
 * List checklists with an optional search term.
 * Admins can see all checklists, regular users can only see published checklists.
 *
 * @param ctx - request context
 * @param searchTerm - optional name prefix filter
 * @returns array of checklists with page counts and descriptions
 */
export async function getChecklists(ctx: ProtectedContext, { searchTerm }: { searchTerm?: string } = {}) {
	const isAdmin = ctx.session.user.role === config.ROLES.ADMIN || ctx.session.user.role === config.ROLES.SUPER_ADMIN;
	let query = ctx.db
		.selectFrom('checklist')
		.leftJoin('page_instance', 'page_instance.checklist_id', 'checklist.id')
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
		.select(({ eb, fn }) =>
			fn.sum(eb.case().when('page_instance.id', 'is', null).then(0).else(1).end()).as('page_count')
		)
		.where('checklist.client_id', '=', ctx.session.user.client_id)
		.where((eb) => (isAdmin ? eb.lit(true) : eb('checklist.published', '=', true)))
		.groupBy(['checklist.id', 'users.id'])
		.orderBy('checklist.name');
	if (searchTerm) {
		query = query.where((eb) => eb(sql`lower(${eb.ref('name')})`, 'like', `${searchTerm.toLowerCase()}%`));
	}
	return await query.execute();
}

/**
 * Count published/unpublished checklists with client ID.
 *
 * @param ctx - request context
 * @param clientId - client ID
 * @returns published/unpublished count
 */
export async function getChecklistCount(ctx: ProtectedContext, clientId: string) {
	const results = await ctx.db
		.selectFrom('checklist')
		.select(({ fn }) => ['published', fn.count('id').as('count')])
		.where('checklist.client_id', '=', clientId)
		.groupBy('published')
		.execute();
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
	// Update last_opened timestamp whenever a checklist claim is accessed
	await ctx.db
		.updateTable('checklist_claim')
		.set({ last_opened: new Date() })
		.where('client_id', '=', ctx.session.user.client_id)
		.where((eb) => eb.and([eb('checklist_id', '=', checklistId), eb('claim_id', '=', claimId)]))
		.execute();

	// Return the checklist claim data
	return await ctx.db
		.selectFrom('checklist_claim')
		.innerJoin('checklist', 'checklist_claim.checklist_id', 'checklist.id')
		.innerJoin('users', 'checklist_claim.assignee', 'users.id')
		.selectAll('checklist_claim')
		.select(['users.first', 'users.last', 'users.email'])
		.where('checklist_claim.client_id', '=', ctx.session.user.client_id)
		.where((eb) => eb.and([eb('checklist_id', '=', checklistId), eb('claim_id', '=', claimId)]))
		.executeTakeFirst();
}

export async function getChecklistClaimProgress(ctx: ProtectedContext, checklistId: number, claimId: number) {
	const unlockedPages = ctx.db.withRecursive('unlocked_pages', (db) =>
		db
			.selectFrom('page_instance')
			.innerJoin('checklist', 'page_instance.checklist_id', 'checklist.id')
			.select((eb) => [
				'page_instance.id as id',
				sql.raw('1').as('depth'),
				sql<number[]>`ARRAY[${eb.ref('page_instance.id')}]`.as('path'),
			])
			.where('page_instance.client_id', '=', ctx.session.user.client_id)
			.where('checklist_id', '=', checklistId)
			.where('parent_instance_id', 'is', null)
			.unionAll(
				db
					.selectFrom('unlocked_pages')
					.innerJoin('page_instance', 'page_instance.id', 'unlocked_pages.id')
					.innerJoin('checklist', 'page_instance.checklist_id', 'checklist.id')
					.innerJoin('page', 'page.id', 'page_instance.page_id')
					.innerJoin('question', 'question.page_id', 'page.id')
					.innerJoin('answer', 'answer.question_id', 'question.id')
					.innerJoin('question_response', (join) =>
						join
							.onRef('question_response.question_id', '=', 'question.id')
							.on('question_response.claim_id', '=', claimId)
							.on('question_response.checklist_id', '=', checklistId)
					)
					.innerJoin(
						'question_response_answer',
						'question_response_answer.response_id',
						'question_response.id'
					)
					.whereRef('question_response_answer.answer_id', '=', 'answer.id')
					.where('answer.calls_instance_id', 'is not', null)
					// Check for cycles
					.where((eb) =>
						sql`NOT (${eb.ref('answer.calls_instance_id')} = ANY(unlocked_pages.path))`.$castTo<boolean>()
					)
					// Enforce a max depth as a safety fallback for infinite recursion
					.where(sql`unlocked_pages.depth < ${MAX_TREE_DEPTH}`.$castTo<boolean>())
					.select((eb) => [
						eb.ref('answer.calls_instance_id').$notNull().as('id'),
						sql<number>`unlocked_pages.depth + 1`.as('depth'),
						sql<number[]>`array_append(unlocked_pages.path, ${eb.ref('answer.calls_instance_id')})`.as(
							'path'
						),
					])
			)
	);

	const result = await unlockedPages
		.selectFrom('unlocked_pages')
		.innerJoin('page_instance', 'page_instance.id', 'unlocked_pages.id')
		.innerJoin('checklist', 'page_instance.checklist_id', 'checklist.id')
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
		])
		.executeTakeFirst();

	const answerCount = parseInt(result?.answered_count?.toString() ?? '0') || 0;
	const totalQuestionCount = parseInt(result?.total_question_count?.toString() ?? '0') || 0;
	return { answerCount, totalQuestionCount };
}

export async function getChecklistClaimStats(ctx: ProtectedContext, checklistId?: number, users?: string[]) {
	return await ctx.db
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
		.where('checklist_claim.client_id', '=', ctx.session.user.client_id)
		.where((eb) => {
			const andClause: ExpressionWrapper<DB, 'checklist_claim' | 'checklist' | 'claim', SqlBool>[] = [];
			if (checklistId) andClause.push(eb('checklist.id', '=', checklistId));
			if (users) andClause.push(eb('users.id', 'in', users));
			return eb.and(andClause);
		})
		.groupBy(['checklist_claim.checklist_id', 'checklist.name', 'claim.id', 'checklist_claim.status'])
		.orderBy(['checklist_claim.checklist_id', 'checklist.name', 'checklist_claim.status'])
		.execute();
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
	return await ctx.db
		.selectFrom('page_instance')
		.innerJoin('checklist', 'page_instance.checklist_id', 'checklist.id')
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
		    or question_response.response_doc_id is not null
		    or (
			exists (
			    select 1 from question_response_answer
			    where question_response_answer.response_id = question_response.id
			)
			and not exists (
			    select 1 from question_response_answer qra
			    join answer a on a.id = qra.answer_id
			    where qra.response_id = question_response.id
			    and a.requires_upload = true
			    and question_response.response_doc_id is null
			)
		    )
		)`.as('total_answered'),
			// All answers requiring action
			sql<number>`count(distinct question_response.id)
		filter (
		    where exists (
			select 1 from question_response_answer qra
			join answer a on a.id = qra.answer_id
			left join action ac on ac.answer_id = a.id and ac.client_id = ${ctx.session.user.client_id}
			where qra.response_id = question_response.id
			    and (
				ac.answer_id is not null
				or lower(a.text) like '%unknown%'
				or (a.has_additional_info = true and (qra.additional_info is null or qra.additional_info = ''))
			    )
		    )
		)`.as('total_action_required'),
			// Specific count: answers with unknown text
			sql<number>`count(distinct question_response.id)
		filter (
		    where exists (
			select 1 from question_response_answer qra
			join answer a on a.id = qra.answer_id
			where qra.response_id = question_response.id
			    and lower(a.text) like '%unknown%'
		    )
		)`.as('total_unknown'),
		])
		.where('page_instance.client_id', '=', ctx.session.user.client_id)
		.where('page_instance.checklist_id', '=', checklistId)
		.executeTakeFirstOrThrow();
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
	let query = ctx.db
		.selectFrom('page_instance')
		.innerJoin('checklist', 'page_instance.checklist_id', 'checklist.id')
		.innerJoin('page', 'page.id', 'page_instance.page_id')
		.innerJoin('question', 'question.page_id', 'page.id')
		.leftJoin('question_response', (join) =>
			join
				.onRef('question_response.question_id', '=', 'question.id')
				.onRef('question_response.instance_id', '=', 'page_instance.id')
				.onRef('question_response.checklist_id', '=', 'page_instance.checklist_id')
				.on('question_response.claim_id', '=', sql.lit(claimId))
		)
		.where('page_instance.client_id', '=', ctx.session.user.client_id)
		.where('page_instance.checklist_id', '=', checklistId);

	// Join answers only when we care about answered or known/unknown stats
	if (segment !== SummarySegment.UNANSWERED) {
		query = query
			.leftJoin('question_response_answer', 'question_response_answer.response_id', 'question_response.id')
			.leftJoin('answer', 'answer.id', 'question_response_answer.answer_id')
			.leftJoin('action', (join) =>
				join.onRef('action.answer_id', '=', 'answer.id').on('action.client_id', '=', ctx.session.user.client_id)
			) as typeof query;
	}

	switch (segment) {
		case SummarySegment.ANSWERED:
			query = query.where((qb) =>
				qb.or([
					qb('question_response.response_text', 'is not', null),
					qb('question_response.response_doc_id', 'is not', null),
					sql<boolean>`(
						question_response_answer.id is not null
						and not exists (
							select 1 from question_response_answer qra
							join answer a on a.id = qra.answer_id
							where qra.response_id = question_response.id
							and a.requires_upload = true
							and question_response.response_doc_id is null
						)
					)`,
				])
			);
			break;
		case SummarySegment.UNANSWERED:
			query = query.where('question_response.id', 'is', null);
			break;
		case SummarySegment.ACTION_REQUIRED:
			query = query.where((qb) =>
				qb.and([
					// Must be answered
					qb.or([
						qb('question_response.response_text', 'is not', null),
						qb('question_response.response_doc_id', 'is not', null),
						sql<boolean>`(
							question_response_answer.id is not null
							and not exists (
								select 1 from question_response_answer qra
								join answer a on a.id = qra.answer_id
								where qra.response_id = question_response.id
								and a.requires_upload = true
								and question_response.response_doc_id is null
							)
						)`,
					]),
					// Must meet at least one action-required criterion
					sql<boolean>`(
						action.answer_id is not null
						or lower(answer.text) like '%unknown%'
						or (answer.has_additional_info = true and (question_response_answer.additional_info is null or question_response_answer.additional_info = ''))
					)`,
				])
			);
			break;
		case SummarySegment.NO_ACTION_REQUIRED:
			query = query.where((qb) =>
				qb.and([
					// Must be answered
					qb.or([
						qb('question_response.response_text', 'is not', null),
						qb('question_response.response_doc_id', 'is not', null),
						sql<boolean>`(
							question_response_answer.id is not null
							and not exists (
								select 1 from question_response_answer qra
								join answer a on a.id = qra.answer_id
								where qra.response_id = question_response.id
								and a.requires_upload = true
								and question_response.response_doc_id is null
							)
						)`,
					]),
					// Must NOT meet any action-required criterion
					sql<boolean>`(
						action.answer_id is null
						and (answer.text is null or lower(answer.text) not like '%unknown%')
						and (answer.has_additional_info = false or answer.has_additional_info is null or (question_response_answer.additional_info is not null and question_response_answer.additional_info != ''))
					)`,
				])
			);
			break;
		case SummarySegment.UNKNOWN:
			query = query.where(sql<boolean>`lower(answer.text) like '%unknown%'`);
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
		if (segment === SummarySegment.UNANSWERED) {
			const rows = await query
				.select([
					sql`page_instance.id`.as('page_id'),
					sql`page.title`.as('page_title'),
					sql`question.id`.as('question_id'),
					sql`question.text`.as('question_text'),
				])
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
		} else {
			const rows = await query
				.select([
					sql`page_instance.id`.as('page_id'),
					sql`page.title`.as('page_title'),
					sql`question.id`.as('question_id'),
					sql`question.text`.as('question_text'),
					sql`question_response.response_text`.as('response_text'),
					sql<string>`string_agg(distinct answer.text, ', ')`.as('answer_texts'),
				])
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
}

export async function getChecklistClaims(
	ctx: ProtectedContext,
	filters: { range: DateRangeStrict; checklistId?: number; users?: string[]; claimStatus?: ClaimStatus },
	limit: number,
	offset: number
) {
	const baseQuery = ctx.db
		.selectFrom('checklist')
		.innerJoin('checklist_claim', 'checklist.id', 'checklist_claim.checklist_id')
		.innerJoin('claim', 'claim.id', 'checklist_claim.claim_id')
		.leftJoin('users as u1', 'u1.id', 'checklist_claim.created_by')
		.leftJoin('users as u2', 'u2.id', 'checklist_claim.assignee')
		.where('checklist.client_id', '=', ctx.session.user.client_id)
		.where((eb) => {
			const whereClause: ExpressionWrapper<DB, 'response_audit_logs' | 'users', SqlBool>[] = [];
			if (filters.checklistId) whereClause.push(eb('checklist.id', '=', filters.checklistId));
			if (filters.users?.length) whereClause.push(eb('u2.id', 'in', filters.users));
			if (filters.range && filters.range.some((d) => !!d)) {
				if (filters.range[0]) {
					whereClause.push(eb('checklist_claim.created_at', '>=', filters.range[0]));
				}
				if (filters.range[1]) {
					whereClause.push(eb('checklist_claim.created_at', '<=', filters.range[1]));
				}
			}
			if (filters.claimStatus) {
				whereClause.push(eb('checklist_claim.status', '=', filters.claimStatus));
			}
			return eb.and(whereClause);
		});

	const countQuery = baseQuery.select(({ fn }) => fn.countAll().as('count'));
	const dataQuery = baseQuery
		.selectAll('checklist_claim')
		.select([
			'checklist.name as checklist_name',
			'claim.claim_number',
			'claim.client',
			'claim.expected_recovery',
			'claim.actual_recovery',
			'u1.last as created_by_last',
			'u1.first as created_by_first',
			'u1.email as created_by_email',
			'u2.last as assignee_last',
			'u2.first as assignee_first',
			'u2.email as assignee_email',
		])
		.orderBy('checklist_claim.updated_at desc')
		.limit(limit)
		.offset(offset);

	const [data, count] = await Promise.all([dataQuery.execute(), countQuery.executeTakeFirstOrThrow()]);
	return { rows: data, count: parseInt(count.count.toString()) };
}

/**
 * Export all checklist claims matching filters (no pagination).
 * Used for CSV export functionality.
 *
 * @param ctx - request context
 * @param filters - optional filters (same as getChecklistClaims)
 * @returns all matching checklist claims
 */
export async function exportChecklistClaims(
	ctx: ProtectedContext,
	filters: { range: DateRangeStrict; checklistId?: number; users?: string[]; claimStatus?: ClaimStatus }
) {
	const query = ctx.db
		.selectFrom('checklist')
		.innerJoin('checklist_claim', 'checklist.id', 'checklist_claim.checklist_id')
		.innerJoin('claim', 'claim.id', 'checklist_claim.claim_id')
		.leftJoin('users as u1', 'u1.id', 'checklist_claim.created_by')
		.leftJoin('users as u2', 'u2.id', 'checklist_claim.assignee')
		.where('checklist.client_id', '=', ctx.session.user.client_id)
		.where((eb) => {
			const whereClause: ExpressionWrapper<DB, 'response_audit_logs' | 'users', SqlBool>[] = [];
			if (filters.checklistId) whereClause.push(eb('checklist.id', '=', filters.checklistId));
			if (filters.users?.length) whereClause.push(eb('u2.id', 'in', filters.users));
			if (filters.range && filters.range.some((d) => !!d)) {
				if (filters.range[0]) {
					whereClause.push(eb('checklist_claim.created_at', '>=', filters.range[0]));
				}
				if (filters.range[1]) {
					whereClause.push(eb('checklist_claim.created_at', '<=', filters.range[1]));
				}
			}
			if (filters.claimStatus) {
				whereClause.push(eb('checklist_claim.status', '=', filters.claimStatus));
			}
			return eb.and(whereClause);
		})
		.selectAll('checklist_claim')
		.select([
			'checklist.name as checklist_name',
			'claim.claim_number',
			'claim.client',
			'claim.expected_recovery',
			'claim.actual_recovery',
			'u1.last as created_by_last',
			'u1.first as created_by_first',
			'u1.email as created_by_email',
			'u2.last as assignee_last',
			'u2.first as assignee_first',
			'u2.email as assignee_email',
		])
		.orderBy('checklist_claim.updated_at desc');

	return await query.execute();
}

/**
 * Retrieve the most recently opened claims for any checklist.
 *
 * @param ctx - request context
 * @returns list of recent checklist/claim pairs
 */
export async function getRecentChecklistClaims(ctx: ProtectedContext) {
	return await ctx.db
		.selectFrom('checklist')
		.innerJoin('checklist_claim', 'checklist.id', 'checklist_claim.checklist_id')
		.innerJoin('claim', 'claim.id', 'checklist_claim.claim_id')
		.leftJoin('user_desk_location', (join) =>
			join
				.onRef('checklist_claim.desk_location_id', '=', 'user_desk_location.desk_location_id')
				.on('user_desk_location.user_id', '=', ctx.session.user.id)
				.on('user_desk_location.removed_at', 'is', null)
		)
		.selectAll('checklist_claim')
		.select([
			'checklist.name as checklist_name',
			'claim.claim_number',
			'claim.client',
			'claim.insured',
			'claim.line_of_business',
			'claim.recovery_status',
			'checklist_claim.status',
		])
		.where('checklist.client_id', '=', ctx.session.user.client_id)
		.where((eb) =>
			eb.or([
				eb('checklist_claim.created_by', '=', ctx.session.user.id),
				eb('checklist_claim.assignee', '=', ctx.session.user.id),
				eb('user_desk_location.desk_location_id', 'is not', null), // Assigned to their desk location
			])
		)
		.orderBy('checklist_claim.last_opened desc')
		.limit(12)
		.execute();
}

/**
 * Update checklist properties.
 *
 * @param ctx - request context
 * @param checklistId - checklist to update
 * @param params - fields to change
 * @returns the updated checklist
 */
export async function modifyChecklist(ctx: ProtectedContext, checklistId: number, params: ChecklistParams) {
	const updates = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));

	return await ctx.db
		.updateTable('checklist')
		.set({
			...updates,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('id', '=', checklistId)
		.returningAll()
		.executeTakeFirstOrThrow();
}
