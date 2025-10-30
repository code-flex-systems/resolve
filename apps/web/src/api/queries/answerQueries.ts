import { sql } from 'kysely';
import { UpdateObjectExpression } from 'kysely/dist/cjs/parser/update-set-parser';
import { DB } from '@/api/database/types';
import { ProtectedContext } from '@/server/trpc/trpc';
import type { AnswerParams, AnswerUpdateParams } from '@/schemas/answerSchemas';

/**
 * Insert a new answer for a question.
 *
 * @param ctx - request context containing auth info
 * @param pageId - id of the page that owns the question
 * @param questionId - id of the question to attach the answer to
 * @param params - answer fields to insert
 * @returns the newly created answer
 */
export async function createAnswer(
	ctx: ProtectedContext,
	pageId: number,
	questionId: number,
	params: AnswerParams
) {
	// If this answer calls another instance, check for cycles across all instances
	// Note: Answers are template-level, but calls_instance_id references a specific instance.
	// We need to check if this creates a cycle in ANY checklist that uses this template.
	if (params.calls_instance_id) {
		// Get all instances of this page template across all checklists
		const pageInstances = await ctx.db
			.selectFrom('page_instance')
			.select(['id as instance_id', 'checklist_id'])
			.where('page_instance.client_id', '=', ctx.session.user.client_id)
			.where('page_instance.page_id', '=', pageId)
			.execute();

		// Group by checklist and check each
		const checklistMap = new Map<number, number[]>();
		for (const { instance_id, checklist_id } of pageInstances) {
			if (!checklistMap.has(checklist_id)) {
				checklistMap.set(checklist_id, []);
			}
			checklistMap.get(checklist_id)!.push(instance_id);
		}

		// Check if adding this call would create a cycle in any checklist
		for (const [checklist_id, instanceIds] of checklistMap) {
			for (const instance_id of instanceIds) {
				const wouldCycle = await wouldCreateCycleBackend(
					ctx,
					checklist_id,
					instance_id,
					params.calls_instance_id
				);

				if (wouldCycle) {
					throw new Error(
						`Cannot set calls_instance_id to ${params.calls_instance_id}: would create a cycle in the answer call graph for checklist ${checklist_id}, instance ${instance_id}`
					);
				}
			}
		}
	}

	let newAnswer: any;
	await ctx.db.transaction().execute(async (newTrx) => {
		newAnswer = await createAnswerPrivate(ctx, questionId, params, newTrx);
		// Only bump the version if this action isn't part of another update
		await bumpPageVersion(ctx, pageId, newTrx);
	});
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
	await ctx.db.transaction().execute(async (trx) => {
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
	return await ctx.db
		.selectFrom('answer')
		.selectAll()
		.where('answer.client_id', '=', ctx.session.user.client_id)
		.where('id', '=', answerId)
		.executeTakeFirstOrThrow();
}

/**
 * Retrieve all answers for a given question.
 *
 * @param ctx - request context
 * @param questionId - question to look up answers for
 * @returns ordered list of answers
 */
export async function getAnswers(ctx: ProtectedContext, questionId: number) {
	return await ctx.db
		.selectFrom('answer')
		.selectAll()
		.where('answer.client_id', '=', ctx.session.user.client_id)
		.where('question_id', '=', questionId)
		.orderBy('position')
		.execute();
}

/**
 * Count how many answers exist for a question.
 *
 * @param ctx - request context
 * @param questionId - question identifier
 * @returns number of answers
 */
export async function getAnswerCount(ctx: ProtectedContext, questionId: number) {
	const answerCountRecord = await ctx.db
		.selectFrom('answer')
		.select(({ fn }) => fn.countAll().as('count'))
		.where('answer.client_id', '=', ctx.session.user.client_id)
		.where('question_id', '=', questionId)
		.executeTakeFirstOrThrow();
	return parseInt(answerCountRecord.count?.toString() ?? '0');
}

/**
 * Get all answer calls (instance -> called instance) for a checklist.
 * This is used to build the answer call graph for cycle detection.
 *
 * @param ctx - request context
 * @param checklistId - checklist identifier
 * @returns Array of { from_instance_id, to_instance_id } representing answer calls
 */
export async function getAnswerCallGraph(ctx: ProtectedContext, checklistId: number) {
	const results = await ctx.db
		.selectFrom('answer')
		.innerJoin('question', 'question.id', 'answer.question_id')
		.innerJoin('page_instance', 'page_instance.page_id', 'question.page_id')
		.select(['page_instance.id as from_instance_id', 'answer.calls_instance_id as to_instance_id'])
		.where('answer.client_id', '=', ctx.session.user.client_id)
		.where('page_instance.client_id', '=', ctx.session.user.client_id)
		.where('page_instance.checklist_id', '=', checklistId)
		.where('answer.calls_instance_id', 'is not', null)
		.execute();

	return results.map((r) => ({
		from_instance_id: r.from_instance_id,
		to_instance_id: r.to_instance_id!,
	}));
}

/**
 * Check if setting calls_instance_id would create a cycle in the answer call graph.
 * A cycle exists if there's a path from targetInstanceId back to currentInstanceId.
 *
 * IMPORTANT NOTES ON EDGE CASES:
 *
 * 1. Template vs Instance: Answers belong to page templates (page_id), but calls_instance_id
 *    references specific instances. This means one answer can create cycles in some checklists
 *    but not others. We check ALL affected checklists.
 *
 * 2. Concurrent Updates: Race conditions can occur if two users simultaneously:
 *    - Add answers that together form a cycle (A->B in one request, B->A in another)
 *    - Delete instances while answers are being created
 *    - Modify the same answer's calls_instance_id
 *    The cycle check happens outside the main transaction, so there's a window for races.
 *    The recursive CTE queries have max depth protection as a safety net.
 *
 * 3. CASCADE Deletions: When entities are deleted, cycles are automatically broken:
 *    - Deleting an answer: Removes that edge from the call graph
 *    - Deleting a question: CASCADE deletes all its answers
 *    - Deleting a page instance: Sets calls_instance_id to NULL via CASCADE
 *    - Converting question to FREEFORM: Explicitly deletes all answers
 *
 * 4. Frontend Filtering: The frontend also filters unsafe options, but this is purely UX.
 *    The backend MUST validate because:
 *    - API can be called directly
 *    - Frontend cache may be stale
 *    - Concurrent operations may invalidate frontend state
 *
 * 5. Multiple Instances: A page template can have multiple instances in a checklist.
 *    Example: "Review Claim" page appears 3 times. An answer in the template that calls
 *    instance #5 needs to be safe from ALL 3 instances.
 *
 * @param ctx - request context
 * @param checklistId - checklist identifier
 * @param currentInstanceId - instance where the answer exists
 * @param targetInstanceId - instance the answer wants to call
 * @returns true if this would create a cycle, false if safe
 */
async function wouldCreateCycleBackend(
	ctx: ProtectedContext,
	checklistId: number,
	currentInstanceId: number,
	targetInstanceId: number
): Promise<boolean> {
	// Build the current call graph
	const callGraph = await getAnswerCallGraph(ctx, checklistId);
	const graph = new Map<number, Set<number>>();

	// Populate the graph
	for (const edge of callGraph) {
		if (!graph.has(edge.from_instance_id)) {
			graph.set(edge.from_instance_id, new Set());
		}
		graph.get(edge.from_instance_id)!.add(edge.to_instance_id);
	}

	// Check if there's a path from target back to current using DFS
	const visited = new Set<number>();

	function hasPathTo(from: number, to: number): boolean {
		if (from === to) return true;
		if (visited.has(from)) return false;

		visited.add(from);
		const callees = graph.get(from);
		if (!callees) return false;

		for (const callee of callees) {
			if (hasPathTo(callee, to)) {
				return true;
			}
		}

		return false;
	}

	return hasPathTo(targetInstanceId, currentInstanceId);
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
export async function modifyAnswer(
	ctx: ProtectedContext,
	pageId: number,
	answerId: number,
	params: AnswerUpdateParams
) {
	const existingAnswer = await ctx.db
		.selectFrom('answer')
		.select(['position', 'question_id', 'calls_instance_id'])
		.where('answer.client_id', '=', ctx.session.user.client_id)
		.where('id', '=', answerId)
		.executeTakeFirstOrThrow();

	// If updating calls_instance_id, check for cycles across all instances
	if (params.calls_instance_id !== undefined && params.calls_instance_id !== existingAnswer.calls_instance_id) {
		if (params.calls_instance_id !== null) {
			// Get all instances of this page template across all checklists
			const pageInstances = await ctx.db
				.selectFrom('page_instance')
				.select(['id as instance_id', 'checklist_id'])
				.where('page_instance.client_id', '=', ctx.session.user.client_id)
				.where('page_instance.page_id', '=', pageId)
				.execute();

			// Group by checklist and check each
			const checklistMap = new Map<number, number[]>();
			for (const { instance_id, checklist_id } of pageInstances) {
				if (!checklistMap.has(checklist_id)) {
					checklistMap.set(checklist_id, []);
				}
				checklistMap.get(checklist_id)!.push(instance_id);
			}

			// Check if updating this call would create a cycle in any checklist
			for (const [checklist_id, instanceIds] of checklistMap) {
				for (const instance_id of instanceIds) {
					const wouldCycle = await wouldCreateCycleBackend(
						ctx,
						checklist_id,
						instance_id,
						params.calls_instance_id
					);

					if (wouldCycle) {
						throw new Error(
							`Cannot set calls_instance_id to ${params.calls_instance_id}: would create a cycle in the answer call graph for checklist ${checklist_id}, instance ${instance_id}`
						);
					}
				}
			}
		}
	}

	const updates: UpdateObjectExpression<DB, 'answer'> = {};

	if (params.position !== undefined && params.position !== existingAnswer.position)
		updates.position = params.position;
	if (params.grade !== undefined) updates.grade = params.grade;
	if (params.text !== undefined) updates.text = params.text;
	if (params.description_text !== undefined) updates.description_text = params.description_text;
	if (params.description_image_url !== undefined) updates.description_image_url = params.description_image_url;
	if (params.additional_info_num_lines !== undefined)
		updates.additional_info_num_lines = params.additional_info_num_lines;
	if (params.additional_info_placeholder !== undefined)
		updates.additional_info_placeholder = params.additional_info_placeholder;
	if (params.calls_instance_id !== undefined) updates.calls_instance_id = params.calls_instance_id;
	if (params.has_additional_info !== undefined) updates.has_additional_info = params.has_additional_info;
	if (params.hidden !== undefined) updates.hidden = params.hidden;

	let newAnswer: Awaited<ReturnType<typeof getAnswer>>;
	await ctx.db.transaction().execute(async (trx) => {
		if (updates.position !== undefined) {
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
async function bumpPageVersion(ctx: ProtectedContext, pageId: number, trx: any) {
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
async function createAnswerPrivate(
	ctx: ProtectedContext,
	questionId: number,
	params: AnswerParams,
	trx: any
) {
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
			description_image_url: params.description_image_url,
			additional_info_num_lines: params.additional_info_num_lines,
			additional_info_placeholder: params.additional_info_placeholder,
			calls_instance_id: params.calls_instance_id,
			has_additional_info: params.has_additional_info,
			hidden: params.hidden ?? undefined,
			client_id: ctx.session.user.client_id,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	return newAnswer;
}
