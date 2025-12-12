/**
 * Integration tests for adminLogQueries
 *
 * Tests cover:
 * - getAdminLogsByClaim: Get admin logs for a specific claim
 * - getAdminLogsByEntity: Get admin logs by entity type and ID
 * - Tenant isolation on all operations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import { getAdminLogsByClaim, getAdminLogsByEntity } from '../adminLogQueries';
import { EntityName } from '@/api/utils/adminActionLogger';
import { createTestClient, createTestUser, createTestClaim } from '@/__tests__/integration/fixtures';

describe('adminLogQueries integration tests', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	describe('getAdminLogsByClaim', () => {
		it('should return admin logs for a claim', async () => {
			const client = await createTestClient(db, { name: 'AdminLog Test Client' });
			const user = await createTestUser(db, { client_id: client.id, email: 'adminlog-test@test.com' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'admin' });

			// Insert test logs
			await db
				.insertInto('claim_activity_logs')
				.values([
					{
						client_id: client.id,
						claim_id: claim.id,
						entity_id: claim.id.toString(),
						entity_name: EntityName.CLAIM,
						action: 'CREATE',
						actor_type: 'admin',
						user_id: user.id,
					},
					{
						client_id: client.id,
						claim_id: claim.id,
						entity_id: claim.id.toString(),
						entity_name: EntityName.CLAIM,
						action: 'UPDATE',
						actor_type: 'admin',
						user_id: user.id,
					},
				])
				.execute();

			const logs = await getAdminLogsByClaim(ctx, claim.id);

			expect(logs).toHaveLength(2);
			expect(logs[0].entity_name).toBe(EntityName.CLAIM);
			expect(logs[0].first_name).toBe(user.first);
			expect(logs[0].last_name).toBe(user.last);
		});

		it('should only return admin actor type logs', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'admin' });

			// Insert logs with different actor types
			await db
				.insertInto('claim_activity_logs')
				.values([
					{
						client_id: client.id,
						claim_id: claim.id,
						entity_id: claim.id.toString(),
						entity_name: EntityName.CLAIM,
						action: 'CREATE',
						actor_type: 'admin',
						user_id: user.id,
					},
					{
						client_id: client.id,
						claim_id: claim.id,
						entity_id: claim.id.toString(),
						entity_name: EntityName.CLAIM,
						action: 'UPDATE',
						actor_type: 'user', // Not admin
						user_id: user.id,
					},
				])
				.execute();

			const logs = await getAdminLogsByClaim(ctx, claim.id);

			expect(logs).toHaveLength(1);
			expect(logs[0].actor_type).toBe('admin');
		});

		it('should respect limit parameter', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'admin' });

			// Insert many logs (using valid action values)
			const actions = ['CREATE', 'UPDATE', 'DELETE', 'CLAIM', 'UNCLAIM', 'COMPLETE', 'CANCEL'];
			for (let i = 0; i < 15; i++) {
				await db
					.insertInto('claim_activity_logs')
					.values({
						client_id: client.id,
						claim_id: claim.id,
						entity_id: claim.id.toString(),
						entity_name: EntityName.CLAIM,
						action: actions[i % actions.length],
						actor_type: 'admin',
						user_id: user.id,
					})
					.execute();
			}

			// Default limit is 10
			const logs = await getAdminLogsByClaim(ctx, claim.id);
			expect(logs).toHaveLength(10);

			// Custom limit
			const logsLimit5 = await getAdminLogsByClaim(ctx, claim.id, 5);
			expect(logsLimit5).toHaveLength(5);
		});

		it('should order by created_at descending', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'admin' });

			// Insert logs with slight time differences
			await db
				.insertInto('claim_activity_logs')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					entity_id: claim.id.toString(),
					entity_name: EntityName.CLAIM,
					action: 'CREATE',
					actor_type: 'admin',
					user_id: user.id,
				})
				.execute();

			// Small delay to ensure different timestamps
			await new Promise((resolve) => setTimeout(resolve, 10));

			await db
				.insertInto('claim_activity_logs')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					entity_id: claim.id.toString(),
					entity_name: EntityName.CLAIM,
					action: 'UPDATE',
					actor_type: 'admin',
					user_id: user.id,
				})
				.execute();

			const logs = await getAdminLogsByClaim(ctx, claim.id);

			expect(logs[0].action).toBe('UPDATE'); // Most recent first
			expect(logs[1].action).toBe('CREATE');
		});

		it('should not return logs from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db, { name: 'AdminLog Client A' });
			const clientB = await createTestClient(db, { name: 'AdminLog Client B' });
			const userA = await createTestUser(db, { client_id: clientA.id, email: 'adminlog-a@test.com' });
			const userB = await createTestUser(db, { client_id: clientB.id, email: 'adminlog-b@test.com' });
			const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
			const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'admin' });

			// Create log for client A
			await db
				.insertInto('claim_activity_logs')
				.values({
					client_id: clientA.id,
					claim_id: claimA.id,
					entity_id: claimA.id.toString(),
					entity_name: EntityName.CLAIM,
					action: 'CREATE',
					actor_type: 'admin',
					user_id: userA.id,
				})
				.execute();

			// Create log for client B
			await db
				.insertInto('claim_activity_logs')
				.values({
					client_id: clientB.id,
					claim_id: claimB.id,
					entity_id: claimB.id.toString(),
					entity_name: EntityName.CLAIM,
					action: 'CREATE',
					actor_type: 'admin',
					user_id: userB.id,
				})
				.execute();

			const logsA = await getAdminLogsByClaim(ctxA, claimA.id);
			expect(logsA).toHaveLength(1);

			// Client A should not see client B's logs even if they know the claim ID
			const logsB = await getAdminLogsByClaim(ctxA, claimB.id);
			expect(logsB).toHaveLength(0);
		});
	});

	describe('getAdminLogsByEntity', () => {
		describe('claim-related entities', () => {
			it('should return logs for CLAIM entity', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'admin' });

				await db
					.insertInto('claim_activity_logs')
					.values({
						client_id: client.id,
						claim_id: claim.id,
						entity_id: claim.id.toString(),
						entity_name: EntityName.CLAIM,
						action: 'UPDATE',
						actor_type: 'admin',
						user_id: user.id,
					})
					.execute();

				const logs = await getAdminLogsByEntity(ctx, EntityName.CLAIM, claim.id.toString());

				expect(logs).toHaveLength(1);
				expect(logs[0].entity_name).toBe(EntityName.CLAIM);
			});

			it('should return logs for TASK entity', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'admin' });

				const taskId = '123';
				await db
					.insertInto('claim_activity_logs')
					.values({
						client_id: client.id,
						claim_id: claim.id,
						entity_id: taskId,
						entity_name: EntityName.TASK,
						action: 'CREATE',
						actor_type: 'admin',
						user_id: user.id,
					})
					.execute();

				const logs = await getAdminLogsByEntity(ctx, EntityName.TASK, taskId);

				expect(logs).toHaveLength(1);
				expect(logs[0].entity_name).toBe(EntityName.TASK);
			});

			it('should return logs for DEADLINE entity', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'admin' });

				const deadlineId = '456';
				await db
					.insertInto('claim_activity_logs')
					.values({
						client_id: client.id,
						claim_id: claim.id,
						entity_id: deadlineId,
						entity_name: EntityName.DEADLINE,
						action: 'CREATE',
						actor_type: 'admin',
						user_id: user.id,
					})
					.execute();

				const logs = await getAdminLogsByEntity(ctx, EntityName.DEADLINE, deadlineId);

				expect(logs).toHaveLength(1);
				expect(logs[0].entity_name).toBe(EntityName.DEADLINE);
			});

			it('should only return admin actor type logs', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'admin' });

				await db
					.insertInto('claim_activity_logs')
					.values([
						{
							client_id: client.id,
							claim_id: claim.id,
							entity_id: claim.id.toString(),
							entity_name: EntityName.CLAIM,
							action: 'CREATE',
							actor_type: 'admin',
							user_id: user.id,
						},
						{
							client_id: client.id,
							claim_id: claim.id,
							entity_id: claim.id.toString(),
							entity_name: EntityName.CLAIM,
							action: 'UPDATE',
							actor_type: 'user',
							user_id: user.id,
						},
					])
					.execute();

				const logs = await getAdminLogsByEntity(ctx, EntityName.CLAIM, claim.id.toString());

				expect(logs).toHaveLength(1);
				expect(logs[0].action).toBe('CREATE');
			});
		});

		describe('config entities', () => {
			it('should return logs for CHECKLIST entity from admin_config_logs', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'admin' });

				const checklistId = '789';
				await db
					.insertInto('admin_config_logs')
					.values({
						client_id: client.id,
						entity_id: checklistId,
						entity_name: EntityName.CHECKLIST,
						action: 'CREATE',
						user_id: user.id,
					})
					.execute();

				const logs = await getAdminLogsByEntity(ctx, EntityName.CHECKLIST, checklistId);

				expect(logs).toHaveLength(1);
				expect(logs[0].entity_name).toBe(EntityName.CHECKLIST);
			});

			it('should return logs for PAGE entity from admin_config_logs', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'admin' });

				const pageId = '101';
				await db
					.insertInto('admin_config_logs')
					.values({
						client_id: client.id,
						entity_id: pageId,
						entity_name: EntityName.PAGE,
						action: 'UPDATE',
						user_id: user.id,
					})
					.execute();

				const logs = await getAdminLogsByEntity(ctx, EntityName.PAGE, pageId);

				expect(logs).toHaveLength(1);
				expect(logs[0].entity_name).toBe(EntityName.PAGE);
			});

			it('should return logs for QUESTION entity from admin_config_logs', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'admin' });

				const questionId = '202';
				await db
					.insertInto('admin_config_logs')
					.values({
						client_id: client.id,
						entity_id: questionId,
						entity_name: EntityName.QUESTION,
						action: 'DELETE',
						user_id: user.id,
					})
					.execute();

				const logs = await getAdminLogsByEntity(ctx, EntityName.QUESTION, questionId);

				expect(logs).toHaveLength(1);
				expect(logs[0].entity_name).toBe(EntityName.QUESTION);
			});
		});

		it('should respect limit parameter', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'admin' });

			const actions = ['CREATE', 'UPDATE', 'DELETE', 'CLAIM', 'UNCLAIM', 'COMPLETE', 'CANCEL'];
			for (let i = 0; i < 15; i++) {
				await db
					.insertInto('claim_activity_logs')
					.values({
						client_id: client.id,
						claim_id: claim.id,
						entity_id: claim.id.toString(),
						entity_name: EntityName.CLAIM,
						action: actions[i % actions.length],
						actor_type: 'admin',
						user_id: user.id,
					})
					.execute();
			}

			const logs = await getAdminLogsByEntity(ctx, EntityName.CLAIM, claim.id.toString(), 5);
			expect(logs).toHaveLength(5);
		});

		it('should not return logs from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'admin' });

			await db
				.insertInto('claim_activity_logs')
				.values({
					client_id: clientB.id,
					claim_id: claimB.id,
					entity_id: claimB.id.toString(),
					entity_name: EntityName.CLAIM,
					action: 'CREATE',
					actor_type: 'admin',
					user_id: userB.id,
				})
				.execute();

			// Client A should not see client B's logs
			const logs = await getAdminLogsByEntity(ctxA, EntityName.CLAIM, claimB.id.toString());
			expect(logs).toHaveLength(0);
		});
	});
});
