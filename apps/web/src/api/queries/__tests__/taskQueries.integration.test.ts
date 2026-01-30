/**
 * Integration tests for taskQueries
 *
 * These tests run against a real database to verify:
 * - Multi-tenant data isolation
 * - Task lifecycle operations (create, assign, start, unassign, complete, cancel)
 * - Derived status logic (combining task.status with deadline timing)
 * - Transaction atomicity for task+deadline operations
 * - Desk location visibility and capacity management
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestDeskLocationType,
	createTestDeskLocation,
	createTestUserDeskLocation,
	createTestTask,
	createTestDeadline,
} from '@/__tests__/integration/fixtures';
import {
	getTasks,
	getTask,
	getTasksByClaim,
	getTasksByDeskLocation,
	getTasksForUser,
	createTask,
	assignTask,
	unassignTask,
	startTask,
	updateTask,
	completeTask,
	cancelTask,
	getDeskCapacity,
	getTaskCountsByStatus,
	getTasksByDueDateWeek,
	bulkCancelTasks,
} from '../taskQueries';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import {
	TaskStatus,
	TaskType,
	DeadlineStatus,
	DeadlineEntityType,
	DerivedTaskStatus,
} from '@/config/enums';

describe('taskQueries integration', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// Note: truncateAllTables is called by the global setup before each test file
	// Note: closeTestDb is called by the global setup after all tests

	describe('getTasks - Multi-tenant Isolation', () => {
		it('should only return tasks for the authenticated user client', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });

			const deskType1 = await createTestDeskLocationType(db, { client_id: client1.id });
			const deskType2 = await createTestDeskLocationType(db, { client_id: client2.id });
			const desk1 = await createTestDeskLocation(db, {
				client_id: client1.id,
				desk_location_type_id: deskType1.id,
			});
			const desk2 = await createTestDeskLocation(db, {
				client_id: client2.id,
				desk_location_type_id: deskType2.id,
			});

			const claim1 = await createTestClaim(db, { client_id: client1.id });
			const claim2 = await createTestClaim(db, { client_id: client2.id });

			await createTestTask(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				desk_location_id: desk1.id,
				assigned_to: user1.id,
				title: 'Client 1 Task',
			});
			await createTestTask(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				desk_location_id: desk2.id,
				assigned_to: user2.id,
				title: 'Client 2 Task',
			});

			const ctx1 = createTestContext(db, { id: user1.id, client_id: client1.id, role: 'Admin' });
			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result1 = await getTasks(ctx1, {});
			const result2 = await getTasks(ctx2, {});

			// Assert
			expect(result1.rows).toHaveLength(1);
			expect(result2.rows).toHaveLength(1);
			expect(result1.rows[0].title).toBe('Client 1 Task');
			expect(result2.rows[0].title).toBe('Client 2 Task');
		});

		it('should return correct count per tenant', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });

			const deskType1 = await createTestDeskLocationType(db, { client_id: client1.id });
			const deskType2 = await createTestDeskLocationType(db, { client_id: client2.id });
			const desk1 = await createTestDeskLocation(db, {
				client_id: client1.id,
				desk_location_type_id: deskType1.id,
			});
			const desk2 = await createTestDeskLocation(db, {
				client_id: client2.id,
				desk_location_type_id: deskType2.id,
			});

			const claim1 = await createTestClaim(db, { client_id: client1.id });
			const claim2 = await createTestClaim(db, { client_id: client2.id });

			// 3 tasks for client 1
			for (let i = 0; i < 3; i++) {
				await createTestTask(db, {
					client_id: client1.id,
					claim_id: claim1.id,
					desk_location_id: desk1.id,
					assigned_to: user1.id,
				});
			}
			// 2 tasks for client 2
			for (let i = 0; i < 2; i++) {
				await createTestTask(db, {
					client_id: client2.id,
					claim_id: claim2.id,
					desk_location_id: desk2.id,
					assigned_to: user1.id,
				});
			}

			const ctx = createTestContext(db, { id: user1.id, client_id: client1.id, role: 'Admin' });

			// Act
			const result = await getTasks(ctx, {});

			// Assert
			expect(result.count).toBe(3);
			expect(result.rows).toHaveLength(3);
		});
	});

	describe('getTasks - Filtering', () => {
		it('should filter by desk location', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk1 = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Desk 1',
			});
			const desk2 = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Desk 2',
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk1.id,
				assigned_to: user.id,
				title: 'Desk 1 Task',
			});
			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk2.id,
				assigned_to: user.id,
				title: 'Desk 2 Task',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getTasks(ctx, { deskLocationId: desk1.id });

			// Assert
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].title).toBe('Desk 1 Task');
		});

		it('should filter by claim', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim1 = await createTestClaim(db, { client_id: client.id, insured: 'Claim 1' });
			const claim2 = await createTestClaim(db, { client_id: client.id, insured: 'Claim 2' });

			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim1.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				title: 'Claim 1 Task',
			});
			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim2.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				title: 'Claim 2 Task',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getTasks(ctx, { claimId: claim1.id });

			// Assert
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].title).toBe('Claim 1 Task');
		});

		it('should filter by task status', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.PENDING,
				title: 'Pending Task',
			});
			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.IN_PROGRESS,
				started_at: new Date(),
				title: 'In Progress Task',
			});
			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.COMPLETED,
				completed_at: new Date(),
				title: 'Completed Task',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const pendingTasks = await getTasks(ctx, { status: TaskStatus.PENDING });
			const inProgressTasks = await getTasks(ctx, { status: TaskStatus.IN_PROGRESS });
			const completedTasks = await getTasks(ctx, { status: TaskStatus.COMPLETED, showCancelled: true });

			// Assert
			expect(pendingTasks.rows).toHaveLength(1);
			expect(pendingTasks.rows[0].title).toBe('Pending Task');
			expect(inProgressTasks.rows).toHaveLength(1);
			expect(inProgressTasks.rows[0].title).toBe('In Progress Task');
			expect(completedTasks.rows).toHaveLength(1);
			expect(completedTasks.rows[0].title).toBe('Completed Task');
		});

		it('should filter by task type', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			// Insert directly with task_type
			await db
				.insertInto('task')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: desk.id,
					assigned_to: user.id,
					task_type: TaskType.OUTBOUND_CALL,
					title: 'Call Task',
					status: TaskStatus.PENDING,
				})
				.execute();
			await db
				.insertInto('task')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: desk.id,
					assigned_to: user.id,
					task_type: TaskType.REVIEW,
					title: 'Review Task',
					status: TaskStatus.PENDING,
				})
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const callTasks = await getTasks(ctx, { taskType: TaskType.OUTBOUND_CALL });

			// Assert
			expect(callTasks.rows).toHaveLength(1);
			expect(callTasks.rows[0].title).toBe('Call Task');
		});

		it('should filter by search term', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				title: 'Follow up with insured',
			});
			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				title: 'Review documents',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getTasks(ctx, { searchTerm: 'follow' });

			// Assert
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].title).toBe('Follow up with insured');
		});

		it('should hide cancelled tasks by default', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.PENDING,
				title: 'Active Task',
			});
			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.CANCELLED,
				title: 'Cancelled Task',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const withoutCancelled = await getTasks(ctx, {});
			const withCancelled = await getTasks(ctx, { showCancelled: true });

			// Assert
			expect(withoutCancelled.rows).toHaveLength(1);
			expect(withoutCancelled.rows[0].title).toBe('Active Task');
			expect(withCancelled.rows).toHaveLength(2);
		});

		it('should handle pagination', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			// Create 10 tasks
			for (let i = 0; i < 10; i++) {
				await createTestTask(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: desk.id,
					assigned_to: user.id,
					title: `Task ${String(i).padStart(2, '0')}`,
				});
			}

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const page1 = await getTasks(ctx, { limit: 3, offset: 0 });
			const page2 = await getTasks(ctx, { limit: 3, offset: 3 });

			// Assert
			expect(page1.count).toBe(10);
			expect(page1.rows).toHaveLength(3);
			expect(page2.rows).toHaveLength(3);

			// Verify different tasks on each page
			const page1Titles = page1.rows.map((t) => t.title);
			const page2Titles = page2.rows.map((t) => t.title);
			expect(page1Titles.some((t) => page2Titles.includes(t))).toBe(false);
		});

		it('should filter by assignedTo', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user1.id,
				title: 'User 1 Assigned Task',
			});
			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user2.id,
				title: 'User 2 Assigned Task',
			});

			const ctx = createTestContext(db, { id: user1.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getTasks(ctx, { assignedTo: user1.id });

			// Assert
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].title).toBe('User 1 Assigned Task');
		});

		it('should return user name fields for assigned users', async () => {
			// Arrange
			const client = await createTestClient(db);
			const assigner = await createTestUser(db, {
				client_id: client.id,
				role: 'Admin',
				first: 'John',
				last: 'Assigner',
			});
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: assigner.id,
				status: TaskStatus.IN_PROGRESS,
				started_at: new Date(),
				title: 'Task with users',
			});

			const ctx = createTestContext(db, { id: assigner.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getTasks(ctx, {});

			// Assert
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].assigned_to_first).toBe('John');
			expect(result.rows[0].assigned_to_last).toBe('Assigner');
		});
	});

	describe('getTasks - Derived Status', () => {
		it('should calculate derived status based on task status and deadline', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			// Create pending task (available)
			const pendingTask = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.PENDING,
				title: 'Pending Task',
			});

			// Create in progress task
			const inProgressTask = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.IN_PROGRESS,
				started_at: new Date(),
				title: 'In Progress Task',
			});

			// Create completed task with met deadline
			const completedOnTimeTask = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.COMPLETED,
				completed_at: new Date(),
				title: 'Completed On Time Task',
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: completedOnTimeTask.id,
				status: DeadlineStatus.MET,
			});

			// Create completed task with missed deadline
			const completedLateTask = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.COMPLETED,
				completed_at: new Date(),
				title: 'Completed Late Task',
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: completedLateTask.id,
				status: DeadlineStatus.MISSED,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getTasks(ctx, { showCancelled: true });

			// Assert
			const tasksByTitle = Object.fromEntries(result.rows.map((t) => [t.title, t]));

			expect(tasksByTitle['Pending Task'].derived_status).toBe(DerivedTaskStatus.AVAILABLE);
			expect(tasksByTitle['In Progress Task'].derived_status).toBe(DerivedTaskStatus.IN_PROGRESS);
			expect(tasksByTitle['Completed On Time Task'].derived_status).toBe(
				DerivedTaskStatus.COMPLETED_ON_TIME
			);
			expect(tasksByTitle['Completed Late Task'].derived_status).toBe(
				DerivedTaskStatus.COMPLETED_LATE
			);
		});
	});

	describe('getTask', () => {
		it('should return task with all related data', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Test Desk',
			});
			const claim = await createTestClaim(db, { client_id: client.id, claim_number: 'CLM-001' });

			const task = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				title: 'Test Task',
				description: 'Test description',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getTask(ctx, task.id);

			// Assert
			expect(result).toBeDefined();
			expect(result?.id).toBe(task.id);
			expect(result?.title).toBe('Test Task');
			expect(result?.description).toBe('Test description');
			expect(result?.desk_location_name).toBe('Test Desk');
			expect(result?.claim_number).toBe('CLM-001');
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client1.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client1.id });

			const task = await createTestTask(db, {
				client_id: client1.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result = await getTask(ctx2, task.id);

			// Assert - Other client should not see the task
			expect(result).toBeUndefined();
		});
	});

	describe('getTasksByClaim', () => {
		it('should return all tasks for a specific claim', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim1 = await createTestClaim(db, { client_id: client.id });
			const claim2 = await createTestClaim(db, { client_id: client.id });

			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim1.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				title: 'Claim 1 Task 1',
			});
			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim1.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				title: 'Claim 1 Task 2',
			});
			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim2.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				title: 'Claim 2 Task',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getTasksByClaim(ctx, claim1.id);

			// Assert
			expect(result.rows).toHaveLength(2);
			expect(result.rows.every((t) => t.claim_id === claim1.id)).toBe(true);
		});
	});

	describe('getTasksByDeskLocation', () => {
		it('should return tasks for a specific desk location', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk1 = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Desk 1',
			});
			const desk2 = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Desk 2',
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk1.id,
				assigned_to: user.id,
				title: 'Desk 1 Task',
			});
			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk2.id,
				assigned_to: user.id,
				title: 'Desk 2 Task',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getTasksByDeskLocation(ctx, desk1.id);

			// Assert
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].title).toBe('Desk 1 Task');
		});
	});

	describe('getTasksForUser', () => {
		it('should return tasks at user assigned desk locations', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const otherUser = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk1 = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'User Desk',
			});
			const desk2 = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Other Desk',
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			// Assign user to desk1
			await createTestUserDeskLocation(db, {
				user_id: user.id,
				desk_location_id: desk1.id,
				priority: 1,
			});

			// Tasks at user's desk
			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk1.id,
				assigned_to: otherUser.id,
				title: 'User Desk Task',
			});

			// Tasks at other desk (not assigned to user)
			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk2.id,
				assigned_to: otherUser.id,
				title: 'Other Desk Task',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Contributor' });

			// Act
			const result = await getTasksForUser(ctx);

			// Assert
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].title).toBe('User Desk Task');
			expect(result.rows[0].user_priority).toBe(1);
		});

		it('should exclude tasks from removed desk assignments', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			// Assign user to desk but mark as removed
			await createTestUserDeskLocation(db, {
				user_id: user.id,
				desk_location_id: desk.id,
				removed_at: new Date(),
			});

			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				title: 'Task at removed desk',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Contributor' });

			// Act
			const result = await getTasksForUser(ctx);

			// Assert
			expect(result.rows).toHaveLength(0);
		});

		it('should order by user priority', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const highPriorityDesk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'High Priority Desk',
			});
			const lowPriorityDesk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Low Priority Desk',
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			// Assign user to both desks with different priorities
			await createTestUserDeskLocation(db, {
				user_id: user.id,
				desk_location_id: highPriorityDesk.id,
				priority: 1,
			});
			await createTestUserDeskLocation(db, {
				user_id: user.id,
				desk_location_id: lowPriorityDesk.id,
				priority: 5,
			});

			// Create tasks (low priority first in DB order)
			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: lowPriorityDesk.id,
				assigned_to: user.id,
				title: 'Low Priority Task',
			});
			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: highPriorityDesk.id,
				assigned_to: user.id,
				title: 'High Priority Task',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Contributor' });

			// Act
			const result = await getTasksForUser(ctx);

			// Assert - High priority should come first
			expect(result.rows).toHaveLength(2);
			expect(result.rows[0].title).toBe('High Priority Task');
			expect(result.rows[1].title).toBe('Low Priority Task');
		});

		it('should filter by status', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			await createTestUserDeskLocation(db, {
				user_id: user.id,
				desk_location_id: desk.id,
			});

			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.PENDING,
				title: 'Pending Task',
			});
			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.IN_PROGRESS,
				started_at: new Date(),
				title: 'In Progress Task',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Contributor' });

			// Act
			const result = await getTasksForUser(ctx, { status: TaskStatus.PENDING });

			// Assert
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].title).toBe('Pending Task');
		});

		it('should allow querying for a different user', async () => {
			// Arrange
			const client = await createTestClient(db);
			const admin = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const contributor = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			// Assign contributor to desk (not admin)
			await createTestUserDeskLocation(db, {
				user_id: contributor.id,
				desk_location_id: desk.id,
			});

			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: admin.id,
				title: 'Contributor Desk Task',
			});

			// Admin context but querying contributor's tasks
			const ctx = createTestContext(db, { id: admin.id, client_id: client.id, role: 'Admin' });

			// Act - Query for contributor's tasks
			const result = await getTasksForUser(ctx, { userId: contributor.id });

			// Assert
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].title).toBe('Contributor Desk Task');
		});
	});

	describe('createTask', () => {
		it('should create a task with required fields', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await createTask(ctx, {
				claimId: claim.id,
				deskLocationId: desk.id,
				title: 'New Task',
				description: 'Task description',
			});

			// Assert
			expect(result).toBeDefined();
			expect(result.title).toBe('New Task');
			expect(result.description).toBe('Task description');
			expect(result.status).toBe(TaskStatus.PENDING);
			expect(result.assigned_to).toBe(user.id);
			expect(result.client_id).toBe(client.id);
			expect(result.task_type).toBe(TaskType.GENERIC);
		});

		it('should create task with linked deadline when deadlineDate provided', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const deadlineDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split('T')[0];

			// Act
			const task = await createTask(ctx, {
				claimId: claim.id,
				deskLocationId: desk.id,
				title: 'Task with Deadline',
				deadlineDate,
				deadlineDescription: 'Complete by next week',
			});

			// Verify deadline was created
			const deadline = await db
				.selectFrom('deadline')
				.selectAll()
				.where('entity_type', '=', DeadlineEntityType.TASK)
				.where('entity_id', '=', task.id)
				.executeTakeFirst();

			// Assert
			expect(deadline).toBeDefined();
			expect(deadline?.status).toBe(DeadlineStatus.PENDING);
			expect(deadline?.description).toBe('Complete by next week');
		});

		it('should set custom task type and work units', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await createTask(ctx, {
				claimId: claim.id,
				deskLocationId: desk.id,
				title: 'Review Task',
				taskType: TaskType.REVIEW,
				workUnits: 5,
			});

			// Assert
			expect(result.task_type).toBe(TaskType.REVIEW);
			expect(result.work_units).toBe(5);
		});
	});

	describe('startTask', () => {
		it('should start a pending task', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const task = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.PENDING,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await startTask(ctx, task.id);

			// Assert
			expect(result.status).toBe(TaskStatus.IN_PROGRESS);
			expect(result.started_at).toBeDefined();
		});

		it('should fail to start an already started task', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const task = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user1.id,
				status: TaskStatus.IN_PROGRESS,
				started_at: new Date(), // Already started
			});

			const ctx = createTestContext(db, { id: user2.id, client_id: client.id, role: 'Contributor' });

			// Act & Assert - Should fail because task is already started
			await expect(startTask(ctx, task.id)).rejects.toThrow();
		});

		it('should fail to start a completed task', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const task = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.COMPLETED,
				completed_at: new Date(),
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act & Assert
			await expect(startTask(ctx, task.id)).rejects.toThrow();
		});
	});

	describe('unassignTask', () => {
		it('should unassign a task assigned to a user', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const task = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.PENDING,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await unassignTask(ctx, task.id);

			// Assert
			expect(result.status).toBe(TaskStatus.PENDING);
			expect(result.assigned_to).toBeNull();
		});

		it('should fail to unassign a task from a different client', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client1.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client1.id });

			const task = await createTestTask(db, {
				client_id: client1.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user1.id,
				status: TaskStatus.PENDING,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act & Assert - different client cannot unassign task
			await expect(unassignTask(ctx2, task.id)).rejects.toThrow();
		});
	});

	describe('updateTask', () => {
		it('should update task fields', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const task = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				title: 'Original Title',
				description: 'Original description',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await updateTask(ctx, task.id, {
				title: 'Updated Title',
				description: 'Updated description',
				workUnits: 5,
			});

			// Assert
			expect(result.title).toBe('Updated Title');
			expect(result.description).toBe('Updated description');
			expect(result.work_units).toBe(5);
		});

		it('should update linked deadline date', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const task = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
			});

			// Create linked deadline
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task.id,
				status: DeadlineStatus.PENDING,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const newDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

			// Act
			await updateTask(ctx, task.id, { dueDate: newDueDate });

			// Assert - Verify deadline was updated
			const deadline = await db
				.selectFrom('deadline')
				.select(['deadline_date'])
				.where('entity_type', '=', DeadlineEntityType.TASK)
				.where('entity_id', '=', task.id)
				.executeTakeFirst();

			expect(deadline).toBeDefined();
			const actualDate = new Date(deadline!.deadline_date!).toISOString().split('T')[0];
			expect(actualDate).toBe(newDueDate);
		});

		it('should cancel linked deadline when dueDate set to null', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const task = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
			});

			// Create linked deadline
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task.id,
				status: DeadlineStatus.PENDING,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			await updateTask(ctx, task.id, { dueDate: null });

			// Assert - Verify deadline was cancelled
			const deadline = await db
				.selectFrom('deadline')
				.select(['status'])
				.where('entity_type', '=', DeadlineEntityType.TASK)
				.where('entity_id', '=', task.id)
				.executeTakeFirst();

			expect(deadline?.status).toBe(DeadlineStatus.CANCELLED);
		});

		it('should update desk location', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk1 = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Original Desk',
			});
			const desk2 = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'New Desk',
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const task = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk1.id,
				assigned_to: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await updateTask(ctx, task.id, { deskLocationId: desk2.id });

			// Assert
			expect(result.desk_location_id).toBe(desk2.id);
		});

		it('should enforce tenant isolation on updates', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client1.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client1.id });

			const task = await createTestTask(db, {
				client_id: client1.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user1.id,
				title: 'Original Title',
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act & Assert - Should fail because task belongs to different client
			await expect(updateTask(ctx2, task.id, { title: 'Hacked!' })).rejects.toThrow();
		});
	});

	describe('completeTask', () => {
		it('should complete a task and update linked deadline to met', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const task = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.IN_PROGRESS,
				started_at: new Date(),
			});

			// Create deadline that's due in the future (will be met)
			const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task.id,
				status: DeadlineStatus.PENDING,
				deadline_date: futureDate,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await completeTask(ctx, task.id, 'Task completed successfully');

			// Assert - Task should be completed
			expect(result.status).toBe(TaskStatus.COMPLETED);
			expect(result.completed_at).toBeDefined();
			expect(result.completion_notes).toBe('Task completed successfully');

			// Assert - Deadline should be met
			const deadline = await db
				.selectFrom('deadline')
				.select(['status'])
				.where('entity_type', '=', DeadlineEntityType.TASK)
				.where('entity_id', '=', task.id)
				.executeTakeFirst();

			expect(deadline?.status).toBe(DeadlineStatus.MET);
		});

		it('should mark deadline as missed when completed after due date', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const task = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.IN_PROGRESS,
				started_at: new Date(),
			});

			// Create deadline that's in the past (will be missed)
			const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task.id,
				status: DeadlineStatus.PENDING,
				deadline_date: pastDate,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			await completeTask(ctx, task.id);

			// Assert - Deadline should be missed
			const deadline = await db
				.selectFrom('deadline')
				.select(['status'])
				.where('entity_type', '=', DeadlineEntityType.TASK)
				.where('entity_id', '=', task.id)
				.executeTakeFirst();

			expect(deadline?.status).toBe(DeadlineStatus.MISSED);
		});

		it('should fail to complete an already completed task', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const task = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.COMPLETED,
				completed_at: new Date(),
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act & Assert
			await expect(completeTask(ctx, task.id)).rejects.toThrow();
		});

		it('should fail to complete a cancelled task', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const task = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.CANCELLED,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act & Assert
			await expect(completeTask(ctx, task.id)).rejects.toThrow();
		});
	});

	describe('cancelTask', () => {
		it('should cancel a task and its linked deadline', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const task = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.PENDING,
			});

			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task.id,
				status: DeadlineStatus.PENDING,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await cancelTask(ctx, task.id, 'No longer needed');

			// Assert - Task should be cancelled
			expect(result.status).toBe(TaskStatus.CANCELLED);

			// Assert - Deadline should be cancelled
			const deadline = await db
				.selectFrom('deadline')
				.select(['status', 'cancellation_reason'])
				.where('entity_type', '=', DeadlineEntityType.TASK)
				.where('entity_id', '=', task.id)
				.executeTakeFirst();

			expect(deadline?.status).toBe(DeadlineStatus.CANCELLED);
			expect(deadline?.cancellation_reason).toBe('No longer needed');
		});

		it('should fail to cancel an already cancelled task', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const task = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.CANCELLED,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act & Assert
			await expect(cancelTask(ctx, task.id, 'Trying again')).rejects.toThrow();
		});

		it('should fail to cancel a completed task', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const task = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.COMPLETED,
				completed_at: new Date(),
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act & Assert
			await expect(cancelTask(ctx, task.id, 'Trying to cancel')).rejects.toThrow();
		});
	});

	describe('getDeskCapacity', () => {
		it('should return desk capacity information', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Test Desk',
				daily_work_units: 10,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			// Create task with default work_units (2)
			await db
				.insertInto('task')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: desk.id,
					assigned_to: user.id,
					title: 'Task 1',
					status: TaskStatus.PENDING,
					work_units: 3,
				})
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getDeskCapacity(ctx, desk.id);

			// Assert
			expect(result.deskLocationId).toBe(desk.id);
			expect(result.deskLocationName).toBe('Test Desk');
			expect(result.dailyWorkUnitsLimit).toBe(10);
			expect(result.usedWorkUnits).toBe(3);
			expect(result.isAtCapacity).toBe(false);
		});

		it('should calculate usage from active tasks only', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Capacity Desk',
				daily_work_units: 10,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const targetDate = new Date().toISOString().split('T')[0];
			const assignedAt = new Date(`${targetDate}T10:00:00Z`);

			const pendingTask = await db
				.insertInto('task')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: desk.id,
					assigned_to: user.id,
					title: 'Pending task',
					status: TaskStatus.PENDING,
					work_units: 4,
					assigned_at: assignedAt,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			const inProgressTask = await db
				.insertInto('task')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: desk.id,
					assigned_to: user.id,
					title: 'In progress task',
					status: TaskStatus.IN_PROGRESS,
					work_units: 2,
					assigned_at: assignedAt,
					started_at: assignedAt,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			await db
				.insertInto('task')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: desk.id,
					assigned_to: user.id,
					title: 'Completed task',
					status: TaskStatus.COMPLETED,
					work_units: 5,
					completed_at: new Date(),
					assigned_at: assignedAt,
				})
				.execute();

			const cancelledDeadlineTask = await db
				.insertInto('task')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: desk.id,
					assigned_to: user.id,
					title: 'Cancelled deadline task',
					status: TaskStatus.PENDING,
					work_units: 6,
					assigned_at: assignedAt,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			const previousDay = new Date(assignedAt);
			previousDay.setDate(previousDay.getDate() - 1);
			await db
				.insertInto('task')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: desk.id,
					assigned_to: user.id,
					title: 'Previous day task',
					status: TaskStatus.PENDING,
					work_units: 8,
					assigned_at: previousDay,
				})
				.execute();

			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: pendingTask.id,
				status: DeadlineStatus.PENDING,
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: inProgressTask.id,
				status: DeadlineStatus.PENDING,
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: cancelledDeadlineTask.id,
				status: DeadlineStatus.CANCELLED,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getDeskCapacity(ctx, desk.id, targetDate);

			// Assert
			expect(result.usedWorkUnits).toBe(6);
			expect(result.dailyWorkUnitsLimit).toBe(10);
			expect(result.isAtCapacity).toBe(false);
		});

		it('should report at capacity when limit reached', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Test Desk',
				daily_work_units: 5, // Low capacity
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			// Create tasks that fill capacity
			await db
				.insertInto('task')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: desk.id,
					assigned_to: user.id,
					title: 'Task 1',
					status: TaskStatus.PENDING,
					work_units: 5,
				})
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getDeskCapacity(ctx, desk.id);

			// Assert
			expect(result.isAtCapacity).toBe(true);
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client1.id,
				desk_location_type_id: deskType.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act & Assert
			await expect(getDeskCapacity(ctx2, desk.id)).rejects.toThrow('Desk location not found');
		});

		it('should filter by specific date', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Test Desk',
				daily_work_units: 10,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			// Create task assigned today
			const today = new Date().toISOString().split('T')[0];
			await db
				.insertInto('task')
				.values({
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: desk.id,
					assigned_to: user.id,
					title: 'Today Task',
					status: TaskStatus.PENDING,
					work_units: 3,
				})
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act - Query for today
			const todayResult = await getDeskCapacity(ctx, desk.id, today);

			// Act - Query for yesterday (should be empty)
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const yesterdayResult = await getDeskCapacity(ctx, desk.id, yesterday.toISOString().split('T')[0]);

			// Assert
			expect(todayResult.usedWorkUnits).toBe(3);
			expect(todayResult.date).toBe(today);
			expect(yesterdayResult.usedWorkUnits).toBe(0);
		});
	});

	describe('getTaskCountsByStatus', () => {
		it('should return counts by derived status', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			// Create tasks in different states
			// 2 available (pending, not claimed)
			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.PENDING,
			});
			await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.PENDING,
			});

			// 1 in progress
			const inProgressTask = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.IN_PROGRESS,
				started_at: new Date(),
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: inProgressTask.id,
				status: DeadlineStatus.PENDING,
			});

			// 1 completed on time
			const completedOnTimeTask = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.COMPLETED,
				completed_at: new Date(),
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: completedOnTimeTask.id,
				status: DeadlineStatus.MET,
			});

			// 1 completed late
			const completedLateTask = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.COMPLETED,
				completed_at: new Date(),
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: completedLateTask.id,
				status: DeadlineStatus.MISSED,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getTaskCountsByStatus(ctx, desk.id);

			// Assert
			expect(result.available).toBe(2);
			expect(result.in_progress).toBe(1);
			expect(result.completed_on_time).toBe(1);
			expect(result.completed_late).toBe(1);
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType1 = await createTestDeskLocationType(db, { client_id: client1.id });
			const deskType2 = await createTestDeskLocationType(db, { client_id: client2.id });
			const desk1 = await createTestDeskLocation(db, {
				client_id: client1.id,
				desk_location_type_id: deskType1.id,
			});
			const desk2 = await createTestDeskLocation(db, {
				client_id: client2.id,
				desk_location_type_id: deskType2.id,
			});
			const claim1 = await createTestClaim(db, { client_id: client1.id });
			const claim2 = await createTestClaim(db, { client_id: client2.id });

			// Create 3 tasks for client1
			for (let i = 0; i < 3; i++) {
				await createTestTask(db, {
					client_id: client1.id,
					claim_id: claim1.id,
					desk_location_id: desk1.id,
					assigned_to: user1.id,
					status: TaskStatus.PENDING,
				});
			}

			// Create 1 task for client2
			await createTestTask(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				desk_location_id: desk2.id,
				assigned_to: user2.id,
				status: TaskStatus.PENDING,
			});

			const ctx1 = createTestContext(db, { id: user1.id, client_id: client1.id, role: 'Admin' });

			// Act - Query as client1 for desk1
			const result = await getTaskCountsByStatus(ctx1, desk1.id);

			// Assert - Should only count client1's tasks
			expect(result.available).toBe(3);
		});
	});

	describe('getTasksByDueDateWeek', () => {
		it('should return tasks with deadlines in the date range', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			// Calculate date range (this week)
			const today = new Date();
			const weekStart = new Date(today);
			weekStart.setDate(today.getDate() - today.getDay()); // Sunday
			const weekEnd = new Date(weekStart);
			weekEnd.setDate(weekStart.getDate() + 6); // Saturday

			// Task in range
			const taskInRange = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				title: 'Task in range',
			});
			const midWeek = new Date(weekStart);
			midWeek.setDate(weekStart.getDate() + 3);
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: taskInRange.id,
				deadline_date: midWeek,
				status: DeadlineStatus.PENDING,
			});

			// Task outside range (next week)
			const taskOutsideRange = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				title: 'Task outside range',
			});
			const nextWeek = new Date(weekEnd);
			nextWeek.setDate(weekEnd.getDate() + 7);
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: taskOutsideRange.id,
				deadline_date: nextWeek,
				status: DeadlineStatus.PENDING,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getTasksByDueDateWeek(ctx, {
				weekStart: weekStart.toISOString().split('T')[0],
				weekEnd: weekEnd.toISOString().split('T')[0],
			});

			// Assert
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].title).toBe('Task in range');
		});

		it('should include tasks at week boundaries and keep deadline order', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const today = new Date();
			const weekStart = new Date(today);
			weekStart.setDate(today.getDate() - today.getDay());
			const weekEnd = new Date(weekStart);
			weekEnd.setDate(weekStart.getDate() + 6);

			const startTask = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				title: 'Week start task',
			});
			const midTask = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				title: 'Midweek task',
			});
			const endTask = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				title: 'Week end task',
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: startTask.id,
				deadline_date: weekStart,
				status: DeadlineStatus.PENDING,
			});
			const midWeek = new Date(weekStart);
			midWeek.setDate(weekStart.getDate() + 3);
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: midTask.id,
				deadline_date: midWeek,
				status: DeadlineStatus.PENDING,
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: endTask.id,
				deadline_date: weekEnd,
				status: DeadlineStatus.PENDING,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getTasksByDueDateWeek(ctx, {
				weekStart: weekStart.toISOString().split('T')[0],
				weekEnd: weekEnd.toISOString().split('T')[0],
			});

			// Assert
			expect(result.rows).toHaveLength(3);
			expect(result.rows.map((row) => row.title)).toEqual([
				'Week start task',
				'Midweek task',
				'Week end task',
			]);
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType1 = await createTestDeskLocationType(db, { client_id: client1.id });
			const deskType2 = await createTestDeskLocationType(db, { client_id: client2.id });
			const desk1 = await createTestDeskLocation(db, {
				client_id: client1.id,
				desk_location_type_id: deskType1.id,
			});
			const desk2 = await createTestDeskLocation(db, {
				client_id: client2.id,
				desk_location_type_id: deskType2.id,
			});
			const claim1 = await createTestClaim(db, { client_id: client1.id });
			const claim2 = await createTestClaim(db, { client_id: client2.id });

			// Calculate date range (this week)
			const today = new Date();
			const weekStart = new Date(today);
			weekStart.setDate(today.getDate() - today.getDay());
			const weekEnd = new Date(weekStart);
			weekEnd.setDate(weekStart.getDate() + 6);
			const midWeek = new Date(weekStart);
			midWeek.setDate(weekStart.getDate() + 3);

			// Create task for client1
			const task1 = await createTestTask(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				desk_location_id: desk1.id,
				assigned_to: user1.id,
				title: 'Client 1 Task',
			});
			await createTestDeadline(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				created_by: user1.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task1.id,
				deadline_date: midWeek,
				status: DeadlineStatus.PENDING,
			});

			// Create task for client2
			const task2 = await createTestTask(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				desk_location_id: desk2.id,
				assigned_to: user2.id,
				title: 'Client 2 Task',
			});
			await createTestDeadline(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				created_by: user2.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task2.id,
				deadline_date: midWeek,
				status: DeadlineStatus.PENDING,
			});

			const ctx1 = createTestContext(db, { id: user1.id, client_id: client1.id, role: 'Admin' });
			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result1 = await getTasksByDueDateWeek(ctx1, {
				weekStart: weekStart.toISOString().split('T')[0],
				weekEnd: weekEnd.toISOString().split('T')[0],
			});
			const result2 = await getTasksByDueDateWeek(ctx2, {
				weekStart: weekStart.toISOString().split('T')[0],
				weekEnd: weekEnd.toISOString().split('T')[0],
			});

			// Assert
			expect(result1.rows).toHaveLength(1);
			expect(result1.rows[0].title).toBe('Client 1 Task');
			expect(result2.rows).toHaveLength(1);
			expect(result2.rows[0].title).toBe('Client 2 Task');
		});
	});

	describe('bulkCancelTasks', () => {
		it('should cancel multiple tasks and their deadlines', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const task1 = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.PENDING,
			});
			const task2 = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.IN_PROGRESS,
				started_at: new Date(),
			});

			// Add deadlines
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task1.id,
				status: DeadlineStatus.PENDING,
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task2.id,
				status: DeadlineStatus.PENDING,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const beforeCancel = new Date();

			// Act
			const result = await bulkCancelTasks(ctx, {
				ids: [task1.id, task2.id],
				cancellationReason: 'Bulk cancellation',
			});

			// Assert
			expect(result.cancelledCount).toBe(2);

			// Verify tasks are cancelled
			const tasks = await db
				.selectFrom('task')
				.select(['status', 'updated_at'])
				.where('id', 'in', [task1.id, task2.id])
				.execute();
			expect(tasks.every((t) => t.status === TaskStatus.CANCELLED)).toBe(true);
			expect(
				tasks.every(
					(t) => t.updated_at && new Date(t.updated_at).getTime() >= beforeCancel.getTime()
				)
			).toBe(true);

			// Verify deadlines are cancelled
			const deadlines = await db
				.selectFrom('deadline')
				.select(['status', 'cancellation_reason', 'cancelled_at', 'cancelled_by'])
				.where('entity_type', '=', DeadlineEntityType.TASK)
				.where('entity_id', 'in', [task1.id, task2.id])
				.execute();
			expect(deadlines.every((d) => d.status === DeadlineStatus.CANCELLED)).toBe(true);
			expect(deadlines.every((d) => d.cancellation_reason === 'Bulk cancellation')).toBe(true);
			expect(
				deadlines.every(
					(d) => d.cancelled_at && new Date(d.cancelled_at).getTime() >= beforeCancel.getTime()
				)
			).toBe(true);
			expect(deadlines.every((d) => d.cancelled_by === user.id)).toBe(true);
		});

		it('should skip already cancelled tasks', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const activeTask = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.PENDING,
			});
			const cancelledTask = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.CANCELLED, // Already cancelled
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await bulkCancelTasks(ctx, {
				ids: [activeTask.id, cancelledTask.id],
				cancellationReason: 'Bulk cancellation',
			});

			// Assert - Only active task should be counted
			expect(result.cancelledCount).toBe(1);
		});

		it('should skip completed tasks', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const activeTask = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.PENDING,
			});
			const completedTask = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.COMPLETED,
				completed_at: new Date(),
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await bulkCancelTasks(ctx, {
				ids: [activeTask.id, completedTask.id],
				cancellationReason: 'Bulk cancellation',
			});

			// Assert - Only active task should be cancelled
			expect(result.cancelledCount).toBe(1);

			// Verify completed task is unchanged
			const unchangedTask = await db
				.selectFrom('task')
				.select(['status'])
				.where('id', '=', completedTask.id)
				.executeTakeFirst();
			expect(unchangedTask?.status).toBe(TaskStatus.COMPLETED);
		});

		it('should return 0 for empty ids array', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await bulkCancelTasks(ctx, {
				ids: [],
				cancellationReason: 'Empty test',
			});

			// Assert
			expect(result.cancelledCount).toBe(0);
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client1.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client1.id });

			const task = await createTestTask(db, {
				client_id: client1.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user1.id,
				status: TaskStatus.PENDING,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result = await bulkCancelTasks(ctx2, {
				ids: [task.id],
				cancellationReason: 'Cross-tenant attempt',
			});

			// Assert - Should not cancel task from different client
			expect(result.cancelledCount).toBe(0);

			// Verify task is unchanged
			const unchangedTask = await db
				.selectFrom('task')
				.select(['status'])
				.where('id', '=', task.id)
				.executeTakeFirst();
			expect(unchangedTask?.status).toBe(TaskStatus.PENDING);
		});
	});
});
