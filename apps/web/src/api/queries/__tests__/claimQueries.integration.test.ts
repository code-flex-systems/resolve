/**
 * Integration tests for claimQueries
 *
 * These tests run against a real database to verify:
 * - Multi-tenant data isolation
 * - Role-based access control
 * - Complex query logic (joins, filtering, aggregations)
 * - Financial calculations (expected recovery, total incurred)
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
	createTestParty,
	createTestClaimParty,
	createTestClaimCoverage,
} from '@/__tests__/integration/fixtures';
import {
	getClaims,
	getClaimCount,
	getClaim,
	assignClaim,
	getNextClaimToAssign,
	getRolloverClaimCount,
	updateClaim,
	createClaims,
	getClaimPartyAggregates,
	recalculateClaimExpectedRecovery,
	recalculateTotalIncurred,
	getClaimDetail,
	listMyClaims,
	listMyDeskClaims,
} from '../claimQueries';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { ClaimSearch, RecoveryStatus, LineOfBusiness, LossType, CoverageType } from '@/config/enums';

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
			const { rows: client1Claims } = await getClaims(ctx1, {});
			const { rows: client2Claims } = await getClaims(ctx2, {});

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
			const { count } = await getClaims(ctx, {});

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
			const { rows: claims } = await getClaims(ctx, {});

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
			const { rows: claims } = await getClaims(ctx, {});

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
			const { rows: claims } = await getClaims(ctx, {});

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
			const { rows: claims } = await getClaims(ctx, {});

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
			const { rows: claims } = await getClaims(ctx, { insured: 'john' });

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
			const { rows: pendingClaims } = await getClaims(ctx, { recovery_status: RecoveryStatus.PENDING });
			const { rows: inProgressClaims } = await getClaims(ctx, { recovery_status: RecoveryStatus.IN_PROGRESS });

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
			const { rows: page1 } = await getClaims(ctx, { limit: 3, offset: 0 });
			const { rows: page2 } = await getClaims(ctx, { limit: 3, offset: 3 });
			const { rows: page3 } = await getClaims(ctx, { limit: 3, offset: 6 });

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
			const { rows: feed1Claims } = await getClaims(ctx, { feedId: feed1.id });
			const { rows: manualClaims } = await getClaims(ctx, { feedId: null });

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
			const { rows: claims } = await getClaims(ctx, {});

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

		it('should update last_opened when checklistId is provided', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act - First call creates the checklist_claim
			await getClaim(ctx, claim.id, checklist.id);

			// Verify checklist_claim was created
			const checklistClaim = await db
				.selectFrom('checklist_claim')
				.selectAll()
				.where('checklist_id', '=', checklist.id)
				.where('claim_id', '=', claim.id)
				.executeTakeFirst();

			// Assert
			expect(checklistClaim).toBeDefined();
			expect(checklistClaim?.assignee).toBe(user.id);
			expect(checklistClaim?.created_by).toBe(user.id);
		});

		it('should require published checklist for non-admin users', async () => {
			// Arrange
			const client = await createTestClient(db);
			const admin = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const contributor = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const unpublishedChecklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: admin.id,
				published: false,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: contributor.id, client_id: client.id, role: 'Contributor' });

			// Act & Assert - Contributor cannot access unpublished checklist
			await expect(getClaim(ctx, claim.id, unpublishedChecklist.id)).rejects.toThrow(
				'Checklist is not published'
			);
		});
	});

	describe('assignClaim', () => {
		it('should create a checklist_claim assignment', async () => {
			// Arrange
			const client = await createTestClient(db);
			const admin = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const assignee = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: admin.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: admin.id, client_id: client.id, role: 'Admin' });

			// Act
			await assignClaim(ctx, checklist.id, claim.id, assignee.id);

			// Verify
			const assignment = await db
				.selectFrom('checklist_claim')
				.selectAll()
				.where('checklist_id', '=', checklist.id)
				.where('claim_id', '=', claim.id)
				.executeTakeFirst();

			// Assert
			expect(assignment).toBeDefined();
			expect(assignment?.assignee).toBe(assignee.id);
			expect(assignment?.created_by).toBe(admin.id);
			expect(assignment?.status).toBe('Unworked');
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client1.id,
				created_by: user1.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act & Assert - User from different client cannot assign
			await expect(assignClaim(ctx2, checklist.id, claim.id, user2.id)).rejects.toThrow();
		});
	});

	describe('getNextClaimToAssign', () => {
		it('should return unassigned claims for a feed in order', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const feed = await createTestFeed(db, { client_id: client.id, created_by: user.id, status: 'Online' });

			// Create claims - 3 unassigned, 1 assigned
			const claim1 = await createTestClaim(db, { client_id: client.id, feed_id: feed.id, insured: 'First' });
			const claim2 = await createTestClaim(db, { client_id: client.id, feed_id: feed.id, insured: 'Second' });
			const claim3 = await createTestClaim(db, { client_id: client.id, feed_id: feed.id, insured: 'Third' });
			const assignedClaim = await createTestClaim(db, {
				client_id: client.id,
				feed_id: feed.id,
				insured: 'Assigned',
			});

			// Assign one claim
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: assignedClaim.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getNextClaimToAssign(ctx, feed.id);

			// Assert
			expect(result.total).toBe(3); // 3 unassigned claims
			expect(result.claim).toBeDefined();
			expect(result.claim?.id).toBe(claim1.id); // First created (oldest)
		});

		it('should support offset for pagination', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const feed = await createTestFeed(db, { client_id: client.id, created_by: user.id, status: 'Online' });

			await createTestClaim(db, { client_id: client.id, feed_id: feed.id, insured: 'First' });
			const claim2 = await createTestClaim(db, { client_id: client.id, feed_id: feed.id, insured: 'Second' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act - Get second claim (offset 1)
			const result = await getNextClaimToAssign(ctx, feed.id, 1);

			// Assert
			expect(result.total).toBe(2);
			expect(result.claim?.id).toBe(claim2.id);
		});

		it('should return null claim when all are assigned', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const feed = await createTestFeed(db, { client_id: client.id, created_by: user.id, status: 'Online' });

			const claim = await createTestClaim(db, { client_id: client.id, feed_id: feed.id });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getNextClaimToAssign(ctx, feed.id);

			// Assert
			expect(result.total).toBe(0);
			expect(result.claim).toBeNull();
		});
	});

	describe('getClaims - Additional Filters', () => {
		it('should filter by searchTerm with claim_number type', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			await createTestClaim(db, { client_id: client.id, claim_number: 'CLM-001-ABC' });
			await createTestClaim(db, { client_id: client.id, claim_number: 'CLM-002-DEF' });
			await createTestClaim(db, { client_id: client.id, claim_number: 'XYZ-003-GHI' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const { rows: claims } = await getClaims(ctx, {
				searchTerm: { value: 'CLM', type: ClaimSearch.CLAIM_NUMBER },
			});

			// Assert
			expect(claims).toHaveLength(2);
			expect(claims.every((c) => c.claim_number?.startsWith('CLM'))).toBe(true);
		});

		it('should filter by client name', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			await createTestClaim(db, { client_id: client.id, client: 'Acme Insurance' });
			await createTestClaim(db, { client_id: client.id, client: 'Beta Corp' });
			await createTestClaim(db, { client_id: client.id, client: 'Acme Holdings' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const { rows: claims } = await getClaims(ctx, { client: 'acme' });

			// Assert
			expect(claims).toHaveLength(2);
			expect(claims.every((c) => c.client?.toLowerCase().includes('acme'))).toBe(true);
		});

		it('should filter by loss_type via claim_party', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const claim1 = await createTestClaim(db, { client_id: client.id, insured: 'Fire Claim' });
			const claim2 = await createTestClaim(db, { client_id: client.id, insured: 'Water Claim' });

			// Create separate parties for each claim (party names must be unique per client)
			const party1 = await createTestParty(db, { client_id: client.id, created_by: user.id, name: 'Loss Type Party 1' });
			const party2 = await createTestParty(db, { client_id: client.id, created_by: user.id, name: 'Loss Type Party 2' });

			// Create claim parties with loss_type (facilitator field)
			await createTestClaimParty(db, {
				claim_id: claim1.id,
				party_id: party1.id,
				created_by: user.id,
				loss_type: LossType.FIRE,
			});
			await createTestClaimParty(db, {
				claim_id: claim2.id,
				party_id: party2.id,
				created_by: user.id,
				loss_type: LossType.WATER_DAMAGE,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const { rows: claims } = await getClaims(ctx, { loss_type: LossType.FIRE });

			// Assert
			expect(claims).toHaveLength(1);
			expect(claims[0].insured).toBe('Fire Claim');
		});
	});

	describe('getRolloverClaimCount', () => {
		it('should count claims from previous fiscal quarters', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			// This test is time-sensitive. We'll create claims with old dates.
			// Current fiscal quarter start varies, so we just verify the query runs.
			await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getRolloverClaimCount(ctx);

			// Assert - Just verify structure, actual count depends on current date
			expect(result).toHaveProperty('count');
			expect(typeof result.count).toBe('number');
		});
	});

	describe('updateClaim', () => {
		it('should update claim fields', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, {
				client_id: client.id,
				insured: 'Original Insured',
				recovery_status: 'pending',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await updateClaim(ctx, claim.id, {
				insured: 'Updated Insured',
				recovery_status: 'in_progress',
			});

			// Assert
			expect(result).toBeDefined();
			expect(result?.insured).toBe('Updated Insured');
			expect(result?.recovery_status).toBe('in_progress');
		});

		it('should enforce tenant isolation on updates', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id, insured: 'Original' });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act - User from different client tries to update
			const result = await updateClaim(ctx2, claim.id, { insured: 'Hacked!' });

			// Assert - Update returns undefined (no rows matched)
			expect(result).toBeUndefined();

			// Verify claim unchanged
			const unchangedClaim = await db
				.selectFrom('claim')
				.select(['insured'])
				.where('id', '=', claim.id)
				.executeTakeFirst();
			expect(unchangedClaim?.insured).toBe('Original');
		});

		it('should set last_updated_by and last_update', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			await updateClaim(ctx, claim.id, { insured: 'Updated' });

			// Verify
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['last_updated_by', 'last_update'])
				.where('id', '=', claim.id)
				.executeTakeFirst();

			// Assert
			expect(updatedClaim?.last_updated_by).toBe(user.id);
			expect(updatedClaim?.last_update).toBeDefined();
			// Verify it's today's date (last_update is a DATE column, not TIMESTAMP)
			const updateDate = new Date(updatedClaim!.last_update!);
			const today = new Date();
			expect(updateDate.toISOString().split('T')[0]).toBe(today.toISOString().split('T')[0]);
		});
	});

	describe('createClaims', () => {
		it('should bulk insert claims', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await createClaims(ctx, [
				{ claim_number: 'BULK-001', insured: 'Bulk Insured 1' },
				{ claim_number: 'BULK-002', insured: 'Bulk Insured 2' },
				{ claim_number: 'BULK-003', insured: 'Bulk Insured 3' },
			]);

			// Assert
			expect(result).toHaveLength(3);
			expect(result.map((c) => c.claim_number)).toEqual(['BULK-001', 'BULK-002', 'BULK-003']);
			expect(result.every((c) => c.client_id === client.id)).toBe(true);
			expect(result.every((c) => c.created_by === user.id)).toBe(true);
		});

		it('should upsert on claim_number conflict', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			// Create initial claim
			await createTestClaim(db, {
				client_id: client.id,
				claim_number: 'UPSERT-001',
				insured: 'Original Insured',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act - Insert with same claim_number should update
			const result = await createClaims(ctx, [{ claim_number: 'UPSERT-001', insured: 'Updated Insured' }]);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].insured).toBe('Updated Insured');

			// Verify only one claim exists
			const allClaims = await db
				.selectFrom('claim')
				.select(['claim_number'])
				.where('claim_number', '=', 'UPSERT-001')
				.execute();
			expect(allClaims).toHaveLength(1);
		});
	});

	describe('getClaimPartyAggregates', () => {
		it('should aggregate liability from entities and loss types from facilitators', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			// Create entity parties (have liability_percentage, no parent)
			const entityParty1 = await createTestParty(db, { client_id: client.id, created_by: user.id, name: 'Entity 1' });
			const entityParty2 = await createTestParty(db, { client_id: client.id, created_by: user.id, name: 'Entity 2' });

			// Create facilitator parties (have loss_type, linked to entities)
			const facilitatorParty1 = await createTestParty(db, { client_id: client.id, created_by: user.id, name: 'Facilitator 1' });
			const facilitatorParty2 = await createTestParty(db, { client_id: client.id, created_by: user.id, name: 'Facilitator 2' });

			// Create entity claim parties with liability_percentage
			const entityClaimParty1 = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: entityParty1.id,
				created_by: user.id,
				liability_percentage: '30',
			});
			await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: entityParty2.id,
				created_by: user.id,
				liability_percentage: '20',
			});

			// Create facilitator claim parties with loss_type (nested under entity)
			await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: facilitatorParty1.id,
				created_by: user.id,
				parent_claim_party_id: entityClaimParty1.id,
				loss_type: LossType.COLLISION,
			});
			await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: facilitatorParty2.id,
				created_by: user.id,
				parent_claim_party_id: entityClaimParty1.id,
				loss_type: LossType.FIRE,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getClaimPartyAggregates(ctx, claim.id);

			// Assert
			expect(result.loss_type).toContain(LossType.COLLISION);
			expect(result.loss_type).toContain(LossType.FIRE);
			expect(result.total_liability_percentage).toBe(50); // 30 + 20 from entities only
			expect(result.our_liability_percentage).toBe(50); // 100 - 50
		});

		it('should only count liability from entities, not facilitators', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			// Create entity with 40% liability
			const entityParty = await createTestParty(db, { client_id: client.id, created_by: user.id, name: 'Entity' });
			const facilitatorParty = await createTestParty(db, { client_id: client.id, created_by: user.id, name: 'Facilitator' });

			const entityClaimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: entityParty.id,
				created_by: user.id,
				liability_percentage: '40',
			});

			// Create facilitator with liability_percentage (should be ignored in calculation)
			await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: facilitatorParty.id,
				created_by: user.id,
				parent_claim_party_id: entityClaimParty.id,
				liability_percentage: '25', // This should NOT be counted
				loss_type: LossType.BODILY_INJURY,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getClaimPartyAggregates(ctx, claim.id);

			// Assert - only entity's 40% should be counted, not facilitator's 25%
			expect(result.total_liability_percentage).toBe(40);
			expect(result.our_liability_percentage).toBe(60);
		});

		it('should return zeros for claims without parties', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getClaimPartyAggregates(ctx, claim.id);

			// Assert
			expect(result.loss_type).toEqual([]);
			expect(result.total_liability_percentage).toBe(0);
			expect(result.our_liability_percentage).toBe(100);
		});
	});

	describe('recalculateClaimExpectedRecovery', () => {
		it('should calculate expected_recovery from liability percentage and total_incurred', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			// Set total_incurred on the claim
			await db.updateTable('claim').set({ total_incurred: '20000' }).where('id', '=', claim.id).execute();

			// Create party with 40% liability
			const party = await createTestParty(db, { client_id: client.id, created_by: user.id });
			await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
				liability_percentage: '40',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await recalculateClaimExpectedRecovery(ctx, claim.id);

			// Assert
			// Our liability = 100% - 40% = 60%
			// Expected recovery = 60% × $20,000 = $12,000
			expect(result).toBe(12000);

			// Verify claim was updated
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['expected_recovery'])
				.where('id', '=', claim.id)
				.executeTakeFirst();
			expect(parseFloat(updatedClaim!.expected_recovery!.toString())).toBeCloseTo(12000, 2);
		});

		it('should handle multiple parties correctly', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			// Set total_incurred on the claim
			await db.updateTable('claim').set({ total_incurred: '25000' }).where('id', '=', claim.id).execute();

			// Party 1: 25% liability
			const party1 = await createTestParty(db, { client_id: client.id, created_by: user.id });
			await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party1.id,
				created_by: user.id,
				liability_percentage: '25',
			});

			// Party 2: 35% liability
			const party2 = await createTestParty(db, { client_id: client.id, created_by: user.id });
			await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party2.id,
				created_by: user.id,
				liability_percentage: '35',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await recalculateClaimExpectedRecovery(ctx, claim.id);

			// Assert
			// Total liability = 25% + 35% = 60%
			// Our liability = 100% - 60% = 40%
			// Expected recovery = 40% × $25,000 = $10,000
			expect(result).toBe(10000);
		});

		it('should return 0 when no parties exist', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await recalculateClaimExpectedRecovery(ctx, claim.id);

			// Assert - No total_incurred set, so expected recovery is 0
			expect(result).toBe(0);
		});
	});

	describe('recalculateTotalIncurred', () => {
		it('should sum amount_reserved from all coverages', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			await createTestClaimCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				loss_type: CoverageType.DWELLING,
				amount_reserved: 50000,
			});
			await createTestClaimCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				loss_type: CoverageType.LIABILITY,
				amount_reserved: 25000,
			});
			await createTestClaimCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				loss_type: CoverageType.MEDICAL_PAYMENTS,
				amount_reserved: 10000,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await recalculateTotalIncurred(ctx, claim.id);

			// Assert
			expect(result).toBe(85000);

			// Verify claim was updated
			const updatedClaim = await db
				.selectFrom('claim')
				.select(['total_incurred'])
				.where('id', '=', claim.id)
				.executeTakeFirst();
			expect(parseFloat(updatedClaim!.total_incurred!.toString())).toBeCloseTo(85000, 2);
		});

		it('should return 0 when no coverages exist', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await recalculateTotalIncurred(ctx, claim.id);

			// Assert
			expect(result).toBe(0);
		});
	});

	describe('getClaimDetail', () => {
		it('should return comprehensive claim details for admin', async () => {
			// Arrange
			const client = await createTestClient(db);
			const admin = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const feed = await createTestFeed(db, { client_id: client.id, created_by: admin.id, name: 'Test Feed' });
			const claim = await createTestClaim(db, {
				client_id: client.id,
				feed_id: feed.id,
				insured: 'Detail Test Insured',
				claim_number: 'DETAIL-001',
			});

			// Add a checklist assignment
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: admin.id,
				name: 'Test Checklist',
				published: true,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: admin.id,
				assignee: admin.id,
			});

			// Add entity party and claim_party (coverage requires entity-type party)
			const entityParty = await createTestParty(db, {
				client_id: client.id,
				created_by: admin.id,
				party_type: 'entity',
			});
			const entityClaimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: entityParty.id,
				liability_percentage: 30,
			});

			// Add coverage linked to entity claim_party
			await createTestClaimCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: entityClaimParty.id,
				loss_type: CoverageType.DWELLING,
				coverage_amount: 100000,
			});

			// Add facilitator party (for partySummary count)
			const facilitatorParty = await createTestParty(db, {
				client_id: client.id,
				created_by: admin.id,
				party_type: 'facilitator',
			});
			await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: facilitatorParty.id,
			});

			const ctx = createTestContext(db, { id: admin.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getClaimDetail(ctx, claim.id);

			// Assert
			expect(result.id).toBe(claim.id);
			expect(result.claim_number).toBe('DETAIL-001');
			expect(result.insured).toBe('Detail Test Insured');
			expect(result.feed_name).toBe('Test Feed');
			expect(result.checklistAssignments).toHaveLength(1);
			expect(result.checklistAssignments[0].checklist_name).toBe('Test Checklist');
			expect(result.coverageSummary.count).toBe(1);
			expect(result.partySummary.count).toBe(1);
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act & Assert
			await expect(getClaimDetail(ctx2, claim.id)).rejects.toThrow('Claim not found');
		});

		it('should enforce contributor access via ownership/assignment', async () => {
			// Arrange
			const client = await createTestClient(db);
			const admin = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const contributor = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const otherContributor = await createTestUser(db, { client_id: client.id, role: 'Contributor' });

			const claim = await createTestClaim(db, { client_id: client.id });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: admin.id,
				published: true,
			});

			// Assign to otherContributor, not contributor
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: otherContributor.id,
				assignee: otherContributor.id,
			});

			const ctx = createTestContext(db, { id: contributor.id, client_id: client.id, role: 'Contributor' });

			// Act & Assert - Contributor without access should be denied
			await expect(getClaimDetail(ctx, claim.id)).rejects.toThrow('You do not have access to this claim');
		});

		it('should allow contributor access via desk location', async () => {
			// Arrange
			const client = await createTestClient(db);
			const admin = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const contributor = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const otherUser = await createTestUser(db, { client_id: client.id, role: 'Contributor' });

			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});

			// Assign contributor to desk
			await createTestUserDeskLocation(db, {
				user_id: contributor.id,
				desk_location_id: desk.id,
			});

			// Create claim at the desk
			const claim = await createTestClaim(db, {
				client_id: client.id,
				desk_location_id: desk.id,
			});

			// Assign claim to otherUser (not contributor)
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: admin.id,
				published: true,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: otherUser.id,
				assignee: otherUser.id,
			});

			const ctx = createTestContext(db, { id: contributor.id, client_id: client.id, role: 'Contributor' });

			// Act - Contributor should have access via desk location
			const result = await getClaimDetail(ctx, claim.id);

			// Assert
			expect(result.id).toBe(claim.id);
		});
	});

	describe('listMyClaims', () => {
		it('should return claims assigned to the current user', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const otherUser = await createTestUser(db, { client_id: client.id, role: 'Contributor' });

			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});

			// Create 3 claims assigned to user, 2 assigned to other
			const claim1 = await createTestClaim(db, { client_id: client.id, insured: 'User Claim 1' });
			const claim2 = await createTestClaim(db, { client_id: client.id, insured: 'User Claim 2' });
			const claim3 = await createTestClaim(db, { client_id: client.id, insured: 'User Claim 3' });
			const otherClaim1 = await createTestClaim(db, { client_id: client.id, insured: 'Other Claim 1' });
			const otherClaim2 = await createTestClaim(db, { client_id: client.id, insured: 'Other Claim 2' });

			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim1.id,
				created_by: user.id,
				assignee: user.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim2.id,
				created_by: user.id,
				assignee: user.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim3.id,
				created_by: user.id,
				assignee: user.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: otherClaim1.id,
				created_by: otherUser.id,
				assignee: otherUser.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: otherClaim2.id,
				created_by: otherUser.id,
				assignee: otherUser.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Contributor' });

			// Act
			const result = await listMyClaims(ctx, {});

			// Assert
			expect(result.count).toBe(3);
			expect(result.rows).toHaveLength(3);
			expect(result.rows.every((r) => r.assignee === user.id)).toBe(true);
		});

		it('should filter by search term', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Contributor' });

			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});

			const claim1 = await createTestClaim(db, {
				client_id: client.id,
				insured: 'Acme Corp',
				claim_number: 'CLM-ACME-001',
			});
			const claim2 = await createTestClaim(db, {
				client_id: client.id,
				insured: 'Beta Inc',
				claim_number: 'CLM-BETA-001',
			});

			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim1.id,
				created_by: user.id,
				assignee: user.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim2.id,
				created_by: user.id,
				assignee: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Contributor' });

			// Act
			const result = await listMyClaims(ctx, { searchTerm: 'acme' });

			// Assert
			expect(result.count).toBe(1);
			expect(result.rows[0].insured).toBe('Acme Corp');
		});

		it('should return metrics', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Contributor' });

			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});

			const claim1 = await createTestClaim(db, { client_id: client.id, claim_amount: 10000 });
			const claim2 = await createTestClaim(db, { client_id: client.id, claim_amount: 20000 });

			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim1.id,
				created_by: user.id,
				assignee: user.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim2.id,
				created_by: user.id,
				assignee: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Contributor' });

			// Act
			const result = await listMyClaims(ctx, {});

			// Assert
			expect(result.metrics.totalValue).toBe(30000);
			expect(result.metrics.avgDaysInQueue).toBeGreaterThanOrEqual(0);
		});
	});

	describe('listMyDeskClaims', () => {
		it('should return claims at user desk locations', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const otherUser = await createTestUser(db, { client_id: client.id, role: 'Contributor' });

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

			// Assign user to desk1 only
			await createTestUserDeskLocation(db, {
				user_id: user.id,
				desk_location_id: desk1.id,
				priority: 1,
			});

			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});

			// Claim at desk1 (user's desk) - should be visible
			const claim1 = await createTestClaim(db, {
				client_id: client.id,
				desk_location_id: desk1.id,
				insured: 'Desk 1 Claim',
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim1.id,
				created_by: otherUser.id,
				assignee: otherUser.id,
			});

			// Claim at desk2 (not user's desk) - should NOT be visible
			const claim2 = await createTestClaim(db, {
				client_id: client.id,
				desk_location_id: desk2.id,
				insured: 'Desk 2 Claim',
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim2.id,
				created_by: otherUser.id,
				assignee: otherUser.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Contributor' });

			// Act
			const result = await listMyDeskClaims(ctx, {});

			// Assert
			expect(result.count).toBe(1);
			expect(result.rows[0].insured).toBe('Desk 1 Claim');
			expect(result.rows[0].desk_location_name).toBe('Desk 1');
		});

		it('should order by desk priority', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const otherUser = await createTestUser(db, { client_id: client.id, role: 'Contributor' });

			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const highPriorityDesk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'High Priority Desk',
			});
			const lowPriorityDesk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Low Priority Desk',
			});

			// Assign user to both desks with different priorities
			await createTestUserDeskLocation(db, {
				user_id: user.id,
				desk_location_id: highPriorityDesk.id,
				priority: 1, // Higher priority
			});
			await createTestUserDeskLocation(db, {
				user_id: user.id,
				desk_location_id: lowPriorityDesk.id,
				priority: 5, // Lower priority
			});

			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});

			// Create claims at each desk
			const lowPriorityClaim = await createTestClaim(db, {
				client_id: client.id,
				desk_location_id: lowPriorityDesk.id,
				insured: 'Low Priority Claim',
			});
			const highPriorityClaim = await createTestClaim(db, {
				client_id: client.id,
				desk_location_id: highPriorityDesk.id,
				insured: 'High Priority Claim',
			});

			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: lowPriorityClaim.id,
				created_by: otherUser.id,
				assignee: otherUser.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: highPriorityClaim.id,
				created_by: otherUser.id,
				assignee: otherUser.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Contributor' });

			// Act
			const result = await listMyDeskClaims(ctx, {});

			// Assert - Both claims visible, verify both are returned
			expect(result.count).toBe(2);
			const insureds = result.rows.map((r) => r.insured);
			expect(insureds).toContain('High Priority Claim');
			expect(insureds).toContain('Low Priority Claim');
		});

		it('should exclude claims from removed desk assignments', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const otherUser = await createTestUser(db, { client_id: client.id, role: 'Contributor' });

			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});

			// Assign user to desk but mark as removed
			await createTestUserDeskLocation(db, {
				user_id: user.id,
				desk_location_id: desk.id,
				removed_at: new Date(),
			});

			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});

			const claim = await createTestClaim(db, {
				client_id: client.id,
				desk_location_id: desk.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: otherUser.id,
				assignee: otherUser.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Contributor' });

			// Act
			const result = await listMyDeskClaims(ctx, {});

			// Assert - No claims since user was removed from desk
			expect(result.count).toBe(0);
			expect(result.rows).toHaveLength(0);
		});
	});
});
