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
import { DeductibleStatus } from '@/config/enums';

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
			returning: vi.fn(),
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
				{ id: 1, claim_id: 100, loss_type: 'dwelling', coverage_amount: '50000', deleted_at: null },
				{ id: 2, claim_id: 100, loss_type: 'personal_property', coverage_amount: '25000', deleted_at: null },
			]);

			(db.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockChain as any);

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

			(db.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockChain as any);

			await getCoverages(mockAdminContext, 100);

			// Verify deleted_at filter is applied
			expect(mockChain.where).toHaveBeenCalledWith('deleted_at', 'is', null);
		});
	});

	describe('getCoveragesByClaimParty', () => {
		it('should filter coverages by claim_party_id and client_id', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([
				{ id: 1, claim_party_id: 50, loss_type: 'dwelling', coverage_amount: '50000' },
			]);

			(db.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockChain as any);

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
			const mockClaim = {
				id: 100,
				client_id: 'client-abc',
				date_of_loss: new Date('2022-01-01'),
			};
			const mockCoverage = {
				id: 1,
				claim_id: 100,
				claim_party_id: 50,
				loss_type: 'dwelling',
				coverage_amount: '50000.00',
				amount_reserved: null,
				deductible_amount: '0.00',
				deductible_status: DeductibleStatus.NOT_CONFIRMED,
				subro_applicable: false,
				statute_date: new Date('2026-01-01'),
				statute_preserved: false,
				client_id: 'client-abc',
				created_by: 'admin-123',
			};

			// Mock first call (get claim) and second call (insert coverage) and third (update claim)
			mockChain.executeTakeFirstOrThrow
				.mockResolvedValueOnce(mockClaim) // First call: get claim
				.mockResolvedValueOnce(mockCoverage) // Second call: insert coverage
				.mockResolvedValueOnce({ total_incurred: '5000.00' }); // Third call: update claim

			(db.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockChain as any);
			(db.insertInto as ReturnType<typeof vi.fn>).mockReturnValue(mockChain as any);
			(db.updateTable as ReturnType<typeof vi.fn>).mockReturnValue(mockChain as any);

			await createCoverage(mockAdminContext, {
				claim_id: 100,
				claim_party_id: 50,
				loss_type: 'dwelling',
				coverage_amount: 50000,
				deductible_status: DeductibleStatus.NOT_CONFIRMED,
			});

			expect(db.selectFrom).toHaveBeenCalledWith('claim');
			expect(db.insertInto).toHaveBeenCalledWith('claim_coverage');
			expect(mockChain.values).toHaveBeenCalledWith(expect.objectContaining({
				claim_id: 100,
				claim_party_id: 50,
				loss_type: 'dwelling',
				coverage_amount: 50000,
				amount_reserved: null,
				deductible_amount: 0,
				deductible_status: DeductibleStatus.NOT_CONFIRMED,
				subro_applicable: false,
				statute_preserved: false,
				client_id: 'client-abc',
				created_by: 'admin-123',
			}));
		});

		it('should require claim_party_id for new coverages', async () => {
			const mockChain = createMockQueryBuilder();
			const mockClaim = {
				id: 100,
				client_id: 'client-abc',
				date_of_loss: new Date('2022-01-01'),
			};
			mockChain.executeTakeFirstOrThrow
				.mockResolvedValueOnce(mockClaim)
				.mockResolvedValueOnce({ id: 1, claim_id: 100, claim_party_id: 50 })
				.mockResolvedValueOnce({ total_incurred: '0.00' });

			(db.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockChain as any);
			(db.insertInto as ReturnType<typeof vi.fn>).mockReturnValue(mockChain as any);
			(db.updateTable as ReturnType<typeof vi.fn>).mockReturnValue(mockChain as any);

			// Verify claim_party_id is included in the values
			await createCoverage(mockAdminContext, {
				claim_id: 100,
				claim_party_id: 50,
				loss_type: 'dwelling',
				deductible_status: DeductibleStatus.NOT_CONFIRMED,
			});

			const valuesCall = mockChain.values.mock.calls[0][0];
			expect(valuesCall.claim_party_id).toBe(50);
		});
	});

	describe('updateCoverage', () => {
		it('should update coverage and filter by client_id', async () => {
			const mockChain = createMockQueryBuilder();
			const oldCoverage = {
				amount_reserved: '50000',
				deductible_amount: '1000',
				deductible_status: DeductibleStatus.NOT_CONFIRMED,
				claim_id: 100,
			};
			const updatedCoverage = {
				id: 1,
				claim_id: 100,
				loss_type: 'dwelling',
				coverage_amount: '75000.00',
				amount_reserved: '75000.00',
			};

			mockChain.executeTakeFirstOrThrow
				.mockResolvedValueOnce(oldCoverage) // First call: get old coverage
				.mockResolvedValueOnce(updatedCoverage) // Second call: update coverage
				.mockResolvedValueOnce({ total_incurred: '75000.00' }); // Third call: update claim

			(db.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockChain as any);
			(db.updateTable as ReturnType<typeof vi.fn>).mockReturnValue(mockChain as any);

			const result = await updateCoverage(mockAdminContext, 1, {
				coverage_amount: 75000,
			});

			expect(db.selectFrom).toHaveBeenCalledWith('claim_coverage');
			expect(db.updateTable).toHaveBeenCalledWith('claim_coverage');
			expect(mockChain.where).toHaveBeenCalledWith('id', '=', 1);
			expect(mockChain.where).toHaveBeenCalledWith('client_id', '=', 'client-abc');
			expect(mockChain.where).toHaveBeenCalledWith('deleted_at', 'is', null);
			expect(result.coverage).toEqual(updatedCoverage);
		});
	});

	describe('archiveCoverage', () => {
		it('should soft delete coverage by setting deleted_at', async () => {
			const mockChain = createMockQueryBuilder();
			const archivedCoverage = {
				claim_id: 100,
				amount_reserved: '500',
				deductible_amount: '100',
				deductible_status: DeductibleStatus.APPLIES,
			};

			mockChain.executeTakeFirstOrThrow
				.mockResolvedValueOnce(archivedCoverage) // Archive and return coverage
				.mockResolvedValueOnce({ total_incurred: '0.00' }); // Update claim

			(db.updateTable as ReturnType<typeof vi.fn>).mockReturnValue(mockChain as any);
			(db.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockChain as any);

			const result = await archiveCoverage(mockAdminContext, 1);

			expect(db.updateTable).toHaveBeenCalledWith('claim_coverage');
			expect(mockChain.set).toHaveBeenCalledWith(expect.objectContaining({
				deleted_at: expect.any(Date),
				deleted_by: 'admin-123',
			}));
			expect(result.claimId).toBe(100);
		});

		it('should throw error if coverage not found', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.executeTakeFirstOrThrow.mockRejectedValue(new Error('Coverage not found'));

			(db.updateTable as ReturnType<typeof vi.fn>).mockReturnValue(mockChain as any);

			await expect(archiveCoverage(mockAdminContext, 999)).rejects.toThrow('Coverage not found');
		});
	});

	describe('getCoverageReservedTotal', () => {
		it('should sum amount_reserved for active coverages', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.executeTakeFirst.mockResolvedValue({ total_reserved: '15000' });

			(db.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockChain as any);

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

			(db.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockChain as any);

			const result = await getCoverageReservedTotal(mockAdminContext, 100);

			expect(result).toBe(0);
		});
	});

	describe('archiveCoveragesByClaimParty', () => {
		it('should soft delete all coverages for a claim party and nullify FK', async () => {
			const mockChain = createMockQueryBuilder();
			mockChain.execute.mockResolvedValue([]);

			(db.updateTable as ReturnType<typeof vi.fn>).mockReturnValue(mockChain as any);

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
