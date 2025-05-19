import { sql, Transaction } from 'kysely';
import { UpdateObjectExpression } from 'kysely/dist/cjs/parser/update-set-parser';
import { db } from '@/api/database/kysely';
import { DB } from '@/api/database/types';

export async function createAnswer(pageId: number, questionId: number, params: object, trx?: Transaction<DB>) {
	let newAnswer: any;
	if (trx) {
		newAnswer = await createAnswerPrivate(questionId, params, trx);
	} else {
		await db.transaction().execute(async (newTrx) => {
			newAnswer = await createAnswerPrivate(questionId, params, newTrx);
			// Only bump the version if this action isn't part of another update
			await bumpPageVersion(pageId, newTrx);
		});
	}
	return newAnswer;
}

export async function deleteAnswer(pageId: number, answerId: number) {
	await db.transaction().execute(async (trx) => {
		await trx.deleteFrom('answer').where('id', '=', answerId).execute();
		await bumpPageVersion(pageId, trx);
	});
}

export async function getAnswer(answerId: number) {
	return await db.selectFrom('answer').selectAll().where('id', '=', answerId).executeTakeFirstOrThrow();
}

export async function getAnswers(questionId: number) {
	return await db
		.selectFrom('answer')
		.selectAll()
		.where('question_id', '=', questionId)
		.orderBy('position')
		.execute();
}

export async function getAnswerCount(questionId: number) {
	let answerCountRecord = await db
		.selectFrom('answer as a')
		.select(({ fn }) => fn.countAll().as('count'))
		.where('a.question_id', '=', questionId)
		.executeTakeFirstOrThrow();
	return parseInt(answerCountRecord.count?.toString() ?? '0');
}

export async function modifyAnswer(pageId: number, answerId: number, params: object) {
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
		await bumpPageVersion(pageId, trx);
	});
	return newAnswer;
}

// private methods

async function bumpPageVersion(pageId: number, trx: Transaction<DB>) {
	await trx
		.updateTable('page')
		.set((eb) => ({ version: sql`${eb.ref('version')} + 1` }))
		.where('id', '=', pageId)
		.execute();
}

async function createAnswerPrivate(questionId: number, params: object, trx: Transaction<DB>) {
	let answerCount = (await getAnswerCount(questionId)) ?? 0;
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
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	return newAnswer;
}
