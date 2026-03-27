import { sql } from 'kysely';
import { UpdateObjectExpression } from 'kysely/dist/cjs/parser/update-set-parser';
import { DB } from '@/api/database/types';
import { PageInstance, PageTemplate } from '@/types/types';
import { PageInstanceStatus } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { TRPCError } from '@trpc/server';
import type { PageInstanceParams, PageParams, PageUpdateParams } from '@/schemas/pageSchemas';
import { insertCallEdgesBulk, insertCallEdgesForInstance } from './answerQueries';

/**
 * Insert a new page template and instance as a single transaction.
 *
 * @param ctx - request context
 * @param checklistId - checklist to attach the instance to
 * @param params - title and positioning info
 * @returns ids for the new page and instance
 */
export async function createPage(ctx: ProtectedContext, checklistId: string, params: PageParams) {
	const newPage = await ctx.db
		.insertInto('page')
		.values({
			title: params.title,
			client_id: ctx.session.user.client_id!,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	const newInstance = await createPageInstancePrivate(ctx, {
		checklistId,
		pageId: newPage.id,
		parentId: params.parentId,
		position: params.position,
	});

	return {
		id: newPage.id,
		title: newPage.title,
		instance_id: newInstance.id,
	};
}

/**
 * Copy a page template including all questions and answers, then create an instance.
 *
 * @param ctx - request context
 * @param checklistId - checklist to attach the new instance to
 * @param pageId - source page template to copy
 * @param params - positioning info for the new instance
 * @returns new page template and instance
 */
export async function copyPageTemplate(
	ctx: ProtectedContext,
	checklistId: string,
	pageId: string,
	params: { parentId?: string | null; position: number }
) {
	// First, get original question IDs to build the mapping after insert
	const originalQuestions = await ctx.db
		.selectFrom('question')
		.select(['id', 'position'])
		.where('client_id', '=', ctx.session.user.client_id)
		.where('page_id', '=', pageId)
		.orderBy('position')
		.execute();

	// Copy the page template
	const newPage = await ctx.db
		.insertInto('page')
		.columns(['title', 'client_id', 'created_by'])
		.expression((eb) =>
			eb
				.selectFrom('page')
				.select(['title', 'client_id', eb.val(ctx.session.user.id).as('created_by')])
				.where('page.client_id', '=', ctx.session.user.client_id)
				.where('id', '=', pageId)
		)
		.returningAll()
		.executeTakeFirstOrThrow(() => new Error('Page template does not exist'));

	// Copy all questions for the page (ordered by position to match originalQuestions)
	const newQuestions = await ctx.db
		.insertInto('question')
		.columns(['page_id', 'description_text', 'text', 'type', 'position', 'client_id', 'created_by'])
		.expression((eb) =>
			eb
				.selectFrom('question')
				.select((eb) => [
					eb.val(newPage.id).$castTo<string>().as('page_id'),
					'description_text',
					'text',
					'type',
					'position',
					'client_id',
					eb.val(ctx.session.user.id).as('created_by'),
				])
				.where('question.client_id', '=', ctx.session.user.client_id)
				.where('page_id', '=', pageId)
				.orderBy('position')
		)
		.returning(['id', 'position'])
		.execute();

	// Create an instance of the new page template first (needed for answer_call_edges)
	const newInstance = await createPageInstancePrivate(ctx, {
		checklistId,
		pageId: newPage.id,
		parentId: params.parentId,
		position: params.position,
	});

	// Build mapping of old question ID -> new question ID using position as join key
	if (newQuestions.length > 0) {
		const positionToNewId = new Map(newQuestions.map((q) => [q.position, q.id]));
		const questionIdMapping: Array<{ oldId: string; newId: string }> = [];
		for (const orig of originalQuestions) {
			const newId = positionToNewId.get(orig.position);
			if (newId !== undefined) {
				questionIdMapping.push({ oldId: orig.id, newId });
			}
		}

		// Single bulk INSERT for all answers using VALUES-based mapping
		// This is O(1) queries instead of O(N) queries
		if (questionIdMapping.length > 0) {
			const copiedAnswers = await ctx.db
				.insertInto('answer')
				.columns([
					'additional_info_num_lines',
					'additional_info_placeholder',
					'position',
					'grade',
					'text',
					'description_text',
					'description_image_url',
					'has_additional_info',
					'hidden',
					'question_id',
					'calls_instance_id',
					'requires_upload',
					'allowed_extensions',
					'client_id',
					'created_by',
				])
				.expression(
					sql`
						SELECT
							answer.additional_info_num_lines,
							answer.additional_info_placeholder,
							answer.position,
							answer.grade,
							answer.text,
							answer.description_text,
							answer.description_image_url,
							answer.has_additional_info,
							answer.hidden,
							qmap.new_question_id AS question_id,
							answer.calls_instance_id,
							answer.requires_upload,
							answer.allowed_extensions,
							answer.client_id,
							${ctx.session.user.id} AS created_by
						FROM answer
						INNER JOIN (VALUES ${sql.join(
							questionIdMapping.map((m) => sql`(${m.oldId}::uuid, ${m.newId}::uuid)`),
							sql`, `
						)}) AS qmap(old_question_id, new_question_id)
						ON answer.question_id = qmap.old_question_id
						WHERE answer.client_id = ${ctx.session.user.client_id}
					`
				)
				.returning(['id', 'calls_instance_id'])
				.execute();

			// Populate answer_call_edges for copied answers with calls_instance_id
			const answersWithCalls = copiedAnswers
				.filter((a): a is { id: string; calls_instance_id: string } => a.calls_instance_id !== null)
				.map((a) => ({ id: a.id, calls_instance_id: a.calls_instance_id }));

			if (answersWithCalls.length > 0) {
				await insertCallEdgesBulk(ctx, newPage.id, answersWithCalls);
			}
		}
	}

	return {
		id: newPage.id,
		title: newPage.title,
		instance_id: newInstance.id,
	};
}

/**
 * Create a page instance optionally using an external transaction.
 *
 * @param ctx - request context
 * @param params - identifiers and positioning for the instance
 * @returns created page instance
 */
export async function createPageInstance(
	ctx: ProtectedContext,
	params: {
		checklistId: string;
		pageId: string;
	} & PageInstanceParams
) {
	return await createPageInstancePrivate(ctx, params);
}

/**
 * Fetch a page instance for logging before deletion.
 *
 * @param ctx - request context
 * @param instanceId - instance identifier
 * @returns the page instance details
 */
export async function getPageInstanceForDeletion(ctx: ProtectedContext, instanceId: string) {
	return await ctx.db
		.selectFrom('page_instance')
		.innerJoin('page', 'page.id', 'page_instance.page_id')
		.select([
			'page_instance.id',
			'page_instance.page_id',
			'page_instance.checklist_id',
			'page.title',
		])
		.where('page_instance.id', '=', instanceId)
		.where('page_instance.client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

/**
 * Delete a page instance and reorder remaining instances.
 *
 * @param ctx - request context
 * @param instanceId - instance identifier to remove
 */
export async function deletePageInstance(ctx: ProtectedContext, instanceId: string) {
	await ctx.db
		.updateTable('answer')
		.set({ calls_instance_id: null, updated_by: ctx.session.user.id, updated_at: sql`now()` })
		.where('calls_instance_id', '=', instanceId)
		.where('client_id', '=', ctx.session.user.client_id)
		.execute();
	await ctx.db
		.deleteFrom('comment')
		.where('instance_id', '=', instanceId)
		.where('client_id', '=', ctx.session.user.client_id)
		.execute();
	const deletedRow = await ctx.db
		.deleteFrom('page_instance')
		.where('id', '=', instanceId)
		.where('client_id', '=', ctx.session.user.client_id)
		.returning(['position', 'checklist_id', 'parent_instance_id'])
		.executeTakeFirstOrThrow();

	// Update positions for sibling page instances after the deleted position
	await ctx.db
		.updateTable('page_instance')
		.set((eb) => ({
			position: sql`${eb.ref('position')} - 1`,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		}))
		.where('client_id', '=', ctx.session.user.client_id)
		.where('checklist_id', '=', deletedRow.checklist_id)
		.where((eb) =>
			deletedRow.parent_instance_id !== null
				? eb('parent_instance_id', '=', deletedRow.parent_instance_id)
				: eb('parent_instance_id', 'is', null)
		)
		.where('position', '>', deletedRow.position)
		.execute();
}

/**
 * Fetch a page template by id.
 *
 * @param ctx - request context
 * @param pageId - page identifier
 * @returns the page template
 */
export async function getPage(ctx: ProtectedContext, pageId: string) {
	return await ctx.db
		.selectFrom('page')
		.selectAll()
		.where('page.client_id', '=', ctx.session.user.client_id)
		.where('id', '=', pageId)
		.executeTakeFirstOrThrow();
}

/**
 * Fetch all visible page templates for the current client.
 *
 * @param ctx - request context
 * @returns list of page templates
 */
export async function getPages(ctx: ProtectedContext) {
	return await ctx.db
		.selectFrom('page')
		.selectAll()
		.where('page.client_id', '=', ctx.session.user.client_id)
		.where('hidden', 'is', false)
		.execute();
}

/**
 * Load a page template joined with a specific instance.
 *
 * @param ctx - request context
 * @param instanceId - page instance identifier
 * @returns the template with instance info
 */
export async function getPageInstance(ctx: ProtectedContext, instanceId: string) {
	return await ctx.db
		.selectFrom('page')
		.innerJoin('page_instance', 'page_instance.page_id', 'page.id')
		.selectAll('page')
		.select(['page_instance.id as instance_id', 'page_instance.position'])
		.where('page.client_id', '=', ctx.session.user.client_id)
		.where('page_instance.id', '=', instanceId)
		.executeTakeFirstOrThrow();
}

/**
 * Retrieve child page instances for a checklist.
 *
 * @param ctx - request context
 * @param checklistId - parent checklist id
 * @param parentId - optional parent instance filter
 * @returns list of page instances
 */
export async function getPageInstances(ctx: ProtectedContext, checklistId: string, parentId?: string | null) {
	return await ctx.db
		.selectFrom('page')
		.innerJoin('page_instance', 'page_instance.page_id', 'page.id')
		.select((eb) => [
			'page.id',
			'page.title',
			'page_instance.id as instance_id',
			'page_instance.parent_instance_id',
			'page_instance.position',
			'page.version as template_version',
			eb.val(PageInstanceStatus.UNSTARTED).as('status'),
		])
		.where('page.client_id', '=', ctx.session.user.client_id)
		.where((eb) => {
			const andClause = [eb('page_instance.checklist_id', '=', checklistId)];
			if (parentId === null) {
				andClause.push(eb('page_instance.parent_instance_id', 'is', null));
			} else if (parentId) {
				andClause.push(eb('page_instance.parent_instance_id', '=', parentId));
			}
			return eb.and(andClause);
		})
		.orderBy('page_instance.position')
		.execute();
}

/**
 * List page instances for a claim including their current status.
 *
 * @param ctx - request context
 * @param checklistId - checklist identifier
 * @param claimId - claim identifier
 * @param parentId - optional parent instance filter
 * @returns array of instances with status data
 */
export async function getPageInstancesForClaim(
	ctx: ProtectedContext,
	checklistId: string,
	claimId: string,
	parentId?: string | null
) {
	// Determine the latest status for each page instance on a claim
	return await ctx.db
		.selectFrom('page')
		.innerJoin('page_instance', 'page_instance.page_id', 'page.id')
		.leftJoin('page_instance_status', (join) =>
			join
				.onRef('page_instance_status.page_instance_id', '=', 'page_instance.id')
				.on('page_instance_status.claim_id', '=', claimId)
		)
		.select((eb) => [
			'page.id',
			'page.title',
			'page_instance.id as instance_id',
			'page_instance.parent_instance_id',
			'page_instance.position',
			sql`coalesce(${eb.ref('page_instance_status.template_version')}, 1)`
				.$castTo<number>()
				.as('template_version'),
			eb
				.case()
				.when('page_instance_status.id', 'is', null)
				.then(PageInstanceStatus.UNSTARTED)
				.when('page_instance_status.template_version', '<>', eb.ref('page.version'))
				.then(PageInstanceStatus.STALE)
				.else(eb.ref('page_instance_status.status'))
				.end()
				.$castTo<PageInstanceStatus>()
				.as('status'),
		])
		.where('page.client_id', '=', ctx.session.user.client_id)
		.where((eb) => {
			const andClause = [eb('page_instance.checklist_id', '=', checklistId)];
			if (parentId === null) {
				andClause.push(eb('page_instance.parent_instance_id', 'is', null));
			} else if (parentId) {
				andClause.push(eb('page_instance.parent_instance_id', '=', parentId));
			}
			return eb.and(andClause);
		})
		.orderBy('page_instance.position')
		.execute();
}

/**
 * Resolve visible page instance ids for a claim.
 * Uses answer_call_edges table for efficient lookups instead of walking answer tables.
 *
 * @param ctx - request context
 * @param checklistId - checklist identifier
 * @param claimId - claim identifier
 * @returns list of visible instance ids
 */
export async function getVisiblePageInstances(ctx: ProtectedContext, checklistId: string, claimId: string) {
	// Page instances are visible if:
	// 1. They are root instances (no parent)
	// 2. OR an answer that unlocks them was selected in a question response
	const results = await ctx.db
		.selectFrom('page_instance')
		.select('page_instance.id')
		.distinct()
		.where('page_instance.client_id', '=', ctx.session.user.client_id)
		.where('page_instance.checklist_id', '=', checklistId)
		.where((eb) =>
			eb.or([
				// Root instances are always visible
				eb('page_instance.parent_instance_id', 'is', null),
				// Non-root instances are visible if unlocked via answer selection
				eb.exists(
					eb
						.selectFrom('answer_call_edges as ace')
						.innerJoin('question_response_answer as qra', 'qra.answer_id', 'ace.answer_id')
						.innerJoin('question_response as qr', 'qr.id', 'qra.response_id')
						.whereRef('ace.to_instance_id', '=', 'page_instance.id')
						.where('ace.checklist_id', '=', checklistId)
						.where('ace.client_id', '=', ctx.session.user.client_id)
						.where('qr.claim_id', '=', claimId)
						.where('qr.client_id', '=', ctx.session.user.client_id)
				),
			])
		)
		.execute();
	return results.map((row) => row.id);
}

/**
 * Update page template properties such as title or hidden flag.
 *
 * @param ctx - request context
 * @param pageId - page identifier
 * @param params - fields to modify
 * @returns the updated template
 */
export async function modifyPage(ctx: ProtectedContext, pageId: string, params: PageUpdateParams) {
	const updates: UpdateObjectExpression<DB, 'page'> = {};
	if (params.title !== undefined) updates.title = params.title;
	if (params.hidden != null) updates.hidden = params.hidden;
	if (!Object.keys(updates).length) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No updates' });
	return await ctx.db
		.updateTable('page')
		.set({
			...updates,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('id', '=', pageId)
		.where('client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Set the status for one or more page instances on a claim.
 *
 * @param ctx - request context
 * @param params - claim id, instance ids, status and version info
 */
export async function modifyPageInstanceStatus(
	ctx: ProtectedContext,
	params: {
		claimId: string;
		instanceIds: string[];
		newStatus: PageInstanceStatus;
		templateVersion: number;
	}
) {
	if (params.instanceIds.length === 0) return;

	await ctx.db
		.insertInto('page_instance_status')
		.values(
			params.instanceIds.map((id) => ({
				claim_id: params.claimId,
				page_instance_id: id,
				status: params.newStatus,
				template_version: params.templateVersion,
				updated_at: sql`now()`,
				client_id: ctx.session.user.client_id!,
			}))
		)
		.onConflict((oc) =>
			oc.columns(['claim_id', 'page_instance_id']).doUpdateSet({
				status: params.newStatus,
				template_version: params.templateVersion,
				updated_at: sql`now()`,
			})
		)
		.execute();
}

// private methods

/**
 * Internal helper to insert a page instance and shift positions.
 *
 * @param ctx - request context
 * @param param0 - identifiers and transaction
 * @returns the created instance
 */
async function createPageInstancePrivate(
	ctx: ProtectedContext,
	{
		checklistId,
		pageId,
		parentId,
		position,
	}: { checklistId: string; pageId: string } & PageInstanceParams
) {
	// Normalize parentId: null means root level (null parent in DB), undefined also treated as null
	const normalizedParentId = parentId ?? null;

	// Update positions for sibling page instances at or below the insert position
	await ctx.db
		.updateTable('page_instance')
		.set((eb) => ({
			position: sql`${eb.ref('position')} + 1`,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		}))
		.where('client_id', '=', ctx.session.user.client_id)
		.where('checklist_id', '=', checklistId)
		.where((eb) =>
			normalizedParentId !== null
				? eb('parent_instance_id', '=', normalizedParentId)
				: eb('parent_instance_id', 'is', null)
		)
		.where('position', '>=', position)
		.execute();
	const newInstance = await ctx.db
		.insertInto('page_instance')
		.values({
			checklist_id: checklistId,
			page_id: pageId,
			parent_instance_id: normalizedParentId,
			position,
			client_id: ctx.session.user.client_id!,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	// Create edges for any answers on this page that have calls_instance_id
	await insertCallEdgesForInstance(ctx, newInstance.id, checklistId, pageId);

	return newInstance;
}
