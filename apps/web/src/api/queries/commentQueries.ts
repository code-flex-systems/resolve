import { ProtectedContext } from '@/server/trpc/trpc';
import { db } from '../database/kysely';
import { ExpressionWrapper, sql, SqlBool } from 'kysely';
import { applyClientScope } from '../database/clientScoped';
import { Comment, CommentFilters } from '@/types/types';
import { DB } from '../database/types';

export async function createComment(ctx: ProtectedContext, comment: Comment) {
	await db
		.insertInto('comment')
		.values({
			...comment,
			client_id: ctx.session.user.client_id,
			created_by: ctx.session.user.id,
		})
		.execute();
}

export async function deleteComment(ctx: ProtectedContext, id: number) {
	await db.deleteFrom('comment').where('id', '=', id).execute();
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
	).execute();
}

export async function getCommentCount(ctx: ProtectedContext, filters: CommentFilters) {
	const result = await applyClientScope(
		db
			.selectFrom('comment')
			.innerJoin('users', 'comment.created_by', 'users.id')
			.select(({ fn }) => fn.countAll().as('count'))
			.where((eb) => {
				let andClause = [eb('checklist_id', '=', filters.checklistId), eb('claim_id', '=', filters.claimId)];
				if (filters.instanceId) andClause.push(eb('instance_id', '=', filters.instanceId));
				if (filters.questionId) andClause.push(eb('question_id', '=', filters.questionId));
				return eb.and(andClause);
			}),
		ctx.session.user.client_id,
		'comment'
	).executeTakeFirstOrThrow();
	return parseInt(result.count.toString());
}

export async function getComments(ctx: ProtectedContext, filters: CommentFilters, limit?: number) {
	let query = applyClientScope(
		db
			.selectFrom('comment')
			.innerJoin('users', 'comment.created_by', 'users.id')
			.leftJoin('checklist_claim', (join) =>
				join
					.onRef('comment.checklist_id', '=', 'checklist_claim.checklist_id')
					.onRef('comment.claim_id', '=', 'checklist_claim.claim_id')
			)
			.leftJoin('page_instance', 'comment.instance_id', 'page_instance.id')
			.leftJoin('page', 'page_instance.page_id', 'page.id')
			.leftJoin('question', 'comment.question_id', 'question.id')
			.selectAll('comment')
			.select([
				'users.first',
				'users.last',
				'users.email',
				'page.title as page_title',
				'question.text as question_text',
			])
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
				if (filters.checklistId) andClause.push(eb('checklist_id', '=', filters.checklistId));
				if (filters.claimId) andClause.push(eb('checklist_id', '=', filters.claimId));
				if (filters.instanceId) andClause.push(eb('instance_id', '=', filters.instanceId));
				if (filters.questionId) andClause.push(eb('question_id', '=', filters.questionId));
				return eb.and(andClause);
			})
			.orderBy(['comment.updated_at desc', 'comment.created_at desc']),
		ctx.session.user.client_id,
		'comment'
	);
	if (limit) query = query.limit(limit);
	return await query.execute();
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
