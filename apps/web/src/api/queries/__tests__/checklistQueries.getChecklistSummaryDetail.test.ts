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
			authUserId: 'auth-user-123',
			name: 'Test User',
			email: 'test@example.com',
			phone: null,
			role: 'Admin',
			client_id,
		},
	},
	db,
});

// Helper to create mock query chain
const createMockQueryChain = (rows: unknown[] = []) => {
	const mockWhere = vi.fn().mockReturnThis();
	const mockInnerJoin = vi.fn().mockReturnThis();
	const mockLeftJoin = vi.fn().mockReturnThis();
	const mockSelect = vi.fn().mockReturnThis();
	const mockGroupBy = vi.fn().mockReturnThis();
	const mockOrderBy = vi.fn().mockReturnThis();
	const mockLimit = vi.fn().mockReturnThis();
	const mockOffset = vi.fn().mockReturnThis();
	const mockExecute = vi.fn().mockResolvedValue(rows);

	const chain = {
		innerJoin: mockInnerJoin,
		leftJoin: mockLeftJoin,
		where: mockWhere,
		select: mockSelect,
		groupBy: mockGroupBy,
		orderBy: mockOrderBy,
		limit: mockLimit,
		offset: mockOffset,
		execute: mockExecute,
	};

	vi.spyOn(db, 'selectFrom').mockReturnValue(chain as any);

	return {
		...chain,
		mockWhere,
		mockInnerJoin,
		mockLeftJoin,
		mockSelect,
		mockGroupBy,
		mockOrderBy,
		mockLimit,
		mockOffset,
		mockExecute,
	};
};

