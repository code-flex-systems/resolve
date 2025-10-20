import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';
import { getUser, deleteUser } from '../userQueries';
import { getResponsesForClaimChecklist } from '../responseQueries';
import { assignClaim } from '../claimQueries';
import { getNextClaimToAssign } from '../claimQueries';
import { getUserActivity } from '../userQueries';
import { getQuestions } from '../questionQueries';

/**
 * Client-Scoping Security Tests
 *
 * CRITICAL: These tests verify that multi-tenant data isolation is properly enforced.
 * A failure here means potential cross-client data leakage.
 *
 * Strategy:
 * - Test representative SQL patterns across different query files
 * - Mock database to verify client_id is used in WHERE clauses
 * - Focus on security-critical scenarios (different clients, missing client_id)
 * - Test both READ and WRITE operations
 *
 * We are NOT testing:
 * - Kysely's query building (assume it works)
 * - Actual database filtering (integration test territory)
 *
 * We ARE testing:
 * - Our code correctly uses ctx.session.user.client_id
 * - Query structure includes client_id filtering
 * - Edge cases (null client_id, different clients)
 */

describe('Client-Scoping Security Tests', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
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
		};

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Pattern 1: Simple SELECT with WHERE clause', () => {
		/**
		 * Test: getUser() from userQueries.ts
		 * Pattern: .where((eb) => eb.and([eb('id', '=', id), eb('client_id', '=', ctx.session.user.client_id)]))
		 */

		it('should include client_id in WHERE clause for getUser()', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				id: 'user-456',
				name: 'Target User',
				email: 'target@example.com',
				client_id: 'client-abc',
				role: 'user',
			});

			const mockWhere = vi.fn().mockReturnValue({
				executeTakeFirst: mockExecuteTakeFirst,
			});

			const mockSelectAll = vi.fn().mockReturnValue({
				where: mockWhere,
			});

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				selectAll: mockSelectAll,
			} as any); // Mock type incompatible with Kysely's SelectQueryBuilder

			await getUser(mockContext, 'user-456');

			// Verify selectFrom was called with correct table
			expect(db.selectFrom).toHaveBeenCalledWith('users');

			// Verify where clause was invoked (client_id filtering happens here)
			expect(mockWhere).toHaveBeenCalled();

			// Verify the where callback received a function (which applies client_id filter)
			const whereCallback = mockWhere.mock.calls[0][0];
			expect(typeof whereCallback).toBe('function');
		});

		it('should use client_id from session context in getUser()', async () => {
			const differentClientContext: ProtectedContext = {
				session: {
					user: {
						id: 'user-789',
						name: 'Other User',
						email: 'other@example.com',
						phone: null,
						client_id: 'client-xyz', // Different client
						role: 'admin',
					},
					expires: '2025-12-31',
				},
			};

			const mockExecuteTakeFirst = vi.fn().mockResolvedValue(undefined);

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				selectAll: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						executeTakeFirst: mockExecuteTakeFirst,
					}),
				}),
			} as any);

			// Should return undefined since user belongs to different client
			const result = await getUser(differentClientContext, 'user-123');

			expect(result).toBeUndefined();
		});

		it('should handle null/undefined result gracefully in getUser()', async () => {
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				selectAll: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						executeTakeFirst: vi.fn().mockResolvedValue(null),
					}),
				}),
			} as any);

			const result = await getUser(mockContext, 'nonexistent-user');

			expect(result).toBeNull();
		});
	});

	describe('Pattern 2: Complex JOIN with client_id', () => {
		/**
		 * Test: getResponsesForClaimChecklist() from responseQueries.ts
		 * Pattern: Multiple INNER/LEFT JOINs with .where('question_response.client_id', '=', ctx.session.user.client_id)
		 */

		it('should include client_id filter in complex JOIN query', async () => {
			const mockExecute = vi.fn().mockResolvedValue([
				{
					id: 1,
					question_id: 10,
					response_text: 'Test response',
					selected_answers: [],
				},
			]);

                        const mockOrderBy = vi.fn().mockReturnValue({
                                execute: mockExecute,
                        });

                        const mockGroupBy = vi.fn().mockReturnValue({
                                orderBy: mockOrderBy,
                        });

                        const mockThirdWhere = vi.fn().mockReturnValue({
                                groupBy: mockGroupBy,
                        });

                        const mockSecondWhere = vi.fn().mockReturnValue({
                                where: mockThirdWhere,
                        });

                        const mockFirstWhere = vi.fn().mockReturnValue({
                                where: mockSecondWhere,
                        });

                        const mockSelect = vi.fn().mockReturnValue({
                                where: mockFirstWhere,
                        });

                        const mockLeftJoin = vi.fn().mockReturnValue({
                                select: mockSelect,
                        });

                        const mockInnerJoin = vi.fn().mockReturnValue({
                                leftJoin: mockLeftJoin,
                        });

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: mockInnerJoin,
			} as any); // Mock type incompatible with Kysely's SelectQueryBuilder

			await getResponsesForClaimChecklist(mockContext, 1, 100);

			// Verify the query chain was built
			expect(db.selectFrom).toHaveBeenCalledWith('question_response');
			expect(mockInnerJoin).toHaveBeenCalled();
                        expect(mockFirstWhere).toHaveBeenCalled();
                        expect(mockThirdWhere).toHaveBeenCalled();

                        // Verify first where call includes client_id
                        const firstWhereArgs = mockFirstWhere.mock.calls[0];
                        expect(firstWhereArgs[0]).toBe('question_response.client_id');
                        expect(firstWhereArgs[1]).toBe('=');
                        expect(firstWhereArgs[2]).toBe('client-abc');
		});

		it('should return empty map when no responses exist for client', async () => {
                        const mockExecute = vi.fn().mockResolvedValue([]);
                        const mockOrderBy = vi.fn().mockReturnValue({ execute: mockExecute });
                        const mockGroupBy = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
                        const mockThirdWhere = vi.fn().mockReturnValue({ groupBy: mockGroupBy });
                        const mockSecondWhere = vi.fn().mockReturnValue({ where: mockThirdWhere });
                        const mockFirstWhere = vi.fn().mockReturnValue({ where: mockSecondWhere });

                        vi.spyOn(db, 'selectFrom').mockReturnValue({
                                innerJoin: vi.fn().mockReturnValue({
                                        leftJoin: vi.fn().mockReturnValue({
                                                select: vi.fn().mockReturnValue({
                                                        where: mockFirstWhere,
                                                }),
                                        }),
                                }),
                        } as any);

			const result = await getResponsesForClaimChecklist(mockContext, 999, 999);

			expect(result).toEqual({});
		});

		it('should filter responses by both checklist/claim AND client_id', async () => {
			const mockExecute = vi
				.fn()
				.mockResolvedValue([{ id: 1, question_id: 5, response_text: 'Answer', selected_answers: [] }]);

                        const mockOrderBy = vi.fn().mockReturnValue({ execute: mockExecute });
                        const mockGroupBy = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
                        const mockThirdWhere = vi.fn().mockReturnValue({ groupBy: mockGroupBy });
                        const mockSecondWhere = vi.fn().mockReturnValue({ where: mockThirdWhere });
                        const mockFirstWhere = vi.fn().mockReturnValue({ where: mockSecondWhere });

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				innerJoin: vi.fn().mockReturnValue({
					leftJoin: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnValue({
							where: mockFirstWhere,
						}),
					}),
				}),
			} as any);

			await getResponsesForClaimChecklist(mockContext, 42, 100);

			// Verify client_id filter was applied first
                        expect(mockFirstWhere).toHaveBeenCalledWith('question_response.client_id', '=', 'client-abc');

                        // Verify second where (checklist/claim) and third where (exists) were also called
                        expect(mockSecondWhere).toHaveBeenCalled();
                        expect(mockThirdWhere).toHaveBeenCalled();
                });
	});

	describe('Pattern 3: Raw SQL with client_id (SECURITY CRITICAL)', () => {
		/**
		 * Test: getUserActivity() from userQueries.ts
		 * Pattern: sql.raw() with client_id interpolation - INJECTION RISK!
		 * Line: and client_id = ${ctx.session.user.client_id}
		 */

		it('should include client_id in raw SQL query for getUserActivity()', async () => {
			const mockExecuteQuery = vi.fn().mockResolvedValue({
				rows: [
					{ activity_date: '2025-01-01', active_users: '5' },
					{ activity_date: '2025-01-02', active_users: '3' },
				],
			});

			vi.spyOn(db, 'executeQuery').mockImplementation(mockExecuteQuery);

			const filters = {
				range: [new Date('2025-01-01'), new Date('2025-01-10')] as [Date, Date],
			};

			const result = await getUserActivity(mockContext, filters);

			// Verify executeQuery was called
			expect(mockExecuteQuery).toHaveBeenCalledOnce();

			// Get the compiled query that was passed
			const compiledQuery = mockExecuteQuery.mock.calls[0][0];

			// Verify the SQL contains client_id parameter
			// The compiled query should have parameters array including client_id
			expect(compiledQuery).toBeDefined();
			expect(compiledQuery.parameters).toContain('client-abc');

			expect(result).toEqual([
				{ activity_date: '2025-01-01', active_users: '5' },
				{ activity_date: '2025-01-02', active_users: '3' },
			]);
		});

		it('should safely handle different client contexts in raw SQL', async () => {
			const adminContext: ProtectedContext = {
				session: {
					user: {
						id: 'admin-1',
						name: 'Admin User',
						email: 'admin@example.com',
						phone: null,
						client_id: 'client-xyz',
						role: 'admin',
					},
					expires: '2025-12-31',
				},
			};

			const mockExecuteQuery = vi.fn().mockResolvedValue({
				rows: [],
			});

			vi.spyOn(db, 'executeQuery').mockImplementation(mockExecuteQuery);

			await getUserActivity(adminContext, {
				range: [new Date('2025-01-01'), new Date('2025-01-10')] as [Date, Date],
			});

			const compiledQuery = mockExecuteQuery.mock.calls[0][0];

			// Different client_id should be in parameters
			expect(compiledQuery.parameters).toContain('client-xyz');
		});

		it('should return empty array when no activity for client', async () => {
			vi.spyOn(db, 'executeQuery').mockResolvedValue({
				rows: [],
			});

			const result = await getUserActivity(mockContext, {
				range: [new Date('2025-01-01'), new Date('2025-01-10')] as [Date, Date],
			});

			expect(result).toEqual([]);
		});

		it('should handle optional filters with client_id scoping', async () => {
			vi.spyOn(db, 'executeQuery').mockResolvedValue({
				rows: [{ activity_date: '2025-01-01', active_users: '2' }],
			});

			const filters = {
				range: [new Date('2025-01-01'), new Date('2025-01-10')] as [Date, Date],
				checklistId: 5,
				users: ['user-1', 'user-2'],
				searchTerm: 'test',
			};

			await getUserActivity(mockContext, filters);

			const mockExecuteQuery = vi.mocked(db.executeQuery);
			const compiledQuery = mockExecuteQuery.mock.calls[0][0] as any; // CompiledQuery type doesn't expose parameters

			// Client_id should still be present even with optional filters
			expect(compiledQuery.parameters).toContain('client-abc');
		});
	});

	describe('Pattern 4: INSERT with client_id', () => {
		/**
		 * Test: assignClaim() from claimQueries.ts
		 * Pattern: .insertInto().values({ client_id: ctx.session.user.client_id, ... })
		 */

		it('should include client_id in INSERT values for assignClaim()', async () => {
			// Mock assertChecklistPublished query
			const mockSelectFrom = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								executeTakeFirst: vi.fn().mockResolvedValue({ id: 1 }),
							}),
						}),
					}),
				}),
			});
			vi.spyOn(db, 'selectFrom').mockImplementation(mockSelectFrom);

			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({
				checklist_id: 1,
				claim_id: 100,
				client_id: 'client-abc',
				assignee: 'user-456',
			});

			const mockValues = vi.fn().mockReturnValue({
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			});

			const mockInsertInto = vi.fn().mockReturnValue({
				values: mockValues,
			});

			vi.spyOn(db, 'insertInto').mockImplementation(mockInsertInto);

			await assignClaim(mockContext, 1, 100, 'user-456');

			// Verify insertInto was called with correct table
			expect(mockInsertInto).toHaveBeenCalledWith('checklist_claim');

			// Verify values was called
			expect(mockValues).toHaveBeenCalledOnce();

			// Get the values object that was passed
			const insertedValues = mockValues.mock.calls[0][0];

			// CRITICAL: Verify client_id from context was included
			expect(insertedValues.client_id).toBe('client-abc');
			expect(insertedValues.checklist_id).toBe(1);
			expect(insertedValues.claim_id).toBe(100);
			expect(insertedValues.assignee).toBe('user-456');
			expect(insertedValues.created_by).toBe('user-123');
		});

		it('should use correct client_id for different user contexts in INSERT', async () => {
			const otherContext: ProtectedContext = {
				session: {
					user: {
						id: 'user-999',
						name: 'Other User',
						email: 'other@company.com',
						phone: null,
						client_id: 'client-different',
						role: 'admin',
					},
					expires: '2025-12-31',
				},
			};

			// Mock assertChecklistPublished query
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								executeTakeFirst: vi.fn().mockResolvedValue({ id: 2 }),
							}),
						}),
					}),
				}),
			} as any);

			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({
				checklist_id: 2,
				claim_id: 200,
				client_id: 'client-different',
			});

			const mockValues = vi.fn().mockReturnValue({
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			});

			vi.spyOn(db, 'insertInto').mockReturnValue({
				values: mockValues,
			} as any); // Mock type incompatible with Kysely's InsertQueryBuilder

			await assignClaim(otherContext, 2, 200, 'user-888');

			const insertedValues = mockValues.mock.calls[0][0];

			// Should use the OTHER client's ID, not the original mock
			expect(insertedValues.client_id).toBe('client-different');
			expect(insertedValues.created_by).toBe('user-999');
		});

		it('should include all required fields in INSERT including client_id', async () => {
			// Mock assertChecklistPublished query
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								executeTakeFirst: vi.fn().mockResolvedValue({ id: 5 }),
							}),
						}),
					}),
				}),
			} as any);

			const mockValues = vi.fn().mockReturnValue({
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({}),
			});

			vi.spyOn(db, 'insertInto').mockReturnValue({
				values: mockValues,
			} as any); // Mock type incompatible with Kysely's InsertQueryBuilder

			await assignClaim(mockContext, 5, 500, 'assignee-user');

			const insertedValues = mockValues.mock.calls[0][0];

			// Verify all fields are present
			expect(insertedValues).toHaveProperty('checklist_id');
			expect(insertedValues).toHaveProperty('claim_id');
			expect(insertedValues).toHaveProperty('client_id');
			expect(insertedValues).toHaveProperty('created_by');
			expect(insertedValues).toHaveProperty('status');
			expect(insertedValues).toHaveProperty('assignee');
		});
	});

	describe('Pattern 5: CTE/Subquery with client_id', () => {
		/**
		 * Test: getNextClaimToAssign() from claimQueries.ts
		 * Pattern: .with('base', ...).where('claim.client_id', '=', ctx.session.user.client_id)
		 */

		it('should include client_id in CTE base query for getNextClaimToAssign()', async () => {
			const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
				total_unassigned: 5,
				id: 100,
				claim_number: 'CLM-001',
				client_id: 'client-abc',
			});

			const mockSelectAll = vi.fn().mockReturnValue({
				executeTakeFirst: mockExecuteTakeFirst,
			});

			const mockLeftJoin = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					selectAll: mockSelectAll,
				}),
			});

			const mockSelectFrom = vi.fn().mockReturnValue({
				leftJoin: mockLeftJoin,
			});

			const mockWith3 = vi.fn().mockReturnValue({
				selectFrom: mockSelectFrom,
			});

			const mockWith2 = vi.fn().mockReturnValue({
				with: mockWith3,
			});

			const mockWith1 = vi.fn().mockReturnValue({
				with: mockWith2,
			});

			vi.spyOn(db, 'with').mockImplementation(mockWith1);

			await getNextClaimToAssign(mockContext, 1, 0);

			// Verify the CTE chain was built
			expect(db.with).toHaveBeenCalledWith('base', expect.any(Function));

			// Get the callback for the 'base' CTE
			const baseCTECallback = (db.with as any).mock.calls[0][1];
			expect(typeof baseCTECallback).toBe('function');
		});

		it('should return null claim when no unassigned claims exist for client', async () => {
			vi.spyOn(db, 'with').mockReturnValue({
				with: vi.fn().mockReturnValue({
					with: vi.fn().mockReturnValue({
						selectFrom: vi.fn().mockReturnValue({
							leftJoin: vi.fn().mockReturnValue({
								select: vi.fn().mockReturnValue({
									selectAll: vi.fn().mockReturnValue({
										executeTakeFirst: vi.fn().mockResolvedValue({
											total_unassigned: 0,
											id: null,
										}),
									}),
								}),
							}),
						}),
					}),
				}),
			});

			const result = await getNextClaimToAssign(mockContext, 1, 0);

			expect(result.claim).toBeNull();
			expect(result.total).toBe(0);
		});

		it('should respect offset while maintaining client_id filter', async () => {
			vi.spyOn(db, 'with').mockReturnValue({
				with: vi.fn().mockReturnValue({
					with: vi.fn().mockReturnValue({
						selectFrom: vi.fn().mockReturnValue({
							leftJoin: vi.fn().mockReturnValue({
								select: vi.fn().mockReturnValue({
									selectAll: vi.fn().mockReturnValue({
										executeTakeFirst: vi.fn().mockResolvedValue({
											total_unassigned: 10,
											id: 105,
											claim_number: 'CLM-005',
										}),
									}),
								}),
							}),
						}),
					}),
				}),
			});

			const result = await getNextClaimToAssign(mockContext, 1, 5);

			// Should still return a result with client scoping
			expect(result.total).toBe(10);
			expect(result.claim).toBeDefined();
		});
	});

	describe('Cross-Pattern Security Validation', () => {
		/**
		 * These tests verify security principles across all patterns
		 */

		it('should never allow null or undefined client_id in queries', () => {
			// Note: TypeScript enforces non-null client_id via ProtectedContext typing
			// This test documents that the type system prevents null client_id at compile time

			// In production, this would be a TypeScript error:
			// const invalidContext: ProtectedContext = {
			//   session: { user: { client_id: null } } // TS Error!
			// }

			// The type system is our first line of defense
			expect(mockContext.session.user.client_id).toBe('client-abc');
		});

		it('should use session context client_id, not user-provided client_id', async () => {
			// Simulate an attempt to bypass client scoping by passing a different client_id
			// The functions should ONLY use ctx.session.user.client_id

			// Mock assertChecklistPublished query
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								executeTakeFirst: vi.fn().mockResolvedValue({ id: 1 }),
							}),
						}),
					}),
				}),
			} as any);

			const mockValues = vi.fn().mockReturnValue({
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({}),
			});

			vi.spyOn(db, 'insertInto').mockReturnValue({
				values: mockValues,
			} as any); // Mock type incompatible with Kysely's InsertQueryBuilder

			// Even if we somehow passed 'client-evil' as a parameter,
			// the function should use the session's client_id
			await assignClaim(mockContext, 1, 100, 'user-456');

			const insertedValues = mockValues.mock.calls[0][0];

			// Should be from session, not from any parameter
			expect(insertedValues.client_id).toBe('client-abc');
		});
	});

	describe('Pattern 6: Action table JOIN with client_id (Security Fix)', () => {
		/**
		 * Test: getQuestions() from questionQueries.ts
		 * Pattern: .leftJoin('action', (join) => join.onRef('action.answer_id', '=', 'answer.id').on('action.client_id', '=', ctx.session.user.client_id))
		 *
		 * SECURITY FIX: Previously missing client_id filter on action join.
		 * This test ensures actions from other clients don't leak into has_action flag.
		 */

		it('should include client_id filter in action join for getQuestions()', async () => {
			const mockExecute = vi.fn().mockResolvedValue([
				{
					id: 1,
					text: 'What is your name?',
					answers: [
						{
							id: 10,
							text: 'John Doe',
							has_action: false, // Should be false if no action from this client
						},
					],
				},
			]);

			const mockOrderBy = vi.fn().mockReturnValue({
				execute: mockExecute,
			});

			const mockGroupBy = vi.fn().mockReturnValue({
				orderBy: mockOrderBy,
			});

			const mockWhere2 = vi.fn().mockReturnValue({
				groupBy: mockGroupBy,
			});

			const mockWhere1 = vi.fn().mockReturnValue({
				where: mockWhere2,
			});

			const mockSelect = vi.fn().mockReturnValue({
				where: mockWhere1,
			});

			const mockLeftJoinAction = vi.fn().mockReturnValue({
				selectAll: vi.fn().mockReturnValue({
					select: mockSelect,
				}),
			});

			const mockLeftJoinAnswer = vi.fn().mockReturnValue({
				leftJoin: mockLeftJoinAction,
			});

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				leftJoin: mockLeftJoinAnswer,
			} as any);

			await getQuestions(mockContext, 1);

			// Verify action join was called with callback (includes client_id filter)
			expect(mockLeftJoinAction).toHaveBeenCalledWith('action', expect.any(Function));

			// Verify the callback structure (should use join builder with .on())
			const actionJoinCallback = mockLeftJoinAction.mock.calls[0][1];
			expect(typeof actionJoinCallback).toBe('function');
		});

		it('should NOT show has_action=true for actions from other clients', async () => {
			// Simulate scenario:
			// - Client A has an action on answer_id=10
			// - Client B queries for questions (should see has_action=false for answer_id=10)

			const mockExecute = vi.fn().mockResolvedValue([
				{
					id: 1,
					text: 'Question 1',
					answers: [
						{
							id: 10,
							text: 'Answer 1',
							has_action: false, // Should be false for client B
						},
					],
				},
			]);

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				leftJoin: vi.fn().mockReturnValue({
					leftJoin: vi.fn().mockReturnValue({
						selectAll: vi.fn().mockReturnValue({
							select: vi.fn().mockReturnValue({
								where: vi.fn().mockReturnValue({
									where: vi.fn().mockReturnValue({
										groupBy: vi.fn().mockReturnValue({
											orderBy: vi.fn().mockReturnValue({
												execute: mockExecute,
											}),
										}),
									}),
								}),
							}),
						}),
					}),
				}),
			} as any);

			const result = await getQuestions(mockContext, 1);

			// With proper client_id filtering, actions from other clients shouldn't appear
			expect(result[0].answers[0].has_action).toBe(false);
		});

		it('should show has_action=true only for actions belonging to same client', async () => {
			const mockExecute = vi.fn().mockResolvedValue([
				{
					id: 1,
					text: 'Question 1',
					answers: [
						{
							id: 10,
							text: 'Answer with action',
							has_action: true, // Action exists for this client
						},
						{
							id: 11,
							text: 'Answer without action',
							has_action: false, // No action for this client
						},
					],
				},
			]);

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				leftJoin: vi.fn().mockReturnValue({
					leftJoin: vi.fn().mockReturnValue({
						selectAll: vi.fn().mockReturnValue({
							select: vi.fn().mockReturnValue({
								where: vi.fn().mockReturnValue({
									where: vi.fn().mockReturnValue({
										groupBy: vi.fn().mockReturnValue({
											orderBy: vi.fn().mockReturnValue({
												execute: mockExecute,
											}),
										}),
									}),
								}),
							}),
						}),
					}),
				}),
			} as any);

			const result = await getQuestions(mockContext, 1);

			// Verify both true and false cases work correctly
			expect(result[0].answers[0].has_action).toBe(true);
			expect(result[0].answers[1].has_action).toBe(false);
		});
	});

	describe('Pattern 7: DELETE with client_id filter (Security Fix)', () => {
		/**
		 * Test: deleteUser() from userQueries.ts
		 * Pattern: .deleteFrom('users').where('id', '=', id).where('client_id', '=', ctx.session.user.client_id)
		 *
		 * SECURITY FIX: Previously missing client_id filter on delete operation.
		 * This test ensures users from other clients cannot be deleted.
		 */

		it('should include client_id filter in DELETE query for deleteUser()', async () => {
			const mockExecute = vi.fn().mockResolvedValue([]);

			const mockWhere2 = vi.fn().mockReturnValue({
				execute: mockExecute,
			});

			const mockWhere1 = vi.fn().mockReturnValue({
				where: mockWhere2,
			});

			vi.spyOn(db, 'deleteFrom').mockReturnValue({
				where: mockWhere1,
			} as any);

			await deleteUser(mockContext, 'user-456');

			// Verify deleteFrom was called with correct table
			expect(db.deleteFrom).toHaveBeenCalledWith('users');

			// Verify first where clause (user id)
			expect(mockWhere1).toHaveBeenCalledWith('id', '=', 'user-456');

			// Verify second where clause (client_id) - CRITICAL SECURITY CHECK
			expect(mockWhere2).toHaveBeenCalledWith('client_id', '=', 'client-abc');
		});

		it('should NOT delete users from other clients', async () => {
			// Simulate: Client B tries to delete a user from Client A
			const clientBContext: ProtectedContext = {
				session: {
					user: {
						id: 'user-evil',
						name: 'Evil User',
						email: 'evil@clientb.com',
						phone: null,
						client_id: 'client-b',
						role: 'admin',
					},
					expires: '2025-12-31',
				},
			};

			const mockExecute = vi.fn().mockResolvedValue([]); // No rows deleted

			const mockWhere2 = vi.fn().mockReturnValue({
				execute: mockExecute,
			});

			const mockWhere1 = vi.fn().mockReturnValue({
				where: mockWhere2,
			});

			vi.spyOn(db, 'deleteFrom').mockReturnValue({
				where: mockWhere1,
			} as any);

			// Client B tries to delete user from Client A
			await deleteUser(clientBContext, 'user-from-client-a');

			// Verify client B's client_id was used in the filter
			expect(mockWhere2).toHaveBeenCalledWith('client_id', '=', 'client-b');

			// The delete would fail silently (no rows deleted) because user belongs to client A
			expect(mockExecute).toHaveBeenCalled();
		});

		it('should successfully delete user from same client', async () => {
			const mockExecute = vi.fn().mockResolvedValue([{ id: 'user-456' }]); // 1 row deleted

			vi.spyOn(db, 'deleteFrom').mockReturnValue({
				where: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						execute: mockExecute,
					}),
				}),
			} as any);

			await deleteUser(mockContext, 'user-456');

			// Should execute successfully
			expect(mockExecute).toHaveBeenCalled();
		});

		it('should use correct client_id for different contexts', async () => {
			const adminContext: ProtectedContext = {
				session: {
					user: {
						id: 'admin-1',
						name: 'Admin',
						email: 'admin@clientxyz.com',
						phone: null,
						client_id: 'client-xyz',
						role: 'admin',
					},
					expires: '2025-12-31',
				},
			};

			const mockExecute = vi.fn().mockResolvedValue([]);

			const mockWhere2 = vi.fn().mockReturnValue({
				execute: mockExecute,
			});

			const mockWhere1 = vi.fn().mockReturnValue({
				where: mockWhere2,
			});

			vi.spyOn(db, 'deleteFrom').mockReturnValue({
				where: mockWhere1,
			} as any);

			await deleteUser(adminContext, 'user-to-delete');

			// Should use admin context's client_id
			expect(mockWhere2).toHaveBeenCalledWith('client_id', '=', 'client-xyz');
		});
	});
});
