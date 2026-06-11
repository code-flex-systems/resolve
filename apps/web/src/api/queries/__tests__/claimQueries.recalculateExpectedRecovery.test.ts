import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { recalculateClaimExpectedRecovery, getClaimPartyAggregates } from '../claimQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';

/**
 * Tests for recalculateClaimExpectedRecovery - Financial Calculation Logic
 *
 * This function is critical for:
 * 1. Calculating expected recovery from liability percentages and claim_amount (actual payments)
 * 2. Formula: expected_recovery = (100% - sum(entity liability %)) / 100 × claim_amount
 * 3. Caching the result on the claim table for performance
 *
 * Test Strategy:
 * - Mock database responses to test calculation logic
 * - Verify formula correctness with various inputs
 * - Test edge cases: no parties, no claim_amount, 100% liability, >100% liability
 * - Validate rounding and precision handling
 */

// Mock the database
vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
		updateTable: vi.fn(),
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
			role: 'admin',
			client_id: clientId,
		},
	},
	db,
});

describe('recalculateClaimExpectedRecovery', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Formula Verification', () => {
		it('should calculate expected recovery correctly with standard inputs', async () => {
			// Party liability: 30%, Total paid: $10,000
			// Our liability: 70%, Expected recovery: $7,000
			const mockPartyResult = { total_liability_percentage: '30' };
			const mockClaimResult = { claim_amount: '10000' };

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					// Party query (entities only - parent_claim_party_id IS NULL)
					return {
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue(mockPartyResult),
					} as any;
				}
				// Claim query (get claim_amount)
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: vi.fn().mockResolvedValue(mockClaimResult),
				} as any;
			});

			const mockUpdateExecute = vi.fn().mockResolvedValue(undefined);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(db.updateTable as any) = vi.fn().mockImplementation(() => ({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: mockUpdateExecute,
			}));

			const result = await recalculateClaimExpectedRecovery(mockContext, 'claim-1');

			expect(result).toBe(7000);
			expect(mockUpdateExecute).toHaveBeenCalled();
		});

		it('should calculate 100% recovery when no other party liability', async () => {
			// Party liability: 0%, Total paid: $5,000
			// Our liability: 100%, Expected recovery: $5,000
			const mockPartyResult = { total_liability_percentage: '0' };
			const mockClaimResult = { claim_amount: '5000' };

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue(mockPartyResult),
					} as any;
				}
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: vi.fn().mockResolvedValue(mockClaimResult),
				} as any;
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(db.updateTable as any) = vi.fn().mockImplementation(() => ({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
			}));

			const result = await recalculateClaimExpectedRecovery(mockContext, 'claim-1');

			expect(result).toBe(5000);
		});

		it('should calculate 0% recovery when other parties have 100% liability', async () => {
			// Party liability: 100%, Total paid: $10,000
			// Our liability: 0%, Expected recovery: $0
			const mockPartyResult = { total_liability_percentage: '100' };
			const mockClaimResult = { claim_amount: '10000' };

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue(mockPartyResult),
					} as any;
				}
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: vi.fn().mockResolvedValue(mockClaimResult),
				} as any;
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(db.updateTable as any) = vi.fn().mockImplementation(() => ({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
			}));

			const result = await recalculateClaimExpectedRecovery(mockContext, 'claim-1');

			expect(result).toBe(0);
		});

		it('should handle fractional percentages correctly', async () => {
			// Party liability: 33.33%, Total paid: $9,000
			// Our liability: 66.67%, Expected recovery: $6,000.30
			const mockPartyResult = { total_liability_percentage: '33.33' };
			const mockClaimResult = { claim_amount: '9000' };

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue(mockPartyResult),
					} as any;
				}
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: vi.fn().mockResolvedValue(mockClaimResult),
				} as any;
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(db.updateTable as any) = vi.fn().mockImplementation(() => ({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
			}));

			const result = await recalculateClaimExpectedRecovery(mockContext, 'claim-1');

			// (100 - 33.33) / 100 * 9000 = 66.67 / 100 * 9000 = 6000.3
			expect(result).toBeCloseTo(6000.3, 2);
		});

		it('should handle large amounts correctly', async () => {
			// Party liability: 25%, Total paid: $1,000,000
			// Our liability: 75%, Expected recovery: $750,000
			const mockPartyResult = { total_liability_percentage: '25' };
			const mockClaimResult = { claim_amount: '1000000' };

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue(mockPartyResult),
					} as any;
				}
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: vi.fn().mockResolvedValue(mockClaimResult),
				} as any;
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(db.updateTable as any) = vi.fn().mockImplementation(() => ({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
			}));

			const result = await recalculateClaimExpectedRecovery(mockContext, 'claim-1');

			expect(result).toBe(750000);
		});
	});

	describe('Edge Cases - No Data', () => {
		it('should return 0 when no parties exist', async () => {
			const mockPartyResult = { total_liability_percentage: null };
			const mockClaimResult = { claim_amount: '10000' };

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue(mockPartyResult),
					} as any;
				}
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: vi.fn().mockResolvedValue(mockClaimResult),
				} as any;
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(db.updateTable as any) = vi.fn().mockImplementation(() => ({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
			}));

			const result = await recalculateClaimExpectedRecovery(mockContext, 'claim-1');

			// No party liability = 100% our liability, so full recovery
			expect(result).toBe(10000);
		});

		it('should return 0 when no liabilities exist', async () => {
			const mockPartyResult = { total_liability_percentage: '50' };
			const mockClaimResult = { claim_amount: null };

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue(mockPartyResult),
					} as any;
				}
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: vi.fn().mockResolvedValue(mockClaimResult),
				} as any;
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(db.updateTable as any) = vi.fn().mockImplementation(() => ({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
			}));

			const result = await recalculateClaimExpectedRecovery(mockContext, 'claim-1');

			// No amount paid = 0 recovery
			expect(result).toBe(0);
		});

		it('should return 0 when both parties and liabilities are null', async () => {
			const mockPartyResult = { total_liability_percentage: null };
			const mockClaimResult = { claim_amount: null };

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue(mockPartyResult),
					} as any;
				}
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: vi.fn().mockResolvedValue(mockClaimResult),
				} as any;
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(db.updateTable as any) = vi.fn().mockImplementation(() => ({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
			}));

			const result = await recalculateClaimExpectedRecovery(mockContext, 'claim-1');

			// 100% of 0 = 0
			expect(result).toBe(0);
		});

		it('should handle undefined query results gracefully', async () => {
			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue(undefined),
					} as any;
				}
				return {
					innerJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: vi.fn().mockResolvedValue(undefined),
				} as any;
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(db.updateTable as any) = vi.fn().mockImplementation(() => ({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
			}));

			const result = await recalculateClaimExpectedRecovery(mockContext, 'claim-1');

			expect(result).toBe(0);
		});
	});

	describe('Edge Cases - Liability Boundaries', () => {
		it('should cap our liability at 0% when other parties exceed 100%', async () => {
			// Party liability: 120% (data error), Total paid: $10,000
			// Our liability should be capped at 0%, Expected recovery: $0
			const mockPartyResult = { total_liability_percentage: '120' };
			const mockClaimResult = { claim_amount: '10000' };

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue(mockPartyResult),
					} as any;
				}
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: vi.fn().mockResolvedValue(mockClaimResult),
				} as any;
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(db.updateTable as any) = vi.fn().mockImplementation(() => ({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
			}));

			const result = await recalculateClaimExpectedRecovery(mockContext, 'claim-1');

			// Math.max(0, 100 - 120) = 0, so 0% recovery
			expect(result).toBe(0);
		});

		it('should handle very small percentages', async () => {
			// Party liability: 0.01%, Total paid: $100,000
			// Our liability: 99.99%, Expected recovery: $99,990
			const mockPartyResult = { total_liability_percentage: '0.01' };
			const mockClaimResult = { claim_amount: '100000' };

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue(mockPartyResult),
					} as any;
				}
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: vi.fn().mockResolvedValue(mockClaimResult),
				} as any;
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(db.updateTable as any) = vi.fn().mockImplementation(() => ({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
			}));

			const result = await recalculateClaimExpectedRecovery(mockContext, 'claim-1');

			// (100 - 0.01) / 100 * 100000 = 99990
			expect(result).toBeCloseTo(99990, 0);
		});

		it('should handle very small amounts', async () => {
			// Party liability: 50%, Total paid: $0.01
			// Our liability: 50%, Expected recovery: $0.005
			const mockPartyResult = { total_liability_percentage: '50' };
			const mockClaimResult = { claim_amount: '0.01' };

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue(mockPartyResult),
					} as any;
				}
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: vi.fn().mockResolvedValue(mockClaimResult),
				} as any;
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(db.updateTable as any) = vi.fn().mockImplementation(() => ({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
			}));

			const result = await recalculateClaimExpectedRecovery(mockContext, 'claim-1');

			expect(result).toBeCloseTo(0.005, 4);
		});
	});

	describe('Database Update Verification', () => {
		it('should update claim with formatted expected_recovery value', async () => {
			const mockPartyResult = { total_liability_percentage: '30' };
			const mockClaimResult = { claim_amount: '10000' };

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue(mockPartyResult),
					} as any;
				}
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: vi.fn().mockResolvedValue(mockClaimResult),
				} as any;
			});

			const mockSet = vi.fn().mockReturnThis();
			const mockWhere = vi.fn().mockReturnThis();
			const mockExecute = vi.fn().mockResolvedValue(undefined);

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(db.updateTable as any) = vi.fn().mockImplementation(() => ({
				set: mockSet,
				where: mockWhere,
				execute: mockExecute,
			}));

			await recalculateClaimExpectedRecovery(mockContext, 'claim-1');

			// Verify update was called with formatted value (2 decimal places)
			expect(mockSet).toHaveBeenCalledWith({ expected_recovery: '7000.00' });
			expect(mockWhere).toHaveBeenCalledWith('id', '=', 'claim-1');
		});

		it('should format expected_recovery with 2 decimal places', async () => {
			// Result should be 6000.33333... but stored as '6000.33'
			const mockPartyResult = { total_liability_percentage: '33.333' };
			const mockClaimResult = { claim_amount: '9000' };

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue(mockPartyResult),
					} as any;
				}
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: vi.fn().mockResolvedValue(mockClaimResult),
				} as any;
			});

			const mockSet = vi.fn().mockReturnThis();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(db.updateTable as any) = vi.fn().mockImplementation(() => ({
				set: mockSet,
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
			}));

			await recalculateClaimExpectedRecovery(mockContext, 'claim-1');

			// Verify value is formatted to 2 decimal places
			const setCall = mockSet.mock.calls[0][0];
			expect(setCall.expected_recovery).toMatch(/^\d+\.\d{2}$/);
		});
	});

	describe('Return Value', () => {
		it('should return the calculated expected recovery as a number', async () => {
			const mockPartyResult = { total_liability_percentage: '25' };
			const mockClaimResult = { claim_amount: '8000' };

			let selectFromCallCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				selectFromCallCount++;
				if (selectFromCallCount === 1) {
					return {
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue(mockPartyResult),
					} as any;
				}
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: vi.fn().mockResolvedValue(mockClaimResult),
				} as any;
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(db.updateTable as any) = vi.fn().mockImplementation(() => ({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
			}));

			const result = await recalculateClaimExpectedRecovery(mockContext, 'claim-1');

			expect(typeof result).toBe('number');
			expect(result).toBe(6000); // 75% of 8000
		});
	});
});

