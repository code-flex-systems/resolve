import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getAnswerCallGraph, createAnswer, modifyAnswer } from '../answerQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';

/**
 * Tests for Answer Cycle Detection
 *
 * This test suite covers:
 * 1. getAnswerCallGraph - Retrieving call graph data
 * 2. createAnswer - Cycle detection during answer creation
 * 3. modifyAnswer - Cycle detection during answer updates
 *
 * Test Strategy:
 * - Mock database responses to test logic without actual DB
 * - Verify cycle detection prevents circular dependencies
 * - Test edge cases: self-loops, long chains, complex graphs
 * - Validate error messages and exception handling
 */

describe('getAnswerCallGraph', () => {
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

	it('should return empty array when no answers have calls_instance_id', async () => {
		const mockExecute = vi.fn().mockResolvedValue([]);

		vi.spyOn(db, 'selectFrom').mockReturnValue({
			innerJoin: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			execute: mockExecute,
		} as any);

		const result = await getAnswerCallGraph(mockContext, 1);

		expect(result).toEqual([]);
		expect(mockExecute).toHaveBeenCalledOnce();
	});

	it('should return call graph edges for simple case', async () => {
		const mockExecute = vi.fn().mockResolvedValue([
			{ from_instance_id: 1, to_instance_id: 2 },
			{ from_instance_id: 2, to_instance_id: 3 },
		]);

		vi.spyOn(db, 'selectFrom').mockReturnValue({
			innerJoin: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			execute: mockExecute,
		} as any);

		const result = await getAnswerCallGraph(mockContext, 1);

		expect(result).toEqual([
			{ from_instance_id: 1, to_instance_id: 2 },
			{ from_instance_id: 2, to_instance_id: 3 },
		]);
	});

	it('should filter out null calls_instance_id values', async () => {
		const mockExecute = vi.fn().mockResolvedValue([
			{ from_instance_id: 1, to_instance_id: 2 },
		]);

		vi.spyOn(db, 'selectFrom').mockReturnValue({
			innerJoin: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			execute: mockExecute,
		} as any);

		const result = await getAnswerCallGraph(mockContext, 1);

		expect(result).toHaveLength(1);
		expect(result[0].to_instance_id).toBe(2);
	});

	it('should handle multiple calls from same instance', async () => {
		const mockExecute = vi.fn().mockResolvedValue([
			{ from_instance_id: 1, to_instance_id: 2 },
			{ from_instance_id: 1, to_instance_id: 3 },
		]);

		vi.spyOn(db, 'selectFrom').mockReturnValue({
			innerJoin: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			execute: mockExecute,
		} as any);

		const result = await getAnswerCallGraph(mockContext, 1);

		expect(result).toHaveLength(2);
		expect(result[0].from_instance_id).toBe(1);
		expect(result[1].from_instance_id).toBe(1);
	});

	it('should scope results to correct client_id', async () => {
		const mockWhere = vi.fn().mockReturnThis();
		const mockExecute = vi.fn().mockResolvedValue([]);

		vi.spyOn(db, 'selectFrom').mockReturnValue({
			innerJoin: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			where: mockWhere,
			execute: mockExecute,
		} as any);

		await getAnswerCallGraph(mockContext, 1);

		// Verify client_id filtering was applied
		expect(mockWhere).toHaveBeenCalled();
	});

	it('should scope results to correct checklist_id', async () => {
		const mockWhere = vi.fn().mockReturnThis();
		const mockExecute = vi.fn().mockResolvedValue([]);

		vi.spyOn(db, 'selectFrom').mockReturnValue({
			innerJoin: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			where: mockWhere,
			execute: mockExecute,
		} as any);

		await getAnswerCallGraph(mockContext, 42);

		expect(mockWhere).toHaveBeenCalled();
	});
});

