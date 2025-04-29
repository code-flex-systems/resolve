import { sql } from 'kysely';
import { db } from '../database/kysely';
import { ClaimSearchType } from '../types/types';

export default {
	getClaim,
	getClaims,
};

async function getClaim(claimId: number) {
	try {
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
