import { UpdateObjectExpression } from 'kysely/dist/cjs/parser/update-set-parser';
import { db } from '../database/kysely';
import { DB } from '../database/types';
import { Transaction } from 'kysely';

export default {
	createAnswer,
	deleteAnswer,
	getAnswer,
	getAnswers,
	getAnswerCount,
	modifyAnswer,
};

async function createAnswer(questionId: number, params: object, trx?: Transaction<DB>) {
	try {
		let newAnswer: any;
		if (trx) {
			newAnswer = await createAnswerPrivate(questionId, params, trx);
		} else {
			await db.transaction().execute(async (newTrx) => {
				try {
					newAnswer = await createAnswerPrivate(questionId, params, newTrx);
				} catch (e) {
					console.error(e);
				}
			});
		}
		return newAnswer;
	} catch (e) {
		console.error(e);
	}
}

async function deleteAnswer(answerId: number) {
	try {
		await db.deleteFrom('answer').where('id', '=', answerId).execute();
	} catch (e) {
		console.error(e);
	}
}

async function getAnswer(answerId: number) {
	try {
		return await db.selectFrom('answer as a').selectAll('a').where('a.id', '=', answerId).executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function getAnswers(questionId: number) {
	try {
		return await db
			.selectFrom('answer as a')
			.selectAll('a')
			.where('a.question_id', '=', questionId)
			.orderBy('a.position')
			.execute();
	} catch (e) {
		console.error(e);
	}
}

async function getAnswerCount(questionId: number) {
	try {
		let answerCountRecord = await db
			.selectFrom('answer as a')
			.select(({ fn }) => fn.countAll().as('count'))
			.where('a.question_id', '=', questionId)
			.executeTakeFirst();
		return parseInt(answerCountRecord?.count?.toString() ?? '0');
	} catch (e) {
		console.error(e);
	}
}

async function modifyAnswer(answerId: number, params: object) {
	try {
		let updates: UpdateObjectExpression<DB, 'answer'> = {};
		if (params.position) updates.position = params.position;
		if (params.text) updates.text = params.text;
		if (params.description_text != null) updates.description_text = params.description_text;
		if (params.additional_info_num_lines) updates.additional_info_num_lines = params.additional_info_num_lines;
		if (params.additional_info_placeholder != null)
			updates.additional_info_placeholder = params.additional_info_placeholder;
		if (params.calls_instance_id) updates.calls_instance_id = params.calls_instance_id;
		return await db
			.updateTable('answer')
			.set({
				...updates,
			})
			.where('id', '=', answerId)
			.returningAll()
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

// private methods

async function createAnswerPrivate(questionId: number, params: object, trx: Transaction<DB>) {
	try {
		let answerCount = (await getAnswerCount(questionId)) ?? 0;
		let newAnswer = await trx
			.insertInto('answer')
			.values({
				question_id: questionId,
				position: answerCount + 1,
				text: params.text,
				description_text: params.description_text,
				additional_info_num_lines: params.additional_info_num_lines,
				additional_info_placeholder: params.additional_info_placeholder,
				calls_instance_id: params.calls_instance_id,
			})
			.returningAll()
			.executeTakeFirst();
		return newAnswer;
	} catch (e) {
		console.error(e);
	}
}
