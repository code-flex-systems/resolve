/**
 * Integration tests for settlementQueries
 *
 * These tests run against a real database to verify:
 * - Multi-tenant data isolation
 * - Settlement CRUD operations
 * - Settlement status transitions
 * - Coverage and party associations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestParty,
	createTestClaimParty,
	createTestCoverage,
	createTestSettlement,
} from '@/__tests__/integration/fixtures';
import {
	createSettlement,
	getSettlement,
	getSettlementsByClaimId,
	updateSettlement,
	deleteSettlement,
	getSettlementsForDropdown,
	getSettlementForDeletion,
} from '../settlementQueries';
import { SettlementStatus } from '@/config/enums';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

/**
 * Helper to create a claim party and coverage for settlement tests.
 */
async function createSettlementDependencies(
	db: Kysely<DB>,
	{
		client_id,
		claim_id,
		created_by,
	}: {
		client_id: string;
		claim_id: number;
		created_by: string;
	}
) {
	const party = await createTestParty(db, {
		client_id,
		created_by,
		party_type: 'facilitator',
	});
	const claimParty = await createTestClaimParty(db, {
		claim_id,
		party_id: party.id,
		created_by,
		role: ['adverse_carrier'],
	});
	const coverage = await createTestCoverage(db, {
		client_id,
		claim_id,
		created_by,
		loss_type: 'liability',
		coverage_amount: 100000,
	});
	return { party, claimParty, coverage };
}

