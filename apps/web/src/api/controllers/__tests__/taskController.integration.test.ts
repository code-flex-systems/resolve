/**
 * Integration tests for taskController
 *
 * Tests the orchestrative functions that coordinate multiple queries
 * and have complex business logic beyond simple CRUD operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestTask,
	createTestDeskLocationType,
	createTestDeskLocation,
} from '@/__tests__/integration/fixtures';
import * as taskController from '../taskController';
import { TaskStatus } from '@/config/enums';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

describe('taskController integration tests', () => {
	let db: Kysely<DB>;

	beforeEach(() => {
		db = getTestDb();
	});

	async function setupTestFixtures() {
		const client = await createTestClient(db);
		const user = await createTestUser(db, { client_id: client.id });
		const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
		const deskType = await createTestDeskLocationType(db, { client_id: client.id, created_by: user.id });
		const deskLocation = await createTestDeskLocation(db, {
			client_id: client.id,
			desk_location_type_id: deskType.id,
			created_by: user.id,
		});
		const ctx = createTestContext(db, { id: user.id, client_id: client.id });

		return { client, user, claim, deskType, deskLocation, ctx };
	}

	// =========================================================================
	// claimTask - Claims task and logs user workflow action
	// =========================================================================

	describe('claimTask', () => {
		describe('basic functionality', () => {
			it('should claim a pending task', async () => {
				const { client, user, claim, deskLocation, ctx } = await setupTestFixtures();
				const task = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.PENDING,
				});

				const result = await taskController.claimTask(ctx, { id: task.id });

				expect(result.id).toBe(task.id);
				expect(result.status).toBe(TaskStatus.IN_PROGRESS);
				expect(result.claimed_by).toBe(user.id);
			});

			it('should set claimed_at timestamp when claiming', async () => {
				const { client, user, claim, deskLocation, ctx } = await setupTestFixtures();
				const task = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.PENDING,
				});

				const result = await taskController.claimTask(ctx, { id: task.id });

				expect(result.claimed_at).not.toBeNull();
			});
		});

		describe('database persistence', () => {
			it('should persist claim to database', async () => {
				const { client, user, claim, deskLocation, ctx } = await setupTestFixtures();
				const task = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.PENDING,
				});

				await taskController.claimTask(ctx, { id: task.id });

				const dbTask = await db
					.selectFrom('task')
					.selectAll()
					.where('id', '=', task.id)
					.executeTakeFirst();

				expect(dbTask!.status).toBe(TaskStatus.IN_PROGRESS);
				expect(dbTask!.claimed_by).toBe(user.id);
			});
		});

		describe('error handling', () => {
			it('should throw when task does not exist', async () => {
				const { ctx } = await setupTestFixtures();

				await expect(taskController.claimTask(ctx, { id: 999999 })).rejects.toThrow();
			});
		});

		describe('tenant isolation', () => {
			it('should not allow claiming task from different client', async () => {
				const clientA = await createTestClient(db, { name: 'Client A' });
				const clientB = await createTestClient(db, { name: 'Client B' });
				const userA = await createTestUser(db, { client_id: clientA.id });
				const userB = await createTestUser(db, { client_id: clientB.id });
				const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
				const deskTypeA = await createTestDeskLocationType(db, { client_id: clientA.id, created_by: userA.id });
				const deskLocationA = await createTestDeskLocation(db, {
					client_id: clientA.id,
					desk_location_type_id: deskTypeA.id,
					created_by: userA.id,
				});
				const taskA = await createTestTask(db, {
					client_id: clientA.id,
					claim_id: claimA.id,
					desk_location_id: deskLocationA.id,
					assigned_by: userA.id,
					status: TaskStatus.PENDING,
				});

				const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id });

				await expect(taskController.claimTask(ctxB, { id: taskA.id })).rejects.toThrow();
			});
		});
	});

	// =========================================================================
	// unclaimTask - Unclaims task and logs user workflow action
	// =========================================================================

	describe('unclaimTask', () => {
		describe('basic functionality', () => {
			it('should unclaim an in-progress task', async () => {
				const { client, user, claim, deskLocation, ctx } = await setupTestFixtures();
				const task = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.IN_PROGRESS,
					claimed_by: user.id,
				});

				const result = await taskController.unclaimTask(ctx, { id: task.id });

				expect(result.id).toBe(task.id);
				expect(result.status).toBe(TaskStatus.PENDING);
				expect(result.claimed_by).toBeNull();
			});

			it('should clear claimed_at timestamp when unclaiming', async () => {
				const { client, user, claim, deskLocation, ctx } = await setupTestFixtures();
				const task = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.IN_PROGRESS,
					claimed_by: user.id,
				});

				const result = await taskController.unclaimTask(ctx, { id: task.id });

				expect(result.claimed_at).toBeNull();
			});
		});

		describe('database persistence', () => {
			it('should persist unclaim to database', async () => {
				const { client, user, claim, deskLocation, ctx } = await setupTestFixtures();
				const task = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.IN_PROGRESS,
					claimed_by: user.id,
				});

				await taskController.unclaimTask(ctx, { id: task.id });

				const dbTask = await db
					.selectFrom('task')
					.selectAll()
					.where('id', '=', task.id)
					.executeTakeFirst();

				expect(dbTask!.status).toBe(TaskStatus.PENDING);
				expect(dbTask!.claimed_by).toBeNull();
			});
		});

		describe('error handling', () => {
			it('should throw when task does not exist', async () => {
				const { ctx } = await setupTestFixtures();

				await expect(taskController.unclaimTask(ctx, { id: 999999 })).rejects.toThrow();
			});
		});

		describe('tenant isolation', () => {
			it('should not allow unclaiming task from different client', async () => {
				const clientA = await createTestClient(db, { name: 'Client A' });
				const clientB = await createTestClient(db, { name: 'Client B' });
				const userA = await createTestUser(db, { client_id: clientA.id });
				const userB = await createTestUser(db, { client_id: clientB.id });
				const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
				const deskTypeA = await createTestDeskLocationType(db, { client_id: clientA.id, created_by: userA.id });
				const deskLocationA = await createTestDeskLocation(db, {
					client_id: clientA.id,
					desk_location_type_id: deskTypeA.id,
					created_by: userA.id,
				});
				const taskA = await createTestTask(db, {
					client_id: clientA.id,
					claim_id: claimA.id,
					desk_location_id: deskLocationA.id,
					assigned_by: userA.id,
					status: TaskStatus.IN_PROGRESS,
					claimed_by: userA.id,
				});

				const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id });

				await expect(taskController.unclaimTask(ctxB, { id: taskA.id })).rejects.toThrow();
			});
		});
	});

	// =========================================================================
	// completeTask - Completes task with optional notes and logs workflow action
	// =========================================================================

	describe('completeTask', () => {
		describe('basic functionality', () => {
			it('should complete a claimed task', async () => {
				const { client, user, claim, deskLocation, ctx } = await setupTestFixtures();
				const task = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.IN_PROGRESS,
					claimed_by: user.id,
				});

				const result = await taskController.completeTask(ctx, { id: task.id });

				expect(result.id).toBe(task.id);
				expect(result.status).toBe(TaskStatus.COMPLETED);
				expect(result.completed_by).toBe(user.id);
			});

			it('should set completed_at timestamp when completing', async () => {
				const { client, user, claim, deskLocation, ctx } = await setupTestFixtures();
				const task = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.IN_PROGRESS,
					claimed_by: user.id,
				});

				const result = await taskController.completeTask(ctx, { id: task.id });

				expect(result.completed_at).not.toBeNull();
			});

			it('should save completion notes when provided', async () => {
				const { client, user, claim, deskLocation, ctx } = await setupTestFixtures();
				const task = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.IN_PROGRESS,
					claimed_by: user.id,
				});

				const result = await taskController.completeTask(ctx, {
					id: task.id,
					completionNotes: 'Task completed successfully with all requirements met',
				});

				expect(result.completion_notes).toBe('Task completed successfully with all requirements met');
			});

			it('should complete task without notes when not provided', async () => {
				const { client, user, claim, deskLocation, ctx } = await setupTestFixtures();
				const task = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.IN_PROGRESS,
					claimed_by: user.id,
				});

				const result = await taskController.completeTask(ctx, { id: task.id });

				expect(result.status).toBe(TaskStatus.COMPLETED);
			});
		});

		describe('database persistence', () => {
			it('should persist completion to database', async () => {
				const { client, user, claim, deskLocation, ctx } = await setupTestFixtures();
				const task = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.IN_PROGRESS,
					claimed_by: user.id,
				});

				await taskController.completeTask(ctx, { id: task.id, completionNotes: 'Done!' });

				const dbTask = await db
					.selectFrom('task')
					.selectAll()
					.where('id', '=', task.id)
					.executeTakeFirst();

				expect(dbTask!.status).toBe(TaskStatus.COMPLETED);
				expect(dbTask!.completed_by).toBe(user.id);
				expect(dbTask!.completion_notes).toBe('Done!');
			});
		});

		describe('error handling', () => {
			it('should throw when task does not exist', async () => {
				const { ctx } = await setupTestFixtures();

				await expect(taskController.completeTask(ctx, { id: 999999 })).rejects.toThrow();
			});
		});

		describe('tenant isolation', () => {
			it('should not allow completing task from different client', async () => {
				const clientA = await createTestClient(db, { name: 'Client A' });
				const clientB = await createTestClient(db, { name: 'Client B' });
				const userA = await createTestUser(db, { client_id: clientA.id });
				const userB = await createTestUser(db, { client_id: clientB.id });
				const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
				const deskTypeA = await createTestDeskLocationType(db, { client_id: clientA.id, created_by: userA.id });
				const deskLocationA = await createTestDeskLocation(db, {
					client_id: clientA.id,
					desk_location_type_id: deskTypeA.id,
					created_by: userA.id,
				});
				const taskA = await createTestTask(db, {
					client_id: clientA.id,
					claim_id: claimA.id,
					desk_location_id: deskLocationA.id,
					assigned_by: userA.id,
					status: TaskStatus.IN_PROGRESS,
					claimed_by: userA.id,
				});

				const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id });

				await expect(taskController.completeTask(ctxB, { id: taskA.id })).rejects.toThrow();
			});
		});
	});

	// =========================================================================
	// bulkCancelTasks - Cancels multiple tasks with admin logging
	// =========================================================================

	describe('bulkCancelTasks', () => {
		describe('basic functionality', () => {
			it('should cancel multiple tasks', async () => {
				const { client, user, claim, deskLocation, ctx } = await setupTestFixtures();
				const task1 = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.PENDING,
				});
				const task2 = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.IN_PROGRESS,
					claimed_by: user.id,
				});

				const result = await taskController.bulkCancelTasks(ctx, {
					ids: [task1.id, task2.id],
					cancellationReason: 'Claim closed',
				});

				expect(result.cancelledCount).toBe(2);
			});

			it('should return count of cancelled tasks', async () => {
				const { client, user, claim, deskLocation, ctx } = await setupTestFixtures();
				const task1 = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.PENDING,
				});

				const result = await taskController.bulkCancelTasks(ctx, {
					ids: [task1.id],
					cancellationReason: 'Not needed',
				});

				expect(result).toHaveProperty('cancelledCount');
				expect(typeof result.cancelledCount).toBe('number');
			});

			it('should cancel zero tasks when given empty array', async () => {
				const { ctx } = await setupTestFixtures();

				const result = await taskController.bulkCancelTasks(ctx, {
					ids: [],
					cancellationReason: 'Bulk cancel',
				});

				expect(result.cancelledCount).toBe(0);
			});
		});

		describe('database persistence', () => {
			it('should persist cancellation to database for all tasks', async () => {
				const { client, user, claim, deskLocation, ctx } = await setupTestFixtures();
				const task1 = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.PENDING,
				});
				const task2 = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.PENDING,
				});

				await taskController.bulkCancelTasks(ctx, {
					ids: [task1.id, task2.id],
					cancellationReason: 'Duplicate tasks',
				});

				const dbTask1 = await db
					.selectFrom('task')
					.selectAll()
					.where('id', '=', task1.id)
					.executeTakeFirst();
				const dbTask2 = await db
					.selectFrom('task')
					.selectAll()
					.where('id', '=', task2.id)
					.executeTakeFirst();

				// Note: cancellation_reason is logged to admin_action_log, not stored on task record
				expect(dbTask1!.status).toBe(TaskStatus.CANCELLED);
				expect(dbTask2!.status).toBe(TaskStatus.CANCELLED);
			});
		});

		describe('status filtering', () => {
			it('should not cancel already-cancelled tasks', async () => {
				const { client, user, claim, deskLocation, ctx } = await setupTestFixtures();
				const alreadyCancelledTask = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.CANCELLED,
				});
				const pendingTask = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.PENDING,
				});

				const result = await taskController.bulkCancelTasks(ctx, {
					ids: [alreadyCancelledTask.id, pendingTask.id],
					cancellationReason: 'Test',
				});

				// Should only cancel the pending task, not the already-cancelled one
				expect(result.cancelledCount).toBe(1);
			});

			it('should not cancel completed tasks', async () => {
				const { client, user, claim, deskLocation, ctx } = await setupTestFixtures();
				const completedTask = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.COMPLETED,
					completed_by: user.id,
					completed_at: new Date(),
				});
				const pendingTask = await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: deskLocation.id,
					assigned_by: user.id,
					status: TaskStatus.PENDING,
				});

				const result = await taskController.bulkCancelTasks(ctx, {
					ids: [completedTask.id, pendingTask.id],
					cancellationReason: 'Test',
				});

				// Should only cancel the pending task, not the completed one
				expect(result.cancelledCount).toBe(1);

				// Verify completed task status unchanged
				const dbCompletedTask = await db
					.selectFrom('task')
					.selectAll()
					.where('id', '=', completedTask.id)
					.executeTakeFirst();
				expect(dbCompletedTask!.status).toBe(TaskStatus.COMPLETED);
			});
		});

		describe('partial cancellation', () => {
			it('should only cancel tasks from the current client', async () => {
				const clientA = await createTestClient(db, { name: 'Client A' });
				const clientB = await createTestClient(db, { name: 'Client B' });
				const userA = await createTestUser(db, { client_id: clientA.id });
				const userB = await createTestUser(db, { client_id: clientB.id });
				const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
				const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
				const deskTypeA = await createTestDeskLocationType(db, { client_id: clientA.id, created_by: userA.id });
				const deskTypeB = await createTestDeskLocationType(db, { client_id: clientB.id, created_by: userB.id });
				const deskLocationA = await createTestDeskLocation(db, {
					client_id: clientA.id,
					desk_location_type_id: deskTypeA.id,
					created_by: userA.id,
				});
				const deskLocationB = await createTestDeskLocation(db, {
					client_id: clientB.id,
					desk_location_type_id: deskTypeB.id,
					created_by: userB.id,
				});
				const taskA = await createTestTask(db, {
					client_id: clientA.id,
					claim_id: claimA.id,
					desk_location_id: deskLocationA.id,
					assigned_by: userA.id,
					status: TaskStatus.PENDING,
				});
				const taskB = await createTestTask(db, {
					client_id: clientB.id,
					claim_id: claimB.id,
					desk_location_id: deskLocationB.id,
					assigned_by: userB.id,
					status: TaskStatus.PENDING,
				});

				const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id });

				// User A tries to cancel both tasks (including Client B's task)
				const result = await taskController.bulkCancelTasks(ctxA, {
					ids: [taskA.id, taskB.id],
					cancellationReason: 'Cross-client attempt',
				});

				// Should only cancel the task belonging to Client A
				expect(result.cancelledCount).toBe(1);

				// Verify Client A's task is cancelled
				const dbTaskA = await db
					.selectFrom('task')
					.selectAll()
					.where('id', '=', taskA.id)
					.executeTakeFirst();
				expect(dbTaskA!.status).toBe(TaskStatus.CANCELLED);

				// Verify Client B's task is NOT cancelled
				const dbTaskB = await db
					.selectFrom('task')
					.selectAll()
					.where('id', '=', taskB.id)
					.executeTakeFirst();
				expect(dbTaskB!.status).toBe(TaskStatus.PENDING);
			});
		});
	});
});
