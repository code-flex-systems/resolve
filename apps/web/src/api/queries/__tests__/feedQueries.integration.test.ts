/**
 * Integration tests for feedQueries
 *
 * Tests cover:
 * - getFeeds: List active feeds
 * - getFeedCount: Count feeds by status
 * - getFeed: Get single feed
 * - getLastSyncedFeed: Get most recently synced feed with unassigned claims
 * - createFeed: Create a new feed
 * - updateFeed: Update an existing feed
 * - getFeedForDeletion: Get feed info before deletion
 * - deleteFeed: Delete a feed
 * - Tenant isolation on all operations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	getFeeds,
	getFeedCount,
	getFeed,
	getLastSyncedFeed,
	createFeed,
	updateFeed,
	getFeedForDeletion,
	deleteFeed,
} from '../feedQueries';
import { FeedStatus, FeedType } from '@/config/enums';
import { createTestClient, createTestUser, createTestFeed, createTestClaim } from '@/__tests__/integration/fixtures';

describe('feedQueries integration tests', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	describe('getFeeds', () => {
		it('should return all non-inactive feeds', async () => {
			const client = await createTestClient(db, { name: 'Feed Test Client' });
			const user = await createTestUser(db, { client_id: client.id, email: 'feed-test@test.com' });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await createTestFeed(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Online Feed',
				status: FeedStatus.ONLINE,
			});
			await createTestFeed(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Muted Feed',
				status: FeedStatus.MUTED,
			});
			await createTestFeed(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Inactive Feed',
				status: FeedStatus.INACTIVE,
			});

			const feeds = await getFeeds(ctx);

			expect(feeds).toHaveLength(2);
			expect(feeds.map((f) => f.name).sort()).toEqual(['Muted Feed', 'Online Feed']);
		});

		it('should order feeds by name', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await createTestFeed(db, { client_id: client.id, created_by: user.id, name: 'Zebra Feed', status: FeedStatus.ONLINE });
			await createTestFeed(db, { client_id: client.id, created_by: user.id, name: 'Alpha Feed', status: FeedStatus.ONLINE });

			const feeds = await getFeeds(ctx);

			expect(feeds[0].name).toBe('Alpha Feed');
			expect(feeds[1].name).toBe('Zebra Feed');
		});

		it('should not return feeds from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db, { name: 'Feed Client A' });
			const clientB = await createTestClient(db, { name: 'Feed Client B' });
			const userA = await createTestUser(db, { client_id: clientA.id, email: 'feed-a@test.com' });
			const userB = await createTestUser(db, { client_id: clientB.id, email: 'feed-b@test.com' });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });
			const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id, email: userB.email, role: 'user' });

			await createTestFeed(db, { client_id: clientA.id, created_by: userA.id, name: 'Client A Feed', status: FeedStatus.ONLINE });
			await createTestFeed(db, { client_id: clientB.id, created_by: userB.id, name: 'Client B Feed', status: FeedStatus.ONLINE });

			const feedsA = await getFeeds(ctxA);
			expect(feedsA).toHaveLength(1);
			expect(feedsA[0].name).toBe('Client A Feed');

			const feedsB = await getFeeds(ctxB);
			expect(feedsB).toHaveLength(1);
			expect(feedsB[0].name).toBe('Client B Feed');
		});
	});

	describe('getFeedCount', () => {
		it('should count feeds by status', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await createTestFeed(db, { client_id: client.id, created_by: user.id, name: `Feed Online 1 ${Date.now()}`, status: FeedStatus.ONLINE });
			await createTestFeed(db, { client_id: client.id, created_by: user.id, name: `Feed Online 2 ${Date.now()}`, status: FeedStatus.ONLINE });
			await createTestFeed(db, { client_id: client.id, created_by: user.id, name: `Feed Muted ${Date.now()}`, status: FeedStatus.MUTED });
			await createTestFeed(db, { client_id: client.id, created_by: user.id, name: `Feed Inactive ${Date.now()}`, status: FeedStatus.INACTIVE });

			const counts = await getFeedCount(ctx, client.id);

			expect(counts.total).toBe(4);
			expect(counts[FeedStatus.ONLINE]).toBe(2);
			expect(counts[FeedStatus.MUTED]).toBe(1);
			expect(counts[FeedStatus.INACTIVE]).toBe(1);
		});

		it('should return zeros when no feeds exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const counts = await getFeedCount(ctx, client.id);

			expect(counts.total).toBe(0);
			expect(counts[FeedStatus.ONLINE]).toBe(0);
		});

		it('should not count feeds from different client', async () => {
			const clientA = await createTestClient(db, { name: 'Count Client A' });
			const clientB = await createTestClient(db, { name: 'Count Client B' });
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });
			const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id, email: userB.email, role: 'user' });

			await createTestFeed(db, { client_id: clientA.id, created_by: userA.id, name: `Count A Feed ${Date.now()}`, status: FeedStatus.ONLINE });
			await createTestFeed(db, { client_id: clientB.id, created_by: userB.id, name: `Count B Feed ${Date.now()}`, status: FeedStatus.ONLINE });

			const countsA = await getFeedCount(ctxA, clientA.id);
			expect(countsA.total).toBe(1);

			const countsB = await getFeedCount(ctxB, clientB.id);
			expect(countsB.total).toBe(1);
		});
	});

	describe('getFeed', () => {
		it('should return a feed by id', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const created = await createTestFeed(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Test Feed',
				feed_type: FeedType.SFTP,
				schedule: 12,
				status: FeedStatus.ONLINE,
			});

			const feed = await getFeed(ctx, created.id);

			expect(feed).toBeDefined();
			expect(feed!.name).toBe('Test Feed');
			expect(feed!.feed_type).toBe(FeedType.SFTP);
			expect(feed!.schedule).toBe(12);
		});

		it('should return undefined for non-existent feed', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const feed = await getFeed(ctx, '00000000-0000-0000-0000-000000000000');
			expect(feed).toBeUndefined();
		});

		it('should not return feed from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			const feedB = await createTestFeed(db, { client_id: clientB.id, created_by: userB.id });

			const feed = await getFeed(ctxA, feedB.id);
			expect(feed).toBeUndefined();
		});
	});

	describe('getLastSyncedFeed', () => {
		it('should return online feed with unassigned claims', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const feed = await createTestFeed(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Synced Feed',
				status: FeedStatus.ONLINE,
			});

			// Update last_synced_at
			await db
				.updateTable('feeds')
				.set({ last_synced_at: new Date() })
				.where('id', '=', feed.id)
				.execute();

			// Create claim linked to feed (no checklist_claim = unassigned)
			await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				feed_id: feed.id,
			});

			const result = await getLastSyncedFeed(ctx);

			expect(result).toBeDefined();
			expect(result!.name).toBe('Synced Feed');
		});

		it('should not return feed when all claims are assigned', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const feed = await createTestFeed(db, {
				client_id: client.id,
				created_by: user.id,
				status: FeedStatus.ONLINE,
			});

			await db
				.updateTable('feeds')
				.set({ last_synced_at: new Date() })
				.where('id', '=', feed.id)
				.execute();

			// Create claim and assign it to a checklist
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				feed_id: feed.id,
			});

			const checklist = await db
				.insertInto('checklist')
				.values({ name: 'Test', client_id: client.id, created_by: user.id })
				.returning('id')
				.executeTakeFirstOrThrow();

			await db
				.insertInto('checklist_claim')
				.values({
					checklist_id: checklist.id,
					claim_id: claim.id,
					client_id: client.id,
					created_by: user.id,
					assignee: user.id,
					status: 'assigned',
				})
				.execute();

			const result = await getLastSyncedFeed(ctx);
			expect(result).toBeUndefined();
		});

		it('should not return muted or inactive feeds', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const feed = await createTestFeed(db, {
				client_id: client.id,
				created_by: user.id,
				status: FeedStatus.MUTED,
			});

			await db
				.updateTable('feeds')
				.set({ last_synced_at: new Date() })
				.where('id', '=', feed.id)
				.execute();

			await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				feed_id: feed.id,
			});

			const result = await getLastSyncedFeed(ctx);
			expect(result).toBeUndefined();
		});

		it('should not return feed from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db, { name: 'LastSync Client A' });
			const clientB = await createTestClient(db, { name: 'LastSync Client B' });
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			// Create feed with unassigned claims for client B
			const feedB = await createTestFeed(db, {
				client_id: clientB.id,
				created_by: userB.id,
				status: FeedStatus.ONLINE,
			});

			await db
				.updateTable('feeds')
				.set({ last_synced_at: new Date() })
				.where('id', '=', feedB.id)
				.execute();

			await createTestClaim(db, {
				client_id: clientB.id,
				created_by: userB.id,
				feed_id: feedB.id,
			});

			// Client A should not see client B's feed
			const result = await getLastSyncedFeed(ctxA);
			expect(result).toBeUndefined();
		});
	});

	describe('createFeed', () => {
		it('should create a feed with all fields', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const feed = await createFeed(ctx, {
				name: 'New Feed',
				schedule: 12,
				feed_type: FeedType.SFTP,
				connection_options: { host: 'sftp.example.com', port: 22 },
				status: FeedStatus.ONLINE,
			});

			expect(feed.name).toBe('New Feed');
			expect(feed.schedule).toBe(12);
			expect(feed.feed_type).toBe(FeedType.SFTP);
			expect(feed.status).toBe(FeedStatus.ONLINE);
			expect(feed.connection_options).toEqual({ host: 'sftp.example.com', port: 22 });
		});

		it('should set client_id from context', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const feed = await createFeed(ctx, {
				name: `Client ID Test Feed ${Date.now()}`,
				schedule: 6,
				feed_type: FeedType.SFTP,
				connection_options: {},
				status: FeedStatus.INACTIVE,
			});

			const retrieved = await db.selectFrom('feeds').selectAll().where('id', '=', feed.id).executeTakeFirstOrThrow();
			expect(retrieved.client_id).toBe(client.id);
		});
	});

	describe('updateFeed', () => {
		it('should update feed fields', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const created = await createTestFeed(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Original Name',
				schedule: 6,
				status: FeedStatus.MUTED,
			});

			const updated = await updateFeed(ctx, created.id, {
				name: 'Updated Name',
				schedule: 12,
				status: FeedStatus.ONLINE,
			});

			expect(updated.name).toBe('Updated Name');
			expect(updated.schedule).toBe(12);
			expect(updated.status).toBe(FeedStatus.ONLINE);
		});

		it('should only update provided fields', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const created = await createTestFeed(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Original',
				schedule: 6,
			});

			const updated = await updateFeed(ctx, created.id, { name: 'New Name' });

			expect(updated.name).toBe('New Name');
			expect(updated.schedule).toBe(6); // Unchanged
		});

		it('should not update feed from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			const feedB = await createTestFeed(db, {
				client_id: clientB.id,
				created_by: userB.id,
				name: `Client B Feed ${Date.now()}`,
			});

			// This should return undefined (no matching row to update)
			const result = await updateFeed(ctxA, feedB.id, { name: 'Hacked' });
			expect(result).toBeUndefined();

			// Verify unchanged
			const unchanged = await db.selectFrom('feeds').selectAll().where('id', '=', feedB.id).executeTakeFirstOrThrow();
			expect(unchanged.name).toBe(feedB.name);
		});
	});

	describe('getFeedForDeletion', () => {
		it('should return feed info for logging', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const created = await createTestFeed(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'To Delete',
				feed_type: FeedType.SFTP,
				status: FeedStatus.ONLINE,
			});

			const feed = await getFeedForDeletion(ctx, created.id);

			expect(feed).toBeDefined();
			expect(feed!.id).toBe(created.id);
			expect(feed!.name).toBe('To Delete');
			expect(feed!.feed_type).toBe(FeedType.SFTP);
			expect(feed!.status).toBe(FeedStatus.ONLINE);
		});

		it('should not return feed from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			const feedB = await createTestFeed(db, { client_id: clientB.id, created_by: userB.id });

			const feed = await getFeedForDeletion(ctxA, feedB.id);
			expect(feed).toBeUndefined();
		});
	});

	describe('deleteFeed', () => {
		it('should delete a feed', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const created = await createTestFeed(db, { client_id: client.id, created_by: user.id });

			await deleteFeed(ctx, created.id);

			const remaining = await db.selectFrom('feeds').selectAll().where('id', '=', created.id).executeTakeFirst();
			expect(remaining).toBeUndefined();
		});

		it('should not delete feed from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			const feedB = await createTestFeed(db, { client_id: clientB.id, created_by: userB.id });

			// deleteFeed enforces client scoping via executeTakeFirstOrThrow,
			// so attempting to delete another tenant's feed should throw rather than silently no-op.
			await expect(deleteFeed(ctxA, feedB.id)).rejects.toThrow();

			// Feed should still exist
			const stillExists = await db.selectFrom('feeds').selectAll().where('id', '=', feedB.id).executeTakeFirst();
			expect(stillExists).toBeTruthy();
		});
	});
});
