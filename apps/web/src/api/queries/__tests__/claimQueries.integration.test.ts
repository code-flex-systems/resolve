/**
 * Integration tests for claimQueries
 *
 * These tests run against a real database to verify:
 * - Multi-tenant data isolation
 * - Role-based access control
 * - Complex query logic (joins, filtering, aggregations)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestFeed,
	createTestChecklist,
	createTestChecklistClaim,
	createTestDeskLocationType,
	createTestDeskLocation,
	createTestUserDeskLocation,
} from '@/__tests__/integration/fixtures';
import { getClaims, getClaimCount, getClaim } from '../claimQueries';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { RecoveryStatus } from '@/config/enums';

describe('claimQueries integration', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// Note: truncateAllTables is called by the global setup before each test
	// Note: closeTestDb is called by the global setup after all tests

	describe('getClaims - Multi-tenant Isolation', () => {
		it('should only return claims for the authenticated user client', async () => {
			// Arrange: Create two clients with claims
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });

			await createTestClaim(db, { client_id: client1.id, insured: 'Client 1 Insured' });
			await createTestClaim(db, { client_id: client1.id, insured: 'Client 1 Insured 2' });
			await createTestClaim(db, { client_id: client2.id, insured: 'Client 2 Insured' });

			const ctx1 = createTestContext(db, { id: user1.id, client_id: client1.id, role: 'Admin' });
			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const client1Claims = await getClaims(ctx1, { type: 'data' }) as Array<{ insured: string | null }>;
			const client2Claims = await getClaims(ctx2, { type: 'data' }) as Array<{ insured: string | null }>;

			// Assert
			expect(client1Claims).toHaveLength(2);
			expect(client2Claims).toHaveLength(1);
			expect(client1Claims.every((c) => c.insured?.includes('Client 1'))).toBe(true);
			expect(client2Claims[0].insured).toBe('Client 2 Insured');
		});

		it('should return correct count per tenant', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });

			await createTestClaim(db, { client_id: client1.id });
			await createTestClaim(db, { client_id: client1.id });
			await createTestClaim(db, { client_id: client1.id });
			await createTestClaim(db, { client_id: client2.id });
			await createTestClaim(db, { client_id: client2.id });

			const ctx = createTestContext(db, { id: user1.id, client_id: client1.id, role: 'Admin' });

			// Act
			const count = await getClaims(ctx, { type: 'count' });

			// Assert
			expect(count).toBe(3);
		});
	});

	describe('getClaims - Role-Based Access', () => {
		it('Admin should see all claims for their client', async () => {
			// Arrange
			const client = await createTestClient(db);
			const adminUser = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const otherUser = await createTestUser(db, { client_id: client.id, role: 'Contributor' });

			// Create claims - some assigned, some not
			await createTestClaim(db, { client_id: client.id, created_by: otherUser.id });
			await createTestClaim(db, { client_id: client.id, created_by: otherUser.id });
			await createTestClaim(db, { client_id: client.id }); // No creator

			const ctx = createTestContext(db, { id: adminUser.id, client_id: client.id, role: 'Admin' });

			// Act
			const claims = await getClaims(ctx, { type: 'data' }) as Array<unknown>;

			// Assert - Admin sees all 3 claims
			expect(claims).toHaveLength(3);
		});

		it('Contributor should only see claims they own, are assigned to, or are unassigned', async () => {
			// Arrange
			const client = await createTestClient(db);
			const contributor = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const otherUser = await createTestUser(db, { client_id: client.id, role: 'Contributor' });

			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: contributor.id });

			// Claim 1: Owned by contributor (via checklist_claim)
			const claim1 = await createTestClaim(db, { client_id: client.id, insured: 'Owned Claim' });
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim1.id,
				created_by: contributor.id,
			});

			// Claim 2: Assigned to contributor
			const claim2 = await createTestClaim(db, { client_id: client.id, insured: 'Assigned Claim' });
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim2.id,
				created_by: otherUser.id,
				assignee: contributor.id,
			});

			// Claim 3: Owned by other user (should NOT be visible to contributor)
			const claim3 = await createTestClaim(db, { client_id: client.id, insured: 'Other User Claim' });
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim3.id,
				created_by: otherUser.id,
				assignee: otherUser.id,
			});

			// Claim 4: Unassigned (no checklist_claim entry) - should be visible
			await createTestClaim(db, { client_id: client.id, insured: 'Unassigned Claim' });

			const ctx = createTestContext(db, { id: contributor.id, client_id: client.id, role: 'Contributor' });

			// Act
			const claims = await getClaims(ctx, { type: 'data' }) as Array<{ insured: string | null }>;

			// Assert - Contributor sees 3 claims (owned, assigned, unassigned)
			const insureds = claims.map((c) => c.insured);
			expect(claims).toHaveLength(3);
			expect(insureds).toContain('Owned Claim');
			expect(insureds).toContain('Assigned Claim');
			expect(insureds).toContain('Unassigned Claim');
			expect(insureds).not.toContain('Other User Claim');
		});

		it('Contributor should see claims assigned to their desk location', async () => {
			// Arrange
			const client = await createTestClient(db);
			const contributor = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const otherUser = await createTestUser(db, { client_id: client.id, role: 'Contributor' });

			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: contributor.id });

			// Create desk locations
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk1 = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Desk 1',
			});
			const desk2 = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Desk 2',
			});

			// Assign contributor to desk1 only
			await createTestUserDeskLocation(db, {
				user_id: contributor.id,
				desk_location_id: desk1.id,
			});

			// Claim 1: Assigned to desk1 (contributor's desk) - should be visible
			const claim1 = await createTestClaim(db, {
				client_id: client.id,
				insured: 'Desk 1 Claim',
				desk_location_id: desk1.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim1.id,
				created_by: otherUser.id,
				assignee: otherUser.id,
			});

			// Claim 2: Assigned to desk2 (not contributor's desk) - should NOT be visible
			const claim2 = await createTestClaim(db, {
				client_id: client.id,
				insured: 'Desk 2 Claim',
				desk_location_id: desk2.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim2.id,
				created_by: otherUser.id,
				assignee: otherUser.id,
			});

			const ctx = createTestContext(db, { id: contributor.id, client_id: client.id, role: 'Contributor' });

			// Act
			const claims = await getClaims(ctx, { type: 'data' }) as Array<{ insured: string | null }>;

			// Assert - Contributor only sees claim at their desk
			const insureds = claims.map((c) => c.insured);
			expect(insureds).toContain('Desk 1 Claim');
			expect(insureds).not.toContain('Desk 2 Claim');
		});

		it('Contributor should NOT see claims at desk locations they were removed from', async () => {
			// Arrange
			const client = await createTestClient(db);
			const contributor = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const otherUser = await createTestUser(db, { client_id: client.id, role: 'Contributor' });

			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: contributor.id });

			// Create desk location
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});

			// Assign contributor to desk but mark as removed
			await createTestUserDeskLocation(db, {
				user_id: contributor.id,
				desk_location_id: desk.id,
				removed_at: new Date(), // Removed!
			});

			// Claim at the desk - should NOT be visible since user was removed
			const claim = await createTestClaim(db, {
				client_id: client.id,
				insured: 'Desk Claim',
				desk_location_id: desk.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: otherUser.id,
				assignee: otherUser.id,
			});

			const ctx = createTestContext(db, { id: contributor.id, client_id: client.id, role: 'Contributor' });

			// Act
			const claims = await getClaims(ctx, { type: 'data' }) as Array<{ insured: string | null }>;

			// Assert - Contributor should not see the claim (removed from desk)
			const insureds = claims.map((c) => c.insured);
			expect(insureds).not.toContain('Desk Claim');
		});
	});

	describe('getClaims - Search and Filtering', () => {
		it('should filter by insured name (case-insensitive)', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			await createTestClaim(db, { client_id: client.id, insured: 'John Smith' });
			await createTestClaim(db, { client_id: client.id, insured: 'Jane Doe' });
			await createTestClaim(db, { client_id: client.id, insured: 'Bob Johnson' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const claims = await getClaims(ctx, { type: 'data', insured: 'john' }) as Array<unknown>;

			// Assert
			expect(claims).toHaveLength(2); // John Smith and Bob Johnson
		});

		it('should filter by recovery status', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			await createTestClaim(db, { client_id: client.id, recovery_status: 'pending' });
			await createTestClaim(db, { client_id: client.id, recovery_status: 'pending' });
			await createTestClaim(db, { client_id: client.id, recovery_status: 'in_progress' });
			await createTestClaim(db, { client_id: client.id, recovery_status: 'recovered' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const pendingClaims = await getClaims(ctx, { type: 'data', recovery_status: RecoveryStatus.PENDING }) as Array<unknown>;
			const inProgressClaims = await getClaims(ctx, { type: 'data', recovery_status: RecoveryStatus.IN_PROGRESS }) as Array<unknown>;

			// Assert
			expect(pendingClaims).toHaveLength(2);
			expect(inProgressClaims).toHaveLength(1);
		});

		it('should handle pagination correctly', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			// Create 10 claims
			for (let i = 0; i < 10; i++) {
				await createTestClaim(db, {
					client_id: client.id,
					claim_number: `CLM-${String(i).padStart(3, '0')}`,
				});
			}

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const page1 = await getClaims(ctx, { type: 'data', limit: 3, offset: 0 }) as Array<{ claim_number: string | null }>;
			const page2 = await getClaims(ctx, { type: 'data', limit: 3, offset: 3 }) as Array<{ claim_number: string | null }>;
			const page3 = await getClaims(ctx, { type: 'data', limit: 3, offset: 6 }) as Array<{ claim_number: string | null }>;

			// Assert
			expect(page1).toHaveLength(3);
			expect(page2).toHaveLength(3);
			expect(page3).toHaveLength(3);

			// Verify different claims on each page
			const page1Numbers = page1.map((c) => c.claim_number);
			const page2Numbers = page2.map((c) => c.claim_number);
			expect(page1Numbers.some((n) => page2Numbers.includes(n))).toBe(false);
		});
	});

	describe('getClaims - Feed Filtering', () => {
		it('should filter claims by feed', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const feed1 = await createTestFeed(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Feed 1',
				status: 'Online',
			});
			const feed2 = await createTestFeed(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Feed 2',
				status: 'Online',
			});

			await createTestClaim(db, { client_id: client.id, feed_id: feed1.id, insured: 'Feed 1 Claim' });
			await createTestClaim(db, { client_id: client.id, feed_id: feed1.id, insured: 'Feed 1 Claim 2' });
			await createTestClaim(db, { client_id: client.id, feed_id: feed2.id, insured: 'Feed 2 Claim' });
			await createTestClaim(db, { client_id: client.id, insured: 'Manual Claim' }); // No feed

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const feed1Claims = await getClaims(ctx, { type: 'data', feedId: feed1.id }) as Array<{ feed_name: string | null; insured: string | null }>;
			const manualClaims = await getClaims(ctx, { type: 'data', feedId: null }) as Array<{ insured: string | null }>;

			// Assert
			expect(feed1Claims).toHaveLength(2);
			expect(feed1Claims.every((c) => c.feed_name === 'Feed 1')).toBe(true);
			expect(manualClaims).toHaveLength(1);
			expect(manualClaims[0].insured).toBe('Manual Claim');
		});

		it('should exclude claims from inactive feeds by default', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const activeFeed = await createTestFeed(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Active Feed',
				status: 'Online',
			});
			const inactiveFeed = await createTestFeed(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Inactive Feed',
				status: 'Inactive',
			});

			await createTestClaim(db, { client_id: client.id, feed_id: activeFeed.id, insured: 'Active Claim' });
			await createTestClaim(db, { client_id: client.id, feed_id: inactiveFeed.id, insured: 'Inactive Claim' });
			await createTestClaim(db, { client_id: client.id, insured: 'Manual Claim' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act - No feedId filter, should exclude inactive feed claims
			const claims = await getClaims(ctx, { type: 'data' }) as Array<{ insured: string | null }>;

			// Assert
			const insureds = claims.map((c) => c.insured);
			expect(insureds).toContain('Active Claim');
			expect(insureds).toContain('Manual Claim');
			expect(insureds).not.toContain('Inactive Claim');
		});
	});

	describe('getClaimCount', () => {
		it('should return correct counts separated by manual vs feed claims', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const feed = await createTestFeed(db, { client_id: client.id, created_by: user.id, status: 'Online' });

			// 3 feed claims
			await createTestClaim(db, { client_id: client.id, feed_id: feed.id });
			await createTestClaim(db, { client_id: client.id, feed_id: feed.id });
			await createTestClaim(db, { client_id: client.id, feed_id: feed.id });

			// 2 manual claims
			await createTestClaim(db, { client_id: client.id });
			await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const counts = await getClaimCount(ctx, client.id);

			// Assert
			expect(counts.total).toBe(5);
			expect(counts.fed).toBe(3);
			expect(counts.manual).toBe(2);
		});
	});

	describe('getClaim', () => {
		it('should return claim with correct data', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const feed = await createTestFeed(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Test Feed',
			});

			const claim = await createTestClaim(db, {
				client_id: client.id,
				feed_id: feed.id,
				insured: 'Test Insured',
				claim_number: 'CLM-123',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getClaim(ctx, claim.id);

			// Assert
			expect(result).toBeDefined();
			expect(result.claim_number).toBe('CLM-123');
			expect(result.insured).toBe('Test Insured');
			expect(result.feed_id).toBe(feed.id);
			expect(result.client_id).toBe(client.id);
		});

		it('should enforce multi-tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });

			const claim = await createTestClaim(db, { client_id: client1.id });

			const ctx1 = createTestContext(db, { id: user1.id, client_id: client1.id, role: 'Admin' });
			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act & Assert - Owner can see the claim
			const resultOwner = await getClaim(ctx1, claim.id);
			expect(resultOwner).toBeDefined();
			expect(resultOwner.id).toBe(claim.id);

			// Other client should get an error (no result throws)
			await expect(getClaim(ctx2, claim.id)).rejects.toThrow('no result');
		});
	});
});
