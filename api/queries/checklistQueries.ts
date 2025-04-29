import { sql } from 'kysely';
import { db } from '../database/kysely';

export default {
	createChecklist,
	deleteChecklist,
	getChecklist,
	getChecklists,
	getChecklistClaim,
	getRecentChecklistClaims,
	modifyChecklist,
};

async function createChecklist(claimId: number, params: object) {
	try {
		let newChecklist: any;
		await db.transaction().execute(async (trx) => {
			try {
				newChecklist = await trx
					.insertInto('checklist')
					.values({
						name: params.name,
					})
					.returningAll()
					.executeTakeFirstOrThrow();
				await trx
					.insertInto('checklist_claim')
					.values({
						claim_id: claimId,
						checklist_id: newChecklist.id,
					})
					.execute();
			} catch (e) {
				console.error(e);
			}
		});
		return newChecklist;
	} catch (e) {
		console.error(e);
	}
}

async function deleteChecklist(checklistId: number) {
	try {
		await db.deleteFrom('checklist').where('id', '=', checklistId).execute();
	} catch (e) {
		console.error(e);
	}
}

async function getChecklist(checklistId: number) {
	try {
		return await db.selectFrom('checklist').selectAll().where('id', '=', checklistId).executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function getChecklists(searchTerm?: string) {
	try {
		let query = db.selectFrom('checklist').selectAll().orderBy('id');
		if (searchTerm) {
			query = query.where((eb) => eb(sql`lower(${eb.ref('name')})`, 'like', `${searchTerm.toLowerCase()}%`));
		}
		return await query.execute();
	} catch (e) {
		console.error(e);
	}
}

async function getChecklistClaim(checklistId: number, claimId: number) {
	try {
		return await db
			.selectFrom('checklist_claim')
			.selectAll()
			.where((eb) => eb.and([eb('checklist_id', '=', checklistId), eb('claim_id', '=', claimId)]))
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function getRecentChecklistClaims() {
	try {
		return await db
			.selectFrom('checklist as c')
			.innerJoin('checklist_claim as cc', 'c.id', 'cc.checklist_id')
			.innerJoin('claim as cl', 'cl.id', 'cc.claim_id')
			.selectAll('cc')
			.select(['c.name as checklist_name', 'cl.claim_number', 'cl.client'])
			.orderBy('cc.last_opened desc')
			.limit(15)
			.execute();
	} catch (e) {
		console.error(e);
	}
}

async function modifyChecklist(checklistId: number, params: object) {
	try {
		return await db
			.updateTable('checklist')
			.set({
				...params,
			})
			.where('id', '=', checklistId)
			.returningAll()
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}
