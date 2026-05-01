/**
 * Integration tests for activityLogQueries
 *
 * Tests cover:
 * - getClaimActivityLogs: Get activity logs for a claim
 * - getCompleteClaimTimeline: Merge activity + response logs
 * - getUserActivityLogs: Get all activity for a user
 * - getEntityConfigLogs: Get config logs for an entity
 * - getRecentConfigLogs: Get recent config logs
 * - Tenant isolation on all operations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	getClaimActivityLogs,
	getCompleteClaimTimeline,
	getUserActivityLogs,
	getEntityConfigLogs,
	getRecentConfigLogs,
} from '../activityLogQueries';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
} from '@/__tests__/integration/fixtures';

describe('activityLogQueries integration tests', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	describe('getClaimActivityLogs', () => {
		it('should return activity logs for a claim', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			// Create activity log
			await db
				.insertInto('claim_activity_logs')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					user_id: user.id,
					entity_id: claim.id.toString(),
					entity_name: 'claim',
					action: 'CREATE',
					actor_type: 'user',
				})
				.execute();

			const logs = await getClaimActivityLogs(ctx, claim.id);

			expect(logs.length).toBeGreaterThanOrEqual(1);
			expect(logs[0].claim_id).toBe(claim.id);
			expect(logs[0].user_first_name).toBe(user.first);
			expect(logs[0].user_last_name).toBe(user.last);
		});

		it('should filter by actorType', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			// Create logs with different actor types
			await db
				.insertInto('claim_activity_logs')
				.values([
					{
						client_id: client.id,
						claim_id: claim.id,
						user_id: user.id,
						entity_id: claim.id.toString(),
						entity_name: 'claim',
						action: 'UPDATE',
						actor_type: 'admin',
					},
					{
						client_id: client.id,
						claim_id: claim.id,
						user_id: user.id,
						entity_id: claim.id.toString(),
						entity_name: 'claim',
						action: 'UPDATE',
						actor_type: 'user',
					},
				])
				.execute();

			const adminLogs = await getClaimActivityLogs(ctx, claim.id, { actorType: 'admin' });
			const userLogs = await getClaimActivityLogs(ctx, claim.id, { actorType: 'user' });

			expect(adminLogs.every((log) => log.actor_type === 'admin')).toBe(true);
			expect(userLogs.every((log) => log.actor_type === 'user')).toBe(true);
		});

		it('should respect limit option', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			// Create multiple logs
			for (let i = 0; i < 5; i++) {
				await db
					.insertInto('claim_activity_logs')
					.values({
						client_id: client.id,
						claim_id: claim.id,
						user_id: user.id,
						entity_id: claim.id.toString(),
						entity_name: 'claim',
						action: 'CREATE',
						actor_type: 'user',
					})
					.execute();
			}

			const logs = await getClaimActivityLogs(ctx, claim.id, { limit: 2 });

			expect(logs.length).toBe(2);
		});

		it('should order by created_at descending', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			// Create logs with slight delay to ensure ordering
			await db
				.insertInto('claim_activity_logs')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					user_id: user.id,
					entity_id: claim.id.toString(),
					entity_name: 'claim',
					action: 'CREATE',
					actor_type: 'user',
				})
				.execute();

			await db
				.insertInto('claim_activity_logs')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					user_id: user.id,
					entity_id: claim.id.toString(),
					entity_name: 'claim',
					action: 'UPDATE',
					actor_type: 'user',
				})
				.execute();

			const logs = await getClaimActivityLogs(ctx, claim.id);

			// Most recent should be first (UPDATE was inserted second)
			expect(logs[0].action).toBe('UPDATE');
		});

		it('should not return logs from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'user',
			});

			// Create log for client B
			await db
				.insertInto('claim_activity_logs')
				.values({
					client_id: clientB.id,
					claim_id: claimB.id,
					user_id: userB.id,
					entity_id: claimB.id.toString(),
					entity_name: 'claim',
					action: 'CREATE',
					actor_type: 'user',
				})
				.execute();

			// Client A should not see client B's logs
			const logs = await getClaimActivityLogs(ctxA, claimB.id);
			expect(logs.length).toBe(0);
		});

		it('should return empty array when no logs exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			const logs = await getClaimActivityLogs(ctx, claim.id);
			expect(logs).toEqual([]);
		});
	});

	describe('getCompleteClaimTimeline', () => {
		it('should return combined activity and response logs', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			// Create activity log
			await db
				.insertInto('claim_activity_logs')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					user_id: user.id,
					entity_id: claim.id.toString(),
					entity_name: 'claim',
					action: 'CREATE',
					actor_type: 'user',
				})
				.execute();

			// Create response log
			await db
				.insertInto('response_audit_logs')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					user_id: user.id,
					question_id: null,
					question_text: 'Test Question',
					page_label: 'Test Page',
					new_response_text: 'Test Response',
					action: 'insert',
				})
				.execute();

			const timeline = await getCompleteClaimTimeline(ctx, claim.id);

			expect(timeline.length).toBe(2);
		});

		it('should respect limit option on combined results', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			// Create multiple logs
			for (let i = 0; i < 3; i++) {
				await db
					.insertInto('claim_activity_logs')
					.values({
						client_id: client.id,
						claim_id: claim.id,
						user_id: user.id,
						entity_id: claim.id.toString(),
						entity_name: 'claim',
						action: 'CREATE',
						actor_type: 'user',
					})
					.execute();
				await db
					.insertInto('response_audit_logs')
					.values({
						client_id: client.id,
						claim_id: claim.id,
						user_id: user.id,
						question_id: null,
						question_text: `Question ${i}`,
						page_label: `Page ${i}`,
						new_response_text: `Response ${i}`,
						action: 'insert',
					})
					.execute();
			}

			const timeline = await getCompleteClaimTimeline(ctx, claim.id, { limit: 3 });

			expect(timeline.length).toBe(3);
		});

		it('should not return logs from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'user',
			});

			// Create logs for client B
			await db
				.insertInto('claim_activity_logs')
				.values({
					client_id: clientB.id,
					claim_id: claimB.id,
					user_id: userB.id,
					entity_id: claimB.id.toString(),
					entity_name: 'claim',
					action: 'CREATE',
					actor_type: 'user',
				})
				.execute();
			await db
				.insertInto('response_audit_logs')
				.values({
					client_id: clientB.id,
					claim_id: claimB.id,
					user_id: userB.id,
					question_id: null,
					question_text: 'Q',
					page_label: 'P',
					new_response_text: 'R',
					action: 'insert',
				})
				.execute();

			// Client A should not see client B's timeline
			const timeline = await getCompleteClaimTimeline(ctxA, claimB.id);
			expect(timeline.length).toBe(0);
		});
	});

	describe('getUserActivityLogs', () => {
		it('should return all activity types for a user', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			// Create different types of logs
			await db
				.insertInto('admin_config_logs')
				.values({
					client_id: client.id,
					user_id: user.id,
					entity_id: '1',
					entity_name: 'checklist',
					action: 'CREATE',
				})
				.execute();

			await db
				.insertInto('claim_activity_logs')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					user_id: user.id,
					entity_id: claim.id.toString(),
					entity_name: 'claim',
					action: 'UPDATE',
					actor_type: 'user',
				})
				.execute();

			await db
				.insertInto('response_audit_logs')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					user_id: user.id,
					question_id: null,
					question_text: 'Q',
					page_label: 'P',
					new_response_text: 'R',
					action: 'insert',
				})
				.execute();

			const logs = await getUserActivityLogs(ctx, user.id);

			expect(logs.length).toBe(3);
		});

		it('should filter by date range', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			// Create log
			await db
				.insertInto('admin_config_logs')
				.values({
					client_id: client.id,
					user_id: user.id,
					entity_id: '1',
					entity_name: 'checklist',
					action: 'CREATE',
				})
				.execute();

			const now = new Date();
			const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
			const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

			// Should find logs within range
			const logsInRange = await getUserActivityLogs(ctx, user.id, {
				startDate: yesterday,
				endDate: tomorrow,
			});
			expect(logsInRange.length).toBeGreaterThanOrEqual(1);

			// Should not find logs outside range
			const logsOutOfRange = await getUserActivityLogs(ctx, user.id, {
				startDate: tomorrow,
			});
			expect(logsOutOfRange.length).toBe(0);
		});

		it('should respect limit option', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			// Create multiple logs
			for (let i = 0; i < 5; i++) {
				await db
					.insertInto('admin_config_logs')
					.values({
						client_id: client.id,
						user_id: user.id,
						entity_id: i.toString(),
						entity_name: 'checklist',
						action: 'CREATE',
					})
					.execute();
			}

			const logs = await getUserActivityLogs(ctx, user.id, { limit: 2 });

			expect(logs.length).toBe(2);
		});

		it('should not return logs from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'user',
			});

			// Create log for client B user
			await db
				.insertInto('admin_config_logs')
				.values({
					client_id: clientB.id,
					user_id: userB.id,
					entity_id: '1',
					entity_name: 'checklist',
					action: 'CREATE',
				})
				.execute();

			// Client A should not see client B user's logs
			const logs = await getUserActivityLogs(ctxA, userB.id);
			expect(logs.length).toBe(0);
		});
	});

	describe('getEntityConfigLogs', () => {
		it('should return config logs for an entity', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			await db
				.insertInto('admin_config_logs')
				.values({
					client_id: client.id,
					user_id: user.id,
					entity_id: '123',
					entity_name: 'checklist',
					action: 'UPDATE',
					value: JSON.stringify({ name: 'Test' }),
				})
				.execute();

			const logs = await getEntityConfigLogs(ctx, 'checklist', '123');

			expect(logs.length).toBeGreaterThanOrEqual(1);
			expect(logs[0].entity_name).toBe('checklist');
			expect(logs[0].entity_id).toBe('123');
			expect(logs[0].user_first_name).toBe(user.first);
		});

		it('should accept numeric entity id', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			await db
				.insertInto('admin_config_logs')
				.values({
					client_id: client.id,
					user_id: user.id,
					entity_id: '456',
					entity_name: 'page',
					action: 'CREATE',
				})
				.execute();

			const logs = await getEntityConfigLogs(ctx, 'page', 456);

			expect(logs.length).toBeGreaterThanOrEqual(1);
			expect(logs[0].entity_id).toBe('456');
		});

		it('should respect limit option', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			for (let i = 0; i < 5; i++) {
				await db
					.insertInto('admin_config_logs')
					.values({
						client_id: client.id,
						user_id: user.id,
						entity_id: '789',
						entity_name: 'question',
						action: 'CREATE',
					})
					.execute();
			}

			const logs = await getEntityConfigLogs(ctx, 'question', '789', { limit: 2 });

			expect(logs.length).toBe(2);
		});

		it('should not return logs from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'user',
			});

			await db
				.insertInto('admin_config_logs')
				.values({
					client_id: clientB.id,
					user_id: userB.id,
					entity_id: '999',
					entity_name: 'checklist',
					action: 'CREATE',
				})
				.execute();

			const logs = await getEntityConfigLogs(ctxA, 'checklist', '999');
			expect(logs.length).toBe(0);
		});
	});

	describe('getRecentConfigLogs', () => {
		it('should return recent config logs', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			await db
				.insertInto('admin_config_logs')
				.values({
					client_id: client.id,
					user_id: user.id,
					entity_id: '1',
					entity_name: 'checklist',
					action: 'CREATE',
				})
				.execute();

			const logs = await getRecentConfigLogs(ctx);

			expect(logs.length).toBeGreaterThanOrEqual(1);
			expect(logs[0].user_first_name).toBe(user.first);
		});

		it('should filter by entityName', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			await db
				.insertInto('admin_config_logs')
				.values([
					{
						client_id: client.id,
						user_id: user.id,
						entity_id: '1',
						entity_name: 'checklist',
						action: 'CREATE',
					},
					{
						client_id: client.id,
						user_id: user.id,
						entity_id: '2',
						entity_name: 'page',
						action: 'CREATE',
					},
				])
				.execute();

			const checklistLogs = await getRecentConfigLogs(ctx, { entityName: 'checklist' });
			const pageLogs = await getRecentConfigLogs(ctx, { entityName: 'page' });

			expect(checklistLogs.every((log) => log.entity_name === 'checklist')).toBe(true);
			expect(pageLogs.every((log) => log.entity_name === 'page')).toBe(true);
		});

		it('should respect limit option', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			for (let i = 0; i < 5; i++) {
				await db
					.insertInto('admin_config_logs')
					.values({
						client_id: client.id,
						user_id: user.id,
						entity_id: i.toString(),
						entity_name: 'answer',
						action: 'CREATE',
					})
					.execute();
			}

			const logs = await getRecentConfigLogs(ctx, { limit: 2 });

			expect(logs.length).toBe(2);
		});

		it('should order by created_at descending', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			await db
				.insertInto('admin_config_logs')
				.values({
					client_id: client.id,
					user_id: user.id,
					entity_id: 'first',
					entity_name: 'test',
					action: 'CREATE',
				})
				.execute();

			await db
				.insertInto('admin_config_logs')
				.values({
					client_id: client.id,
					user_id: user.id,
					entity_id: 'second',
					entity_name: 'test',
					action: 'UPDATE',
				})
				.execute();

			const logs = await getRecentConfigLogs(ctx, { entityName: 'test' });

			// Most recent (UPDATE) should be first since it was inserted second
			expect(logs[0].action).toBe('UPDATE');
		});

		it('should not return logs from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'user',
			});

			await db
				.insertInto('admin_config_logs')
				.values({
					client_id: clientB.id,
					user_id: userB.id,
					entity_id: '1',
					entity_name: 'isolated_test',
					action: 'CREATE',
				})
				.execute();

			const logs = await getRecentConfigLogs(ctxA, { entityName: 'isolated_test' });
			expect(logs.length).toBe(0);
		});
	});
});
