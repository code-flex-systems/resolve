import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getAnswerCallGraph, createAnswer, modifyAnswer } from '../answerQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';

// Mock the database module to avoid deep type instantiation errors
vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
		insertInto: vi.fn(),
		updateTable: vi.fn(),
		deleteFrom: vi.fn(),
	},
}));

/**
 * Tests for Answer Cycle Detection
 *
 * This test suite covers:
 * 1. getAnswerCallGraph - Retrieving call graph data from materialized answer_call_edges table
 * 2. createAnswer - Basic creation (cycle detection uses raw SQL, tested in integration tests)
 * 3. modifyAnswer - Basic modification (cycle detection uses raw SQL, tested in integration tests)
 *
 * Test Strategy:
 * - Mock database responses to test logic without actual DB
 * - Cycle detection now uses raw SQL recursive CTE which requires integration tests
 * - See answerQueries.integration.test.ts for full cycle detection coverage
 */

describe('getAnswerCallGraph', () => {
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

	it('should return empty array when no answers have calls_instance_id', async () => {
		const mockExecute = vi.fn().mockResolvedValue([]);

		vi.spyOn(db, 'selectFrom').mockReturnValue({
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			execute: mockExecute,
		} as any);

		const result = await getAnswerCallGraph(mockContext, 'checklist-1');

		expect(result).toEqual([]);
		expect(mockExecute).toHaveBeenCalledOnce();
	});

	it('should return call graph edges for simple case', async () => {
		const mockExecute = vi.fn().mockResolvedValue([
			{ from_instance_id: 1, to_instance_id: 2 },
			{ from_instance_id: 2, to_instance_id: 3 },
		]);

		vi.spyOn(db, 'selectFrom').mockReturnValue({
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			execute: mockExecute,
		} as any);

		const result = await getAnswerCallGraph(mockContext, 'checklist-1');

		expect(result).toEqual([
			{ from_instance_id: 1, to_instance_id: 2 },
			{ from_instance_id: 2, to_instance_id: 3 },
		]);
	});

	it('should filter out null calls_instance_id values', async () => {
		const mockExecute = vi.fn().mockResolvedValue([{ from_instance_id: 1, to_instance_id: 2 }]);

		vi.spyOn(db, 'selectFrom').mockReturnValue({
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			execute: mockExecute,
		} as any);

		const result = await getAnswerCallGraph(mockContext, 'checklist-1');

		expect(result).toEqual([{ from_instance_id: 1, to_instance_id: 2 }]);
	});

	it('should handle multiple calls from same instance', async () => {
		const mockExecute = vi.fn().mockResolvedValue([
			{ from_instance_id: 1, to_instance_id: 2 },
			{ from_instance_id: 1, to_instance_id: 3 },
		]);

		vi.spyOn(db, 'selectFrom').mockReturnValue({
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			execute: mockExecute,
		} as any);

		const result = await getAnswerCallGraph(mockContext, 'checklist-1');

		expect(result).toEqual([
			{ from_instance_id: 1, to_instance_id: 2 },
			{ from_instance_id: 1, to_instance_id: 3 },
		]);
	});

	it('should scope results to correct client_id', async () => {
		const mockWhere = vi.fn().mockReturnThis();
		const mockExecute = vi.fn().mockResolvedValue([]);

		vi.spyOn(db, 'selectFrom').mockReturnValue({
			select: vi.fn().mockReturnThis(),
			where: mockWhere,
			execute: mockExecute,
		} as any);

		await getAnswerCallGraph(mockContext, 'checklist-1');

		// Verify client_id filter was applied
		expect(mockWhere).toHaveBeenCalledWith('client_id', '=', 'client-abc');
	});

	it('should scope results to correct checklist_id', async () => {
		const mockWhere = vi.fn().mockReturnThis();
		const mockExecute = vi.fn().mockResolvedValue([]);

		vi.spyOn(db, 'selectFrom').mockReturnValue({
			select: vi.fn().mockReturnThis(),
			where: mockWhere,
			execute: mockExecute,
		} as any);

		await getAnswerCallGraph(mockContext, 'checklist-42');

		// Verify checklist_id filter was applied
		expect(mockWhere).toHaveBeenCalledWith('checklist_id', '=', 'checklist-42');
	});
});

