import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getChecklist } from '../checklistQueries';
import { db } from '@/api/database/kysely';

// Mock the database
vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
	},
}));

describe('getChecklist', () => {
	const mockContext = {
		session: {
			user: {
				id: 'test-user-id',
				client_id: 'test-client-id',
			},
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should throw error when trying to access unpublished checklist', async () => {
		// Mock the query chain to throw when no published checklist is found
		const mockExecuteTakeFirstOrThrow = vi.fn().mockRejectedValue(
			new Error('No result')
		);

		// Create a mock chain that returns itself for chaining .where() calls
		const mockWhereChain: any = vi.fn();
		mockWhereChain.mockReturnValue({
			where: mockWhereChain,
			executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
		});

		const mockSelectAll = vi.fn().mockReturnValue({
			where: mockWhereChain,
		});
		const mockSelectFrom = vi.fn().mockReturnValue({
			selectAll: mockSelectAll,
		});

		(db.selectFrom as any) = mockSelectFrom;

		// Attempt to get an unpublished checklist
		await expect(
			getChecklist(mockContext as any, 123)
		).rejects.toThrow();

		// Verify filters were applied (client_id, published, id)
		expect(mockWhereChain).toHaveBeenCalledWith(
			'checklist.client_id',
			'=',
			'test-client-id'
		);
		expect(mockWhereChain).toHaveBeenCalledWith(
			'checklist.published',
			'=',
			true
		);
		expect(mockWhereChain).toHaveBeenCalledWith(
			'id',
			'=',
			123
		);
	});

	it('should return checklist when published and user has access', async () => {
		const mockChecklist = {
			id: 123,
			name: 'Test Checklist',
			published: true,
			client_id: 'test-client-id',
		};

		const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue(mockChecklist);

		// Create a mock chain that returns itself for chaining .where() calls
		const mockWhereChain: any = vi.fn();
		mockWhereChain.mockReturnValue({
			where: mockWhereChain,
			executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
		});

		const mockSelectAll = vi.fn().mockReturnValue({
			where: mockWhereChain,
		});
		const mockSelectFrom = vi.fn().mockReturnValue({
			selectAll: mockSelectAll,
		});

		(db.selectFrom as any) = mockSelectFrom;

		const result = await getChecklist(mockContext as any, 123);

		expect(result).toEqual(mockChecklist);
		expect(mockWhereChain).toHaveBeenCalledWith(
			'checklist.client_id',
			'=',
			'test-client-id'
		);
		expect(mockWhereChain).toHaveBeenCalledWith(
			'checklist.published',
			'=',
			true
		);
		expect(mockWhereChain).toHaveBeenCalledWith(
			'id',
			'=',
			123
		);
	});
});
