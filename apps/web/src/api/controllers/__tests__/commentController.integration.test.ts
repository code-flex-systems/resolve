/**
 * Integration tests for commentController
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
	createTestPage,
	createTestPageInstance,
	createTestQuestion,
} from '@/__tests__/integration/fixtures';
import * as commentController from '../commentController';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

/**
 * Create a test comment directly in the database
 */
async function createTestComment(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		checklist_id: string;
		claim_id: string;
		created_by: string;
		body?: string;
		instance_id?: string | null;
		question_id?: string | null;
	}
) {
	const data = {
		client_id: overrides.client_id,
		checklist_id: overrides.checklist_id,
		claim_id: overrides.claim_id,
		created_by: overrides.created_by,
		body: overrides.body || `Test comment ${Date.now()}`,
		instance_id: overrides.instance_id ?? null,
		question_id: overrides.question_id ?? null,
	};

	return db.insertInto('comment').values(data).returningAll().executeTakeFirstOrThrow();
}

describe('commentController integration tests', () => {
	let db: Kysely<DB>;

	beforeEach(() => {
		db = getTestDb();
	});

	// =========================================================================
	// getCommentsForPage - Transforms array to question_id keyed map
	// =========================================================================

	describe('getCommentsForPage', () => {
		async function setupTestFixtures() {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
			});
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: user.id,
			});
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const pageInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id });

			return { client, user, checklist, claim, page, pageInstance, ctx };
		}

		describe('basic functionality', () => {
			it('should return empty object when no comments exist', async () => {
				const { checklist, claim, pageInstance, ctx } = await setupTestFixtures();

				const result = await commentController.getCommentsForPage(ctx, {
					checklistId: checklist.id,
					claimId: claim.id,
					instanceId: pageInstance.id,
				});

				expect(result).toEqual({});
			});

			it('should return comments keyed by question_id', async () => {
				const { client, user, checklist, claim, page, pageInstance, ctx } =
					await setupTestFixtures();
				const question = await createTestQuestion(db, {
					client_id: client.id,
					page_id: page.id,
					created_by: user.id,
				});

				await createTestComment(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					claim_id: claim.id,
					created_by: user.id,
					body: 'Test comment',
					instance_id: pageInstance.id,
					question_id: question.id,
				});

				const result = await commentController.getCommentsForPage(ctx, {
					checklistId: checklist.id,
					claimId: claim.id,
					instanceId: pageInstance.id,
				});

				expect(result).toHaveProperty(String(question.id));
				expect(result[question.id].body).toBe('Test comment');
			});

			it('should return multiple comments keyed by different question_ids', async () => {
				const { client, user, checklist, claim, page, pageInstance, ctx } =
					await setupTestFixtures();
				const question1 = await createTestQuestion(db, {
					client_id: client.id,
					page_id: page.id,
					created_by: user.id,
					text: 'Question 1',
				});
				const question2 = await createTestQuestion(db, {
					client_id: client.id,
					page_id: page.id,
					created_by: user.id,
					text: 'Question 2',
				});

				await createTestComment(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					claim_id: claim.id,
					created_by: user.id,
					body: 'Comment on Q1',
					instance_id: pageInstance.id,
					question_id: question1.id,
				});
				await createTestComment(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					claim_id: claim.id,
					created_by: user.id,
					body: 'Comment on Q2',
					instance_id: pageInstance.id,
					question_id: question2.id,
				});

				const result = await commentController.getCommentsForPage(ctx, {
					checklistId: checklist.id,
					claimId: claim.id,
					instanceId: pageInstance.id,
				});

				expect(Object.keys(result)).toHaveLength(2);
				expect(result[question1.id].body).toBe('Comment on Q1');
				expect(result[question2.id].body).toBe('Comment on Q2');
			});
		});

		describe('result structure', () => {
			it('should include comment properties in the result', async () => {
				const { client, user, checklist, claim, page, pageInstance, ctx } =
					await setupTestFixtures();
				const question = await createTestQuestion(db, {
					client_id: client.id,
					page_id: page.id,
					created_by: user.id,
				});

				await createTestComment(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					claim_id: claim.id,
					created_by: user.id,
					body: 'Detailed comment',
					instance_id: pageInstance.id,
					question_id: question.id,
				});

				const result = await commentController.getCommentsForPage(ctx, {
					checklistId: checklist.id,
					claimId: claim.id,
					instanceId: pageInstance.id,
				});

				const comment = result[question.id];
				expect(comment).toHaveProperty('id');
				expect(comment).toHaveProperty('body', 'Detailed comment');
				expect(comment).toHaveProperty('question_id', question.id);
				expect(comment).toHaveProperty('created_by');
			});
		});

		describe('filtering by instanceId', () => {
			it('should only return comments for the specified instance', async () => {
				const { client, user, checklist, claim, page, pageInstance, ctx } =
					await setupTestFixtures();
				const pageInstance2 = await createTestPageInstance(db, {
					client_id: client.id,
					page_id: page.id,
					checklist_id: checklist.id,
					created_by: user.id,
				});
				const question = await createTestQuestion(db, {
					client_id: client.id,
					page_id: page.id,
					created_by: user.id,
				});

				// Comment on instance 1
				await createTestComment(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					claim_id: claim.id,
					created_by: user.id,
					body: 'Comment for instance 1',
					instance_id: pageInstance.id,
					question_id: question.id,
				});

				// Comment on instance 2
				await createTestComment(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					claim_id: claim.id,
					created_by: user.id,
					body: 'Comment for instance 2',
					instance_id: pageInstance2.id,
					question_id: question.id,
				});

				const result = await commentController.getCommentsForPage(ctx, {
					checklistId: checklist.id,
					claimId: claim.id,
					instanceId: pageInstance.id,
				});

				expect(result[question.id].body).toBe('Comment for instance 1');
			});
		});

		describe('filtering by checklistId and claimId', () => {
			it('should only return comments for the specified checklist and claim', async () => {
				const { client, user, checklist, claim, page, pageInstance, ctx } =
					await setupTestFixtures();
				const checklist2 = await createTestChecklist(db, {
					client_id: client.id,
					created_by: user.id,
				});
				const claim2 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const question = await createTestQuestion(db, {
					client_id: client.id,
					page_id: page.id,
					created_by: user.id,
				});

				// Comment for checklist 1, claim 1
				await createTestComment(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					claim_id: claim.id,
					created_by: user.id,
					body: 'Comment for CL1/Claim1',
					instance_id: pageInstance.id,
					question_id: question.id,
				});

				// Comment for different checklist
				await createTestComment(db, {
					client_id: client.id,
					checklist_id: checklist2.id,
					claim_id: claim.id,
					created_by: user.id,
					body: 'Comment for CL2/Claim1',
					instance_id: pageInstance.id,
					question_id: question.id,
				});

				// Comment for different claim
				await createTestComment(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					claim_id: claim2.id,
					created_by: user.id,
					body: 'Comment for CL1/Claim2',
					instance_id: pageInstance.id,
					question_id: question.id,
				});

				const result = await commentController.getCommentsForPage(ctx, {
					checklistId: checklist.id,
					claimId: claim.id,
					instanceId: pageInstance.id,
				});

				expect(result[question.id].body).toBe('Comment for CL1/Claim1');
			});
		});

		describe('tenant isolation', () => {
			it('should only return comments for the user client', async () => {
				const clientA = await createTestClient(db, { name: 'Client A' });
				const clientB = await createTestClient(db, { name: 'Client B' });
				const userA = await createTestUser(db, { client_id: clientA.id });
				const userB = await createTestUser(db, { client_id: clientB.id });
				const checklistA = await createTestChecklist(db, {
					client_id: clientA.id,
					created_by: userA.id,
				});
				const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
				const pageA = await createTestPage(db, { client_id: clientA.id, created_by: userA.id });
				const pageInstanceA = await createTestPageInstance(db, {
					client_id: clientA.id,
					page_id: pageA.id,
					checklist_id: checklistA.id,
					created_by: userA.id,
				});
				const questionA = await createTestQuestion(db, {
					client_id: clientA.id,
					page_id: pageA.id,
					created_by: userA.id,
				});

				await createTestComment(db, {
					client_id: clientA.id,
					checklist_id: checklistA.id,
					claim_id: claimA.id,
					created_by: userA.id,
					body: 'Client A comment',
					instance_id: pageInstanceA.id,
					question_id: questionA.id,
				});

				const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id });

				// User B trying to access Client A's comments
				const result = await commentController.getCommentsForPage(ctxB, {
					checklistId: checklistA.id,
					claimId: claimA.id,
					instanceId: pageInstanceA.id,
				});

				// Should return empty since it's not their data
				expect(result).toEqual({});
			});
		});
	});
});
