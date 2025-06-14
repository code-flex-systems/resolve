import { sql, Transaction } from 'kysely';
import { UpdateObjectExpression } from 'kysely/dist/cjs/parser/update-set-parser';
import { db } from '@/api/database/kysely';
import { DB } from '@/api/database/types';
import { ProtectedContext } from '@/server/trpc/trpc';
import { applyClientScope } from '../database/clientScoped';

export async function createAnswer(
	ctx: ProtectedContext,
	pageId: number,
	questionId: number,
	params: object,
	trx?: Transaction<DB>
) {
	let newAnswer: any;
	if (trx) {
		newAnswer = await createAnswerPrivate(ctx, questionId, params, trx);
	} else {
		await db.transaction().execute(async (newTrx) => {
			newAnswer = await createAnswerPrivate(ctx, questionId, params, newTrx);
			// Only bump the version if this action isn't part of another update
			await bumpPageVersion(ctx, pageId, newTrx);
		});
	}
	return newAnswer;
}

export async function deleteAnswer(ctx: ProtectedContext, pageId: number, answerId: number) {
	await db.transaction().execute(async (trx) => {
		await trx.deleteFrom('answer').where('id', '=', answerId).execute();
		await bumpPageVersion(ctx, pageId, trx);
	});
}

export async function getAnswer(ctx: ProtectedContext, answerId: number) {
	return await applyClientScope(
		db.selectFrom('answer').selectAll().where('id', '=', answerId),
		ctx.session.user.client_id
	).executeTakeFirstOrThrow();
}

export async function getAnswers(ctx: ProtectedContext, questionId: number) {
	return await applyClientScope(
		db.selectFrom('answer').selectAll().where('question_id', '=', questionId).orderBy('position'),
		ctx.session.user.client_id
	).execute();
}

export async function getAnswerCount(ctx: ProtectedContext, questionId: number) {
	let answerCountRecord = await applyClientScope(
		db
			.selectFrom('answer')
			.select(({ fn }) => fn.countAll().as('count'))
			.where('question_id', '=', questionId),
		ctx.session.user.client_id
	).executeTakeFirstOrThrow();
	return parseInt(answerCountRecord.count?.toString() ?? '0');
}

export async function modifyAnswer(ctx: ProtectedContext, pageId: number, answerId: number, params: object) {
	let updates: UpdateObjectExpression<DB, 'answer'> = {};
	if (params.position) updates.position = params.position;
	if (params.grade != null) updates.grade = params.grade || null;
	if (params.text) updates.text = params.text;
	if (params.description_text != null) updates.description_text = params.description_text;
	if (params.additional_info_num_lines) updates.additional_info_num_lines = params.additional_info_num_lines;
	if (params.additional_info_placeholder != null)
		updates.additional_info_placeholder = params.additional_info_placeholder;
	if (params.calls_instance_id) updates.calls_instance_id = params.calls_instance_id;
	if (params.has_additional_info != null) updates.has_additional_info = params.has_additional_info;
	let newAnswer: any;
	await db.transaction().execute(async (trx) => {
		newAnswer = await trx
			.updateTable('answer')
			.set({
				...updates,
			})
			.where('id', '=', answerId)
			.returningAll()
			.executeTakeFirstOrThrow();
		await bumpPageVersion(ctx, pageId, trx);
	});
	return newAnswer;
}

// private methods

async function bumpPageVersion(ctx: ProtectedContext, pageId: number, trx: Transaction<DB>) {
	await trx
		.updateTable('page')
		.set((eb) => ({ version: sql`${eb.ref('version')} + 1` }))
		.where('id', '=', pageId)
		.execute();
}

async function createAnswerPrivate(ctx: ProtectedContext, questionId: number, params: object, trx: Transaction<DB>) {
	let answerCount = (await getAnswerCount(ctx, questionId)) ?? 0;
	let newAnswer = await trx
		.insertInto('answer')
		.values({
			question_id: questionId,
			position: answerCount + 1,
			grade: params.grade,
			text: params.text,
			description_text: params.description_text,
			additional_info_num_lines: params.additional_info_num_lines,
			additional_info_placeholder: params.additional_info_placeholder,
			calls_instance_id: params.calls_instance_id,
			has_additional_info: params.has_additional_info,
			client_id: ctx.session.user.client_id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	return newAnswer;
}
