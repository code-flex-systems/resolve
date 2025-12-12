import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getCompleteClaimTimeline, getUserActivityLogs } from '../activityLogQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';

/**
 * Tests for activityLogQueries - Multi-Source Merge & Sort
 *
 * These functions have meaningful transformation logic:
 * 1. getCompleteClaimTimeline: Merges 2 tables, sorts by timestamp, applies limit AFTER merge
 * 2. getUserActivityLogs: Merges 3 tables, sorts by timestamp, applies limit AFTER merge
 */

vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
	},
}));

const createMockContext = (clientId = 'client-abc'): ProtectedContext =>
	({
		session: {
			user: {
				id: 'user-123',
				clerkId: 'clerk_user_123',
				name: 'Test User',
				email: 'test@example.com',
				phone: null,
				role: 'admin',
				client_id: clientId,
			},
		},
		db,
	}) as ProtectedContext;

describe('getCompleteClaimTimeline', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Merge and Sort', () => {
		it('should merge activity logs and response logs sorted by timestamp descending', async () => {
			const mockActivityLogs = [
				{ id: 1, created_at: new Date('2025-01-03T10:00:00Z'), action: 'activity_1' },
				{ id: 2, created_at: new Date('2025-01-01T10:00:00Z'), action: 'activity_2' },
			];

			const mockResponseLogs = [
				{ id: 101, created_at: new Date('2025-01-02T10:00:00Z'), action: 'response_1' },
				{ id: 102, created_at: new Date('2025-01-04T10:00:00Z'), action: 'response_2' },
			];

			let callCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				callCount++;
				return {
					innerJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					limit: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(
						callCount === 1 ? mockActivityLogs : mockResponseLogs
					),
				} as any;
			});

			const result = await getCompleteClaimTimeline(mockContext, 100);

			// Should be sorted by timestamp descending
			expect(result[0].id).toBe(102); // Jan 4 (response)
			expect(result[1].id).toBe(1);   // Jan 3 (activity)
			expect(result[2].id).toBe(101); // Jan 2 (response)
			expect(result[3].id).toBe(2);   // Jan 1 (activity)
		});

		it('should apply limit AFTER merge (not per-table)', async () => {
			// Each table returns 3 items, but limit is 4
			const mockActivityLogs = [
				{ id: 1, created_at: new Date('2025-01-06T10:00:00Z'), action: 'activity_1' },
				{ id: 2, created_at: new Date('2025-01-04T10:00:00Z'), action: 'activity_2' },
				{ id: 3, created_at: new Date('2025-01-02T10:00:00Z'), action: 'activity_3' },
			];

			const mockResponseLogs = [
				{ id: 101, created_at: new Date('2025-01-05T10:00:00Z'), action: 'response_1' },
				{ id: 102, created_at: new Date('2025-01-03T10:00:00Z'), action: 'response_2' },
				{ id: 103, created_at: new Date('2025-01-01T10:00:00Z'), action: 'response_3' },
			];

			let callCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				callCount++;
				return {
					innerJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					limit: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(
						callCount === 1 ? mockActivityLogs : mockResponseLogs
					),
				} as any;
			});

			const result = await getCompleteClaimTimeline(mockContext, 100, { limit: 4 });

			// Should return only 4 items from the merged & sorted set
			expect(result).toHaveLength(4);
			// Top 4 by timestamp: Jan 6, Jan 5, Jan 4, Jan 3
			expect(result[0].id).toBe(1);   // Jan 6 (activity)
			expect(result[1].id).toBe(101); // Jan 5 (response)
			expect(result[2].id).toBe(2);   // Jan 4 (activity)
			expect(result[3].id).toBe(102); // Jan 3 (response)
		});

		it('should handle empty results from both tables', async () => {
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([]),
			} as any);

			const result = await getCompleteClaimTimeline(mockContext, 100);

			expect(result).toEqual([]);
		});

		it('should handle one empty table', async () => {
			const mockActivityLogs = [
				{ id: 1, created_at: new Date('2025-01-01T10:00:00Z'), action: 'activity_1' },
			];

			let callCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				callCount++;
				return {
					innerJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					limit: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(callCount === 1 ? mockActivityLogs : []),
				} as any;
			});

			const result = await getCompleteClaimTimeline(mockContext, 100);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(1);
		});
	});
});

describe('getUserActivityLogs', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Three-Table Merge', () => {
		it('should merge all three tables sorted by timestamp descending', async () => {
			const mockConfigLogs = [
				{ id: 1, created_at: new Date('2025-01-05T10:00:00Z'), action: 'config_1' },
			];

			const mockActivityLogs = [
				{ id: 2, created_at: new Date('2025-01-03T10:00:00Z'), action: 'activity_1' },
			];

			const mockResponseLogs = [
				{ id: 3, created_at: new Date('2025-01-04T10:00:00Z'), action: 'response_1' },
			];

			let callCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				callCount++;
				const results = [mockConfigLogs, mockActivityLogs, mockResponseLogs];
				return {
					selectAll: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(results[callCount - 1] || []),
				} as any;
			});

			const result = await getUserActivityLogs(mockContext, 'user-123');

			// Should be sorted by timestamp descending: Jan 5, Jan 4, Jan 3
			expect(result[0].id).toBe(1); // config (Jan 5)
			expect(result[1].id).toBe(3); // response (Jan 4)
			expect(result[2].id).toBe(2); // activity (Jan 3)
		});

		it('should apply limit AFTER merging all three tables', async () => {
			const mockConfigLogs = [
				{ id: 1, created_at: new Date('2025-01-06T10:00:00Z'), action: 'config_1' },
				{ id: 2, created_at: new Date('2025-01-03T10:00:00Z'), action: 'config_2' },
			];

			const mockActivityLogs = [
				{ id: 3, created_at: new Date('2025-01-05T10:00:00Z'), action: 'activity_1' },
				{ id: 4, created_at: new Date('2025-01-02T10:00:00Z'), action: 'activity_2' },
			];

			const mockResponseLogs = [
				{ id: 5, created_at: new Date('2025-01-04T10:00:00Z'), action: 'response_1' },
				{ id: 6, created_at: new Date('2025-01-01T10:00:00Z'), action: 'response_2' },
			];

			let callCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				callCount++;
				const results = [mockConfigLogs, mockActivityLogs, mockResponseLogs];
				return {
					selectAll: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(results[callCount - 1] || []),
				} as any;
			});

			const result = await getUserActivityLogs(mockContext, 'user-123', { limit: 3 });

			// Should return top 3 by timestamp from merged set
			expect(result).toHaveLength(3);
			expect(result[0].id).toBe(1); // Jan 6 (config)
			expect(result[1].id).toBe(3); // Jan 5 (activity)
			expect(result[2].id).toBe(5); // Jan 4 (response)
		});

		it('should handle all tables empty', async () => {
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				selectAll: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([]),
			} as any);

			const result = await getUserActivityLogs(mockContext, 'user-123');

			expect(result).toEqual([]);
		});

		it('should handle two tables empty', async () => {
			const mockConfigLogs = [
				{ id: 1, created_at: new Date('2025-01-01T10:00:00Z'), action: 'config_1' },
			];

			let callCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				callCount++;
				return {
					selectAll: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue(callCount === 1 ? mockConfigLogs : []),
				} as any;
			});

			const result = await getUserActivityLogs(mockContext, 'user-123');

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(1);
		});
	});
});
