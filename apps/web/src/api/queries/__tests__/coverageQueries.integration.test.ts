/**
 * Integration tests for coverageQueries
 *
 * Tests cover:
 * - getCoverages: List coverages for a claim
 * - createCoverage: Create coverage with total_incurred recalculation
 * - updateCoverage: Update coverage with total_incurred recalculation
 * - deleteCoverage: Delete coverage with total_incurred recalculation
 * - getCoverageReservedTotal: Get sum of reserved amounts
 * - Tenant isolation on all operations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	getCoverages,
	createCoverage,
	updateCoverage,
	deleteCoverage,
	getCoverageReservedTotal,
} from '../coverageQueries';
import { createTestClient, createTestUser, createTestClaim } from '@/__tests__/integration/fixtures';

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

			// Create multiple coverages
			await db
				.insertInto('claim_coverage')
				.values([
					{
						claim_id: claim.id,
						client_id: client.id,
						coverage_type: 'dwelling',
						coverage_amount: '100000',
						amount_reserved: '5000',
						created_by: user.id,
					},
					{
						claim_id: claim.id,
						client_id: client.id,
						coverage_type: 'personal_property',
						coverage_amount: '50000',
						amount_reserved: '2500',
						created_by: user.id,
					},
				])
				.execute();

			const coverages = await getCoverages(ctx, claim.id);

			expect(coverages).toHaveLength(2);
			expect(coverages[0].coverage_type).toBe('dwelling');
			expect(coverages[1].coverage_type).toBe('personal_property');
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
					coverage_type: 'dwelling',
					coverage_amount: '100000',
					created_by: userB.id,
				})
				.execute();

			// Client A should not see client B's coverage
			const coverages = await getCoverages(ctxA, claimB.id);
			expect(coverages).toHaveLength(0);
		});

		it('should order coverages by id ascending', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			// Create coverages in specific order
			const cov1 = await db
				.insertInto('claim_coverage')
				.values({
					claim_id: claim.id,
					client_id: client.id,
					coverage_type: 'collision',
					created_by: user.id,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			const cov2 = await db
				.insertInto('claim_coverage')
				.values({
					claim_id: claim.id,
					client_id: client.id,
					coverage_type: 'comprehensive',
					created_by: user.id,
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
				coverage_type: 'dwelling',
				coverage_amount: 100000,
				amount_reserved: 5000,
			});

			expect(result.coverage.claim_id).toBe(claim.id);
			expect(result.coverage.coverage_type).toBe('dwelling');
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
				coverage_type: 'liability',
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
				coverage_type: 'dwelling',
				amount_reserved: 5000,
			});

			const result = await createCoverage(ctx, {
				claim_id: claim.id,
				coverage_type: 'personal_property',
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
				coverage_type: 'dwelling',
				coverage_amount: 100000,
				amount_reserved: 5000,
			});

			const result = await updateCoverage(ctx, coverage.id, {
				coverage_type: 'loss_of_use',
				coverage_amount: 150000,
				amount_reserved: 7500,
			});

			expect(result.coverage.coverage_type).toBe('loss_of_use');
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
					coverage_type: 'dwelling',
					coverage_amount: '100000',
					created_by: userB.id,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			// Client A should not be able to update client B's coverage
			await expect(
				updateCoverage(ctxA, covB.id, {
					coverage_type: 'other',
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
			expect(unchanged.coverage_type).toBe('dwelling');
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
				coverage_type: 'dwelling',
				amount_reserved: 5000,
			});

			await createCoverage(ctx, {
				claim_id: claim.id,
				coverage_type: 'personal_property',
				amount_reserved: 2500,
			});

			const result = await deleteCoverage(ctx, cov1.id);

			expect(result.claimId).toBe(claim.id);
			expect(result.totalIncurred).toBe(2500); // Only second coverage remains

			// Verify coverage was deleted
			const remaining = await getCoverages(ctx, claim.id);
			expect(remaining).toHaveLength(1);
			expect(remaining[0].coverage_type).toBe('personal_property');
		});

		it('should throw error when deleting non-existent coverage', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await expect(deleteCoverage(ctx, 999999)).rejects.toThrow('Coverage not found');
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
					coverage_type: 'dwelling',
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
						coverage_type: 'dwelling',
						amount_reserved: '5000.50',
						created_by: user.id,
					},
					{
						claim_id: claim.id,
						client_id: client.id,
						coverage_type: 'personal_property',
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
					coverage_type: 'dwelling',
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
					coverage_type: 'dwelling',
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
					coverage_type: 'dwelling',
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
	});
});