describe('settlementQueries integration', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	describe('createSettlement', () => {
		it('should create a settlement with required fields', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const demandDate = new Date();

			// Act
			const result = await createSettlement(ctx, claim.id, {
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				demand_amount: 50000,
				demand_date: demandDate,
			});

			// Assert
			expect(result).toBeDefined();
			expect(result.claim_id).toBe(claim.id);
			expect(result.client_id).toBe(client.id);
			expect(result.claim_party_id).toBe(claimParty.id);
			expect(result.coverage_id).toBe(coverage.id);
			expect(parseFloat(result.demand_amount as string)).toBe(50000);
			expect(result.status).toBe(SettlementStatus.SENT);
			expect(result.created_by).toBe(user.id);
		});

		it('should create a settlement with optional fields', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const demandDate = new Date();
			const settlementDate = new Date();

			// Act
			const result = await createSettlement(ctx, claim.id, {
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				demand_amount: 50000,
				demand_date: demandDate,
				agreed_liability_percentage: 75,
				settlement_amount: 37500,
				settlement_date: settlementDate,
				status: SettlementStatus.SETTLED,
				notes: 'Settlement with all fields',
			});

			// Assert
			expect(parseFloat(result.agreed_liability_percentage as string)).toBe(75);
			expect(parseFloat(result.settlement_amount as string)).toBe(37500);
			expect(result.status).toBe(SettlementStatus.SETTLED);
			expect(result.notes).toBe('Settlement with all fields');
		});

		it('should set client_id from context session', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await createSettlement(ctx, claim.id, {
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				demand_amount: 50000,
				demand_date: new Date(),
			});

			// Assert
			expect(result.client_id).toBe(client.id);
			expect(result.created_by).toBe(user.id);
		});
	});

	describe('getSettlement', () => {
		it('should return a settlement with party and coverage details', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { party, claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const settlement = await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user.id,
				demand_amount: 50000,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getSettlement(ctx, settlement.id);

			// Assert
			expect(result).toBeDefined();
			expect(result?.id).toBe(settlement.id);
			expect(result?.party_name).toBe(party.name);
			expect(result?.loss_type).toBe(coverage.loss_type);
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const { claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client1.id,
				claim_id: claim.id,
				created_by: user1.id,
			});

			const settlement = await createTestSettlement(db, {
				client_id: client1.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result = await getSettlement(ctx2, settlement.id);

			// Assert - Other client should not see the settlement
			expect(result).toBeUndefined();
		});
	});

	describe('getSettlementsByClaimId', () => {
		it('should return settlements for a claim with party and coverage details', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user.id,
				demand_amount: 50000,
				notes: 'Settlement A',
			});
			await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user.id,
				demand_amount: 75000,
				notes: 'Settlement B',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getSettlementsByClaimId(ctx, claim.id);

			// Assert
			expect(result).toHaveLength(2);
			expect(result.map((s) => s.notes)).toContain('Settlement A');
			expect(result.map((s) => s.notes)).toContain('Settlement B');
		});

		it('should order by demand_date and created_at descending', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const today = new Date();
			const yesterday = new Date(today);
			yesterday.setDate(today.getDate() - 1);
			const tomorrow = new Date(today);
			tomorrow.setDate(today.getDate() + 1);

			// Create in non-sorted order
			await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user.id,
				demand_date: yesterday,
				notes: 'Yesterday',
			});
			await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user.id,
				demand_date: tomorrow,
				notes: 'Tomorrow',
			});
			await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user.id,
				demand_date: today,
				notes: 'Today',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getSettlementsByClaimId(ctx, claim.id);

			// Assert - should be ordered by demand_date descending
			expect(result).toHaveLength(3);
			expect(result[0].notes).toBe('Tomorrow');
			expect(result[1].notes).toBe('Today');
			expect(result[2].notes).toBe('Yesterday');
		});

		it('should only return settlements for specified claim', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client.id });
			const claim2 = await createTestClaim(db, { client_id: client.id });
			const { claimParty: claimParty1, coverage: coverage1 } = await createSettlementDependencies(db, {
				client_id: client.id,
				claim_id: claim1.id,
				created_by: user.id,
			});
			const { claimParty: claimParty2, coverage: coverage2 } = await createSettlementDependencies(db, {
				client_id: client.id,
				claim_id: claim2.id,
				created_by: user.id,
			});

			await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim1.id,
				claim_party_id: claimParty1.id,
				coverage_id: coverage1.id,
				created_by: user.id,
				notes: 'Claim 1 Settlement',
			});
			await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim2.id,
				claim_party_id: claimParty2.id,
				coverage_id: coverage2.id,
				created_by: user.id,
				notes: 'Claim 2 Settlement',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getSettlementsByClaimId(ctx, claim1.id);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].notes).toBe('Claim 1 Settlement');
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const { claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client1.id,
				claim_id: claim.id,
				created_by: user1.id,
			});

			await createTestSettlement(db, {
				client_id: client1.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result = await getSettlementsByClaimId(ctx2, claim.id);

			// Assert - Other client should not see settlements
			expect(result).toHaveLength(0);
		});
	});

	describe('updateSettlement', () => {
		it('should update settlement fields', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const settlement = await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user.id,
				demand_amount: 50000,
				status: SettlementStatus.SENT,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await updateSettlement(ctx, settlement.id, {
				status: SettlementStatus.SETTLED,
				agreed_liability_percentage: 80,
				settlement_amount: 40000,
				settlement_date: new Date(),
				notes: 'Updated to settled',
			});

			// Assert
			expect(result.status).toBe(SettlementStatus.SETTLED);
			expect(parseFloat(result.agreed_liability_percentage as string)).toBe(80);
			expect(parseFloat(result.settlement_amount as string)).toBe(40000);
			expect(result.notes).toBe('Updated to settled');
			expect(result.updated_by).toBe(user.id);
			expect(result.updated_at).toBeDefined();
		});

		it('should update demand amount', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const settlement = await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user.id,
				demand_amount: 50000,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await updateSettlement(ctx, settlement.id, {
				demand_amount: 75000,
			});

			// Assert
			expect(parseFloat(result.demand_amount as string)).toBe(75000);
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const { claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client1.id,
				claim_id: claim.id,
				created_by: user1.id,
			});

			const settlement = await createTestSettlement(db, {
				client_id: client1.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act & Assert - Other client should not be able to update
			await expect(
				updateSettlement(ctx2, settlement.id, {
					notes: 'Unauthorized update',
				})
			).rejects.toThrow();
		});
	});

	describe('deleteSettlement', () => {
		it('should delete a settlement', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const settlement = await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await deleteSettlement(ctx, settlement.id, claim.id);

			// Assert
			expect(result.id).toBe(settlement.id);

			// Verify it's deleted
			const deleted = await db
				.selectFrom('settlement')
				.selectAll()
				.where('id', '=', settlement.id)
				.executeTakeFirst();
			expect(deleted).toBeUndefined();
		});

		it('should throw error when claim ID does not match settlement', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client.id });
			const claim2 = await createTestClaim(db, { client_id: client.id });
			const { claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client.id,
				claim_id: claim1.id,
				created_by: user.id,
			});

			const settlement = await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim1.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act & Assert - Wrong claim ID should fail
			await expect(deleteSettlement(ctx, settlement.id, claim2.id)).rejects.toThrow();

			// Verify settlement still exists
			const stillExists = await db
				.selectFrom('settlement')
				.selectAll()
				.where('id', '=', settlement.id)
				.executeTakeFirst();
			expect(stillExists).toBeDefined();
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const { claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client1.id,
				claim_id: claim.id,
				created_by: user1.id,
			});

			const settlement = await createTestSettlement(db, {
				client_id: client1.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act & Assert - Other client should not be able to delete
			await expect(deleteSettlement(ctx2, settlement.id, claim.id)).rejects.toThrow();
		});
	});

	describe('getSettlementsForDropdown', () => {
		it('should return simplified settlement list for forms', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { party, claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user.id,
				demand_amount: 50000,
				status: SettlementStatus.SENT,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getSettlementsForDropdown(ctx, claim.id);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].party_name).toBe(party.name);
			expect(result[0].loss_type).toBe(coverage.loss_type);
			expect(parseFloat(result[0].demand_amount as string)).toBe(50000);
			expect(result[0].status).toBe(SettlementStatus.SENT);
		});

		it('should order by demand_date descending', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const today = new Date();
			const yesterday = new Date(today);
			yesterday.setDate(today.getDate() - 1);

			await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user.id,
				demand_date: yesterday,
				demand_amount: 10000,
			});
			await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user.id,
				demand_date: today,
				demand_amount: 20000,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getSettlementsForDropdown(ctx, claim.id);

			// Assert - Today should come first
			expect(result).toHaveLength(2);
			expect(parseFloat(result[0].demand_amount as string)).toBe(20000);
			expect(parseFloat(result[1].demand_amount as string)).toBe(10000);
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const { claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client1.id,
				claim_id: claim.id,
				created_by: user1.id,
			});

			await createTestSettlement(db, {
				client_id: client1.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result = await getSettlementsForDropdown(ctx2, claim.id);

			// Assert - Other client should not see settlements
			expect(result).toHaveLength(0);
		});
	});

	describe('getSettlementForDeletion', () => {
		it('should return settlement fields for logging', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const settlement = await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user.id,
				demand_amount: 50000,
				status: SettlementStatus.SENT,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getSettlementForDeletion(ctx, settlement.id);

			// Assert
			expect(result).toBeDefined();
			expect(result?.id).toBe(settlement.id);
			expect(result?.claim_id).toBe(claim.id);
			expect(parseFloat(result?.demand_amount as string)).toBe(50000);
			expect(result?.status).toBe(SettlementStatus.SENT);
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const { claimParty, coverage } = await createSettlementDependencies(db, {
				client_id: client1.id,
				claim_id: claim.id,
				created_by: user1.id,
			});

			const settlement = await createTestSettlement(db, {
				client_id: client1.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result = await getSettlementForDeletion(ctx2, settlement.id);

			// Assert
			expect(result).toBeUndefined();
		});

		it('should return undefined for non-existent settlement', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getSettlementForDeletion(ctx, 999999);

			// Assert
			expect(result).toBeUndefined();
		});
	});
});
