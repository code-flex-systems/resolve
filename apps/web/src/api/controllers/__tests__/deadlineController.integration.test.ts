/**
 * Integration tests for deadlineController
 *
 * Tests the orchestrative functions that coordinate multiple queries
 * and have complex business logic beyond simple CRUD operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import { createTestClient, createTestUser, createTestClaim, createTestDeadline } from '@/__tests__/integration/fixtures';
import * as deadlineController from '../deadlineController';
import { DeadlineStatus } from '@/config/enums';

// Available deadline statuses: PENDING, MET, MISSED, CANCELLED
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

describe('deadlineController integration tests', () => {
	let db: Kysely<DB>;

	beforeEach(() => {
		db = getTestDb();
	});

	// =========================================================================
	// updateDeadlineStatus - Status update with conditional logging
	// =========================================================================

	describe('updateDeadlineStatus', () => {
		async function setupTestFixtures() {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id });

			return { client, user, claim, ctx };
		}

		describe('status transitions', () => {
			it('should update deadline status from pending to met', async () => {
				const { client, user, claim, ctx } = await setupTestFixtures();
				const deadline = await createTestDeadline(db, {
					client_id: client.id,
					claim_id: claim.id,
					created_by: user.id,
					status: 'pending',
				});

				const result = await deadlineController.updateDeadlineStatus(ctx, {
					deadlineId: deadline.id,
					status: DeadlineStatus.MET,
				});

				expect(result.status).toBe(DeadlineStatus.MET);
			});

			it('should update deadline status from pending to missed', async () => {
				const { client, user, claim, ctx } = await setupTestFixtures();
				const deadline = await createTestDeadline(db, {
					client_id: client.id,
					claim_id: claim.id,
					created_by: user.id,
					status: 'pending',
				});

				const result = await deadlineController.updateDeadlineStatus(ctx, {
					deadlineId: deadline.id,
					status: DeadlineStatus.MISSED,
				});

				expect(result.status).toBe(DeadlineStatus.MISSED);
			});

			it('should update deadline status from pending to cancelled', async () => {
				const { client, user, claim, ctx } = await setupTestFixtures();
				const deadline = await createTestDeadline(db, {
					client_id: client.id,
					claim_id: claim.id,
					created_by: user.id,
					status: 'pending',
				});

				const result = await deadlineController.updateDeadlineStatus(ctx, {
					deadlineId: deadline.id,
					status: DeadlineStatus.CANCELLED,
				});

				expect(result.status).toBe(DeadlineStatus.CANCELLED);
			});

			it('should allow status to change multiple times', async () => {
				const { client, user, claim, ctx } = await setupTestFixtures();
				const deadline = await createTestDeadline(db, {
					client_id: client.id,
					claim_id: claim.id,
					created_by: user.id,
					status: 'pending',
				});

				// Change to met
				await deadlineController.updateDeadlineStatus(ctx, {
					deadlineId: deadline.id,
					status: DeadlineStatus.MET,
				});

				// Change back to pending
				const result = await deadlineController.updateDeadlineStatus(ctx, {
					deadlineId: deadline.id,
					status: DeadlineStatus.PENDING,
				});

				expect(result.status).toBe(DeadlineStatus.PENDING);
			});
		});

		describe('return value', () => {
			it('should return the full updated deadline object', async () => {
				const { client, user, claim, ctx } = await setupTestFixtures();
				const deadline = await createTestDeadline(db, {
					client_id: client.id,
					claim_id: claim.id,
					created_by: user.id,
					deadline_type: 'custom',
					description: 'Test deadline description',
					status: 'pending',
				});

				const result = await deadlineController.updateDeadlineStatus(ctx, {
					deadlineId: deadline.id,
					status: DeadlineStatus.MET,
				});

				expect(result).toHaveProperty('id', deadline.id);
				expect(result).toHaveProperty('claim_id', claim.id);
				expect(result).toHaveProperty('deadline_type', 'custom');
				expect(result).toHaveProperty('description', 'Test deadline description');
				expect(result).toHaveProperty('status', DeadlineStatus.MET);
			});
		});

		describe('database persistence', () => {
			it('should persist status change to database', async () => {
				const { client, user, claim, ctx } = await setupTestFixtures();
				const deadline = await createTestDeadline(db, {
					client_id: client.id,
					claim_id: claim.id,
					created_by: user.id,
					status: 'pending',
				});

				await deadlineController.updateDeadlineStatus(ctx, {
					deadlineId: deadline.id,
					status: DeadlineStatus.MET,
				});

				// Verify directly in database
				const dbDeadline = await db
					.selectFrom('deadline')
					.selectAll()
					.where('id', '=', deadline.id)
					.executeTakeFirst();

				expect(dbDeadline!.status).toBe(DeadlineStatus.MET);
			});
		});

		describe('error handling', () => {
			it('should throw error when deadline does not exist', async () => {
				const { ctx } = await setupTestFixtures();

				await expect(
					deadlineController.updateDeadlineStatus(ctx, {
						deadlineId: '00000000-0000-0000-0000-000000000000',
						status: DeadlineStatus.MET,
					})
				).rejects.toThrow();
			});
		});

		describe('tenant isolation', () => {
			it('should not allow updating deadline from different client', async () => {
				const clientA = await createTestClient(db, { name: 'Client A' });
				const clientB = await createTestClient(db, { name: 'Client B' });
				const userA = await createTestUser(db, { client_id: clientA.id });
				const userB = await createTestUser(db, { client_id: clientB.id });
				const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
				const deadlineA = await createTestDeadline(db, {
					client_id: clientA.id,
					claim_id: claimA.id,
					created_by: userA.id,
					status: 'pending',
				});

				const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id });

				// User B trying to update Client A's deadline
				await expect(
					deadlineController.updateDeadlineStatus(ctxB, {
						deadlineId: deadlineA.id,
						status: DeadlineStatus.MET,
					})
				).rejects.toThrow();

				// Verify deadline status unchanged
				const dbDeadline = await db
					.selectFrom('deadline')
					.selectAll()
					.where('id', '=', deadlineA.id)
					.executeTakeFirst();

				expect(dbDeadline!.status).toBe('pending');
			});
		});

		// Note: Activity logging is tested separately.
		// The controller logs different action types based on status:
		// - MET status: logs to user workflow activity (logUserWorkflowAction)
		// - Other statuses: logs as admin action (logAdminAction)
		// These logging calls happen inside the transaction.
	});
});
