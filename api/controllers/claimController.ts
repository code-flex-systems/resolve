import { db } from '../database/kysely';

export default {
	getClaim,
};

export async function getClaim(checklistId: number, claimId: number) {
	try {
		return await db
			.selectFrom('claim_dummy as c')
			.innerJoin('checklist_claim as cc', 'c.id', 'cc.claim_id')
			.selectAll('c')
			.where((eb) => eb.and([eb('cc.checklist_id', '=', checklistId), eb('c.id', '=', claimId)]))
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}
