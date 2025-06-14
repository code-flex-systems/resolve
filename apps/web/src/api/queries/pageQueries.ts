import { sql, Transaction } from 'kysely';
import { UpdateObjectExpression } from 'kysely/dist/cjs/parser/update-set-parser';
import { db } from '@/api/database/kysely';
import { DB } from '@/api/database/types';
import { PageInstanceStatus } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { applyClientScope } from '../database/clientScoped';

export async function createPage(ctx: ProtectedContext, checklistId: number, params: object) {
	let newPage: any;
	let newInstance: any;
	await db.transaction().execute(async (trx) => {
		newPage = await trx
			.insertInto('page')
			.values({
				title: params.title,
				client_id: ctx.session.user.client_id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
		newInstance = await createPageInstance(ctx, {
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

export async function createPageInstance(
	ctx: ProtectedContext,
	params: {
		checklistId: number;
		pageId: number;
		parentId: number;
		position: number;
		trx?: Transaction<DB>;
	}
) {
	let newInstance: any;
	if (params.trx) {
		newInstance = await createPageInstancePrivate(ctx, { ...params, trx: params.trx });
	} else {
		await db.transaction().execute(async (localTrx) => {
			newInstance = await createPageInstancePrivate(ctx, { ...params, trx: localTrx });
		});
	}
	return newInstance;
}

export async function deletePageInstance(ctx: ProtectedContext, instanceId: number) {
	await db.transaction().execute(async (trx) => {
		await trx
			.updateTable('answer')
			.set({ calls_instance_id: null })
			.where('calls_instance_id', '=', instanceId)
			.execute();
		const deletedRow = await trx
			.deleteFrom('page_instance')
			.where('id', '=', instanceId)
			.returning('position')
			.executeTakeFirstOrThrow();
		await trx
			.updateTable('page_instance')
			.set((eb) => ({ position: sql`${eb.ref('position')} - 1` }))
			.where('position', '>', deletedRow.position)
			.execute();
	});
}

export async function getPage(ctx: ProtectedContext, pageId: number) {
	return await applyClientScope(
		db.selectFrom('page').selectAll().where('id', '=', pageId),
		ctx.session.user.client_id
	).executeTakeFirstOrThrow();
}

export async function getPages(ctx: ProtectedContext) {
	return await applyClientScope(
		db.selectFrom('page').selectAll().where('hidden', 'is', false),
		ctx.session.user.client_id
	).execute();
}

export async function getPageInstance(ctx: ProtectedContext, instanceId: number) {
	return await applyClientScope(
		db
			.selectFrom('page')
			.innerJoin('page_instance', 'page_instance.page_id', 'page.id')
			.selectAll('page')
			.select(['page_instance.id as instance_id', 'page_instance.position'])
			.where('page_instance.id', '=', instanceId),
		ctx.session.user.client_id,
		'page'
	).executeTakeFirstOrThrow();
}

export async function getPageInstances(ctx: ProtectedContext, checklistId: number, parentId?: number) {
	return await applyClientScope(
		db
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
			.where((eb) => {
				let andClause = [eb('page_instance.checklist_id', '=', checklistId)];
				if (parentId === -1) {
					andClause.push(eb('page_instance.parent_instance_id', 'is', null));
				} else if (parentId) {
					andClause.push(eb('page_instance.parent_instance_id', '=', parentId));
				}
				return eb.and(andClause);
			})
			.orderBy('page_instance.position'),
		ctx.session.user.client_id,
		'page'
	).execute();
}

export async function getPageInstancesForClaim(
	ctx: ProtectedContext,
	checklistId: number,
	claimId: number,
	parentId?: number
) {
	return await applyClientScope(
		db
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
			.where((eb) => {
				let andClause = [eb('page_instance.checklist_id', '=', checklistId)];
				if (parentId === -1) {
					andClause.push(eb('page_instance.parent_instance_id', 'is', null));
				} else if (parentId) {
					andClause.push(eb('page_instance.parent_instance_id', '=', parentId));
				}
				return eb.and(andClause);
			})
			.orderBy('page_instance.position'),
		ctx.session.user.client_id,
		'page'
	).execute();
}

export async function getVisiblePageInstances(ctx: ProtectedContext, checklistId: number, claimId: number) {
	let results = await db
		.withRecursive('visible_pages', (eb) =>
			applyClientScope(
				eb
					.selectFrom('page_instance')
					.select(['id'])
					.where('page_instance.checklist_id', '=', checklistId)
					.where('page_instance.parent_instance_id', 'is', null)
					.unionAll(
						eb
							.selectFrom('answer')
							.innerJoin('question_response_answer', 'question_response_answer.answer_id', 'answer.id')
							.innerJoin(
								'question_response',
								'question_response.id',
								'question_response_answer.response_id'
							)
							.select(['answer.calls_instance_id as id'])
							.$castTo<{ id: number }>()
							.where('question_response.checklist_id', '=', checklistId)
							.where('question_response.claim_id', '=', claimId)
							.where('answer.calls_instance_id', 'is not', null)
					),
				ctx.session.user.client_id,
				'page_instance'
			)
		)
		.selectFrom('visible_pages')
		.select('id')
		.distinct()
		.execute();
	return results.map((row) => row.id);
}

export async function modifyPage(ctx: ProtectedContext, pageId: number, params: object) {
	let updates: UpdateObjectExpression<DB, 'page'> = {};
	if (params.title) updates.title = params.title;
	if (params.hidden != null) updates.hidden = params.hidden;
	if (!Object.keys(updates).length) throw new Error('No updates');
	return await db
		.updateTable('page')
		.set({
			...updates,
		})
		.where('id', '=', pageId)
		.returningAll()
		.executeTakeFirstOrThrow();
}

export async function modifyPageInstanceStatus(
	ctx: ProtectedContext,
	params: {
		claimId: number;
		instanceIds: number[];
		newStatus: PageInstanceStatus;
		templateVersion: number;
		trx?: Transaction<DB>;
	}
) {
	for (const id of params.instanceIds) {
		await (params.trx ?? db)
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

async function createPageInstancePrivate(
	ctx: ProtectedContext,
	{
		checklistId,
		pageId,
		parentId,
		position,
		trx,
	}: {
		checklistId: number;
		pageId: number;
		parentId: number;
		position: number;
		trx: Transaction<DB>;
	}
) {
	// Update positions for all page instances below the one we're inserting
	await trx
		.updateTable('page_instance')
		.set((eb) => ({ position: sql`${eb.ref('position')} + 1` }))
		.where('position', '>=', position)
		.execute();
	let newInstance = await trx
		.insertInto('page_instance')
		.values({
			checklist_id: checklistId,
			page_id: pageId,
			parent_instance_id: parentId === -1 ? null : parentId,
			position,
			client_id: ctx.session.user.client_id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	return newInstance;
}
