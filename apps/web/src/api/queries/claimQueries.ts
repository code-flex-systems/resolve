import { sql } from 'kysely';
import { db } from '@/api/database/kysely';
import { ClaimSearch, ClaimStatus, FeedStatus } from '@/config/enums';
import { Claim } from '@/types/types';
import { ProtectedContext } from '@/server/trpc/trpc';
import { getCurrentFiscalQuarterStart } from '@/lib/utils/utils';
import { TRPCError } from '@trpc/server';
import config from '@/config/config';

/**
 * Verify that a checklist exists and is accessible.
 * Admins can access all checklists, regular users can only access published checklists.
 *
 * @param ctx - request context
 * @param checklistId - checklist identifier to verify
 * @throws TRPCError if checklist is not found or not accessible
 */
async function assertChecklistPublished(ctx: ProtectedContext, checklistId: number) {
	const isAdmin = ctx.session.user.role === config.ROLES.ADMIN || ctx.session.user.role === config.ROLES.SUPER_ADMIN;
	const checklist = await db
		.selectFrom('checklist')
		.select(['id'])
		.where('checklist.client_id', '=', ctx.session.user.client_id)
		.where('checklist.id', '=', checklistId)
		.where((eb) => (isAdmin ? eb.lit(true) : eb('checklist.published', '=', true)))
		.executeTakeFirst();
	if (!checklist) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: isAdmin ? 'Checklist not found.' : 'Checklist is not published.',
		});
	}
}

export async function assignClaim(ctx: ProtectedContext, checklistId: number, claimId: number, assignee: string) {
        await assertChecklistPublished(ctx, checklistId);
        return await db
                .insertInto('checklist_claim')
                .values({
			checklist_id: checklistId,
			claim_id: claimId,
			client_id: ctx.session.user.client_id,
			created_by: ctx.session.user.id,
			status: ClaimStatus.UNWORKED,
			assignee,
		})
		.executeTakeFirstOrThrow();
}

/**
 * Retrieve a claim and update its last opened timestamp for a checklist.
 *
 * @param ctx - request context
 * @param checklistId - checklist referencing the claim
 * @param claimId - claim identifier
 * @returns claim record
 */
export async function getClaim(ctx: ProtectedContext, checklistId: number, claimId: number) {
        await assertChecklistPublished(ctx, checklistId);
        await db
                .insertInto('checklist_claim')
		.values({
			checklist_id: checklistId,
			claim_id: claimId,
			client_id: ctx.session.user.client_id,
			created_by: ctx.session.user.id,
			status: ClaimStatus.UNWORKED,
			assignee: ctx.session.user.id,
		})
		.onConflict((oc) => oc.columns(['checklist_id', 'claim_id']).doUpdateSet({ last_opened: sql`now()` }))
		.execute();
        return await db
                .selectFrom('claim')
                .selectAll()
                .where('claim.client_id', '=', ctx.session.user.client_id)
                .where('id', '=', claimId)
                .executeTakeFirstOrThrow();
}

