import { sql } from 'kysely';
import { db } from '@/api/database/kysely';
import { ClaimSearch, FeedStatus } from '@/config/enums';
import { Claim } from '@/types/types';

export async function getClaim(checklistId: number, claimId: number) {
	await db
		.insertInto('checklist_claim')
		.values({ checklist_id: checklistId, claim_id: claimId })
		.onConflict((oc) => oc.columns(['checklist_id', 'claim_id']).doUpdateSet({ last_opened: sql`now()` }))
		.execute();
	return await db.selectFrom('claim').selectAll().where('id', '=', claimId).executeTakeFirstOrThrow();
}

export async function getClaims(
	type: 'data' | 'count',
	feedId?: number | null,
	searchTerm?: { value: string; type: ClaimSearch },
	limit?: number,
	offset?: number
) {
	let query = db.selectFrom('claim as c').leftJoin('feeds as f', 'c.feed_id', 'f.id');
	query =
		feedId !== undefined
			? query.where('feed_id', feedId === null ? 'is' : '=', feedId)
			: query.where((eb) => eb.or([eb('f.status', 'is', null), eb('f.status', '<>', FeedStatus.INACTIVE)]));

	if (searchTerm) {
		query = query.where((eb) =>
			eb(sql`lower(${eb.ref(searchTerm.type)})`, 'like', `${searchTerm.value.toLowerCase()}%`)
		);
	}

	if (type === 'data') {
		if (limit != null && offset != null) {
			query = query.limit(limit).offset(offset);
		}
		query = query.selectAll('c').select(['f.name as feed_name']);
		return await query.execute();
	} else {
		query = query.select(({ fn }) => fn.countAll().as('count'));
		const count = await query.executeTakeFirst();
		return parseInt(count?.count?.toString() ?? '0');
	}
}

export async function createClaims(claims: Omit<Claim, 'id'>[]) {
	const [feed] = await db
		.insertInto('claim')
		.values(
			claims.map((c) => ({
				claim_number: c.claim_number,
				client: c.client,
				client_adjuster: c.client_adjuster,
				insured: c.insured,
				claim_amount: c.claim_amount,
				total_incurred: c.total_incurred,
				date_of_loss: c.date_of_loss,
				loss_location: c.loss_location,
				last_updated_by: c.last_updated_by,
				last_update: c.last_update,
				expected_recovery: c.expected_recovery,
			}))
		)
		.returningAll()
		.execute();
	return feed;
}
