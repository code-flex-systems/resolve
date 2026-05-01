/**
 * Integration tests for claimQueries recalculation functions
 *
 * Tests cover:
 * - assignClaim: Insert checklist_claim record with published checklist validation
 * - recalculateClaimExpectedRecovery: Compute expected_recovery from party liability + claim_amount
 * - recalculateTotalIncurred: Sum amount_reserved from active coverages
 *
 * @vitest-environment node
 * Setup: apps/web/src/__tests__/integration/setup.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestCoverage,
	createTestChecklist,
	createTestParty,
	createTestClaimParty,
} from '@/__tests__/integration/fixtures';
import {
	assignClaim,
	recalculateClaimExpectedRecovery,
	recalculateTotalIncurred,
} from '../claimQueries';
import { ClaimStatus } from '@/config/enums';

describe('claimQueries recalculation integration tests', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// ============================================================================
	// assignClaim
	// ============================================================================

	describe('assignClaim', () => {
		it('should create a checklist_claim record with UNWORKED status', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			await assignClaim(ctx, checklist.id, claim.id, user.id);

			// Verify the record was created
			const record = await db
				.selectFrom('checklist_claim')
				.selectAll()
				.where('checklist_id', '=', checklist.id)
				.where('claim_id', '=', claim.id)
				.executeTakeFirst();

			expect(record).toBeDefined();
			expect(record!.status).toBe(ClaimStatus.UNWORKED);
			expect(record!.assignee).toBe(user.id);
			expect(record!.created_by).toBe(user.id);
			expect(record!.client_id).toBe(client.id);
		});

		it('should throw on duplicate assignment (unique constraint on checklist_id + claim_id)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// First assignment succeeds
			await assignClaim(ctx, checklist.id, claim.id, user.id);

			// Second assignment should throw (duplicate)
			await expect(assignClaim(ctx, checklist.id, claim.id, user.id)).rejects.toThrow();
		});

		it('should throw for unpublished checklist when user is a Contributor', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: false,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Contributor',
			});

			await expect(assignClaim(ctx, checklist.id, claim.id, user.id)).rejects.toThrow(
				'Checklist is not published'
			);
		});

		it('should allow admin to assign claim with unpublished checklist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: false,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Admin should be able to assign even with unpublished checklist
			await assignClaim(ctx, checklist.id, claim.id, user.id);

			const record = await db
				.selectFrom('checklist_claim')
				.selectAll()
				.where('checklist_id', '=', checklist.id)
				.where('claim_id', '=', claim.id)
				.executeTakeFirst();

			expect(record).toBeDefined();
			expect(record!.status).toBe(ClaimStatus.UNWORKED);
		});

		it('should enforce tenant isolation (cannot assign using another clients checklist)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
			const checklistA = await createTestChecklist(db, {
				client_id: clientA.id,
				created_by: userA.id,
				published: true,
			});
			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});

			// clientB should not be able to use clientA's checklist
			await expect(assignClaim(ctxB, checklistA.id, claimB.id, userB.id)).rejects.toThrow();
		});

		it('should throw when checklist does not exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			await expect(
				assignClaim(ctx, '00000000-0000-0000-0000-000000000000', claim.id, user.id)
			).rejects.toThrow('Checklist not found');
		});
	});

	// ============================================================================
	// recalculateClaimExpectedRecovery
	// ============================================================================

	describe('recalculateClaimExpectedRecovery', () => {
		it('should set expected_recovery = claim_amount when no parties exist (100% liability)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				claim_amount: '10000',
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const result = await recalculateClaimExpectedRecovery(ctx, claim.id);

			expect(result).toBe(10000);

			// Verify database was updated
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['expected_recovery'])
				.where('id', '=', claim.id)
				.executeTakeFirstOrThrow();

			expect(parseFloat(updatedClaim.expected_recovery as string)).toBe(10000);
		});

		it('should calculate 60% expected_recovery when one party has 40% liability', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				claim_amount: '10000',
			});
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
				liability_percentage: '40',
				parent_claim_party_id: null,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const result = await recalculateClaimExpectedRecovery(ctx, claim.id);

			// Our liability = 100% - 40% = 60%, expected_recovery = 0.6 * 10000 = 6000
			expect(result).toBe(6000);

			const updatedClaim = await db
				.selectFrom('claim')
				.select(['expected_recovery'])
				.where('id', '=', claim.id)
				.executeTakeFirstOrThrow();

			expect(parseFloat(updatedClaim.expected_recovery as string)).toBe(6000);
		});

		it('should sum liability from multiple parties', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				claim_amount: '20000',
			});
			const party1 = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const party2 = await createTestParty(db, { client_id: client.id, created_by: user.id });
			await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party1.id,
				client_id: client.id,
				created_by: user.id,
				liability_percentage: '30',
				parent_claim_party_id: null,
			});
			await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party2.id,
				client_id: client.id,
				created_by: user.id,
				liability_percentage: '25',
				parent_claim_party_id: null,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const result = await recalculateClaimExpectedRecovery(ctx, claim.id);

			// Our liability = 100% - 30% - 25% = 45%, expected_recovery = 0.45 * 20000 = 9000
			expect(result).toBe(9000);

			// Verify database was updated
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['expected_recovery'])
				.where('id', '=', claim.id)
				.executeTakeFirstOrThrow();

			expect(parseFloat(updatedClaim.expected_recovery as string)).toBe(9000);
		});

		it('should return 0 when claim_amount is zero', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				claim_amount: '0',
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const result = await recalculateClaimExpectedRecovery(ctx, claim.id);

			expect(result).toBe(0);
		});

		it('should return 0 when claim_amount is null', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				claim_amount: null,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const result = await recalculateClaimExpectedRecovery(ctx, claim.id);

			expect(result).toBe(0);
		});

		it('should exclude deleted claim_party records from liability calculation', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				claim_amount: '10000',
			});
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			// Soft-deleted claim_party should be excluded
			await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
				liability_percentage: '50',
				parent_claim_party_id: null,
				deleted_at: new Date(),
				deleted_by: user.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const result = await recalculateClaimExpectedRecovery(ctx, claim.id);

			// Deleted party excluded, so 100% liability → expected_recovery = claim_amount
			expect(result).toBe(10000);
		});

		it('should exclude child claim_party records (those with parent_claim_party_id)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				claim_amount: '10000',
			});
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const parentClaimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
				liability_percentage: '40',
				parent_claim_party_id: null,
			});
			// Child claim_party should be excluded from liability sum
			const childParty = await createTestParty(db, { client_id: client.id, created_by: user.id });
			await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: childParty.id,
				client_id: client.id,
				created_by: user.id,
				liability_percentage: '30',
				parent_claim_party_id: parentClaimParty.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const result = await recalculateClaimExpectedRecovery(ctx, claim.id);

			// Only parent entity with 40% is counted, our share = 60%
			expect(result).toBe(6000);
		});
	});

	// ============================================================================
	// recalculateTotalIncurred
	// ============================================================================

	describe('recalculateTotalIncurred', () => {
		it('should sum amount_reserved from multiple coverages', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Insert coverages directly (bypass fixture delta logic for clean test)
			await db
				.insertInto('claim_coverage')
				.values([
					{
						claim_id: claim.id,
						client_id: client.id,
						loss_type: 'dwelling',
						amount_reserved: '5000',
						created_by: user.id,
					},
					{
						claim_id: claim.id,
						client_id: client.id,
						loss_type: 'personal_property',
						amount_reserved: '3000',
						created_by: user.id,
					},
				])
				.execute();

			const result = await recalculateTotalIncurred(ctx, claim.id);

			expect(result).toBe(8000);

			// Verify database was updated
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['total_incurred'])
				.where('id', '=', claim.id)
				.executeTakeFirstOrThrow();

			expect(parseFloat(updatedClaim.total_incurred as string)).toBe(8000);
		});

		it('should exclude soft-deleted coverages', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			await db
				.insertInto('claim_coverage')
				.values([
					{
						claim_id: claim.id,
						client_id: client.id,
						loss_type: 'dwelling',
						amount_reserved: '5000',
						created_by: user.id,
					},
					{
						claim_id: claim.id,
						client_id: client.id,
						loss_type: 'personal_property',
						amount_reserved: '3000',
						created_by: user.id,
						deleted_at: new Date(),
						deleted_by: user.id,
					},
				])
				.execute();

			const result = await recalculateTotalIncurred(ctx, claim.id);

			// Only the active coverage (5000) should be counted
			expect(result).toBe(5000);
		});

		it('should return 0 when no coverages exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const result = await recalculateTotalIncurred(ctx, claim.id);

			expect(result).toBe(0);

			const updatedClaim = await db
				.selectFrom('claim')
				.select(['total_incurred'])
				.where('id', '=', claim.id)
				.executeTakeFirstOrThrow();

			expect(parseFloat(updatedClaim.total_incurred as string)).toBe(0);
		});

		it('should return 0 when all coverages are soft-deleted', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			await db
				.insertInto('claim_coverage')
				.values({
					claim_id: claim.id,
					client_id: client.id,
					loss_type: 'dwelling',
					amount_reserved: '7500',
					created_by: user.id,
					deleted_at: new Date(),
					deleted_by: user.id,
				})
				.execute();

			const result = await recalculateTotalIncurred(ctx, claim.id);

			expect(result).toBe(0);
		});

		it('should handle coverages with null amount_reserved', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			await db
				.insertInto('claim_coverage')
				.values([
					{
						claim_id: claim.id,
						client_id: client.id,
						loss_type: 'dwelling',
						amount_reserved: '4000',
						created_by: user.id,
					},
					{
						claim_id: claim.id,
						client_id: client.id,
						loss_type: 'personal_property',
						amount_reserved: null,
						created_by: user.id,
					},
				])
				.execute();

			const result = await recalculateTotalIncurred(ctx, claim.id);

			// SQL SUM ignores NULLs, so only 4000 is counted
			expect(result).toBe(4000);
		});

		it('should update the claim total_incurred field in the database', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			// Create claim with an initial total_incurred that is stale
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				total_incurred: '99999',
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			await db
				.insertInto('claim_coverage')
				.values({
					claim_id: claim.id,
					client_id: client.id,
					loss_type: 'dwelling',
					amount_reserved: '2500',
					created_by: user.id,
				})
				.execute();

			await recalculateTotalIncurred(ctx, claim.id);

			// Verify it was corrected from 99999 to 2500
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['total_incurred'])
				.where('id', '=', claim.id)
				.executeTakeFirstOrThrow();

			expect(parseFloat(updatedClaim.total_incurred as string)).toBe(2500);
		});
	});
});
