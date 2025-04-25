import { sql, Transaction } from 'kysely';
import { db } from '../database/kysely';
import { DB } from '../database/types';

export default {
	createPage,
	createPageInstance,
	deletePageInstance,
	getPage,
	getPages,
	getPageInstance,
	getPageInstances,
	getVisiblePageInstances,
	modifyPage,
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
		return await db.selectFrom('page as p').selectAll('p').where('p.id', '=', pageId).executeTakeFirst();
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
			.select(['p.id', 'p.title', 'i.id as instance_id', 'i.position'])
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
			.select(['p.id', 'p.title', 'i.id as instance_id', 'i.parent_instance_id', 'i.position'])
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
		return await db
			.updateTable('page')
			.set({
				title: params.title,
			})
			.where('id', '=', pageId)
			.returningAll()
			.executeTakeFirst();
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
		// Update positions for all page instances below the one we're inserting
		await trx
			.updateTable('page_instance')
			.set((eb) => ({ position: sql`${eb.ref('position')} + 1` }))
			.where('position', '>=', position)
			.execute();
		return newInstance;
	} catch (e) {
		console.error(e);
	}
}
