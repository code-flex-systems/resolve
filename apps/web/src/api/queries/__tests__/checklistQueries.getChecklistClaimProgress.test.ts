import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getChecklistClaimProgress } from '../checklistQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';

/**
 * Tests for getChecklistClaimProgress - Null/Edge Case Handling
 *
 * These tests verify the function handles edge cases gracefully:
 * 1. Null result from database
 * 2. Undefined count fields
 * 3. Invalid numeric strings (NaN handling)
 *
 * Note: Passthrough tests (mock count=10, expect count=10) were removed.
 * Integration tests will verify the recursive CTE logic, cycle detection,
 * and conditional page unlocking with real database.
 */

describe('getChecklistClaimProgress', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = {
			session: {
				user: {
					id: 'user-123',
					clerkId: 'clerk_user_123',
					name: 'Test User',
					email: 'test@example.com',
					phone: null,
					client_id: 'client-abc',
					role: 'user',
				},
			},
			db,
		};
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Null/Edge Case Handling', () => {
		it('should handle null result gracefully', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue(null);

			vi.spyOn(db, 'withRecursive').mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			} as any);

			const result = await getChecklistClaimProgress(mockContext, 'checklist-1', 'claim-100');

			expect(result).toEqual({
				answerCount: 0,
				totalQuestionCount: 0,
			});
		});

		it('should handle undefined count fields gracefully', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				total_question_count: undefined,
				answered_count: undefined,
			});

			vi.spyOn(db, 'withRecursive').mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			} as any);

			const result = await getChecklistClaimProgress(mockContext, 'checklist-1', 'claim-100');

			expect(result).toEqual({
				answerCount: 0,
				totalQuestionCount: 0,
			});
		});

		it('should handle invalid numeric strings gracefully', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				total_question_count: 'not-a-number',
				answered_count: 'also-not-a-number',
			});

			vi.spyOn(db, 'withRecursive').mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			} as any);

			const result = await getChecklistClaimProgress(mockContext, 'checklist-1', 'claim-100');

			// parseInt('not-a-number') returns NaN, which is coerced to 0 by || operator
			expect(result.answerCount).toBe(0);
			expect(result.totalQuestionCount).toBe(0);
		});
	});
});
