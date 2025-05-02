import { sql } from 'kysely';
import { db } from '../database/kysely';
import { ClaimSearchType } from '../types/types';

export default {
	getClaim,
	getClaims,
};

async function getClaim(checklistId: number, claimId: number) {
	try {
		await db
			.insertInto('checklist_claim')
			.values({ checklist_id: checklistId, claim_id: claimId })
			.onConflict((oc) => oc.columns(['checklist_id', 'claim_id']).doUpdateSet({ last_opened: sql`now()` }))
			.execute();
		return await db.selectFrom('claim').selectAll().where('id', '=', claimId).executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function getClaims(searchTerm?: { value: string; type: ClaimSearchType }) {
	try {
		let query = db.selectFrom('claim').selectAll();
		if (searchTerm) {
			query = query.where((eb) =>
				eb(sql`lower(${eb.ref(searchTerm.type)})`, 'like', `${searchTerm.value.toLowerCase()}%`)
			);
		}
		return await query.execute();
	} catch (e) {
		console.error(e);
	}
}
