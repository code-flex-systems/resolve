import { sql } from 'kysely';
import { UpdateObjectExpression } from 'kysely/dist/cjs/parser/update-set-parser';
import { DB } from '@/api/database/types';
import { PageInstance, PageTemplate } from '@/types/types';
import { PageInstanceStatus } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { TRPCError } from '@trpc/server';
import type { PageInstanceParams, PageParams, PageUpdateParams } from '@/schemas/pageSchemas';

/**
 * Insert a new page template and instance as a single transaction.
 *
 * @param ctx - request context
 * @param checklistId - checklist to attach the instance to
 * @param params - title and positioning info
 * @returns ids for the new page and instance
 */
export async function createPage(ctx: ProtectedContext, checklistId: number, params: PageParams) {
	let newPage: PageTemplate;
	let newInstance: PageInstance;
	await ctx.db.transaction().execute(async (trx) => {
		newPage = await trx
			.insertInto('page')
			.values({
				title: params.title,
				client_id: ctx.session.user.client_id,
				created_by: ctx.session.user.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
		newInstance = await createPageInstancePrivate(ctx, {
			checklistId,
			pageId: newPage.id,
			parentId: params.parentId,
			position: params.position,
			trx,
		});
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
	checklistId: number,
	pageId: number,
	params: { parentId: number; position: number }
) {
	let newPage: PageTemplate;
	let newInstance: PageInstance;

	await ctx.db.transaction().execute(async (trx) => {
		// Copy the page template
		newPage = await trx
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

		// Copy all questions for the page
		const questions = await trx
			.insertInto('question')
			.columns(['page_id', 'description_text', 'text', 'type', 'position', 'client_id', 'created_by'])
			.expression((eb) =>
				eb
					.selectFrom('question')
					.select((eb) => [
						eb.val(newPage.id).$castTo<number>().as('page_id'),
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

		// Copy all answers for each question
		for (const question of questions) {
			await trx
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
					'question_id',
					'calls_instance_id',
					'client_id',
					'created_by',
				])
				.expression((eb) =>
					eb
						.selectFrom('answer')
						.innerJoin('question', 'question.id', 'answer.question_id')
						.select((eb) => [
							'answer.additional_info_num_lines',
							'answer.additional_info_placeholder',
							'answer.position',
							'answer.grade',
							'answer.text',
							'answer.description_text',
							'answer.description_image_url',
							'answer.has_additional_info',
							eb.val(question.id).$castTo<number>().as('question_id'),
							'answer.calls_instance_id',
							'answer.client_id',
							eb.val(ctx.session.user.id).as('created_by'),
						])
						.where('answer.client_id', '=', ctx.session.user.client_id)
						.where('question.client_id', '=', ctx.session.user.client_id)
						.where('question.page_id', '=', pageId)
						.where('question.position', '=', question.position)
				)
				.execute();
		}

		// Create an instance of the new page template
		newInstance = await createPageInstancePrivate(ctx, {
			checklistId,
			pageId: newPage.id,
			parentId: params.parentId,
			position: params.position,
			trx,
		});
	});

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
		checklistId: number;
		pageId: number;
	} & PageInstanceParams
) {
	let newInstance: PageInstance;
	await ctx.db.transaction().execute(async (trx) => {
		newInstance = await createPageInstancePrivate(ctx, { ...params, trx });
	});
	return newInstance;
}

/**
 * Delete a page instance and reorder remaining instances.
 *
 * @param ctx - request context
 * @param instanceId - instance identifier to remove
 */
export async function deletePageInstance(ctx: ProtectedContext, instanceId: number) {
	await ctx.db.transaction().execute(async (trx) => {
		await trx
			.updateTable('answer')
			.set({ calls_instance_id: null, updated_by: ctx.session.user.id, updated_at: sql`now()` })
			.where('calls_instance_id', '=', instanceId)
			.execute();
		await trx.deleteFrom('comment').where('instance_id', '=', instanceId).execute();
		const deletedRow = await trx
			.deleteFrom('page_instance')
			.where('id', '=', instanceId)
			.returning('position')
			.executeTakeFirstOrThrow();
		await trx
			.updateTable('page_instance')
			.set((eb) => ({
				position: sql`${eb.ref('position')} - 1`,
				updated_by: ctx.session.user.id,
				updated_at: sql`now()`,
			}))
			.where('position', '>', deletedRow.position)
			.execute();
	});
}

/**
 * Fetch a page template by id.
 *
 * @param ctx - request context
 * @param pageId - page identifier
 * @returns the page template
 */
export async function getPage(ctx: ProtectedContext, pageId: number) {
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
export async function getPageInstance(ctx: ProtectedContext, instanceId: number) {
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
export async function getPageInstances(ctx: ProtectedContext, checklistId: number, parentId?: number) {
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
			if (parentId === -1) {
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
	checklistId: number,
	claimId: number,
	parentId?: number
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
			if (parentId === -1) {
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
 * Resolve visible page instance ids for a claim using a recursive CTE.
 *
 * @param ctx - request context
 * @param checklistId - checklist identifier
 * @param claimId - claim identifier
 * @returns list of visible instance ids
 */
export async function getVisiblePageInstances(ctx: ProtectedContext, checklistId: number, claimId: number) {
	// Use a recursive CTE to resolve all visible page instance ids
	const results = await ctx.db
		.withRecursive('visible_pages', (eb) =>
			eb
				.selectFrom('page_instance')
				.select(['page_instance.id as id', 'page_instance.checklist_id'])
				.where('page_instance.client_id', '=', ctx.session.user.client_id)
				.where('page_instance.checklist_id', '=', checklistId)
				.where('page_instance.parent_instance_id', 'is', null)
				.unionAll(
					eb
						.selectFrom('answer')
						.innerJoin('question_response_answer', 'question_response_answer.answer_id', 'answer.id')
						.innerJoin('question_response', 'question_response.id', 'question_response_answer.response_id')
						.select(['answer.calls_instance_id as id', 'question_response.checklist_id'])
						.$castTo<{ id: number; checklist_id: number }>()
						.where('answer.client_id', '=', ctx.session.user.client_id)
						.where('question_response.client_id', '=', ctx.session.user.client_id)
						.where('question_response.checklist_id', '=', checklistId)
						.where('question_response.claim_id', '=', claimId)
						.where('answer.calls_instance_id', 'is not', null)
				)
		)
		.selectFrom('visible_pages')
		.select('id')
		.distinct()
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
export async function modifyPage(ctx: ProtectedContext, pageId: number, params: PageUpdateParams) {
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
		claimId: number;
		instanceIds: number[];
		newStatus: PageInstanceStatus;
		templateVersion: number;
	}
) {
	for (const id of params.instanceIds) {
		await ctx.db
			.insertInto('page_instance_status')
			.values({
				claim_id: params.claimId,
				page_instance_id: id,
				status: params.newStatus,
				template_version: params.templateVersion,
				updated_at: sql`now()`,
				client_id: ctx.session.user.client_id,
			})
			.onConflict((oc) =>
				oc.columns(['claim_id', 'page_instance_id']).doUpdateSet({
					status: params.newStatus,
					template_version: params.templateVersion,
					updated_at: sql`now()`,
				})
			)
			.executeTakeFirstOrThrow();
	}
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
		trx,
	}: { checklistId: number; pageId: number; trx: any } & PageInstanceParams
) {
	// Update positions for all page instances below the one we're inserting
	await trx
		.updateTable('page_instance')
		.set((eb) => ({
			position: sql`${eb.ref('position')} + 1`,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		}))
		.where('position', '>=', position)
		.execute();
	const newInstance = await trx
		.insertInto('page_instance')
		.values({
			checklist_id: checklistId,
			page_id: pageId,
			parent_instance_id: parentId === -1 ? null : parentId,
			position,
			client_id: ctx.session.user.client_id,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	return newInstance;
}
