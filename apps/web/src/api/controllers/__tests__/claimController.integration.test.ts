/**
 * Integration tests for claimController
 *
 * Tests the orchestrative functions that coordinate multiple queries
 * and have complex business logic beyond simple CRUD operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
} from '@/__tests__/integration/fixtures';
import * as claimController from '../claimController';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

describe('claimController integration tests', () => {
	let db: Kysely<DB>;

	beforeEach(() => {
		db = getTestDb();
	});

	// =========================================================================
	// updateClaim - Basic claim field updates
	// =========================================================================

	describe('updateClaim', () => {
		describe('basic claim field updates', () => {
			it('should update claim fields', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, {
					client_id: client.id,
					created_by: user.id,
					insured: 'Original Insured',
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				const updated = await claimController.updateClaim(ctx, {
					claimId: claim.id,
					insured: 'Updated Insured',
				});

				expect(updated).toBeDefined();
				expect(updated!.insured).toBe('Updated Insured');
			});

			it('should update multiple fields at once', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, {
					client_id: client.id,
					created_by: user.id,
					insured: 'Original Insured',
					client: 'Original Client',
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				const updated = await claimController.updateClaim(ctx, {
					claimId: claim.id,
					insured: 'Updated Insured',
					client: 'Updated Client',
					client_adjuster: 'New Adjuster',
				});

				expect(updated).toBeDefined();
				expect(updated!.insured).toBe('Updated Insured');
				expect(updated!.client).toBe('Updated Client');
				expect(updated!.client_adjuster).toBe('New Adjuster');
			});

			it('should update address fields', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, {
					client_id: client.id,
					created_by: user.id,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				const updated = await claimController.updateClaim(ctx, {
					claimId: claim.id,
					loss_street_address: '123 Main St',
					loss_city: 'Springfield',
					loss_state: 'IL',
					loss_postal_code: '62701',
					loss_country: 'US',
				});

				expect(updated).toBeDefined();
				expect(updated!.loss_street_address).toBe('123 Main St');
				expect(updated!.loss_city).toBe('Springfield');
				expect(updated!.loss_state).toBe('IL');
				expect(updated!.loss_postal_code).toBe('62701');
				expect(updated!.loss_country).toBe('US');
			});

			it('should update recovery_status and substatus', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, {
					client_id: client.id,
					created_by: user.id,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				const updated = await claimController.updateClaim(ctx, {
					claimId: claim.id,
					recovery_status: 'active',
					substatus: 'under_review',
				});

				expect(updated).toBeDefined();
				expect(updated!.recovery_status).toBe('active');
				expect(updated!.substatus).toBe('under_review');
			});
		});

		describe('tenant isolation', () => {
			it('should not allow updating claims from different client', async () => {
				const clientA = await createTestClient(db, { name: 'Client A' });
				const clientB = await createTestClient(db, { name: 'Client B' });
				const userA = await createTestUser(db, { client_id: clientA.id });
				const userB = await createTestUser(db, { client_id: clientB.id });
				const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
				const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id });

				// User B trying to update Client A's claim
				await expect(
					claimController.updateClaim(ctxB, {
						claimId: claimA.id,
						insured: 'Hacked Insured',
					})
				).rejects.toThrow();
			});
		});
	});

	// =========================================================================
	// createClaims - Bulk claim creation
	// =========================================================================

	describe('createClaims', () => {
		describe('basic claim creation', () => {
			it('should create a single claim', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				const created = await claimController.createClaims(ctx, {
					claims: [
						{
							claim_number: 'CLM-001',
							insured: 'Test Insured',
							client: null,
							client_adjuster: null,
							date_of_loss: null,
							line_of_business: null,
							last_update: null,
							last_updated_by: null,
						},
					],
				});

				expect(created).toHaveLength(1);
				expect(created[0].claim_number).toBe('CLM-001');
				expect(created[0].insured).toBe('Test Insured');
				expect(created[0].client_id).toBe(client.id);
			});

			it('should create multiple claims in bulk', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				const created = await claimController.createClaims(ctx, {
					claims: [
						{ claim_number: 'CLM-001', insured: 'Insured 1', client: null, client_adjuster: null, date_of_loss: null, line_of_business: null, last_update: null, last_updated_by: null },
						{ claim_number: 'CLM-002', insured: 'Insured 2', client: null, client_adjuster: null, date_of_loss: null, line_of_business: null, last_update: null, last_updated_by: null },
						{ claim_number: 'CLM-003', insured: 'Insured 3', client: null, client_adjuster: null, date_of_loss: null, line_of_business: null, last_update: null, last_updated_by: null },
					],
				});

				expect(created).toHaveLength(3);
				expect(created.map((c) => c.claim_number)).toEqual(['CLM-001', 'CLM-002', 'CLM-003']);
			});

			it('should set all provided claim fields', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });
				const dateOfLoss = new Date('2024-01-15');

				const created = await claimController.createClaims(ctx, {
					claims: [
						{
							claim_number: 'CLM-FULL',
							client: 'Client Corp',
							client_adjuster: 'John Adjuster',
							insured: 'Jane Insured',
							date_of_loss: dateOfLoss,
							line_of_business: null,
							loss_street_address: '123 Main St',
							loss_city: 'Springfield',
							loss_state: 'IL',
							loss_postal_code: '62701',
							loss_country: 'US',
							last_update: null,
							last_updated_by: null,
						},
					],
				});

				expect(created).toHaveLength(1);
				const claim = created[0];
				expect(claim.claim_number).toBe('CLM-FULL');
				expect(claim.client).toBe('Client Corp');
				expect(claim.client_adjuster).toBe('John Adjuster');
				expect(claim.insured).toBe('Jane Insured');
				expect(claim.loss_street_address).toBe('123 Main St');
				expect(claim.loss_city).toBe('Springfield');
				expect(claim.loss_state).toBe('IL');
			});
		});

		describe('tenant isolation', () => {
			it('should create claims with correct client_id from context', async () => {
				const clientA = await createTestClient(db, { name: 'Client A' });
				const clientB = await createTestClient(db, { name: 'Client B' });
				const userA = await createTestUser(db, { client_id: clientA.id });
				const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id });

				const created = await claimController.createClaims(ctxA, {
					claims: [{ claim_number: 'CLM-A', insured: 'Client A Insured', client: null, client_adjuster: null, date_of_loss: null, line_of_business: null, last_update: null, last_updated_by: null }],
				});

				expect(created).toHaveLength(1);
				expect(created[0].client_id).toBe(clientA.id);
				expect(created[0].client_id).not.toBe(clientB.id);
			});
		});

		describe('transaction behavior', () => {
			it('should create all claims atomically', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				// Get initial count
				const initialCount = await db
					.selectFrom('claim')
					.select(db.fn.count('id').as('count'))
					.where('client_id', '=', client.id)
					.executeTakeFirst();

				const created = await claimController.createClaims(ctx, {
					claims: [
						{ claim_number: 'CLM-001', insured: 'Insured 1', client: null, client_adjuster: null, date_of_loss: null, line_of_business: null, last_update: null, last_updated_by: null },
						{ claim_number: 'CLM-002', insured: 'Insured 2', client: null, client_adjuster: null, date_of_loss: null, line_of_business: null, last_update: null, last_updated_by: null },
						{ claim_number: 'CLM-003', insured: 'Insured 3', client: null, client_adjuster: null, date_of_loss: null, line_of_business: null, last_update: null, last_updated_by: null },
					],
				});

				expect(created).toHaveLength(3);

				// Verify all claims exist in database
				const finalCount = await db
					.selectFrom('claim')
					.select(db.fn.count('id').as('count'))
					.where('client_id', '=', client.id)
					.executeTakeFirst();

				expect(Number(finalCount!.count) - Number(initialCount!.count)).toBe(3);
			});
		});
	});
});
