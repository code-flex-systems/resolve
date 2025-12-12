/**
 * Integration tests for liabilityQueries
 *
 * These tests run against a real database to verify:
 * - Multi-tenant data isolation
 * - Claim liability CRUD operations
 * - Soft delete behavior
 * - Aggregation calculations
 * - Expected recovery recalculation
 * - Feed external reference lookups
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestParty,
	createTestClaimParty,
	createTestClaimLiability,
} from '@/__tests__/integration/fixtures';
import {
	getClaimPartyLiabilities,
	getClaimLiabilities,
	getClaimLiability,
	getClaimLiabilityAggregates,
	getClaimAmountPaidTotal,
	createClaimLiability,
	updateClaimLiability,
	deleteClaimLiability,
	getClaimLiabilityForDeletion,
	findClaimLiabilityByExternalRef,
} from '../liabilityQueries';

describe('liabilityQueries integration', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// =====================================================================
	// GET QUERIES
	// =====================================================================

	describe('getClaimPartyLiabilities', () => {
		it('should return all liabilities for a claim party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				loss_type: 'property_damage',
				amount_paid: '1000.00',
			});
			await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				loss_type: 'bodily_injury',
				amount_paid: '2000.00',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimPartyLiabilities(ctx, claimParty.id);

			expect(result.length).toBe(2);
			expect(result.every((l) => l.claim_party_id === claimParty.id)).toBe(true);
		});

		it('should exclude soft-deleted liabilities', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				loss_type: 'property_damage',
			});
			const deletedLiability = await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				loss_type: 'bodily_injury',
			});

			// Soft delete one liability
			await db
				.updateTable('claim_liability')
				.set({ deleted_at: new Date() })
				.where('id', '=', deletedLiability.id)
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimPartyLiabilities(ctx, claimParty.id);

			expect(result.length).toBe(1);
			expect(result[0].loss_type).toBe('property_damage');
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const party = await createTestParty(db, { client_id: client1.id, created_by: user1.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user1.id,
			});

			await createTestClaimLiability(db, {
				client_id: client1.id,
				claim_party_id: claimParty.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getClaimPartyLiabilities(ctx2, claimParty.id);

			expect(result.length).toBe(0);
		});
	});

	describe('getClaimLiabilities', () => {
		it('should return all liabilities for a claim with party info', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party1 = await createTestParty(db, { client_id: client.id, created_by: user.id, name: `Party1 ${Date.now()}` });
			const party2 = await createTestParty(db, { client_id: client.id, created_by: user.id, name: `Party2 ${Date.now()}` });
			const claimParty1 = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party1.id,
				created_by: user.id,
				role: 'adverse_carrier',
			});
			const claimParty2 = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party2.id,
				created_by: user.id,
				role: 'responsible_party',
			});

			await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty1.id,
				created_by: user.id,
			});
			await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty2.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimLiabilities(ctx, claim.id);

			expect(result.length).toBe(2);
			// Should include party info
			expect(result.some((l) => l.role === 'adverse_carrier')).toBe(true);
			expect(result.some((l) => l.role === 'responsible_party')).toBe(true);
		});

		it('should exclude deleted claim parties', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
			});

			// Soft delete the claim party
			await db
				.updateTable('claim_party')
				.set({ deleted_at: new Date(), deleted_by: user.id })
				.where('id', '=', claimParty.id)
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimLiabilities(ctx, claim.id);

			expect(result.length).toBe(0);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const party = await createTestParty(db, { client_id: client1.id, created_by: user1.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user1.id,
			});

			await createTestClaimLiability(db, {
				client_id: client1.id,
				claim_party_id: claimParty.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getClaimLiabilities(ctx2, claim.id);

			expect(result.length).toBe(0);
		});

		it('should exclude soft-deleted liabilities even when claim party is active', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				loss_type: 'property_damage',
				amount_paid: '1000.00',
			});
			const deletedLiability = await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				loss_type: 'bodily_injury',
				amount_paid: '2000.00',
			});

			// Soft delete one liability (but NOT the claim party)
			await db
				.updateTable('claim_liability')
				.set({ deleted_at: new Date() })
				.where('id', '=', deletedLiability.id)
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimLiabilities(ctx, claim.id);

			expect(result.length).toBe(1);
			expect(result[0].loss_type).toBe('property_damage');
		});
	});

	describe('getClaimLiability', () => {
		it('should return a single liability by ID', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			const liability = await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				loss_type: 'collision',
				amount_paid: '5000.00',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimLiability(ctx, liability.id);

			expect(result).not.toBeUndefined();
			expect(result?.id).toBe(liability.id);
			expect(result?.loss_type).toBe('collision');
			expect(result?.amount_paid).toBe('5000.00');
		});

		it('should return undefined for non-existent liability', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimLiability(ctx, 999999);

			expect(result).toBeUndefined();
		});

		it('should return undefined for soft-deleted liability', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			const liability = await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
			});

			// Soft delete
			await db
				.updateTable('claim_liability')
				.set({ deleted_at: new Date() })
				.where('id', '=', liability.id)
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimLiability(ctx, liability.id);

			expect(result).toBeUndefined();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const party = await createTestParty(db, { client_id: client1.id, created_by: user1.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user1.id,
			});

			const liability = await createTestClaimLiability(db, {
				client_id: client1.id,
				claim_party_id: claimParty.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getClaimLiability(ctx2, liability.id);

			expect(result).toBeUndefined();
		});
	});

	// =====================================================================
	// AGGREGATE QUERIES
	// =====================================================================

	describe('getClaimLiabilityAggregates', () => {
		it('should return aggregated totals for a claim', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				coverage_amount: '10000.00',
				amount_paid: '3000.00',
			});
			await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				coverage_amount: '5000.00',
				amount_paid: '2000.00',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimLiabilityAggregates(ctx, claim.id);

			expect(result.total_coverage_amount).toBe(15000);
			expect(result.total_amount_paid).toBe(5000);
			expect(result.liability_count).toBe(2);
		});

		it('should return zeros for claim with no liabilities', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimLiabilityAggregates(ctx, claim.id);

			expect(result.total_coverage_amount).toBe(0);
			expect(result.total_amount_paid).toBe(0);
			expect(result.liability_count).toBe(0);
		});

		it('should exclude soft-deleted liabilities from aggregates', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				amount_paid: '1000.00',
			});
			const deletedLiability = await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				amount_paid: '5000.00',
			});

			// Soft delete one
			await db
				.updateTable('claim_liability')
				.set({ deleted_at: new Date() })
				.where('id', '=', deletedLiability.id)
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimLiabilityAggregates(ctx, claim.id);

			expect(result.total_amount_paid).toBe(1000);
			expect(result.liability_count).toBe(1);
		});
	});

	describe('getClaimLiabilityAggregates - tenant isolation', () => {
		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const party = await createTestParty(db, { client_id: client1.id, created_by: user1.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user1.id,
			});

			await createTestClaimLiability(db, {
				client_id: client1.id,
				claim_party_id: claimParty.id,
				created_by: user1.id,
				amount_paid: '5000.00',
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getClaimLiabilityAggregates(ctx2, claim.id);

			expect(result.total_amount_paid).toBe(0);
			expect(result.liability_count).toBe(0);
		});
	});

	describe('getClaimAmountPaidTotal', () => {
		it('should return total amount paid for a claim', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				amount_paid: '1500.00',
			});
			await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				amount_paid: '2500.00',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimAmountPaidTotal(ctx, claim.id);

			expect(result).toBe(4000);
		});

		it('should return 0 for claim with no liabilities', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimAmountPaidTotal(ctx, claim.id);

			expect(result).toBe(0);
		});

		it('should exclude soft-deleted liabilities', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				amount_paid: '1000.00',
			});
			const deletedLiability = await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				amount_paid: '5000.00',
			});

			// Soft delete one
			await db
				.updateTable('claim_liability')
				.set({ deleted_at: new Date() })
				.where('id', '=', deletedLiability.id)
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimAmountPaidTotal(ctx, claim.id);

			expect(result).toBe(1000);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const party = await createTestParty(db, { client_id: client1.id, created_by: user1.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user1.id,
			});

			await createTestClaimLiability(db, {
				client_id: client1.id,
				claim_party_id: claimParty.id,
				created_by: user1.id,
				amount_paid: '5000.00',
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getClaimAmountPaidTotal(ctx2, claim.id);

			expect(result).toBe(0);
		});
	});

	// =====================================================================
	// CREATE / UPDATE / DELETE
	// =====================================================================

	describe('createClaimLiability', () => {
		it('should create a new liability', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await createClaimLiability(ctx, {
				claim_party_id: claimParty.id,
				coverage_amount: 10000,
				loss_type: 'property_damage',
				amount_paid: 5000,
				notes: 'Test liability',
			});

			expect(result.liability.claim_party_id).toBe(claimParty.id);
			expect(result.liability.coverage_amount).toBe('10000.00');
			expect(result.liability.loss_type).toBe('property_damage');
			expect(result.liability.amount_paid).toBe('5000.00');
			expect(result.liability.notes).toBe('Test liability');
			expect(result.liability.manually_overridden).toBe(false);
			expect(result.liability.client_id).toBe(client.id);
			expect(result.liability.created_by).toBe(user.id);
			expect(result.claimId).toBe(claim.id);
		});

		it('should throw error for non-existent claim party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(
				createClaimLiability(ctx, {
					claim_party_id: 999999,
					amount_paid: 1000,
				})
			).rejects.toThrow('Claim party not found or access denied');
		});

		it('should enforce tenant isolation on claim party lookup', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const party = await createTestParty(db, { client_id: client1.id, created_by: user1.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(
				createClaimLiability(ctx2, {
					claim_party_id: claimParty.id,
					amount_paid: 1000,
				})
			).rejects.toThrow('Claim party not found or access denied');
		});

		it('should create liability with feed reference', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await createClaimLiability(ctx, {
				claim_party_id: claimParty.id,
				amount_paid: 1000,
				external_reference: 'EXT-123',
			});

			expect(result.liability.external_reference).toBe('EXT-123');
		});

		it('should create liability with line_of_business', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await createClaimLiability(ctx, {
				claim_party_id: claimParty.id,
				line_of_business: 'auto',
				loss_type: 'collision',
				coverage_amount: 25000,
				amount_paid: 0,
			});

			expect(result.liability.line_of_business).toBe('auto');
			expect(result.liability.loss_type).toBe('collision');
			expect(result.liability.coverage_amount).toBe('25000.00');
			expect(result.liability.amount_paid).toBe('0.00');
		});
	});

	describe('updateClaimLiability', () => {
		it('should update a liability and set manually_overridden to true', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			const liability = await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				amount_paid: '1000.00',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await updateClaimLiability(ctx, liability.id, {
				amount_paid: 2000,
				notes: 'Updated notes',
			});

			expect(result.liability.amount_paid).toBe('2000.00');
			expect(result.liability.notes).toBe('Updated notes');
			expect(result.liability.manually_overridden).toBe(true);
			expect(result.liability.updated_by).toBe(user.id);
		});

		it('should not set manually_overridden when fromFeed is true', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			const liability = await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				amount_paid: '1000.00',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await updateClaimLiability(
				ctx,
				liability.id,
				{
					amount_paid: 3000,
					last_synced_at: new Date(),
				},
				{ fromFeed: true }
			);

			expect(result.liability.amount_paid).toBe('3000.00');
			expect(result.liability.manually_overridden).toBe(false);
		});

		it('should update coverage_amount, line_of_business, and loss_type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			const liability = await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				coverage_amount: '10000.00',
				line_of_business: 'property',
				loss_type: 'fire',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await updateClaimLiability(ctx, liability.id, {
				coverage_amount: 50000,
				line_of_business: 'auto',
				loss_type: 'collision',
			});

			expect(result.liability.coverage_amount).toBe('50000.00');
			expect(result.liability.line_of_business).toBe('auto');
			expect(result.liability.loss_type).toBe('collision');
			expect(result.liability.manually_overridden).toBe(true);
		});

		it('should throw for non-existent liability', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(
				updateClaimLiability(ctx, 999999, { amount_paid: 1000 })
			).rejects.toThrow();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const party = await createTestParty(db, { client_id: client1.id, created_by: user1.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user1.id,
			});

			const liability = await createTestClaimLiability(db, {
				client_id: client1.id,
				claim_party_id: claimParty.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(
				updateClaimLiability(ctx2, liability.id, { amount_paid: 9999 })
			).rejects.toThrow();
		});
	});

	describe('deleteClaimLiability', () => {
		it('should soft delete a liability', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			const liability = await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await deleteClaimLiability(ctx, liability.id);

			expect(result.liability.id).toBe(liability.id);
			expect(result.liability.deleted_at).not.toBeNull();

			// Verify it's no longer returned by getClaimLiability
			const fetchResult = await getClaimLiability(ctx, liability.id);
			expect(fetchResult).toBeUndefined();
		});

		it('should throw for non-existent liability', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(deleteClaimLiability(ctx, 999999)).rejects.toThrow(
				'Liability not found or already deleted'
			);
		});

		it('should throw for already deleted liability', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			const liability = await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Delete once
			await deleteClaimLiability(ctx, liability.id);

			// Try to delete again
			await expect(deleteClaimLiability(ctx, liability.id)).rejects.toThrow(
				'Liability not found or already deleted'
			);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const party = await createTestParty(db, { client_id: client1.id, created_by: user1.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user1.id,
			});

			const liability = await createTestClaimLiability(db, {
				client_id: client1.id,
				claim_party_id: claimParty.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(deleteClaimLiability(ctx2, liability.id)).rejects.toThrow(
				'Liability not found or already deleted'
			);

			// Verify it still exists for client1
			const ctx1 = createTestContext(db, { id: user1.id, client_id: client1.id, role: 'Admin' });
			const fetchResult = await getClaimLiability(ctx1, liability.id);
			expect(fetchResult).not.toBeUndefined();
		});
	});

	// =====================================================================
	// HELPER QUERIES
	// =====================================================================

	describe('getClaimLiabilityForDeletion', () => {
		it('should return liability details for logging', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			const liability = await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				loss_type: 'comprehensive',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimLiabilityForDeletion(ctx, liability.id);

			expect(result).not.toBeUndefined();
			expect(result?.id).toBe(liability.id);
			expect(result?.claim_party_id).toBe(claimParty.id);
			expect(result?.claim_id).toBe(claim.id);
			expect(result?.loss_type).toBe('comprehensive');
		});

		it('should return undefined for non-existent liability', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimLiabilityForDeletion(ctx, 999999);

			expect(result).toBeUndefined();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const party = await createTestParty(db, { client_id: client1.id, created_by: user1.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user1.id,
			});

			const liability = await createTestClaimLiability(db, {
				client_id: client1.id,
				claim_party_id: claimParty.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getClaimLiabilityForDeletion(ctx2, liability.id);

			expect(result).toBeUndefined();
		});
	});

	describe('findClaimLiabilityByExternalRef', () => {
		it('should find liability by external reference', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			// Create via direct insert to set external_reference
			const liability = await db
				.insertInto('claim_liability')
				.values({
					client_id: client.id,
					claim_party_id: claimParty.id,
					external_reference: 'FEED-REF-001',
					created_by: user.id,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await findClaimLiabilityByExternalRef(ctx, claimParty.id, 'FEED-REF-001');

			expect(result).not.toBeUndefined();
			expect(result?.id).toBe(liability.id);
			expect(result?.external_reference).toBe('FEED-REF-001');
		});

		it('should return undefined for non-existent reference', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await findClaimLiabilityByExternalRef(ctx, claimParty.id, 'NON-EXISTENT');

			expect(result).toBeUndefined();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const party = await createTestParty(db, { client_id: client1.id, created_by: user1.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user1.id,
			});

			await db
				.insertInto('claim_liability')
				.values({
					client_id: client1.id,
					claim_party_id: claimParty.id,
					external_reference: 'ISOLATED-REF',
					created_by: user1.id,
				})
				.execute();

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await findClaimLiabilityByExternalRef(ctx2, claimParty.id, 'ISOLATED-REF');

			expect(result).toBeUndefined();
		});

		it('should still find soft-deleted liabilities (for feed upsert logic)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			const liability = await db
				.insertInto('claim_liability')
				.values({
					client_id: client.id,
					claim_party_id: claimParty.id,
					external_reference: 'DELETED-REF',
					created_by: user.id,
					deleted_at: new Date(),
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await findClaimLiabilityByExternalRef(ctx, claimParty.id, 'DELETED-REF');

			// This function intentionally returns soft-deleted records for feed upsert logic
			expect(result).not.toBeUndefined();
			expect(result?.id).toBe(liability.id);
			expect(result?.deleted_at).not.toBeNull();
		});
	});
});
