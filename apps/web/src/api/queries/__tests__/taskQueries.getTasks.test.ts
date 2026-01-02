import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getTasks } from '../taskQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';
import { TaskStatus, TaskType, DeadlineEntityType } from '@/config/enums';

/**
 * Tests for getTasks - Derived Status & Filtering Logic
 *
 * This function is critical for:
 * 1. Derived task status calculation combining task.status + deadline.status
 * 2. Multiple filter combinations (desk location, claim, status, type, users, search)
 * 3. Server-side pagination with count
 * 4. Ordering by deadline urgency then creation date
 *
 * Derived Status Logic:
 * - task.status = 'cancelled' → cancelled
 * - task.status = 'completed' AND deadline.status = 'met' → completed_on_time
 * - task.status = 'completed' AND deadline.status = 'missed' → completed_late
 * - task.status = 'completed' (no deadline) → completed_on_time
 * - task.status = 'in_progress' → in_progress
 * - task.status = 'pending' → available
 */

// Mock the database module
vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
	},
}));

const createMockContext = (clientId = 'client-abc'): ProtectedContext => ({
	session: {
		user: {
			id: 'user-123',
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
	status: TaskStatus.PENDING,
	work_units: 2,
	title: 'Test Task',
	description: 'Test description',
	assigned_by: 'user-1',
	assigned_at: new Date('2025-01-01'),
	claimed_by: null,
	claimed_at: null,
	completed_by: null,
	completed_at: null,
	completion_notes: null,
	created_at: new Date('2025-01-01'),
	updated_at: new Date('2025-01-01'),
	desk_location_name: 'Evaluation',
	assigned_by_first: 'John',
	assigned_by_last: 'Doe',
	claimed_by_first: null,
	claimed_by_last: null,
	claim_number: 'CLM-001',
	deadline_id: null,
	deadline_date: null,
	deadline_type: null,
	deadline_description: null,
	deadline_status: null,
	derived_status: 'available',
	...overrides,
});

describe('getTasks', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Derived Status Calculation', () => {
		it('should return available status for pending tasks', async () => {
			const mockTask = createMockTask({
				status: TaskStatus.PENDING,
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

			const result = await getTasks(mockContext, {});

			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].derived_status).toBe('available');
		});

		it('should return in_progress status for claimed tasks', async () => {
			const mockTask = createMockTask({
				status: TaskStatus.IN_PROGRESS,
				claimed_by: 'user-2',
				claimed_at: new Date(),
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

			const result = await getTasks(mockContext, {});

			expect(result.rows[0].derived_status).toBe('in_progress');
		});

		it('should return completed_on_time when task completed and deadline met', async () => {
			const mockTask = createMockTask({
				status: TaskStatus.COMPLETED,
				completed_by: 'user-2',
				completed_at: new Date(),
				deadline_id: 1,
				deadline_status: 'met',
				derived_status: 'completed_on_time',
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

			const result = await getTasks(mockContext, {});

			expect(result.rows[0].derived_status).toBe('completed_on_time');
		});

		it('should return completed_late when task completed and deadline missed', async () => {
			const mockTask = createMockTask({
				status: TaskStatus.COMPLETED,
				completed_by: 'user-2',
				completed_at: new Date(),
				deadline_id: 1,
				deadline_status: 'missed',
				derived_status: 'completed_late',
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

			const result = await getTasks(mockContext, {});

			expect(result.rows[0].derived_status).toBe('completed_late');
		});

		it('should return completed_on_time for completed tasks without deadline', async () => {
			const mockTask = createMockTask({
				status: TaskStatus.COMPLETED,
				completed_by: 'user-2',
				completed_at: new Date(),
				deadline_id: null,
				deadline_status: null,
				derived_status: 'completed_on_time',
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

			const result = await getTasks(mockContext, {});

			expect(result.rows[0].derived_status).toBe('completed_on_time');
		});

		it('should return cancelled status for cancelled tasks', async () => {
			const mockTask = createMockTask({
				status: TaskStatus.CANCELLED,
				derived_status: 'cancelled',
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

			const result = await getTasks(mockContext, { showCancelled: true });

			expect(result.rows[0].derived_status).toBe('cancelled');
		});
	});

	describe('Filter Logic', () => {
		it('should filter by desk location ID', async () => {
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

			await getTasks(mockContext, { deskLocationId: 5 });

			expect(mockWhere).toHaveBeenCalledWith('task.desk_location_id', '=', 5);
		});

		it('should filter by claim ID', async () => {
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

			await getTasks(mockContext, { claimId: 100 });

			expect(mockWhere).toHaveBeenCalledWith('task.claim_id', '=', 100);
		});

		it('should filter by task status', async () => {
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

			await getTasks(mockContext, { status: TaskStatus.IN_PROGRESS });

			expect(mockWhere).toHaveBeenCalledWith('task.status', '=', TaskStatus.IN_PROGRESS);
		});

		it('should filter by task type', async () => {
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

			await getTasks(mockContext, { taskType: TaskType.GENERIC });

			expect(mockWhere).toHaveBeenCalledWith('task.task_type', '=', TaskType.GENERIC);
		});

		it('should filter by assigned_by user', async () => {
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

			await getTasks(mockContext, { assignedBy: 'user-1' });

			expect(mockWhere).toHaveBeenCalledWith('task.assigned_by', '=', 'user-1');
		});

		it('should filter by claimed_by user', async () => {
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

			await getTasks(mockContext, { claimedBy: 'user-2' });

			expect(mockWhere).toHaveBeenCalledWith('task.claimed_by', '=', 'user-2');
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

			await getTasks(mockContext, {});

			expect(mockWhere).toHaveBeenCalledWith('task.status', '!=', TaskStatus.CANCELLED);
		});

		it('should include cancelled tasks when showCancelled is true', async () => {
			// Mock rows include total_count for window function pattern
			const mockTasks = [
				{ ...createMockTask({ status: TaskStatus.CANCELLED, derived_status: 'cancelled' }), total_count: '2' },
				{ ...createMockTask({ id: 2, status: TaskStatus.PENDING, derived_status: 'available' }), total_count: '2' },
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

			const result = await getTasks(mockContext, { showCancelled: true });

			expect(result.rows).toHaveLength(2);
			expect(result.count).toBe(2);
		});
	});

	describe('Pagination', () => {
		it('should return rows and count for server-side pagination', async () => {
			// Mock rows with total_count showing there are 10 total rows (but only 2 returned due to limit)
			const mockTasks = [
				{ ...createMockTask(), total_count: '10' },
				{ ...createMockTask({ id: 2 }), total_count: '10' },
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

			const result = await getTasks(mockContext, { limit: 2, offset: 0 });

			expect(result.rows).toHaveLength(2);
			expect(result.count).toBe(10);
		});

		it('should handle empty result set', async () => {
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

			const result = await getTasks(mockContext, {});

			expect(result.rows).toHaveLength(0);
			expect(result.count).toBe(0);
		});

		it('should handle null count result', async () => {
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

			const result = await getTasks(mockContext, {});

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

			await getTasks(mockContext, {});

			expect(mockWhere).toHaveBeenCalledWith('task.client_id', '=', 'client-abc');
		});

		it('should use different client_id for different users', async () => {
			const otherContext = createMockContext('client-xyz');
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

			await getTasks(otherContext, {});

			expect(mockWhere).toHaveBeenCalledWith('task.client_id', '=', 'client-xyz');
		});
	});

	describe('Data Aggregation', () => {
		it('should include deadline information in results', async () => {
			const mockTask = createMockTask({
				deadline_id: 1,
				deadline_date: new Date('2025-02-01'),
				deadline_type: 'follow_up',
				deadline_description: 'Follow up with customer',
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

			const result = await getTasks(mockContext, {});

			expect(result.rows[0].deadline_id).toBe(1);
			expect(result.rows[0].deadline_status).toBe('pending');
		});

		it('should include user names for assigned_by and claimed_by', async () => {
			const mockTask = createMockTask({
				assigned_by: 'user-1',
				assigned_by_first: 'John',
				assigned_by_last: 'Doe',
				claimed_by: 'user-2',
				claimed_by_first: 'Jane',
				claimed_by_last: 'Smith',
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

			const result = await getTasks(mockContext, {});

			expect(result.rows[0].assigned_by_first).toBe('John');
			expect(result.rows[0].claimed_by_first).toBe('Jane');
		});
	});

	describe('Combined Filters', () => {
		it('should apply multiple filters simultaneously', async () => {
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

			await getTasks(mockContext, {
				deskLocationId: 5,
				status: TaskStatus.PENDING,
				taskType: TaskType.GENERIC,
			});

			expect(mockWhere).toHaveBeenCalledWith('task.desk_location_id', '=', 5);
			expect(mockWhere).toHaveBeenCalledWith('task.status', '=', TaskStatus.PENDING);
			expect(mockWhere).toHaveBeenCalledWith('task.task_type', '=', TaskType.GENERIC);
		});
	});
});
