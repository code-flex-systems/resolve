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
	createTestParty,
	createTestPartyRepresentative,
	createTestClaimParty,
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
	// updateClaim - Complex party linking/unlinking orchestration
	// =========================================================================

	describe('updateClaim', () => {
		describe('basic claim field updates', () => {
			it('should update claim fields without party changes', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, {
					client_id: client.id,
					created_by: user.id,
					insured: 'Original Insured',
					claim_amount: 10000,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				const updated = await claimController.updateClaim(ctx, {
					claimId: claim.id,
					insured: 'Updated Insured',
					claim_amount: 20000,
				});

				expect(updated).toBeDefined();
				expect(updated!.insured).toBe('Updated Insured');
				expect(updated!.claim_amount).toBe('20000');
			});

			it('should set claim_amount to null when passed null', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, {
					client_id: client.id,
					created_by: user.id,
					claim_amount: 10000,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				const updated = await claimController.updateClaim(ctx, {
					claimId: claim.id,
					claim_amount: null,
				});

				expect(updated).toBeDefined();
				expect(updated!.claim_amount).toBeNull();
			});
		});

		describe('party linking - no existing primary party', () => {
			it('should link a new primary party to the claim', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				await claimController.updateClaim(ctx, {
					claimId: claim.id,
					party_id: party.id,
					role: ['adverse_carrier'],
				});

				// Verify party was linked
				const claimParties = await db
					.selectFrom('claim_party')
					.selectAll()
					.where('claim_id', '=', claim.id)
					.execute();

				expect(claimParties).toHaveLength(1);
				expect(claimParties[0].party_id).toBe(party.id);
				expect(claimParties[0].role).toEqual(['adverse_carrier']);
				expect(claimParties[0].is_primary).toBe(true);
			});

			it('should link a new primary party with representative', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
				const rep = await createTestPartyRepresentative(db, { party_id: party.id, created_by: user.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				await claimController.updateClaim(ctx, {
					claimId: claim.id,
					party_id: party.id,
					representative_id: rep.id,
					role: ['adverse_carrier'],
				});

				// Verify party and representative were linked
				const claimParties = await db
					.selectFrom('claim_party')
					.selectAll()
					.where('claim_id', '=', claim.id)
					.execute();

				expect(claimParties).toHaveLength(1);
				expect(claimParties[0].party_id).toBe(party.id);
				expect(claimParties[0].representative_id).toBe(rep.id);
				expect(claimParties[0].is_primary).toBe(true);
			});
		});

		describe('party unlinking - removing existing primary party', () => {
			it('should unlink primary party when party_id is null', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
				// Create existing primary party link
				await createTestClaimParty(db, {
					claim_id: claim.id,
					party_id: party.id,
				client_id: client.id,
					is_primary: true,
					role: ['adverse_carrier'],
					created_by: user.id,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				await claimController.updateClaim(ctx, {
					claimId: claim.id,
					party_id: null,
				});

				// Verify party was unlinked (soft deleted)
				const claimParties = await db
					.selectFrom('claim_party')
					.selectAll()
					.where('claim_id', '=', claim.id)
					.where('deleted_at', 'is', null)
					.execute();

				expect(claimParties).toHaveLength(0);
			});

			it('should not affect non-primary parties when unlinking primary', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const primaryParty = await createTestParty(db, {
					client_id: client.id,
					created_by: user.id,
					name: 'Primary Party',
				});
				const secondaryParty = await createTestParty(db, {
					client_id: client.id,
					created_by: user.id,
					name: 'Secondary Party',
				});
				// Create primary and secondary party links
				await createTestClaimParty(db, {
					claim_id: claim.id,
					party_id: primaryParty.id,
				client_id: client.id,
					is_primary: true,
					role: ['adverse_carrier'],
					created_by: user.id,
				});
				await createTestClaimParty(db, {
					claim_id: claim.id,
					party_id: secondaryParty.id,
				client_id: client.id,
					is_primary: false,
					role: ['claimant'],
					created_by: user.id,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				await claimController.updateClaim(ctx, {
					claimId: claim.id,
					party_id: null,
				});

				// Verify only primary was unlinked, secondary remains
				const remainingParties = await db
					.selectFrom('claim_party')
					.selectAll()
					.where('claim_id', '=', claim.id)
					.where('deleted_at', 'is', null)
					.execute();

				expect(remainingParties).toHaveLength(1);
				expect(remainingParties[0].party_id).toBe(secondaryParty.id);
				expect(remainingParties[0].is_primary).toBe(false);
			});
		});

		describe('party replacement - changing primary party', () => {
			it('should replace primary party when party_id changes', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const oldParty = await createTestParty(db, {
					client_id: client.id,
					created_by: user.id,
					name: 'Old Party',
				});
				const newParty = await createTestParty(db, {
					client_id: client.id,
					created_by: user.id,
					name: 'New Party',
				});
				// Create existing primary party link
				await createTestClaimParty(db, {
					claim_id: claim.id,
					party_id: oldParty.id,
				client_id: client.id,
					is_primary: true,
					role: ['adverse_carrier'],
					created_by: user.id,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				await claimController.updateClaim(ctx, {
					claimId: claim.id,
					party_id: newParty.id,
					role: ['adverse_carrier'],
				});

				// Verify old party was unlinked and new party linked
				const activeParties = await db
					.selectFrom('claim_party')
					.selectAll()
					.where('claim_id', '=', claim.id)
					.where('deleted_at', 'is', null)
					.execute();

				expect(activeParties).toHaveLength(1);
				expect(activeParties[0].party_id).toBe(newParty.id);
				expect(activeParties[0].is_primary).toBe(true);
			});

			it('should replace primary party when role changes', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
				// Create existing primary party link with one role
				await createTestClaimParty(db, {
					claim_id: claim.id,
					party_id: party.id,
				client_id: client.id,
					is_primary: true,
					role: ['adverse_carrier'],
					created_by: user.id,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				await claimController.updateClaim(ctx, {
					claimId: claim.id,
					party_id: party.id,
					role: ['claimant'], // Different role
				});

				// Verify party was replaced (delete + create) with new role
				const activeParties = await db
					.selectFrom('claim_party')
					.selectAll()
					.where('claim_id', '=', claim.id)
					.where('deleted_at', 'is', null)
					.execute();

				expect(activeParties).toHaveLength(1);
				expect(activeParties[0].party_id).toBe(party.id);
				expect(activeParties[0].role).toEqual(['claimant']);
				expect(activeParties[0].is_primary).toBe(true);
			});
		});

		describe('representative update - only representative changes', () => {
			it('should update representative without replacing party link', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
				const oldRep = await createTestPartyRepresentative(db, {
					party_id: party.id,
					created_by: user.id,
					first_name: 'Old',
				});
				const newRep = await createTestPartyRepresentative(db, {
					party_id: party.id,
					created_by: user.id,
					first_name: 'New',
				});
				// Create existing party link with old representative
				const claimParty = await createTestClaimParty(db, {
					claim_id: claim.id,
					party_id: party.id,
				client_id: client.id,
					representative_id: oldRep.id,
					is_primary: true,
					role: ['adverse_carrier'],
					created_by: user.id,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				await claimController.updateClaim(ctx, {
					claimId: claim.id,
					party_id: party.id,
					representative_id: newRep.id,
					role: ['adverse_carrier'], // Same role, same party
				});

				// Verify representative was updated in-place (same claim_party record)
				const updatedClaimParty = await db
					.selectFrom('claim_party')
					.selectAll()
					.where('id', '=', claimParty.id)
					.executeTakeFirst();

				expect(updatedClaimParty).toBeDefined();
				expect(updatedClaimParty!.representative_id).toBe(newRep.id);
				expect(updatedClaimParty!.deleted_at).toBeNull(); // Not deleted, updated in-place
			});

			it('should set representative to null', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
				const rep = await createTestPartyRepresentative(db, { party_id: party.id, created_by: user.id });
				// Create existing party link with representative
				const claimParty = await createTestClaimParty(db, {
					claim_id: claim.id,
					party_id: party.id,
				client_id: client.id,
					representative_id: rep.id,
					is_primary: true,
					role: ['adverse_carrier'],
					created_by: user.id,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				await claimController.updateClaim(ctx, {
					claimId: claim.id,
					party_id: party.id,
					representative_id: null,
					role: ['adverse_carrier'],
				});

				// Verify representative was removed
				const updatedClaimParty = await db
					.selectFrom('claim_party')
					.selectAll()
					.where('id', '=', claimParty.id)
					.executeTakeFirst();

				expect(updatedClaimParty).toBeDefined();
				expect(updatedClaimParty!.representative_id).toBeNull();
			});
		});

		describe('no-op scenarios', () => {
			it('should not link party when party_id provided but role is missing', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				// Try to link party without providing role
				await claimController.updateClaim(ctx, {
					claimId: claim.id,
					party_id: party.id,
					// role is missing
				});

				// Verify no party was linked (role is required)
				const claimParties = await db
					.selectFrom('claim_party')
					.selectAll()
					.where('claim_id', '=', claim.id)
					.execute();

				expect(claimParties).toHaveLength(0);
			});

			it('should not modify existing party when party_id provided but role is missing', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const oldParty = await createTestParty(db, {
					client_id: client.id,
					created_by: user.id,
					name: 'Old Party',
				});
				const newParty = await createTestParty(db, {
					client_id: client.id,
					created_by: user.id,
					name: 'New Party',
				});
				// Create existing primary party link
				const claimParty = await createTestClaimParty(db, {
					claim_id: claim.id,
					party_id: oldParty.id,
				client_id: client.id,
					is_primary: true,
					role: ['adverse_carrier'],
					created_by: user.id,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				// Try to change party without providing role
				await claimController.updateClaim(ctx, {
					claimId: claim.id,
					party_id: newParty.id,
					// role is missing
				});

				// Verify existing party is unchanged (role is required to change party)
				const unchangedParty = await db
					.selectFrom('claim_party')
					.selectAll()
					.where('id', '=', claimParty.id)
					.executeTakeFirst();

				expect(unchangedParty).toBeDefined();
				expect(unchangedParty!.party_id).toBe(oldParty.id); // Still old party
				expect(unchangedParty!.deleted_at).toBeNull();
			});

			it('should not modify party when same party, role, and representative', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
				const rep = await createTestPartyRepresentative(db, { party_id: party.id, created_by: user.id });
				// Create existing party link
				const claimParty = await createTestClaimParty(db, {
					claim_id: claim.id,
					party_id: party.id,
				client_id: client.id,
					representative_id: rep.id,
					is_primary: true,
					role: ['adverse_carrier'],
					created_by: user.id,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				await claimController.updateClaim(ctx, {
					claimId: claim.id,
					party_id: party.id,
					representative_id: rep.id,
					role: ['adverse_carrier'],
				});

				// Verify the same record exists unchanged
				const unchangedParty = await db
					.selectFrom('claim_party')
					.selectAll()
					.where('id', '=', claimParty.id)
					.executeTakeFirst();

				expect(unchangedParty).toBeDefined();
				expect(unchangedParty!.party_id).toBe(party.id);
				expect(unchangedParty!.representative_id).toBe(rep.id);
				expect(unchangedParty!.role).toEqual(['adverse_carrier']);
				expect(unchangedParty!.deleted_at).toBeNull();

				// Should still only have 1 active claim_party
				const allParties = await db
					.selectFrom('claim_party')
					.selectAll()
					.where('claim_id', '=', claim.id)
					.where('deleted_at', 'is', null)
					.execute();
				expect(allParties).toHaveLength(1);
			});

			it('should not touch parties when party_id not provided in input', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, {
					client_id: client.id,
					created_by: user.id,
					insured: 'Original',
				});
				const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
				await createTestClaimParty(db, {
					claim_id: claim.id,
					party_id: party.id,
				client_id: client.id,
					is_primary: true,
					role: ['adverse_carrier'],
					created_by: user.id,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				// Update only claim fields, not party
				await claimController.updateClaim(ctx, {
					claimId: claim.id,
					insured: 'Updated',
				});

				// Verify party still exists
				const parties = await db
					.selectFrom('claim_party')
					.selectAll()
					.where('claim_id', '=', claim.id)
					.where('deleted_at', 'is', null)
					.execute();

				expect(parties).toHaveLength(1);
				expect(parties[0].party_id).toBe(party.id);
			});
		});

		// Note: Admin action logging tests are skipped because admin_action_log table
		// is not in the test schema. Logging is tested via unit tests of the logger utility.;

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

			// Note: Cross-client party linking is NOT currently enforced at the controller level.
			// The linkPartyToClaim query doesn't check party.client_id against ctx.session.user.client_id.
			// This test documents current behavior - tenant isolation for parties happens at the
			// party selection UI level, not the linking level. Consider adding enforcement if needed.
		});

		describe('transaction rollback', () => {
			it('should rollback all changes if any step fails', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const claim = await createTestClaim(db, {
					client_id: client.id,
					created_by: user.id,
					insured: 'Original Insured',
				});
				// Create party but use a non-existent party_id to force failure
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				// Attempt to update with invalid party_id (should fail during party linking)
				try {
					await claimController.updateClaim(ctx, {
						claimId: claim.id,
						insured: 'Should Be Rolled Back',
						party_id: 999999, // Non-existent party
						role: ['adverse_carrier'],
					});
				} catch {
					// Expected to fail
				}

				// Verify claim insured was NOT updated (rolled back)
				const unchangedClaim = await db
					.selectFrom('claim')
					.selectAll()
					.where('id', '=', claim.id)
					.executeTakeFirst();

				expect(unchangedClaim!.insured).toBe('Original Insured');
			});
		});
	});

	// =========================================================================
	// createClaims - Bulk claim creation with optional party linking
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
							claim_amount: 50000,
						},
					],
				});

				expect(created).toHaveLength(1);
				expect(created[0].claim_number).toBe('CLM-001');
				expect(created[0].insured).toBe('Test Insured');
				expect(created[0].claim_amount).toBe('50000');
				expect(created[0].client_id).toBe(client.id);
			});

			it('should create multiple claims in bulk', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				const created = await claimController.createClaims(ctx, {
					claims: [
						{ claim_number: 'CLM-001', insured: 'Insured 1' },
						{ claim_number: 'CLM-002', insured: 'Insured 2' },
						{ claim_number: 'CLM-003', insured: 'Insured 3' },
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
							claim_amount: 100000,
							date_of_loss: dateOfLoss,
							loss_street_address: '123 Main St',
							loss_city: 'Springfield',
							loss_state: 'IL',
							loss_postal_code: '62701',
							loss_country: 'US',
							// Note: recovery_status and substatus are not part of ClaimData schema
							// They can only be set via updateClaim
						},
					],
				});

				expect(created).toHaveLength(1);
				const claim = created[0];
				expect(claim.claim_number).toBe('CLM-FULL');
				expect(claim.client).toBe('Client Corp');
				expect(claim.client_adjuster).toBe('John Adjuster');
				expect(claim.insured).toBe('Jane Insured');
				expect(claim.claim_amount).toBe('100000');
				expect(claim.loss_street_address).toBe('123 Main St');
				expect(claim.loss_city).toBe('Springfield');
				expect(claim.loss_state).toBe('IL');
			});
		});

		describe('party linking during creation', () => {
			it('should link party to all created claims', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				const created = await claimController.createClaims(ctx, {
					claims: [
						{ claim_number: 'CLM-001', insured: 'Insured 1' },
						{ claim_number: 'CLM-002', insured: 'Insured 2' },
					],
					party_id: party.id,
					role: ['adverse_carrier'],
				});

				expect(created).toHaveLength(2);

				// Verify party was linked to both claims
				for (const claim of created) {
					const claimParties = await db
						.selectFrom('claim_party')
						.selectAll()
						.where('claim_id', '=', claim.id)
						.execute();

					expect(claimParties).toHaveLength(1);
					expect(claimParties[0].party_id).toBe(party.id);
					expect(claimParties[0].role).toEqual(['adverse_carrier']);
					expect(claimParties[0].is_primary).toBe(true);
				}
			});

			it('should link party with representative to all created claims', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
				const rep = await createTestPartyRepresentative(db, { party_id: party.id, created_by: user.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				const created = await claimController.createClaims(ctx, {
					claims: [
						{ claim_number: 'CLM-001', insured: 'Insured 1' },
						{ claim_number: 'CLM-002', insured: 'Insured 2' },
					],
					party_id: party.id,
					representative_id: rep.id,
					role: ['adverse_carrier'],
				});

				expect(created).toHaveLength(2);

				// Verify party and representative were linked to both claims
				for (const claim of created) {
					const claimParties = await db
						.selectFrom('claim_party')
						.selectAll()
						.where('claim_id', '=', claim.id)
						.execute();

					expect(claimParties).toHaveLength(1);
					expect(claimParties[0].party_id).toBe(party.id);
					expect(claimParties[0].representative_id).toBe(rep.id);
					expect(claimParties[0].is_primary).toBe(true);
				}
			});

			it('should not link party when party_id is provided but role is missing', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				const created = await claimController.createClaims(ctx, {
					claims: [{ claim_number: 'CLM-001', insured: 'Insured 1' }],
					party_id: party.id,
					// role is missing
				});

				expect(created).toHaveLength(1);

				// Verify no party was linked (role is required)
				const claimParties = await db
					.selectFrom('claim_party')
					.selectAll()
					.where('claim_id', '=', created[0].id)
					.execute();

				expect(claimParties).toHaveLength(0);
			});
		});

		describe('tenant isolation', () => {
			it('should create claims with correct client_id from context', async () => {
				const clientA = await createTestClient(db, { name: 'Client A' });
				const clientB = await createTestClient(db, { name: 'Client B' });
				const userA = await createTestUser(db, { client_id: clientA.id });
				const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id });

				const created = await claimController.createClaims(ctxA, {
					claims: [{ claim_number: 'CLM-A', insured: 'Client A Insured' }],
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
						{ claim_number: 'CLM-001', insured: 'Insured 1' },
						{ claim_number: 'CLM-002', insured: 'Insured 2' },
						{ claim_number: 'CLM-003', insured: 'Insured 3' },
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
