import { Transaction } from 'kysely';
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
				newInstance = await createPageInstance(checklistId, newPage.id, params.parentId, trx);
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

async function createPageInstance(checklistId: number, pageId: number, parentId: number, trx?: Transaction<DB>) {
	try {
		let newInstance: any;
		if (trx) {
			newInstance = await createPageInstancePrivate(checklistId, pageId, parentId, trx);
		} else {
			await db.transaction().execute(async (localTrx) => {
				try {
					newInstance = await createPageInstancePrivate(checklistId, pageId, parentId, localTrx);
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
		await db.deleteFrom('page_instance').where('id', '=', instanceId).execute();
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
		return await db.selectFrom('page as p').selectAll('p').execute();
	} catch (e) {
		console.error(e);
	}
}

async function getPageInstance(instanceId: number) {
	try {
		return await db
			.selectFrom('page as p')
			.innerJoin('page_instance as i', 'i.page_id', 'p.id')
			.select(['p.id', 'p.title', 'i.id as instance_id'])
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
			.select(['p.id', 'p.title', 'i.id as instance_id', 'i.parent_instance_id'])
			.where((eb) => {
				let andClause = [eb('i.checklist_id', '=', checklistId)];
				if (parentId === -1) {
					andClause.push(eb('i.parent_instance_id', 'is', null));
				} else if (parentId) {
					andClause.push(eb('i.parent_instance_id', '=', parentId));
				}
				return eb.and(andClause);
			})
			.orderBy('i.id')
			.execute();
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

async function createPageInstancePrivate(checklistId: number, pageId: number, parentId: number, trx: Transaction<DB>) {
	try {
		let newInstance = await trx
			.insertInto('page_instance')
			.values({
				checklist_id: checklistId,
				page_id: pageId,
				parent_instance_id: parentId === -1 ? null : parentId,
			})
			.returningAll()
			.executeTakeFirst();
		return newInstance;
	} catch (e) {
		console.error(e);
	}
}
