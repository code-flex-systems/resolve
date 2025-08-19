import { ProtectedContext } from '@/server/trpc/trpc';
import { db } from '../database/kysely';
import { ExpressionWrapper, sql, SqlBool } from 'kysely';
import { applyClientScope } from '../database/clientScoped';
import { Comment, CommentFilters } from '@/types/types';
import { DB } from '../database/types';

export async function createComment(ctx: ProtectedContext, comment: Comment) {
	return await db
		.insertInto('comment')
		.values({
			checklist_id: comment.checklistId,
			claim_id: comment.claimId,
			instance_id: comment.instanceId,
			question_id: comment.questionId,
			body: comment.body,
			client_id: ctx.session.user.client_id,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

export async function deleteComment(ctx: ProtectedContext, id: number) {
	return await db.deleteFrom('comment').where('id', '=', id).returningAll().executeTakeFirstOrThrow();
}

export async function getComment(ctx: ProtectedContext, id: number) {
	return await applyClientScope(
		db
			.selectFrom('comment')
			.innerJoin('users', 'comment.created_by', 'users.id')
			.selectAll('comment')
			.select(['first', 'last', 'email'])
			.where('id', '=', id),
		ctx.session.user.client_id,
		'comment'
	).executeTakeFirstOrThrow();
}

export async function getCommentCount(ctx: ProtectedContext, filters: CommentFilters) {
	const result = await applyClientScope(
		db
			.selectFrom('comment')
			.innerJoin('users', 'comment.created_by', 'users.id')
			.select(({ fn }) => fn.countAll().as('count'))
			.where((eb) => {
				let andClause: ExpressionWrapper<DB, 'comment' | 'users', SqlBool>[] = [];
				if (filters.checklistId) andClause.push(eb('checklist_id', '=', filters.checklistId));
				if (filters.claimId) andClause.push(eb('claim_id', '=', filters.claimId));
				if (filters.instanceId) andClause.push(eb('instance_id', '=', filters.instanceId));
				if (filters.questionId) andClause.push(eb('question_id', '=', filters.questionId));
				return eb.and(andClause);
			}),
		ctx.session.user.client_id,
		'comment'
	).executeTakeFirstOrThrow();
	return parseInt(result.count.toString());
}

export async function getComments(ctx: ProtectedContext, filters: CommentFilters, limit?: number, offset?: number) {
	// Base query
	let baseQuery = applyClientScope(
		db
			.selectFrom('comment')
			.innerJoin('users', 'comment.created_by', 'users.id')
			.leftJoin('checklist_claim', (join) =>
				join
					.onRef('comment.checklist_id', '=', 'checklist_claim.checklist_id')
					.onRef('comment.claim_id', '=', 'checklist_claim.claim_id')
			)
			.where((eb) => {
				let andClause: ExpressionWrapper<DB, 'comment' | 'checklist_claim' | 'users', SqlBool>[] = [];
				if (filters.userId) {
					andClause.push(
						eb.or([
							eb('checklist_claim.created_by', '=', filters.userId),
							eb('checklist_claim.assignee', '=', filters.userId),
						])
					);
				}
				if (filters.checklistId) andClause.push(eb('comment.checklist_id', '=', filters.checklistId));
				if (filters.claimId) andClause.push(eb('comment.claim_id', '=', filters.claimId));
				if (filters.instanceId) andClause.push(eb('comment.instance_id', '=', filters.instanceId));
				if (filters.questionId) andClause.push(eb('comment.question_id', '=', filters.questionId));
				return eb.and(andClause);
			}),
		ctx.session.user.client_id,
		'comment'
	);

	// Data query
	let dataQuery = baseQuery
		.leftJoin('page_instance', 'comment.instance_id', 'page_instance.id')
		.leftJoin('page', 'page_instance.page_id', 'page.id')
		.leftJoin('question', 'comment.question_id', 'question.id')
		.selectAll('comment')
		.select(['users.first', 'users.last', 'users.email', 'page.title as page_title', 'question.position'])
		.orderBy(['comment.updated_at desc', 'comment.created_at desc']);
	if (limit) dataQuery = dataQuery.limit(limit);
	if (offset) dataQuery = dataQuery.offset(offset);

	// Count query
	let countQuery = baseQuery.select(({ fn }) => fn.countAll().as('count'));

	// Only run count query when paginating
	const [data, count] = await Promise.all([
		dataQuery.execute(),
		offset != null ? countQuery.executeTakeFirstOrThrow() : Promise.resolve({ count: 0 }),
	]);

	return {
		rows: data,
		count: parseInt(count?.count?.toString() ?? '0'),
	};
}

export async function getCommentsForPage(
	ctx: ProtectedContext,
	checklistId: number,
	claimId: number,
	instanceId: number
) {
	return await applyClientScope(
		db
			.selectFrom('comment')
			.innerJoin('users', 'comment.created_by', 'users.id')
			.selectAll('comment')
			.select(['users.first', 'users.last', 'users.email'])
			.where('comment.checklist_id', '=', checklistId)
			.where('comment.claim_id', '=', claimId)
			.where('comment.instance_id', '=', instanceId)
			.where('comment.question_id', 'is not', null),
		ctx.session.user.client_id,
		'comment'
	).execute();
}

export async function modifyComment(ctx: ProtectedContext, id: number, body: string) {
	return await db
		.updateTable('comment')
		.set({
			body,
			updated_at: sql`now()`,
		})
		.where('id', '=', id)
		.executeTakeFirstOrThrow();
}
