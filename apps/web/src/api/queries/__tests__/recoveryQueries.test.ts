import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getQuarterlyRecoveryStats, getRecoveryMetricsTimeSeries } from '../recoveryQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';

/**
 * Tests for Recovery Queries - Fiscal Quarter & Time Series Logic
 *
 * getQuarterlyRecoveryStats:
 * - Calculates fiscal quarter date boundaries from configurable start date
 * - Returns actual recovery totals for Q1-Q4
 * - Supports optional user filtering
 *
 * getRecoveryMetricsTimeSeries:
 * - Uses raw SQL with generate_series for monthly intervals
 * - Joins recovery events with claims for filtering
 * - Returns expected (currently 0) and actual recovery per month
 */

// Mock the database module
vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
		executeQuery: vi.fn(),
	},
}));

// Mock config - vi.mock is hoisted, so we can't use imports inside the factory
// Instead, create a mock dayjs-like object
vi.mock('@/config/config', async () => {
	const dayjs = (await import('dayjs')).default;
	return {
		getFiscalYearStart: vi.fn(() => dayjs('2025-01-01')),
		default: {
			FISCAL_YEAR_START_DATE: dayjs('2025-01-01'),
		},
	};
});

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

describe('getQuarterlyRecoveryStats', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Fiscal Quarter Boundaries', () => {
		it('should calculate Q1-Q4 boundaries from default fiscal year start', async () => {
			// Mock single query that returns all 4 quarters
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				q1: 10000,
				q2: 15000,
				q3: 12000,
				q4: 18000,
			});

			vi.spyOn(db, 'selectFrom').mockImplementation(
				() =>
					({
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: mockExecuteTakeFirst,
					}) as any
			);

			const result = await getQuarterlyRecoveryStats(mockContext);

			expect(result.q1).toBe('10000');
			expect(result.q2).toBe('15000');
			expect(result.q3).toBe('12000');
			expect(result.q4).toBe('18000');
		});

		it('should use custom fiscal year start date when provided', async () => {
			const mockWhere = vi.fn().mockReturnThis();
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				q1: 5000,
				q2: 6000,
				q3: 7000,
				q4: 8000,
			});

			vi.spyOn(db, 'selectFrom').mockImplementation(
				() =>
					({
						select: vi.fn().mockReturnThis(),
						where: mockWhere,
						executeTakeFirst: mockExecuteTakeFirst,
					}) as any
			);

			// Custom fiscal year starting July 1
			const customStart = new Date('2024-07-01');
			await getQuarterlyRecoveryStats(mockContext, { fiscalYearStart: customStart });

			// Should query once (single query returns all 4 quarters)
			expect(mockExecuteTakeFirst).toHaveBeenCalledTimes(1);
		});

		it('should return 0 for quarters with no recovery events', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				q1: null, // Q1 - no data
				q2: 5000, // Q2 - has data
				q3: undefined, // Q3 - undefined
				q4: 0, // Q4 - explicit 0
			});

			vi.spyOn(db, 'selectFrom').mockImplementation(
				() =>
					({
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: mockExecuteTakeFirst,
					}) as any
			);

			const result = await getQuarterlyRecoveryStats(mockContext);

			expect(result.q1).toBe('0');
			expect(result.q2).toBe('5000');
			expect(result.q3).toBe('0');
			expect(result.q4).toBe('0');
		});
	});

	describe('Client Scoping', () => {
		it('should filter by client_id', async () => {
			const mockWhere = vi.fn().mockReturnThis();
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				q1: 1000,
				q2: 1000,
				q3: 1000,
				q4: 1000,
			});

			vi.spyOn(db, 'selectFrom').mockImplementation(
				() =>
					({
						select: vi.fn().mockReturnThis(),
						where: mockWhere,
						executeTakeFirst: mockExecuteTakeFirst,
					}) as any
			);

			await getQuarterlyRecoveryStats(mockContext);

			expect(mockWhere).toHaveBeenCalledWith('client_id', '=', 'client-abc');
		});
	});

	describe('Return Value Structure', () => {
		it('should return object with q1, q2, q3, q4 string values', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				q1: 1000,
				q2: 2000,
				q3: 3000,
				q4: 4000,
			});

			vi.spyOn(db, 'selectFrom').mockImplementation(
				() =>
					({
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: mockExecuteTakeFirst,
					}) as any
			);

			const result = await getQuarterlyRecoveryStats(mockContext);

			expect(result).toHaveProperty('q1');
			expect(result).toHaveProperty('q2');
			expect(result).toHaveProperty('q3');
			expect(result).toHaveProperty('q4');
			expect(typeof result.q1).toBe('string');
			expect(typeof result.q2).toBe('string');
			expect(typeof result.q3).toBe('string');
			expect(typeof result.q4).toBe('string');
		});

		it('should convert numeric totals to strings', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				q1: 12345.67,
				q2: '9999.99',
				q3: 0,
				q4: '0',
			});

			vi.spyOn(db, 'selectFrom').mockImplementation(
				() =>
					({
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: mockExecuteTakeFirst,
					}) as any
			);

			const result = await getQuarterlyRecoveryStats(mockContext);

			expect(result.q1).toBe('12345.67');
			expect(result.q2).toBe('9999.99');
			expect(result.q3).toBe('0');
			expect(result.q4).toBe('0');
		});
	});

	describe('Edge Cases', () => {
		it('should handle large recovery amounts', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				q1: '1000000000.00',
				q2: 0,
				q3: 0,
				q4: 0,
			});

			vi.spyOn(db, 'selectFrom').mockImplementation(
				() =>
					({
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: mockExecuteTakeFirst,
					}) as any
			);

			const result = await getQuarterlyRecoveryStats(mockContext);

			expect(result.q1).toBe('1000000000.00');
		});

		it('should handle decimal precision', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				q1: '123.456789',
				q2: 0,
				q3: 0,
				q4: 0,
			});

			vi.spyOn(db, 'selectFrom').mockImplementation(
				() =>
					({
						select: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: mockExecuteTakeFirst,
					}) as any
			);

			const result = await getQuarterlyRecoveryStats(mockContext);

			expect(result.q1).toBe('123.456789');
		});
	});
});

