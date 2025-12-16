/**
 * Integration tests for partyQueries
 *
 * These tests run against a real database to verify:
 * - Multi-tenant data isolation
 * - Party CRUD operations
 * - Party office management
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
	createTestPartyOffice,
	createTestPartyRepresentative,
	createTestClaimParty,
	createTestClaimLiability,
	createTestCoverage,
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
	getPartyOffices,
	getAllPartyOffices,
	createPartyOffice,
	updatePartyOffice,
	getPartyOffice,
	archivePartyOffice,
	restorePartyOffice,
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
	unlinkPartyFromClaim,
	getClaimLiabilityPercentageTotal,
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
				party_category: 'adverse_carrier',
				name: 'New Created Party',
				organization: 'Test Org',
				email: 'test@example.com',
			});

			expect(result.id).toBeDefined();
			expect(result.name).toBe('New Created Party');
			expect(result.organization).toBe('Test Org');
			expect(result.email).toBe('test@example.com');
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

		it('should cascade archive to offices and representatives', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const office = await createTestPartyOffice(db, { party_id: party.id, created_by: user.id });
			const rep = await createTestPartyRepresentative(db, { party_id: party.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await archiveParty(ctx, party.id);

			// Check offices are archived
			const offices = await getPartyOffices(ctx, party.id, true); // showArchived=true
			expect(offices.some((o) => o.id === office.id)).toBe(true);

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

			await expect(archiveParty(ctx, 999999)).rejects.toThrow('Party not found');
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

		it('should cascade restore to offices and representatives', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				deleted_at: new Date(),
				deleted_by: user.email!,
			});
			await createTestPartyOffice(db, {
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

			// Check offices are restored
			const offices = await getPartyOffices(ctx, party.id);
			expect(offices.length).toBeGreaterThanOrEqual(1);

			// Check representatives are restored
			const reps = await getPartyRepresentatives(ctx, party.id);
			expect(reps.length).toBeGreaterThanOrEqual(1);
		});

		it('should throw error for non-existent party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(restoreParty(ctx, 999999)).rejects.toThrow('Party not found');
		});
	});

	// ============================================================================
	// PARTY OFFICE OPERATIONS
	// ============================================================================

	describe('getPartyOffices', () => {
		it('should return offices for a party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user.id,
				office_name: 'Main Office',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyOffices(ctx, party.id);

			expect(result.some((o) => o.office_name === 'Main Office')).toBe(true);
		});

		it('should order by is_primary first', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user.id,
				office_name: 'Secondary Office',
				is_primary: false,
			});
			await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user.id,
				office_name: 'Primary Office',
				is_primary: true,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyOffices(ctx, party.id);

			expect(result[0].office_name).toBe('Primary Office');
		});

		it('should exclude archived offices by default', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user.id,
				office_name: 'Active Office',
			});
			await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user.id,
				office_name: 'Archived Office',
				deleted_at: new Date(),
				deleted_by: user.email!,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyOffices(ctx, party.id);

			expect(result.some((o) => o.office_name === 'Active Office')).toBe(true);
			expect(result.some((o) => o.office_name === 'Archived Office')).toBe(false);
		});

		it('should return only archived offices when showArchived is true', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user.id,
				office_name: 'Active Office Show',
			});
			await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user.id,
				office_name: 'Archived Office Show',
				deleted_at: new Date(),
				deleted_by: user.email!,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyOffices(ctx, party.id, true);

			expect(result.some((o) => o.office_name === 'Archived Office Show')).toBe(true);
			expect(result.some((o) => o.office_name === 'Active Office Show')).toBe(false);
		});
	});

	describe('getAllPartyOffices', () => {
		it('should return offices across all parties', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party1 = await createTestParty(db, { client_id: client.id, created_by: user.id, name: 'Party A' });
			const party2 = await createTestParty(db, { client_id: client.id, created_by: user.id, name: 'Party B' });

			await createTestPartyOffice(db, { party_id: party1.id, created_by: user.id, office_name: 'Office A' });
			await createTestPartyOffice(db, { party_id: party2.id, created_by: user.id, office_name: 'Office B' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAllPartyOffices(ctx);

			expect(result.rows.some((o) => o.office_name === 'Office A')).toBe(true);
			expect(result.rows.some((o) => o.office_name === 'Office B')).toBe(true);
		});

		it('should search by party name, office name, or city/state', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Searchable Party Office',
			});

			await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user.id,
				office_name: 'Headquarters',
				city: 'Denver',
				state: 'CO',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Search by party name
			const result1 = await getAllPartyOffices(ctx, 'Searchable Party Office');
			expect(result1.rows.some((o) => o.office_name === 'Headquarters')).toBe(true);

			// Search by office name
			const result2 = await getAllPartyOffices(ctx, 'Headquarters');
			expect(result2.rows.some((o) => o.office_name === 'Headquarters')).toBe(true);

			// Search by city
			const result3 = await getAllPartyOffices(ctx, 'Denver');
			expect(result3.rows.some((o) => o.office_name === 'Headquarters')).toBe(true);

			// Search by state
			const result4 = await getAllPartyOffices(ctx, 'CO');
			expect(result4.rows.some((o) => o.office_name === 'Headquarters')).toBe(true);
		});

		it('should handle pagination', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			// Create 5 offices
			for (let i = 0; i < 5; i++) {
				await createTestPartyOffice(db, {
					party_id: party.id,
					created_by: user.id,
					office_name: `Pagination Office ${i}`,
				});
			}

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const page1 = await getAllPartyOffices(ctx, undefined, 2, 0);
			const page2 = await getAllPartyOffices(ctx, undefined, 2, 2);

			expect(page1.rows).toHaveLength(2);
			expect(page2.rows).toHaveLength(2);
			expect(page1.count).toBeGreaterThanOrEqual(5);
		});

		it('should exclude archived offices by default', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user.id,
				office_name: 'AllActive Office',
			});
			await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user.id,
				office_name: 'AllArchived Office',
				deleted_at: new Date(),
				deleted_by: user.email!,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAllPartyOffices(ctx);

			expect(result.rows.some((o) => o.office_name === 'AllActive Office')).toBe(true);
			expect(result.rows.some((o) => o.office_name === 'AllArchived Office')).toBe(false);
		});

		it('should return only archived offices when showArchived is true', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user.id,
				office_name: 'AllActiveShow Office',
			});
			await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user.id,
				office_name: 'AllArchivedShow Office',
				deleted_at: new Date(),
				deleted_by: user.email!,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAllPartyOffices(ctx, undefined, undefined, undefined, true);

			expect(result.rows.some((o) => o.office_name === 'AllArchivedShow Office')).toBe(true);
			expect(result.rows.some((o) => o.office_name === 'AllActiveShow Office')).toBe(false);
		});
	});

	describe('createPartyOffice', () => {
		it('should create a new office', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await createPartyOffice(ctx, {
				party_id: party.id,
				office_name: 'New Office',
				street_address: '456 Office Way',
				city: 'Denver',
				state: 'CO',
			});

			expect(result.office_name).toBe('New Office');
			expect(result.street_address).toBe('456 Office Way');
			expect(result.city).toBe('Denver');
			expect(result.state).toBe('CO');
		});

		it('should unset other primaries when creating a primary office', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			// Create first primary office
			const firstOffice = await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user.id,
				is_primary: true,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Create second primary office
			await createPartyOffice(ctx, {
				party_id: party.id,
				office_name: 'New Primary',
				is_primary: true,
			});

			// Check first office is no longer primary
			const updatedFirst = await getPartyOffice(ctx, firstOffice.id);
			expect(updatedFirst?.is_primary).toBe(false);
		});
	});

	describe('updatePartyOffice', () => {
		it('should update office fields', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const office = await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user.id,
				office_name: 'Original Office',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await updatePartyOffice(ctx, office.id, {
				office_name: 'Updated Office',
				phone: '555-1234',
			});

			expect(result.office_name).toBe('Updated Office');
			expect(result.phone).toBe('555-1234');
		});

		it('should unset other primaries when setting as primary', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			const office1 = await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user.id,
				is_primary: true,
			});
			const office2 = await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user.id,
				is_primary: false,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Set office2 as primary
			await updatePartyOffice(ctx, office2.id, { is_primary: true });

			// Check office1 is no longer primary
			const updatedOffice1 = await getPartyOffice(ctx, office1.id);
			expect(updatedOffice1?.is_primary).toBe(false);
		});
	});

	describe('getPartyOffice', () => {
		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client1.id, created_by: user1.id });
			const office = await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user1.id,
				office_name: 'Private Office',
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getPartyOffice(ctx2, office.id);

			expect(result).toBeUndefined();
		});
	});

	describe('archivePartyOffice / restorePartyOffice', () => {
		it('should archive and restore an office', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const office = await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user.id,
				office_name: 'Archive Test Office',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Archive
			await archivePartyOffice(ctx, office.id);
			let result = await getPartyOffice(ctx, office.id);
			expect(result?.deleted_at).not.toBeNull();

			// Restore
			await restorePartyOffice(ctx, office.id);
			result = await getPartyOffice(ctx, office.id);
			expect(result?.deleted_at).toBeNull();
		});

		it('should throw error when archiving non-existent office', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(archivePartyOffice(ctx, 999999)).rejects.toThrow('Office not found');
		});

		it('should throw error when restoring non-existent office', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(restorePartyOffice(ctx, 999999)).rejects.toThrow('Office not found');
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

		it('should filter by office ID', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const office1 = await createTestPartyOffice(db, { party_id: party.id, created_by: user.id });
			const office2 = await createTestPartyOffice(db, { party_id: party.id, created_by: user.id });

			await createTestPartyRepresentative(db, {
				party_id: party.id,
				office_id: office1.id,
				created_by: user.id,
				first_name: 'Office1',
				last_name: 'Rep',
			});
			await createTestPartyRepresentative(db, {
				party_id: party.id,
				office_id: office2.id,
				created_by: user.id,
				first_name: 'Office2',
				last_name: 'Rep',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPartyRepresentatives(ctx, party.id, office1.id);

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
				party_id: party.id,
				created_by: user.id,
				role: 'adverse_carrier',
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
				role: 'adverse_carrier',
				representative_id: rep.id,
			});

			const result = await getClaimParties(ctx, claim.id);

			const claimParty = result.find((cp) => cp.party_id === party.id);
			expect(claimParty?.representative?.first_name).toBe('Contact');
			expect(claimParty?.representative?.last_name).toBe('Person');
		});

		it('should include primary office info', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			await createTestPartyOffice(db, {
				party_id: party.id,
				created_by: user.id,
				office_name: 'Primary Office',
				city: 'Denver',
				state: 'CO',
				is_primary: true,
			});

			await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimParties(ctx, claim.id);

			const claimParty = result.find((cp) => cp.party_id === party.id);
			expect(claimParty?.office?.office_name).toBe('Primary Office');
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
				party_id: party.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getClaimParties(ctx2, claim.id);

			expect(result).toHaveLength(0);
		});

		it('should include liabilities for each claim party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			// Create liabilities for this claim party
			await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				loss_type: 'property_damage',
				amount_paid: '5000.00',
			});
			await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				loss_type: 'bodily_injury',
				amount_paid: '10000.00',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimParties(ctx, claim.id);

			const foundClaimParty = result.find((cp) => cp.id === claimParty.id);
			expect(foundClaimParty?.liabilities).toHaveLength(2);
			expect(foundClaimParty?.liabilities.some((l) => l.loss_type === 'property_damage')).toBe(true);
			expect(foundClaimParty?.liabilities.some((l) => l.loss_type === 'bodily_injury')).toBe(true);
		});

		it('should exclude deleted liabilities', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			// Create active liability
			await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				loss_type: 'property_damage',
				amount_paid: '1000.00',
			});

			// Create deleted liability
			const deletedLiability = await createTestClaimLiability(db, {
				client_id: client.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				loss_type: 'bodily_injury',
				amount_paid: '2000.00',
			});

			// Soft delete the liability
			await db
				.updateTable('claim_liability')
				.set({ deleted_at: new Date() })
				.where('id', '=', deletedLiability.id)
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimParties(ctx, claim.id);

			const foundClaimParty = result.find((cp) => cp.id === claimParty.id);
			expect(foundClaimParty?.liabilities).toHaveLength(1);
			expect(foundClaimParty?.liabilities[0].loss_type).toBe('property_damage');
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
				role: 'adverse_carrier',
				liability_percentage: 50,
			});

			expect(claimParty.claim_id).toBe(claim.id);
			expect(claimParty.party_id).toBe(party.id);
			expect(claimParty.role).toBe('adverse_carrier');
			expect(parseFloat(claimParty.liability_percentage!)).toBe(50);
		});

		it('should recalculate expected recovery after linking', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const { expectedRecovery } = await linkPartyToClaim(ctx, {
				claim_id: claim.id,
				party_id: party.id,
				role: 'adverse_carrier',
				liability_percentage: 25,
			});

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

	describe('unlinkPartyFromClaim', () => {
		it('should unlink a party from a claim', async () => {
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

			// Get for deletion first
			const forDeletion = await getClaimPartyForDeletion(ctx, claimParty.id);
			expect(forDeletion).toBeDefined();

			// Unlink
			const { claimId } = await unlinkPartyFromClaim(ctx, claimParty.id);

			expect(claimId).toBe(claim.id);

			// Verify unlinked
			const parties = await getClaimParties(ctx, claim.id);
			expect(parties.some((cp) => cp.id === claimParty.id)).toBe(false);
		});

		it('should throw error for non-existent claim party', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(unlinkPartyFromClaim(ctx, 999999)).rejects.toThrow('Claim party not found');
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
				party_id: party1.id,
				created_by: user.id,
				liability_percentage: '30',
			});
			await createTestClaimParty(db, {
				claim_id: claim.id,
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
				party_id: party1.id,
				created_by: user.id,
				liability_percentage: '40',
			});

			// Create deleted claim party - note: create it first, then soft-delete it
			const deletedClaimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
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
				party_category: 'claimant',
			});
			await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'SearchFilterFacilitator Inc',
				party_type: 'facilitator',
				party_category: 'attorney',
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
				party_category: 'claimant',
			});
			await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'SearchFilter2Facilitator Inc',
				party_type: 'facilitator',
				party_category: 'attorney',
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
				party_category: 'claimant',
			});
			await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'SearchFilter3Facilitator Inc',
				party_type: 'facilitator',
				party_category: 'attorney',
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
				party_category: 'claimant',
			});
			const facilitatorParty = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Facilitator Party For Filter',
				party_type: 'facilitator',
				party_category: 'attorney',
			});

			await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: entityParty.id,
				created_by: user.id,
			});
			await createTestClaimParty(db, {
				claim_id: claim.id,
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
				party_category: 'claimant',
			});
			const facilitatorParty = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Facilitator Party For Filter 2',
				party_type: 'facilitator',
				party_category: 'attorney',
			});

			await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: entityParty.id,
				created_by: user.id,
			});
			await createTestClaimParty(db, {
				claim_id: claim.id,
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
				party_id: party.id,
				created_by: user.id,
			});

			// Create coverages for this claim party
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				coverage_type: 'dwelling',
				coverage_amount: '100000',
			});
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				coverage_type: 'personal_property',
				coverage_amount: '50000',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimParties(ctx, claim.id);

			const partyResult = result.find((cp) => cp.party.name === 'Party With Coverages');
			expect(partyResult).toBeDefined();
			expect(partyResult?.coverages).toHaveLength(2);
			expect(partyResult?.coverages.some((c) => c.coverage_type === 'dwelling')).toBe(true);
			expect(partyResult?.coverages.some((c) => c.coverage_type === 'personal_property')).toBe(true);
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
				party_id: party.id,
				created_by: user.id,
			});

			// Create active coverage
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				coverage_type: 'dwelling',
			});

			// Create soft-deleted coverage
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				coverage_type: 'personal_property',
				deleted_at: new Date(),
				deleted_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getClaimParties(ctx, claim.id);

			const partyResult = result.find((cp) => cp.party.name === 'Party With Mixed Coverages');
			expect(partyResult?.coverages).toHaveLength(1);
			expect(partyResult?.coverages[0].coverage_type).toBe('dwelling');
		});
	});

	describe('unlinkPartyFromClaim with coverage cascade', () => {
		it('should archive coverages when unlinking party from claim', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Party To Unlink',
				party_type: 'entity',
			});

			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
			});

			// Create coverages for this claim party
			const coverage1 = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				coverage_type: 'dwelling',
				amount_reserved: '5000',
			});
			const coverage2 = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				created_by: user.id,
				coverage_type: 'personal_property',
				amount_reserved: '3000',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Unlink the party
			await unlinkPartyFromClaim(ctx, claimParty.id);

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

		it('should return updated totalIncurred after unlinking', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			// Create two parties with coverages
			const party1 = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Party 1 To Unlink',
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
				party_id: party1.id,
				created_by: user.id,
			});
			const claimParty2 = await createTestClaimParty(db, {
				claim_id: claim.id,
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

			// Unlink party 1
			const result = await unlinkPartyFromClaim(ctx, claimParty1.id);

			// Should only have party 2's coverage (3000)
			expect(result.totalIncurred).toBe(3000);
		});
	});
});
