import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getTaskCountsByStatus } from '../taskQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';
import { DerivedTaskStatus, DeadlineStatus } from '@/config/enums';

/**
 * Tests for getTaskCountsByStatus - GROUP BY on Derived Status
 *
 * This function is critical for:
 * 1. Aggregating task counts by derived status for dashboard/summary views
 * 2. Using GROUP BY on a computed CASE expression (derived_status)
 * 3. Filtering out cancelled deadlines
 * 4. Returning structured counts for UI display
 *
 * Derived Status Categories:
 * - available: unclaimed tasks with pending deadline
 * - in_progress: claimed tasks with pending deadline
 * - completed_on_time: completed with met deadline
 * - completed_late: completed with missed deadline
 * - cancelled: cancelled deadline status
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
			authUserId: 'auth-user-123',
			name: 'Test User',
			email: 'test@example.com',
			phone: null,
			role: 'Admin',
			client_id: clientId,
		},
	},
	db,
});

describe('getTaskCountsByStatus', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Count Aggregation', () => {
		it('should return counts for all derived status categories', async () => {
			const mockResults = [
				{ derived_status: DerivedTaskStatus.AVAILABLE, count: '5' },
				{ derived_status: DerivedTaskStatus.IN_PROGRESS, count: '3' },
				{ derived_status: DerivedTaskStatus.COMPLETED_ON_TIME, count: '10' },
				{ derived_status: DerivedTaskStatus.COMPLETED_LATE, count: '2' },
			];

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					groupBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(mockResults),
				} as any;
			});

			const result = await getTaskCountsByStatus(mockContext, 'desk-1');

			expect(result.available).toBe(5);
			expect(result.in_progress).toBe(3);
			expect(result.completed_on_time).toBe(10);
			expect(result.completed_late).toBe(2);
		});

		it('should return 0 for missing status categories', async () => {
			// Only available and in_progress have tasks
			const mockResults = [
				{ derived_status: DerivedTaskStatus.AVAILABLE, count: '5' },
				{ derived_status: DerivedTaskStatus.IN_PROGRESS, count: '3' },
			];

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					groupBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(mockResults),
				} as any;
			});

			const result = await getTaskCountsByStatus(mockContext, 'desk-1');

			expect(result.available).toBe(5);
			expect(result.in_progress).toBe(3);
			expect(result.completed_on_time).toBe(0);
			expect(result.completed_late).toBe(0);
		});

		it('should return all zeros for empty desk location', async () => {
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					groupBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				} as any;
			});

			const result = await getTaskCountsByStatus(mockContext, 'desk-999');

			expect(result.available).toBe(0);
			expect(result.in_progress).toBe(0);
			expect(result.completed_on_time).toBe(0);
			expect(result.completed_late).toBe(0);
		});
	});

	describe('Desk Location Filtering', () => {
		it('should filter by desk_location_id', async () => {
			const mockWhere = vi.fn().mockReturnThis();
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: mockWhere,
					groupBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				} as any;
			});

			await getTaskCountsByStatus(mockContext, 'desk-5');

			expect(mockWhere).toHaveBeenCalledWith('task.desk_location_id', '=', 5);
		});
	});

	describe('Client Scoping', () => {
		it('should filter by client_id', async () => {
			const mockWhere = vi.fn().mockReturnThis();
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: mockWhere,
					groupBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				} as any;
			});

			await getTaskCountsByStatus(mockContext, 'desk-1');

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
					groupBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				} as any;
			});

			await getTaskCountsByStatus(otherContext, 'desk-1');

			expect(mockWhere).toHaveBeenCalledWith('task.client_id', '=', 'client-xyz');
		});
	});

	describe('Large Count Handling', () => {
		it('should handle large counts correctly', async () => {
			const mockResults = [
				{ derived_status: DerivedTaskStatus.AVAILABLE, count: '1000000' },
				{ derived_status: DerivedTaskStatus.COMPLETED_ON_TIME, count: '500000' },
			];

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					groupBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(mockResults),
				} as any;
			});

			const result = await getTaskCountsByStatus(mockContext, 'desk-1');

			expect(result.available).toBe(1000000);
			expect(result.completed_on_time).toBe(500000);
		});

		it('should convert string counts to numbers', async () => {
			const mockResults = [{ derived_status: DerivedTaskStatus.AVAILABLE, count: '42' }];

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					groupBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(mockResults),
				} as any;
			});

			const result = await getTaskCountsByStatus(mockContext, 'desk-1');

			expect(typeof result.available).toBe('number');
			expect(result.available).toBe(42);
		});
	});

	describe('Return Value Structure', () => {
		it('should return object with all four status keys', async () => {
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					groupBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				} as any;
			});

			const result = await getTaskCountsByStatus(mockContext, 'desk-1');

			expect(result).toHaveProperty('available');
			expect(result).toHaveProperty('in_progress');
			expect(result).toHaveProperty('completed_on_time');
			expect(result).toHaveProperty('completed_late');
		});

		it('should not include cancelled in return value', async () => {
			// The function excludes cancelled tasks from counts
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					groupBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				} as any;
			});

			const result = await getTaskCountsByStatus(mockContext, 'desk-1');

			expect(result).not.toHaveProperty('cancelled');
		});
	});

	describe('Edge Cases', () => {
		it('should handle undefined count in result', async () => {
			const mockResults = [{ derived_status: DerivedTaskStatus.AVAILABLE, count: undefined }];

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					groupBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(mockResults),
				} as any;
			});

			const result = await getTaskCountsByStatus(mockContext, 'desk-1');

			expect(result.available).toBe(0);
		});

		it('should handle null count in result', async () => {
			const mockResults = [{ derived_status: DerivedTaskStatus.AVAILABLE, count: null }];

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					groupBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(mockResults),
				} as any;
			});

			const result = await getTaskCountsByStatus(mockContext, 'desk-1');

			expect(result.available).toBe(0);
		});

		it('should handle unknown derived_status gracefully', async () => {
			const mockResults = [
				{ derived_status: 'unknown_status', count: '5' },
				{ derived_status: DerivedTaskStatus.AVAILABLE, count: '3' },
			];

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					groupBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(mockResults),
				} as any;
			});

			const result = await getTaskCountsByStatus(mockContext, 'desk-1');

			// Unknown status is ignored, available is counted
			expect(result.available).toBe(3);
		});
	});

	describe('Real World Scenarios', () => {
		it('should handle typical desk location with mixed statuses', async () => {
			const mockResults = [
				{ derived_status: DerivedTaskStatus.AVAILABLE, count: '15' },
				{ derived_status: DerivedTaskStatus.IN_PROGRESS, count: '8' },
				{ derived_status: DerivedTaskStatus.COMPLETED_ON_TIME, count: '42' },
				{ derived_status: DerivedTaskStatus.COMPLETED_LATE, count: '3' },
			];

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					groupBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(mockResults),
				} as any;
			});

			const result = await getTaskCountsByStatus(mockContext, 'desk-1');

			// Total should be 68 tasks
			const total =
				result.available + result.in_progress + result.completed_on_time + result.completed_late;
			expect(total).toBe(68);
		});

		it('should handle new desk location with only available tasks', async () => {
			const mockResults = [{ derived_status: DerivedTaskStatus.AVAILABLE, count: '10' }];

			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					groupBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(mockResults),
				} as any;
			});

			const result = await getTaskCountsByStatus(mockContext, 'desk-1');

			expect(result.available).toBe(10);
			expect(result.in_progress).toBe(0);
			expect(result.completed_on_time).toBe(0);
			expect(result.completed_late).toBe(0);
		});
	});
});
