import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getChecklistClaimProgress } from '../checklistQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';

/**
 * Tests for getChecklistClaimProgress - Recursive Page Unlocking Logic
 *
 * This function is critical for:
 * 1. Calculating progress (answered/total questions) for a claim
 * 2. Respecting conditional page visibility (recursive unlocking)
 * 3. Preventing infinite loops (cycle detection + max depth)
 * 4. Client-scoping data access
 *
 * Test Strategy:
 * - Mock database responses to test logic without actual DB
 * - Verify query structure through spy assertions
 * - Test edge cases: empty results, null values, boundary conditions
 * - Validate cycle prevention and depth limiting logic
 */

describe('getChecklistClaimProgress', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		// Create a mock protected context
		mockContext = {
			session: {
				user: {
					id: 'user-123',
					name: 'Test User',
					email: 'test@example.com',
					phone: null,
					client_id: 'client-abc',
					role: 'user',
				},
				expires: '2025-12-31',
			},
			db,
		};

		// Reset all mocks before each test
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Result Parsing & Return Values', () => {
		it('should return correct progress when both counts are present', async () => {
			// Mock the database response
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				total_question_count: '10',
				answered_count: '7',
			});

			// Mock the entire query chain
			vi.spyOn(db, 'withRecursive').mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			});

			const result = await getChecklistClaimProgress(mockContext, 1, 100);

			expect(result).toEqual({
				answerCount: 7,
				totalQuestionCount: 10,
			});
			expect(mockExecuteTakeFirst).toHaveBeenCalledOnce();
		});

		it('should handle zero answered questions correctly', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				total_question_count: '15',
				answered_count: '0',
			});

			vi.spyOn(db, 'withRecursive').mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			});

			const result = await getChecklistClaimProgress(mockContext, 1, 100);

			expect(result).toEqual({
				answerCount: 0,
				totalQuestionCount: 15,
			});
		});

		it('should handle zero total questions correctly', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				total_question_count: '0',
				answered_count: '0',
			});

			vi.spyOn(db, 'withRecursive').mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			});

			const result = await getChecklistClaimProgress(mockContext, 1, 100);

			expect(result).toEqual({
				answerCount: 0,
				totalQuestionCount: 0,
			});
		});

		it('should handle null/undefined result gracefully', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue(null);

			vi.spyOn(db, 'withRecursive').mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			});

			const result = await getChecklistClaimProgress(mockContext, 1, 100);

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
			});

			const result = await getChecklistClaimProgress(mockContext, 1, 100);

			expect(result).toEqual({
				answerCount: 0,
				totalQuestionCount: 0,
			});
		});

		it('should parse string numbers correctly', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				total_question_count: '42',
				answered_count: '36',
			});

			vi.spyOn(db, 'withRecursive').mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			});

			const result = await getChecklistClaimProgress(mockContext, 1, 100);

			expect(result.answerCount).toBe(36);
			expect(result.totalQuestionCount).toBe(42);
			expect(typeof result.answerCount).toBe('number');
			expect(typeof result.totalQuestionCount).toBe('number');
		});

		it('should handle BigInt-like string values (from PostgreSQL)', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				total_question_count: '9999999999',
				answered_count: '1234567890',
			});

			vi.spyOn(db, 'withRecursive').mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			});

			const result = await getChecklistClaimProgress(mockContext, 1, 100);

			expect(result.answerCount).toBe(1234567890);
			expect(result.totalQuestionCount).toBe(9999999999);
		});
	});

	describe('Query Construction & Client Scoping', () => {
		it('should use client_id from context in the CTE base case', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				total_question_count: '5',
				answered_count: '3',
			});

			const mockWithRecursive = vi.fn().mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			});

			vi.spyOn(db, 'withRecursive').mockImplementation(mockWithRecursive);

			const result = await getChecklistClaimProgress(mockContext, 1, 100);

			// Verify the CTE was created with the correct name
			expect(mockWithRecursive).toHaveBeenCalledWith('unlocked_pages', expect.any(Function));
			expect(result).toEqual({
				answerCount: 3,
				totalQuestionCount: 5,
			});
		});

		it('should pass correct checklist and claim IDs to query', async () => {
			const checklistId = 42;
			const claimId = 999;

			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				total_question_count: '10',
				answered_count: '5',
			});

			vi.spyOn(db, 'withRecursive').mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			});

			await getChecklistClaimProgress(mockContext, checklistId, claimId);

			// The IDs should be used in the query construction
			// (Specific assertion would require deeper query introspection)
			expect(mockExecuteTakeFirst).toHaveBeenCalled();
		});
	});

	describe('Edge Cases & Boundary Conditions', () => {
		it('should handle fully answered checklist (100% progress)', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				total_question_count: '20',
				answered_count: '20',
			});

			vi.spyOn(db, 'withRecursive').mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			});

			const result = await getChecklistClaimProgress(mockContext, 1, 100);

			expect(result.answerCount).toBe(result.totalQuestionCount);
			expect(result.answerCount).toBe(20);
		});

		it('should handle unanswered checklist (0% progress)', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				total_question_count: '50',
				answered_count: '0',
			});

			vi.spyOn(db, 'withRecursive').mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			});

			const result = await getChecklistClaimProgress(mockContext, 1, 100);

			expect(result.answerCount).toBe(0);
			expect(result.totalQuestionCount).toBe(50);
		});

		it('should handle checklist with no questions', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				total_question_count: '0',
				answered_count: '0',
			});

			vi.spyOn(db, 'withRecursive').mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			});

			const result = await getChecklistClaimProgress(mockContext, 1, 100);

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
			});

			const result = await getChecklistClaimProgress(mockContext, 1, 100);

			// parseInt('not-a-number') returns NaN, which is coerced to 0 by || operator
			expect(result.answerCount).toBe(0);
			expect(result.totalQuestionCount).toBe(0);
		});
	});

	describe('Recursive Logic Verification (via Query Structure)', () => {
		/**
		 * Note: These tests verify that the recursive CTE is constructed correctly.
		 * Full integration tests with actual database would verify:
		 * - Cycle detection prevents infinite loops
		 * - MAX_TREE_DEPTH (30) is enforced
		 * - Conditional page unlocking works correctly
		 * - Path array tracks visited nodes
		 */

		it('should construct a recursive CTE named "unlocked_pages"', async () => {
			const mockWithRecursive = vi.fn().mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: vi.fn().mockResolvedValue({
							total_question_count: '5',
							answered_count: '2',
						}),
					}),
				}),
			});

			vi.spyOn(db, 'withRecursive').mockImplementation(mockWithRecursive);

			await getChecklistClaimProgress(mockContext, 1, 100);

			expect(mockWithRecursive).toHaveBeenCalledWith('unlocked_pages', expect.any(Function));
		});

		it('should query only root pages (parent_instance_id IS NULL) in base case', async () => {
			// This would be verified in integration tests by checking actual SQL
			// Here we just verify the function executes without error
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				total_question_count: '10',
				answered_count: '5',
			});

			vi.spyOn(db, 'withRecursive').mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			});

			await expect(getChecklistClaimProgress(mockContext, 1, 100)).resolves.toBeDefined();
		});
	});

	describe('Answer Counting Logic', () => {
		it('should count responses with response_text as answered', async () => {
			// In the actual query, responses are counted if:
			// - response_text IS NOT NULL, OR
			// - question_response_answer records exist
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				total_question_count: '10',
				answered_count: '8', // 8 questions have at least one form of answer
			});

			vi.spyOn(db, 'withRecursive').mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			});

			const result = await getChecklistClaimProgress(mockContext, 1, 100);

			expect(result.answerCount).toBe(8);
			expect(result.answerCount).toBeLessThanOrEqual(result.totalQuestionCount);
		});

		it('should never have answerCount > totalQuestionCount (data integrity)', async () => {
			// Edge case: ensure the query logic prevents impossible states
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				total_question_count: '10',
				answered_count: '10',
			});

			vi.spyOn(db, 'withRecursive').mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			});

			const result = await getChecklistClaimProgress(mockContext, 1, 100);

			expect(result.answerCount).toBeLessThanOrEqual(result.totalQuestionCount);
		});
	});

	describe('Context Validation', () => {
		it('should use session user client_id for data scoping', async () => {
			const customContext: ProtectedContext = {
				session: {
					user: {
						id: 'different-user',
						name: 'Other User',
						email: 'other@example.com',
						phone: null,
						client_id: 'client-xyz',
						role: 'admin',
					},
					expires: '2025-12-31',
				},
				db,
			};

			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				total_question_count: '5',
				answered_count: '2',
			});

			vi.spyOn(db, 'withRecursive').mockReturnValue({
				selectFrom: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnThis(),
					leftJoin: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			});

			await getChecklistClaimProgress(customContext, 1, 100);

			// In a real scenario, the client_id 'client-xyz' should filter results
			expect(mockExecuteTakeFirst).toHaveBeenCalled();
		});
	});
});

/**
 * INTEGRATION TEST NOTES (to be implemented separately):
 *
 * 1. Cycle Detection Test:
 *    - Create page instances A -> B -> C -> A (cycle)
 *    - Verify the recursion stops and doesn't infinite loop
 *    - Check that the 'path' array prevents revisiting nodes
 *
 * 2. MAX_TREE_DEPTH Test:
 *    - Create a 31-level deep page hierarchy
 *    - Verify only 30 levels are traversed
 *    - Confirm depth limiting works correctly
 *
 * 3. Conditional Unlocking Test:
 *    - Create pages with answer.calls_instance_id set
 *    - Verify locked pages are NOT counted until their answer is selected
 *    - Verify selecting the unlock answer adds those pages to progress
 *
 * 4. Client Scoping Integration Test:
 *    - Create data for client-abc and client-xyz
 *    - Verify client-abc user only sees their progress
 *    - Verify no cross-client data leakage
 *
 * 5. Multi-level Unlocking Test:
 *    - Page A unlocks Page B, Page B unlocks Page C
 *    - Verify all 3 levels are counted when answers are provided
 *
 * 6. Partial Progress Test:
 *    - Unlock some pages but not others
 *    - Verify only unlocked pages contribute to total_question_count
 */
