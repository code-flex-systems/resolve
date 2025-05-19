import { sql } from 'kysely';
import { db } from '@/api/database/kysely';
import { ClaimSearch } from '@/config/enums';

export async function getClaim(checklistId: number, claimId: number) {
	await db
		.insertInto('checklist_claim')
		.values({ checklist_id: checklistId, claim_id: claimId })
		.onConflict((oc) => oc.columns(['checklist_id', 'claim_id']).doUpdateSet({ last_opened: sql`now()` }))
		.execute();
	return await db.selectFrom('claim').selectAll().where('id', '=', claimId).executeTakeFirstOrThrow();
}

export async function getClaims(searchTerm?: { value: string; type: ClaimSearch }) {
	let query = db.selectFrom('claim').selectAll();
	if (searchTerm) {
		query = query.where((eb) =>
			eb(sql`lower(${eb.ref(searchTerm.type)})`, 'like', `${searchTerm.value.toLowerCase()}%`)
		);
	}
	return await query.execute();
}
