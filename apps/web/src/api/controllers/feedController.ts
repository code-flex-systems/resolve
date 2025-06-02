import * as feedQueries from '@/api/queries/feedQueries';
import { FeedStatus, FeedType } from '@/config/enums';

export async function getFeeds() {
	return await feedQueries.getFeeds();
}

export async function getFeed({ id }: { id: number }) {
	return await feedQueries.getFeed(id);
}

export async function createFeed({
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
}) {
	return await feedQueries.createFeed({
		name,
		schedule,
		feed_type,
		connection_options,
		status,
		last_synced_at,
	});
}

export async function updateFeed({
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
}) {
	return await feedQueries.updateFeed(id, params);
}

export async function deleteFeed({ id }: { id: number }) {
	await feedQueries.deleteFeed(id);
}
