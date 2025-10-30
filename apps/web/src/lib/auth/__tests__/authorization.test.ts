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
				db,
			};

			const result = requireRole(ctx, 'Admin');
			expect(result).toBe(true);
		});

		it('should return true when user has one of multiple required roles', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Contributor' }),
				db,
			};

			const result = requireRole(ctx, ['Admin', 'Contributor']);
			expect(result).toBe(true);
		});

		it('should throw UNAUTHORIZED when user is not authenticated', () => {
			const ctx: Context = {
				session: null,
				db,
			};

			expect(() => requireRole(ctx, 'Admin')).toThrow(TRPCError);
			expect(() => requireRole(ctx, 'Admin')).toThrow('User is not authenticated.');
		});

		it('should throw UNAUTHORIZED when session exists but user.role is missing', () => {
			const ctx: Context = {
				session: createMockSession({ role: null }),
				db,
			};

			expect(() => requireRole(ctx, 'Admin')).toThrow(TRPCError);
			expect(() => requireRole(ctx, 'Admin')).toThrow('User is not authenticated.');
		});

		it('should throw FORBIDDEN when user does not have the required role', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Contributor' }),
				db,
			};

			expect(() => requireRole(ctx, 'Admin')).toThrow(TRPCError);
			expect(() => requireRole(ctx, 'Admin')).toThrow('User must have one of: Admin');
		});

		it('should throw FORBIDDEN when user does not have any of multiple required roles', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Contributor' }),
				db,
			};

			expect(() => requireRole(ctx, ['Admin', 'Super Admin'])).toThrow(TRPCError);
			expect(() => requireRole(ctx, ['Admin', 'Super Admin'])).toThrow('User must have one of: Admin, Super Admin');
		});

		it('should handle Super Admin role correctly', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Super Admin' }),
				db,
			};

			const result = requireRole(ctx, 'Super Admin');
			expect(result).toBe(true);
		});

		it('should handle empty array of required roles', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Admin' }),
				db,
			};

			// Empty array means no role can satisfy, so should throw
			expect(() => requireRole(ctx, [])).toThrow(TRPCError);
			expect(() => requireRole(ctx, [])).toThrow('User must have one of: ');
		});

		it('should handle role case sensitivity', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Admin' }),
				db,
			};

			// TypeScript would prevent this, but runtime check
			expect(() => requireRole(ctx, 'admin' as any)).toThrow(TRPCError);
			expect(() => requireRole(ctx, 'admin' as any)).toThrow('User must have one of: admin');
		});

		it('should throw correct error code for each scenario', () => {
			const unauthCtx: Context = { session: null, db };
			const wrongRoleCtx: Context = { session: createMockSession({ role: 'Contributor' }), db };

			try {
				requireRole(unauthCtx, 'Admin');
			} catch (error) {
				expect((error as TRPCError).code).toBe('UNAUTHORIZED');
			}

			try {
				requireRole(wrongRoleCtx, 'Admin');
			} catch (error) {
				expect((error as TRPCError).code).toBe('FORBIDDEN');
			}
		});
	});

	describe('checkRole()', () => {
		it('should return true when user has the checked role', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Admin' }),
				db,
			};

			const result = checkRole(ctx, 'Admin');
			expect(result).toBe(true);
		});

		it('should return true when user has one of multiple checked roles', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Contributor' }),
				db,
			};

			const result = checkRole(ctx, ['Admin', 'Contributor']);
			expect(result).toBe(true);
		});

		it('should return false when user does not have the checked role', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Contributor' }),
				db,
			};

			const result = checkRole(ctx, 'Admin');
			expect(result).toBe(false);
		});

		it('should return false when user does not have any of multiple checked roles', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Contributor' }),
				db,
			};

			const result = checkRole(ctx, ['Admin', 'Super Admin']);
			expect(result).toBe(false);
		});

		it('should throw UNAUTHORIZED when user is not authenticated', () => {
			const ctx: Context = {
				session: null,
				db,
			};

			expect(() => checkRole(ctx, 'Admin')).toThrow(TRPCError);
			expect(() => checkRole(ctx, 'Admin')).toThrow('User is not authenticated.');
		});

		it('should throw UNAUTHORIZED when session exists but user.role is missing', () => {
			const ctx: Context = {
				session: createMockSession({ role: null }),
				db,
			};

			expect(() => checkRole(ctx, 'Admin')).toThrow(TRPCError);
			expect(() => checkRole(ctx, 'Admin')).toThrow('User is not authenticated.');
		});

		it('should handle empty array of checked roles', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Admin' }),
				db,
			};

			// Empty array means no role matches
			const result = checkRole(ctx, []);
			expect(result).toBe(false);
		});

		it('should handle role case sensitivity', () => {
			const ctx: Context = {
				session: createMockSession({ role: 'Admin' }),
				db,
			};

			// TypeScript would prevent this, but runtime check
			const result = checkRole(ctx, 'admin' as any);
			expect(result).toBe(false);
		});

		it('should throw correct error code UNAUTHORIZED when not authenticated', () => {
			const ctx: Context = { session: null, db };

			try {
				checkRole(ctx, 'Admin');
			} catch (error) {
				expect((error as TRPCError).code).toBe('UNAUTHORIZED');
			}
		});
	});

	describe('requireOwnership()', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should succeed when user is the creator', async () => {
			const ctx: Context = {
				session: createMockSession({ id: 'user-123' }),
				db,
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
				db,
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
				db,
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
				db,
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
				db,
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
				db,
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
				db,
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

		it('should succeed when assignee is null but user is creator', async () => {
			const ctx: Context = {
				session: createMockSession({ id: 'user-123' }),
				db,
			};

			const mockSelect = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					created_by: 'user-123',
					assignee: null,
				}),
			});

			vi.spyOn(db, 'selectFrom').mockReturnValue({
				select: mockSelect,
			} as any);

			await expect(requireOwnership(ctx, 1, 100)).resolves.toBeUndefined();
		});

		it('should throw FORBIDDEN when assignee is null and user is not creator', async () => {
			const ctx: Context = {
				session: createMockSession({ id: 'user-789' }),
				db,
			};

			const mockSelect = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					created_by: 'user-123',
					assignee: null,
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

		it('should throw correct error codes for each scenario', async () => {
			const unauthCtx: Context = { session: null, db };
			const wrongUserCtx: Context = { session: createMockSession({ id: 'user-999' }), db };
			const validCtx: Context = { session: createMockSession({ id: 'user-123' }), db };

			// Unauthorized
			const mockSelectUnauth = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					created_by: 'user-123',
					assignee: 'user-456',
				}),
			});
			vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelectUnauth } as any);

			try {
				await requireOwnership(unauthCtx, 1, 100);
			} catch (error) {
				expect((error as TRPCError).code).toBe('FORBIDDEN');
			}

			// Forbidden (wrong user)
			const mockSelectForbidden = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					created_by: 'user-123',
					assignee: 'user-456',
				}),
			});
			vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelectForbidden } as any);

			try {
				await requireOwnership(wrongUserCtx, 1, 100);
			} catch (error) {
				expect((error as TRPCError).code).toBe('FORBIDDEN');
			}

			// Bad request (non-existent)
			const mockSelectBadRequest = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi
					.fn()
					.mockRejectedValue(new TRPCError({ code: 'BAD_REQUEST', message: 'Checklist + claim does not exist' })),
			});
			vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelectBadRequest } as any);

			try {
				await requireOwnership(validCtx, 999, 999);
			} catch (error) {
				expect((error as TRPCError).code).toBe('BAD_REQUEST');
			}
		});
	});

	describe('requireAssigned()', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should succeed when user is the assignee', async () => {
			const ctx: Context = {
				session: createMockSession({ id: 'user-123' }),
				db,
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
				db,
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
				db,
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
				db,
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
				db,
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
				db,
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
				db,
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

		it('should throw correct error codes for each scenario', async () => {
			const wrongUserCtx: Context = { session: createMockSession({ id: 'user-999' }), db };
			const validCtx: Context = { session: createMockSession({ id: 'user-123' }), db };

			// Forbidden (wrong user)
			const mockSelectForbidden = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
					assignee: 'user-123',
				}),
			});
			vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelectForbidden } as any);

			try {
				await requireAssigned(wrongUserCtx, 1, 100);
			} catch (error) {
				expect((error as TRPCError).code).toBe('FORBIDDEN');
			}

			// Bad request (non-existent)
			const mockSelectBadRequest = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnThis(),
				executeTakeFirstOrThrow: vi
					.fn()
					.mockRejectedValue(new TRPCError({ code: 'BAD_REQUEST', message: 'Checklist + claim does not exist' })),
			});
			vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelectBadRequest } as any);

			try {
				await requireAssigned(validCtx, 999, 999);
			} catch (error) {
				expect((error as TRPCError).code).toBe('BAD_REQUEST');
			}
		});

		it('should handle undefined session.user.id', async () => {
			const ctx: Context = {
				session: {
					user: {
						id: undefined as any, // Edge case: undefined id
						name: 'Test User',
						email: 'test@example.com',
						phone: null,
						role: 'Admin',
						client_id: 'client-abc',
					},
					expires: '2025-12-31T23:59:59.999Z',
				},
				db,
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

			await expect(requireAssigned(ctx, 1, 100)).rejects.toThrow(TRPCError);
			await expect(requireAssigned(ctx, 1, 100)).rejects.toThrow(
				'User is not currently assigned to this checklist + claim'
			);
		});
	});
});