describe('getClaimPartyAggregates', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Aggregation Logic', () => {
		it('should aggregate loss types and calculate liability correctly', async () => {
			const mockResult = {
				loss_type_array: ['Collision', 'Fire', null],
				total_liability_percentage: '40',
			};

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(mockResult),
			} as any);

			const result = await getClaimPartyAggregates(mockContext, 'claim-1');

			expect(result.loss_type).toEqual(['Collision', 'Fire']); // nulls filtered
			expect(result.total_liability_percentage).toBe(40);
			expect(result.our_liability_percentage).toBe(60);
		});

		it('should handle empty arrays correctly', async () => {
			const mockResult = {
				loss_type_array: [],
				total_liability_percentage: '20',
			};

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(mockResult),
			} as any);

			const result = await getClaimPartyAggregates(mockContext, 'claim-1');

			expect(result.loss_type).toEqual([]);
			expect(result.our_liability_percentage).toBe(80);
		});

		it('should handle null result gracefully', async () => {
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(null),
			} as any);

			const result = await getClaimPartyAggregates(mockContext, 'claim-1');

			expect(result.loss_type).toEqual([]);
			expect(result.total_liability_percentage).toBe(0);
			expect(result.our_liability_percentage).toBe(100);
		});

		it('should cap our liability at 0% when others exceed 100%', async () => {
			const mockResult = {
				loss_type_array: ['Collision'],
				total_liability_percentage: '150', // Over 100%
			};

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(mockResult),
			} as any);

			const result = await getClaimPartyAggregates(mockContext, 'claim-1');

			expect(result.total_liability_percentage).toBe(150);
			expect(result.our_liability_percentage).toBe(0); // Capped at 0
		});
	});
});
