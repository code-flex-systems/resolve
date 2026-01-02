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
	// If this answer calls another instance, check for cycles across all checklists
	// Uses batched approach: one CTE per checklist instead of per instance
	if (params.calls_instance_id) {
		await checkCyclesForPage(ctx, pageId, params.calls_instance_id);
	}

	const newAnswer = await createAnswerPrivate(ctx, questionId, params);

	// Insert edges for the new answer if it has calls_instance_id
	if (params.calls_instance_id) {
		await insertCallEdges(ctx, pageId, newAnswer.id, params.calls_instance_id);
	}

	// Only bump the version if this action isn't part of another update
	await bumpPageVersion(ctx, pageId);
	return newAnswer;
}

/**
 * Copy an existing answer to a target question using INSERT...SELECT.
 * Position is computed inline to avoid a separate query.
 *
 * Cycle detection is performed when copying to a different page since the
 * calls_instance_id may create a cycle in the context of the target page's
 * instances.
 *
 * @param ctx - request context
 * @param pageId - page id for version bumping (target page)
 * @param questionId - target question to copy the answer to
 * @param answerId - source answer to copy
 * @returns the newly created answer
 */
export async function copyAnswer(
	ctx: ProtectedContext,
	pageId: number,
	questionId: number,
	answerId: number
) {
	// Check if the source answer has calls_instance_id and validate cycles for target page
	// Uses batched approach: one CTE per checklist instead of per instance
	const sourceAnswer = await ctx.db
		.selectFrom('answer')
		.select(['calls_instance_id'])
		.where('id', '=', answerId)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();

	if (sourceAnswer?.calls_instance_id) {
		await checkCyclesForPage(ctx, pageId, sourceAnswer.calls_instance_id);
	}

	const newAnswer = await ctx.db
		.insertInto('answer')
		.columns([
			'question_id',
			'position',
			'grade',
			'text',
			'description_text',
			'description_image_url',
			'has_additional_info',
			'additional_info_placeholder',
			'additional_info_num_lines',
			'calls_instance_id',
			'hidden',
			'requires_upload',
			'allowed_extensions',
			'client_id',
			'created_by',
		])
		.expression((eb) =>
			eb
				.selectFrom('answer as source')
				.select([
					eb.val(questionId).$castTo<number>().as('question_id'),
					sql<number>`COALESCE((
						SELECT MAX(position) FROM answer
						WHERE client_id = ${ctx.session.user.client_id}
						AND question_id = ${questionId}
					), -1) + 1`.as('position'),
					'source.grade',
					'source.text',
					'source.description_text',
					'source.description_image_url',
					'source.has_additional_info',
					'source.additional_info_placeholder',
					'source.additional_info_num_lines',
					'source.calls_instance_id',
					'source.hidden',
					'source.requires_upload',
					'source.allowed_extensions',
					'source.client_id',
					eb.val(ctx.session.user.id).as('created_by'),
				])
				.where('source.client_id', '=', ctx.session.user.client_id)
				.where('source.id', '=', answerId)
		)
		.returningAll()
		.executeTakeFirstOrThrow(() => new Error('Answer does not exist'));

	// Insert edges for the copied answer if it has calls_instance_id
	if (newAnswer.calls_instance_id) {
		await insertCallEdges(ctx, pageId, newAnswer.id, newAnswer.calls_instance_id);
	}

	await bumpPageVersion(ctx, pageId);

	return newAnswer;
}

/**
 * Fetch an answer for logging before deletion.
 *
 * @param ctx - request context
 * @param answerId - answer identifier
 * @returns the answer details
 */
