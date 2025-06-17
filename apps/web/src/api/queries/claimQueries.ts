import { sql } from 'kysely';
import { db } from '@/api/database/kysely';
import { ClaimSearch, FeedStatus } from '@/config/enums';
import { Claim } from '@/types/types';
import { ProtectedContext } from '@/server/trpc/trpc';
import { applyClientScope } from '../database/clientScoped';

/**
 * Retrieve a claim and update its last opened timestamp for a checklist.
 *
 * @param ctx - request context
 * @param checklistId - checklist referencing the claim
 * @param claimId - claim identifier
 * @returns claim record
 */
export async function getClaim(ctx: ProtectedContext, checklistId: number, claimId: number) {
	await db
		.insertInto('checklist_claim')
		.values({
			checklist_id: checklistId,
			claim_id: claimId,
			client_id: ctx.session.user.client_id,
			created_by: ctx.session.user.id,
		})
		.onConflict((oc) => oc.columns(['checklist_id', 'claim_id']).doUpdateSet({ last_opened: sql`now()` }))
		.execute();
	return await db.selectFrom('claim').selectAll().where('id', '=', claimId).executeTakeFirstOrThrow();
}

/**
 * Query claims or a count of claims with optional feed and search filters.
 *
 * @param ctx - request context
 * @param param1 - filter options including type and pagination
 * @returns claim rows or a count depending on type
 */
export async function getClaims(
	ctx: ProtectedContext,
	{
		type,
		feedId,
		searchTerm,
		limit,
		offset,
	}: {
		type: 'data' | 'count';
		feedId?: number | null;
		searchTerm?: { value: string; type: ClaimSearch };
		limit?: number;
		offset?: number;
	}
) {
	let query = applyClientScope(
		db.selectFrom('claim').leftJoin('feeds', 'claim.feed_id', 'feeds.id'),
		ctx.session.user.client_id,
		'claim'
	);
	query =
		feedId !== undefined
			? query.where('feed_id', feedId === null ? 'is' : '=', feedId)
			: query.where((eb) =>
					eb.or([eb('feeds.status', 'is', null), eb('feeds.status', '<>', FeedStatus.INACTIVE)])
				);

	if (searchTerm) {
		query = query.where((eb) =>
			eb(sql`lower(${eb.ref(searchTerm.type)})`, 'like', `${searchTerm.value.toLowerCase()}%`)
		);
	}

	if (type === 'data') {
		if (limit != null && offset != null) {
			query = query.limit(limit).offset(offset);
		}
		query = query.selectAll('claim').select(['feeds.name as feed_name']);
		return await query.execute();
	} else {
		query = query.select(({ fn }) => fn.countAll().as('count'));
		const count = await query.executeTakeFirst();
		return parseInt(count?.count?.toString() ?? '0');
	}
}

/**
 * Bulk insert claim records.
 *
 * @param ctx - request context
 * @param claims - claim objects without ids
 * @returns the first created claim as a convenience
 */
export async function createClaims(ctx: ProtectedContext, claims: Omit<Claim, 'id'>[]) {
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
				client_id: ctx.session.user.client_id,
				created_by: ctx.session.user.id,
			}))
		)
		.returningAll()
		.execute();
	return feed;
}
