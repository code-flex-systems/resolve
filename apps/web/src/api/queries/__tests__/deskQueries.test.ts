import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { assignUserToDeskLocation, bulkAssignUsersToDeskLocation } from '../deskQueries';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';

/**
 * Tests for Desk Queries - Complex Assignment Logic
 *
 * assignUserToDeskLocation:
 * - Validates desk location exists
 * - Soft-deletes existing assignment at the same priority (to make room)
 * - Soft-deletes existing assignment for same user-desk combo at ANY priority
 * - Inserts new assignment
 * - Wrapped in transaction for atomicity
 *
 * bulkAssignUsersToDeskLocation:
 * - Same logic as single assign but for multiple users
 * - All assignments in single transaction (all-or-nothing)
 * - Returns array of created assignments
 */

// Mock the database module
vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
		insertInto: vi.fn(),
		updateTable: vi.fn(),
		transaction: vi.fn(),
		isTransaction: false,
	},
}));

const createMockContext = (clientId = 'client-abc'): ProtectedContext => ({
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
});

// Helper to create mock desk location
const createMockDeskLocation = (overrides: Record<string, unknown> = {}) => ({
	id: 10,
	name: 'Evaluation',
	desk_location_type_id: 1,
	desk_location_type_name: 'Property',
	client_id: 'client-abc',
	is_active: true,
	created_at: new Date('2025-01-01'),
	created_by: 'admin-001',
	updated_at: null,
	updated_by: null,
	deleted_at: null,
	...overrides,
});

// Helper to create mock assignment
const createMockAssignment = (overrides: Record<string, unknown> = {}) => ({
	id: 1,
	user_id: 'user-456',
	desk_location_id: 10,
	priority: 1,
	assigned_at: new Date('2025-01-01'),
	assigned_by: 'user-123',
	removed_at: null,
	removed_by: null,
	...overrides,
});

