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

export async function createClaim(params: Omit<Claim, 'id'>) {
	const [feed] = await db
		.insertInto('claim')
		.values({
			claim_number: params.claim_number,
			client: params.client,
			client_adjuster: params.client_adjuster,
			insured: params.insured,
			claim_amount: params.claim_amount,
			total_incurred: params.total_incurred,
			date_of_loss: params.date_of_loss,
			loss_location: params.loss_location,
			last_updated_by: params.last_updated_by,
			last_update: params.last_update,
			expected_recovery: params.expected_recovery,
		})
		.returningAll()
		.execute();
	return feed;
}
