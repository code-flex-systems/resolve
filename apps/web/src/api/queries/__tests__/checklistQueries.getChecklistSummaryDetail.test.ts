import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getChecklistSummaryDetail } from '../checklistQueries';
import { db } from '@/api/database/kysely';
import { SummarySegment } from '@/config/enums';
import type { ProtectedContext } from '@/server/trpc/trpc';

// Mock the database
vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
	},
}));

// Reusable mock context
const createMockContext = (client_id: string = 'client-abc'): ProtectedContext => ({
	session: {
		user: {
			id: 'user-123',
			name: 'Test User',
			email: 'test@example.com',
			phone: null,
			role: 'Admin',
			client_id,
		},
		expires: '2025-12-31T23:59:59.999Z',
	},
	db,
});

describe('getChecklistSummaryDetail()', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Client scoping', () => {
		it('should filter by client_id from context', async () => {
			const ctx = createMockContext('client-xyz');
			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({ count: '5' });

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			} as any);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 1,
				claimId: 100,
				segment: SummarySegment.ANSWERED,
				mode: 'count',
			});

			// Verify client_id was used in where clause
			expect(mockWhere).toHaveBeenCalledWith('page_instance.client_id', '=', 'client-xyz');
		});

		it('should filter by checklistId', async () => {
			const ctx = createMockContext();
			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({ count: '5' });

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			} as any);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 42,
				claimId: 100,
				segment: SummarySegment.ANSWERED,
				mode: 'count',
			});

			// Verify checklistId was used in where clause
			expect(mockWhere).toHaveBeenCalledWith('page_instance.checklist_id', '=', 42);
		});
	});

	describe('Mode: count', () => {
		it('should return count as number for ANSWERED segment', async () => {
			const ctx = createMockContext();
			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({ count: '12' });

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			} as any);

			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: 1,
				claimId: 100,
				segment: SummarySegment.ANSWERED,
				mode: 'count',
			});

			expect(result).toBe(12);
			expect(typeof result).toBe('number');
		});

		it('should return 0 when count is null', async () => {
			const ctx = createMockContext();
			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({ count: null });

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			} as any);

			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: 1,
				claimId: 100,
				segment: SummarySegment.UNANSWERED,
				mode: 'count',
			});

			expect(result).toBe(0);
		});

		it('should return 0 when result is undefined', async () => {
			const ctx = createMockContext();
			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue(undefined);

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			} as any);

			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: 1,
				claimId: 100,
				segment: SummarySegment.ACTION_REQUIRED,
				mode: 'count',
			});

			expect(result).toBe(0);
		});
	});

	describe('Mode: rows', () => {
		it('should return rows array for ANSWERED segment', async () => {
			const ctx = createMockContext();
			const mockRows = [
				{
					page_id: 1,
					page_title: 'Personal Information',
					question_id: 5,
					question_text: 'What is your name?',
					response_text: 'John Doe',
					answer_texts: null,
				},
				{
					page_id: 1,
					page_title: 'Personal Information',
					question_id: 6,
					question_text: 'What is your age?',
					response_text: null,
					answer_texts: '18-24, Male',
				},
			];

			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockGroupBy = vi.fn().mockReturnThis();
			const mockOrderBy = vi.fn().mockReturnThis();
			const mockLimit = vi.fn().mockReturnThis();
			const mockOffset = vi.fn().mockReturnThis();
			const mockExecute = vi.fn().mockResolvedValue(mockRows);

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				groupBy: mockGroupBy,
				orderBy: mockOrderBy,
				limit: mockLimit,
				offset: mockOffset,
				execute: mockExecute,
			} as any);

			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: 1,
				claimId: 100,
				segment: SummarySegment.ANSWERED,
				mode: 'rows',
			});

			expect(result).toEqual(mockRows);
			expect(Array.isArray(result)).toBe(true);
			expect(result).toHaveLength(2);
		});

		it('should use default limit of 50 when not provided', async () => {
			const ctx = createMockContext();
			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockGroupBy = vi.fn().mockReturnThis();
			const mockOrderBy = vi.fn().mockReturnThis();
			const mockLimit = vi.fn().mockReturnThis();
			const mockOffset = vi.fn().mockReturnThis();
			const mockExecute = vi.fn().mockResolvedValue([]);

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				groupBy: mockGroupBy,
				orderBy: mockOrderBy,
				limit: mockLimit,
				offset: mockOffset,
				execute: mockExecute,
			} as any);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 1,
				claimId: 100,
				segment: SummarySegment.ANSWERED,
				mode: 'rows',
			});

			expect(mockLimit).toHaveBeenCalledWith(50);
		});

		it('should use default offset of 0 when not provided', async () => {
			const ctx = createMockContext();
			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockGroupBy = vi.fn().mockReturnThis();
			const mockOrderBy = vi.fn().mockReturnThis();
			const mockLimit = vi.fn().mockReturnThis();
			const mockOffset = vi.fn().mockReturnThis();
			const mockExecute = vi.fn().mockResolvedValue([]);

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				groupBy: mockGroupBy,
				orderBy: mockOrderBy,
				limit: mockLimit,
				offset: mockOffset,
				execute: mockExecute,
			} as any);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 1,
				claimId: 100,
				segment: SummarySegment.ANSWERED,
				mode: 'rows',
			});

			expect(mockOffset).toHaveBeenCalledWith(0);
		});

		it('should use custom limit and offset when provided', async () => {
			const ctx = createMockContext();
			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockGroupBy = vi.fn().mockReturnThis();
			const mockOrderBy = vi.fn().mockReturnThis();
			const mockLimit = vi.fn().mockReturnThis();
			const mockOffset = vi.fn().mockReturnThis();
			const mockExecute = vi.fn().mockResolvedValue([]);

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				groupBy: mockGroupBy,
				orderBy: mockOrderBy,
				limit: mockLimit,
				offset: mockOffset,
				execute: mockExecute,
			} as any);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 1,
				claimId: 100,
				segment: SummarySegment.ANSWERED,
				mode: 'rows',
				limit: 100,
				offset: 200,
			});

			expect(mockLimit).toHaveBeenCalledWith(100);
			expect(mockOffset).toHaveBeenCalledWith(200);
		});
	});

	describe('Segment filtering', () => {
		it('should join answer tables for ANSWERED segment', async () => {
			const ctx = createMockContext();
			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({ count: '5' });

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			} as any);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 1,
				claimId: 100,
				segment: SummarySegment.ANSWERED,
				mode: 'count',
			});

			// Should join answer tables for ANSWERED segment
			expect(mockLeftJoin).toHaveBeenCalledWith(
				'question_response_answer',
				'question_response_answer.response_id',
				'question_response.id'
			);
			expect(mockLeftJoin).toHaveBeenCalledWith('answer', 'answer.id', 'question_response_answer.answer_id');
		});

		it('should NOT join answer tables for UNANSWERED segment', async () => {
			const ctx = createMockContext();
			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({ count: '5' });

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			} as any);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 1,
				claimId: 100,
				segment: SummarySegment.UNANSWERED,
				mode: 'count',
			});

			// Should NOT join question_response_answer or answer for UNANSWERED
			expect(mockLeftJoin).not.toHaveBeenCalledWith(
				'question_response_answer',
				'question_response_answer.response_id',
				'question_response.id'
			);
			expect(mockLeftJoin).not.toHaveBeenCalledWith('answer', 'answer.id', 'question_response_answer.answer_id');
		});

		it('should join answer tables for ACTION_REQUIRED segment', async () => {
			const ctx = createMockContext();
			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({ count: '5' });

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			} as any);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 1,
				claimId: 100,
				segment: SummarySegment.ACTION_REQUIRED,
				mode: 'count',
			});

			// Should join answer tables for ACTION_REQUIRED segment
			expect(mockLeftJoin).toHaveBeenCalledWith(
				'question_response_answer',
				'question_response_answer.response_id',
				'question_response.id'
			);
			expect(mockLeftJoin).toHaveBeenCalledWith('answer', 'answer.id', 'question_response_answer.answer_id');
			// Should join action table with client_id filtering (callback-based join)
			expect(mockLeftJoin).toHaveBeenCalledWith('action', expect.any(Function));
		});

		it('should join answer tables for NO_ACTION_REQUIRED segment', async () => {
			const ctx = createMockContext();
			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({ count: '5' });

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			} as any);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 1,
				claimId: 100,
				segment: SummarySegment.NO_ACTION_REQUIRED,
				mode: 'count',
			});

			// Should join answer tables for NO_ACTION_REQUIRED segment
			expect(mockLeftJoin).toHaveBeenCalledWith(
				'question_response_answer',
				'question_response_answer.response_id',
				'question_response.id'
			);
			expect(mockLeftJoin).toHaveBeenCalledWith('answer', 'answer.id', 'question_response_answer.answer_id');
			// Should join action table with client_id filtering (callback-based join)
			expect(mockLeftJoin).toHaveBeenCalledWith('action', expect.any(Function));
		});

		it('should join answer tables for UNKNOWN segment', async () => {
			const ctx = createMockContext();
			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({ count: '5' });

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			} as any);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 1,
				claimId: 100,
				segment: SummarySegment.UNKNOWN,
				mode: 'count',
			});

			// Should join answer tables for UNKNOWN segment
			expect(mockLeftJoin).toHaveBeenCalledWith(
				'question_response_answer',
				'question_response_answer.response_id',
				'question_response.id'
			);
			expect(mockLeftJoin).toHaveBeenCalledWith('answer', 'answer.id', 'question_response_answer.answer_id');
			// Should join action table with client_id filtering (callback-based join)
			expect(mockLeftJoin).toHaveBeenCalledWith('action', expect.any(Function));
		});
	});

	describe('Integration - different segments', () => {
		it('should handle ANSWERED segment correctly', async () => {
			const ctx = createMockContext();
			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({ count: '10' });

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			} as any);

			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: 1,
				claimId: 100,
				segment: SummarySegment.ANSWERED,
				mode: 'count',
			});

			// Should apply where clause for ANSWERED (response_text OR answer exists)
			expect(mockWhere).toHaveBeenCalled();
			expect(result).toBe(10);
		});

		it('should handle UNANSWERED segment correctly', async () => {
			const ctx = createMockContext();
			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({ count: '3' });

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			} as any);

			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: 1,
				claimId: 100,
				segment: SummarySegment.UNANSWERED,
				mode: 'count',
			});

			// Should filter for null question_response
			expect(mockWhere).toHaveBeenCalledWith('question_response.id', 'is', null);
			expect(result).toBe(3);
		});

		it('should handle ACTION_REQUIRED segment correctly', async () => {
			const ctx = createMockContext();
			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({ count: '5' });

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			} as any);

			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: 1,
				claimId: 100,
				segment: SummarySegment.ACTION_REQUIRED,
				mode: 'count',
			});

			// Should apply complex where clause for ACTION_REQUIRED (has_action OR unknown OR missing additional_info)
			expect(mockWhere).toHaveBeenCalled();
			expect(result).toBe(5);
		});

		it('should handle NO_ACTION_REQUIRED segment correctly', async () => {
			const ctx = createMockContext();
			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({ count: '7' });

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			} as any);

			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: 1,
				claimId: 100,
				segment: SummarySegment.NO_ACTION_REQUIRED,
				mode: 'count',
			});

			// Should apply complex where clause for NO_ACTION_REQUIRED (inverse of action required)
			expect(mockWhere).toHaveBeenCalled();
			expect(result).toBe(7);
		});

		it('should handle UNKNOWN segment correctly', async () => {
			const ctx = createMockContext();
			const mockWhere = vi.fn().mockReturnThis();
			const mockInnerJoin = vi.fn().mockReturnThis();
			const mockLeftJoin = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({ count: '2' });

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
				leftJoin: mockLeftJoin,
				where: mockWhere,
				select: mockSelect,
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			} as any);

			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: 1,
				claimId: 100,
				segment: SummarySegment.UNKNOWN,
				mode: 'count',
			});

			// Should filter for answer.text containing 'unknown'
			expect(mockWhere).toHaveBeenCalled();
			expect(result).toBe(2);
		});
	});
});
