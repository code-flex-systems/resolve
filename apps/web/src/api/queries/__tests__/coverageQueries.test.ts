import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { db } from '@/api/database/kysely';
import type { ProtectedContext } from '@/server/trpc/trpc';
import config from '@/config/config';
import {
	getCoverages,
	getCoveragesByClaimParty,
	createCoverage,
	updateCoverage,
	archiveCoverage,
	deleteCoverage,
	getCoverageReservedTotal,
	archiveCoveragesByClaimParty,
} from '../coverageQueries';

// Mock the database
vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
		insertInto: vi.fn(),
		updateTable: vi.fn(),
		deleteFrom: vi.fn(),
	},
}));

// Mock recalculateTotalIncurred to avoid circular dependency
vi.mock('../claimQueries', () => ({
	recalculateTotalIncurred: vi.fn().mockResolvedValue(1000),
}));

describe('coverageQueries', () => {
	const mockAdminContext: ProtectedContext = {
		session: {
			user: {
				id: 'admin-123',
				clerkId: 'clerk_admin_123',
				name: 'Admin User',
				email: 'admin@example.com',
				phone: null,
				role: config.ROLES.ADMIN,
				client_id: 'client-abc',
			},
		},
		db,
	};

	// Create mock query builder chain
	const createMockQueryBuilder = () => {
		const mockChain: any = {
			selectFrom: vi.fn(),
			selectAll: vi.fn(),
			select: vi.fn(),
			where: vi.fn(),
			orderBy: vi.fn(),
			execute: vi.fn(),
			executeTakeFirst: vi.fn(),
			executeTakeFirstOrThrow: vi.fn(),
			insertInto: vi.fn(),
			values: vi.fn(),
			returningAll: vi.fn(),
			updateTable: vi.fn(),
			set: vi.fn(),
			deleteFrom: vi.fn(),
		};

		// Each method returns the chain for fluent API
		Object.keys(mockChain).forEach((key) => {
			if (typeof mockChain[key] === 'function' && key !== 'execute' && key !== 'executeTakeFirst' && key !== 'executeTakeFirstOrThrow') {
				mockChain[key].mockReturnValue(mockChain);
			}
		});

		return mockChain;
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('getCoverages', () => {
		it('should filter coverages by claim_id and client_id', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([
				{ id: 1, claim_id: 100, coverage_type: 'dwelling', coverage_amount: '50000', deleted_at: null },
				{ id: 2, claim_id: 100, coverage_type: 'personal_property', coverage_amount: '25000', deleted_at: null },
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			const result = await getCoverages(mockAdminContext, 100);

			expect(db.selectFrom).toHaveBeenCalledWith('claim_coverage');
			expect(mockChain.where).toHaveBeenCalledWith('claim_id', '=', 100);
			expect(mockChain.where).toHaveBeenCalledWith('client_id', '=', 'client-abc');
			expect(mockChain.where).toHaveBeenCalledWith('deleted_at', 'is', null);
			expect(result).toHaveLength(2);
		});

		it('should exclude soft-deleted coverages', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await getCoverages(mockAdminContext, 100);

			// Verify deleted_at filter is applied
			expect(mockChain.where).toHaveBeenCalledWith('deleted_at', 'is', null);
		});
	});

	describe('getCoveragesByClaimParty', () => {
		it('should filter coverages by claim_party_id and client_id', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([
				{ id: 1, claim_party_id: 50, coverage_type: 'dwelling', coverage_amount: '50000' },
			]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			const result = await getCoveragesByClaimParty(mockAdminContext, 50);

			expect(db.selectFrom).toHaveBeenCalledWith('claim_coverage');
			expect(mockChain.where).toHaveBeenCalledWith('claim_party_id', '=', 50);
			expect(mockChain.where).toHaveBeenCalledWith('client_id', '=', 'client-abc');
			expect(mockChain.where).toHaveBeenCalledWith('deleted_at', 'is', null);
			expect(result).toHaveLength(1);
		});
	});

	describe('createCoverage', () => {
		it('should insert coverage with claim_party_id and client_id', async () => {
			const mockChain = createMockQueryBuilder();
			const mockCoverage = {
				id: 1,
				claim_id: 100,
				claim_party_id: 50,
				coverage_type: 'dwelling',
				coverage_amount: 50000,
				amount_reserved: null,
				client_id: 'client-abc',
				created_by: 'admin-123',
			};
			mockChain.executeTakeFirstOrThrow.mockResolvedValue(mockCoverage);
			// Mock the selectFrom for recalculateTotalIncurred
			mockChain.executeTakeFirst.mockResolvedValue({ total_reserved: '1000' });

			vi.mocked(db.insertInto).mockReturnValue(mockChain as any);
			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await createCoverage(mockAdminContext, {
				claim_id: 100,
				claim_party_id: 50,
				coverage_type: 'dwelling',
				coverage_amount: 50000,
			});

			expect(db.insertInto).toHaveBeenCalledWith('claim_coverage');
			expect(mockChain.values).toHaveBeenCalledWith({
				claim_id: 100,
				claim_party_id: 50,
				coverage_type: 'dwelling',
				coverage_amount: 50000,
				amount_reserved: null,
				client_id: 'client-abc',
				created_by: 'admin-123',
			});
		});

		it('should require claim_party_id for new coverages', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.executeTakeFirstOrThrow.mockResolvedValue({ id: 1, claim_id: 100 });
			mockChain.executeTakeFirst.mockResolvedValue({ total_reserved: '0' });

			vi.mocked(db.insertInto).mockReturnValue(mockChain as any);
			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			// Verify claim_party_id is included in the values
			await createCoverage(mockAdminContext, {
				claim_id: 100,
				claim_party_id: 50,
				coverage_type: 'dwelling',
			});

			const valuesCall = mockChain.values.mock.calls[0][0];
			expect(valuesCall.claim_party_id).toBe(50);
		});
	});

	describe('updateCoverage', () => {
		it('should update coverage and filter by client_id', async () => {
			const mockChain = createMockQueryBuilder();
			const mockCoverage = {
				id: 1,
				claim_id: 100,
				coverage_type: 'dwelling',
				coverage_amount: 75000,
			};
			mockChain.executeTakeFirstOrThrow.mockResolvedValue(mockCoverage);

			vi.mocked(db.updateTable).mockReturnValue(mockChain as any);

			const result = await updateCoverage(mockAdminContext, 1, {
				coverage_amount: 75000,
			});

			expect(db.updateTable).toHaveBeenCalledWith('claim_coverage');
			expect(mockChain.where).toHaveBeenCalledWith('id', '=', 1);
			expect(mockChain.where).toHaveBeenCalledWith('client_id', '=', 'client-abc');
			expect(mockChain.where).toHaveBeenCalledWith('deleted_at', 'is', null);
			expect(result.coverage).toEqual(mockCoverage);
		});
	});

	describe('archiveCoverage', () => {
		it('should soft delete coverage by setting deleted_at', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.executeTakeFirst.mockResolvedValue({ claim_id: 100, total_reserved: '500' });
			mockChain.execute.mockResolvedValue([]);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);
			vi.mocked(db.updateTable).mockReturnValue(mockChain as any);

			const result = await archiveCoverage(mockAdminContext, 1);

			expect(db.selectFrom).toHaveBeenCalledWith('claim_coverage');
			expect(db.updateTable).toHaveBeenCalledWith('claim_coverage');
			expect(mockChain.set).toHaveBeenCalledWith(expect.objectContaining({
				deleted_at: expect.any(Date),
				deleted_by: 'admin-123',
			}));
			expect(result.claimId).toBe(100);
		});

		it('should throw error if coverage not found', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.executeTakeFirst.mockResolvedValue(undefined);

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			await expect(archiveCoverage(mockAdminContext, 999)).rejects.toThrow('Coverage not found');
		});
	});

	describe('getCoverageReservedTotal', () => {
		it('should sum amount_reserved for active coverages', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.executeTakeFirst.mockResolvedValue({ total_reserved: '15000' });

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			const result = await getCoverageReservedTotal(mockAdminContext, 100);

			expect(db.selectFrom).toHaveBeenCalledWith('claim_coverage');
			expect(mockChain.where).toHaveBeenCalledWith('claim_id', '=', 100);
			expect(mockChain.where).toHaveBeenCalledWith('client_id', '=', 'client-abc');
			expect(mockChain.where).toHaveBeenCalledWith('deleted_at', 'is', null);
			expect(result).toBe(15000);
		});

		it('should return 0 if no coverages with reserved amounts', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.executeTakeFirst.mockResolvedValue({ total_reserved: null });

			vi.mocked(db.selectFrom).mockReturnValue(mockChain as any);

			const result = await getCoverageReservedTotal(mockAdminContext, 100);

			expect(result).toBe(0);
		});
	});

	describe('archiveCoveragesByClaimParty', () => {
		it('should soft delete all coverages for a claim party and nullify FK', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([]);

			vi.mocked(db.updateTable).mockReturnValue(mockChain as any);

			await archiveCoveragesByClaimParty(mockAdminContext, 50);

			expect(db.updateTable).toHaveBeenCalledWith('claim_coverage');
			expect(mockChain.where).toHaveBeenCalledWith('claim_party_id', '=', 50);
			expect(mockChain.where).toHaveBeenCalledWith('client_id', '=', 'client-abc');
			expect(mockChain.where).toHaveBeenCalledWith('deleted_at', 'is', null);
			expect(mockChain.set).toHaveBeenCalledWith(expect.objectContaining({
				deleted_at: expect.any(Date),
				deleted_by: 'admin-123',
				claim_party_id: null,
			}));
		});
	});
});