describe('getChecklistSummaryDetail()', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Return structure', () => {
		it('should always return { rows, count } object', async () => {
			const ctx = createMockContext();
			const mockRows = [
				{
					page_id: 1,
					page_title: 'Personal Information',
					question_id: 5,
					question_text: 'What is your name?',
					response_text: 'John Doe',
					answer_texts: null,
					total_count: 2,
				},
				{
					page_id: 1,
					page_title: 'Personal Information',
					question_id: 6,
					question_text: 'What is your age?',
					response_text: null,
					answer_texts: '18-24',
					total_count: 2,
				},
			];

			createMockQueryChain(mockRows);

			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: 'checklist-1',
				claimId: 'claim-100',
				segment: SummarySegment.ANSWERED,
			});

			expect(result).toHaveProperty('rows');
			expect(result).toHaveProperty('count');
			expect(Array.isArray(result.rows)).toBe(true);
			expect(typeof result.count).toBe('number');
		});

		it('should extract count from first row total_count', async () => {
			const ctx = createMockContext();
			const mockRows = [
				{ page_id: 1, question_id: 1, total_count: 15 },
				{ page_id: 1, question_id: 2, total_count: 15 },
			];

			createMockQueryChain(mockRows);

			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: 'checklist-1',
				claimId: 'claim-100',
				segment: SummarySegment.ANSWERED,
			});

			expect(result.count).toBe(15);
			expect(result.rows).toHaveLength(2);
		});

		it('should return count of 0 when rows is empty', async () => {
			const ctx = createMockContext();
			createMockQueryChain([]);

			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: 'checklist-1',
				claimId: 'claim-100',
				segment: SummarySegment.UNANSWERED,
			});

			expect(result.count).toBe(0);
			expect(result.rows).toHaveLength(0);
		});
	});

	describe('Client scoping', () => {
		it('should filter by client_id from context', async () => {
			const ctx = createMockContext('client-xyz');
			const { mockWhere } = createMockQueryChain([]);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 'checklist-1',
				claimId: 'claim-100',
				segment: SummarySegment.ANSWERED,
			});

			expect(mockWhere).toHaveBeenCalledWith('page_instance.client_id', '=', 'client-xyz');
		});

		it('should filter by checklistId', async () => {
			const ctx = createMockContext();
			const { mockWhere } = createMockQueryChain([]);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 'checklist-42',
				claimId: 'claim-100',
				segment: SummarySegment.ANSWERED,
			});

			expect(mockWhere).toHaveBeenCalledWith('page_instance.checklist_id', '=', 'checklist-42');
		});
	});

	describe('Pagination', () => {
		it('should use default limit of 50 when not provided', async () => {
			const ctx = createMockContext();
			const { mockLimit } = createMockQueryChain([]);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 'checklist-1',
				claimId: 'claim-100',
				segment: SummarySegment.ANSWERED,
			});

			expect(mockLimit).toHaveBeenCalledWith(50);
		});

		it('should use default offset of 0 when not provided', async () => {
			const ctx = createMockContext();
			const { mockOffset } = createMockQueryChain([]);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 'checklist-1',
				claimId: 'claim-100',
				segment: SummarySegment.ANSWERED,
			});

			expect(mockOffset).toHaveBeenCalledWith(0);
		});

		it('should use custom limit and offset when provided', async () => {
			const ctx = createMockContext();
			const { mockLimit, mockOffset } = createMockQueryChain([]);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 'checklist-1',
				claimId: 'claim-100',
				segment: SummarySegment.ANSWERED,
				limit: 100,
				offset: 200,
			});

			expect(mockLimit).toHaveBeenCalledWith(100);
			expect(mockOffset).toHaveBeenCalledWith(200);
		});
	});

	describe('Segment filtering - answer table joins', () => {
		it('should join answer tables for ANSWERED segment', async () => {
			const ctx = createMockContext();
			const { mockLeftJoin } = createMockQueryChain([]);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 'checklist-1',
				claimId: 'claim-100',
				segment: SummarySegment.ANSWERED,
			});

			expect(mockLeftJoin).toHaveBeenCalledWith(
				'question_response_answer',
				'question_response_answer.response_id',
				'question_response.id'
			);
			expect(mockLeftJoin).toHaveBeenCalledWith(
				'answer',
				'answer.id',
				'question_response_answer.answer_id'
			);
		});

		it('should NOT join answer tables for UNANSWERED segment', async () => {
			const ctx = createMockContext();
			const { mockLeftJoin } = createMockQueryChain([]);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 'checklist-1',
				claimId: 'claim-100',
				segment: SummarySegment.UNANSWERED,
			});

			expect(mockLeftJoin).not.toHaveBeenCalledWith(
				'question_response_answer',
				'question_response_answer.response_id',
				'question_response.id'
			);
			expect(mockLeftJoin).not.toHaveBeenCalledWith(
				'answer',
				'answer.id',
				'question_response_answer.answer_id'
			);
		});

		it('should join answer and action tables for ACTION_REQUIRED segment', async () => {
			const ctx = createMockContext();
			const { mockLeftJoin } = createMockQueryChain([]);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 'checklist-1',
				claimId: 'claim-100',
				segment: SummarySegment.ACTION_REQUIRED,
			});

			expect(mockLeftJoin).toHaveBeenCalledWith(
				'question_response_answer',
				'question_response_answer.response_id',
				'question_response.id'
			);
			expect(mockLeftJoin).toHaveBeenCalledWith(
				'answer',
				'answer.id',
				'question_response_answer.answer_id'
			);
			expect(mockLeftJoin).toHaveBeenCalledWith('action', expect.any(Function));
		});

		it('should join answer and action tables for NO_ACTION_REQUIRED segment', async () => {
			const ctx = createMockContext();
			const { mockLeftJoin } = createMockQueryChain([]);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 'checklist-1',
				claimId: 'claim-100',
				segment: SummarySegment.NO_ACTION_REQUIRED,
			});

			expect(mockLeftJoin).toHaveBeenCalledWith(
				'question_response_answer',
				'question_response_answer.response_id',
				'question_response.id'
			);
			expect(mockLeftJoin).toHaveBeenCalledWith(
				'answer',
				'answer.id',
				'question_response_answer.answer_id'
			);
			expect(mockLeftJoin).toHaveBeenCalledWith('action', expect.any(Function));
		});

		it('should join answer and action tables for UNKNOWN segment', async () => {
			const ctx = createMockContext();
			const { mockLeftJoin } = createMockQueryChain([]);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 'checklist-1',
				claimId: 'claim-100',
				segment: SummarySegment.UNKNOWN,
			});

			expect(mockLeftJoin).toHaveBeenCalledWith(
				'question_response_answer',
				'question_response_answer.response_id',
				'question_response.id'
			);
			expect(mockLeftJoin).toHaveBeenCalledWith(
				'answer',
				'answer.id',
				'question_response_answer.answer_id'
			);
			expect(mockLeftJoin).toHaveBeenCalledWith('action', expect.any(Function));
		});
	});

	describe('Segment-specific where clauses', () => {
		it('should filter for null question_response for UNANSWERED segment', async () => {
			const ctx = createMockContext();
			const { mockWhere } = createMockQueryChain([]);

			await getChecklistSummaryDetail(ctx, {
				checklistId: 'checklist-1',
				claimId: 'claim-100',
				segment: SummarySegment.UNANSWERED,
			});

			expect(mockWhere).toHaveBeenCalledWith('question_response.id', 'is', null);
		});

		it('should apply complex where clause for ANSWERED segment', async () => {
			const ctx = createMockContext();
			const mockRows = [{ page_id: 1, question_id: 1, total_count: 10 }];
			const { mockWhere } = createMockQueryChain(mockRows);

			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: 'checklist-1',
				claimId: 'claim-100',
				segment: SummarySegment.ANSWERED,
			});

			expect(mockWhere).toHaveBeenCalled();
			expect(result.count).toBe(10);
		});

		it('should apply where clause for ACTION_REQUIRED segment', async () => {
			const ctx = createMockContext();
			const mockRows = [{ page_id: 1, question_id: 1, total_count: 5 }];
			const { mockWhere } = createMockQueryChain(mockRows);

			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: 'checklist-1',
				claimId: 'claim-100',
				segment: SummarySegment.ACTION_REQUIRED,
			});

			expect(mockWhere).toHaveBeenCalled();
			expect(result.count).toBe(5);
		});

		it('should apply where clause for NO_ACTION_REQUIRED segment', async () => {
			const ctx = createMockContext();
			const mockRows = [{ page_id: 1, question_id: 1, total_count: 7 }];
			const { mockWhere } = createMockQueryChain(mockRows);

			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: 'checklist-1',
				claimId: 'claim-100',
				segment: SummarySegment.NO_ACTION_REQUIRED,
			});

			expect(mockWhere).toHaveBeenCalled();
			expect(result.count).toBe(7);
		});

		it('should apply where clause for UNKNOWN segment', async () => {
			const ctx = createMockContext();
			const mockRows = [{ page_id: 1, question_id: 1, total_count: 2 }];
			const { mockWhere } = createMockQueryChain(mockRows);

			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: 'checklist-1',
				claimId: 'claim-100',
				segment: SummarySegment.UNKNOWN,
			});

			expect(mockWhere).toHaveBeenCalled();
			expect(result.count).toBe(2);
		});
	});
});
