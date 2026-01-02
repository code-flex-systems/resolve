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

// Helper to create mock query builder that tracks .where() calls
const createMockQueryBuilder = () => {
	const whereCalls: any[] = [];

	const mockBuilder: any = {
		innerJoin: vi.fn().mockReturnThis(),
		leftJoin: vi.fn().mockReturnThis(),
		selectAll: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		where: vi.fn((arg: any) => {
			whereCalls.push(arg);
			return mockBuilder;
		}),
		orderBy: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		offset: vi.fn().mockReturnThis(),
		execute: vi.fn().mockResolvedValue([]),
		$if: vi.fn((condition: boolean, callback: (qb: any) => any) => {
			if (condition) {
				return callback(mockBuilder);
			}
			return mockBuilder;
		}),
		_whereCalls: whereCalls,
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
			const mockBuilder = createMockQueryBuilder();

			vi.spyOn(db, 'selectFrom').mockReturnValue(mockBuilder);

			await getDeadlines(mockContext, {});

			// For Admin without personalOnly, only client_id filter is applied (string arg)
			// No EXISTS subquery (function arg) should be present
			const hasExistsCall = mockBuilder._whereCalls.some((arg: any) => typeof arg === 'function');
			expect(hasExistsCall).toBe(false);
		});

		it('should NOT apply personal filter for Super Admin role', async () => {
			const mockContext = createMockContext('Super Admin');
			const mockBuilder = createMockQueryBuilder();

			vi.spyOn(db, 'selectFrom').mockReturnValue(mockBuilder);

			await getDeadlines(mockContext, {});

			// For Super Admin without personalOnly, no EXISTS subquery
			const hasExistsCall = mockBuilder._whereCalls.some((arg: any) => typeof arg === 'function');
			expect(hasExistsCall).toBe(false);
		});

		it('should ALWAYS apply personal filter for Contributor role', async () => {
			const mockContext = createMockContext('Contributor');
			const mockBuilder = createMockQueryBuilder();

			vi.spyOn(db, 'selectFrom').mockReturnValue(mockBuilder);

			await getDeadlines(mockContext, {});

			// For Contributors, EXISTS subquery (function arg) should be applied
			const hasExistsCall = mockBuilder._whereCalls.some((arg: any) => typeof arg === 'function');
			expect(hasExistsCall).toBe(true);
		});

		it('should apply personal filter when personalOnly flag is true (even for Admin)', async () => {
			const mockContext = createMockContext('Admin');
			const mockBuilder = createMockQueryBuilder();

			vi.spyOn(db, 'selectFrom').mockReturnValue(mockBuilder);

			await getDeadlines(mockContext, { personalOnly: true });

			// With personalOnly=true, EXISTS subquery should be applied even for Admin
			const hasExistsCall = mockBuilder._whereCalls.some((arg: any) => typeof arg === 'function');
			expect(hasExistsCall).toBe(true);
		});

		it('should apply personal filter when personalOnly flag is true for Super Admin', async () => {
			const mockContext = createMockContext('Super Admin');
			const mockBuilder = createMockQueryBuilder();

			vi.spyOn(db, 'selectFrom').mockReturnValue(mockBuilder);

			await getDeadlines(mockContext, { personalOnly: true });

			// With personalOnly=true, EXISTS subquery should be applied even for Super Admin
			const hasExistsCall = mockBuilder._whereCalls.some((arg: any) => typeof arg === 'function');
			expect(hasExistsCall).toBe(true);
		});
	});

	describe('Edge Cases', () => {
		it('should handle user role (non-Admin, non-Contributor)', async () => {
			const mockContext = createMockContext('user'); // lowercase
			const mockBuilder = createMockQueryBuilder();

			vi.spyOn(db, 'selectFrom').mockReturnValue(mockBuilder);

			await getDeadlines(mockContext, {});

			// 'user' !== 'Admin' && 'user' !== 'Super Admin', so personal filter applied
			const hasExistsCall = mockBuilder._whereCalls.some((arg: any) => typeof arg === 'function');
			expect(hasExistsCall).toBe(true);
		});

		it('should return empty results when no deadlines exist', async () => {
			const mockContext = createMockContext('Admin');
			const mockBuilder = createMockQueryBuilder();
			mockBuilder.execute.mockResolvedValue([]);

			vi.spyOn(db, 'selectFrom').mockReturnValue(mockBuilder);

			const result = await getDeadlines(mockContext, {});

			expect(result.rows).toEqual([]);
			expect(result.count).toBe(0);
		});
	});
});
