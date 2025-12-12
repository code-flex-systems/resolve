import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getClaimDetail } from '../claimQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';
import config from '@/config/config';

/**
 * Tests for getClaimDetail - Authorization & Error Handling
 *
 * These tests verify:
 * 1. NOT_FOUND error when claim doesn't exist
 * 2. FORBIDDEN error when contributor lacks access
 * 3. Null handling for aggregation data (defaults to 0)
 *
 * Note: Tests for passthrough aggregation (mock count=5, expect count=5) were removed
 * as they don't test real logic. Integration tests will cover full query behavior.
 */

// Mock the database
vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
	},
}));

const createMockContext = (
	role: string = config.ROLES.ADMIN,
	clientId = 'client-abc'
): ProtectedContext =>
	({
		session: {
			user: {
				id: 'user-123',
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

const mockClaimData = {
	id: 1,
	claim_number: 'CLM-001',
	client: 'Test Client',
	client_adjuster: 'Jane Adjuster',
	insured: 'John Insured',
	claim_amount: '50000.00',
	date_of_loss: new Date('2025-01-15'),
	loss_location: 'New York, NY',
	recovery_status: 'open',
	actual_recovery: '5000.00',
	expected_recovery: '15000.00',
	total_incurred: '45000.00',
	feed_id: 1,
	feed_name: 'Test Feed',
	client_id: 'client-abc',
	created_at: new Date('2025-01-01'),
};

describe('getClaimDetail', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Error Handling', () => {
		it('should throw NOT_FOUND when claim does not exist', async () => {
			const mockContext = createMockContext(config.ROLES.ADMIN);

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				leftJoin: vi.fn().mockReturnThis(),
				selectAll: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(null),
			} as any);

			await expect(getClaimDetail(mockContext, 999)).rejects.toThrow('Claim not found.');
		});

		it('should throw FORBIDDEN when contributor has no access', async () => {
			const mockContext = createMockContext(config.ROLES.CONTRIBUTOR);

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;

				// First call: get claim (claim exists)
				if (selectFromCallCount === 1) {
					return {
						leftJoin: vi.fn().mockReturnThis(),
						selectAll: vi.fn().mockReturnThis(),
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue(mockClaimData),
					} as any;
				}

				// Second call: access check (no access - returns null)
				return {
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: vi.fn().mockResolvedValue(null),
				} as any;
			});

			await expect(getClaimDetail(mockContext, 1)).rejects.toThrow(
				'You do not have access to this claim.'
			);
		});
	});

	describe('Null Data Handling', () => {
		it('should handle missing aggregation data gracefully', async () => {
			const mockContext = createMockContext(config.ROLES.ADMIN);

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;

				if (selectFromCallCount === 1) {
					return {
						leftJoin: vi.fn().mockReturnThis(),
						selectAll: vi.fn().mockReturnThis(),
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue(mockClaimData),
					} as any;
				}

				// Return null/empty for all aggregation queries
				return {
					leftJoin: vi.fn().mockReturnThis(),
					innerJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					groupBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
					executeTakeFirst: vi.fn().mockResolvedValue(null),
				} as any;
			});

			const result = await getClaimDetail(mockContext, 1);

			// Verify null values are transformed to 0
			expect(result.coverageSummary.count).toBe(0);
			expect(result.coverageSummary.total).toBe(0);
			expect(result.partySummary.count).toBe(0);
			expect(result.partySummary.totalLiability).toBe(0);
			expect(result.taskSummary.pending).toBe(0);
			expect(result.taskSummary.completed).toBe(0);
		});
	});
});
