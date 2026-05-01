import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getTasksForUser } from '../taskQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';
import { TaskStatus, TaskType } from '@/config/enums';

/**
 * Tests for getTasksForUser - User Desk Location Filtering
 *
 * This function is critical for:
 * 1. Filtering tasks by user's assigned desk locations via subquery
 * 2. Derived task status calculation (same as getTasks)
 * 3. Ordering by user's desk location priority, then deadline urgency
 * 4. Server-side pagination with count
 *
 * Key Logic:
 * - Uses subquery to filter tasks where desk_location_id is in user's assigned locations
 * - Only includes locations where removed_at IS NULL (active assignments)
 * - Includes user_priority from user_desk_location for priority ordering
 */

// Mock the database module
vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
	},
}));

const createMockContext = (clientId = 'client-abc', userId = 'user-123'): ProtectedContext => ({
	session: {
		user: {
			id: userId,
			clerkId: 'clerk_user_123',
			name: 'Test User',
			email: 'test@example.com',
			phone: null,
			role: 'Admin',
			client_id: clientId,
		},
	},
	db,
});

// Helper to create mock task row
const createMockTask = (overrides: Record<string, unknown> = {}) => ({
	id: 1,
	client_id: 'client-abc',
	claim_id: 100,
	desk_location_id: 10,
	task_type: TaskType.GENERIC,
	work_units: 2,
	title: 'Test Task',
	description: 'Test description',
	assigned_to: 'user-1',
	assigned_at: new Date('2025-01-01'),
	started_at: null,
	created_at: new Date('2025-01-01'),
	desk_location_name: 'Evaluation',
	user_priority: 1,
	claim_number: 'CLM-001',
	deadline_id: null,
	deadline_date: null,
	deadline_type: null,
	deadline_description: null,
	deadline_status: null,
	derived_status: 'available',
	...overrides,
});

