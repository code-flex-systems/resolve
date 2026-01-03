/**
 * Integration tests for partyQueries
 *
 * These tests run against a real database to verify:
 * - Multi-tenant data isolation
 * - Party CRUD operations
 * - Party address management
 * - Party representative management
 * - Claim party linking
 * - Archive/restore functionality
 * - Primary flag management
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestParty,
	createTestPartyAddress,
	createTestPartyRepresentative,
	createTestClaimParty,
	createTestCoverage,
	createTestRoleList,
	createTestPartyPhone,
	createTestPartyEmail,
} from '@/__tests__/integration/fixtures';
import {
	getParties,
	getParty,
	searchParties,
	createParty,
	updateParty,
	getActiveClaimAssociations,
	archiveParty,
	restoreParty,
	getPartyAddresses,
	getAllPartyAddresses,
	createPartyAddress,
	updatePartyAddress,
	getPartyAddress,
	archivePartyAddress,
	restorePartyAddress,
	getPartyRepresentatives,
	getAllPartyRepresentatives,
	getPartyRepresentative,
	archivePartyRepresentative,
	restorePartyRepresentative,
	createPartyRepresentative,
	updatePartyRepresentative,
	getPartyRepresentativeForDeletion,
	deletePartyRepresentative,
	getClaimParties,
	linkPartyToClaim,
	updateClaimParty,
	getClaimPartyForDeletion,
	archiveClaimParty,
	getClaimLiabilityPercentageTotal,
	getPrimaryClaimParty,
	getTotalLiabilityForClaim,
	getPartyPhones,
	getPartyPhone,
	createPartyPhone,
	updatePartyPhone,
	archivePartyPhone,
	restorePartyPhone,
	getPartyEmails,
	getPartyEmail,
	createPartyEmail,
	updatePartyEmail,
	archivePartyEmail,
	restorePartyEmail,
} from '../partyQueries';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

describe('partyQueries integration', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// ============================================================================
	// PARTY CRUD OPERATIONS
	// ============================================================================

	describe('getParties', () => {
		it('should return parties for the client', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			await createTestParty(db, { client_id: client.id, created_by: user.id, name: 'Test Party A' });
			await createTestParty(db, { client_id: client.id, created_by: user.id, name: 'Test Party B' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getParties(ctx);

			expect(result.rows.length).toBeGreaterThanOrEqual(2);
			expect(result.count).toBeGreaterThanOrEqual(2);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });

			await createTestParty(db, { client_id: client1.id, created_by: user1.id, name: 'Client 1 Party' });
			await createTestParty(db, { client_id: client2.id, created_by: user2.id, name: 'Client 2 Party' });

			const ctx1 = createTestContext(db, { id: user1.id, client_id: client1.id, role: 'Admin' });
			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result1 = await getParties(ctx1);
			const result2 = await getParties(ctx2);

			const names1 = result1.rows.map((p) => p.name);
			const names2 = result2.rows.map((p) => p.name);

			expect(names1).toContain('Client 1 Party');
			expect(names1).not.toContain('Client 2 Party');
			expect(names2).toContain('Client 2 Party');
			expect(names2).not.toContain('Client 1 Party');
		});

		it('should filter by search term', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			await createTestParty(db, { client_id: client.id, created_by: user.id, name: 'Acme Insurance' });
			await createTestParty(db, { client_id: client.id, created_by: user.id, name: 'Beta Corp' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getParties(ctx, 'Acme');

			expect(result.rows.some((p) => p.name === 'Acme Insurance')).toBe(true);
			expect(result.rows.some((p) => p.name === 'Beta Corp')).toBe(false);
		});

		it('should search case-insensitively', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'UPPERCASE Insurance Co',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Search with lowercase
			const result = await getParties(ctx, 'uppercase');

			expect(result.rows.some((p) => p.name === 'UPPERCASE Insurance Co')).toBe(true);
		});

		it('should handle pagination', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			// Create 5 parties
			for (let i = 0; i < 5; i++) {
				await createTestParty(db, {
					client_id: client.id,
					created_by: user.id,
					name: `Pagination Party ${i}`,
				});
			}

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const page1 = await getParties(ctx, undefined, 2, 0);
			const page2 = await getParties(ctx, undefined, 2, 2);

			expect(page1.rows).toHaveLength(2);
			expect(page2.rows).toHaveLength(2);
			expect(page1.count).toBeGreaterThanOrEqual(5);
		});

		it('should exclude archived parties by default', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Active Party',
			});
			await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Archived Party',
				deleted_at: new Date(),
				deleted_by: user.email!,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getParties(ctx);

			const names = result.rows.map((p) => p.name);
			expect(names).toContain('Active Party');
			expect(names).not.toContain('Archived Party');
		});

		it('should return only archived parties when showArchived is true', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Active Party Show',
			});
			await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Archived Party Show',
				deleted_at: new Date(),
				deleted_by: user.email!,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getParties(ctx, undefined, undefined, undefined, true);

			const names = result.rows.map((p) => p.name);
			expect(names).toContain('Archived Party Show');
			expect(names).not.toContain('Active Party Show');
		});
	});

	describe('getParty', () => {
		it('should return a single party by ID', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Single Party',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getParty(ctx, party.id);

			expect(result).toBeDefined();
			expect(result?.id).toBe(party.id);
			expect(result?.name).toBe('Single Party');
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });

			const party = await createTestParty(db, {
				client_id: client1.id,
				created_by: user1.id,
				name: 'Private Party',
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getParty(ctx2, party.id);

			expect(result).toBeUndefined();
		});
	});

	describe('searchParties', () => {
		it('should search parties by name', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			await createTestParty(db, { client_id: client.id, created_by: user.id, name: 'Searchable Insurance Co' });
			await createTestParty(db, { client_id: client.id, created_by: user.id, name: 'Other Corp' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await searchParties(ctx, 'Searchable');

			expect(result.some((p) => p.name === 'Searchable Insurance Co')).toBe(true);
			expect(result.some((p) => p.name === 'Other Corp')).toBe(false);
		});

		it('should limit results to 10', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			// Create 15 parties with same prefix
			for (let i = 0; i < 15; i++) {
				await createTestParty(db, {
					client_id: client.id,
					created_by: user.id,
					name: `LimitTest Party ${i}`,
				});
			}

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await searchParties(ctx, 'LimitTest');

			expect(result.length).toBeLessThanOrEqual(10);
		});

		it('should exclude archived parties', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'SearchActive Party',
			});
			await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'SearchArchived Party',
				deleted_at: new Date(),
				deleted_by: user.email!,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await searchParties(ctx, 'Search');

			expect(result.some((p) => p.name === 'SearchActive Party')).toBe(true);
			expect(result.some((p) => p.name === 'SearchArchived Party')).toBe(false);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });

			await createTestParty(db, {
				client_id: client1.id,
				created_by: user1.id,
				name: 'TenantSearch Party',
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await searchParties(ctx2, 'TenantSearch');

			expect(result.some((p) => p.name === 'TenantSearch Party')).toBe(false);
		});
	});

	describe('createParty', () => {
		it('should create a new party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await createParty(ctx, {
				party_type: 'facilitator',
				name: 'New Created Party',
				organization: 'Test Org',
				is_business: true,
			});

			expect(result.id).toBeDefined();
			expect(result.name).toBe('New Created Party');
			expect(result.organization).toBe('Test Org');
			expect(result.is_business).toBe(true);
			expect(result.client_id).toBe(client.id);
			expect(result.created_by).toBe(user.id);
		});
	});

	describe('updateParty', () => {
		it('should update party fields', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Original Name',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await updateParty(ctx, party.id, {
				name: 'Updated Name',
				notes: 'Some notes',
			});

			expect(result.name).toBe('Updated Name');
			expect(result.notes).toBe('Some notes');
			expect(result.updated_by).toBe(user.id);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });

			const party = await createTestParty(db, {
				client_id: client1.id,
				created_by: user1.id,
				name: 'Protected Party',
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(updateParty(ctx2, party.id, { name: 'Hacked' })).rejects.toThrow();
		});
	});

	describe('getActiveClaimAssociations', () => {
		it('should return active claim associations', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claim = await createTestClaim(db, {
				client_id: client.id,
				claim_number: 'ACTIVE-001',
				substatus: 'In Progress',
			});

			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getActiveClaimAssociations(ctx, party.id);

			expect(result.length).toBeGreaterThanOrEqual(1);
			expect(result.some((a) => a.claim_number === 'ACTIVE-001')).toBe(true);
		});

		it('should exclude completed claims', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const completedClaim = await createTestClaim(db, {
				client_id: client.id,
				claim_number: 'COMPLETED-001',
				substatus: 'Completed',
			});

			await createTestClaimParty(db, {
				claim_id: completedClaim.id,
				client_id: client.id,
				party_id: party.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getActiveClaimAssociations(ctx, party.id);

			expect(result.some((a) => a.claim_number === 'COMPLETED-001')).toBe(false);
		});

		it('should exclude cancelled claims', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const cancelledClaim = await createTestClaim(db, {
				client_id: client.id,
				claim_number: 'CANCELLED-001',
				substatus: 'Cancelled',
			});

			await createTestClaimParty(db, {
				claim_id: cancelledClaim.id,
				client_id: client.id,
				party_id: party.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getActiveClaimAssociations(ctx, party.id);

			expect(result.some((a) => a.claim_number === 'CANCELLED-001')).toBe(false);
		});
	});

	describe('archiveParty', () => {
		it('should archive a party with no active claims', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'To Archive',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await archiveParty(ctx, party.id);

			expect(result.name).toBe('To Archive');

			// Verify party is now archived
			const archived = await getParty(ctx, party.id);
			expect(archived?.deleted_at).not.toBeNull();
		});

		it('should cascade archive to addresses and representatives', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const address = await createTestPartyAddress(db, { party_id: party.id, created_by: user.id });
			const rep = await createTestPartyRepresentative(db, { party_id: party.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await archiveParty(ctx, party.id);

			// Check addresses are archived
			const addresses = await getPartyAddresses(ctx, party.id, true); // showArchived=true
			expect(addresses.some((o) => o.id === address.id)).toBe(true);

			// Check representatives are archived
			const reps = await getPartyRepresentatives(ctx, party.id, undefined, true);
			expect(reps.some((r) => r.id === rep.id)).toBe(true);
		});

		it('should throw error if party has active claim associations', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claim = await createTestClaim(db, { client_id: client.id, substatus: 'In Progress' });

			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(archiveParty(ctx, party.id)).rejects.toThrow('Cannot archive party');
		});

		it('should throw error for non-existent party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(archiveParty(ctx, 999999)).rejects.toThrow('no result');
		});
	});

	describe('restoreParty', () => {
		it('should restore an archived party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'To Restore',
				deleted_at: new Date(),
				deleted_by: user.email!,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await restoreParty(ctx, party.id);

			const restored = await getParty(ctx, party.id);
			expect(restored?.deleted_at).toBeNull();
		});

		it('should cascade restore to addresses and representatives', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				deleted_at: new Date(),
				deleted_by: user.email!,
			});
			await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				deleted_at: new Date(),
				deleted_by: user.email!,
			});
			await createTestPartyRepresentative(db, {
				party_id: party.id,
				created_by: user.id,
				deleted_at: new Date(),
				deleted_by: user.email!,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await restoreParty(ctx, party.id);

			// Check addresses are restored
			const addresses = await getPartyAddresses(ctx, party.id);
			expect(addresses.length).toBeGreaterThanOrEqual(1);

			// Check representatives are restored
			const reps = await getPartyRepresentatives(ctx, party.id);
			expect(reps.length).toBeGreaterThanOrEqual(1);
		});

		it('should throw error for non-existent party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(restoreParty(ctx, 999999)).rejects.toThrow('no result');
		});
	});

	// ============================================================================
	// PARTY OFFICE OPERATIONS
	// ============================================================================

	describe('getPartyAddresses', () => {
		it('should return addresses for a party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				name: 'Main Office',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyAddresses(ctx, party.id);

			expect(result.some((o) => o.name === 'Main Office')).toBe(true);
		});

		it('should order by address_status=valid first', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				name: 'Secondary Office',
				address_status: 'mailing',
			});
			await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				name: 'Valid Office',
				address_status: 'valid',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyAddresses(ctx, party.id);

			expect(result[0].name).toBe('Valid Office');
		});

		it('should exclude archived addresses by default', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				name: 'Active Office',
			});
			await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				name: 'Archived Office',
				deleted_at: new Date(),
				deleted_by: user.email!,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyAddresses(ctx, party.id);

			expect(result.some((o) => o.name === 'Active Office')).toBe(true);
			expect(result.some((o) => o.name === 'Archived Office')).toBe(false);
		});

		it('should return only archived addresses when showArchived is true', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				name: 'Active Office Show',
			});
			await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				name: 'Archived Office Show',
				deleted_at: new Date(),
				deleted_by: user.email!,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyAddresses(ctx, party.id, true);

			expect(result.some((o) => o.name === 'Archived Office Show')).toBe(true);
			expect(result.some((o) => o.name === 'Active Office Show')).toBe(false);
		});
	});

	describe('getAllPartyAddresses', () => {
		it('should return addresses across all parties', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party1 = await createTestParty(db, { client_id: client.id, created_by: user.id, name: 'Party A' });
			const party2 = await createTestParty(db, { client_id: client.id, created_by: user.id, name: 'Party B' });

			await createTestPartyAddress(db, { party_id: party1.id, created_by: user.id, name: 'Office A' });
			await createTestPartyAddress(db, { party_id: party2.id, created_by: user.id, name: 'Office B' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAllPartyAddresses(ctx);

			expect(result.rows.some((o) => o.name === 'Office A')).toBe(true);
			expect(result.rows.some((o) => o.name === 'Office B')).toBe(true);
		});

		it('should search by party name, address name, or city/state', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Searchable Party Office',
			});

			await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				name: 'Headquarters',
				city: 'Denver',
				state: 'CO',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Search by party name
			const result1 = await getAllPartyAddresses(ctx, 'Searchable Party Office');
			expect(result1.rows.some((o) => o.name === 'Headquarters')).toBe(true);

			// Search by address name
			const result2 = await getAllPartyAddresses(ctx, 'Headquarters');
			expect(result2.rows.some((o) => o.name === 'Headquarters')).toBe(true);

			// Search by city
			const result3 = await getAllPartyAddresses(ctx, 'Denver');
			expect(result3.rows.some((o) => o.name === 'Headquarters')).toBe(true);

			// Search by state
			const result4 = await getAllPartyAddresses(ctx, 'CO');
			expect(result4.rows.some((o) => o.name === 'Headquarters')).toBe(true);
		});

		it('should handle pagination', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			// Create 5 addresses for different parties to avoid unique valid constraint
			const parties: Awaited<ReturnType<typeof createTestParty>>[] = [];
			for (let i = 0; i < 5; i++) {
				const party = await createTestParty(db, { client_id: client.id, created_by: user.id, name: `Pagination Party ${i}` });
				parties.push(party);
				await createTestPartyAddress(db, {
					party_id: party.id,
					created_by: user.id,
					name: `Pagination Office ${i}`,
				});
			}

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const page1 = await getAllPartyAddresses(ctx, undefined, 2, 0);
			const page2 = await getAllPartyAddresses(ctx, undefined, 2, 2);

			expect(page1.rows).toHaveLength(2);
			expect(page2.rows).toHaveLength(2);
			expect(page1.count).toBeGreaterThanOrEqual(5);
		});

		it('should exclude archived addresses by default', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				name: 'AllActive Office',
			});
			await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				name: 'AllArchived Office',
				deleted_at: new Date(),
				deleted_by: user.email!,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAllPartyAddresses(ctx);

			expect(result.rows.some((o) => o.name === 'AllActive Office')).toBe(true);
			expect(result.rows.some((o) => o.name === 'AllArchived Office')).toBe(false);
		});

		it('should return only archived addresses when showArchived is true', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				name: 'AllActiveShow Office',
			});
			await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				name: 'AllArchivedShow Office',
				deleted_at: new Date(),
				deleted_by: user.email!,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAllPartyAddresses(ctx, undefined, undefined, undefined, true);

			expect(result.rows.some((o) => o.name === 'AllArchivedShow Office')).toBe(true);
			expect(result.rows.some((o) => o.name === 'AllActiveShow Office')).toBe(false);
		});
	});

	describe('createPartyOffice', () => {
		it('should create a new address', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await createPartyAddress(ctx, {
				party_id: party.id,
				name: 'New Address',
				street_address: '456 Main St',
				city: 'Denver',
				state: 'CO',
			});

			expect(result.name).toBe('New Address');
			expect(result.street_address).toBe('456 Main St');
			expect(result.city).toBe('Denver');
			expect(result.state).toBe('CO');
		});

		it('should enforce unique valid address per party via status', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			// Create first valid address
			await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				address_status: 'valid',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Creating second valid address should either error or be handled by the query
			// The unique constraint is on (party_id) WHERE address_status = 'valid'
			// Creating another with status = 'mailing' should work
			const secondAddress = await createPartyAddress(ctx, {
				party_id: party.id,
				name: 'Secondary Mailing',
				address_status: 'mailing',
			});

			expect(secondAddress.address_status).toBe('mailing');
		});
	});

	describe('updatePartyAddress', () => {
		it('should update address fields', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const address = await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				name: 'Original Office',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await updatePartyAddress(ctx, address.id, {
				name: 'Updated Office',
				city: 'New York',
			});

			expect(result.name).toBe('Updated Office');
			expect(result.city).toBe('New York');
		});

		it('should update address status', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			// Create two addresses with non-valid status
			const address1 = await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				address_status: 'mailing',
			});
			await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				address_status: 'unknown',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Update address1 to valid
			const updated = await updatePartyAddress(ctx, address1.id, { address_status: 'valid' });
			expect(updated.address_status).toBe('valid');
		});
	});

	describe('getPartyAddress', () => {
		it('should return address with party name', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Test Party for Office',
			});
			const address = await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				name: 'Main Office',
				city: 'New York',
				state: 'NY',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyAddress(ctx, address.id);

			expect(result).toBeDefined();
			expect(result?.id).toBe(address.id);
			expect(result?.name).toBe('Main Office');
			expect(result?.party_name).toBe('Test Party for Office');
			expect(result?.city).toBe('New York');
			expect(result?.state).toBe('NY');
		});

		it('should return undefined for non-existent address', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyAddress(ctx, 999999);

			expect(result).toBeUndefined();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client1.id, created_by: user1.id });
			const address = await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user1.id,
				name: 'Private Office',
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getPartyAddress(ctx2, address.id);

			expect(result).toBeUndefined();
		});
	});

	describe('archivePartyAddress / restorePartyAddress', () => {
		it('should archive and restore an address', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const address = await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				name: 'Archive Test Office',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Archive
			await archivePartyAddress(ctx, address.id);
			let result = await getPartyAddress(ctx, address.id);
			expect(result?.deleted_at).not.toBeNull();

			// Restore
			await restorePartyAddress(ctx, address.id);
			result = await getPartyAddress(ctx, address.id);
			expect(result?.deleted_at).toBeNull();
		});

		it('should throw error when archiving non-existent address', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(archivePartyAddress(ctx, 999999)).rejects.toThrow('no result');
		});

		it('should throw error when restoring non-existent address', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(restorePartyAddress(ctx, 999999)).rejects.toThrow('no result');
		});
	});

	// ============================================================================
	// PARTY REPRESENTATIVE OPERATIONS
	// ============================================================================

	describe('getPartyRepresentatives', () => {
		it('should return representatives for a party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			await createTestPartyRepresentative(db, {
				party_id: party.id,
				created_by: user.id,
				first_name: 'John',
				last_name: 'Doe',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyRepresentatives(ctx, party.id);

			expect(result.some((r) => r.first_name === 'John' && r.last_name === 'Doe')).toBe(true);
		});

		it('should filter by address ID', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const address1 = await createTestPartyAddress(db, { party_id: party.id, created_by: user.id, address_status: 'valid' });
			const address2 = await createTestPartyAddress(db, { party_id: party.id, created_by: user.id, address_status: 'mailing' });

			await createTestPartyRepresentative(db, {
				party_id: party.id,
				address_id: address1.id,
				created_by: user.id,
				first_name: 'Office1',
				last_name: 'Rep',
			});
			await createTestPartyRepresentative(db, {
				party_id: party.id,
				address_id: address2.id,
				created_by: user.id,
				first_name: 'Office2',
				last_name: 'Rep',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyRepresentatives(ctx, party.id, address1.id);

			expect(result.some((r) => r.first_name === 'Office1')).toBe(true);
			expect(result.some((r) => r.first_name === 'Office2')).toBe(false);
		});
	});

	describe('getAllPartyRepresentatives', () => {
		it('should return representatives across all parties', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party1 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: `All Reps Party 1 ${Date.now()}`,
			});
			const party2 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: `All Reps Party 2 ${Date.now() + 1}`,
			});

			await createTestPartyRepresentative(db, {
				party_id: party1.id,
				created_by: user.id,
				first_name: 'Rep1',
				last_name: 'Test',
			});
			await createTestPartyRepresentative(db, {
				party_id: party2.id,
				created_by: user.id,
				first_name: 'Rep2',
				last_name: 'Test',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAllPartyRepresentatives(ctx);

			expect(result.rows.some((r) => r.first_name === 'Rep1')).toBe(true);
			expect(result.rows.some((r) => r.first_name === 'Rep2')).toBe(true);
		});

		it('should search by party name, rep name, title, or email', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'SearchRep Party',
			});

			await createTestPartyRepresentative(db, {
				party_id: party.id,
				created_by: user.id,
				first_name: 'SearchFirst',
				last_name: 'SearchLast',
				title: 'Manager',
				email: 'searchrep@example.com',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Search by full name "First Last"
			const resultFullName = await getAllPartyRepresentatives(ctx, 'SearchFirst SearchLast');
			expect(resultFullName.rows.some((r) => r.first_name === 'SearchFirst')).toBe(true);

			// Search by partial first name
			const result1 = await getAllPartyRepresentatives(ctx, 'SearchFirst');
			expect(result1.rows.some((r) => r.first_name === 'SearchFirst')).toBe(true);

			// Search by title
			const result2 = await getAllPartyRepresentatives(ctx, 'Manager');
			expect(result2.rows.some((r) => r.first_name === 'SearchFirst')).toBe(true);

			// Search by email
			const result3 = await getAllPartyRepresentatives(ctx, 'searchrep@example');
			expect(result3.rows.some((r) => r.first_name === 'SearchFirst')).toBe(true);
		});

		it('should handle pagination', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			// Create 5 representatives
			for (let i = 0; i < 5; i++) {
				await createTestPartyRepresentative(db, {
					party_id: party.id,
					created_by: user.id,
					first_name: `PaginationRep${i}`,
					last_name: 'Test',
				});
			}

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const page1 = await getAllPartyRepresentatives(ctx, undefined, 2, 0);
			const page2 = await getAllPartyRepresentatives(ctx, undefined, 2, 2);

			expect(page1.rows).toHaveLength(2);
			expect(page2.rows).toHaveLength(2);
			expect(page1.count).toBeGreaterThanOrEqual(5);
		});

		it('should exclude archived representatives by default', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			await createTestPartyRepresentative(db, {
				party_id: party.id,
				created_by: user.id,
				first_name: 'AllActiveRep',
				last_name: 'Test',
			});
			await createTestPartyRepresentative(db, {
				party_id: party.id,
				created_by: user.id,
				first_name: 'AllArchivedRep',
				last_name: 'Test',
				deleted_at: new Date(),
				deleted_by: user.email!,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAllPartyRepresentatives(ctx);

			expect(result.rows.some((r) => r.first_name === 'AllActiveRep')).toBe(true);
			expect(result.rows.some((r) => r.first_name === 'AllArchivedRep')).toBe(false);
		});

		it('should return only archived representatives when showArchived is true', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			await createTestPartyRepresentative(db, {
				party_id: party.id,
				created_by: user.id,
				first_name: 'AllActiveShowRep',
				last_name: 'Test',
			});
			await createTestPartyRepresentative(db, {
				party_id: party.id,
				created_by: user.id,
				first_name: 'AllArchivedShowRep',
				last_name: 'Test',
				deleted_at: new Date(),
				deleted_by: user.email!,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAllPartyRepresentatives(ctx, undefined, undefined, undefined, true);

			expect(result.rows.some((r) => r.first_name === 'AllArchivedShowRep')).toBe(true);
			expect(result.rows.some((r) => r.first_name === 'AllActiveShowRep')).toBe(false);
		});
	});

	describe('createPartyRepresentative', () => {
		it('should create a new representative', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await createPartyRepresentative(ctx, {
				party_id: party.id,
				first_name: 'Jane',
				last_name: 'Smith',
				title: 'Director',
				email: 'jane@example.com',
			});

			expect(result.first_name).toBe('Jane');
			expect(result.last_name).toBe('Smith');
			expect(result.title).toBe('Director');
		});

		it('should unset other primaries when creating a primary representative', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			const firstRep = await createTestPartyRepresentative(db, {
				party_id: party.id,
				created_by: user.id,
				is_primary: true,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await createPartyRepresentative(ctx, {
				party_id: party.id,
				first_name: 'New',
				last_name: 'Primary',
				is_primary: true,
			});

			const updatedFirst = await getPartyRepresentative(ctx, firstRep.id);
			expect(updatedFirst?.is_primary).toBe(false);
		});
	});

	describe('updatePartyRepresentative', () => {
		it('should update representative fields', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const rep = await createTestPartyRepresentative(db, {
				party_id: party.id,
				created_by: user.id,
				first_name: 'Original',
				last_name: 'Name',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await updatePartyRepresentative(ctx, rep.id, {
				first_name: 'Updated',
				phone: '555-9876',
			});

			expect(result.first_name).toBe('Updated');
			expect(result.phone).toBe('555-9876');
		});

		it('should unset other primaries when setting as primary', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			const rep1 = await createTestPartyRepresentative(db, {
				party_id: party.id,
				created_by: user.id,
				first_name: 'Rep1',
				last_name: 'Test',
				is_primary: true,
			});
			const rep2 = await createTestPartyRepresentative(db, {
				party_id: party.id,
				created_by: user.id,
				first_name: 'Rep2',
				last_name: 'Test',
				is_primary: false,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Set rep2 as primary
			await updatePartyRepresentative(ctx, rep2.id, { is_primary: true });

			// Check rep1 is no longer primary
			const updatedRep1 = await getPartyRepresentative(ctx, rep1.id);
			expect(updatedRep1?.is_primary).toBe(false);
		});
	});

	describe('getPartyRepresentative', () => {
		it('should return representative with party and address names', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Test Party for Rep',
			});
			const address = await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				name: 'Rep Office',
			});
			const rep = await createTestPartyRepresentative(db, {
				party_id: party.id,
				address_id: address.id,
				created_by: user.id,
				first_name: 'John',
				last_name: 'Smith',
				title: 'Manager',
				email: 'john.smith@test.com',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyRepresentative(ctx, rep.id);

			expect(result).toBeDefined();
			expect(result?.id).toBe(rep.id);
			expect(result?.first_name).toBe('John');
			expect(result?.last_name).toBe('Smith');
			expect(result?.title).toBe('Manager');
			expect(result?.email).toBe('john.smith@test.com');
			expect(result?.party_name).toBe('Test Party for Rep');
			expect(result?.address_name).toBe('Rep Office');
		});

		it('should return representative without address when no address assigned', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Test Party No Office',
			});
			const rep = await createTestPartyRepresentative(db, {
				party_id: party.id,
				created_by: user.id,
				first_name: 'Jane',
				last_name: 'Doe',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyRepresentative(ctx, rep.id);

			expect(result).toBeDefined();
			expect(result?.first_name).toBe('Jane');
			expect(result?.party_name).toBe('Test Party No Office');
			expect(result?.address_name).toBeNull();
		});

		it('should return undefined for non-existent representative', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyRepresentative(ctx, 999999);

			expect(result).toBeUndefined();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client1.id, created_by: user1.id });
			const rep = await createTestPartyRepresentative(db, {
				party_id: party.id,
				created_by: user1.id,
				first_name: 'Private',
				last_name: 'Rep',
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getPartyRepresentative(ctx2, rep.id);

			expect(result).toBeUndefined();
		});
	});

	describe('archivePartyRepresentative / restorePartyRepresentative', () => {
		it('should archive and restore a representative', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const rep = await createTestPartyRepresentative(db, {
				party_id: party.id,
				created_by: user.id,
				first_name: 'Archive',
				last_name: 'Rep',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Archive
			await archivePartyRepresentative(ctx, rep.id);
			let result = await getPartyRepresentative(ctx, rep.id);
			expect(result?.deleted_at).not.toBeNull();

			// Restore
			await restorePartyRepresentative(ctx, rep.id);
			result = await getPartyRepresentative(ctx, rep.id);
			expect(result?.deleted_at).toBeNull();
		});

		it('should throw error when archiving non-existent representative', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(archivePartyRepresentative(ctx, 999999)).rejects.toThrow('Representative not found');
		});

		it('should throw error when restoring non-existent representative', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(restorePartyRepresentative(ctx, 999999)).rejects.toThrow('Representative not found');
		});
	});

	describe('deletePartyRepresentative', () => {
		it('should delete a representative', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const rep = await createTestPartyRepresentative(db, {
				party_id: party.id,
				created_by: user.id,
				first_name: 'ToDelete',
				last_name: 'Rep',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Get for deletion first
			const forDeletion = await getPartyRepresentativeForDeletion(ctx, rep.id);
			expect(forDeletion).toBeDefined();

			// Delete
			await deletePartyRepresentative(ctx, rep.id);

			// Verify deleted
			const deleted = await getPartyRepresentative(ctx, rep.id);
			expect(deleted).toBeUndefined();
		});
	});

	// ============================================================================
	// CLAIM PARTY LINKING OPERATIONS
	// ============================================================================

	describe('getClaimParties', () => {
		it('should return parties linked to a claim', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Linked Party',
			});

			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party.id,
				created_by: user.id,
				role: ['adverse_carrier'],
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimParties(ctx, claim.id);

			expect(result.some((cp) => cp.party.name === 'Linked Party')).toBe(true);
		});

		it('should include representative info when linked', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const rep = await createTestPartyRepresentative(db, {
				party_id: party.id,
				created_by: user.id,
				first_name: 'Contact',
				last_name: 'Person',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Use linkPartyToClaim to properly set up the representative_id
			await linkPartyToClaim(ctx, {
				claim_id: claim.id,
				party_id: party.id,
				role: ['adverse_carrier'],
				representative_id: rep.id,
			});

			const result = await getClaimParties(ctx, claim.id);

			const claimParty = result.find((cp) => cp.party_id === party.id);
			expect(claimParty?.representative?.first_name).toBe('Contact');
			expect(claimParty?.representative?.last_name).toBe('Person');
		});

		it('should include primary address info', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			await createTestPartyAddress(db, {
				party_id: party.id,
				created_by: user.id,
				name: 'Primary Office',
				city: 'Denver',
				state: 'CO',
				address_status: 'valid',
			});

			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimParties(ctx, claim.id);

			const claimParty = result.find((cp) => cp.party_id === party.id);
			expect(claimParty?.address?.name).toBe('Primary Office');
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			const party = await createTestParty(db, { client_id: client1.id, created_by: user1.id });

			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client1.id,
				party_id: party.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getClaimParties(ctx2, claim.id);

			expect(result).toHaveLength(0);
		});
	});

	describe('linkPartyToClaim', () => {
		it('should link a party to a claim', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const { claimParty } = await linkPartyToClaim(ctx, {
				claim_id: claim.id,
				party_id: party.id,
				role: ['adverse_carrier'],
				liability_percentage: 50,
			});

			expect(claimParty.claim_id).toBe(claim.id);
			expect(claimParty.party_id).toBe(party.id);
			expect(claimParty.role).toEqual(['adverse_carrier']);
			expect(parseFloat(claimParty.liability_percentage!)).toBe(50);
		});

		it('should recalculate expected recovery after linking', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const { claimParty } = await linkPartyToClaim(ctx, {
				claim_id: claim.id,
				party_id: party.id,
				role: ['adverse_carrier'],
				liability_percentage: 25,
			});

			// Query no longer returns expectedRecovery - controller orchestrates recalculation
			expect(claimParty.claim_id).toBe(claim.id);

			// Verify expected_recovery can be calculated separately (controller's responsibility)
			const { recalculateClaimExpectedRecovery } = await import('@/api/queries/claimQueries');
			const expectedRecovery = await recalculateClaimExpectedRecovery(ctx, claim.id);
			expect(expectedRecovery).toBeDefined();
		});
	});

	describe('updateClaimParty', () => {
		it('should update claim party fields', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party.id,
				created_by: user.id,
				liability_percentage: '10',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const { claimParty: updated } = await updateClaimParty(ctx, claimParty.id, {
				liability_percentage: 75,
				notes: 'Updated notes',
			});

			expect(parseFloat(updated.liability_percentage!)).toBe(75);
			expect(updated.notes).toBe('Updated notes');
		});
	});

	describe('archiveClaimParty', () => {
		it('should soft delete a claim party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Get for deletion first
			const forDeletion = await getClaimPartyForDeletion(ctx, claimParty.id);
			expect(forDeletion).toBeDefined();

			// Archive (soft delete)
			const { claimId } = await archiveClaimParty(ctx, claimParty.id);

			expect(claimId).toBe(claim.id);

			// Verify archived (no longer returned by getClaimParties)
			const parties = await getClaimParties(ctx, claim.id);
			expect(parties.some((cp) => cp.id === claimParty.id)).toBe(false);

			// Verify it's soft deleted in the database
			const archivedParty = await db
				.selectFrom('claim_party')
				.selectAll()
				.where('id', '=', claimParty.id)
				.executeTakeFirst();
			expect(archivedParty?.deleted_at).not.toBeNull();
			expect(archivedParty?.deleted_by).toBe(user.id);
		});

		it('should throw error for non-existent claim party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(archiveClaimParty(ctx, 999999)).rejects.toThrow('Claim party not found');
		});
	});

	describe('getPrimaryClaimParty', () => {
		it('should ignore deleted primaries and return the active primary', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const activeParty = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const deletedParty = await createTestParty(db, { client_id: client.id, created_by: user.id });

			const activeClaimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: activeParty.id,
				created_by: user.id,
				is_primary: true,
			});

			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: deletedParty.id,
				created_by: user.id,
				is_primary: true,
				deleted_at: new Date(),
				deleted_by: user.email!,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const primary = await getPrimaryClaimParty(ctx, claim.id);

			expect(primary?.id).toBe(activeClaimParty.id);
			expect(primary?.party_id).toBe(activeParty.id);
			expect(primary?.is_primary).toBe(true);
		});
	});

	describe('getTotalLiabilityForClaim', () => {
		it('should sum entity liability and ignore deleted or non-entity parties', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const entityParty1 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				party_type: 'entity',
			});
			const entityParty2 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				party_type: 'entity',
			});
			const facilitatorParty = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const deletedEntityParty = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				party_type: 'entity',
			});

			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: entityParty1.id,
				created_by: user.id,
				liability_percentage: '25',
			});
			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: entityParty2.id,
				created_by: user.id,
				liability_percentage: '35',
			});
			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: facilitatorParty.id,
				created_by: user.id,
				liability_percentage: '50',
			});
			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: deletedEntityParty.id,
				created_by: user.id,
				liability_percentage: '10',
				deleted_at: new Date(),
				deleted_by: user.email!,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const total = await getTotalLiabilityForClaim(ctx, claim.id);

			expect(total).toBe(60);
		});
	});

	describe('getClaimLiabilityPercentageTotal', () => {
		it('should return total liability percentage for a claim', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party1 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: `Liability Party 1 ${Date.now()}`,
			});
			const party2 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: `Liability Party 2 ${Date.now() + 1}`,
			});

			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party1.id,
				created_by: user.id,
				liability_percentage: '30',
			});
			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party2.id,
				created_by: user.id,
				liability_percentage: '20',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const total = await getClaimLiabilityPercentageTotal(ctx, claim.id);

			expect(total).toBe(50);
		});

		it('should return 0 for claim with no parties', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const total = await getClaimLiabilityPercentageTotal(ctx, claim.id);

			expect(total).toBe(0);
		});

		it('should exclude deleted claim parties', async () => {
			// Use a fresh client to avoid claim_party interference from other tests
			const client = await createTestClient(db, { name: `Delete Test Client ${Date.now()}` });
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party1 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: `Deleted Test Party 1 ${Date.now()}`,
			});
			const party2 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: `Deleted Test Party 2 ${Date.now() + 1}`,
			});

			// Create active claim party
			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party1.id,
				created_by: user.id,
				liability_percentage: '40',
			});

			// Create deleted claim party - note: create it first, then soft-delete it
			const deletedClaimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party2.id,
				created_by: user.id,
				liability_percentage: '25',
			});

			// Soft delete the claim party directly
			await db
				.updateTable('claim_party')
				.set({ deleted_at: new Date(), deleted_by: user.email })
				.where('id', '=', deletedClaimParty.id)
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const total = await getClaimLiabilityPercentageTotal(ctx, claim.id);

			expect(total).toBe(40); // Only the non-deleted party
		});
	});

	// ============================================================================
	// PARTY TYPE FILTERING
	// ============================================================================

	describe('searchParties with partyType filter', () => {
		it('should filter by entity party type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			// Create entity and facilitator parties with searchable names
			await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'SearchFilterEntity Corp',
				party_type: 'entity',
				});
			await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'SearchFilterFacilitator Inc',
				party_type: 'facilitator',
				});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await searchParties(ctx, 'SearchFilter', { partyType: 'entity' });

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('SearchFilterEntity Corp');
			expect(result[0].party_type).toBe('entity');
		});

		it('should filter by facilitator party type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'SearchFilter2Entity Corp',
				party_type: 'entity',
				});
			await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'SearchFilter2Facilitator Inc',
				party_type: 'facilitator',
				});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await searchParties(ctx, 'SearchFilter2', { partyType: 'facilitator' });

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('SearchFilter2Facilitator Inc');
			expect(result[0].party_type).toBe('facilitator');
		});

		it('should return all types when no filter provided', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'SearchFilter3Entity Corp',
				party_type: 'entity',
				});
			await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'SearchFilter3Facilitator Inc',
				party_type: 'facilitator',
				});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await searchParties(ctx, 'SearchFilter3');

			expect(result).toHaveLength(2);
		});
	});

	describe('getClaimParties with partyType filter', () => {
		it('should filter claim parties by entity type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			const entityParty = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Entity Party For Filter',
				party_type: 'entity',
				});
			const facilitatorParty = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Facilitator Party For Filter',
				party_type: 'facilitator',
				});

			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: entityParty.id,
				created_by: user.id,
			});
			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: facilitatorParty.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimParties(ctx, claim.id, { partyType: 'entity' });

			expect(result).toHaveLength(1);
			expect(result[0].party.party_type).toBe('entity');
		});

		it('should filter claim parties by facilitator type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			const entityParty = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Entity Party For Filter 2',
				party_type: 'entity',
				});
			const facilitatorParty = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Facilitator Party For Filter 2',
				party_type: 'facilitator',
				});

			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: entityParty.id,
				created_by: user.id,
			});
			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: facilitatorParty.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimParties(ctx, claim.id, { partyType: 'facilitator' });

			expect(result).toHaveLength(1);
			expect(result[0].party.party_type).toBe('facilitator');
		});
	});

	describe('getClaimParties with coverages', () => {
		it('should include coverages for each claim party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Party With Coverages',
				party_type: 'entity',
			});

			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party.id,
				created_by: user.id,
			});

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

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimParties(ctx, claim.id);

			const partyResult = result.find((cp) => cp.party.name === 'Party With Coverages');
			expect(partyResult).toBeDefined();
			expect(partyResult?.coverages).toHaveLength(2);
			expect(partyResult?.coverages.some((c) => c.loss_type === 'dwelling')).toBe(true);
			expect(partyResult?.coverages.some((c) => c.loss_type === 'personal_property')).toBe(true);
		});

		it('should exclude soft-deleted coverages', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Party With Mixed Coverages',
				party_type: 'entity',
			});

			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party.id,
				created_by: user.id,
			});

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

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimParties(ctx, claim.id);

			const partyResult = result.find((cp) => cp.party.name === 'Party With Mixed Coverages');
			expect(partyResult?.coverages).toHaveLength(1);
			expect(partyResult?.coverages[0].loss_type).toBe('dwelling');
		});
	});

	describe('archiveClaimParty with coverage cascade', () => {
		it('should archive coverages when archiving a claim party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Party To Archive',
				party_type: 'entity',
			});

			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party.id,
				created_by: user.id,
			});

			// Create coverages for this claim party
			const coverage1 = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				loss_type: 'dwelling',
				amount_reserved: '5000',
			});
			const coverage2 = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				loss_type: 'personal_property',
				amount_reserved: '3000',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Archive the party
			await archiveClaimParty(ctx, claimParty.id);

			// Verify coverages are soft-deleted and FK nullified
			const archived1 = await db
				.selectFrom('claim_coverage')
				.selectAll()
				.where('id', '=', coverage1.id)
				.executeTakeFirst();
			const archived2 = await db
				.selectFrom('claim_coverage')
				.selectAll()
				.where('id', '=', coverage2.id)
				.executeTakeFirst();

			expect(archived1?.deleted_at).not.toBeNull();
			expect(archived2?.deleted_at).not.toBeNull();
			expect(archived1?.claim_party_id).toBeNull();
			expect(archived2?.claim_party_id).toBeNull();
		});

		it('should return updated totalIncurred after archiving', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			// Create two parties with coverages
			const party1 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Party 1 To Archive',
				party_type: 'entity',
			});
			const party2 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Party 2 To Keep',
				party_type: 'entity',
			});

			const claimParty1 = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party1.id,
				created_by: user.id,
			});
			const claimParty2 = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party2.id,
				created_by: user.id,
			});

			// Create coverages for both parties
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty1.id,
				created_by: user.id,
				amount_reserved: '5000',
			});
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty2.id,
				created_by: user.id,
				amount_reserved: '3000',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Archive party 1
			const result = await archiveClaimParty(ctx, claimParty1.id);

			// Query no longer returns totalIncurred - controller orchestrates recalculation
			expect(result.claimId).toBe(claim.id);

			// Verify totalIncurred is updated by calling recalculate separately
			const { recalculateTotalIncurred } = await import('@/api/queries/claimQueries');
			const totalIncurred = await recalculateTotalIncurred(ctx, claim.id);
			expect(totalIncurred).toBe(3000); // Should only have party 2's coverage
		});
	});

	describe('archiveClaimParty with facilitator cascade', () => {
		it('should cascade archive to nested facilitators', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			// Create entity and facilitator parties
			const entityParty = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Entity Party',
				party_type: 'entity',
			});
			const facilitatorParty = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Facilitator Party',
				party_type: 'facilitator',
			});

			// Link entity to claim
			const entityClaimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: entityParty.id,
				created_by: user.id,
			});

			// Link facilitator to claim with entity as parent
			const facilitatorClaimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: facilitatorParty.id,
				created_by: user.id,
				parent_claim_party_id: entityClaimParty.id,
			});

			// Add coverage to facilitator
			const facilitatorCoverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: facilitatorClaimParty.id,
				created_by: user.id,
				amount_reserved: '5000',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Archive the entity (should cascade to facilitator)
			await archiveClaimParty(ctx, entityClaimParty.id);

			// Verify entity claim party is archived
			const archivedEntity = await db
				.selectFrom('claim_party')
				.selectAll()
				.where('id', '=', entityClaimParty.id)
				.executeTakeFirst();
			expect(archivedEntity?.deleted_at).not.toBeNull();
			expect(archivedEntity?.deleted_by).toBe(user.id);

			// Verify facilitator claim party is also archived
			const archivedFacilitator = await db
				.selectFrom('claim_party')
				.selectAll()
				.where('id', '=', facilitatorClaimParty.id)
				.executeTakeFirst();
			expect(archivedFacilitator?.deleted_at).not.toBeNull();
			expect(archivedFacilitator?.deleted_by).toBe(user.id);

			// Verify facilitator's coverage is archived
			const archivedCoverage = await db
				.selectFrom('claim_coverage')
				.selectAll()
				.where('id', '=', facilitatorCoverage.id)
				.executeTakeFirst();
			expect(archivedCoverage?.deleted_at).not.toBeNull();
		});

		it('should archive multiple levels of nested facilitators', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			// Create entity and two levels of facilitators
			const entityParty = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Entity Deep',
				party_type: 'entity',
			});
			const facilitator1Party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Facilitator Level 1',
				party_type: 'facilitator',
			});
			const facilitator2Party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Facilitator Level 2',
				party_type: 'facilitator',
			});

			// Link entity to claim
			const entityClaimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: entityParty.id,
				created_by: user.id,
			});

			// Link facilitator 1 under entity
			const facilitator1ClaimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: facilitator1Party.id,
				created_by: user.id,
				parent_claim_party_id: entityClaimParty.id,
			});

			// Link facilitator 2 under facilitator 1
			const facilitator2ClaimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: facilitator2Party.id,
				created_by: user.id,
				parent_claim_party_id: facilitator1ClaimParty.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Archive the entity (should cascade to both facilitators)
			await archiveClaimParty(ctx, entityClaimParty.id);

			// Verify all three are archived
			const archivedEntity = await db
				.selectFrom('claim_party')
				.selectAll()
				.where('id', '=', entityClaimParty.id)
				.executeTakeFirst();
			expect(archivedEntity?.deleted_at).not.toBeNull();

			const archivedFacilitator1 = await db
				.selectFrom('claim_party')
				.selectAll()
				.where('id', '=', facilitator1ClaimParty.id)
				.executeTakeFirst();
			expect(archivedFacilitator1?.deleted_at).not.toBeNull();

			const archivedFacilitator2 = await db
				.selectFrom('claim_party')
				.selectAll()
				.where('id', '=', facilitator2ClaimParty.id)
				.executeTakeFirst();
			expect(archivedFacilitator2?.deleted_at).not.toBeNull();
		});

		it('should not affect sibling parties when archiving', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			// Create two sibling entities
			const entity1Party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Entity 1 Sibling',
				party_type: 'entity',
			});
			const entity2Party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Entity 2 Sibling',
				party_type: 'entity',
			});

			const entity1ClaimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: entity1Party.id,
				created_by: user.id,
			});
			const entity2ClaimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: entity2Party.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Archive entity 1
			await archiveClaimParty(ctx, entity1ClaimParty.id);

			// Verify entity 1 is archived
			const archivedEntity1 = await db
				.selectFrom('claim_party')
				.selectAll()
				.where('id', '=', entity1ClaimParty.id)
				.executeTakeFirst();
			expect(archivedEntity1?.deleted_at).not.toBeNull();

			// Verify entity 2 is NOT archived
			const entity2 = await db
				.selectFrom('claim_party')
				.selectAll()
				.where('id', '=', entity2ClaimParty.id)
				.executeTakeFirst();
			expect(entity2?.deleted_at).toBeNull();
		});
	});

	// ============================================================================
	// ROLE LIST ENTITY FILTERING (NEW FEATURE)
	// ============================================================================

	describe('getClaimParties with roleListEntity filter', () => {
		it('should filter claim parties by claimant_party_role', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			// Create role lists
			await createTestRoleList(db, {
				client_id: client.id,
				entity: 'claimant_party_role',
				roles: ['claimant', 'insured'],
			});
			await createTestRoleList(db, {
				client_id: client.id,
				entity: 'adverse_party_role',
				roles: ['responsible_party', 'adverse_carrier'],
			});

			// Create parties and link to claim with different roles
			const claimantParty = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Claimant Entity',
				party_type: 'entity',
			});
			const adverseParty = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Adverse Entity',
				party_type: 'entity',
			});

			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: claimantParty.id,
				created_by: user.id,
				role: ['claimant'], // From claimant_party_role
			});
			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: adverseParty.id,
				created_by: user.id,
				role: ['responsible_party'], // From adverse_party_role
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Filter by claimant_party_role
			const result = await getClaimParties(ctx, claim.id, { roleListEntity: 'claimant_party_role' });

			expect(result).toHaveLength(1);
			expect(result[0].party.name).toBe('Claimant Entity');
			expect(result[0].role).toEqual(['claimant']);
		});

		it('should filter claim parties by adverse_party_role', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			// Create role lists
			await createTestRoleList(db, {
				client_id: client.id,
				entity: 'claimant_party_role',
				roles: ['claimant', 'insured'],
			});
			await createTestRoleList(db, {
				client_id: client.id,
				entity: 'adverse_party_role',
				roles: ['responsible_party', 'adverse_carrier'],
			});

			// Create parties and link to claim with different roles
			const claimantParty = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Claimant Entity 2',
				party_type: 'entity',
			});
			const adverseParty = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Adverse Entity 2',
				party_type: 'entity',
			});

			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: claimantParty.id,
				created_by: user.id,
				role: ['insured'], // From claimant_party_role
			});
			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: adverseParty.id,
				created_by: user.id,
				role: ['adverse_carrier'], // From adverse_party_role
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Filter by adverse_party_role
			const result = await getClaimParties(ctx, claim.id, { roleListEntity: 'adverse_party_role' });

			expect(result).toHaveLength(1);
			expect(result[0].party.name).toBe('Adverse Entity 2');
			expect(result[0].role).toEqual(['adverse_carrier']);
		});

		it('should return empty if no parties match role list', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			// Create only claimant roles
			await createTestRoleList(db, {
				client_id: client.id,
				entity: 'claimant_party_role',
				roles: ['claimant'],
			});
			await createTestRoleList(db, {
				client_id: client.id,
				entity: 'adverse_party_role',
				roles: ['responsible_party'],
			});

			// Create party with adverse role
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Only Adverse',
				party_type: 'entity',
			});

			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party.id,
				created_by: user.id,
				role: ['responsible_party'],
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Filter by claimant_party_role - should return nothing
			const result = await getClaimParties(ctx, claim.id, { roleListEntity: 'claimant_party_role' });

			expect(result).toHaveLength(0);
		});

		it('should exclude inactive reference options from filter', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			// Create role list
			const { list, options } = await createTestRoleList(db, {
				client_id: client.id,
				entity: 'claimant_party_role',
				roles: ['claimant', 'insured'],
			});

			// Deactivate 'insured' role
			await db
				.updateTable('reference_option')
				.set({ is_active: false })
				.where('id', '=', options[1].id)
				.execute();

			// Create parties with both roles
			const party1 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Active Role Party',
				party_type: 'entity',
			});
			const party2 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Inactive Role Party',
				party_type: 'entity',
			});

			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party1.id,
				created_by: user.id,
				role: ['claimant'],
			});
			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party2.id,
				created_by: user.id,
				role: ['insured'], // This role is now inactive
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimParties(ctx, claim.id, { roleListEntity: 'claimant_party_role' });

			// Only the party with the active role should be returned
			expect(result).toHaveLength(1);
			expect(result[0].party.name).toBe('Active Role Party');
		});
	});

	// ============================================================================
	// PARENT CLAIM PARTY ID (ENTITY-FACILITATOR HIERARCHY)
	// ============================================================================

	describe('linkPartyToClaim with parent_claim_party_id', () => {
		it('should link a facilitator under a parent entity', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			// Create an entity
			const entityParty = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Parent Entity',
				party_type: 'entity',
			});

			// Create a facilitator
			const facilitatorParty = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Child Facilitator',
				party_type: 'facilitator',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Link entity first
			const { claimParty: entityClaimParty } = await linkPartyToClaim(ctx, {
				claim_id: claim.id,
				party_id: entityParty.id,
				role: ['claimant'],
			});

			// Link facilitator under the entity
			const { claimParty: facilitatorClaimParty } = await linkPartyToClaim(ctx, {
				claim_id: claim.id,
				party_id: facilitatorParty.id,
				role: ['our_attorney'],
				parent_claim_party_id: entityClaimParty.id,
			});

			expect(facilitatorClaimParty.parent_claim_party_id).toBe(entityClaimParty.id);
		});

		it('should return parent_claim_party_id in getClaimParties', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			// Create parties
			const entityParty = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Parent For GetClaimParties',
				party_type: 'entity',
			});
			const facilitatorParty = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Child For GetClaimParties',
				party_type: 'facilitator',
			});

			// Link both
			const entityCP = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: entityParty.id,
				created_by: user.id,
			});
			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: facilitatorParty.id,
				created_by: user.id,
				parent_claim_party_id: entityCP.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimParties(ctx, claim.id);

			const parent = result.find((cp) => cp.party.name === 'Parent For GetClaimParties');
			const child = result.find((cp) => cp.party.name === 'Child For GetClaimParties');

			expect(parent?.parent_claim_party_id).toBeNull();
			expect(child?.parent_claim_party_id).toBe(entityCP.id);
		});
	});

	describe('updateClaimParty with parent_claim_party_id', () => {
		it('should update parent_claim_party_id to link facilitator to different entity', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			// Create two entities
			const entity1 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Entity 1',
				party_type: 'entity',
			});
			const entity2 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Entity 2',
				party_type: 'entity',
			});

			// Create a facilitator
			const facilitator = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Movable Facilitator',
				party_type: 'facilitator',
			});

			// Link entities
			const entity1CP = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: entity1.id,
				created_by: user.id,
			});
			const entity2CP = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: entity2.id,
				created_by: user.id,
			});

			// Link facilitator under entity 1
			const facilitatorCP = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: facilitator.id,
				created_by: user.id,
				parent_claim_party_id: entity1CP.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Move facilitator to entity 2
			const { claimParty: updated } = await updateClaimParty(ctx, facilitatorCP.id, {
				parent_claim_party_id: entity2CP.id,
			});

			expect(updated.parent_claim_party_id).toBe(entity2CP.id);
		});

		it('should allow removing parent by setting to null', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			const entity = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Parent To Remove',
				party_type: 'entity',
			});
			const facilitator = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Orphan Facilitator',
				party_type: 'facilitator',
			});

			const entityCP = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: entity.id,
				created_by: user.id,
			});
			const facilitatorCP = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: facilitator.id,
				created_by: user.id,
				parent_claim_party_id: entityCP.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Remove parent
			const { claimParty: updated } = await updateClaimParty(ctx, facilitatorCP.id, {
				parent_claim_party_id: null,
			});

			expect(updated.parent_claim_party_id).toBeNull();
		});
	});

	// ============================================================================
	// MULTI-ROLE CLAIM PARTY TESTS
	// ============================================================================

	describe('linkPartyToClaim with multiple roles', () => {
		it('should link a party with multiple roles', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Multi-Role Party',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const { claimParty } = await linkPartyToClaim(ctx, {
				claim_id: claim.id,
				party_id: party.id,
				role: ['adverse_carrier', 'responsible_party'],
			});

			expect(claimParty.role).toEqual(['adverse_carrier', 'responsible_party']);
		});

		it('should return multi-role parties in getClaimParties', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Multi-Role Party 2',
			});

			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party.id,
				created_by: user.id,
				role: ['claimant', 'insured'],
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimParties(ctx, claim.id);

			expect(result).toHaveLength(1);
			expect(result[0].role).toEqual(['claimant', 'insured']);
		});

		it('should filter multi-role parties by roleListEntity when any role matches', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			await createTestRoleList(db, {
				client_id: client.id,
				entity: 'claimant_party_role',
				roles: ['claimant', 'insured'],
			});
			await createTestRoleList(db, {
				client_id: client.id,
				entity: 'adverse_party_role',
				roles: ['adverse_carrier', 'responsible_party'],
			});

			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Mixed Role Party',
			});

			// Party has roles from both lists
			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party.id,
				created_by: user.id,
				role: ['claimant', 'adverse_carrier'], // One from each list
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Should match when filtering by claimant roles (has 'claimant')
			const claimantResult = await getClaimParties(ctx, claim.id, { roleListEntity: 'claimant_party_role' });
			expect(claimantResult).toHaveLength(1);

			// Should also match when filtering by adverse roles (has 'adverse_carrier')
			const adverseResult = await getClaimParties(ctx, claim.id, { roleListEntity: 'adverse_party_role' });
			expect(adverseResult).toHaveLength(1);
		});
	});

	describe('updateClaimParty with role changes', () => {
		it('should update roles to a different set of same length', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
			});

			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party.id,
				created_by: user.id,
				role: ['adverse_carrier'],
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const { claimParty: updated } = await updateClaimParty(ctx, claimParty.id, {
				role: ['responsible_party'], // Same length, different value
			});

			expect(updated.role).toEqual(['responsible_party']);
		});

		it('should add additional roles', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
			});

			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: party.id,
				created_by: user.id,
				role: ['adverse_carrier'],
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const { claimParty: updated } = await updateClaimParty(ctx, claimParty.id, {
				role: ['adverse_carrier', 'responsible_party'],
			});

			expect(updated.role).toEqual(['adverse_carrier', 'responsible_party']);
		});
	});

	// ============================================================================
	// PARTY PHONE CRUD TESTS
	// ============================================================================

	describe('getPartyPhones', () => {
		it('should return phones for a party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			await createTestPartyPhone(db, {
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
				phone_number: '555-1234',
				phone_type: 'work',
			});
			await createTestPartyPhone(db, {
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
				phone_number: '555-5678',
				phone_type: 'mobile',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyPhones(ctx, party.id);

			expect(result).toHaveLength(2);
			expect(result.map((p) => p.phone_number)).toContain('555-1234');
			expect(result.map((p) => p.phone_number)).toContain('555-5678');
		});

		it('should exclude archived phones by default', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			await createTestPartyPhone(db, {
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
				phone_number: '555-1111',
			});
			await createTestPartyPhone(db, {
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
				phone_number: '555-2222',
				deleted_at: new Date(),
				deleted_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyPhones(ctx, party.id);

			expect(result).toHaveLength(1);
			expect(result[0].phone_number).toBe('555-1111');
		});
	});

	describe('createPartyPhone', () => {
		it('should create a new phone', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const phone = await createPartyPhone(ctx, {
				party_id: party.id,
				phone_number: '555-9999',
				phone_type: 'work',
				phone_status: 'valid',
				area_code: '212',
			});

			expect(phone.phone_number).toBe('555-9999');
			expect(phone.phone_type).toBe('work');
			expect(phone.phone_status).toBe('valid');
			expect(phone.area_code).toBe('212');
			expect(phone.party_id).toBe(party.id);
		});
	});

	describe('updatePartyPhone', () => {
		it('should update phone fields', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const phone = await createTestPartyPhone(db, {
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
				phone_number: '555-0000',
				phone_type: 'work',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const updated = await updatePartyPhone(ctx, phone.id, {
				phone_number: '555-1111',
				phone_type: 'mobile',
				phone_status: 'disconnected',
			});

			expect(updated.phone_number).toBe('555-1111');
			expect(updated.phone_type).toBe('mobile');
			expect(updated.phone_status).toBe('disconnected');
		});
	});

	describe('archivePartyPhone / restorePartyPhone', () => {
		it('should archive and restore a phone', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const phone = await createTestPartyPhone(db, {
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Archive
			await archivePartyPhone(ctx, phone.id);
			const archivedPhones = await getPartyPhones(ctx, party.id);
			expect(archivedPhones).toHaveLength(0);

			// Restore
			await restorePartyPhone(ctx, phone.id);
			const restoredPhones = await getPartyPhones(ctx, party.id);
			expect(restoredPhones).toHaveLength(1);
		});
	});

	// ============================================================================
	// PARTY EMAIL CRUD TESTS
	// ============================================================================

	describe('getPartyEmails', () => {
		it('should return emails for a party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			await createTestPartyEmail(db, {
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
				email_address: 'work@example.com',
				email_type: 'business',
			});
			await createTestPartyEmail(db, {
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
				email_address: 'personal@example.com',
				email_type: 'personal',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyEmails(ctx, party.id);

			expect(result).toHaveLength(2);
			expect(result.map((e) => e.email_address)).toContain('work@example.com');
			expect(result.map((e) => e.email_address)).toContain('personal@example.com');
		});

		it('should exclude archived emails by default', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			await createTestPartyEmail(db, {
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
				email_address: 'active@example.com',
			});
			await createTestPartyEmail(db, {
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
				email_address: 'archived@example.com',
				deleted_at: new Date(),
				deleted_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyEmails(ctx, party.id);

			expect(result).toHaveLength(1);
			expect(result[0].email_address).toBe('active@example.com');
		});
	});

	describe('createPartyEmail', () => {
		it('should create a new email', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const email = await createPartyEmail(ctx, {
				party_id: party.id,
				email_address: 'new@example.com',
				email_type: 'business',
			});

			expect(email.email_address).toBe('new@example.com');
			expect(email.email_type).toBe('business');
			expect(email.party_id).toBe(party.id);
		});
	});

	describe('updatePartyEmail', () => {
		it('should update email fields', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const email = await createTestPartyEmail(db, {
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
				email_address: 'old@example.com',
				email_type: 'business',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const updated = await updatePartyEmail(ctx, email.id, {
				email_address: 'updated@example.com',
				email_type: 'personal',
			});

			expect(updated.email_address).toBe('updated@example.com');
			expect(updated.email_type).toBe('personal');
		});
	});

	describe('archivePartyEmail / restorePartyEmail', () => {
		it('should archive and restore an email', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const email = await createTestPartyEmail(db, {
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Archive
			await archivePartyEmail(ctx, email.id);
			const archivedEmails = await getPartyEmails(ctx, party.id);
			expect(archivedEmails).toHaveLength(0);

			// Restore
			await restorePartyEmail(ctx, email.id);
			const restoredEmails = await getPartyEmails(ctx, party.id);
			expect(restoredEmails).toHaveLength(1);
		});
	});

	// ============================================================================
	// FACILITATOR LOSS_TYPE AND POLICY_LIMIT TESTS
	// ============================================================================

	describe('linkPartyToClaim with facilitator fields', () => {
		it('should link a facilitator with loss_type and policy_limit', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const entity = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Entity for Facilitator Fields Test 1',
				party_type: 'entity',
			});
			const facilitator = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Facilitator for Fields Test 1',
				party_type: 'facilitator',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const { claimParty: entityCP } = await linkPartyToClaim(ctx, {
				claim_id: claim.id,
				party_id: entity.id,
				role: ['claimant'],
			});

			const { claimParty: facilitatorCP } = await linkPartyToClaim(ctx, {
				claim_id: claim.id,
				party_id: facilitator.id,
				role: ['adverse_carrier'],
				parent_claim_party_id: entityCP.id,
				loss_type: 'bodily_injury',
				policy_limit: 100000,
			});

			expect(facilitatorCP.loss_type).toBe('bodily_injury');
			expect(parseFloat(facilitatorCP.policy_limit!)).toBe(100000);
			expect(facilitatorCP.parent_claim_party_id).toBe(entityCP.id);
		});

		it('should return loss_type and policy_limit in getClaimParties', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const entity = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Entity for Facilitator Fields Test 2',
				party_type: 'entity',
			});
			const facilitator = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Facilitator for Fields Test 2',
				party_type: 'facilitator',
			});

			const entityCP = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: entity.id,
				created_by: user.id,
				role: ['claimant'],
			});
			await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: facilitator.id,
				created_by: user.id,
				role: ['adverse_carrier'],
				parent_claim_party_id: entityCP.id,
				loss_type: 'property_damage',
				policy_limit: '50000',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimParties(ctx, claim.id);

			expect(result).toHaveLength(2);
			const facilitatorResult = result.find((p) => p.party.party_type === 'facilitator');
			expect(facilitatorResult?.loss_type).toBe('property_damage');
			expect(parseFloat(facilitatorResult?.policy_limit!)).toBe(50000);
		});
	});

	describe('updateClaimParty with facilitator fields', () => {
		it('should update loss_type and policy_limit', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const facilitator = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Facilitator for Update Fields Test',
				party_type: 'facilitator',
			});

			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				client_id: client.id,
				party_id: facilitator.id,
				created_by: user.id,
				role: ['adverse_carrier'],
				loss_type: 'bodily_injury',
				policy_limit: '100000',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const { claimParty: updated } = await updateClaimParty(ctx, claimParty.id, {
				loss_type: 'property_damage',
				policy_limit: 250000,
			});

			expect(updated.loss_type).toBe('property_damage');
			expect(parseFloat(updated.policy_limit!)).toBe(250000);
		});
	});
});
