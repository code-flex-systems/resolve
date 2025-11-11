import * as feedQueries from '@/api/queries/feedQueries';
import { FeedStatus, FeedType } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { logAdminAction, AdminAction, EntityName } from '@/api/utils/adminActionLogger';

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

export async function getLastSyncedFeed(ctx: ProtectedContext) {
	return await feedQueries.getLastSyncedFeed(ctx);
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
	// Create feed and log admin action within transaction
	const created = await ctx.db.transaction().execute(async (trx) => {
		const feed = await feedQueries.createFeed({ ...ctx, db: trx }, {
			name,
			schedule,
			feed_type,
			connection_options,
			status,
			last_synced_at,
		});

		// Log feed creation
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: feed.id,
			entityName: EntityName.FEED,
			action: AdminAction.CREATE,
			value: { name: feed.name, feed_type: feed.feed_type, schedule: feed.schedule, status: feed.status },
		});

		return feed;
	});

	return created;
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
	// Update feed and log admin action within transaction
	const updated = await ctx.db.transaction().execute(async (trx) => {
		const feed = await feedQueries.updateFeed({ ...ctx, db: trx }, id, params);

		// Log admin action for feed update
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.FEED,
			action: AdminAction.UPDATE,
			value: params,
		});

		return feed;
	});

	return updated;
}

/**
 * Remove a feed.
 *
 * @param ctx - request context
 * @param input - feed id
 */
export async function deleteFeed(ctx: ProtectedContext, { id }: { id: number }) {
	// Delete feed and log admin action within transaction
	await ctx.db.transaction().execute(async (trx) => {
		// Fetch feed data BEFORE deletion for logging
		const feed = await feedQueries.getFeedForDeletion({ ...ctx, db: trx }, id);

		// Delete the feed
		await feedQueries.deleteFeed({ ...ctx, db: trx }, id);

		// Log admin action for feed deletion
		if (feed) {
			await logAdminAction({ ...ctx, db: trx }, {
				entityId: id,
				entityName: EntityName.FEED,
				action: AdminAction.DELETE,
				value: { name: feed.name, feed_type: feed.feed_type, status: feed.status },
			});
		}
	});
}
