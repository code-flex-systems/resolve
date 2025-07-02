import * as feedQueries from '@/api/queries/feedQueries';
import { FeedStatus, FeedType } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';

/**
 * Retrieve all feeds for the current client.
 *
 * @param ctx - request context
 */
export async function getFeeds(ctx: ProtectedContext) {
	return await feedQueries.getFeeds(ctx);
}

export async function getFeedCount(ctx: ProtectedContext, { clientId }: { clientId: string }) {
	return await feedQueries.getFeedCount(ctx, clientId);
}

/**
 * Fetch a single feed by id.
 *
 * @param ctx - request context
 * @param input - feed id
 */
export async function getFeed(ctx: ProtectedContext, { id }: { id: number }) {
	return await feedQueries.getFeed(ctx, id);
}

/**
 * Insert a new feed.
 *
 * @param ctx - request context
 * @param input - feed parameters
 */
export async function createFeed(
	ctx: ProtectedContext,
	{
		name,
		schedule,
		feed_type,
		connection_options,
		status,
		last_synced_at,
	}: {
		name: string;
		schedule: number;
		feed_type: FeedType;
		connection_options: any;
		status?: FeedStatus;
		last_synced_at?: Date;
	}
) {
	return await feedQueries.createFeed(ctx, {
		name,
		schedule,
		feed_type,
		connection_options,
		status,
		last_synced_at,
	});
}

/**
 * Modify an existing feed.
 *
 * @param ctx - request context
 * @param input - feed id and update fields
 */
export async function updateFeed(
	ctx: ProtectedContext,
	{
		id,
		params,
	}: {
		id: number;
		params: Partial<{
			name: string;
			schedule: number;
			feed_type: FeedType;
			connection_options: any;
			status: FeedStatus;
			last_synced_at: Date;
		}>;
	}
) {
	return await feedQueries.updateFeed(ctx, id, params);
}

/**
 * Remove a feed.
 *
 * @param ctx - request context
 * @param input - feed id
 */
export async function deleteFeed(ctx: ProtectedContext, { id }: { id: number }) {
	await feedQueries.deleteFeed(ctx, id);
}
