import { sql, Transaction } from 'kysely';
import { db } from '../database/kysely';
import { DB } from '../database/types';
import { PageInstanceStatus } from '../config/enums';
import { UpdateObjectExpression } from 'kysely/dist/cjs/parser/update-set-parser';

export default {
	createPage,
	createPageInstance,
	deletePageInstance,
	getPage,
	getPages,
	getPageInstance,
	getPageInstances,
	getPageInstancesForClaim,
	getVisiblePageInstances,
	modifyPage,
	modifyPageInstanceStatus,
};

async function createPage(checklistId: number, params: object) {
	try {
		let newPage: any;
		let newInstance: any;
		await db.transaction().execute(async (trx) => {
			try {
				newPage = await trx
					.insertInto('page')
					.values({
						title: params.title,
					})
					.returningAll()
					.executeTakeFirst();
				newInstance = await createPageInstance(checklistId, newPage.id, params.parentId, params.position, trx);
			} catch (e) {
				console.error(e);
			}
		});
		return {
			id: newPage.id,
			title: newPage.title,
			instance_id: newInstance.id,
		};
	} catch (e) {
		console.error(e);
	}
}

async function createPageInstance(
	checklistId: number,
	pageId: number,
	parentId: number,
	position: number,
	trx?: Transaction<DB>
) {
	try {
		let newInstance: any;
		if (trx) {
			newInstance = await createPageInstancePrivate(checklistId, pageId, parentId, position, trx);
		} else {
			await db.transaction().execute(async (localTrx) => {
				try {
					newInstance = await createPageInstancePrivate(checklistId, pageId, parentId, position, localTrx);
				} catch (e) {
					console.error(e);
				}
			});
		}
		return newInstance;
	} catch (e) {
		console.error(e);
	}
}

async function deletePageInstance(instanceId: number) {
	try {
		await db.transaction().execute(async (trx) => {
			try {
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
			} catch (e) {
				console.error(e);
			}
		});
	} catch (e) {
		console.error(e);
	}
}

async function getPage(pageId: number) {
	try {
		return await db.selectFrom('page').selectAll().where('id', '=', pageId).executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function getPages() {
	try {
		return await db.selectFrom('page as p').selectAll('p').where('hidden', 'is', false).execute();
	} catch (e) {
		console.error(e);
	}
}

async function getPageInstance(instanceId: number) {
	try {
		return await db
			.selectFrom('page as p')
			.innerJoin('page_instance as i', 'i.page_id', 'p.id')
			.selectAll('p')
			.select(['i.id as instance_id', 'i.position'])
			.where('i.id', '=', instanceId)
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function getPageInstances(checklistId: number, parentId?: number) {
	try {
		return await db
			.selectFrom('page as p')
			.innerJoin('page_instance as i', 'i.page_id', 'p.id')
			.select((eb) => [
				'p.id',
				'p.title',
				'i.id as instance_id',
				'i.parent_instance_id',
				'i.position',
				'p.version as template_version',
				eb.val(PageInstanceStatus.UNSTARTED).as('status'),
			])
			.where((eb) => {
				let andClause = [eb('i.checklist_id', '=', checklistId)];
				if (parentId === -1) {
					andClause.push(eb('i.parent_instance_id', 'is', null));
				} else if (parentId) {
					andClause.push(eb('i.parent_instance_id', '=', parentId));
				}
				return eb.and(andClause);
			})
			.orderBy('i.position')
			.execute();
	} catch (e) {
		console.error(e);
	}
}

async function getPageInstancesForClaim(checklistId: number, claimId: number, parentId?: number) {
	try {
		return await db
			.selectFrom('page as p')
			.innerJoin('page_instance as i', 'i.page_id', 'p.id')
			.leftJoin('page_instance_status as s', (join) =>
				join.onRef('s.page_instance_id', '=', 'i.id').on('s.claim_id', '=', claimId)
			)
			.select((eb) => [
				'p.id',
				'p.title',
				'i.id as instance_id',
				'i.parent_instance_id',
				'i.position',
				sql`coalesce(s.template_version, 1)`.$castTo<number>().as('template_version'),
				eb
					.case()
					.when('s.id', 'is', null)
					.then(PageInstanceStatus.UNSTARTED)
					.when('s.template_version', '<>', eb.ref('p.version'))
					.then(PageInstanceStatus.STALE)
					.else(eb.ref('s.status'))
					.end()
					.$castTo<PageInstanceStatus>()
					.as('status'),
			])
			.where((eb) => {
				let andClause = [eb('i.checklist_id', '=', checklistId)];
				if (parentId === -1) {
					andClause.push(eb('i.parent_instance_id', 'is', null));
				} else if (parentId) {
					andClause.push(eb('i.parent_instance_id', '=', parentId));
				}
				return eb.and(andClause);
			})
			.orderBy('i.position')
			.execute();
	} catch (e) {
		console.error(e);
	}
}

async function getVisiblePageInstances(checklistId: number, claimId: number) {
	try {
		let results = await db
			.withRecursive('visible_pages', (eb) =>
				eb
					.selectFrom('page_instance as p')
					.select(['id'])
					.where('p.checklist_id', '=', checklistId)
					.where('p.parent_instance_id', 'is', null)
					.unionAll(
						eb
							.selectFrom('answer as a')
							.innerJoin('question_response_answer as qra', 'qra.answer_id', 'a.id')
							.innerJoin('question_response as qr', 'qr.id', 'qra.response_id')
							.select(['a.calls_instance_id as id'])
							.$castTo<{ id: number }>()
							.where('qr.checklist_id', '=', checklistId)
							.where('qr.claim_id', '=', claimId)
							.where('a.calls_instance_id', 'is not', null)
					)
			)
			.selectFrom('visible_pages')
			.select('id')
			.distinct()
			.execute();
		return results.map((row) => row.id);
	} catch (e) {
		console.error(e);
	}
}

async function modifyPage(pageId: number, params: object) {
	try {
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
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function modifyPageInstanceStatus(params: {
	claimId: number;
	instanceIds: number[];
	newStatus: PageInstanceStatus;
	templateVersion: number;
	trx?: Transaction<DB>;
}) {
	try {
		for (const id of params.instanceIds) {
			await (params.trx ?? db)
				.insertInto('page_instance_status')
				.values({
					claim_id: params.claimId,
					page_instance_id: id,
					status: params.newStatus,
					template_version: params.templateVersion,
					updated_at: sql`now()`,
				})
				.onConflict((oc) =>
					oc.columns(['claim_id', 'page_instance_id']).doUpdateSet({
						status: params.newStatus,
						template_version: params.templateVersion,
						updated_at: sql`now()`,
					})
				)
				.executeTakeFirst();
		}
	} catch (e) {
		console.error(e);
	}
}

// private methods

async function createPageInstancePrivate(
	checklistId: number,
	pageId: number,
	parentId: number,
	position: number,
	trx: Transaction<DB>
) {
	try {
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
			})
			.returningAll()
			.executeTakeFirst();
		return newInstance;
	} catch (e) {
		console.error(e);
	}
}
