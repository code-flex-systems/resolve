import { sql } from 'kysely';
import { db } from '@/api/database/kysely';
import { SummarySegment } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { applyClientScope } from '../database/clientScoped';

export async function createChecklist(
	ctx: ProtectedContext,
	name: string,
	username: string,
	existingChecklistId?: number
) {
	let newChecklist: any;
	await db.transaction().execute(async (trx) => {
		newChecklist = await trx
			.insertInto('checklist')
			.values({
				name,
				created_by: username,
				client_id: ctx.session.user.client_id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
		if (existingChecklistId) {
			await trx
				.insertInto('page_instance')
				.columns(['page_id', 'parent_instance_id', 'checklist_id', 'position', 'client_id'])
				.expression((eb) =>
					eb
						.selectFrom('page_instance')
						.select([
							'page_id',
							'parent_instance_id',
							eb.val(newChecklist.id).as('checklist_id'),
							'position',
							'client_id',
						])
						.where('checklist_id', '=', existingChecklistId)
				)
				.execute();
		}
	});
	return newChecklist;
}

export async function deleteChecklist(ctx: ProtectedContext, checklistId: number) {
	await db.deleteFrom('checklist').where('id', '=', checklistId).execute();
}

export async function getChecklist(ctx: ProtectedContext, checklistId: number) {
	return await applyClientScope(
		db.selectFrom('checklist').selectAll().where('id', '=', checklistId),
		ctx.session.user.client_id
	).executeTakeFirstOrThrow();
}

export async function getChecklists(ctx: ProtectedContext, searchTerm?: string) {
	let query = db
		.selectFrom('checklist')
		.innerJoin('page_instance', 'checklist.id', 'page_instance.checklist_id')
		.selectAll('checklist')
		.select(({ fn }) => fn.countAll().as('page_count'))
		.groupBy('checklist.id')
		.orderBy('checklist.id');
	if (searchTerm) {
		query = query.where((eb) => eb(sql`lower(${eb.ref('name')})`, 'like', `${searchTerm.toLowerCase()}%`));
	}
	return await applyClientScope(query, ctx.session.user.client_id, 'checklist').execute();
}

export async function getChecklistClaim(ctx: ProtectedContext, checklistId: number, claimId: number) {
	return await applyClientScope(
		db
			.selectFrom('checklist_claim')
			.selectAll()
			.where((eb) => eb.and([eb('checklist_id', '=', checklistId), eb('claim_id', '=', claimId)])),
		ctx.session.user.client_id
	).executeTakeFirstOrThrow();
}

export async function getChecklistSummary(ctx: ProtectedContext, checklistId: number, claimId: number) {
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

export async function getRecentChecklistClaims(ctx: ProtectedContext) {
	return await applyClientScope(
		db
			.selectFrom('checklist')
			.innerJoin('checklist_claim', 'checklist.id', 'checklist_claim.checklist_id')
			.innerJoin('claim', 'claim.id', 'checklist_claim.claim_id')
			.selectAll('checklist_claim')
			.select(['checklist.name as checklist_name', 'claim.claim_number', 'claim.client'])
			.orderBy('checklist_claim.last_opened desc')
			.limit(15),
		ctx.session.user.client_id,
		'checklist'
	).execute();
}

export async function modifyChecklist(ctx: ProtectedContext, checklistId: number, params: object) {
	return await db
		.updateTable('checklist')
		.set({
			...params,
		})
		.where('id', '=', checklistId)
		.returningAll()
		.executeTakeFirstOrThrow();
}
