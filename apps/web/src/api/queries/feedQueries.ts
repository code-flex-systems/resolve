import { FeedStatus, FeedType } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { sql } from 'kysely';

export interface Feed {
	id: string;
	name: string;
	schedule: number;
	feed_type: FeedType;
	connection_options: any;
	status: FeedStatus;
	last_synced_at: Date | null;
	created_at: Date;
	updated_at: Date;
}

export interface NewFeedParams {
	name: string;
	schedule: number;
	feed_type: FeedType;
	connection_options: any;
	status?: FeedStatus;
	last_synced_at?: Date;
}

export type UpdateFeedParams = Partial<NewFeedParams>;

/**
 * Retrieve all active feeds for the current client.
 *
 * @param ctx - request context
 * @returns list of feeds
 */
export async function getFeeds(ctx: ProtectedContext): Promise<Feed[]> {
        return await ctx.db
                .selectFrom('feeds')
                .selectAll()
                .where('feeds.client_id', '=', ctx.session.user.client_id)
                .where('status', '<>', FeedStatus.INACTIVE)
                .orderBy('name')
                .execute() as Feed[];
}

export async function getFeedCount(ctx: ProtectedContext, clientId: string) {
        const results = await ctx.db
                .selectFrom('feeds')
                .select(({ fn }) => ['status', fn.count('id').as('count')])
                .where('feeds.client_id', '=', clientId)
                .groupBy('status')
                .execute();
	const formattedResults: Partial<Record<FeedStatus, number>> & { total: number } = {
		total: 0,
	};
	Object.values(FeedStatus).forEach((s) => {
		const resultCount = results.find((r) => r.status === s)?.count ?? 0;
		const count = parseInt(resultCount.toString());
		formattedResults.total += count;
		formattedResults[s] = count;
	});
	return formattedResults;
}

/**
 * Fetch a single feed by id.
 *
 * @param ctx - request context
 * @param id - feed identifier
 * @returns the feed if found
 */
export async function getFeed(ctx: ProtectedContext, id: string): Promise<Feed | undefined> {
        return await ctx.db
                .selectFrom('feeds')
                .selectAll()
                .where('feeds.client_id', '=', ctx.session.user.client_id)
                .where('id', '=', id)
                .executeTakeFirst() as Feed | undefined;
}

export async function getLastSyncedFeed(ctx: ProtectedContext) {
        return await ctx.db
                .selectFrom((eb) =>
                        eb
                                .selectFrom('feeds')
                                .innerJoin('claim', 'feeds.id', 'claim.feed_id')
                                .selectAll('feeds')
                                .select(({ eb, fn }) =>
                                        fn
                                                .sum(
                                                        eb
                                                                .case()
                                                                .when(
                                                                        eb.exists(
                                                                                eb
                                                                                        .selectFrom('checklist_claim')
                                                                                        .select(sql.raw('1').as('row'))
                                                                                        .whereRef('checklist_claim.claim_id', '=', 'claim.id')
                                                                        )
                                                                )
                                                                .then(0)
                                                                .else(1)
                                                                .end()
                                                )
                                                .as('count_unassigned')
                                )
                                .where('feeds.client_id', '=', ctx.session.user.client_id)
                                .where('feeds.status', '=', FeedStatus.ONLINE)
                                .groupBy('feeds.id')
                                .as('a')
                )
                .selectAll('a')
                .where('a.count_unassigned', '>', 0)
		.orderBy('a.last_synced_at desc')
		.limit(1)
		.executeTakeFirst();
}

/**
 * Insert a feed row.
 *
 * @param ctx - request context
 * @param params - feed fields
 * @returns created feed
 */
export async function createFeed(ctx: ProtectedContext, params: NewFeedParams): Promise<Feed> {
	const [feed] = await ctx.db
		.insertInto('feeds')
		.values({
			name: params.name,
			schedule: params.schedule,
			feed_type: params.feed_type,
			connection_options: params.connection_options,
			status: params.status ?? 'inactive',
			last_synced_at: params.last_synced_at ?? null,
			client_id: ctx.session.user.client_id!,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.execute();
	return feed as Feed;
}

/**
 * Update an existing feed.
 *
 * @param ctx - request context
 * @param id - feed identifier
 * @param params - fields to update
 * @returns updated feed
 */
export async function updateFeed(ctx: ProtectedContext, id: string, params: UpdateFeedParams): Promise<Feed> {
	const [feed] = await ctx.db
		.updateTable('feeds')
		.set({
			...(params.name !== undefined && { name: params.name }),
			...(params.schedule !== undefined && { schedule: params.schedule }),
			...(params.feed_type && { feed_type: params.feed_type }),
			...(params.connection_options && { connection_options: params.connection_options }),
			...(params.status && { status: params.status }),
			...(params.last_synced_at !== undefined && { last_synced_at: params.last_synced_at }),
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.execute();
	return feed as Feed;
}

/**
 * Fetch a feed for logging before deletion.
 *
 * @param ctx - request context
 * @param id - feed identifier
 * @returns the feed details
 */
export async function getFeedForDeletion(ctx: ProtectedContext, id: string) {
	return await ctx.db
		.selectFrom('feeds')
		.select(['id', 'name', 'feed_type', 'status'])
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

/**
 * Remove a feed.
 *
 * @param ctx - request context
 * @param id - feed identifier
 */
export async function deleteFeed(ctx: ProtectedContext, id: string) {
	return await ctx.db
		.deleteFrom('feeds')
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.returning(['id', 'name', 'feed_type', 'status'])
		.executeTakeFirstOrThrow();
}