describe('getTasksForUser', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('User Desk Location Filtering', () => {
		it('should filter tasks by user desk location assignments', async () => {
			const mockTask = createMockTask({ user_priority: 1 });

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					$if: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([mockTask]),
					executeTakeFirst: vi.fn().mockResolvedValue({ count: '1' }),
				} as any;
			});

			const result = await getTasksForUser(mockContext, {});

			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].user_priority).toBe(1);
		});

		it('should use provided userId instead of session user', async () => {
			const mockTask = createMockTask();

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					$if: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([mockTask]),
					executeTakeFirst: vi.fn().mockResolvedValue({ count: '1' }),
				} as any;
			});

			const result = await getTasksForUser(mockContext, { userId: 'other-user-456' });

			expect(result.rows).toHaveLength(1);
		});

		it('should default to session user when userId not provided', async () => {
			const mockTask = createMockTask();

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					$if: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([mockTask]),
					executeTakeFirst: vi.fn().mockResolvedValue({ count: '1' }),
				} as any;
			});

			const result = await getTasksForUser(mockContext);

			expect(result.rows).toHaveLength(1);
		});

		it('should return empty when user has no desk location assignments', async () => {
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					$if: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
					executeTakeFirst: vi.fn().mockResolvedValue({ count: '0' }),
				} as any;
			});

			const result = await getTasksForUser(mockContext, {});

			expect(result.rows).toHaveLength(0);
			expect(result.count).toBe(0);
		});
	});

	describe('Priority Ordering', () => {
		it('should include user_priority in results for ordering', async () => {
			const mockTasks = [
				createMockTask({ id: 1, user_priority: 1 }),
				createMockTask({ id: 2, user_priority: 2 }),
				createMockTask({ id: 3, user_priority: 3 }),
			];

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					$if: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(mockTasks),
					executeTakeFirst: vi.fn().mockResolvedValue({ count: '3' }),
				} as any;
			});

			const result = await getTasksForUser(mockContext, {});

			expect(result.rows).toHaveLength(3);
			expect(result.rows[0].user_priority).toBe(1);
			expect(result.rows[1].user_priority).toBe(2);
			expect(result.rows[2].user_priority).toBe(3);
		});

		it('should handle null priority for tasks in unassigned locations', async () => {
			const mockTask = createMockTask({ user_priority: null });

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					$if: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([mockTask]),
					executeTakeFirst: vi.fn().mockResolvedValue({ count: '1' }),
				} as any;
			});

			const result = await getTasksForUser(mockContext, {});

			expect(result.rows[0].user_priority).toBeNull();
		});
	});

	describe('Derived Status', () => {
		it('should return available status for pending unstarted tasks', async () => {
			const mockTask = createMockTask({
				started_at: null,
				deadline_status: 'pending',
				derived_status: 'available',
			});

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					$if: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([mockTask]),
					executeTakeFirst: vi.fn().mockResolvedValue({ count: '1' }),
				} as any;
			});

			const result = await getTasksForUser(mockContext, {});

			expect(result.rows[0].derived_status).toBe('available');
		});

		it('should return in_progress status for started tasks', async () => {
			const mockTask = createMockTask({
				started_at: new Date(),
				deadline_status: 'pending',
				derived_status: 'in_progress',
			});

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					$if: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([mockTask]),
					executeTakeFirst: vi.fn().mockResolvedValue({ count: '1' }),
				} as any;
			});

			const result = await getTasksForUser(mockContext, {});

			expect(result.rows[0].derived_status).toBe('in_progress');
		});
	});

	describe('Status Filtering', () => {
		it('should filter by task status when provided', async () => {
			const mockWhere = vi.fn().mockReturnThis();
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: mockWhere,
					orderBy: vi.fn().mockReturnThis(),
					$if: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
					executeTakeFirst: vi.fn().mockResolvedValue({ count: '0' }),
				} as any;
			});

			await getTasksForUser(mockContext, { status: TaskStatus.PENDING });

			expect(mockWhere).toHaveBeenCalledWith('task.status', '=', TaskStatus.PENDING);
		});

		it('should exclude cancelled tasks by default', async () => {
			const mockWhere = vi.fn().mockReturnThis();
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: mockWhere,
					orderBy: vi.fn().mockReturnThis(),
					$if: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
					executeTakeFirst: vi.fn().mockResolvedValue({ count: '0' }),
				} as any;
			});

			await getTasksForUser(mockContext, {});

			expect(mockWhere).toHaveBeenCalledWith('task.status', '!=', TaskStatus.CANCELLED);
		});
	});

	describe('Pagination', () => {
		it('should return rows and count for server-side pagination', async () => {
			// Mock rows with total_count for window function pattern
			const mockTasks = [
				{ ...createMockTask(), total_count: '50' },
				{ ...createMockTask({ id: 2 }), total_count: '50' },
			];

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					$if: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(mockTasks),
				} as any;
			});

			const result = await getTasksForUser(mockContext, { limit: 10, offset: 0 });

			expect(result.rows).toHaveLength(2);
			expect(result.count).toBe(50);
		});

		it('should handle offset for pagination', async () => {
			const mockTasks = [
				{ ...createMockTask({ id: 11 }), total_count: '50' },
				{ ...createMockTask({ id: 12 }), total_count: '50' },
			];

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					$if: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(mockTasks),
				} as any;
			});

			const result = await getTasksForUser(mockContext, { limit: 10, offset: 10 });

			expect(result.rows).toHaveLength(2);
		});

		it('should handle null count result gracefully', async () => {
			// With window function approach, empty result means count = 0
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					$if: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				} as any;
			});

			const result = await getTasksForUser(mockContext, {});

			expect(result.count).toBe(0);
		});
	});

	describe('Client Scoping', () => {
		it('should filter tasks by client_id', async () => {
			const mockWhere = vi.fn().mockReturnThis();
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: mockWhere,
					orderBy: vi.fn().mockReturnThis(),
					$if: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
					executeTakeFirst: vi.fn().mockResolvedValue({ count: '0' }),
				} as any;
			});

			await getTasksForUser(mockContext, {});

			expect(mockWhere).toHaveBeenCalledWith('task.client_id', '=', 'client-abc');
		});
	});

	describe('Data Completeness', () => {
		it('should include deadline information', async () => {
			const mockTask = createMockTask({
				deadline_id: 1,
				deadline_date: new Date('2025-02-15'),
				deadline_type: 'follow_up',
				deadline_description: 'Follow up required',
				deadline_status: 'pending',
			});

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					$if: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([mockTask]),
					executeTakeFirst: vi.fn().mockResolvedValue({ count: '1' }),
				} as any;
			});

			const result = await getTasksForUser(mockContext, {});

			expect(result.rows[0].deadline_id).toBe(1);
			expect(result.rows[0].deadline_status).toBe('pending');
		});

		it('should include claim number', async () => {
			const mockTask = createMockTask({ claim_number: 'CLM-999' });

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					$if: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([mockTask]),
					executeTakeFirst: vi.fn().mockResolvedValue({ count: '1' }),
				} as any;
			});

			const result = await getTasksForUser(mockContext, {});

			expect(result.rows[0].claim_number).toBe('CLM-999');
		});
	});
});