export async function getAnswerForDeletion(ctx: ProtectedContext, answerId: number) {
	return await ctx.db
		.selectFrom('answer')
		.select(['id', 'question_id', 'text', 'grade'])
		.where('id', '=', answerId)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

/**
 * Remove an answer and bump the owning page version.
 *
 * @param ctx - request context
 * @param pageId - id of the page containing the answer
 * @param answerId - identifier of the answer to delete
 */
export async function deleteAnswer(ctx: ProtectedContext, pageId: number, answerId: number) {
	const { position, question_id } = await ctx.db
		.deleteFrom('answer')
		.where('id', '=', answerId)
		.where('client_id', '=', ctx.session.user.client_id)
		.returning(['position', 'question_id'])
		.executeTakeFirstOrThrow();

	await ctx.db
		.updateTable('answer')
		.set((eb) => ({ position: sql`${eb.ref('position')} - 1` }))
		.where('client_id', '=', ctx.session.user.client_id)
		.where('question_id', '=', question_id)
		.where('position', '>', position)
		.execute();

	await bumpPageVersion(ctx, pageId);
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
	// Select only UI-needed columns to reduce payload
	return await ctx.db
		.selectFrom('answer')
		.select([
			'id',
			'text',
			'position',
			'grade',
			'description_text',
			'description_image_url',
			'has_additional_info',
			'additional_info_placeholder',
			'additional_info_num_lines',
			'calls_instance_id',
			'hidden',
			'requires_upload',
			'allowed_extensions',
		])
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
 * This queries the materialized answer_call_edges table for O(1) lookup.
 *
 * @param ctx - request context
 * @param checklistId - checklist identifier
 * @returns Array of { from_instance_id, to_instance_id } representing answer calls
 */
export async function getAnswerCallGraph(ctx: ProtectedContext, checklistId: number) {
	return await ctx.db
		.selectFrom('answer_call_edges')
		.select(['from_instance_id', 'to_instance_id'])
		.where('client_id', '=', ctx.session.user.client_id)
		.where('checklist_id', '=', checklistId)
		.execute();
}

/**
 * Check if setting calls_instance_id would create a cycle for ANY instance in the given checklist.
 * Uses a single recursive CTE to check if there's a path from targetInstanceId back to any source instance.
 *
 * This is O(1) per checklist regardless of the number of source instances.
 *
 * @param ctx - request context
 * @param checklistId - checklist identifier
 * @param sourceInstanceIds - all instances where this answer template exists
 * @param targetInstanceId - instance the answer wants to call
 * @returns { hasCycle: boolean, conflictingInstanceId?: number } - whether cycle exists and which instance
 */
async function wouldCreateCycleForChecklist(
	ctx: ProtectedContext,
	checklistId: number,
	sourceInstanceIds: number[],
	targetInstanceId: number
): Promise<{ hasCycle: boolean; conflictingInstanceId?: number }> {
	// Check for self-referential calls (any source instance equals target)
	const selfRef = sourceInstanceIds.find((id) => id === targetInstanceId);
	if (selfRef !== undefined) {
		return { hasCycle: true, conflictingInstanceId: selfRef };
	}

	if (sourceInstanceIds.length === 0) {
		return { hasCycle: false };
	}

	// Use recursive CTE to find all reachable nodes from target, then check if any source is reachable
	const result = await sql<{ conflicting_instance_id: number | null }>`
		WITH RECURSIVE reachable AS (
			-- Base case: start from the target instance
			SELECT to_instance_id as instance_id, 1 as depth
			FROM answer_call_edges
			WHERE client_id = ${ctx.session.user.client_id}
				AND checklist_id = ${checklistId}
				AND from_instance_id = ${targetInstanceId}

			UNION ALL

			-- Recursive case: follow edges, with max depth protection
			SELECT e.to_instance_id, r.depth + 1
			FROM reachable r
			INNER JOIN answer_call_edges e ON e.from_instance_id = r.instance_id
			WHERE e.client_id = ${ctx.session.user.client_id}
				AND e.checklist_id = ${checklistId}
				AND r.depth < 100
		)
		SELECT instance_id as conflicting_instance_id
		FROM reachable
		WHERE instance_id = ANY(${sourceInstanceIds}::int[])
		LIMIT 1
	`.execute(ctx.db);

	const conflictingId = result.rows[0]?.conflicting_instance_id;
	return {
		hasCycle: conflictingId !== null && conflictingId !== undefined,
		conflictingInstanceId: conflictingId ?? undefined,
	};
}

/**
 * Check for cycles across all checklists that use the given page.
 * Groups instances by checklist and runs one CTE per checklist.
 *
 * Complexity: O(checklists) instead of O(instances²)
 *
 * @param ctx - request context
 * @param pageId - page id where the answer will be placed
 * @param targetInstanceId - instance the answer wants to call
 * @throws Error if a cycle would be created
 */
async function checkCyclesForPage(
	ctx: ProtectedContext,
	pageId: number,
	targetInstanceId: number
): Promise<void> {
	// Get all instances of this page template grouped by checklist
	const pageInstances = await ctx.db
		.selectFrom('page_instance')
		.select(['id as instance_id', 'checklist_id'])
		.where('page_instance.client_id', '=', ctx.session.user.client_id)
		.where('page_instance.page_id', '=', pageId)
		.execute();

	// Group by checklist
	const checklistMap = new Map<number, number[]>();
	for (const { instance_id, checklist_id } of pageInstances) {
		if (!checklistMap.has(checklist_id)) {
			checklistMap.set(checklist_id, []);
		}
		checklistMap.get(checklist_id)!.push(instance_id);
	}

	// Check each checklist once (not each instance)
	for (const [checklist_id, instanceIds] of checklistMap) {
		const result = await wouldCreateCycleForChecklist(ctx, checklist_id, instanceIds, targetInstanceId);

		if (result.hasCycle) {
			throw new Error(
				`Cannot set calls_instance_id to ${targetInstanceId}: would create a cycle in the answer call graph for checklist ${checklist_id}, instance ${result.conflictingInstanceId}`
			);
		}
	}
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

	// If updating calls_instance_id, check for cycles across all checklists
	// Uses batched approach: one CTE per checklist instead of per instance
	if (params.calls_instance_id !== undefined && params.calls_instance_id !== existingAnswer.calls_instance_id) {
		if (params.calls_instance_id !== null) {
			await checkCyclesForPage(ctx, pageId, params.calls_instance_id);
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
	if (params.requires_upload !== undefined) updates.requires_upload = params.requires_upload;
	if (params.allowed_extensions !== undefined) updates.allowed_extensions = params.allowed_extensions;

	// Use ROW_NUMBER() CTE to recalculate positions in a single query
	// Subtract 1 from ROW_NUMBER() since positions are 0-based
	if (updates.position !== undefined) {
		await sql`
			WITH reordered AS (
				SELECT id,
					ROW_NUMBER() OVER (
						ORDER BY
							CASE
								WHEN id = ${answerId} THEN ${updates.position}
								WHEN position >= ${updates.position} AND position < ${existingAnswer.position} THEN position + 1
								WHEN position > ${existingAnswer.position} AND position <= ${updates.position} THEN position - 1
								ELSE position
							END,
							id
					) - 1 as new_position
				FROM answer
				WHERE client_id = ${ctx.session.user.client_id}
					AND question_id = ${existingAnswer.question_id}
			)
			UPDATE answer
			SET position = reordered.new_position
			FROM reordered
			WHERE answer.id = reordered.id
				AND answer.position != reordered.new_position
		`.execute(ctx.db);
	}

	const newAnswer = await ctx.db
		.updateTable('answer')
		.set({
			...updates,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('id', '=', answerId)
		.where('client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();

	// Maintain edges when calls_instance_id changes
	if (params.calls_instance_id !== undefined && params.calls_instance_id !== existingAnswer.calls_instance_id) {
		// Delete old edges if there were any
		if (existingAnswer.calls_instance_id !== null) {
			await deleteCallEdges(ctx, answerId);
		}
		// Insert new edges if the new value is not null
		if (params.calls_instance_id !== null) {
			await insertCallEdges(ctx, pageId, answerId, params.calls_instance_id);
		}
	}

	await bumpPageVersion(ctx, pageId);

	return newAnswer;
}

// private methods

/**
 * Increment the version number of a page.
 *
 * @param ctx - request context
 * @param pageId - page to bump
 */
async function bumpPageVersion(ctx: ProtectedContext, pageId: number) {
	await ctx.db
		.updateTable('page')
		.set((eb) => ({ version: sql`${eb.ref('version')} + 1` }))
		.where('id', '=', pageId)
		.where('client_id', '=', ctx.session.user.client_id)
		.execute();
}

/**
 * Helper to insert an answer.
 *
 * @param ctx - request context
 * @param questionId - question to append the answer to
 * @param params - answer fields
 * @returns the newly created answer
 */
async function createAnswerPrivate(
	ctx: ProtectedContext,
	questionId: number,
	params: AnswerParams
) {
	await ctx.db
		.updateTable('answer')
		.set((eb) => ({ position: sql`${eb.ref('position')} + 1` }))
		.where('client_id', '=', ctx.session.user.client_id)
		.where('question_id', '=', questionId)
		.where('position', '>=', params.position)
		.execute();

	const newAnswer = await ctx.db
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
			requires_upload: params.requires_upload ?? undefined,
			allowed_extensions: params.allowed_extensions ?? undefined,
			client_id: ctx.session.user.client_id,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	return newAnswer;
}

/**
 * Insert edges into answer_call_edges for an answer with calls_instance_id.
 * Inserts edges for all page instances of the answer's page template.
 *
 * @param ctx - request context
 * @param pageId - page id of the answer's question
 * @param answerId - the answer that has the call
 * @param targetInstanceId - the instance being called
 */
export async function insertCallEdges(
	ctx: ProtectedContext,
	pageId: number,
	answerId: number,
	targetInstanceId: number
) {
	// Insert edges for all instances of this page template across all checklists
	await ctx.db
		.insertInto('answer_call_edges')
		.columns(['client_id', 'checklist_id', 'from_instance_id', 'to_instance_id', 'answer_id'])
		.expression((eb) =>
			eb
				.selectFrom('page_instance')
				.select([
					eb.val(ctx.session.user.client_id).as('client_id'),
					'checklist_id',
					'id as from_instance_id',
					eb.val(targetInstanceId).as('to_instance_id'),
					eb.val(answerId).as('answer_id'),
				])
				.where('client_id', '=', ctx.session.user.client_id)
				.where('page_id', '=', pageId)
		)
		.onConflict((oc) => oc.columns(['checklist_id', 'from_instance_id', 'to_instance_id', 'answer_id']).doNothing())
		.execute();
}

/**
 * Bulk insert edges for multiple answers with calls_instance_id.
 * Uses a single INSERT...SELECT that cross-joins page instances with the answers.
 *
 * Complexity: O(instances + answers) instead of O(instances * answers)
 *
 * @param ctx - request context
 * @param pageId - page id of the answers' question
 * @param answers - array of { id, calls_instance_id } for answers that have calls
 */
export async function insertCallEdgesBulk(
	ctx: ProtectedContext,
	pageId: number,
	answers: Array<{ id: number; calls_instance_id: number }>
) {
	if (answers.length === 0) return;

	// Build arrays for UNNEST
	const answerIds = answers.map((a) => a.id);
	const targetInstanceIds = answers.map((a) => a.calls_instance_id);

	// Single INSERT using UNNEST WITH ORDINALITY to zip arrays element-by-element,
	// then cross-join with page_instance to generate all edges
	await sql`
		INSERT INTO answer_call_edges (client_id, checklist_id, from_instance_id, to_instance_id, answer_id)
		SELECT
			${ctx.session.user.client_id}::uuid as client_id,
			pi.checklist_id,
			pi.id as from_instance_id,
			a.target_instance_id as to_instance_id,
			a.answer_id
		FROM page_instance pi
		CROSS JOIN LATERAL (
			SELECT answer_id, target_instance_id
			FROM unnest(${answerIds}::int[], ${targetInstanceIds}::int[])
				WITH ORDINALITY AS t(answer_id, target_instance_id, ord)
		) a
		WHERE pi.client_id = ${ctx.session.user.client_id}
			AND pi.page_id = ${pageId}
		ON CONFLICT (checklist_id, from_instance_id, to_instance_id, answer_id) DO NOTHING
	`.execute(ctx.db);
}

/**
 * Insert edges for a specific page instance.
 * Used when creating a new instance of an existing page that may have
 * answers with calls_instance_id.
 *
 * @param ctx - request context
 * @param instanceId - the new instance to create edges from
 * @param checklistId - the checklist the instance belongs to
 * @param pageId - the page template to find answers with calls
 */
export async function insertCallEdgesForInstance(
	ctx: ProtectedContext,
	instanceId: number,
	checklistId: number,
	pageId: number
) {
	// Find all answers on this page that have calls_instance_id and insert edges
	await ctx.db
		.insertInto('answer_call_edges')
		.columns(['client_id', 'checklist_id', 'from_instance_id', 'to_instance_id', 'answer_id'])
		.expression((eb) =>
			eb
				.selectFrom('answer')
				.innerJoin('question', 'question.id', 'answer.question_id')
				.select([
					eb.val(ctx.session.user.client_id).as('client_id'),
					eb.val(checklistId).as('checklist_id'),
					eb.val(instanceId).as('from_instance_id'),
					'answer.calls_instance_id as to_instance_id',
					'answer.id as answer_id',
				])
				.where('question.page_id', '=', pageId)
				.where('question.client_id', '=', ctx.session.user.client_id)
				.where('answer.client_id', '=', ctx.session.user.client_id)
				.where('answer.calls_instance_id', 'is not', null)
		)
		.onConflict((oc) => oc.columns(['checklist_id', 'from_instance_id', 'to_instance_id', 'answer_id']).doNothing())
		.execute();
}

/**
 * Delete all edges for an answer from answer_call_edges.
 *
 * @param ctx - request context
 * @param answerId - the answer whose edges should be deleted
 */
async function deleteCallEdges(ctx: ProtectedContext, answerId: number) {
	await ctx.db
		.deleteFrom('answer_call_edges')
		.where('client_id', '=', ctx.session.user.client_id)
		.where('answer_id', '=', answerId)
		.execute();
}