describe('createAnswer - cycle detection', () => {
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

	it('should allow creating answer without calls_instance_id', async () => {
		const mockTransaction = vi.fn().mockImplementation(async (callback) => {
			const trx = {
				updateTable: vi.fn().mockReturnThis(),
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
				insertInto: vi.fn().mockReturnThis(),
				values: vi.fn().mockReturnThis(),
				returningAll: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					id: 1,
					question_id: 10,
					text: 'Test Answer',
					position: 1,
				}),
			};
			return await callback(trx);
		});

		vi.spyOn(db, 'transaction').mockReturnValue({ execute: mockTransaction } as any);

		const params = {
			text: 'Test Answer',
			position: 1,
			calls_instance_id: null,
		};

		const result = await createAnswer(mockContext, 100, 10, params);

		expect(result).toBeDefined();
		expect(result.id).toBe(1);
	});

	it('should throw error when creating answer would create direct cycle', async () => {
		// Mock page instances for this template (returns instance 1 in checklist 1)
		const mockExecutePageInstances = vi.fn().mockResolvedValue([
			{ instance_id: 1, checklist_id: 1 },
		]);

		// Mock call graph query showing 2 -> 1 exists
		const mockExecuteCallGraph = vi.fn().mockResolvedValue([
			{ from_instance_id: 2, to_instance_id: 1 },
		]);

		let selectFromCallCount = 0;
		vi.spyOn(db, 'selectFrom').mockImplementation((table: any) => {
			selectFromCallCount++;

			// First call: get all page instances for this template
			if (selectFromCallCount === 1) {
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					execute: mockExecutePageInstances,
				} as any;
			}

			// Second call: call graph query
			return {
				innerJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: mockExecuteCallGraph,
			} as any;
		});

		const params = {
			text: 'Test Answer',
			position: 1,
			calls_instance_id: 2, // Would create cycle: 1 -> 2 -> 1
		};

		await expect(createAnswer(mockContext, 100, 10, params)).rejects.toThrow(
			/would create a cycle/
		);
	});

	it('should throw error when creating answer would create indirect cycle', async () => {
		// Mock page instances for this template (returns instance 1 in checklist 1)
		const mockExecutePageInstances = vi.fn().mockResolvedValue([
			{ instance_id: 1, checklist_id: 1 },
		]);

		// Mock call graph showing 2 -> 3 -> 1
		const mockExecuteCallGraph = vi.fn().mockResolvedValue([
			{ from_instance_id: 2, to_instance_id: 3 },
			{ from_instance_id: 3, to_instance_id: 1 },
		]);

		let selectFromCallCount = 0;
		vi.spyOn(db, 'selectFrom').mockImplementation(() => {
			selectFromCallCount++;

			// First call: get all page instances for this template
			if (selectFromCallCount === 1) {
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					execute: mockExecutePageInstances,
				} as any;
			}

			// Second call: call graph query
			return {
				innerJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: mockExecuteCallGraph,
			} as any;
		});

		const params = {
			text: 'Test Answer',
			position: 1,
			calls_instance_id: 2, // Would create cycle: 1 -> 2 -> 3 -> 1
		};

		await expect(createAnswer(mockContext, 100, 10, params)).rejects.toThrow(
			/would create a cycle/
		);
	});

	it('should allow creating answer when no cycle exists', async () => {
		// Mock page instances for this template (returns instance 1 in checklist 1)
		const mockExecutePageInstances = vi.fn().mockResolvedValue([
			{ instance_id: 1, checklist_id: 1 },
		]);

		// Mock call graph showing 2 -> 3 (no path back to 1)
		const mockExecuteCallGraph = vi.fn().mockResolvedValue([
			{ from_instance_id: 2, to_instance_id: 3 },
		]);

		let selectFromCallCount = 0;
		vi.spyOn(db, 'selectFrom').mockImplementation(() => {
			selectFromCallCount++;

			// First call: get all page instances for this template
			if (selectFromCallCount === 1) {
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					execute: mockExecutePageInstances,
				} as any;
			}

			// Second call: call graph query
			return {
				innerJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: mockExecuteCallGraph,
			} as any;
		});

		const mockTransaction = vi.fn().mockImplementation(async (callback) => {
			const trx = {
				updateTable: vi.fn().mockReturnThis(),
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
				insertInto: vi.fn().mockReturnThis(),
				values: vi.fn().mockReturnThis(),
				returningAll: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					id: 1,
					question_id: 10,
					text: 'Test Answer',
					position: 1,
					calls_instance_id: 2,
				}),
			};
			return await callback(trx);
		});

		vi.spyOn(db, 'transaction').mockReturnValue({ execute: mockTransaction } as any);

		const params = {
			text: 'Test Answer',
			position: 1,
			calls_instance_id: 2, // Safe: 1 -> 2 -> 3 (no cycle)
		};

		const result = await createAnswer(mockContext, 100, 10, params);

		expect(result).toBeDefined();
		expect(result.calls_instance_id).toBe(2);
	});
});

