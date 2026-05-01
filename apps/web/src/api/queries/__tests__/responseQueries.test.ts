import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { upsertQuestionResponses } from '../responseQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';
import type { QuestionResponse } from '@/types/types';

/**
 * Tests for upsertQuestionResponses - Change Detection & Clear Logic
 *
 * These tests verify:
 * 1. Skip update when response content is unchanged (change detection)
 * 2. Delete response when all fields are cleared
 *
 * Note: Passthrough tests (mock insert, expect insert called) were removed.
 * Integration tests will verify upsert behavior, document linking, and
 * audit logging with real database.
 */

// Mock the database module
vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
		insertInto: vi.fn(),
		updateTable: vi.fn(),
		deleteFrom: vi.fn(),
	},
}));

// Mock pageQueries
vi.mock('@/api/queries/pageQueries', () => ({
	modifyPageInstanceStatus: vi.fn().mockResolvedValue(undefined),
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
				role: 'Admin',
				client_id: clientId,
			},
		},
		db,
	}) as ProtectedContext;

const createMockResponse = (overrides: Partial<QuestionResponse> = {}): QuestionResponse => ({
	checklist_id: 'checklist-10',
	instance_id: 'instance-100',
	claim_id: 'claim-1000',
	question_id: 'question-50',
	response_text: null,
	response_doc_id: null,
	selected_answers: [],
	...overrides,
});

// Helper to create a mock query builder that supports the batched query patterns
function createMockQueryBuilder(options: {
	existingResponses?: Array<{
		id: number;
		question_id: number;
		response_text: string | null;
		response_doc_id: number | null;
		created_by: string;
		updated_by: string | null;
	}>;
	existingAnswers?: Array<{
		response_id: number;
		answer_id: number;
		label: string;
		additional_info: string | null;
	}>;
	questionInfo?: {
		total_question_count: string;
		answered_count: string;
		version: number;
		question_text?: string;
		page_label?: string;
	};
}) {
	const { existingResponses = [], existingAnswers = [], questionInfo } = options;

	return (table: string) => {
		// Batch fetch existing responses (question_response)
		if (table === 'question_response') {
			return {
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(existingResponses),
			} as any;
		}
		// Batch fetch existing answers (question_response_answer with join)
		if (table === 'question_response_answer') {
			return {
				innerJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(existingAnswers),
			} as any;
		}
		// Status query (page_instance) or question info
		if (table === 'page_instance' || table === 'question') {
			return {
				innerJoin: vi.fn().mockReturnThis(),
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				groupBy: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(
					questionInfo
						? [
								{
									question_id: 50,
									question_text: questionInfo.question_text || 'Sample question?',
									page_label: questionInfo.page_label || 'Page 1',
								},
							]
						: []
				),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue(
					questionInfo || {
						total_question_count: '10',
						answered_count: '5',
						version: 1,
					}
				),
			} as any;
		}
		return {
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue([]),
		} as any;
	};
}

describe('upsertQuestionResponses', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Change Detection', () => {
		it('should skip update when response content unchanged', async () => {
			const mockResponse = createMockResponse({
				response_text: 'Same answer',
				selected_answers: [],
			});

			// Existing response with same content
			const existingResponse = {
				id: 1,
				question_id: 50,
				response_text: 'Same answer',
				response_doc_id: null,
				created_by: 'user-123',
				updated_by: null,
			};

			// Mock selectFrom with batched query support
			vi.spyOn(db, 'selectFrom').mockImplementation(
				createMockQueryBuilder({
					existingResponses: [existingResponse],
					existingAnswers: [],
					questionInfo: {
						total_question_count: '10',
						answered_count: '5',
						version: 1,
					},
				}) as any
			);

			const mockInsertInto = vi.spyOn(db, 'insertInto').mockImplementation(
				() =>
					({
						values: vi.fn().mockReturnThis(),
						onConflict: vi.fn().mockReturnThis(),
						returningAll: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([]),
					}) as any
			);

			await upsertQuestionResponses(mockContext, [mockResponse]);

			// Should NOT insert because content is unchanged
			expect(mockInsertInto).not.toHaveBeenCalledWith('question_response');
		});
	});

	describe('Clear Response', () => {
		it('should delete response when all fields cleared', async () => {
			const mockResponse = createMockResponse({
				response_text: null,
				response_doc_id: null,
				selected_answers: [],
			});

			const existingResponse = {
				id: 1,
				question_id: 50,
				response_text: 'Original answer',
				response_doc_id: null,
				created_by: 'user-123',
				updated_by: null,
			};

			vi.spyOn(db, 'selectFrom').mockImplementation(
				createMockQueryBuilder({
					existingResponses: [existingResponse],
					existingAnswers: [],
					questionInfo: {
						total_question_count: '10',
						answered_count: '4',
						version: 1,
						question_text: 'Sample question?',
						page_label: 'Page 1',
					},
				}) as any
			);

			vi.spyOn(db, 'insertInto').mockImplementation(
				() =>
					({
						values: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([]),
					}) as any
			);

			const mockDeleteFrom = vi.spyOn(db, 'deleteFrom').mockImplementation(
				() =>
					({
						where: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([{ numDeletedRows: 1 }]),
					}) as any
			);

			await upsertQuestionResponses(mockContext, [mockResponse]);

			// Should delete the question_response when all fields are cleared
			expect(mockDeleteFrom).toHaveBeenCalledWith('question_response');
		});
	});
});