describe('assignUserToDeskLocation', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Desk Location Validation', () => {
		it('should throw error if desk location not found', async () => {
			// Mock: getDeskLocation returns null
			vi.spyOn(db, 'selectFrom').mockImplementation(() => ({
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(null),
			}) as any);

			await expect(
				assignUserToDeskLocation(mockContext, {
					userId: 'user-456',
					deskLocationId: 999,
					priority: 1,
				})
			).rejects.toThrow('Desk location not found');
		});

		it('should proceed when desk location exists', async () => {
			const mockDeskLocation = createMockDeskLocation();

			vi.spyOn(db, 'selectFrom').mockImplementation(() => ({
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(mockDeskLocation),
			}) as any);

			(vi.spyOn(db, 'updateTable') as any).mockReturnValue({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([]),
			});

			vi.spyOn(db, 'insertInto').mockImplementation(() => ({
				values: vi.fn().mockReturnThis(),
				returningAll: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue(createMockAssignment()),
			}) as any);

			vi.spyOn(db, 'transaction').mockImplementation(() => ({
				execute: vi.fn().mockImplementation(async (callback) => {
					return callback(db);
				}),
			}) as any);

			const result = await assignUserToDeskLocation(mockContext, {
				userId: 'user-456',
				deskLocationId: 10,
				priority: 1,
			});

			expect(result).toBeDefined();
		});
	});

	describe('Soft Delete Existing Assignments', () => {
		it('should soft-delete existing assignment at same priority', async () => {
			const mockDeskLocation = createMockDeskLocation();

			vi.spyOn(db, 'selectFrom').mockImplementation(() => ({
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(mockDeskLocation),
			}) as any);

			const mockUpdateTable = (vi.spyOn(db, 'updateTable') as any).mockReturnValue({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([]),
			});

			vi.spyOn(db, 'insertInto').mockImplementation(() => ({
				values: vi.fn().mockReturnThis(),
				returningAll: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue(createMockAssignment()),
			}) as any);

			vi.spyOn(db, 'transaction').mockImplementation(() => ({
				execute: vi.fn().mockImplementation(async (callback) => {
					return callback(db);
				}),
			}) as any);

			await assignUserToDeskLocation(mockContext, {
				userId: 'user-456',
				deskLocationId: 10,
				priority: 2,
			});

			// Should call updateTable for soft-deleting existing assignments
			expect(mockUpdateTable).toHaveBeenCalledWith('user_desk_location');
		});

		it('should soft-delete existing assignment for same user-desk at any priority', async () => {
			const mockDeskLocation = createMockDeskLocation();

			vi.spyOn(db, 'selectFrom').mockImplementation(() => ({
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(mockDeskLocation),
			}) as any);

			let updateCount = 0;
			(vi.spyOn(db, 'updateTable') as any).mockImplementation(() => {
				updateCount++;
				return {
					set: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				};
			});

			vi.spyOn(db, 'insertInto').mockImplementation(() => ({
				values: vi.fn().mockReturnThis(),
				returningAll: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue(createMockAssignment()),
			}) as any);

			vi.spyOn(db, 'transaction').mockImplementation(() => ({
				execute: vi.fn().mockImplementation(async (callback) => {
					return callback(db);
				}),
			}) as any);

			await assignUserToDeskLocation(mockContext, {
				userId: 'user-456',
				deskLocationId: 10,
				priority: 1,
			});

			// Should call updateTable twice (once for priority, once for user-desk combo)
			expect(updateCount).toBe(2);
		});
	});

	describe('Insert New Assignment', () => {
		it('should insert new assignment with correct values', async () => {
			const mockDeskLocation = createMockDeskLocation();
			const mockAssignment = createMockAssignment({
				user_id: 'user-456',
				desk_location_id: 10,
				priority: 3,
			});

			vi.spyOn(db, 'selectFrom').mockImplementation(() => ({
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(mockDeskLocation),
			}) as any);

			(vi.spyOn(db, 'updateTable') as any).mockReturnValue({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([]),
			});

			const mockInsertInto = vi.spyOn(db, 'insertInto').mockImplementation(() => ({
				values: vi.fn().mockReturnThis(),
				returningAll: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue(mockAssignment),
			}) as any);

			vi.spyOn(db, 'transaction').mockImplementation(() => ({
				execute: vi.fn().mockImplementation(async (callback) => {
					return callback(db);
				}),
			}) as any);

			const result = await assignUserToDeskLocation(mockContext, {
				userId: 'user-456',
				deskLocationId: 10,
				priority: 3,
			});

			expect(mockInsertInto).toHaveBeenCalledWith('user_desk_location');
			expect(result.user_id).toBe('user-456');
			expect(result.desk_location_id).toBe(10);
			expect(result.priority).toBe(3);
		});
	});

	describe('Transaction Handling', () => {
		it('should wrap operations in transaction when not already in one', async () => {
			const mockDeskLocation = createMockDeskLocation();

			vi.spyOn(db, 'selectFrom').mockImplementation(() => ({
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(mockDeskLocation),
			}) as any);

			(vi.spyOn(db, 'updateTable') as any).mockReturnValue({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([]),
			});

			vi.spyOn(db, 'insertInto').mockImplementation(() => ({
				values: vi.fn().mockReturnThis(),
				returningAll: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue(createMockAssignment()),
			}) as any);

			const mockTransaction = vi.spyOn(db, 'transaction').mockImplementation(() => ({
				execute: vi.fn().mockImplementation(async (callback) => {
					return callback(db);
				}),
			}) as any);

			await assignUserToDeskLocation(mockContext, {
				userId: 'user-456',
				deskLocationId: 10,
				priority: 1,
			});

			expect(mockTransaction).toHaveBeenCalled();
		});
	});

	describe('Return Value', () => {
		it('should return created assignment', async () => {
			const mockDeskLocation = createMockDeskLocation();
			const mockAssignment = createMockAssignment({
				id: 99,
				user_id: 'user-789',
			});

			vi.spyOn(db, 'selectFrom').mockImplementation(() => ({
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(mockDeskLocation),
			}) as any);

			(vi.spyOn(db, 'updateTable') as any).mockReturnValue({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([]),
			});

			vi.spyOn(db, 'insertInto').mockImplementation(() => ({
				values: vi.fn().mockReturnThis(),
				returningAll: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue(mockAssignment),
			}) as any);

			vi.spyOn(db, 'transaction').mockImplementation(() => ({
				execute: vi.fn().mockImplementation(async (callback) => {
					return callback(db);
				}),
			}) as any);

			const result = await assignUserToDeskLocation(mockContext, {
				userId: 'user-789',
				deskLocationId: 10,
				priority: 1,
			});

			expect(result.id).toBe(99);
			expect(result.user_id).toBe('user-789');
		});
	});
});

