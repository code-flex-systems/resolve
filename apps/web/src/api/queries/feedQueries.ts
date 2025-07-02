import { db } from '@/api/database/kysely';
import { FeedStatus, FeedType } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { applyClientScope } from '../database/clientScoped';
import { sql } from 'kysely';

export interface Feed {
	id: number;
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
	return await applyClientScope(
		db.selectFrom('feeds').selectAll().where('status', '<>', FeedStatus.INACTIVE).orderBy('name'),
		ctx.session.user.client_id
	).execute();
}

export async function getFeedCount(ctx: ProtectedContext, clientId: string) {
	const results = await applyClientScope(
		db
			.selectFrom('feeds')
			.select(({ fn }) => ['status', fn.count('id').as('count')])
			.groupBy('status'),
		clientId
	).execute();
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
export async function getFeed(ctx: ProtectedContext, id: number): Promise<Feed | undefined> {
	return await applyClientScope(
		db.selectFrom('feeds').selectAll().where('id', '=', id),
		ctx.session.user.client_id
	).executeTakeFirst();
}

/**
 * Insert a feed row.
 *
 * @param ctx - request context
 * @param params - feed fields
 * @returns created feed
 */
export async function createFeed(ctx: ProtectedContext, params: NewFeedParams): Promise<Feed> {
	const [feed] = await db
		.insertInto('feeds')
		.values({
			name: params.name,
			schedule: params.schedule,
			feed_type: params.feed_type,
			connection_options: params.connection_options,
			status: params.status ?? 'inactive',
			last_synced_at: params.last_synced_at ?? null,
			client_id: ctx.session.user.client_id,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.execute();
	return feed;
}

/**
 * Update an existing feed.
 *
 * @param ctx - request context
 * @param id - feed identifier
 * @param params - fields to update
 * @returns updated feed
 */
export async function updateFeed(ctx: ProtectedContext, id: number, params: UpdateFeedParams): Promise<Feed> {
	const [feed] = await db
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
		.returningAll()
		.execute();
	return feed;
}

/**
 * Remove a feed.
 *
 * @param ctx - request context
 * @param id - feed identifier
 */
export async function deleteFeed(ctx: ProtectedContext, id: number): Promise<void> {
	await db.deleteFrom('feeds').where('id', '=', id).execute();
}
