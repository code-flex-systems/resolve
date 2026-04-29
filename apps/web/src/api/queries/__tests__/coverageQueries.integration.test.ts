/**
 * Integration tests for coverageQueries
 *
 * Tests cover:
 * - getCoverages: List coverages for a claim (with soft-delete exclusion)
 * - getCoveragesByClaimParty: List coverages for a specific claim party
 * - createCoverage: Create coverage with claim_party_id and total_incurred recalculation
 * - updateCoverage: Update coverage with total_incurred recalculation
 * - archiveCoverage: Soft-delete coverage with total_incurred recalculation
 * - deleteCoverage: Hard delete coverage with total_incurred recalculation
 * - getCoverageReservedTotal: Get sum of reserved amounts (excluding soft-deleted)
 * - archiveCoveragesByClaimParty: Cascade soft-delete all coverages for a party
 * - Tenant isolation on all operations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	getCoverages,
	getCoveragesByClaimParty,
	getCoverageReservedTotal,
	archiveCoveragesByClaimParty,
} from '../coverageQueries';
import {
	createCoverage,
	updateCoverage,
	archiveCoverage,
	deleteCoverage,
} from '@/api/controllers/coverageController';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestParty,
	createTestClaimParty,
	createTestCoverage,
} from '@/__tests__/integration/fixtures';
import { DeductibleStatus } from '@/config/enums';

describe('coverageQueries integration tests', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	describe('getCoverages', () => {
		it('should return all coverages for a claim', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			// Create multiple coverages with explicit created_at for deterministic ordering
			await db
				.insertInto('claim_coverage')
				.values([
					{
						claim_id: claim.id,
						client_id: client.id,
						loss_type: 'dwelling',
						coverage_amount: '100000',
						amount_reserved: '5000',
						created_by: user.id,
						created_at: new Date('2024-01-01T00:00:00Z'),
					},
					{
						claim_id: claim.id,
						client_id: client.id,
						loss_type: 'personal_property',
						coverage_amount: '50000',
						amount_reserved: '2500',
						created_by: user.id,
						created_at: new Date('2024-01-02T00:00:00Z'),
					},
				])
				.execute();

			const coverages = await getCoverages(ctx, claim.id);

			expect(coverages).toHaveLength(2);
			expect(coverages[0].loss_type).toBe('dwelling');
			expect(coverages[1].loss_type).toBe('personal_property');
		});

		it('should return empty array for claim with no coverages', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const coverages = await getCoverages(ctx, claim.id);
			expect(coverages).toHaveLength(0);
		});

		it('should not return coverages from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			// Create coverage for client B
			await db
				.insertInto('claim_coverage')
				.values({
					claim_id: claimB.id,
					client_id: clientB.id,
					loss_type: 'dwelling',
					coverage_amount: '100000',
					created_by: userB.id,
				})
				.execute();

			// Client A should not see client B's coverage
			const coverages = await getCoverages(ctxA, claimB.id);
			expect(coverages).toHaveLength(0);
		});

		it('should order coverages by created_at ascending', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			// Create coverages with explicit created_at to guarantee deterministic ordering
			// (UUIDs are random, so id-tiebreak alone is not deterministic)
			const cov1 = await db
				.insertInto('claim_coverage')
				.values({
					claim_id: claim.id,
					client_id: client.id,
					loss_type: 'collision',
					created_by: user.id,
					created_at: new Date('2024-01-01T00:00:00Z'),
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			const cov2 = await db
				.insertInto('claim_coverage')
				.values({
					claim_id: claim.id,
					client_id: client.id,
					loss_type: 'comprehensive',
					created_by: user.id,
					created_at: new Date('2024-01-02T00:00:00Z'),
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			const coverages = await getCoverages(ctx, claim.id);

			expect(coverages[0].id).toBe(cov1.id);
			expect(coverages[1].id).toBe(cov2.id);
		});
	});

	describe('createCoverage', () => {
		it('should create a coverage and recalculate total_incurred', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const result = await createCoverage(ctx, {
				claim_id: claim.id,
				loss_type: 'dwelling',
				deductible_status: DeductibleStatus.NOT_CONFIRMED,
				coverage_amount: 100000,
				amount_reserved: 5000,
			});

			expect(result.coverage.claim_id).toBe(claim.id);
			expect(result.coverage.loss_type).toBe('dwelling');
			expect(result.coverage.coverage_amount).toBe('100000.00');
			expect(result.coverage.amount_reserved).toBe('5000.00');
			expect(result.coverage.client_id).toBe(client.id);
			expect(result.coverage.created_by).toBe(user.id);
			expect(result.totalIncurred).toBe(5000);

			// Verify claim total_incurred was updated
			const updatedClaim = await db.selectFrom('claim').selectAll().where('id', '=', claim.id).executeTakeFirstOrThrow();
			expect(updatedClaim.total_incurred).toBe('5000.00');
		});

		it('should handle null coverage_amount and amount_reserved', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const result = await createCoverage(ctx, {
				claim_id: claim.id,
				loss_type: 'liability',
				deductible_status: DeductibleStatus.NOT_CONFIRMED,
			});

			expect(result.coverage.coverage_amount).toBeNull();
			expect(result.coverage.amount_reserved).toBeNull();
			expect(result.totalIncurred).toBe(0);
		});

		it('should sum multiple coverages for total_incurred', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await createCoverage(ctx, {
				claim_id: claim.id,
				loss_type: 'dwelling',
				deductible_status: DeductibleStatus.NOT_CONFIRMED,
				amount_reserved: 5000,
			});

			const result = await createCoverage(ctx, {
				claim_id: claim.id,
				loss_type: 'personal_property',
				deductible_status: DeductibleStatus.NOT_CONFIRMED,
				amount_reserved: 2500,
			});

			expect(result.totalIncurred).toBe(7500);
		});
	});

	describe('updateCoverage', () => {
		it('should update coverage and recalculate total_incurred', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const { coverage } = await createCoverage(ctx, {
				claim_id: claim.id,
				loss_type: 'dwelling',
				deductible_status: DeductibleStatus.NOT_CONFIRMED,
				coverage_amount: 100000,
				amount_reserved: 5000,
			});

			const result = await updateCoverage(ctx, coverage.id, {
				loss_type: 'loss_of_use',
				coverage_amount: 150000,
				amount_reserved: 7500,
			});

			expect(result.coverage.loss_type).toBe('loss_of_use');
			expect(result.coverage.coverage_amount).toBe('150000.00');
			expect(result.coverage.amount_reserved).toBe('7500.00');
			expect(result.coverage.updated_by).toBe(user.id);
			expect(result.totalIncurred).toBe(7500);
		});

		it('should not update coverage from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			// Create coverage for client B
			const covB = await db
				.insertInto('claim_coverage')
				.values({
					claim_id: claimB.id,
					client_id: clientB.id,
					loss_type: 'dwelling',
					coverage_amount: '100000',
					created_by: userB.id,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			// Client A should not be able to update client B's coverage
			await expect(
				updateCoverage(ctxA, covB.id, {
					loss_type: 'other',
					coverage_amount: 999999,
					amount_reserved: 999999,
				})
			).rejects.toThrow();

			// Verify coverage was not changed
			const unchanged = await db
				.selectFrom('claim_coverage')
				.selectAll()
				.where('id', '=', covB.id)
				.executeTakeFirstOrThrow();
			expect(unchanged.loss_type).toBe('dwelling');
		});
	});

	describe('deleteCoverage', () => {
		it('should delete coverage and recalculate total_incurred', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const { coverage: cov1 } = await createCoverage(ctx, {
				claim_id: claim.id,
				loss_type: 'dwelling',
				deductible_status: DeductibleStatus.NOT_CONFIRMED,
				amount_reserved: 5000,
			});

			await createCoverage(ctx, {
				claim_id: claim.id,
				loss_type: 'personal_property',
				deductible_status: DeductibleStatus.NOT_CONFIRMED,
				amount_reserved: 2500,
			});

			const result = await deleteCoverage(ctx, cov1.id);

			expect(result.claimId).toBe(claim.id);
			expect(result.totalIncurred).toBe(2500); // Only second coverage remains

			// Verify coverage was deleted
			const remaining = await getCoverages(ctx, claim.id);
			expect(remaining).toHaveLength(1);
			expect(remaining[0].loss_type).toBe('personal_property');
		});

		it('should throw error when deleting non-existent coverage', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await expect(deleteCoverage(ctx, '00000000-0000-0000-0000-000000000000')).rejects.toThrow('Coverage not found');
		});

		it('should not delete coverage from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			// Create coverage for client B
			const covB = await db
				.insertInto('claim_coverage')
				.values({
					claim_id: claimB.id,
					client_id: clientB.id,
					loss_type: 'dwelling',
					coverage_amount: '100000',
					created_by: userB.id,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			// Client A should not be able to delete client B's coverage
			await expect(deleteCoverage(ctxA, covB.id)).rejects.toThrow('Coverage not found');

			// Verify coverage still exists
			const stillExists = await db
				.selectFrom('claim_coverage')
				.selectAll()
				.where('id', '=', covB.id)
				.executeTakeFirst();
			expect(stillExists).toBeTruthy();
		});
	});

	describe('getCoverageReservedTotal', () => {
		it('should return sum of all reserved amounts for a claim', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await db
				.insertInto('claim_coverage')
				.values([
					{
						claim_id: claim.id,
						client_id: client.id,
						loss_type: 'dwelling',
						amount_reserved: '5000.50',
						created_by: user.id,
					},
					{
						claim_id: claim.id,
						client_id: client.id,
						loss_type: 'personal_property',
						amount_reserved: '2500.25',
						created_by: user.id,
					},
				])
				.execute();

			const total = await getCoverageReservedTotal(ctx, claim.id);
			expect(total).toBe(7500.75);
		});

		it('should return 0 when no coverages exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const total = await getCoverageReservedTotal(ctx, claim.id);
			expect(total).toBe(0);
		});

		it('should return 0 when all reserved amounts are null', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await db
				.insertInto('claim_coverage')
				.values({
					claim_id: claim.id,
					client_id: client.id,
					loss_type: 'dwelling',
					amount_reserved: null,
					created_by: user.id,
				})
				.execute();

			const total = await getCoverageReservedTotal(ctx, claim.id);
			expect(total).toBe(0);
		});

		it('should not include coverages from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
			const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });
			const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id, email: userB.email, role: 'user' });

			// Create coverage for client A
			await db
				.insertInto('claim_coverage')
				.values({
					claim_id: claimA.id,
					client_id: clientA.id,
					loss_type: 'dwelling',
					amount_reserved: '5000',
					created_by: userA.id,
				})
				.execute();

			// Create coverage for client B on their own claim
			await db
				.insertInto('claim_coverage')
				.values({
					claim_id: claimB.id,
					client_id: clientB.id,
					loss_type: 'dwelling',
					amount_reserved: '10000',
					created_by: userB.id,
				})
				.execute();

			// Client A should only see their own total
			const totalA = await getCoverageReservedTotal(ctxA, claimA.id);
			expect(totalA).toBe(5000);

			// Client B should only see their own total
			const totalB = await getCoverageReservedTotal(ctxB, claimB.id);
			expect(totalB).toBe(10000);
		});

		it('should exclude soft-deleted coverages from total', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			// Create active coverage
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				amount_reserved: '5000',
			});

			// Create soft-deleted coverage
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				amount_reserved: '3000',
				deleted_at: new Date(),
				deleted_by: user.id,
			});

			const total = await getCoverageReservedTotal(ctx, claim.id);
			expect(total).toBe(5000); // Only active coverage
		});
	});

	describe('getCoverages - soft-delete exclusion', () => {
		it('should exclude soft-deleted coverages', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			// Create active coverage
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				loss_type: 'dwelling',
			});

			// Create soft-deleted coverage
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				loss_type: 'personal_property',
				deleted_at: new Date(),
				deleted_by: user.id,
			});

			const coverages = await getCoverages(ctx, claim.id);

			expect(coverages).toHaveLength(1);
			expect(coverages[0].loss_type).toBe('dwelling');
		});
	});

	describe('getCoveragesByClaimParty', () => {
		it('should return coverages for a specific claim party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id, party_type: 'entity' });
			const claimParty = await createTestClaimParty(db, {
				client_id: client.id,
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			// Create coverages for this claim party
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				loss_type: 'dwelling',
				coverage_amount: '100000',
			});
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				loss_type: 'personal_property',
				coverage_amount: '50000',
			});

			const coverages = await getCoveragesByClaimParty(ctx, claimParty.id);

			expect(coverages).toHaveLength(2);
			expect(coverages.some((c) => c.loss_type === 'dwelling')).toBe(true);
			expect(coverages.some((c) => c.loss_type === 'personal_property')).toBe(true);
		});

		it('should not return coverages from other claim parties', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const party1 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				party_type: 'entity',
				name: 'Test Party A',
			});
			const party2 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				party_type: 'entity',
				name: 'Test Party B',
			});
			const claimParty1 = await createTestClaimParty(db, {
				client_id: client.id,
				claim_id: claim.id,
				party_id: party1.id,
				created_by: user.id,
			});
			const claimParty2 = await createTestClaimParty(db, {
				client_id: client.id,
				claim_id: claim.id,
				party_id: party2.id,
				created_by: user.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			// Create coverage for party 1
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty1.id,
				created_by: user.id,
				loss_type: 'dwelling',
			});

			// Create coverage for party 2
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty2.id,
				created_by: user.id,
				loss_type: 'personal_property',
			});

			const coverages = await getCoveragesByClaimParty(ctx, claimParty1.id);

			expect(coverages).toHaveLength(1);
			expect(coverages[0].loss_type).toBe('dwelling');
		});

		it('should exclude soft-deleted coverages', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id, party_type: 'entity' });
			const claimParty = await createTestClaimParty(db, {
				client_id: client.id,
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			// Create active coverage
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				loss_type: 'dwelling',
			});

			// Create soft-deleted coverage
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				loss_type: 'personal_property',
				deleted_at: new Date(),
				deleted_by: user.id,
			});

			const coverages = await getCoveragesByClaimParty(ctx, claimParty.id);

			expect(coverages).toHaveLength(1);
			expect(coverages[0].loss_type).toBe('dwelling');
		});

		it('should enforce tenant isolation', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
			const partyA = await createTestParty(db, { client_id: clientA.id, created_by: userA.id, party_type: 'entity' });
			const claimPartyA = await createTestClaimParty(db, {
				claim_id: claimA.id,
				party_id: partyA.id,
				client_id: clientA.id,
				created_by: userA.id,
			});
			const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id, email: userB.email, role: 'user' });

			// Create coverage for client A
			await createTestCoverage(db, {
				client_id: clientA.id,
				claim_id: claimA.id,
				claim_party_id: claimPartyA.id,
				created_by: userA.id,
			});

			// Client B should not see client A's coverages
			const coverages = await getCoveragesByClaimParty(ctxB, claimPartyA.id);
			expect(coverages).toHaveLength(0);
		});
	});

	describe('createCoverage with claim_party_id', () => {
		it('should create coverage linked to a claim party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id, party_type: 'entity' });
			const claimParty = await createTestClaimParty(db, {
				client_id: client.id,
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const result = await createCoverage(ctx, {
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				loss_type: 'dwelling',
				deductible_status: DeductibleStatus.NOT_CONFIRMED,
				coverage_amount: 100000,
			});

			expect(result.coverage.claim_party_id).toBe(claimParty.id);
			expect(result.coverage.claim_id).toBe(claim.id);
		});
	});

	describe('archiveCoverage', () => {
		it('should soft-delete a coverage', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				amount_reserved: '5000',
			});

			const result = await archiveCoverage(ctx, coverage.id);

			expect(result.claimId).toBe(claim.id);
			expect(result.totalIncurred).toBe(0); // Coverage is now archived

			// Verify coverage is soft-deleted
			const archived = await db
				.selectFrom('claim_coverage')
				.selectAll()
				.where('id', '=', coverage.id)
				.executeTakeFirst();
			expect(archived?.deleted_at).not.toBeNull();
			expect(archived?.deleted_by).toBe(user.id);
		});

		it('should recalculate total_incurred after archiving', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			// Create two coverages
			const cov1 = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				amount_reserved: '5000',
			});

			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				amount_reserved: '3000',
			});

			// Archive first coverage
			const result = await archiveCoverage(ctx, cov1.id);

			expect(result.totalIncurred).toBe(3000); // Only second coverage remains
		});

		it('should throw error for non-existent coverage', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await expect(archiveCoverage(ctx, '00000000-0000-0000-0000-000000000000')).rejects.toThrow('Coverage not found');
		});

		it('should enforce tenant isolation', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
			const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id, email: userB.email, role: 'user' });

			const coverage = await createTestCoverage(db, {
				client_id: clientA.id,
				claim_id: claimA.id,
				created_by: userA.id,
			});

			// Client B should not be able to archive client A's coverage
			await expect(archiveCoverage(ctxB, coverage.id)).rejects.toThrow('Coverage not found');
		});
	});

	describe('archiveCoveragesByClaimParty', () => {
		it('should soft-delete all coverages for a claim party and nullify FK', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id, party_type: 'entity' });
			const claimParty = await createTestClaimParty(db, {
				client_id: client.id,
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			// Create coverages for this claim party
			const cov1 = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
			});
			const cov2 = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
			});

			await archiveCoveragesByClaimParty(ctx, claimParty.id);

			// Verify both coverages are soft-deleted and FK nullified
			const archived1 = await db
				.selectFrom('claim_coverage')
				.selectAll()
				.where('id', '=', cov1.id)
				.executeTakeFirst();
			const archived2 = await db
				.selectFrom('claim_coverage')
				.selectAll()
				.where('id', '=', cov2.id)
				.executeTakeFirst();

			expect(archived1?.deleted_at).not.toBeNull();
			expect(archived2?.deleted_at).not.toBeNull();
			expect(archived1?.claim_party_id).toBeNull();
			expect(archived2?.claim_party_id).toBeNull();
		});

		it('should not affect coverages from other claim parties', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const party1 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				party_type: 'entity',
				name: 'Test Party 1',
			});
			const party2 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				party_type: 'entity',
				name: 'Test Party 2',
			});
			const claimParty1 = await createTestClaimParty(db, {
				client_id: client.id,
				claim_id: claim.id,
				party_id: party1.id,
				created_by: user.id,
			});
			const claimParty2 = await createTestClaimParty(db, {
				client_id: client.id,
				claim_id: claim.id,
				party_id: party2.id,
				created_by: user.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			// Create coverage for party 1
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty1.id,
				created_by: user.id,
			});

			// Create coverage for party 2
			const cov2 = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty2.id,
				created_by: user.id,
			});

			// Archive coverages for party 1 only
			await archiveCoveragesByClaimParty(ctx, claimParty1.id);

			// Party 2's coverage should be unaffected
			const stillActive = await db
				.selectFrom('claim_coverage')
				.selectAll()
				.where('id', '=', cov2.id)
				.executeTakeFirst();
			expect(stillActive?.deleted_at).toBeNull();
		});

		it('should archive only coverages for the targeted claim party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const party1 = await createTestParty(db, { client_id: client.id, created_by: user.id, party_type: 'entity' });
			const party2 = await createTestParty(db, { client_id: client.id, created_by: user.id, party_type: 'entity' });
			const party3 = await createTestParty(db, { client_id: client.id, created_by: user.id, party_type: 'entity' });
			const claimParty1 = await createTestClaimParty(db, {
				client_id: client.id,
				claim_id: claim.id,
				party_id: party1.id,
				created_by: user.id,
			});
			const claimParty2 = await createTestClaimParty(db, {
				client_id: client.id,
				claim_id: claim.id,
				party_id: party2.id,
				created_by: user.id,
			});
			const claimParty3 = await createTestClaimParty(db, {
				client_id: client.id,
				claim_id: claim.id,
				party_id: party3.id,
				created_by: user.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const party1Coverages = await Promise.all([
				createTestCoverage(db, {
					client_id: client.id,
					claim_id: claim.id,
					claim_party_id: claimParty1.id,
					created_by: user.id,
				}),
				createTestCoverage(db, {
					client_id: client.id,
					claim_id: claim.id,
					claim_party_id: claimParty1.id,
					created_by: user.id,
				}),
			]);
			const party2Coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty2.id,
				created_by: user.id,
			});
			const party3Coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty3.id,
				created_by: user.id,
			});

			await archiveCoveragesByClaimParty(ctx, claimParty1.id);

			const archivedCoverages = await db
				.selectFrom('claim_coverage')
				.selectAll()
				.where('id', 'in', party1Coverages.map((coverage) => coverage.id))
				.execute();
			archivedCoverages.forEach((coverage) => {
				expect(coverage.deleted_at).not.toBeNull();
				expect(coverage.claim_party_id).toBeNull();
			});

			const stillActive = await db
				.selectFrom('claim_coverage')
				.selectAll()
				.where('id', 'in', [party2Coverage.id, party3Coverage.id])
				.execute();
			stillActive.forEach((coverage) => {
				expect(coverage.deleted_at).toBeNull();
			});
		});

		it('should enforce tenant isolation', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
			const partyA = await createTestParty(db, { client_id: clientA.id, created_by: userA.id, party_type: 'entity' });
			const claimPartyA = await createTestClaimParty(db, {
				claim_id: claimA.id,
				party_id: partyA.id,
				client_id: clientA.id,
				created_by: userA.id,
			});
			const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id, email: userB.email, role: 'user' });

			const coverage = await createTestCoverage(db, {
				client_id: clientA.id,
				claim_id: claimA.id,
				claim_party_id: claimPartyA.id,
				created_by: userA.id,
			});

			// Client B tries to archive client A's coverages - should do nothing (no error, just no effect)
			await archiveCoveragesByClaimParty(ctxB, claimPartyA.id);

			// Coverage should still be active
			const stillActive = await db
				.selectFrom('claim_coverage')
				.selectAll()
				.where('id', '=', coverage.id)
				.executeTakeFirst();
			expect(stillActive?.deleted_at).toBeNull();
		});
	});

	describe('Deductible functionality', () => {
		it('should create coverage with deductible and update claim total_incurred', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const result = await createCoverage(ctx, {
				claim_id: claim.id,
				loss_type: 'dwelling',
				deductible_amount: 1000,
				deductible_status: DeductibleStatus.APPLIES, // Should include in total_incurred
			});

			expect(result.coverage.deductible_amount).toBe('1000.00');
			expect(result.coverage.deductible_status).toBe(DeductibleStatus.APPLIES);

			// Claim total_incurred should increase by 1000
			expect(result.totalIncurred).toBe(1000);

			const updatedClaim = await db
				.selectFrom('claim')
				.selectAll()
				.where('id', '=', claim.id)
				.executeTakeFirstOrThrow();
			expect(updatedClaim.total_incurred).toBe('1000.00');
		});

		it('should enforce deductible_amount = 0 when status is NO_DEDUCTIBLE', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await expect(
				createCoverage(ctx, {
					claim_id: claim.id,
					loss_type: 'dwelling',
					deductible_amount: 500,
					deductible_status: DeductibleStatus.NO_DEDUCTIBLE, // Conflict!
				})
			).rejects.toThrow('Deductible amount must be $0');
		});

		it('should not add deductible to total_incurred when status is WAIVED', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const result = await createCoverage(ctx, {
				claim_id: claim.id,
				loss_type: 'dwelling',
				deductible_amount: 1000,
				deductible_status: DeductibleStatus.WAIVED, // Should NOT include
			});

			expect(result.coverage.deductible_amount).toBe('1000.00');
			expect(result.coverage.deductible_status).toBe(DeductibleStatus.WAIVED);
			expect(result.totalIncurred).toBe(0); // Should be unchanged
		});

		it('should default subro_applicable to false using placeholder function', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const result = await createCoverage(ctx, {
				claim_id: claim.id,
				loss_type: 'liability',
				deductible_status: DeductibleStatus.NOT_CONFIRMED,
			});

			// Placeholder returns false
			expect(result.coverage.subro_applicable).toBe(false);
		});

		it('should calculate statute_date using placeholder function', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const dateOfLoss = new Date('2022-03-10');
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				date_of_loss: dateOfLoss,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const result = await createCoverage(ctx, {
				claim_id: claim.id,
				loss_type: 'property_damage',
				deductible_status: DeductibleStatus.NOT_CONFIRMED,
			});

			// Placeholder adds 4 years - verify year/month are correct
			expect(result.coverage.statute_date).toBeTruthy();
			const statuteDate = new Date(result.coverage.statute_date!);
			expect(statuteDate.getUTCFullYear()).toBe(2026);
			expect(statuteDate.getUTCMonth()).toBe(2); // March (0-indexed)
			// Day might be off by 1 due to timezone, so just check it's close (9 or 10)
			expect([9, 10]).toContain(statuteDate.getUTCDate());
		});

		it('should adjust total_incurred when deductible status changes from APPLIES to WAIVED', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			// Create with APPLIES (included in total_incurred)
			const { coverage } = await createCoverage(ctx, {
				claim_id: claim.id,
				loss_type: 'dwelling',
				deductible_amount: 1000,
				deductible_status: DeductibleStatus.APPLIES,
			});

			let claimData = await db
				.selectFrom('claim')
				.select('total_incurred')
				.where('id', '=', claim.id)
				.executeTakeFirstOrThrow();
			expect(claimData.total_incurred).toBe('1000.00');

			// Update to WAIVED (should remove from total_incurred)
			const result = await updateCoverage(ctx, coverage.id, {
				deductible_status: DeductibleStatus.WAIVED,
			});

			expect(result.totalIncurred).toBe(0); // Should decrease by 1000

			claimData = await db
				.selectFrom('claim')
				.select('total_incurred')
				.where('id', '=', claim.id)
				.executeTakeFirstOrThrow();
			expect(claimData.total_incurred).toBe('0.00');
		});

		it('should combine reserve and deductible impacts on total_incurred', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const result = await createCoverage(ctx, {
				claim_id: claim.id,
				loss_type: 'dwelling',
				amount_reserved: 5000,
				deductible_amount: 1000,
				deductible_status: DeductibleStatus.APPLIES, // Deductible included
			});

			// Total impact = 5000 (reserve) + 1000 (deductible) = 6000
			expect(result.totalIncurred).toBe(6000);

			const claimData = await db
				.selectFrom('claim')
				.select('total_incurred')
				.where('id', '=', claim.id)
				.executeTakeFirstOrThrow();
			expect(claimData.total_incurred).toBe('6000.00');
		});

		it('should remove deductible impact when archiving coverage', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				amount_reserved: '5000',
				deductible_amount: '1000',
				deductible_status: DeductibleStatus.APPLIES,
			});

			// Should have both impacts
			let claimData = await db
				.selectFrom('claim')
				.select('total_incurred')
				.where('id', '=', claim.id)
				.executeTakeFirstOrThrow();
			expect(claimData.total_incurred).toBe('6000.00');

			// Archive coverage - should remove both impacts
			const result = await archiveCoverage(ctx, coverage.id);
			expect(result.totalIncurred).toBe(0);

			claimData = await db
				.selectFrom('claim')
				.select('total_incurred')
				.where('id', '=', claim.id)
				.executeTakeFirstOrThrow();
			expect(claimData.total_incurred).toBe('0.00');
		});

		it('should handle different deductible statuses correctly', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			// Test NOT_CONFIRMED (should include)
			const claim1 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const result1 = await createCoverage(ctx, {
				claim_id: claim1.id,
				loss_type: 'dwelling',
				deductible_amount: 1000,
				deductible_status: DeductibleStatus.NOT_CONFIRMED,
			});
			expect(result1.totalIncurred).toBe(1000);

			// Test REIMBURSED_BY_CLIENT (should include)
			const claim2 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const result2 = await createCoverage(ctx, {
				claim_id: claim2.id,
				loss_type: 'dwelling',
				deductible_amount: 1000,
				deductible_status: DeductibleStatus.REIMBURSED_BY_CLIENT,
			});
			expect(result2.totalIncurred).toBe(1000);

			// Test REIMBURSED_BY_ADVERSE (should include)
			const claim3 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const result3 = await createCoverage(ctx, {
				claim_id: claim3.id,
				loss_type: 'dwelling',
				deductible_amount: 1000,
				deductible_status: DeductibleStatus.REIMBURSED_BY_ADVERSE,
			});
			expect(result3.totalIncurred).toBe(1000);

			// Test NO_DEDUCTIBLE (must have amount = 0)
			const claim4 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const result4 = await createCoverage(ctx, {
				claim_id: claim4.id,
				loss_type: 'dwelling',
				deductible_amount: 0,
				deductible_status: DeductibleStatus.NO_DEDUCTIBLE,
			});
			expect(result4.totalIncurred).toBe(0);
		});
	});
});
