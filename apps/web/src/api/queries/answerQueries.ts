import { sql, Transaction } from 'kysely';
import { UpdateObjectExpression } from 'kysely/dist/cjs/parser/update-set-parser';
import { db } from '@/api/database/kysely';
import { DB } from '@/api/database/types';
import { ProtectedContext } from '@/server/trpc/trpc';
import { applyClientScope } from '../database/clientScoped';

/**
 * Insert a new answer for a question.
 *
 * @param ctx - request context containing auth info
 * @param pageId - id of the page that owns the question
 * @param questionId - id of the question to attach the answer to
 * @param params - answer fields to insert
 * @param trx - optional transaction to use
 * @returns the newly created answer
 */
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

/**
 * Remove an answer and bump the owning page version.
 *
 * @param ctx - request context
 * @param pageId - id of the page containing the answer
 * @param answerId - identifier of the answer to delete
 */
export async function deleteAnswer(ctx: ProtectedContext, pageId: number, answerId: number) {
	await db.transaction().execute(async (trx) => {
		const { position, question_id } = await trx
			.deleteFrom('answer')
			.where('id', '=', answerId)
			.returning(['position', 'question_id'])
			.executeTakeFirstOrThrow();
		await trx
			.updateTable('answer')
			.set((eb) => ({ position: sql`${eb.ref('position')} - 1` }))
			.where((eb) => eb.and([eb('question_id', '=', question_id), eb('position', '>', position)]))
			.execute();
		await bumpPageVersion(ctx, pageId, trx);
	});
}

/**
 * Fetch a single answer by id.
 *
 * @param ctx - request context
 * @param answerId - identifier of the desired answer
 * @returns the matching answer
 */
export async function getAnswer(ctx: ProtectedContext, answerId: number) {
	return await applyClientScope(
		db.selectFrom('answer').selectAll().where('id', '=', answerId),
		ctx.session.user.client_id
	).executeTakeFirstOrThrow();
}

/**
 * Retrieve all answers for a given question.
 *
 * @param ctx - request context
 * @param questionId - question to look up answers for
 * @returns ordered list of answers
 */
export async function getAnswers(ctx: ProtectedContext, questionId: number) {
	return await applyClientScope(
		db.selectFrom('answer').selectAll().where('question_id', '=', questionId).orderBy('position'),
		ctx.session.user.client_id
	).execute();
}

/**
 * Count how many answers exist for a question.
 *
 * @param ctx - request context
 * @param questionId - question identifier
 * @returns number of answers
 */
export async function getAnswerCount(ctx: ProtectedContext, questionId: number) {
	const answerCountRecord = await applyClientScope(
		db
			.selectFrom('answer')
			.select(({ fn }) => fn.countAll().as('count'))
			.where('question_id', '=', questionId),
		ctx.session.user.client_id
	).executeTakeFirstOrThrow();
	return parseInt(answerCountRecord.count?.toString() ?? '0');
}

/**
 * Update an existing answer's fields.
 *
 * @param ctx - request context
 * @param pageId - page whose version should be bumped
 * @param answerId - identifier of the answer to update
 * @param params - fields to modify
 * @returns the updated answer
 */
export async function modifyAnswer(ctx: ProtectedContext, pageId: number, answerId: number, params: object) {
	const existingAnswer = await applyClientScope(
		db.selectFrom('answer').select(['position', 'question_id']).where('id', '=', answerId),
		ctx.session.user.client_id
	).executeTakeFirstOrThrow();
	const updates: UpdateObjectExpression<DB, 'answer'> = {};

	if (params.position && params.position !== existingAnswer.position) updates.position = params.position;
	if (params.grade != null) updates.grade = params.grade || null;
	if (params.text) updates.text = params.text;
	if (params.description_text != null) updates.description_text = params.description_text;
	if (params.additional_info_num_lines) updates.additional_info_num_lines = params.additional_info_num_lines;
	if (params.additional_info_placeholder != null)
		updates.additional_info_placeholder = params.additional_info_placeholder;
	if (params.calls_instance_id !== undefined) updates.calls_instance_id = params.calls_instance_id;
	if (params.has_additional_info != null) updates.has_additional_info = params.has_additional_info;

	let newAnswer: Awaited<ReturnType<typeof getAnswer>>;
	await db.transaction().execute(async (trx) => {
		if (updates.position) {
			if (updates.position < existingAnswer.position) {
				// Shift down: move answers [newPosition, currentPosition - 1] up by 1
				await trx
					.updateTable('answer')
					.set((eb) => ({ position: sql`${eb.ref('position')} + 1` }))
					.where('question_id', '=', existingAnswer.question_id)
					.where('position', '>=', updates.position)
					.where('position', '<', existingAnswer.position)
					.execute();
			} else {
				// Shift up: move answers [currentPosition + 1, newPosition] down by 1
				await trx
					.updateTable('answer')
					.set((eb) => ({ position: sql`${eb.ref('position')} - 1` }))
					.where('question_id', '=', existingAnswer.question_id)
					.where('position', '>', existingAnswer.position)
					.where('position', '<=', updates.position)
					.execute();
			}
		}

		newAnswer = await trx
			.updateTable('answer')
			.set({
				...updates,
				updated_by: ctx.session.user.id,
				updated_at: sql`now()`,
			})
			.where('id', '=', answerId)
			.returningAll()
			.executeTakeFirstOrThrow();
		await bumpPageVersion(ctx, pageId, trx);
	});
	return newAnswer!;
}

// private methods

/**
 * Increment the version number of a page inside a transaction.
 *
 * @param ctx - request context
 * @param pageId - page to bump
 * @param trx - transaction for the update
 */
async function bumpPageVersion(ctx: ProtectedContext, pageId: number, trx: Transaction<DB>) {
	await trx
		.updateTable('page')
		.set((eb) => ({ version: sql`${eb.ref('version')} + 1` }))
		.where('id', '=', pageId)
		.execute();
}

/**
 * Helper to insert an answer within an existing transaction.
 *
 * @param ctx - request context
 * @param questionId - question to append the answer to
 * @param params - answer fields
 * @param trx - active transaction
 * @returns the newly created answer
 */
async function createAnswerPrivate(ctx: ProtectedContext, questionId: number, params: object, trx: Transaction<DB>) {
	await trx
		.updateTable('answer')
		.set((eb) => ({ position: sql`${eb.ref('position')} + 1` }))
		.where('question_id', '=', questionId)
		.where('position', '>=', params.position)
		.execute();
	const newAnswer = await trx
		.insertInto('answer')
		.values({
			question_id: questionId,
			position: params.position,
			grade: params.grade,
			text: params.text,
			description_text: params.description_text,
			additional_info_num_lines: params.additional_info_num_lines,
			additional_info_placeholder: params.additional_info_placeholder,
			calls_instance_id: params.calls_instance_id,
			has_additional_info: params.has_additional_info,
			client_id: ctx.session.user.client_id,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	return newAnswer;
}
