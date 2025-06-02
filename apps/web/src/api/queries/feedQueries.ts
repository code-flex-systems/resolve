import { db } from '@/api/database/kysely';
import { FeedStatus, FeedType } from '@/config/enums';

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

export interface UpdateFeedParams extends Partial<NewFeedParams> {}

export async function getFeeds(): Promise<Feed[]> {
	return await db
		.selectFrom('feeds')
		.selectAll()
		.where('status', '<>', FeedStatus.INACTIVE)
		.orderBy('name')
		.execute();
}

export async function getFeed(id: number): Promise<Feed | undefined> {
	return await db.selectFrom('feeds').selectAll().where('id', '=', id).executeTakeFirst();
}

export async function createFeed(params: NewFeedParams): Promise<Feed> {
	const [feed] = await db
		.insertInto('feeds')
		.values({
			name: params.name,
			schedule: params.schedule,
			feed_type: params.feed_type,
			connection_options: params.connection_options,
			status: params.status ?? 'inactive',
			last_synced_at: params.last_synced_at ?? null,
		})
		.returningAll()
		.execute();
	return feed;
}

export async function updateFeed(id: number, params: UpdateFeedParams): Promise<Feed> {
	const [feed] = await db
		.updateTable('feeds')
		.set({
			...(params.name !== undefined && { name: params.name }),
			...(params.schedule !== undefined && { schedule: params.schedule }),
			...(params.feed_type && { feed_type: params.feed_type }),
			...(params.connection_options && { connection_options: params.connection_options }),
			...(params.status && { status: params.status }),
			...(params.last_synced_at !== undefined && { last_synced_at: params.last_synced_at }),
		})
		.where('id', '=', id)
		.returningAll()
		.execute();
	return feed;
}

export async function deleteFeed(id: number): Promise<void> {
	await db.deleteFrom('feeds').where('id', '=', id).execute();
}
