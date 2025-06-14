import * as feedQueries from '@/api/queries/feedQueries';
import { FeedStatus, FeedType } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';

export async function getFeeds(ctx: ProtectedContext) {
	return await feedQueries.getFeeds(ctx);
}

export async function getFeed(ctx: ProtectedContext, { id }: { id: number }) {
	return await feedQueries.getFeed(ctx, id);
}

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

export async function deleteFeed(ctx: ProtectedContext, { id }: { id: number }) {
	await feedQueries.deleteFeed(ctx, id);
}
