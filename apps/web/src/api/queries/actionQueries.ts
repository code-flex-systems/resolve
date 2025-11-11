import { ActionLogStatus, ActionType } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { ActionDefinition, DateRange } from '@/types/types';
import { ExpressionWrapper, sql, SqlBool } from 'kysely';
import { DB } from '../database/types';
import { TRPCError } from '@trpc/server';

export async function upsertAction(
	ctx: ProtectedContext,
	answerId: number,
	type: ActionType,
	definition: ActionDefinition
) {
	return await ctx.db
		.insertInto('action')
		.values({
			client_id: ctx.session.user.client_id,
			answer_id: answerId,
			type,
			definition: JSON.stringify(definition),
			created_by: ctx.session.user.id,
		})
		.onConflict((oc) =>
			oc.columns(['answer_id']).doUpdateSet({
				type,
				definition: JSON.stringify(definition),
				updated_by: ctx.session.user.id,
				updated_at: sql`now()`,
			})
		)
		.returningAll()
		.executeTakeFirstOrThrow();
}

export async function deleteAction(ctx: ProtectedContext, actionId: number) {
	await ctx.db.deleteFrom('action').where('id', '=', actionId).execute();
}

export async function getActions(ctx: ProtectedContext, answerIds: number[]) {
	return await ctx.db
		.selectFrom('action')
		.selectAll()
		.where('action.client_id', '=', ctx.session.user.client_id)
		.where('answer_id', 'in', answerIds)
		.execute();
}

export async function getAction(ctx: ProtectedContext, answerId: number) {
	return await ctx.db
		.selectFrom('action')
		.selectAll()
		.where('action.client_id', '=', ctx.session.user.client_id)
		.where('answer_id', '=', answerId)
		.executeTakeFirstOrThrow();
}

export async function getActionStats(ctx: ProtectedContext) {
	const results = await ctx.db
		.selectFrom('action_log')
		.innerJoin('action', 'action_log.action_id', 'action.id')
		.selectAll('action')
		.select(({ fn }) => fn.countAll().as('count'))
		.where('action_log.client_id', '=', ctx.session.user.client_id)
		.groupBy('action.id')
		.orderBy('count desc')
		.limit(10)
		.execute();
	return results.map((row) => ({
		...row,
		definition: JSON.parse(JSON.stringify(row.definition ?? '{}')),
		count: parseInt(row.count?.toString() ?? '0'),
	}));
}

export async function getActionStatsDetail(
	ctx: ProtectedContext,
	filters: { checklistId?: number; claimId?: number; users?: string[]; range?: DateRange; searchTerm?: string }
) {
	const results = await ctx.db
		.selectFrom('action_log')
		.innerJoin('action', 'action_log.action_id', 'action.id')
		.innerJoin('answer', 'action.answer_id', 'answer.id')
		.innerJoin('question_response_answer', 'answer.id', 'question_response_answer.answer_id')
		.innerJoin('question_response', (join) =>
			join.onRef('question_response_answer.response_id', '=', 'question_response.id')
		)
		.innerJoin('question', 'question_response.question_id', 'question.id')
		.innerJoin('page', 'question.page_id', 'page.id')
		.innerJoin('page_instance', (join) =>
			join
				.onRef('page.id', '=', 'page_instance.page_id')
				.onRef('question_response.instance_id', '=', 'page_instance.id')
		)
		.selectAll('action')
		.select(({ eb, fn }) => [
			'answer.text as answer_text',
			'question.text as question_text',
			sql`concat('p(', ${eb.ref('page.id')}, ').i(', ${eb.ref('page_instance.id')}, ')')`
				.$castTo<string>()
				.as('page'),
			fn.countAll().as('count'),
		])
		.where('action_log.client_id', '=', ctx.session.user.client_id)
		.where((eb) => {
			const whereClause: ExpressionWrapper<DB, any, SqlBool>[] = [];
			if (filters.checklistId) whereClause.push(eb('page_instance.checklist_id', '=', filters.checklistId));
			if (filters.claimId) whereClause.push(eb('question_response.claim_id', '=', filters.claimId));
			if (filters.users?.length) whereClause.push(eb('action_log.created_by', 'in', filters.users));
			if (filters.range && filters.range.some((d) => !!d)) {
				if (filters.range[0]) {
					whereClause.push(eb('action_log.created_at', '>=', filters.range[0]));
				}
				if (filters.range[1]) {
					whereClause.push(eb('action_log.created_at', '<=', filters.range[1]));
				}
			}
			return eb.and(whereClause);
		})
		.groupBy('action.id')
		.orderBy('count desc')
		.execute();
	return results.map((row) => ({ ...row, count: parseInt(row.count?.toString() ?? '0') }));
}

export async function logAction(ctx: ProtectedContext, actionId: number, status: ActionLogStatus) {
	await ctx.db
		.insertInto('action_log')
		.values({ client_id: ctx.session.user.client_id, action_id: actionId, status, created_by: ctx.session.user.id })
		.execute();
}

export async function updateAction(
	ctx: ProtectedContext,
	actionId: number,
	updates: {
		type?: ActionType;
		definition?: ActionDefinition;
	}
) {
	if (!Object.keys(updates).length) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No updates' });
	await ctx.db
		.updateTable('action')
		.set({
			type: updates.type,
			definition: updates.definition ? JSON.stringify(updates.definition) : undefined,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('id', '=', actionId)
		.execute();
}
