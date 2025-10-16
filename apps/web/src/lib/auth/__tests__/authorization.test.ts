import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { requireRole } from '../requireRole';
import { checkRole } from '../checkRole';
import { requireOwnership } from '../requireOwnership';
import { requireAssigned } from '../requireAssigned';
import { db } from '@/api/database/kysely';
import type { Context } from '@/server/trpc/context';

// Mock the database
vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
	},
}));

// Reusable mock user with all required fields
const createMockUser = (overrides?: Partial<NonNullable<Context['session']>['user']>) => ({
	id: 'user-123',
	name: 'Test User',
	email: 'test@example.com',
	phone: null,
	role: 'Admin' as string | null,
	client_id: 'client-abc',
	...overrides,
});

// Reusable mock session with all required fields
const createMockSession = (userOverrides?: Partial<NonNullable<Context['session']>['user']>) => ({
	user: createMockUser(userOverrides),
	expires: '2025-12-31T23:59:59.999Z',
});

describe('Authorization Functions', () => {
	describe('requireRole()', () => {
		it('should return true when user has the required role', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Admin' }),
			};

			const result = requireRole(ctx, 'Admin');
			expect(result).toBe(true);
		});

		it('should return true when user has one of multiple required roles', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Contributor' }),
			};

			const result = requireRole(ctx, ['Admin', 'Contributor']);
			expect(result).toBe(true);
		});

		it('should throw UNAUTHORIZED when user is not authenticated', () => {
			const ctx: Context = {
				session: null,
			};

			expect(() => requireRole(ctx, 'Admin')).toThrow(TRPCError);
			expect(() => requireRole(ctx, 'Admin')).toThrow('User is not authenticated.');
		});

		it('should throw UNAUTHORIZED when session exists but user.role is missing', () => {
			const ctx: Context = {
				session: createMockSession({ role: null }),
			};

			expect(() => requireRole(ctx, 'Admin')).toThrow(TRPCError);
			expect(() => requireRole(ctx, 'Admin')).toThrow('User is not authenticated.');
		});

		it('should throw FORBIDDEN when user does not have the required role', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Contributor' }),
			};

			expect(() => requireRole(ctx, 'Admin')).toThrow(TRPCError);
			expect(() => requireRole(ctx, 'Admin')).toThrow('User must have one of: Admin');
		});

		it('should throw FORBIDDEN when user does not have any of multiple required roles', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Contributor' }),
			};

			expect(() => requireRole(ctx, ['Admin', 'Super Admin'])).toThrow(TRPCError);
			expect(() => requireRole(ctx, ['Admin', 'Super Admin'])).toThrow('User must have one of: Admin, Super Admin');
		});

		it('should handle Super Admin role correctly', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Super Admin' }),
			};

			const result = requireRole(ctx, 'Super Admin');
			expect(result).toBe(true);
		});
	});

	describe('checkRole()', () => {
		it('should return true when user has the checked role', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Admin' }),
			};

			const result = checkRole(ctx, 'Admin');
			expect(result).toBe(true);
		});

		it('should return true when user has one of multiple checked roles', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Contributor' }),
			};

			const result = checkRole(ctx, ['Admin', 'Contributor']);
			expect(result).toBe(true);
		});

		it('should return false when user does not have the checked role', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Contributor' }),
			};

			const result = checkRole(ctx, 'Admin');
			expect(result).toBe(false);
		});

		it('should return false when user does not have any of multiple checked roles', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Contributor' }),
			};

			const result = checkRole(ctx, ['Admin', 'Super Admin']);
			expect(result).toBe(false);
		});

		it('should throw UNAUTHORIZED when user is not authenticated', () => {
			const ctx: Context = {
				session: null,
			};

			expect(() => checkRole(ctx, 'Admin')).toThrow(TRPCError);
			expect(() => checkRole(ctx, 'Admin')).toThrow('User is not authenticated.');
		});

		it('should throw UNAUTHORIZED when session exists but user.role is missing', () => {
			const ctx: Context = {
				session: createMockSession({ role: null }),
			};

			expect(() => checkRole(ctx, 'Admin')).toThrow(TRPCError);
			expect(() => checkRole(ctx, 'Admin')).toThrow('User is not authenticated.');
		});
	});

	describe('requireOwnership()', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should succeed when user is the creator', async () => {
			const ctx: Context = {
				session: createMockSession({ id: 'user-123' }),
			};

			const mockSelect = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					created_by: 'user-123',
					assignee: 'user-456',
				}),
			});

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: mockSelect,
			} as any);

			await expect(requireOwnership(ctx, 1, 100)).resolves.toBeUndefined();
		});

		it('should succeed when user is the assignee', async () => {
			const ctx: Context = {
				session: createMockSession({ id: 'user-123' }),
			};

			const mockSelect = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					created_by: 'user-456',
					assignee: 'user-123',
				}),
			});

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: mockSelect,
			} as any);

			await expect(requireOwnership(ctx, 1, 100)).resolves.toBeUndefined();
		});

		it('should succeed when user is both creator and assignee', async () => {
			const ctx: Context = {
				session: createMockSession({ id: 'user-123' }),
			};

			const mockSelect = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					created_by: 'user-123',
					assignee: 'user-123',
				}),
			});

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: mockSelect,
			} as any);

			await expect(requireOwnership(ctx, 1, 100)).resolves.toBeUndefined();
		});

		it('should throw FORBIDDEN when user is neither creator nor assignee', async () => {
			const ctx: Context = {
				session: createMockSession({ id: 'user-789' }),
			};

			const mockSelect = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					created_by: 'user-123',
					assignee: 'user-456',
				}),
			});

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: mockSelect,
			} as any);

			await expect(requireOwnership(ctx, 1, 100)).rejects.toThrow(TRPCError);
			await expect(requireOwnership(ctx, 1, 100)).rejects.toThrow(
				'User is neither the creator nor the current assignee on this checklist + claim'
			);
		});

		it('should throw FORBIDDEN when user is not authenticated', async () => {
			const ctx: Context = {
				session: null,
			};

			const mockSelect = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					created_by: 'user-123',
					assignee: 'user-456',
				}),
			});

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: mockSelect,
			} as any);

			await expect(requireOwnership(ctx, 1, 100)).rejects.toThrow(TRPCError);
			await expect(requireOwnership(ctx, 1, 100)).rejects.toThrow(
				'User is neither the creator nor the current assignee on this checklist + claim'
			);
		});

		it('should throw BAD_REQUEST when checklist + claim does not exist', async () => {
			const ctx: Context = {
				session: createMockSession({ id: 'user-123' }),
			};

			const mockSelect = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockRejectedValue(
					new TRPCError({ code: 'BAD_REQUEST', message: 'Checklist + claim does not exist' })
				),
			});

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: mockSelect,
			} as any);

			await expect(requireOwnership(ctx, 999, 999)).rejects.toThrow(TRPCError);
			await expect(requireOwnership(ctx, 999, 999)).rejects.toThrow('Checklist + claim does not exist');
		});

		it('should query the correct table and fields', async () => {
			const ctx: Context = {
				session: createMockSession({ id: 'user-123' }),
			};

			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({
				created_by: 'user-123',
				assignee: 'user-123',
			});

			const mockWhere = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnValue({
				where: mockWhere,
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			});

			const mockSelectFrom = vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: mockSelect,
			} as any);

			await requireOwnership(ctx, 5, 200);

			expect(mockSelectFrom).toHaveBeenCalledWith('checklist_claim');
			expect(mockSelect).toHaveBeenCalledWith(['created_by', 'assignee']);
			expect(mockWhere).toHaveBeenCalledWith('checklist_id', '=', 5);
			expect(mockWhere).toHaveBeenCalledWith('claim_id', '=', 200);
		});
	});

	describe('requireAssigned()', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should succeed when user is the assignee', async () => {
			const ctx: Context = {
				session: createMockSession({ id: 'user-123' }),
			};

			const mockSelect = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					assignee: 'user-123',
				}),
			});

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: mockSelect,
			} as any);

			await expect(requireAssigned(ctx, 1, 100)).resolves.toBeUndefined();
		});

		it('should throw FORBIDDEN when user is not the assignee', async () => {
			const ctx: Context = {
				session: createMockSession({ id: 'user-123' }),
			};

			const mockSelect = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					assignee: 'user-456',
				}),
			});

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: mockSelect,
			} as any);

			await expect(requireAssigned(ctx, 1, 100)).rejects.toThrow(TRPCError);
			await expect(requireAssigned(ctx, 1, 100)).rejects.toThrow(
				'User is not currently assigned to this checklist + claim'
			);
		});

		it('should throw FORBIDDEN when user created it but is not assigned', async () => {
			const ctx: Context = {
				session: createMockSession({ id: 'user-123' }),
			};

			const mockSelect = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					assignee: 'user-456',
				}),
			});

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: mockSelect,
			} as any);

			await expect(requireAssigned(ctx, 1, 100)).rejects.toThrow(TRPCError);
			await expect(requireAssigned(ctx, 1, 100)).rejects.toThrow(
				'User is not currently assigned to this checklist + claim'
			);
		});

		it('should throw FORBIDDEN when user is not authenticated', async () => {
			const ctx: Context = {
				session: null,
			};

			const mockSelect = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					assignee: 'user-456',
				}),
			});

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: mockSelect,
			} as any);

			await expect(requireAssigned(ctx, 1, 100)).rejects.toThrow(TRPCError);
			await expect(requireAssigned(ctx, 1, 100)).rejects.toThrow(
				'User is not currently assigned to this checklist + claim'
			);
		});

		it('should throw BAD_REQUEST when checklist + claim does not exist', async () => {
			const ctx: Context = {
				session: createMockSession({ id: 'user-123' }),
			};

			const mockSelect = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockRejectedValue(
					new TRPCError({ code: 'BAD_REQUEST', message: 'Checklist + claim does not exist' })
				),
			});

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: mockSelect,
			} as any);

			await expect(requireAssigned(ctx, 999, 999)).rejects.toThrow(TRPCError);
			await expect(requireAssigned(ctx, 999, 999)).rejects.toThrow('Checklist + claim does not exist');
		});

		it('should query the correct table and fields', async () => {
			const ctx: Context = {
				session: createMockSession({ id: 'user-123' }),
			};

			const mockExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({
				assignee: 'user-123',
			});

			const mockWhere = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnValue({
				where: mockWhere,
				executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
			});

			const mockSelectFrom = vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: mockSelect,
			} as any);

			await requireAssigned(ctx, 5, 200);

			expect(mockSelectFrom).toHaveBeenCalledWith('checklist_claim');
			expect(mockSelect).toHaveBeenCalledWith('assignee');
			expect(mockWhere).toHaveBeenCalledWith('checklist_id', '=', 5);
			expect(mockWhere).toHaveBeenCalledWith('claim_id', '=', 200);
		});

		it('should handle null assignee', async () => {
			const ctx: Context = {
				session: createMockSession({ id: 'user-123' }),
			};

			const mockSelect = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					assignee: null,
				}),
			});

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: mockSelect,
			} as any);

			await expect(requireAssigned(ctx, 1, 100)).rejects.toThrow(TRPCError);
			await expect(requireAssigned(ctx, 1, 100)).rejects.toThrow(
				'User is not currently assigned to this checklist + claim'
			);
		});
	});
});