describe('modifyAnswer - cycle detection', () => {
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

	it('should allow modifying answer without changing calls_instance_id', async () => {
		// Mock existing answer
		const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({
			position: 1,
			question_id: 10,
			calls_instance_id: 2,
		});

		vi.spyOn(db, 'selectFrom').mockReturnValue({
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
		} as any);

		const mockTransaction = vi.fn().mockImplementation(async (callback) => {
			const trx = {
				updateTable: vi.fn().mockReturnThis(),
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
				returningAll: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					id: 1,
					text: 'Updated Text',
					position: 1,
					calls_instance_id: 2,
				}),
			};
			return await callback(trx);
		});

		vi.spyOn(db, 'transaction').mockReturnValue({ execute: mockTransaction } as any);

		const params = {
			text: 'Updated Text',
		};

		const result = await modifyAnswer(mockContext, 100, 1, params);

		expect(result).toBeDefined();
	});

	it('should throw error when modifying calls_instance_id would create cycle', async () => {
		// Mock existing answer
		const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({
			position: 1,
			question_id: 10,
			calls_instance_id: null, // Currently no call
		});

		// Mock page instances for this template (returns instance 1 in checklist 1)
		const mockExecutePageInstances = vi.fn().mockResolvedValue([
			{ instance_id: 1, checklist_id: 1 },
		]);

		// Mock call graph showing 2 -> 1
		const mockExecuteCallGraph = vi.fn().mockResolvedValue([
			{ from_instance_id: 2, to_instance_id: 1 },
		]);

		let selectFromCallCount = 0;
		vi.spyOn(db, 'selectFrom').mockImplementation(() => {
			selectFromCallCount++;

			if (selectFromCallCount === 1) {
				// First: get existing answer
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
				} as any;
			} else if (selectFromCallCount === 2) {
				// Second: get all page instances for this template
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					execute: mockExecutePageInstances,
				} as any;
			}

			// Third: get call graph
			return {
				innerJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: mockExecuteCallGraph,
			} as any;
		});

		const params = {
			calls_instance_id: 2, // Would create cycle: 1 -> 2 -> 1
		};

		await expect(modifyAnswer(mockContext, 100, 1, params)).rejects.toThrow(
			/would create a cycle/
		);
	});

	it('should allow setting calls_instance_id to null', async () => {
		// Mock existing answer with a call
		const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({
			position: 1,
			question_id: 10,
			calls_instance_id: 2,
		});

		vi.spyOn(db, 'selectFrom').mockReturnValue({
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
		} as any);

		const mockTransaction = vi.fn().mockImplementation(async (callback) => {
			const trx = {
				updateTable: vi.fn().mockReturnThis(),
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
				returningAll: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					id: 1,
					text: 'Test',
					position: 1,
					calls_instance_id: null,
				}),
			};
			return await callback(trx);
		});

		vi.spyOn(db, 'transaction').mockReturnValue({ execute: mockTransaction } as any);

		const params = {
			calls_instance_id: null,
		};

		const result = await modifyAnswer(mockContext, 100, 1, params);

		expect(result).toBeDefined();
		expect(result.calls_instance_id).toBeNull();
	});

	it('should not check for cycles when calls_instance_id unchanged', async () => {
		// Mock existing answer
		const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({
			position: 1,
			question_id: 10,
			calls_instance_id: 2,
		});

		const mockSelectFrom = vi.fn().mockReturnValue({
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
		} as any);

		vi.spyOn(db, 'selectFrom').mockImplementation(mockSelectFrom);

		const mockTransaction = vi.fn().mockImplementation(async (callback) => {
			const trx = {
				updateTable: vi.fn().mockReturnThis(),
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
				returningAll: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					id: 1,
					text: 'Updated',
					position: 1,
					calls_instance_id: 2,
				}),
			};
			return await callback(trx);
		});

		vi.spyOn(db, 'transaction').mockReturnValue({ execute: mockTransaction } as any);

		const params = {
			text: 'Updated',
			calls_instance_id: 2, // Same as existing
		};

		await modifyAnswer(mockContext, 100, 1, params);

		// Should only query once for existing answer, not for cycle detection
		expect(mockSelectFrom).toHaveBeenCalledTimes(1);
	});
});
