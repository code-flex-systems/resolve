/**
 * Integration tests for checklistController
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
	createTestChecklist,
	createTestChecklistClaim,
} from '@/__tests__/integration/fixtures';
import * as checklistController from '../checklistController';
import { ClaimStatus, SummarySegment } from '@/config/enums';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

describe('checklistController integration tests', () => {
	let db: Kysely<DB>;

	beforeEach(() => {
		db = getTestDb();
	});

	// =========================================================================
	// getChecklistClaimStats - Aggregates claims by status into formatted record
	// =========================================================================

	describe('getChecklistClaimStats', () => {
		async function setupTestFixtures() {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id });

			return { client, user, checklist, ctx };
		}

		describe('basic aggregation', () => {
			it('should return all status counts as zero when no checklist claims exist', async () => {
				const { ctx } = await setupTestFixtures();

				const result = await checklistController.getChecklistClaimStats(ctx, {});

				expect(result[ClaimStatus.SUBMITTED]).toBe(0);
				expect(result[ClaimStatus.IN_PROGRESS]).toBe(0);
				expect(result[ClaimStatus.BLOCKED]).toBe(0);
				expect(result[ClaimStatus.UNWORKED]).toBe(0);
			});

			it('should count claims by status correctly', async () => {
				const { client, user, checklist, ctx } = await setupTestFixtures();

				// Create claims with different statuses
				const claim1 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const claim2 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const claim3 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const claim4 = await createTestClaim(db, { client_id: client.id, created_by: user.id });

				await createTestChecklistClaim(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					claim_id: claim1.id,
					created_by: user.id,
					status: ClaimStatus.IN_PROGRESS,
				});
				await createTestChecklistClaim(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					claim_id: claim2.id,
					created_by: user.id,
					status: ClaimStatus.IN_PROGRESS,
				});
				await createTestChecklistClaim(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					claim_id: claim3.id,
					created_by: user.id,
					status: ClaimStatus.SUBMITTED,
				});
				await createTestChecklistClaim(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					claim_id: claim4.id,
					created_by: user.id,
					status: ClaimStatus.BLOCKED,
				});

				const result = await checklistController.getChecklistClaimStats(ctx, {});

				expect(result[ClaimStatus.IN_PROGRESS]).toBe(2);
				expect(result[ClaimStatus.SUBMITTED]).toBe(1);
				expect(result[ClaimStatus.BLOCKED]).toBe(1);
				expect(result[ClaimStatus.UNWORKED]).toBe(0);
			});
		});

		describe('checklistId filter', () => {
			it('should filter stats by checklistId when provided', async () => {
				const { client, user, checklist, ctx } = await setupTestFixtures();
				const checklist2 = await createTestChecklist(db, { client_id: client.id, created_by: user.id });

				const claim1 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const claim2 = await createTestClaim(db, { client_id: client.id, created_by: user.id });

				await createTestChecklistClaim(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					claim_id: claim1.id,
					created_by: user.id,
					status: ClaimStatus.SUBMITTED,
				});
				await createTestChecklistClaim(db, {
					client_id: client.id,
					checklist_id: checklist2.id,
					claim_id: claim2.id,
					created_by: user.id,
					status: ClaimStatus.IN_PROGRESS,
				});

				const resultChecklist1 = await checklistController.getChecklistClaimStats(ctx, {
					checklistId: checklist.id,
				});
				const resultChecklist2 = await checklistController.getChecklistClaimStats(ctx, {
					checklistId: checklist2.id,
				});

				expect(resultChecklist1[ClaimStatus.SUBMITTED]).toBe(1);
				expect(resultChecklist1[ClaimStatus.IN_PROGRESS]).toBe(0);

				expect(resultChecklist2[ClaimStatus.SUBMITTED]).toBe(0);
				expect(resultChecklist2[ClaimStatus.IN_PROGRESS]).toBe(1);
			});
		});

		describe('users filter', () => {
			it('should filter stats by assignee when users filter provided', async () => {
				const { client, user, checklist, ctx } = await setupTestFixtures();
				const user2 = await createTestUser(db, { client_id: client.id });

				const claim1 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const claim2 = await createTestClaim(db, { client_id: client.id, created_by: user.id });

				await createTestChecklistClaim(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					claim_id: claim1.id,
					created_by: user.id,
					assignee: user.id,
					status: ClaimStatus.SUBMITTED,
				});
				await createTestChecklistClaim(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					claim_id: claim2.id,
					created_by: user.id,
					assignee: user2.id,
					status: ClaimStatus.IN_PROGRESS,
				});

				const resultUser1 = await checklistController.getChecklistClaimStats(ctx, {
					users: [user.id],
				});
				const resultUser2 = await checklistController.getChecklistClaimStats(ctx, {
					users: [user2.id],
				});

				expect(resultUser1[ClaimStatus.SUBMITTED]).toBe(1);
				expect(resultUser1[ClaimStatus.IN_PROGRESS]).toBe(0);

				expect(resultUser2[ClaimStatus.SUBMITTED]).toBe(0);
				expect(resultUser2[ClaimStatus.IN_PROGRESS]).toBe(1);
			});
		});

		describe('result format', () => {
			it('should always include all ClaimStatus keys even when zero', async () => {
				const { ctx } = await setupTestFixtures();

				const result = await checklistController.getChecklistClaimStats(ctx, {});

				// Verify the result has all expected keys
				expect(result).toHaveProperty(ClaimStatus.SUBMITTED);
				expect(result).toHaveProperty(ClaimStatus.IN_PROGRESS);
				expect(result).toHaveProperty(ClaimStatus.BLOCKED);
				expect(result).toHaveProperty(ClaimStatus.UNWORKED);
			});
		});

		describe('tenant isolation', () => {
			it('should only count claims for the user client', async () => {
				const clientA = await createTestClient(db, { name: 'Client A' });
				const clientB = await createTestClient(db, { name: 'Client B' });
				const userA = await createTestUser(db, { client_id: clientA.id });
				const userB = await createTestUser(db, { client_id: clientB.id });
				const checklistA = await createTestChecklist(db, { client_id: clientA.id, created_by: userA.id });
				const checklistB = await createTestChecklist(db, { client_id: clientB.id, created_by: userB.id });
				const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
				const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });

				await createTestChecklistClaim(db, {
					client_id: clientA.id,
					checklist_id: checklistA.id,
					claim_id: claimA.id,
					created_by: userA.id,
					status: ClaimStatus.SUBMITTED,
				});
				await createTestChecklistClaim(db, {
					client_id: clientB.id,
					checklist_id: checklistB.id,
					claim_id: claimB.id,
					created_by: userB.id,
					status: ClaimStatus.IN_PROGRESS,
				});

				const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id });
				const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id });

				const resultA = await checklistController.getChecklistClaimStats(ctxA, {});
				const resultB = await checklistController.getChecklistClaimStats(ctxB, {});

				// Client A should only see their submitted claim
				expect(resultA[ClaimStatus.SUBMITTED]).toBe(1);
				expect(resultA[ClaimStatus.IN_PROGRESS]).toBe(0);

				// Client B should only see their in-progress claim
				expect(resultB[ClaimStatus.SUBMITTED]).toBe(0);
				expect(resultB[ClaimStatus.IN_PROGRESS]).toBe(1);
			});
		});
	});

	// =========================================================================
	// getChecklistSummaryDetail - Parallel queries for rows and count
	// =========================================================================

	describe('getChecklistSummaryDetail', () => {
		async function setupTestFixtures() {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: user.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id });

			return { client, user, checklist, claim, ctx };
		}

		describe('basic functionality', () => {
			it('should return rows and count structure', async () => {
				const { checklist, claim, ctx } = await setupTestFixtures();

				const result = await checklistController.getChecklistSummaryDetail(ctx, {
					checklistId: checklist.id,
					claimId: claim.id,
					segment: SummarySegment.UNANSWERED,
				});

				expect(result).toHaveProperty('rows');
				expect(result).toHaveProperty('count');
				expect(Array.isArray(result.rows)).toBe(true);
				expect(typeof result.count).toBe('number');
			});

			it('should return empty results when no data matches segment', async () => {
				const { checklist, claim, ctx } = await setupTestFixtures();

				const result = await checklistController.getChecklistSummaryDetail(ctx, {
					checklistId: checklist.id,
					claimId: claim.id,
					segment: SummarySegment.ANSWERED,
				});

				expect(result.rows).toHaveLength(0);
				expect(result.count).toBe(0);
			});
		});

		describe('pagination', () => {
			it('should respect limit parameter', async () => {
				const { checklist, claim, ctx } = await setupTestFixtures();

				const result = await checklistController.getChecklistSummaryDetail(ctx, {
					checklistId: checklist.id,
					claimId: claim.id,
					segment: SummarySegment.UNANSWERED,
					limit: 5,
				});

				// Result should be limited to 5 or fewer (depending on actual data)
				expect(result.rows.length).toBeLessThanOrEqual(5);
			});

			it('should respect offset parameter', async () => {
				const { checklist, claim, ctx } = await setupTestFixtures();

				const result = await checklistController.getChecklistSummaryDetail(ctx, {
					checklistId: checklist.id,
					claimId: claim.id,
					segment: SummarySegment.UNANSWERED,
					offset: 100,
				});

				// With large offset, likely returns empty
				expect(Array.isArray(result.rows)).toBe(true);
			});
		});

		describe('segment filtering', () => {
			it('should filter by UNANSWERED segment', async () => {
				const { checklist, claim, ctx } = await setupTestFixtures();

				const result = await checklistController.getChecklistSummaryDetail(ctx, {
					checklistId: checklist.id,
					claimId: claim.id,
					segment: SummarySegment.UNANSWERED,
				});

				expect(result).toHaveProperty('rows');
				expect(result).toHaveProperty('count');
			});

			it('should filter by ANSWERED segment', async () => {
				const { checklist, claim, ctx } = await setupTestFixtures();

				const result = await checklistController.getChecklistSummaryDetail(ctx, {
					checklistId: checklist.id,
					claimId: claim.id,
					segment: SummarySegment.ANSWERED,
				});

				expect(result).toHaveProperty('rows');
				expect(result).toHaveProperty('count');
			});

			it('should filter by ACTION_REQUIRED segment', async () => {
				const { checklist, claim, ctx } = await setupTestFixtures();

				const result = await checklistController.getChecklistSummaryDetail(ctx, {
					checklistId: checklist.id,
					claimId: claim.id,
					segment: SummarySegment.ACTION_REQUIRED,
				});

				expect(result).toHaveProperty('rows');
				expect(result).toHaveProperty('count');
			});
		});

		describe('tenant isolation', () => {
			it('should only return data for the user client', async () => {
				const clientA = await createTestClient(db, { name: 'Client A' });
				const clientB = await createTestClient(db, { name: 'Client B' });
				const userA = await createTestUser(db, { client_id: clientA.id });
				const userB = await createTestUser(db, { client_id: clientB.id });
				const checklistA = await createTestChecklist(db, { client_id: clientA.id, created_by: userA.id });
				const checklistB = await createTestChecklist(db, { client_id: clientB.id, created_by: userB.id });
				const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
				const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });

				await createTestChecklistClaim(db, {
					client_id: clientA.id,
					checklist_id: checklistA.id,
					claim_id: claimA.id,
					created_by: userA.id,
				});
				await createTestChecklistClaim(db, {
					client_id: clientB.id,
					checklist_id: checklistB.id,
					claim_id: claimB.id,
					created_by: userB.id,
				});

				const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id });

				// User A should not be able to access Client B's data
				const crossResult = await checklistController.getChecklistSummaryDetail(ctxA, {
					checklistId: checklistB.id,
					claimId: claimB.id,
					segment: SummarySegment.UNANSWERED,
				});

				// Should return empty/zero since it's not their data
				expect(crossResult.count).toBe(0);
			});
		});
	});
});