describe('createAnswer - cycle detection', () => {
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

	it('should allow creating answer without calls_instance_id', async () => {
		// Mock updateTable for position shift
		const mockExecuteUpdate = vi.fn().mockResolvedValue(undefined);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(db.updateTable as any) = vi.fn().mockImplementation(() => ({
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			execute: mockExecuteUpdate,
		}));

		// Mock insertInto for answer creation
		const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({
			id: 1,
			question_id: 10,
			text: 'Test Answer',
			position: 1,
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(db.insertInto as any) = vi.fn().mockImplementation(() => ({
			values: vi.fn().mockReturnThis(),
			returningAll: vi.fn().mockReturnThis(),
			executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
		}));

		const params = {
			text: 'Test Answer',
			position: 1,
			calls_instance_id: null,
		};

		const result = await createAnswer(mockContext, 'page-100', 'question-10', params);

		expect(result).toBeDefined();
		expect(result.id).toBe(1);
	});

	// NOTE: Cycle detection tests that require raw SQL are covered in integration tests
	// See answerQueries.integration.test.ts for tests covering:
	// - Direct cycle detection (A -> B -> A)
	// - Indirect cycle detection (A -> B -> C -> A)
	// - Allowed calls when no cycle exists
});

describe('modifyAnswer - cycle detection', () => {
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

	it('should allow modifying answer without changing calls_instance_id', async () => {
		// Mock selectFrom for getting existing answer
		const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({
			position: 1,
			question_id: 10,
			calls_instance_id: null,
		});

		vi.spyOn(db, 'selectFrom').mockReturnValue({
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
		} as any);

		// Mock updateTable for answer update and bumpPageVersion
		const mockExecute = vi.fn().mockResolvedValue(undefined);
		const mockUpdateExecute = vi.fn().mockResolvedValue({
			id: 1,
			text: 'Updated Text',
			position: 1,
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(db.updateTable as any) = vi.fn().mockImplementation(() => ({
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			returningAll: vi.fn().mockReturnThis(),
			executeTakeFirstOrThrow: mockUpdateExecute,
			execute: mockExecute,
		}));

		const params = {
			text: 'Updated Text',
		};

		const result = await modifyAnswer(mockContext, 'page-100', 'answer-1', params);

		expect(result).toBeDefined();
	});

	it('should not check for cycles when calls_instance_id unchanged', async () => {
		// Mock selectFrom for getting existing answer
		const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({
			position: 1,
			question_id: 10,
			calls_instance_id: 5,
		});

		vi.spyOn(db, 'selectFrom').mockReturnValue({
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
		} as any);

		// Mock updateTable for answer update and bumpPageVersion
		const mockExecute = vi.fn().mockResolvedValue(undefined);
		const mockUpdateExecute = vi.fn().mockResolvedValue({
			id: 1,
			text: 'Updated Text',
			position: 1,
			calls_instance_id: 5,
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(db.updateTable as any) = vi.fn().mockImplementation(() => ({
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			returningAll: vi.fn().mockReturnThis(),
			executeTakeFirstOrThrow: mockUpdateExecute,
			execute: mockExecute,
		}));

		const params = {
			text: 'Updated Text',
			calls_instance_id: 'instance-5', // Same as existing
		};

		const result = await modifyAnswer(mockContext, 'page-100', 'answer-1', params);

		expect(result).toBeDefined();
	});

	// NOTE: Cycle detection tests that require raw SQL are covered in integration tests
	// See answerQueries.integration.test.ts for tests covering:
	// - Cycle detection when modifying calls_instance_id
	// - Setting calls_instance_id to null
	// - Edge maintenance after modification
});
