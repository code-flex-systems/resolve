import { db } from '../database/kysely';

export default {
	getClaim,
};

export async function getClaim(checklistId: number, claimId: number) {
	try {
		return await db
			.selectFrom('claim_dummy')
			.selectAll()
			.where((eb) => eb.and([eb('checklist_id', '=', checklistId), eb('id', '=', claimId)]))
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}
