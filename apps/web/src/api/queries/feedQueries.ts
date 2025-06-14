import { db } from '@/api/database/kysely';
import { FeedStatus, FeedType } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { applyClientScope } from '../database/clientScoped';

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

export async function getFeeds(ctx: ProtectedContext): Promise<Feed[]> {
	return await applyClientScope(
		db.selectFrom('feeds').selectAll().where('status', '<>', FeedStatus.INACTIVE).orderBy('name'),
		ctx.session.user.client_id
	).execute();
}

export async function getFeed(ctx: ProtectedContext, id: number): Promise<Feed | undefined> {
	return await applyClientScope(
		db.selectFrom('feeds').selectAll().where('id', '=', id),
		ctx.session.user.client_id
	).executeTakeFirst();
}

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
		})
		.returningAll()
		.execute();
	return feed;
}

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
		})
		.where('id', '=', id)
		.returningAll()
		.execute();
	return feed;
}

export async function deleteFeed(ctx: ProtectedContext, id: number): Promise<void> {
	await db.deleteFrom('feeds').where('id', '=', id).execute();
}