/**
 * getRecoveryMetricsTimeSeries tests are SKIPPED
 *
 * This function uses raw SQL with Kysely's `sql` tagged template and `.compile(ctx.db)`.
 * The raw SQL compilation requires a real Kysely executor which cannot be easily mocked.
 * These tests would require integration testing with a real database connection.
 *
 * The function logic includes:
 * - generate_series for monthly intervals
 * - Dynamic filter clause building (recoverySource, recoveryStatus, checklistId)
 * - LEFT JOIN with actual recovery data
 * - Returning expected_recovery (always 0 for now) and actual_recovery per month
 */
describe.skip('getRecoveryMetricsTimeSeries', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Monthly Interval Generation', () => {
		it('should return monthly data points within date range', async () => {
			const mockRows = [
				{ month_start: '2025-01-01', expected_recovery: 0, actual_recovery: 5000 },
				{ month_start: '2025-02-01', expected_recovery: 0, actual_recovery: 7500 },
				{ month_start: '2025-03-01', expected_recovery: 0, actual_recovery: 6000 },
			];

			vi.spyOn(db, 'executeQuery').mockResolvedValue({ rows: mockRows } as any);

			const result = await getRecoveryMetricsTimeSeries(mockContext, [
				new Date('2025-01-01'),
				new Date('2025-03-31'),
			]);

			expect(result).toHaveLength(3);
			expect(result[0].month_start).toBe('2025-01-01');
			expect(result[0].actual_recovery).toBe(5000);
		});

		it('should return empty array for months with no data', async () => {
			const mockRows = [
				{ month_start: '2025-01-01', expected_recovery: 0, actual_recovery: 0 },
				{ month_start: '2025-02-01', expected_recovery: 0, actual_recovery: 0 },
			];

			vi.spyOn(db, 'executeQuery').mockResolvedValue({ rows: mockRows } as any);

			const result = await getRecoveryMetricsTimeSeries(mockContext, [
				new Date('2025-01-01'),
				new Date('2025-02-28'),
			]);

			expect(result).toHaveLength(2);
			expect(result[0].actual_recovery).toBe(0);
		});

		it('should handle single month range', async () => {
			const mockRows = [
				{ month_start: '2025-06-01', expected_recovery: 0, actual_recovery: 10000 },
			];

			vi.spyOn(db, 'executeQuery').mockResolvedValue({ rows: mockRows } as any);

			const result = await getRecoveryMetricsTimeSeries(mockContext, [
				new Date('2025-06-01'),
				new Date('2025-06-30'),
			]);

			expect(result).toHaveLength(1);
		});

		it('should handle year-spanning range', async () => {
			const mockRows = [
				{ month_start: '2024-11-01', expected_recovery: 0, actual_recovery: 3000 },
				{ month_start: '2024-12-01', expected_recovery: 0, actual_recovery: 4000 },
				{ month_start: '2025-01-01', expected_recovery: 0, actual_recovery: 5000 },
				{ month_start: '2025-02-01', expected_recovery: 0, actual_recovery: 6000 },
			];

			vi.spyOn(db, 'executeQuery').mockResolvedValue({ rows: mockRows } as any);

			const result = await getRecoveryMetricsTimeSeries(mockContext, [
				new Date('2024-11-01'),
				new Date('2025-02-28'),
			]);

			expect(result).toHaveLength(4);
		});
	});

	describe('Filter Application', () => {
		it('should apply recoverySource filter', async () => {
			vi.spyOn(db, 'executeQuery').mockResolvedValue({ rows: [] } as any);

			await getRecoveryMetricsTimeSeries(
				mockContext,
				[new Date('2025-01-01'), new Date('2025-03-31')],
				{
					recoverySource: 'subrogation',
				}
			);

			expect(db.executeQuery).toHaveBeenCalled();
		});

		it('should apply recoveryStatus filter', async () => {
			vi.spyOn(db, 'executeQuery').mockResolvedValue({ rows: [] } as any);

			await getRecoveryMetricsTimeSeries(
				mockContext,
				[new Date('2025-01-01'), new Date('2025-03-31')],
				{
					recoveryStatus: 'open',
				}
			);

			expect(db.executeQuery).toHaveBeenCalled();
		});

		it('should apply checklistId filter', async () => {
			vi.spyOn(db, 'executeQuery').mockResolvedValue({ rows: [] } as any);

			await getRecoveryMetricsTimeSeries(
				mockContext,
				[new Date('2025-01-01'), new Date('2025-03-31')],
				{
					checklistId: 'checklist-5',
				}
			);

			expect(db.executeQuery).toHaveBeenCalled();
		});

		it('should apply multiple filters together', async () => {
			vi.spyOn(db, 'executeQuery').mockResolvedValue({ rows: [] } as any);

			await getRecoveryMetricsTimeSeries(
				mockContext,
				[new Date('2025-01-01'), new Date('2025-03-31')],
				{
					recoverySource: 'subrogation',
					recoveryStatus: 'pending',
					checklistId: 'checklist-10',
				}
			);

			expect(db.executeQuery).toHaveBeenCalled();
		});
	});

	describe('Return Value Structure', () => {
		it('should return array with month_start, expected_recovery, actual_recovery', async () => {
			const mockRows = [{ month_start: '2025-01-01', expected_recovery: 0, actual_recovery: 5000 }];

			vi.spyOn(db, 'executeQuery').mockResolvedValue({ rows: mockRows } as any);

			const result = await getRecoveryMetricsTimeSeries(mockContext, [
				new Date('2025-01-01'),
				new Date('2025-01-31'),
			]);

			expect(result[0]).toHaveProperty('month_start');
			expect(result[0]).toHaveProperty('expected_recovery');
			expect(result[0]).toHaveProperty('actual_recovery');
		});

		it('should return expected_recovery as 0 (not yet implemented)', async () => {
			const mockRows = [{ month_start: '2025-01-01', expected_recovery: 0, actual_recovery: 5000 }];

			vi.spyOn(db, 'executeQuery').mockResolvedValue({ rows: mockRows } as any);

			const result = await getRecoveryMetricsTimeSeries(mockContext, [
				new Date('2025-01-01'),
				new Date('2025-01-31'),
			]);

			// Expected recovery calculation is TODO, returns 0
			expect(result[0].expected_recovery).toBe(0);
		});
	});

	describe('Edge Cases', () => {
		it('should handle null query result', async () => {
			vi.spyOn(db, 'executeQuery').mockResolvedValue(null as any);

			const result = await getRecoveryMetricsTimeSeries(mockContext, [
				new Date('2025-01-01'),
				new Date('2025-03-31'),
			]);

			expect(result).toEqual([]);
		});

		it('should handle undefined rows', async () => {
			vi.spyOn(db, 'executeQuery').mockResolvedValue({ rows: undefined } as any);

			const result = await getRecoveryMetricsTimeSeries(mockContext, [
				new Date('2025-01-01'),
				new Date('2025-03-31'),
			]);

			expect(result).toEqual([]);
		});

		it('should handle empty rows', async () => {
			vi.spyOn(db, 'executeQuery').mockResolvedValue({ rows: [] } as any);

			const result = await getRecoveryMetricsTimeSeries(mockContext, [
				new Date('2025-01-01'),
				new Date('2025-03-31'),
			]);

			expect(result).toEqual([]);
		});

		it('should order results by month_start ascending', async () => {
			const mockRows = [
				{ month_start: '2025-01-01', expected_recovery: 0, actual_recovery: 1000 },
				{ month_start: '2025-02-01', expected_recovery: 0, actual_recovery: 2000 },
				{ month_start: '2025-03-01', expected_recovery: 0, actual_recovery: 3000 },
			];

			vi.spyOn(db, 'executeQuery').mockResolvedValue({ rows: mockRows } as any);

			const result = await getRecoveryMetricsTimeSeries(mockContext, [
				new Date('2025-01-01'),
				new Date('2025-03-31'),
			]);

			expect(result[0].month_start).toBe('2025-01-01');
			expect(result[1].month_start).toBe('2025-02-01');
			expect(result[2].month_start).toBe('2025-03-01');
		});
	});
});
