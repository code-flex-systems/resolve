/**
 * Integration tests for commentQueries
 *
 * Tests cover:
 * - createComment: Create a comment
 * - deleteComment: Delete a comment
 * - getComment: Get single comment with user info
 * - getCommentCount: Count comments with filters
 * - getComments: List comments with pagination and filters
 * - getCommentsForPage: Get comments for a specific page instance
 * - Tenant isolation on all operations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createComment,
	deleteComment,
	getComment,
	getCommentCount,
	getComments,
	getCommentsForPage,
} from '../commentQueries';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestChecklist,
	createTestChecklistClaim,
	createTestPage,
	createTestPageInstance,
} from '@/__tests__/integration/fixtures';

describe('commentQueries integration tests', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	describe('createComment', () => {
		it('should create a comment', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const question = await db
				.insertInto('question')
				.values({
					page_id: page.id,
					client_id: client.id,
					text: 'Test Question',
					type: 'multi',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const comment = await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				questionId: question.id,
				body: 'Test comment body',
			});

			expect(comment.checklist_id).toBe(checklist.id);
			expect(comment.claim_id).toBe(claim.id);
			expect(comment.instance_id).toBe(instance.id);
			expect(comment.question_id).toBe(question.id);
			expect(comment.body).toBe('Test comment body');
			expect(comment.client_id).toBe(client.id);
			expect(comment.created_by).toBe(user.id);
		});

		it('should create a comment without question_id', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const comment = await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				body: 'Page-level comment',
			});

			expect(comment.question_id).toBeNull();
			expect(comment.body).toBe('Page-level comment');
		});
	});

	describe('deleteComment', () => {
		it('should delete a comment', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const comment = await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				body: 'To be deleted',
			});

			const deleted = await deleteComment(ctx, comment.id);
			expect(deleted.id).toBe(comment.id);

			// Verify it's gone
			const remaining = await db
				.selectFrom('comment')
				.selectAll()
				.where('id', '=', comment.id)
				.executeTakeFirst();
			expect(remaining).toBeUndefined();
		});

		it('should not delete comment from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
			const checklistB = await createTestChecklist(db, { client_id: clientB.id, created_by: userB.id });
			const pageB = await createTestPage(db, { client_id: clientB.id, created_by: userB.id });
			const instanceB = await createTestPageInstance(db, {
				client_id: clientB.id,
				created_by: userB.id,
				checklist_id: checklistB.id,
				page_id: pageB.id,
			});
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			// Create comment for client B
			const commentB = await db
				.insertInto('comment')
				.values({
					checklist_id: checklistB.id,
					claim_id: claimB.id,
					instance_id: instanceB.id,
					body: 'Client B comment',
					client_id: clientB.id,
					created_by: userB.id,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			// Client A should not be able to delete it
			await expect(deleteComment(ctxA, commentB.id)).rejects.toThrow();

			// Verify it still exists
			const stillExists = await db
				.selectFrom('comment')
				.selectAll()
				.where('id', '=', commentB.id)
				.executeTakeFirst();
			expect(stillExists).toBeTruthy();
		});

		it('should throw when deleting non-existent comment', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await expect(deleteComment(ctx, '00000000-0000-0000-0000-000000000000')).rejects.toThrow();
		});
	});

	describe('getComment', () => {
		it('should return comment with user info', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const created = await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				body: 'Test comment',
			});

			const comment = await getComment(ctx, created.id);

			expect(comment.id).toBe(created.id);
			expect(comment.body).toBe('Test comment');
			expect(comment.first).toBe(user.first);
			expect(comment.last).toBe(user.last);
			expect(comment.email).toBe(user.email);
		});

		it('should not return comment from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
			const checklistB = await createTestChecklist(db, { client_id: clientB.id, created_by: userB.id });
			const pageB = await createTestPage(db, { client_id: clientB.id, created_by: userB.id });
			const instanceB = await createTestPageInstance(db, {
				client_id: clientB.id,
				created_by: userB.id,
				checklist_id: checklistB.id,
				page_id: pageB.id,
			});
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			// Create comment for client B
			const commentB = await db
				.insertInto('comment')
				.values({
					checklist_id: checklistB.id,
					claim_id: claimB.id,
					instance_id: instanceB.id,
					body: 'Client B comment',
					client_id: clientB.id,
					created_by: userB.id,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			// Client A should not be able to get it
			await expect(getComment(ctxA, commentB.id)).rejects.toThrow();
		});

		it('should throw when comment does not exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await expect(getComment(ctx, '00000000-0000-0000-0000-000000000000')).rejects.toThrow();
		});
	});

	describe('getCommentCount', () => {
		it('should count all comments when no filters', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				body: 'Comment 1',
			});
			await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				body: 'Comment 2',
			});

			const count = await getCommentCount(ctx, {});
			expect(count).toBeGreaterThanOrEqual(2);
		});

		it('should filter by checklistId', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist1 = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const checklist2 = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance1 = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist1.id,
				page_id: page.id,
			});
			const instance2 = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist2.id,
				page_id: page.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await createComment(ctx, {
				checklistId: checklist1.id,
				claimId: claim.id,
				instanceId: instance1.id,
				body: 'Comment 1',
			});
			await createComment(ctx, {
				checklistId: checklist2.id,
				claimId: claim.id,
				instanceId: instance2.id,
				body: 'Comment 2',
			});

			const count = await getCommentCount(ctx, { checklistId: checklist1.id });
			expect(count).toBe(1);
		});

		it('should filter by claimId', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim1 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const claim2 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim1.id,
				instanceId: instance.id,
				body: 'Comment 1',
			});
			await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim2.id,
				instanceId: instance.id,
				body: 'Comment 2',
			});

			const count = await getCommentCount(ctx, { claimId: claim1.id });
			expect(count).toBe(1);
		});

		it('should filter by instanceId', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance1 = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const instance2 = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance1.id,
				body: 'Comment 1',
			});
			await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance2.id,
				body: 'Comment 2',
			});

			const count = await getCommentCount(ctx, { instanceId: instance1.id });
			expect(count).toBe(1);
		});

		it('should filter by questionId', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const question1 = await db
				.insertInto('question')
				.values({
					page_id: page.id,
					client_id: client.id,
					text: 'Question 1',
					type: 'freeform',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const question2 = await db
				.insertInto('question')
				.values({
					page_id: page.id,
					client_id: client.id,
					text: 'Question 2',
					type: 'freeform',
					position: 1,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				questionId: question1.id,
				body: 'Comment on Q1',
			});
			await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				questionId: question2.id,
				body: 'Comment on Q2',
			});

			const count = await getCommentCount(ctx, { questionId: question1.id });
			expect(count).toBe(1);
		});

		it('should filter by checklist, claim, instance, and question together', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const question = await db
				.insertInto('question')
				.values({
					page_id: page.id,
					client_id: client.id,
					text: 'Question filter combo',
					type: 'freeform',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				questionId: question.id,
				body: 'Filtered comment',
			});
			await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				body: 'Non-matching comment',
			});

			const count = await getCommentCount(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				questionId: question.id,
			});
			expect(count).toBe(1);
		});

		it('should not count comments from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
			const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
			const checklistA = await createTestChecklist(db, { client_id: clientA.id, created_by: userA.id });
			const checklistB = await createTestChecklist(db, { client_id: clientB.id, created_by: userB.id });
			const pageA = await createTestPage(db, { client_id: clientA.id, created_by: userA.id });
			const pageB = await createTestPage(db, { client_id: clientB.id, created_by: userB.id });
			const instanceA = await createTestPageInstance(db, {
				client_id: clientA.id,
				created_by: userA.id,
				checklist_id: checklistA.id,
				page_id: pageA.id,
			});
			const instanceB = await createTestPageInstance(db, {
				client_id: clientB.id,
				created_by: userB.id,
				checklist_id: checklistB.id,
				page_id: pageB.id,
			});
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			await createComment(ctxA, {
				checklistId: checklistA.id,
				claimId: claimA.id,
				instanceId: instanceA.id,
				body: 'Client A comment',
			});

			// Create comment for client B directly
			await db
				.insertInto('comment')
				.values({
					checklist_id: checklistB.id,
					claim_id: claimB.id,
					instance_id: instanceB.id,
					body: 'Client B comment',
					client_id: clientB.id,
					created_by: userB.id,
				})
				.execute();

			const countA = await getCommentCount(ctxA, {});
			// Should only count client A's comments
			expect(countA).toBeGreaterThanOrEqual(1);
		});
	});

	describe('getComments', () => {
		it('should return comments with pagination', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			// Create multiple comments
			for (let i = 0; i < 5; i++) {
				await createComment(ctx, {
					checklistId: checklist.id,
					claimId: claim.id,
					instanceId: instance.id,
					body: `Comment ${i}`,
				});
			}

			const result = await getComments(ctx, { checklistId: checklist.id }, 2, 0);
			expect(result.rows).toHaveLength(2);
			expect(result.count).toBe(5);
		});

		it('should return comments with user info', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				body: 'Test comment',
			});

			const result = await getComments(ctx, { checklistId: checklist.id });
			expect(result.rows[0].first).toBe(user.first);
			expect(result.rows[0].last).toBe(user.last);
			expect(result.rows[0].email).toBe(user.email);
			expect(result.count).toBe(0);
		});

		it('should filter by multiple criteria', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const question = await db
				.insertInto('question')
				.values({
					page_id: page.id,
					client_id: client.id,
					text: 'Test Question',
					type: 'multi',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				questionId: question.id,
				body: 'Matching comment',
			});
			await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				body: 'No question',
			});

			const result = await getComments(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				questionId: question.id,
			});

			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].body).toBe('Matching comment');
		});

		it('should filter by user ownership on checklist claims', async () => {
			const client = await createTestClient(db);
			const owner = await createTestUser(db, { client_id: client.id });
			const assignee = await createTestUser(db, { client_id: client.id });
			const other = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: owner.id });
			const otherClaim = await createTestClaim(db, { client_id: client.id, created_by: other.id });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: owner.id });
			const otherChecklist = await createTestChecklist(db, { client_id: client.id, created_by: other.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: owner.id });
			const otherPage = await createTestPage(db, { client_id: client.id, created_by: other.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: owner.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const otherInstance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: other.id,
				checklist_id: otherChecklist.id,
				page_id: otherPage.id,
			});
			const ctx = createTestContext(db, {
				id: owner.id,
				client_id: client.id,
				email: owner.email,
				role: 'user',
			});

			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: owner.id,
				assignee: assignee.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: otherChecklist.id,
				claim_id: otherClaim.id,
				created_by: other.id,
				assignee: other.id,
			});

			await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				body: 'Owned by owner',
			});
			await createComment(ctx, {
				checklistId: otherChecklist.id,
				claimId: otherClaim.id,
				instanceId: otherInstance.id,
				body: 'Owned by someone else',
			});

			const ownerResult = await getComments(ctx, { userId: owner.id });
			expect(ownerResult.rows).toHaveLength(1);
			expect(ownerResult.rows[0].body).toBe('Owned by owner');

			const assigneeResult = await getComments(ctx, { userId: assignee.id });
			expect(assigneeResult.rows).toHaveLength(1);
			expect(assigneeResult.rows[0].body).toBe('Owned by owner');
		});

		it('should not return comments from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
			const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
			const checklistA = await createTestChecklist(db, { client_id: clientA.id, created_by: userA.id });
			const checklistB = await createTestChecklist(db, { client_id: clientB.id, created_by: userB.id });
			const pageA = await createTestPage(db, { client_id: clientA.id, created_by: userA.id });
			const pageB = await createTestPage(db, { client_id: clientB.id, created_by: userB.id });
			const instanceA = await createTestPageInstance(db, {
				client_id: clientA.id,
				created_by: userA.id,
				checklist_id: checklistA.id,
				page_id: pageA.id,
			});
			const instanceB = await createTestPageInstance(db, {
				client_id: clientB.id,
				created_by: userB.id,
				checklist_id: checklistB.id,
				page_id: pageB.id,
			});
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			await createComment(ctxA, {
				checklistId: checklistA.id,
				claimId: claimA.id,
				instanceId: instanceA.id,
				body: 'Client A comment',
			});

			// Create comment for client B
			await db
				.insertInto('comment')
				.values({
					checklist_id: checklistB.id,
					claim_id: claimB.id,
					instance_id: instanceB.id,
					body: 'Client B comment',
					client_id: clientB.id,
					created_by: userB.id,
				})
				.execute();

			const result = await getComments(ctxA, { checklistId: checklistA.id });
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].body).toBe('Client A comment');
		});
	});

	describe('getCommentsForPage', () => {
		it('should return comments for a specific page instance', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const question = await db
				.insertInto('question')
				.values({
					page_id: page.id,
					client_id: client.id,
					text: 'Test Question',
					type: 'multi',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			// Create comments with question_id (should be returned)
			await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				questionId: question.id,
				body: 'Question comment 1',
			});
			await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				questionId: question.id,
				body: 'Question comment 2',
			});

			// Create comment without question_id (should NOT be returned)
			await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				body: 'Page comment',
			});

			const comments = await getCommentsForPage(ctx, checklist.id, claim.id, instance.id);

			expect(comments).toHaveLength(2);
			expect(comments.every((c) => c.question_id !== null)).toBe(true);
		});

		it('should include user info', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const question = await db
				.insertInto('question')
				.values({
					page_id: page.id,
					client_id: client.id,
					text: 'Test Question',
					type: 'multi',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await createComment(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				instanceId: instance.id,
				questionId: question.id,
				body: 'Test comment',
			});

			const comments = await getCommentsForPage(ctx, checklist.id, claim.id, instance.id);

			expect(comments[0].first).toBe(user.first);
			expect(comments[0].last).toBe(user.last);
			expect(comments[0].email).toBe(user.email);
		});

		it('should not return comments from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
			const checklistB = await createTestChecklist(db, { client_id: clientB.id, created_by: userB.id });
			const pageB = await createTestPage(db, { client_id: clientB.id, created_by: userB.id });
			const instanceB = await createTestPageInstance(db, {
				client_id: clientB.id,
				created_by: userB.id,
				checklist_id: checklistB.id,
				page_id: pageB.id,
			});
			const questionB = await db
				.insertInto('question')
				.values({
					page_id: pageB.id,
					client_id: clientB.id,
					text: 'Test Question B',
					type: 'multi',
					position: 0,
					created_by: userB.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			// Create comment for client B
			await db
				.insertInto('comment')
				.values({
					checklist_id: checklistB.id,
					claim_id: claimB.id,
					instance_id: instanceB.id,
					question_id: questionB.id,
					body: 'Client B comment',
					client_id: clientB.id,
					created_by: userB.id,
				})
				.execute();

			const comments = await getCommentsForPage(ctxA, checklistB.id, claimB.id, instanceB.id);
			expect(comments).toHaveLength(0);
		});
	});
});
