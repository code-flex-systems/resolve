import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getFeedCount } from '../feedQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';
import { FeedStatus } from '@/config/enums';

/**
 * Tests for getFeedCount - Status Aggregation & Transformation
 *
 * This function has meaningful transformation logic:
 * 1. Transforms sparse DB results into complete object with all FeedStatus enum values
 * 2. Handles missing status entries by defaulting to 0
 * 3. Calculates running total across all statuses
 * 4. Parses string counts from DB to integers
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

describe('getFeedCount', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Enum Coverage', () => {
		it('should return all FeedStatus enum values even when DB returns partial results', async () => {
			// DB only returns Online and Offline, but result should have all 4 statuses
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([
					{ status: FeedStatus.ONLINE, count: '5' },
					{ status: FeedStatus.OFFLINE, count: '3' },
				]),
			} as any);

			const result = await getFeedCount(mockContext, 'client-abc');

			// All enum values should be present
			expect(result[FeedStatus.ONLINE]).toBe(5);
			expect(result[FeedStatus.OFFLINE]).toBe(3);
			expect(result[FeedStatus.MUTED]).toBe(0); // Missing from DB, defaults to 0
			expect(result[FeedStatus.INACTIVE]).toBe(0); // Missing from DB, defaults to 0
		});

		it('should default missing statuses to 0', async () => {
			// DB returns empty result
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([]),
			} as any);

			const result = await getFeedCount(mockContext, 'client-abc');

			// All statuses should be 0
			expect(result[FeedStatus.ONLINE]).toBe(0);
			expect(result[FeedStatus.OFFLINE]).toBe(0);
			expect(result[FeedStatus.MUTED]).toBe(0);
			expect(result[FeedStatus.INACTIVE]).toBe(0);
		});
	});

	describe('Total Calculation', () => {
		it('should calculate total correctly from all statuses', async () => {
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([
					{ status: FeedStatus.ONLINE, count: '10' },
					{ status: FeedStatus.OFFLINE, count: '5' },
					{ status: FeedStatus.MUTED, count: '3' },
					{ status: FeedStatus.INACTIVE, count: '2' },
				]),
			} as any);

			const result = await getFeedCount(mockContext, 'client-abc');

			expect(result.total).toBe(20); // 10 + 5 + 3 + 2
		});

		it('should return total of 0 when no feeds exist', async () => {
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([]),
			} as any);

			const result = await getFeedCount(mockContext, 'client-abc');

			expect(result.total).toBe(0);
		});

		it('should handle single status correctly', async () => {
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([{ status: FeedStatus.ONLINE, count: '42' }]),
			} as any);

			const result = await getFeedCount(mockContext, 'client-abc');

			expect(result.total).toBe(42);
			expect(result[FeedStatus.ONLINE]).toBe(42);
		});
	});

	describe('String to Number Parsing', () => {
		it('should parse string counts to integers', async () => {
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([{ status: FeedStatus.ONLINE, count: '999' }]),
			} as any);

			const result = await getFeedCount(mockContext, 'client-abc');

			expect(typeof result[FeedStatus.ONLINE]).toBe('number');
			expect(result[FeedStatus.ONLINE]).toBe(999);
		});

		it('should handle BigInt-like string values from PostgreSQL', async () => {
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([{ status: FeedStatus.ONLINE, count: '1000000' }]),
			} as any);

			const result = await getFeedCount(mockContext, 'client-abc');

			expect(result[FeedStatus.ONLINE]).toBe(1000000);
			expect(result.total).toBe(1000000);
		});
	});

	describe('Edge Cases', () => {
		it('should handle null count gracefully (defaults to 0)', async () => {
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([{ status: FeedStatus.ONLINE, count: null }]),
			} as any);

			const result = await getFeedCount(mockContext, 'client-abc');

			// Code: results.find((r) => r.status === s)?.count ?? 0
			// If count is null: null ?? 0 = 0 (nullish coalescing treats null as nullish)
			// parseInt("0".toString()) = 0
			expect(result[FeedStatus.ONLINE]).toBe(0);
		});

		it('should handle undefined count gracefully (defaults to 0)', async () => {
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([{ status: FeedStatus.ONLINE, count: undefined }]),
			} as any);

			const result = await getFeedCount(mockContext, 'client-abc');

			// Code: results.find((r) => r.status === s)?.count ?? 0
			// If count is undefined: undefined ?? 0 = 0
			// parseInt("0".toString()) = 0
			expect(result[FeedStatus.ONLINE]).toBe(0);
		});
	});
});