describe('bulkAssignUsersToDeskLocation', () => {
	let mockContext: ProtectedContext;

	beforeEach(() => {
		mockContext = createMockContext();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Desk Location Validation', () => {
		it('should throw error if desk location not found', async () => {
			vi.spyOn(db, 'selectFrom').mockImplementation(() => ({
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(null),
			}) as any);

			await expect(
				bulkAssignUsersToDeskLocation(mockContext, {
					userIds: ['user-1', 'user-2', 'user-3'],
					deskLocationId: 999,
					priority: 1,
				})
			).rejects.toThrow('Desk location not found');
		});
	});

	describe('Bulk Assignment Logic', () => {
		it('should assign multiple users to same desk location', async () => {
			const mockDeskLocation = createMockDeskLocation();
			const userIds = ['user-1', 'user-2', 'user-3'];

			vi.spyOn(db, 'selectFrom').mockImplementation(() => ({
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(mockDeskLocation),
			}) as any);

			(vi.spyOn(db, 'updateTable') as any).mockReturnValue({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([]),
			});

			let insertCount = 0;
			vi.spyOn(db, 'insertInto').mockImplementation(() => {
				insertCount++;
				return {
					values: vi.fn().mockReturnThis(),
					returningAll: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue(
						createMockAssignment({
							id: insertCount,
							user_id: userIds[insertCount - 1],
						})
					),
				} as any;
			});

			vi.spyOn(db, 'transaction').mockImplementation(() => ({
				execute: vi.fn().mockImplementation(async (callback) => {
					return callback(db);
				}),
			}) as any);

			const result = await bulkAssignUsersToDeskLocation(mockContext, {
				userIds,
				deskLocationId: 10,
				priority: 1,
			});

			expect(result).toHaveLength(3);
			expect(insertCount).toBe(3);
		});

		it('should use same priority for all users', async () => {
			const mockDeskLocation = createMockDeskLocation();

			vi.spyOn(db, 'selectFrom').mockImplementation(() => ({
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(mockDeskLocation),
			}) as any);

			(vi.spyOn(db, 'updateTable') as any).mockReturnValue({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([]),
			});

			const createdAssignments: any[] = [];
			vi.spyOn(db, 'insertInto').mockImplementation(() => {
				return {
					values: vi.fn().mockImplementation((values) => {
						createdAssignments.push(values);
						return {
							returningAll: vi.fn().mockReturnThis(),
							executeTakeFirstOrThrow: vi.fn().mockResolvedValue(
								createMockAssignment({ priority: values.priority })
							),
						};
					}),
				} as any;
			});

			vi.spyOn(db, 'transaction').mockImplementation(() => ({
				execute: vi.fn().mockImplementation(async (callback) => {
					return callback(db);
				}),
			}) as any);

			await bulkAssignUsersToDeskLocation(mockContext, {
				userIds: ['user-1', 'user-2'],
				deskLocationId: 10,
				priority: 5,
			});

			// All assignments should have priority 5
			createdAssignments.forEach((assignment) => {
				expect(assignment.priority).toBe(5);
			});
		});
	});

	describe('Transaction Handling', () => {
		it('should wrap all assignments in single transaction', async () => {
			const mockDeskLocation = createMockDeskLocation();

			vi.spyOn(db, 'selectFrom').mockImplementation(() => ({
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(mockDeskLocation),
			}) as any);

			(vi.spyOn(db, 'updateTable') as any).mockReturnValue({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([]),
			});

			vi.spyOn(db, 'insertInto').mockImplementation(() => ({
				values: vi.fn().mockReturnThis(),
				returningAll: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue(createMockAssignment()),
			}) as any);

			const mockTransaction = vi.spyOn(db, 'transaction').mockImplementation(() => ({
				execute: vi.fn().mockImplementation(async (callback) => {
					return callback(db);
				}),
			}) as any);

			await bulkAssignUsersToDeskLocation(mockContext, {
				userIds: ['user-1', 'user-2', 'user-3'],
				deskLocationId: 10,
				priority: 1,
			});

			// Should only create one transaction (not one per user)
			expect(mockTransaction).toHaveBeenCalledTimes(1);
		});
	});

	describe('Soft Delete Existing', () => {
		it('should soft-delete existing assignments for each user', async () => {
			const mockDeskLocation = createMockDeskLocation();
			const userIds = ['user-1', 'user-2'];

			vi.spyOn(db, 'selectFrom').mockImplementation(() => ({
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(mockDeskLocation),
			}) as any);

			let updateCount = 0;
			(vi.spyOn(db, 'updateTable') as any).mockImplementation(() => {
				updateCount++;
				return {
					set: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([]),
				};
			});

			vi.spyOn(db, 'insertInto').mockImplementation(() => ({
				values: vi.fn().mockReturnThis(),
				returningAll: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue(createMockAssignment()),
			}) as any);

			vi.spyOn(db, 'transaction').mockImplementation(() => ({
				execute: vi.fn().mockImplementation(async (callback) => {
					return callback(db);
				}),
			}) as any);

			await bulkAssignUsersToDeskLocation(mockContext, {
				userIds,
				deskLocationId: 10,
				priority: 1,
			});

			// 2 updates per user (priority + user-desk combo) = 4 updates
			expect(updateCount).toBe(4);
		});
	});

	describe('Return Value', () => {
		it('should return array of created assignments', async () => {
			const mockDeskLocation = createMockDeskLocation();
			const userIds = ['user-a', 'user-b'];

			vi.spyOn(db, 'selectFrom').mockImplementation(() => ({
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(mockDeskLocation),
			}) as any);

			(vi.spyOn(db, 'updateTable') as any).mockReturnValue({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([]),
			});

			let idx = 0;
			vi.spyOn(db, 'insertInto').mockImplementation(() => {
				idx++;
				return {
					values: vi.fn().mockReturnThis(),
					returningAll: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue(
						createMockAssignment({
							id: idx,
							user_id: userIds[idx - 1],
						})
					),
				} as any;
			});

			vi.spyOn(db, 'transaction').mockImplementation(() => ({
				execute: vi.fn().mockImplementation(async (callback) => {
					return callback(db);
				}),
			}) as any);

			const result = await bulkAssignUsersToDeskLocation(mockContext, {
				userIds,
				deskLocationId: 10,
				priority: 1,
			});

			expect(result).toHaveLength(2);
			expect(result[0].user_id).toBe('user-a');
			expect(result[1].user_id).toBe('user-b');
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty userIds array', async () => {
			const mockDeskLocation = createMockDeskLocation();

			vi.spyOn(db, 'selectFrom').mockImplementation(() => ({
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(mockDeskLocation),
			}) as any);

			vi.spyOn(db, 'transaction').mockImplementation(() => ({
				execute: vi.fn().mockImplementation(async (callback) => {
					return callback(db);
				}),
			}) as any);

			const result = await bulkAssignUsersToDeskLocation(mockContext, {
				userIds: [],
				deskLocationId: 10,
				priority: 1,
			});

			expect(result).toHaveLength(0);
		});

		it('should handle large number of users', async () => {
			const mockDeskLocation = createMockDeskLocation();
			const userIds = Array.from({ length: 50 }, (_, i) => `user-${i + 1}`);

			vi.spyOn(db, 'selectFrom').mockImplementation(() => ({
				leftJoin: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				executeTakeFirst: vi.fn().mockResolvedValue(mockDeskLocation),
			}) as any);

			(vi.spyOn(db, 'updateTable') as any).mockReturnValue({
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([]),
			});

			let insertCount = 0;
			vi.spyOn(db, 'insertInto').mockImplementation(() => {
				insertCount++;
				return {
					values: vi.fn().mockReturnThis(),
					returningAll: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue(
						createMockAssignment({ id: insertCount })
					),
				} as any;
			});

			vi.spyOn(db, 'transaction').mockImplementation(() => ({
				execute: vi.fn().mockImplementation(async (callback) => {
					return callback(db);
				}),
			}) as any);

			const result = await bulkAssignUsersToDeskLocation(mockContext, {
				userIds,
				deskLocationId: 10,
				priority: 1,
			});

			expect(result).toHaveLength(50);
			expect(insertCount).toBe(50);
		});
	});
});
