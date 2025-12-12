import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
	getReferenceOptions,
	deleteReferenceOption,
	createReferenceOption,
} from '../referenceDataQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';

/**
 * Tests for referenceDataQueries - Flag Filtering & System Default Protection
 *
 * These functions have meaningful business logic:
 * 1. getReferenceOptions: showDeleted/showInactive flag filtering
 * 2. deleteReferenceOption: System default protection (prevents deletion)
 * 3. createReferenceOption: Duplicate value prevention
 */

vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
		insertInto: vi.fn(),
		updateTable: vi.fn(),
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

describe('getReferenceOptions', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Flag Filtering', () => {
		it('should filter out deleted options by default', async () => {
			const whereCalls: string[] = [];

			let callCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// getReferenceList call
					return {
						selectAll: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue({ id: 1, entity: 'test_entity' }),
					} as any;
				}
				// getReferenceOptions main query
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn((field: string) => {
						whereCalls.push(field);
						return {
							select: vi.fn().mockReturnThis(),
							where: vi.fn((f: string) => {
								whereCalls.push(f);
								return {
									select: vi.fn().mockReturnThis(),
									where: vi.fn((f2: string) => {
										whereCalls.push(f2);
										return {
											orderBy: vi.fn().mockReturnThis(),
											where: vi.fn((f3: string) => {
												whereCalls.push(f3);
												return {
													where: vi.fn((f4: string) => {
														whereCalls.push(f4);
														return {
															orderBy: vi.fn().mockReturnThis(),
															execute: vi.fn().mockResolvedValue([]),
														};
													}),
													orderBy: vi.fn().mockReturnThis(),
													execute: vi.fn().mockResolvedValue([]),
												};
											}),
											execute: vi.fn().mockResolvedValue([]),
										};
									}),
									orderBy: vi.fn().mockReturnThis(),
									execute: vi.fn().mockResolvedValue([]),
								};
							}),
							orderBy: vi.fn().mockReturnThis(),
							execute: vi.fn().mockResolvedValue([]),
						};
					}),
					orderBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				} as any;
			});

			await getReferenceOptions(mockContext, 'test_entity');

			// Should include deleted_at filter
			expect(whereCalls).toContain('reference_option.deleted_at');
		});

		it('should filter out inactive options by default', async () => {
			const whereCalls: string[] = [];

			let callCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return {
						selectAll: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue({ id: 1, entity: 'test_entity' }),
					} as any;
				}
				return {
					select: vi.fn().mockReturnThis(),
					where: vi.fn((field: string) => {
						whereCalls.push(field);
						return {
							select: vi.fn().mockReturnThis(),
							where: vi.fn((f: string) => {
								whereCalls.push(f);
								return {
									select: vi.fn().mockReturnThis(),
									where: vi.fn((f2: string) => {
										whereCalls.push(f2);
										return {
											orderBy: vi.fn().mockReturnThis(),
											where: vi.fn((f3: string) => {
												whereCalls.push(f3);
												return {
													where: vi.fn((f4: string) => {
														whereCalls.push(f4);
														return {
															orderBy: vi.fn().mockReturnThis(),
															execute: vi.fn().mockResolvedValue([]),
														};
													}),
													orderBy: vi.fn().mockReturnThis(),
													execute: vi.fn().mockResolvedValue([]),
												};
											}),
											execute: vi.fn().mockResolvedValue([]),
										};
									}),
									orderBy: vi.fn().mockReturnThis(),
									execute: vi.fn().mockResolvedValue([]),
								};
							}),
							orderBy: vi.fn().mockReturnThis(),
							execute: vi.fn().mockResolvedValue([]),
						};
					}),
					orderBy: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				} as any;
			});

			await getReferenceOptions(mockContext, 'test_entity');

			// Should include is_active filter
			expect(whereCalls).toContain('reference_option.is_active');
		});

		it('should return empty array when reference list not found', async () => {
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				selectAll: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(null),
			} as any);

			const result = await getReferenceOptions(mockContext, 'nonexistent_entity');

			expect(result).toEqual([]);
		});
	});
});

describe('deleteReferenceOption', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('System Default Protection', () => {
		it('should throw error when trying to delete system default option', async () => {
			// Mock getReferenceOptionById to return a system default
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue({
					id: 1,
					is_system_default: true,
					value: 'default_value',
				}),
			} as any);

			await expect(deleteReferenceOption(mockContext, 1)).rejects.toThrow(
				'Cannot delete system default options. You can deactivate them instead.'
			);
		});

		it('should allow deletion of non-system-default options', async () => {
			// Mock getReferenceOptionById to return a user-created option
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue({
					id: 2,
					is_system_default: false,
					value: 'user_value',
				}),
			} as any);

			(vi.spyOn(db as any, 'updateTable') as any).mockReturnValue({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				returningAll: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					id: 2,
					deleted_at: new Date(),
				}),
			});

			const result = await deleteReferenceOption(mockContext, 2);

			expect(result.id).toBe(2);
			expect(db.updateTable).toHaveBeenCalledWith('reference_option');
		});

		it('should throw error when option not found', async () => {
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(null),
			} as any);

			await expect(deleteReferenceOption(mockContext, 999)).rejects.toThrow(
				'Reference option not found'
			);
		});
	});
});

describe('createReferenceOption', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Duplicate Prevention', () => {
		it('should throw error when duplicate value exists', async () => {
			let callCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// getReferenceList
					return {
						selectAll: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue({ id: 1, entity: 'test_entity' }),
					} as any;
				}
				if (callCount === 2) {
					// getReferenceList again (from getReferenceOption)
					return {
						selectAll: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue({ id: 1, entity: 'test_entity' }),
					} as any;
				}
				// getReferenceOption - returns existing option
				return {
					selectAll: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: vi.fn().mockResolvedValue({
						id: 5,
						value: 'existing_value',
					}),
				} as any;
			});

			await expect(
				createReferenceOption(mockContext, {
					entity: 'test_entity',
					value: 'existing_value',
					display_label: 'Existing Value',
				})
			).rejects.toThrow("Option with value 'existing_value' already exists for test_entity");
		});

		it('should throw error when reference list not found', async () => {
			vi.spyOn(db, 'selectFrom').mockReturnValue({
				selectAll: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(null),
			} as any);

			await expect(
				createReferenceOption(mockContext, {
					entity: 'nonexistent_entity',
					value: 'new_value',
					display_label: 'New Value',
				})
			).rejects.toThrow('Reference list not found for entity: nonexistent_entity');
		});

		it('should create option when no duplicate exists', async () => {
			let callCount = 0;
			vi.spyOn(db, 'selectFrom').mockImplementation(() => {
				callCount++;
				if (callCount <= 2) {
					// getReferenceList calls
					return {
						selectAll: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						executeTakeFirst: vi.fn().mockResolvedValue({ id: 1, entity: 'test_entity' }),
					} as any;
				}
				// getReferenceOption - returns null (no duplicate)
				return {
					selectAll: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					executeTakeFirst: vi.fn().mockResolvedValue(null),
				} as any;
			});

			vi.spyOn(db, 'insertInto').mockReturnValue({
				values: vi.fn().mockReturnThis(),
				returningAll: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					id: 10,
					value: 'new_value',
					display_label: 'New Value',
					is_system_default: false,
				}),
			} as any);

			const result = await createReferenceOption(mockContext, {
				entity: 'test_entity',
				value: 'new_value',
				display_label: 'New Value',
			});

			expect(result.id).toBe(10);
			expect(result.is_system_default).toBe(false);
			expect(db.insertInto).toHaveBeenCalledWith('reference_option');
		});
	});
});
