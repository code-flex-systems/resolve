import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { listMyClaims } from '../claimQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';

/**
 * Tests for listMyClaims - Metrics Transformation Logic
 *
 * These tests verify the actual data transformation logic:
 * 1. Rounding avgDaysInQueue to 1 decimal place
 * 2. Handling null/missing metrics gracefully (defaulting to 0)
 *
 * Note: Filter, pagination, sorting, and query construction tests were removed
 * as they only verified mock assertions without testing real logic.
 * Integration tests will cover the full query behavior.
 */

// Mock the database
vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
	},
}));

const createMockContext = (userId = 'user-123', clientId = 'client-abc'): ProtectedContext =>
	({
		session: {
			user: {
				id: userId,
				clerkId: 'clerk_user_123',
				name: 'Test User',
				email: 'test@example.com',
				phone: null,
				role: 'contributor',
				client_id: clientId,
			},
		},
		db,
	}) as ProtectedContext;

describe('listMyClaims - Metrics Transformation', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should round avgDaysInQueue to 1 decimal place', async () => {
		// Mock for the metrics query
		const mockMetricsQuery = {
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			executeTakeFirst: vi.fn().mockResolvedValue({
				count: '10',
				total_value: '500000',
				avg_days_in_queue: '7.3456789',
			}),
		};

		// Mock for the data query
		const mockDataQuery = {
			selectAll: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			offset: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue([]),
		};

		// Mock for the base query (CTE)
		const mockBaseQuery = {
			innerJoin: vi.fn().mockReturnThis(),
			leftJoin: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			as: vi.fn().mockReturnValue('ranked_claims_cte'), // Returns CTE alias
		};

		// Mock selectFrom to return different mocks based on call order
		let selectFromCallCount = 0;
		vi.spyOn(db, 'selectFrom').mockImplementation(() => {
			selectFromCallCount++;
			if (selectFromCallCount === 1) {
				return mockBaseQuery as any;
			} else if (selectFromCallCount === 2) {
				return mockMetricsQuery as any;
			} else {
				return mockDataQuery as any;
			}
		});

		const result = await listMyClaims(mockContext, {});

		expect(result.metrics.avgDaysInQueue).toBe(7.3);
	});

	it('should handle null/missing metrics gracefully', async () => {
		// Mock for the metrics query
		const mockMetricsQuery = {
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			executeTakeFirst: vi.fn().mockResolvedValue({
				count: null,
				total_value: null,
				avg_days_in_queue: null,
			}),
		};

		// Mock for the data query
		const mockDataQuery = {
			selectAll: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			offset: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue([]),
		};

		// Mock for the base query (CTE)
		const mockBaseQuery = {
			innerJoin: vi.fn().mockReturnThis(),
			leftJoin: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			as: vi.fn().mockReturnValue('ranked_claims_cte'), // Returns CTE alias
		};

		// Mock selectFrom to return different mocks based on call order
		let selectFromCallCount = 0;
		vi.spyOn(db, 'selectFrom').mockImplementation(() => {
			selectFromCallCount++;
			if (selectFromCallCount === 1) {
				return mockBaseQuery as any;
			} else if (selectFromCallCount === 2) {
				return mockMetricsQuery as any;
			} else {
				return mockDataQuery as any;
			}
		});

		const result = await listMyClaims(mockContext, {});

		expect(result.count).toBe(0);
		expect(result.metrics.totalValue).toBe(0);
		expect(result.metrics.avgDaysInQueue).toBe(0);
	});
});
