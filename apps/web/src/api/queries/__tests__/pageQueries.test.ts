import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getVisiblePageInstances, getPageInstancesForClaim } from '../pageQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';

/**
 * Tests for Page Queries - Edge Case Handling
 *
 * These tests verify:
 * 1. Empty result handling for getVisiblePageInstances
 * 2. Empty result handling for getPageInstancesForClaim
 *
 * Note: Passthrough tests (mock results, expect same results) were removed.
 * Integration tests will verify the EXISTS subquery logic, CASE expressions,
 * and status calculation with real database.
 */

// Mock the database module
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
				role: 'Admin',
				client_id: clientId,
			},
		},
		db,
	}) as ProtectedContext;

describe('getVisiblePageInstances', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should return empty array when no pages exist', async () => {
		vi.spyOn(db, 'selectFrom').mockImplementation(
			() =>
				({
					select: vi.fn().mockReturnThis(),
					distinct: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				}) as any
		);

		const result = await getVisiblePageInstances(mockContext, 'checklist-10', 'claim-100');

		expect(result).toEqual([]);
	});
});

describe('getPageInstancesForClaim', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should return empty array for checklist with no pages', async () => {
		vi.spyOn(db, 'selectFrom').mockImplementation(
			() =>
				({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				}) as any
		);

		const result = await getPageInstancesForClaim(mockContext, 'checklist-999', 'claim-100');

		expect(result).toEqual([]);
	});
});
