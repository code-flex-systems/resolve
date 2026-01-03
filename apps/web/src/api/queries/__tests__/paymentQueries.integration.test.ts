/**
 * Integration tests for paymentQueries
 *
 * These tests run against a real database to verify:
 * - Multi-tenant data isolation
 * - Payment CRUD operations
 * - Automatic claim.claim_amount recalculation
 * - Soft delete functionality
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestCoverage,
	createTestPayment,
	createTestParty,
	createTestClaimParty,
} from '@/__tests__/integration/fixtures';
import {
	createPayment,
	getPayments,
	updatePayment,
	archivePayment,
	getPaymentForArchive,
	recalculateClaimAmount,
} from '../paymentQueries';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

describe('paymentQueries integration', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	describe('createPayment', () => {
		it('should create a payment', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				loss_type: 'liability',
				coverage_amount: 100000,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const paymentDate = new Date().toISOString().split('T')[0];

			// Act - wrap in transaction as controller would
			const result = await db.transaction().execute(async (trx) => {
				return createPayment({ ...ctx, db: trx }, claim.id, {
					coverage_id: coverage.id,
					payment_date: paymentDate,
					payment_amount: '5000',
					is_subrogable: true,
					is_expense: false,
				});
			});

			// Assert
			expect(result).toBeDefined();
			expect(result.claim_id).toBe(claim.id);
			expect(result.client_id).toBe(client.id);
			expect(result.coverage_id).toBe(coverage.id);
			expect(parseFloat(result.payment_amount as string)).toBe(5000);
			expect(result.is_subrogable).toBe(true);
			expect(result.is_expense).toBe(false);
			expect(result.created_by).toBe(user.id);
		});

		it('should update claim.claim_amount after creating subrogable payment', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const paymentDate = new Date().toISOString().split('T')[0];

			// Act - create two subrogable payments
			await db.transaction().execute(async (trx) => {
				await createPayment({ ...ctx, db: trx }, claim.id, {
					coverage_id: coverage.id,
					payment_date: paymentDate,
					payment_amount: '3000',
					is_subrogable: true,
					is_expense: false,
				});
			});
			await db.transaction().execute(async (trx) => {
				await createPayment({ ...ctx, db: trx }, claim.id, {
					coverage_id: coverage.id,
					payment_date: paymentDate,
					payment_amount: '2000',
					is_subrogable: true,
					is_expense: false,
				});
			});

			// Assert - claim should have sum of subrogable payments
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['claim_amount'])
				.where('id', '=', claim.id)
				.executeTakeFirst();

			expect(parseFloat(updatedClaim?.claim_amount as string)).toBe(5000);
		});

		it('should not include non-subrogable payments in claim_amount', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const paymentDate = new Date().toISOString().split('T')[0];

			// Act - create one subrogable, one non-subrogable
			await db.transaction().execute(async (trx) => {
				await createPayment({ ...ctx, db: trx }, claim.id, {
					coverage_id: coverage.id,
					payment_date: paymentDate,
					payment_amount: '3000',
					is_subrogable: true,
					is_expense: false,
				});
			});
			await db.transaction().execute(async (trx) => {
				await createPayment({ ...ctx, db: trx }, claim.id, {
					coverage_id: coverage.id,
					payment_date: paymentDate,
					payment_amount: '2000',
					is_subrogable: false, // Not subrogable
					is_expense: true,
				});
			});

			// Assert - claim should only have subrogable payment
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['claim_amount'])
				.where('id', '=', claim.id)
				.executeTakeFirst();

			expect(parseFloat(updatedClaim?.claim_amount as string)).toBe(3000);
		});

		it('should handle negative amounts (credits)', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const paymentDate = new Date().toISOString().split('T')[0];

			// Act - create a payment and a credit (negative)
			await db.transaction().execute(async (trx) => {
				await createPayment({ ...ctx, db: trx }, claim.id, {
					coverage_id: coverage.id,
					payment_date: paymentDate,
					payment_amount: '5000',
					is_subrogable: true,
					is_expense: false,
				});
			});
			await db.transaction().execute(async (trx) => {
				await createPayment({ ...ctx, db: trx }, claim.id, {
					coverage_id: coverage.id,
					payment_date: paymentDate,
					payment_amount: '-1000', // Credit
					is_subrogable: true,
					is_expense: false,
				});
			});

			// Assert - claim should have net amount
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['claim_amount'])
				.where('id', '=', claim.id)
				.executeTakeFirst();

			expect(parseFloat(updatedClaim?.claim_amount as string)).toBe(4000);
		});

		it('should set optional payee_claim_party_id', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				party_type: 'entity',
				});
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
				role: ['claimant'],
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await db.transaction().execute(async (trx) => {
				return createPayment({ ...ctx, db: trx }, claim.id, {
					coverage_id: coverage.id,
					payment_date: new Date().toISOString().split('T')[0],
					payment_amount: '1000',
					is_subrogable: true,
					is_expense: false,
					payee_claim_party_id: claimParty.id,
					description: 'Payment to claimant',
				});
			});

			// Assert
			expect(result.payee_claim_party_id).toBe(claimParty.id);
			expect(result.description).toBe('Payment to claimant');
		});
	});

	describe('getPayments', () => {
		it('should only return payments for the specified claim', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client.id });
			const claim2 = await createTestClaim(db, { client_id: client.id });
			const coverage1 = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim1.id,
				created_by: user.id,
			});
			const coverage2 = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim2.id,
				created_by: user.id,
			});

			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim1.id,
				coverage_id: coverage1.id,
				created_by: user.id,
				description: 'Claim 1 Payment',
			});
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim2.id,
				coverage_id: coverage2.id,
				created_by: user.id,
				description: 'Claim 2 Payment',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getPayments(ctx, claim1.id);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].description).toBe('Claim 1 Payment');
		});

		it('should return payments for a claim with coverage type', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				loss_type: 'liability',
			});

			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_amount: '1000',
			});
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_amount: '2000',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getPayments(ctx, claim.id);

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0].loss_type).toBe('liability');
			expect(result[1].loss_type).toBe('liability');
		});

		it('should return null payee_name when no payee is set', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payee_claim_party_id: null, // No payee
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getPayments(ctx, claim.id);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].payee_name).toBeNull();
		});

		it('should include payee name when payment has payee', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				party_type: 'entity',
					name: 'John Doe',
			});
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
				role: ['claimant'],
			});

			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payee_claim_party_id: claimParty.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getPayments(ctx, claim.id);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].payee_name).toBe('John Doe');
		});

		it('should order by payment_date descending', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const today = new Date();
			const yesterday = new Date(today);
			yesterday.setDate(today.getDate() - 1);
			const tomorrow = new Date(today);
			tomorrow.setDate(today.getDate() + 1);

			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_date: yesterday,
				description: 'Yesterday',
			});
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_date: tomorrow,
				description: 'Tomorrow',
			});
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_date: today,
				description: 'Today',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getPayments(ctx, claim.id);

			// Assert - should be descending (tomorrow, today, yesterday)
			expect(result).toHaveLength(3);
			expect(result[0].description).toBe('Tomorrow');
			expect(result[1].description).toBe('Today');
			expect(result[2].description).toBe('Yesterday');
		});

		it('should not return soft-deleted payments', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				description: 'Active',
			});
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				description: 'Deleted',
				deleted_at: new Date(),
				deleted_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getPayments(ctx, claim.id);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].description).toBe('Active');
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const coverage = await createTestCoverage(db, {
				client_id: client1.id,
				claim_id: claim.id,
				created_by: user1.id,
			});

			await createTestPayment(db, {
				client_id: client1.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result = await getPayments(ctx2, claim.id);

			// Assert - Other client should not see payments
			expect(result).toHaveLength(0);
		});
	});

	describe('updatePayment', () => {
		it('should update payment fields', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});
			const payment = await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_amount: '1000',
				description: 'Original',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await db.transaction().execute(async (trx) => {
				return updatePayment({ ...ctx, db: trx }, payment.id, {
					payment_amount: '2000',
					description: 'Updated',
				});
			});

			// Assert
			expect(parseFloat(result.payment_amount as string)).toBe(2000);
			expect(result.description).toBe('Updated');
			expect(result.updated_by).toBe(user.id);
		});

		it('should NOT recalculate claim_amount when only description changes', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_amount: '1000',
				is_subrogable: true,
				description: 'Original',
			});

			// Set a specific claim_amount to verify it doesn't change
			await db.updateTable('claim').set({ claim_amount: '9999' }).where('id', '=', claim.id).execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Get the payment ID
			const payments = await getPayments(ctx, claim.id);
			const paymentId = payments[0].id;

			// Act - only update description (not amount or is_subrogable)
			await db.transaction().execute(async (trx) => {
				return updatePayment({ ...ctx, db: trx }, paymentId, {
					description: 'Updated description',
				});
			});

			// Assert - claim_amount should NOT have been recalculated
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['claim_amount'])
				.where('id', '=', claim.id)
				.executeTakeFirst();

			// Should still be 9999, not recalculated to 1000
			expect(parseFloat(updatedClaim?.claim_amount as string)).toBe(9999);
		});

		it('should recalculate claim_amount when payment amount changes', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});
			const payment = await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_amount: '1000',
				is_subrogable: true,
			});

			// Set initial claim_amount
			await db.updateTable('claim').set({ claim_amount: '1000' }).where('id', '=', claim.id).execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			await db.transaction().execute(async (trx) => {
				return updatePayment({ ...ctx, db: trx }, payment.id, {
					payment_amount: '2500',
				});
			});

			// Assert
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['claim_amount'])
				.where('id', '=', claim.id)
				.executeTakeFirst();

			expect(parseFloat(updatedClaim?.claim_amount as string)).toBe(2500);
		});

		it('should recalculate claim_amount when is_subrogable changes', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});
			const payment = await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_amount: '1000',
				is_subrogable: true,
			});

			// Set initial claim_amount
			await db.updateTable('claim').set({ claim_amount: '1000' }).where('id', '=', claim.id).execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act - change to non-subrogable
			await db.transaction().execute(async (trx) => {
				return updatePayment({ ...ctx, db: trx }, payment.id, {
					is_subrogable: false,
				});
			});

			// Assert - claim_amount should be 0 (no subrogable payments)
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['claim_amount'])
				.where('id', '=', claim.id)
				.executeTakeFirst();

			// PostgreSQL NUMERIC returns '0.00' to preserve scale
		expect(updatedClaim?.claim_amount).toBe('0.00');
		});

		it('should throw error for non-existent payment', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act & Assert
			await expect(
				db.transaction().execute(async (trx) => {
					return updatePayment({ ...ctx, db: trx }, 999999, { payment_amount: '1000' });
				})
			).rejects.toThrow('Payment not found');
		});

		it('should throw error for already deleted payment', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});
			const payment = await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				deleted_at: new Date(), // Already deleted
				deleted_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act & Assert - Cannot update deleted payment
			await expect(
				db.transaction().execute(async (trx) => {
					return updatePayment({ ...ctx, db: trx }, payment.id, { payment_amount: '9999' });
				})
			).rejects.toThrow('Payment not found');
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const coverage = await createTestCoverage(db, {
				client_id: client1.id,
				claim_id: claim.id,
				created_by: user1.id,
			});
			const payment = await createTestPayment(db, {
				client_id: client1.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act & Assert - Other client should not be able to update
			await expect(
				db.transaction().execute(async (trx) => {
					return updatePayment({ ...ctx2, db: trx }, payment.id, { payment_amount: '9999' });
				})
			).rejects.toThrow('Payment not found');
		});
	});

	describe('getPaymentForArchive', () => {
		it('should return payment data for logging', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});
			const payment = await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_amount: '5000',
				is_subrogable: true,
				is_expense: false,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getPaymentForArchive(ctx, payment.id);

			// Assert
			expect(result).toBeDefined();
			expect(result?.id).toBe(payment.id);
			expect(result?.claim_id).toBe(claim.id);
			expect(result?.coverage_id).toBe(coverage.id);
			expect(parseFloat(result?.payment_amount as string)).toBe(5000);
			expect(result?.is_subrogable).toBe(true);
			expect(result?.is_expense).toBe(false);
		});

		it('should return undefined for non-existent payment', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getPaymentForArchive(ctx, 999999);

			// Assert
			expect(result).toBeUndefined();
		});

		it('should return undefined for already deleted payment', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});
			const payment = await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				deleted_at: new Date(), // Already deleted
				deleted_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getPaymentForArchive(ctx, payment.id);

			// Assert
			expect(result).toBeUndefined();
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const coverage = await createTestCoverage(db, {
				client_id: client1.id,
				claim_id: claim.id,
				created_by: user1.id,
			});
			const payment = await createTestPayment(db, {
				client_id: client1.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result = await getPaymentForArchive(ctx2, payment.id);

			// Assert
			expect(result).toBeUndefined();
		});
	});

	describe('archivePayment', () => {
		it('should soft delete a payment', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});
			const payment = await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await db.transaction().execute(async (trx) => {
				return archivePayment({ ...ctx, db: trx }, payment.id, claim.id);
			});

			// Assert
			expect(result.id).toBe(payment.id);
			expect(result.deleted_at).not.toBeNull();
			expect(result.deleted_by).toBe(user.id);

			// Verify it's not returned by getPayments
			const payments = await getPayments(ctx, claim.id);
			expect(payments.find((p) => p.id === payment.id)).toBeUndefined();
		});

		it('should recalculate claim_amount after archiving', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const payment1 = await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_amount: '3000',
				is_subrogable: true,
			});
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_amount: '2000',
				is_subrogable: true,
			});

			// Set initial claim_amount
			await db.updateTable('claim').set({ claim_amount: '5000' }).where('id', '=', claim.id).execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act - archive the first payment
			await db.transaction().execute(async (trx) => {
				return archivePayment({ ...ctx, db: trx }, payment1.id, claim.id);
			});

			// Assert - claim should now have only 2000
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['claim_amount'])
				.where('id', '=', claim.id)
				.executeTakeFirst();

			expect(parseFloat(updatedClaim?.claim_amount as string)).toBe(2000);
		});

		it('should throw error for non-existent payment', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act & Assert
			await expect(
				db.transaction().execute(async (trx) => {
					return archivePayment({ ...ctx, db: trx }, 999999, claim.id);
				})
			).rejects.toThrow();
		});

		it('should throw error when claim ID does not match payment', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client.id });
			const claim2 = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim1.id,
				created_by: user.id,
			});
			const payment = await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim1.id,
				coverage_id: coverage.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act & Assert - Wrong claim ID should fail
			await expect(
				db.transaction().execute(async (trx) => {
					return archivePayment({ ...ctx, db: trx }, payment.id, claim2.id);
				})
			).rejects.toThrow();

			// Verify payment still exists and is not deleted
			const stillExists = await db
				.selectFrom('claim_payment')
				.selectAll()
				.where('id', '=', payment.id)
				.where('deleted_at', 'is', null)
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
			const coverage = await createTestCoverage(db, {
				client_id: client1.id,
				claim_id: claim.id,
				created_by: user1.id,
			});
			const payment = await createTestPayment(db, {
				client_id: client1.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act & Assert - Other client should not be able to archive
			await expect(
				db.transaction().execute(async (trx) => {
					return archivePayment({ ...ctx2, db: trx }, payment.id, claim.id);
				})
			).rejects.toThrow();
		});
	});

	describe('recalculateClaimAmount', () => {
		it('should recalculate claim_amount from subrogable payments', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_amount: '1500',
				is_subrogable: true,
			});
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_amount: '500',
				is_subrogable: false,
			});

			await db.updateTable('claim').set({ claim_amount: '9999' }).where('id', '=', claim.id).execute();

			// Act
			await recalculateClaimAmount(db, claim.id, client.id);

			// Assert
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['claim_amount'])
				.where('id', '=', claim.id)
				.executeTakeFirst();

			expect(parseFloat(updatedClaim?.claim_amount as string)).toBe(1500);
		});

		it('should exclude archived payments from recalculation', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_amount: '2000',
				is_subrogable: true,
			});
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_amount: '1000',
				is_subrogable: true,
				deleted_at: new Date(),
				deleted_by: user.id,
			});

			await db.updateTable('claim').set({ claim_amount: '0' }).where('id', '=', claim.id).execute();

			// Act
			await recalculateClaimAmount(db, claim.id, client.id);

			// Assert
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['claim_amount'])
				.where('id', '=', claim.id)
				.executeTakeFirst();

			expect(parseFloat(updatedClaim?.claim_amount as string)).toBe(2000);
		});
	});
});
