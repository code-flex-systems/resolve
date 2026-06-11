import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getUserActivityLogs } from '../activityLogQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';

/**
 * Tests for activityLogQueries - Multi-Source Merge & Sort
 *
 * Note: getCompleteClaimTimeline now uses SQL UNION ALL for merge/sort/limit,
 * so its logic is best tested via integration tests against a real database.
 *
 * getUserActivityLogs still merges in JavaScript, so unit tests remain here.
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
				authUserId: 'auth-user-123',
				name: 'Test User',
				email: 'test@example.com',
				phone: null,
				role: 'admin',
				client_id: clientId,
			},
		},
		db,
	}) as ProtectedContext;

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