export async function getNextClaimToAssign(ctx: ProtectedContext, feedId: number, offset = 0) {
        const row = await db
                .with('base', (qb) =>
                        qb
                                .selectFrom('claim')
                                .selectAll('claim')
                                .where('claim.client_id', '=', ctx.session.user.client_id)
                                .where('claim.feed_id', '=', feedId)
                .where((eb) =>
                                        eb.not(
                                                eb.exists(
                                                        eb
                                                                .selectFrom('checklist_claim')
                                                                .select(sql.raw('1').as('row'))
                                                                .whereRef('checklist_claim.claim_id', '=', 'claim.id')
                                                )
                                        )
                                )
                )
		.with('totals', (qb) => qb.selectFrom('base').select(sql<number>`count(*)`.as('total_unassigned')))
		.with('next_row', (qb) =>
			qb.selectFrom('base').selectAll().orderBy('created_at asc').orderBy('id asc').offset(offset).limit(1)
		)
		.selectFrom('totals')
		// ON TRUE; Kysely trick: 1 = 1
		.leftJoin('next_row', (join) => join.on(sql.raw('1'), '=', sql.raw('1')))
		.select(['totals.total_unassigned'])
		.selectAll('next_row')
		.executeTakeFirst();

	const { total_unassigned = 0, ...maybeClaim } = (row ?? {}) as any;
	// If next_row didn't exist, all its cols are null => claim = null
	const claim = row && maybeClaim.id != null ? (maybeClaim as Awaited<ReturnType<typeof getClaim>>) : null;

	return { claim, total: parseInt(total_unassigned.toString()) };
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
        let query = db
                .selectFrom('claim')
                .leftJoin('feeds', 'claim.feed_id', 'feeds.id')
                .where('claim.client_id', '=', ctx.session.user.client_id);
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
		if (limit != null) {
			query = query.limit(limit);
		}
		if (offset != null) {
			query = query.offset(offset);
		}
		query = query.selectAll('claim').select(['feeds.name as feed_name']).orderBy('claim.claim_number');
		return await query.execute();
	} else {
		query = query.select(({ fn }) => fn.countAll().as('count'));
		const count = await query.executeTakeFirst();
		return !!count && 'count' in count ? parseInt(count.count?.toString() ?? '0') : 0;
	}
}

/**
 * Query a count of claims.
 *
 * @param ctx - request context
 * @param clientId - required client ID
 * @returns a count
 */
export async function getClaimCount(ctx: ProtectedContext, clientId: string) {
        const results = await db
                .selectFrom('claim')
                .select(({ eb, fn }) => [
                        eb.case().when('feed_id', 'is', null).then(true).else(false).end().as('manual'),
                        fn.count('id').as('count'),
                ])
                .where('claim.client_id', '=', clientId)
                .groupBy('manual')
                .execute();
	let total = 0;
	const formattedResults = results.map((r) => {
		const count = parseInt(r.count.toString());
		total += count;
		return { ...r, count };
	});
	return {
		total,
		fed: formattedResults.find((r) => !r.manual)?.count ?? 0,
		manual: formattedResults.find((r) => r.manual)?.count ?? 0,
	};
}

export async function getRolloverClaimCount(ctx: ProtectedContext) {
	const currentFQStartDate = getCurrentFiscalQuarterStart().toDate();
        const count = await db
                .selectFrom('claim')
                .leftJoin('checklist_claim', 'claim.id', 'checklist_claim.claim_id')
                .leftJoin('checklist', (join) =>
                        join
                                .onRef('checklist_claim.checklist_id', '=', 'checklist.id')
                                .on('checklist.client_id', '=', ctx.session.user.client_id)
                )
                .select(({ fn }) => fn.countAll().as('count'))
                .where('claim.client_id', '=', ctx.session.user.client_id)
                .where((eb) =>
                        eb.or([
                                eb.and([
                                        eb('checklist_claim.claim_id', 'is', null),
                                        eb('claim.created_at', '<', currentFQStartDate),
                                ]),
                                eb('checklist_claim.created_at', '<', currentFQStartDate),
                        ])
                )
                .executeTakeFirstOrThrow();
	return { count: parseInt(count.count.toString()) };
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
		.onConflict((oc) =>
			oc.column('claim_number').doUpdateSet((eb) => ({
				client: eb.ref('excluded.client'),
				client_adjuster: eb.ref('excluded.client_adjuster'),
				insured: eb.ref('excluded.insured'),
				claim_amount: eb.ref('excluded.claim_amount'),
				total_incurred: eb.ref('excluded.total_incurred'),
				date_of_loss: eb.ref('excluded.date_of_loss'),
				loss_location: eb.ref('excluded.loss_location'),
				last_updated_by: eb.ref('excluded.last_updated_by'),
				last_update: eb.ref('excluded.last_update'),
				expected_recovery: eb.ref('excluded.expected_recovery'),
			}))
		)
		.returningAll()
		.execute();
	return feed;
}
