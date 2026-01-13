/**
 * Integration tests for deadlineQueries
 *
 * These tests run against a real database to verify:
 * - Multi-tenant data isolation
 * - Deadline CRUD operations
 * - Polymorphic entity linking (task, claim, checklist_claim)
 * - Role-based visibility (Admin sees all, Contributor sees assigned)
 * - Status transitions (pending -> met/missed/cancelled)
 * - Date range filtering
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestDeadline,
	createTestChecklist,
	createTestChecklistClaim,
	createTestDeskLocationType,
	createTestDeskLocation,
	createTestUserDeskLocation,
	createTestTask,
} from '@/__tests__/integration/fixtures';
import {
	createDeadline,
	getDeadline,
	getDeadlinesByEntity,
	getDeadlines,
	syncDeadlineStatus,
	cancelDeadline,
	getDeadlineForLogging,
	getDeadlineForDeletion,
	updateDeadlineStatus,
	deleteDeadline,
} from '../deadlineQueries';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { DeadlineEntityType, DeadlineStatus } from '@/config/enums';

describe('deadlineQueries integration', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	describe('createDeadline', () => {
		it('should create a standalone deadline', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const deadlineDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split('T')[0];

			// Act
			const result = await createDeadline(ctx, {
				claimId: claim.id,
				deadlineType: 'custom',
				deadlineDate,
				description: 'Submit documents by this date',
			});

			// Assert
			expect(result).toBeDefined();
			expect(result.claim_id).toBe(claim.id);
			expect(result.client_id).toBe(client.id);
			expect(result.deadline_type).toBe('custom');
			expect(result.description).toBe('Submit documents by this date');
			expect(result.status).toBe(DeadlineStatus.PENDING);
			expect(result.created_by).toBe(user.id);
			expect(result.entity_type).toBeNull();
			expect(result.entity_id).toBeNull();
		});

		it('should create a deadline linked to a task', async () => {
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
				assigned_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const deadlineDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split('T')[0];

			// Act
			const result = await createDeadline(ctx, {
				claimId: claim.id,
				deadlineType: 'task_due',
				deadlineDate,
				entityType: DeadlineEntityType.TASK,
				entityId: task.id,
			});

			// Assert
			expect(result.entity_type).toBe(DeadlineEntityType.TASK);
			expect(result.entity_id).toBe(task.id);
		});

		it('should create a deadline linked to a claim entity', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const deadlineDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split('T')[0];

			// Act
			const result = await createDeadline(ctx, {
				claimId: claim.id,
				deadlineType: 'claim_due',
				deadlineDate,
				entityType: DeadlineEntityType.CLAIM,
				entityId: claim.id,
			});

			// Assert
			expect(result.entity_type).toBe(DeadlineEntityType.CLAIM);
			expect(result.entity_id).toBe(claim.id);
		});

		it('should set client_id from context session', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const deadlineDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split('T')[0];

			// Act
			const result = await createDeadline(ctx, {
				claimId: claim.id,
				deadlineType: 'regulatory',
				deadlineDate,
			});

			// Assert - client_id comes from session, not params
			expect(result.client_id).toBe(client.id);
			expect(result.created_by).toBe(user.id);
		});
	});

	describe('getDeadline', () => {
		it('should return deadline with claim number', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, claim_number: 'CLM-001' });

			const deadline = await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				description: 'Test deadline',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getDeadline(ctx, deadline.id);

			// Assert
			expect(result).toBeDefined();
			expect(result?.id).toBe(deadline.id);
			expect(result?.description).toBe('Test deadline');
			expect(result?.claim_number).toBe('CLM-001');
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });

			const deadline = await createTestDeadline(db, {
				client_id: client1.id,
				claim_id: claim.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result = await getDeadline(ctx2, deadline.id);

			// Assert - Other client should not see the deadline
			expect(result).toBeUndefined();
		});

		it('should return undefined for non-existent deadline', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getDeadline(ctx, 999999);

			// Assert
			expect(result).toBeUndefined();
		});
	});

	describe('getDeadlinesByEntity', () => {
		it('should return deadlines linked to a specific task', async () => {
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
				assigned_by: user.id,
			});
			const task2 = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_by: user.id,
			});

			// Create deadlines for task1
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task1.id,
				description: 'Task 1 Deadline 1',
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task1.id,
				description: 'Task 1 Deadline 2',
			});

			// Create deadline for task2
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task2.id,
				description: 'Task 2 Deadline',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getDeadlinesByEntity(ctx, DeadlineEntityType.TASK, task1.id);

			// Assert
			expect(result).toHaveLength(2);
			expect(result.every((d) => d.entity_id === task1.id)).toBe(true);
		});

		it('should return claim_number field', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, {
				client_id: client.id,
				claim_number: 'CLM-ENTITY-001',
			});
			const task = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_by: user.id,
			});

			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getDeadlinesByEntity(ctx, DeadlineEntityType.TASK, task.id);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].claim_number).toBe('CLM-ENTITY-001');
		});

		it('should order by deadline date ascending', async () => {
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
				assigned_by: user.id,
			});

			const laterDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
			const earlierDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

			// Create later deadline first
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task.id,
				deadline_date: laterDate,
				description: 'Later Deadline',
			});
			// Create earlier deadline second
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task.id,
				deadline_date: earlierDate,
				description: 'Earlier Deadline',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getDeadlinesByEntity(ctx, DeadlineEntityType.TASK, task.id);

			// Assert - Earlier deadline should come first
			expect(result).toHaveLength(2);
			expect(result[0].description).toBe('Earlier Deadline');
			expect(result[1].description).toBe('Later Deadline');
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
				assigned_by: user1.id,
			});

			await createTestDeadline(db, {
				client_id: client1.id,
				claim_id: claim.id,
				created_by: user1.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result = await getDeadlinesByEntity(ctx2, DeadlineEntityType.TASK, task.id);

			// Assert
			expect(result).toHaveLength(0);
		});
	});

	describe('getDeadlines - Multi-tenant Isolation', () => {
		it('should only return deadlines for the authenticated user client', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client1.id });
			const claim2 = await createTestClaim(db, { client_id: client2.id });

			await createTestDeadline(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				created_by: user1.id,
				description: 'Client 1 Deadline',
			});
			await createTestDeadline(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				created_by: user2.id,
				description: 'Client 2 Deadline',
			});

			const ctx1 = createTestContext(db, { id: user1.id, client_id: client1.id, role: 'Admin' });
			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result1 = await getDeadlines(ctx1, {});
			const result2 = await getDeadlines(ctx2, {});

			// Assert
			expect(result1.rows).toHaveLength(1);
			expect(result2.rows).toHaveLength(1);
			expect(result1.rows[0].description).toBe('Client 1 Deadline');
			expect(result2.rows[0].description).toBe('Client 2 Deadline');
		});
	});

	describe('getDeadlines - Ordering', () => {
		it('should order by deadline_date ascending, then created_at descending', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const today = new Date();
			const tomorrow = new Date(today);
			tomorrow.setDate(today.getDate() + 1);

			// Create deadlines with same date but different created_at (later one first)
			const deadline1 = await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				deadline_date: tomorrow,
				description: 'Tomorrow Deadline - Created First',
			});

			// Small delay to ensure different created_at timestamps
			await new Promise((resolve) => setTimeout(resolve, 10));

			const deadline2 = await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				deadline_date: tomorrow,
				description: 'Tomorrow Deadline - Created Second',
			});

			// Create an earlier deadline
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				deadline_date: today,
				description: 'Today Deadline',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getDeadlines(ctx, {});

			// Assert - Earlier date first, then within same date, newest created_at first
			expect(result.rows.length).toBeGreaterThanOrEqual(3);

			// Find our test deadlines
			const todayDeadline = result.rows.find((d) => d.description === 'Today Deadline');
			const tomorrowFirst = result.rows.find(
				(d) => d.description === 'Tomorrow Deadline - Created First'
			);
			const tomorrowSecond = result.rows.find(
				(d) => d.description === 'Tomorrow Deadline - Created Second'
			);

			const todayIdx = result.rows.indexOf(todayDeadline!);
			const tomorrowFirstIdx = result.rows.indexOf(tomorrowFirst!);
			const tomorrowSecondIdx = result.rows.indexOf(tomorrowSecond!);

			// Today should come before tomorrow
			expect(todayIdx).toBeLessThan(tomorrowFirstIdx);
			expect(todayIdx).toBeLessThan(tomorrowSecondIdx);

			// Within same date, newer created_at (tomorrowSecond) should come first
			expect(tomorrowSecondIdx).toBeLessThan(tomorrowFirstIdx);
		});
	});

	describe('getDeadlines - Filtering', () => {
		it('should filter by claim ID', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client.id });
			const claim2 = await createTestClaim(db, { client_id: client.id });

			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim1.id,
				created_by: user.id,
				description: 'Claim 1 Deadline',
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim2.id,
				created_by: user.id,
				description: 'Claim 2 Deadline',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getDeadlines(ctx, { claimId: claim1.id });

			// Assert
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].description).toBe('Claim 1 Deadline');
		});

		it('should filter by entity type', async () => {
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
				assigned_by: user.id,
			});

			// Task-linked deadline
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task.id,
				description: 'Task Deadline',
			});

			// Claim-linked deadline
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.CLAIM,
				entity_id: claim.id,
				description: 'Claim Deadline',
			});

			// Manual deadline (no entity)
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.MANUAL,
				description: 'Manual Deadline',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const taskDeadlines = await getDeadlines(ctx, { entityType: DeadlineEntityType.TASK });
			const claimDeadlines = await getDeadlines(ctx, { entityType: DeadlineEntityType.CLAIM });

			// Assert
			expect(taskDeadlines.rows).toHaveLength(1);
			expect(taskDeadlines.rows[0].description).toBe('Task Deadline');
			expect(claimDeadlines.rows).toHaveLength(1);
			expect(claimDeadlines.rows[0].description).toBe('Claim Deadline');
		});

		it('should filter by status', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				status: DeadlineStatus.PENDING,
				description: 'Pending Deadline',
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				status: DeadlineStatus.MET,
				description: 'Met Deadline',
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				status: DeadlineStatus.MISSED,
				description: 'Missed Deadline',
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				status: DeadlineStatus.CANCELLED,
				description: 'Cancelled Deadline',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const pendingDeadlines = await getDeadlines(ctx, { status: DeadlineStatus.PENDING });
			const metDeadlines = await getDeadlines(ctx, { status: DeadlineStatus.MET });
			const missedDeadlines = await getDeadlines(ctx, { status: DeadlineStatus.MISSED });

			// Assert
			expect(pendingDeadlines.rows).toHaveLength(1);
			expect(pendingDeadlines.rows[0].description).toBe('Pending Deadline');
			expect(metDeadlines.rows).toHaveLength(1);
			expect(metDeadlines.rows[0].description).toBe('Met Deadline');
			expect(missedDeadlines.rows).toHaveLength(1);
			expect(missedDeadlines.rows[0].description).toBe('Missed Deadline');
		});

		it('should filter by date range', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const today = new Date();
			const thisWeek = new Date(today);
			thisWeek.setDate(today.getDate() + 3);
			const nextWeek = new Date(today);
			nextWeek.setDate(today.getDate() + 10);
			const lastWeek = new Date(today);
			lastWeek.setDate(today.getDate() - 3);

			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				deadline_date: thisWeek,
				description: 'This Week Deadline',
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				deadline_date: nextWeek,
				description: 'Next Week Deadline',
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				deadline_date: lastWeek,
				description: 'Last Week Deadline',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Date range for this week only
			const rangeStart = new Date(today);
			rangeStart.setDate(today.getDate());
			const rangeEnd = new Date(today);
			rangeEnd.setDate(today.getDate() + 7);

			// Act
			const result = await getDeadlines(ctx, {
				dateRange: [rangeStart, rangeEnd],
			});

			// Assert
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].description).toBe('This Week Deadline');
		});

		it('should handle pagination', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			// Create 10 deadlines
			for (let i = 0; i < 10; i++) {
				const date = new Date();
				date.setDate(date.getDate() + i);
				await createTestDeadline(db, {
					client_id: client.id,
					claim_id: claim.id,
					created_by: user.id,
					deadline_date: date,
					description: `Deadline ${i}`,
				});
			}

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const page1 = await getDeadlines(ctx, {}, 3, 0);
			const page2 = await getDeadlines(ctx, {}, 3, 3);

			// Assert
			expect(page1.count).toBe(10);
			expect(page1.rows).toHaveLength(3);
			expect(page2.rows).toHaveLength(3);

			// Verify different deadlines on each page
			const page1Descriptions = page1.rows.map((d) => d.description);
			const page2Descriptions = page2.rows.map((d) => d.description);
			expect(page1Descriptions.some((d) => page2Descriptions.includes(d))).toBe(false);
		});

		it('should support combined filters', async () => {
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
			const task = await createTestTask(db, {
				client_id: client.id,
				claim_id: claim1.id,
				desk_location_id: desk.id,
				assigned_by: user.id,
			});

			const today = new Date();
			const thisWeek = new Date(today);
			thisWeek.setDate(today.getDate() + 3);
			const nextWeek = new Date(today);
			nextWeek.setDate(today.getDate() + 10);

			// Target: claim1, task entity, pending, this week
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim1.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task.id,
				status: DeadlineStatus.PENDING,
				deadline_date: thisWeek,
				description: 'Target Deadline',
			});

			// Wrong claim
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim2.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				status: DeadlineStatus.PENDING,
				deadline_date: thisWeek,
				description: 'Wrong Claim',
			});

			// Wrong entity type
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim1.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.MANUAL,
				status: DeadlineStatus.PENDING,
				deadline_date: thisWeek,
				description: 'Wrong Entity Type',
			});

			// Wrong status
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim1.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task.id,
				status: DeadlineStatus.MET,
				deadline_date: thisWeek,
				description: 'Wrong Status',
			});

			// Wrong date range
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim1.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task.id,
				status: DeadlineStatus.PENDING,
				deadline_date: nextWeek,
				description: 'Wrong Date Range',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const rangeStartDate = new Date(today);
			const rangeEndDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

			// Act - combine all filters
			const result = await getDeadlines(ctx, {
				claimId: claim1.id,
				entityType: DeadlineEntityType.TASK,
				status: DeadlineStatus.PENDING,
				dateRange: [rangeStartDate, rangeEndDate],
			});

			// Assert - only the target deadline should match all filters
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].description).toBe('Target Deadline');
		});
	});

	describe('getDeadlines - Role-based Visibility', () => {
		it('should show all deadlines to Admin users', async () => {
			// Arrange
			const client = await createTestClient(db);
			const admin = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const otherUser = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id, desk_location_id: desk.id });

			// Create deadline not assigned to admin
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: otherUser.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: otherUser.id,
				assignee: otherUser.id,
			});

			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: otherUser.id,
				description: 'Other User Deadline',
			});

			const ctx = createTestContext(db, { id: admin.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getDeadlines(ctx, {});

			// Assert - Admin should see all deadlines
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].description).toBe('Other User Deadline');
		});

		it('should filter deadlines for Contributor users based on assignments', async () => {
			// Arrange
			const client = await createTestClient(db);
			const contributor = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const otherContributor = await createTestUser(db, {
				client_id: client.id,
				role: 'Contributor',
			});
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const assignedDesk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Assigned Desk',
			});
			const unassignedDesk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Unassigned Desk',
			});

			// Assign contributor to assignedDesk
			await createTestUserDeskLocation(db, {
				user_id: contributor.id,
				desk_location_id: assignedDesk.id,
			});

			// Create claim at assigned desk
			const assignedClaim = await createTestClaim(db, {
				client_id: client.id,
				desk_location_id: assignedDesk.id,
			});
			// Create claim at unassigned desk
			const unassignedClaim = await createTestClaim(db, {
				client_id: client.id,
				desk_location_id: unassignedDesk.id,
			});

			// Create checklist claim where contributor is assignee
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: contributor.id,
			});
			const assignedChecklistClaim = await createTestClaim(db, { client_id: client.id });
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: assignedChecklistClaim.id,
				created_by: contributor.id,
				assignee: contributor.id,
			});

			// Deadline at assigned desk (should see)
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: assignedClaim.id,
				created_by: otherContributor.id,
				description: 'Assigned Desk Deadline',
			});

			// Deadline at unassigned desk (should NOT see)
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: unassignedClaim.id,
				created_by: otherContributor.id,
				description: 'Unassigned Desk Deadline',
			});

			// Deadline for claim where contributor is checklist assignee (should see)
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: assignedChecklistClaim.id,
				created_by: otherContributor.id,
				description: 'Checklist Assignee Deadline',
			});

			const ctx = createTestContext(db, {
				id: contributor.id,
				client_id: client.id,
				role: 'Contributor',
			});

			// Act
			const result = await getDeadlines(ctx, {});

			// Assert - Contributor should only see deadlines for their assignments
			expect(result.rows.length).toBeGreaterThanOrEqual(2);
			const descriptions = result.rows.map((d) => d.description);
			expect(descriptions).toContain('Assigned Desk Deadline');
			expect(descriptions).toContain('Checklist Assignee Deadline');
			expect(descriptions).not.toContain('Unassigned Desk Deadline');
		});

		it('should allow Contributor to see deadlines via checklist_claim.created_by', async () => {
			// Arrange
			const client = await createTestClient(db);
			const contributor = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const otherUser = await createTestUser(db, { client_id: client.id, role: 'Contributor' });

			// Claim with no desk assignment
			const claim = await createTestClaim(db, { client_id: client.id });

			// Create checklist claim where contributor is CREATOR (not assignee)
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: contributor.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: contributor.id, // Contributor created it
				assignee: otherUser.id, // But someone else is assigned
			});

			// Create deadline on this claim
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: otherUser.id,
				description: 'Created By Visibility Deadline',
			});

			const ctx = createTestContext(db, {
				id: contributor.id,
				client_id: client.id,
				role: 'Contributor',
			});

			// Act
			const result = await getDeadlines(ctx, {});

			// Assert - Contributor should see deadline via checklist_claim.created_by
			const descriptions = result.rows.map((d) => d.description);
			expect(descriptions).toContain('Created By Visibility Deadline');
		});

		it('should allow Admin to use personalOnly filter', async () => {
			// Arrange
			const client = await createTestClient(db);
			const admin = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const otherUser = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const adminDesk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: `Admin Desk ${Date.now()}`,
			});
			const otherDesk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: `Other Desk ${Date.now() + 1}`,
			});

			// Assign admin to adminDesk
			await createTestUserDeskLocation(db, {
				user_id: admin.id,
				desk_location_id: adminDesk.id,
			});

			const adminClaim = await createTestClaim(db, {
				client_id: client.id,
				desk_location_id: adminDesk.id,
			});
			const otherClaim = await createTestClaim(db, {
				client_id: client.id,
				desk_location_id: otherDesk.id,
			});

			// Create checklist claim for the otherClaim so the join works
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: otherUser.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: otherClaim.id,
				created_by: otherUser.id,
			});

			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: adminClaim.id,
				created_by: admin.id,
				description: 'Admin Desk Deadline',
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: otherClaim.id,
				created_by: otherUser.id,
				description: 'Other Desk Deadline',
			});

			const ctx = createTestContext(db, { id: admin.id, client_id: client.id, role: 'Admin' });

			// Act
			const allDeadlines = await getDeadlines(ctx, {});
			const personalDeadlines = await getDeadlines(ctx, { personalOnly: true });

			// Assert
			expect(allDeadlines.rows.length).toBeGreaterThanOrEqual(2);
			expect(personalDeadlines.rows.length).toBeLessThan(allDeadlines.rows.length);
		});
	});

	describe('syncDeadlineStatus', () => {
		it('should update deadline status to met', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const deadline = await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				status: DeadlineStatus.PENDING,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await syncDeadlineStatus(ctx, deadline.id, DeadlineStatus.MET, user.id);

			// Assert
			expect(result.status).toBe(DeadlineStatus.MET);
			expect(result.completed_by).toBe(user.id);
			expect(result.completed_at).toBeDefined();
		});

		it('should update deadline status to missed', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const deadline = await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				status: DeadlineStatus.PENDING,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await syncDeadlineStatus(ctx, deadline.id, DeadlineStatus.MISSED, user.id);

			// Assert
			expect(result.status).toBe(DeadlineStatus.MISSED);
			expect(result.completed_by).toBe(user.id);
		});

		it('should update deadline status to cancelled without completed fields', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const deadline = await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				status: DeadlineStatus.PENDING,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await syncDeadlineStatus(ctx, deadline.id, DeadlineStatus.CANCELLED, user.id);

			// Assert
			expect(result.status).toBe(DeadlineStatus.CANCELLED);
			// completed_by should NOT be set for cancelled status
			expect(result.completed_by).toBeNull();
		});

		it('should update status without completedBy parameter', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const deadline = await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				status: DeadlineStatus.PENDING,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act - call without completedBy parameter
			const result = await syncDeadlineStatus(ctx, deadline.id, DeadlineStatus.MET);

			// Assert - status updated but completed_by not set
			expect(result.status).toBe(DeadlineStatus.MET);
			expect(result.completed_by).toBeNull();
			expect(result.completed_at).toBeNull();
		});

		it('should throw error for non-existent deadline', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act & Assert
			await expect(syncDeadlineStatus(ctx, 999999, DeadlineStatus.MET)).rejects.toThrow(
				'Deadline not found'
			);
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });

			const deadline = await createTestDeadline(db, {
				client_id: client1.id,
				claim_id: claim.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act & Assert - Other client should not be able to update
			await expect(syncDeadlineStatus(ctx2, deadline.id, DeadlineStatus.MET)).rejects.toThrow(
				'Deadline not found'
			);
		});
	});

	describe('cancelDeadline', () => {
		it('should cancel a pending deadline with reason', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const deadline = await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				status: DeadlineStatus.PENDING,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await cancelDeadline(ctx, deadline.id, 'No longer needed');

			// Assert
			expect(result.status).toBe(DeadlineStatus.CANCELLED);
			expect(result.cancelled_by).toBe(user.id);
			expect(result.cancelled_at).toBeDefined();
			expect(result.cancellation_reason).toBe('No longer needed');
		});

		it('should throw error when cancelling already cancelled deadline', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const deadline = await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				status: DeadlineStatus.CANCELLED, // Already cancelled
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act & Assert
			await expect(cancelDeadline(ctx, deadline.id, 'Trying again')).rejects.toThrow(
				'Deadline not found or already cancelled'
			);
		});

		it('should allow cancelling a met deadline', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const deadline = await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				status: DeadlineStatus.MET,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await cancelDeadline(ctx, deadline.id, 'Marked met by mistake');

			// Assert
			expect(result.status).toBe(DeadlineStatus.CANCELLED);
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });

			const deadline = await createTestDeadline(db, {
				client_id: client1.id,
				claim_id: claim.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act & Assert
			await expect(cancelDeadline(ctx2, deadline.id, 'Hacked!')).rejects.toThrow(
				'Deadline not found or already cancelled'
			);
		});
	});

	describe('getDeadlineForLogging / getDeadlineForDeletion', () => {
		it('should return deadline fields needed for logging', async () => {
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
				assigned_by: user.id,
			});

			const deadline = await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				entity_type: DeadlineEntityType.TASK,
				entity_id: task.id,
				description: 'Task deadline',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getDeadlineForLogging(ctx, deadline.id);

			// Assert
			expect(result).toBeDefined();
			expect(result?.id).toBe(deadline.id);
			expect(result?.claim_id).toBe(claim.id);
			expect(result?.entity_type).toBe(DeadlineEntityType.TASK);
			expect(result?.entity_id).toBe(task.id);
			expect(result?.description).toBe('Task deadline');
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });

			const deadline = await createTestDeadline(db, {
				client_id: client1.id,
				claim_id: claim.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result = await getDeadlineForLogging(ctx2, deadline.id);

			// Assert
			expect(result).toBeUndefined();
		});

		it('getDeadlineForDeletion should be alias for getDeadlineForLogging', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const deadline = await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const loggingResult = await getDeadlineForLogging(ctx, deadline.id);
			const deletionResult = await getDeadlineForDeletion(ctx, deadline.id);

			// Assert - Both should return same result
			expect(loggingResult).toEqual(deletionResult);
		});
	});

	describe('updateDeadlineStatus', () => {
		it('should be alias for syncDeadlineStatus', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const deadline = await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				status: DeadlineStatus.PENDING,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await updateDeadlineStatus(ctx, deadline.id, DeadlineStatus.MET);

			// Assert
			expect(result.status).toBe(DeadlineStatus.MET);
		});
	});

	describe('deleteDeadline', () => {
		it('should cancel deadline with default reason', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const deadline = await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				status: DeadlineStatus.PENDING,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await deleteDeadline(ctx, deadline.id);

			// Assert
			expect(result.status).toBe(DeadlineStatus.CANCELLED);
			expect(result.cancellation_reason).toBe('Deleted by user');
		});
	});
});
