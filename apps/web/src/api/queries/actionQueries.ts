import { ActionLogStatus, ActionType } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { ActionDefinition } from '@/types/types';
import { sql, Transaction } from 'kysely';
import { DB } from '../database/types';
import { db } from '../database/kysely';
import { applyClientScope } from '../database/clientScoped';
import { TRPCError } from '@trpc/server';

export async function upsertAction(
	ctx: ProtectedContext,
	answerId: number,
	type: ActionType,
	definition: ActionDefinition
) {
	return await db
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

export async function deleteAction(ctx: ProtectedContext, actionId: number, trx: Transaction<DB>) {
	await trx.deleteFrom('action').where('id', '=', actionId).execute();
}

export async function getActions(ctx: ProtectedContext, answerIds: number[]) {
	return await applyClientScope(
		db.selectFrom('action').selectAll().where('answer_id', 'in', answerIds),
		ctx.session.user.client_id
	).execute();
}

export async function getAction(ctx: ProtectedContext, answerId: number) {
	return await applyClientScope(
		db.selectFrom('action').selectAll().where('answer_id', '=', answerId),
		ctx.session.user.client_id
	).executeTakeFirstOrThrow();
}

export async function getActionStats(ctx: ProtectedContext, checklistId: number) {
	const results = await applyClientScope(
		db
			.selectFrom('action_log')
			.innerJoin('action', 'action_log.action_id', 'action.id')
			.innerJoin('answer', 'action.answer_id', 'answer.id')
			.innerJoin('question_response_answer', 'answer.id', 'question_response_answer.answer_id')
			.innerJoin('question_response', 'question_response_answer.response_id', 'question_response.id')
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
			.where('page_instance.checklist_id', '=', checklistId)
			.groupBy('action.id')
			.orderBy('count desc')
			.limit(10),
		ctx.session.user.client_id,
		'action'
	).execute();
	return results.map((row) => ({ ...row, count: parseInt(row.count?.toString() ?? '0') }));
}

export async function logAction(ctx: ProtectedContext, actionId: number, status: ActionLogStatus) {
	await db
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
	},
	trx: Transaction<DB>
) {
	if (!Object.keys(updates).length) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No updates' });
	await trx
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
