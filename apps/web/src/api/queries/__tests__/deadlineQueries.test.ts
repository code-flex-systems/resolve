import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getDeadlines } from '../deadlineQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';

/**
 * Tests for getDeadlines - Role-Based Access Control
 *
 * This function has meaningful authorization logic:
 * 1. Admin/Super Admin bypass personal filtering
 * 2. Contributors always get personal filtering (created_by OR assignee OR desk location)
 * 3. personalOnly flag forces personal filtering even for admins
 */

vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
	},
}));

const createMockContext = (role: string, userId = 'user-123', clientId = 'client-abc'): ProtectedContext =>
	({
		session: {
			user: {
				id: userId,
				clerkId: 'clerk_user_123',
				name: 'Test User',
				email: 'test@example.com',
				phone: null,
				role,
				client_id: clientId,
			},
		},
		db,
	}) as ProtectedContext;

// Helper to create mock query builder with $if tracking
const createMockQueryBuilder = (trackIfCalls = false) => {
	const ifCalls: boolean[] = [];

	const mockBuilder: any = {
		innerJoin: vi.fn().mockReturnThis(),
		leftJoin: vi.fn().mockReturnThis(),
		selectAll: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		offset: vi.fn().mockReturnThis(),
		clearSelect: vi.fn().mockReturnThis(),
		clearOrderBy: vi.fn().mockReturnThis(),
		execute: vi.fn().mockResolvedValue([]),
		executeTakeFirst: vi.fn().mockResolvedValue({ count: '0' }),
		$if: vi.fn((condition: boolean, callback: (qb: any) => any) => {
			if (trackIfCalls) {
				ifCalls.push(condition);
			}
			if (condition) {
				return callback(mockBuilder);
			}
			return mockBuilder;
		}),
		_ifCalls: ifCalls,
	};

	return mockBuilder;
};

describe('getDeadlines', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Role-Based Access Control', () => {
		it('should NOT apply personal filter for Admin role', async () => {
			const mockContext = createMockContext('Admin');
			const mockBuilder = createMockQueryBuilder(true);

			vi.spyOn(db, 'selectFrom').mockReturnValue(mockBuilder);

			await getDeadlines(mockContext, {});

			// First $if call should be the shouldFilterPersonal check
			// For Admin without personalOnly, shouldFilterPersonal = false
			expect(mockBuilder._ifCalls[0]).toBe(false);
		});

		it('should NOT apply personal filter for Super Admin role', async () => {
			const mockContext = createMockContext('Super Admin');
			const mockBuilder = createMockQueryBuilder(true);

			vi.spyOn(db, 'selectFrom').mockReturnValue(mockBuilder);

			await getDeadlines(mockContext, {});

			// shouldFilterPersonal = false for Super Admin
			expect(mockBuilder._ifCalls[0]).toBe(false);
		});

		it('should ALWAYS apply personal filter for Contributor role', async () => {
			const mockContext = createMockContext('Contributor');
			const mockBuilder = createMockQueryBuilder(true);

			vi.spyOn(db, 'selectFrom').mockReturnValue(mockBuilder);

			await getDeadlines(mockContext, {});

			// shouldFilterPersonal = true for Contributors
			expect(mockBuilder._ifCalls[0]).toBe(true);
		});

		it('should apply personal filter when personalOnly flag is true (even for Admin)', async () => {
			const mockContext = createMockContext('Admin');
			const mockBuilder = createMockQueryBuilder(true);

			vi.spyOn(db, 'selectFrom').mockReturnValue(mockBuilder);

			await getDeadlines(mockContext, { personalOnly: true });

			// shouldFilterPersonal = true when personalOnly is explicitly set
			expect(mockBuilder._ifCalls[0]).toBe(true);
		});

		it('should apply personal filter when personalOnly flag is true for Super Admin', async () => {
			const mockContext = createMockContext('Super Admin');
			const mockBuilder = createMockQueryBuilder(true);

			vi.spyOn(db, 'selectFrom').mockReturnValue(mockBuilder);

			await getDeadlines(mockContext, { personalOnly: true });

			// shouldFilterPersonal = true when personalOnly is explicitly set
			expect(mockBuilder._ifCalls[0]).toBe(true);
		});
	});

	describe('Edge Cases', () => {
		it('should handle user role (non-Admin, non-Contributor)', async () => {
			const mockContext = createMockContext('user'); // lowercase
			const mockBuilder = createMockQueryBuilder(true);

			vi.spyOn(db, 'selectFrom').mockReturnValue(mockBuilder);

			await getDeadlines(mockContext, {});

			// 'user' !== 'Admin' && 'user' !== 'Super Admin', so shouldFilterPersonal = true
			expect(mockBuilder._ifCalls[0]).toBe(true);
		});

		it('should return empty results when no deadlines exist', async () => {
			const mockContext = createMockContext('Admin');
			const mockBuilder = createMockQueryBuilder();
			mockBuilder.execute.mockResolvedValue([]);
			mockBuilder.executeTakeFirst.mockResolvedValue({ count: '0' });

			vi.spyOn(db, 'selectFrom').mockReturnValue(mockBuilder);

			const result = await getDeadlines(mockContext, {});

			expect(result.rows).toEqual([]);
			expect(result.count).toBe(0);
		});
	});
});
