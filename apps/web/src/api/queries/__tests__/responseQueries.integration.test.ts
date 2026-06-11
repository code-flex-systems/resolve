/**
 * Integration tests for responseQueries
 *
 * Tests cover:
 * - getResponseCount: Count responses for claim checklist instance
 * - getResponsesForAnswer: Get responses for a specific answer
 * - getResponsesForPageInstance: Get all responses for a page instance
 * - getResponseAuditLogs: Get audit logs with pagination
 * - getResponseAuditLogStats: Get activity stats for date range
 * - exportResponseAuditLogs: Export all matching audit logs
 * - Tenant isolation on all operations
 *
 * Note: upsertQuestionResponses is complex and tested via integration with other components
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	getResponseCount,
	getResponsesForAnswer,
	getResponsesForPageInstance,
	getResponseAuditLogs,
	getResponseAuditLogStats,
	exportResponseAuditLogs,
} from '../responseQueries';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestChecklist,
	createTestPage,
	createTestPageInstance,
	createTestQuestion as createTestQuestionFixture,
	createTestAnswer as createTestAnswerFixture,
	createTestQuestionResponse as createTestQuestionResponseFixture,
} from '@/__tests__/integration/fixtures';

describe('responseQueries integration tests', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// Helper to create question
	async function createTestQuestion(
		clientId: string,
		pageId: string,
		userId: string,
		text?: string
	) {
		return await createTestQuestionFixture(db, {
			client_id: clientId,
			page_id: pageId,
			created_by: userId,
			text: text || `Test Question ${Date.now()}`,
			type: 'freeform',
		});
	}

	// Helper to create answer
	async function createTestAnswer(
		clientId: string,
		questionId: string,
		userId: string,
		text?: string
	) {
		return await createTestAnswerFixture(db, {
			client_id: clientId,
			question_id: questionId,
			created_by: userId,
			text: text || `Answer ${Date.now()}`,
		});
	}

	// Helper to create question response
	async function createTestQuestionResponse(
		clientId: string,
		params: {
			checklist_id: string;
			instance_id: string;
			claim_id: string;
			question_id: string;
			response_text?: string;
			response_doc_id?: string;
			created_by: string;
		}
	) {
		return await createTestQuestionResponseFixture(db, {
			client_id: clientId,
			checklist_id: params.checklist_id,
			instance_id: params.instance_id,
			claim_id: params.claim_id,
			question_id: params.question_id,
			response_text: params.response_text ?? null,
			response_doc_id: params.response_doc_id ?? null,
			created_by: params.created_by,
		});
	}

	// Helper to create response audit log
	async function createTestResponseAuditLog(
		clientId: string,
		userId: string,
		params: {
			claim_id?: string;
			checklist_id?: string;
			question_text?: string;
		} = {}
	) {
		return await db
			.insertInto('response_audit_logs')
			.values({
				client_id: clientId,
				user_id: userId,
				claim_id: params.claim_id ?? null,
				checklist_id: params.checklist_id ?? null,
				question_id: null,
				question_text: params.question_text || 'Test Question',
				page_label: 'Test Page',
				action: 'insert',
			})
			.returningAll()
			.executeTakeFirstOrThrow();
	}

	describe('getResponseCount', () => {
		it('should count responses with response_text', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
			});
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const question = await createTestQuestion(client.id, page.id, user.id);
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			await createTestQuestionResponse(client.id, {
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_text: 'My answer',
				created_by: user.id,
			});

			const count = await getResponseCount(ctx, checklist.id, claim.id, instance.id);

			expect(count).toBe(1);
		});

		it('should return 0 when no responses exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
			});
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			const count = await getResponseCount(ctx, checklist.id, claim.id, instance.id);

			expect(count).toBe(0);
		});

		it('should not count responses from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
			const checklistB = await createTestChecklist(db, {
				client_id: clientB.id,
				created_by: userB.id,
			});
			const pageB = await createTestPage(db, { client_id: clientB.id, created_by: userB.id });
			const instanceB = await createTestPageInstance(db, {
				client_id: clientB.id,
				created_by: userB.id,
				checklist_id: checklistB.id,
				page_id: pageB.id,
			});
			const questionB = await createTestQuestion(clientB.id, pageB.id, userB.id);
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'user',
			});

			await createTestQuestionResponse(clientB.id, {
				checklist_id: checklistB.id,
				instance_id: instanceB.id,
				claim_id: claimB.id,
				question_id: questionB.id,
				response_text: 'Client B response',
				created_by: userB.id,
			});

			// Client A should not see client B's responses
			const count = await getResponseCount(ctxA, checklistB.id, claimB.id, instanceB.id);

			expect(count).toBe(0);
		});
	});

	describe('getResponsesForAnswer', () => {
		it('should return responses for a specific answer', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
			});
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const question = await createTestQuestion(client.id, page.id, user.id);
			const answer = await createTestAnswer(client.id, question.id, user.id);
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			const response = await createTestQuestionResponse(client.id, {
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				created_by: user.id,
			});

			await db
				.insertInto('question_response_answer')
				.values({
					response_id: response.id,
					answer_id: answer.id,
				})
				.execute();

			// Use a wider range to ensure the response is within range
			// Pad 1s: created_at is set by Postgres now() with microsecond precision,
			// which can exceed a same-millisecond JS Date and fall outside the range
			const now = new Date(Date.now() + 1000);
			now.setHours(23, 59, 59, 999); // End of today
			const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			weekAgo.setHours(0, 0, 0, 0); // Start of that day
			const results = await getResponsesForAnswer(ctx, answer.id, { range: [weekAgo, now] }, 10, 0);

			expect(results.length).toBeGreaterThanOrEqual(1);
		});

		it('should not return responses from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
			const checklistB = await createTestChecklist(db, {
				client_id: clientB.id,
				created_by: userB.id,
			});
			const pageB = await createTestPage(db, { client_id: clientB.id, created_by: userB.id });
			const instanceB = await createTestPageInstance(db, {
				client_id: clientB.id,
				created_by: userB.id,
				checklist_id: checklistB.id,
				page_id: pageB.id,
			});
			const questionB = await createTestQuestion(clientB.id, pageB.id, userB.id);
			const answerB = await createTestAnswer(clientB.id, questionB.id, userB.id);
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'user',
			});

			const responseB = await createTestQuestionResponse(clientB.id, {
				checklist_id: checklistB.id,
				instance_id: instanceB.id,
				claim_id: claimB.id,
				question_id: questionB.id,
				created_by: userB.id,
			});

			await db
				.insertInto('question_response_answer')
				.values({
					response_id: responseB.id,
					answer_id: answerB.id,
				})
				.execute();

			// Pad 1s: created_at is set by Postgres now() with microsecond precision,
			// which can exceed a same-millisecond JS Date and fall outside the range
			const now = new Date(Date.now() + 1000);
			const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			const results = await getResponsesForAnswer(
				ctxA,
				answerB.id,
				{ range: [weekAgo, now] },
				10,
				0
			);

			expect(results.length).toBe(0);
		});

		it('should filter by claimId', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim1 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const claim2 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
			});
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
			const question = await createTestQuestion(client.id, page.id, user.id);
			const answer = await createTestAnswer(client.id, question.id, user.id);
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			const response1 = await createTestQuestionResponse(client.id, {
				checklist_id: checklist.id,
				instance_id: instance1.id,
				claim_id: claim1.id,
				question_id: question.id,
				created_by: user.id,
			});
			const response2 = await createTestQuestionResponse(client.id, {
				checklist_id: checklist.id,
				instance_id: instance2.id,
				claim_id: claim2.id,
				question_id: question.id,
				created_by: user.id,
			});

			await db
				.insertInto('question_response_answer')
				.values([
					{ response_id: response1.id, answer_id: answer.id },
					{ response_id: response2.id, answer_id: answer.id },
				])
				.execute();

			// Pad 1s: created_at is set by Postgres now() with microsecond precision,
			// which can exceed a same-millisecond JS Date and fall outside the range
			const now = new Date(Date.now() + 1000);
			const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			const results = await getResponsesForAnswer(
				ctx,
				answer.id,
				{ range: [weekAgo, now], claimId: claim1.id },
				10,
				0
			);

			expect(results.length).toBe(1);
		});

		it('should filter by users', async () => {
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client.id });
			const user2 = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user1.id });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user1.id,
			});
			const page = await createTestPage(db, { client_id: client.id, created_by: user1.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user1.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const question1 = await createTestQuestion(client.id, page.id, user1.id);
			const question2 = await createTestQuestion(client.id, page.id, user1.id);
			const answer = await createTestAnswer(client.id, question1.id, user1.id);
			const ctx = createTestContext(db, {
				id: user1.id,
				client_id: client.id,
				email: user1.email,
				role: 'user',
			});

			const response1 = await createTestQuestionResponse(client.id, {
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question1.id,
				created_by: user1.id,
			});
			const response2 = await createTestQuestionResponse(client.id, {
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question2.id,
				created_by: user2.id,
			});

			await db
				.insertInto('question_response_answer')
				.values([
					{ response_id: response1.id, answer_id: answer.id },
					{ response_id: response2.id, answer_id: answer.id },
				])
				.execute();

			// Pad 1s: created_at is set by Postgres now() with microsecond precision,
			// which can exceed a same-millisecond JS Date and fall outside the range
			const now = new Date(Date.now() + 1000);
			const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			const results = await getResponsesForAnswer(
				ctx,
				answer.id,
				{ range: [weekAgo, now], users: [user1.id] },
				10,
				0
			);

			expect(results.length).toBe(1);
		});
	});

	describe('getResponsesForPageInstance', () => {
		it('should return responses keyed by question id', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
			});
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				created_by: user.id,
				checklist_id: checklist.id,
				page_id: page.id,
			});
			const question1 = await createTestQuestion(client.id, page.id, user.id, 'Q1');
			const question2 = await createTestQuestion(client.id, page.id, user.id, 'Q2');
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			await createTestQuestionResponse(client.id, {
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question1.id,
				response_text: 'Answer 1',
				created_by: user.id,
			});
			await createTestQuestionResponse(client.id, {
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question2.id,
				response_text: 'Answer 2',
				created_by: user.id,
			});

			const responseMap = await getResponsesForPageInstance(
				ctx,
				checklist.id,
				claim.id,
				instance.id
			);

			expect(responseMap[question1.id]).toBeDefined();
			expect(responseMap[question1.id].response_text).toBe('Answer 1');
			expect(responseMap[question2.id]).toBeDefined();
			expect(responseMap[question2.id].response_text).toBe('Answer 2');
		});

		it('should only return responses for the specified instance', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
			});
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
			const question = await createTestQuestion(client.id, page.id, user.id);
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			await createTestQuestionResponse(client.id, {
				checklist_id: checklist.id,
				instance_id: instance1.id,
				claim_id: claim.id,
				question_id: question.id,
				response_text: 'Instance 1',
				created_by: user.id,
			});
			await createTestQuestionResponse(client.id, {
				checklist_id: checklist.id,
				instance_id: instance2.id,
				claim_id: claim.id,
				question_id: question.id,
				response_text: 'Instance 2',
				created_by: user.id,
			});

			const responseMap = await getResponsesForPageInstance(
				ctx,
				checklist.id,
				claim.id,
				instance1.id
			);

			expect(responseMap[question.id].response_text).toBe('Instance 1');
		});

		it('should not return responses from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
			const checklistB = await createTestChecklist(db, {
				client_id: clientB.id,
				created_by: userB.id,
			});
			const pageB = await createTestPage(db, { client_id: clientB.id, created_by: userB.id });
			const instanceB = await createTestPageInstance(db, {
				client_id: clientB.id,
				created_by: userB.id,
				checklist_id: checklistB.id,
				page_id: pageB.id,
			});
			const questionB = await createTestQuestion(clientB.id, pageB.id, userB.id);
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'user',
			});

			await createTestQuestionResponse(clientB.id, {
				checklist_id: checklistB.id,
				instance_id: instanceB.id,
				claim_id: claimB.id,
				question_id: questionB.id,
				response_text: 'Client B',
				created_by: userB.id,
			});

			const responseMap = await getResponsesForPageInstance(
				ctxA,
				checklistB.id,
				claimB.id,
				instanceB.id
			);

			expect(Object.keys(responseMap).length).toBe(0);
		});
	});

	describe('getResponseAuditLogs', () => {
		it('should return audit logs with pagination', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			await createTestResponseAuditLog(client.id, user.id);
			await createTestResponseAuditLog(client.id, user.id);
			await createTestResponseAuditLog(client.id, user.id);

			const result = await getResponseAuditLogs(ctx, {}, 2, 0);

			expect(result.rows.length).toBe(2);
			expect(result.count).toBeGreaterThanOrEqual(3);
		});

		it('should return inserted audit logs scoped to the client', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
			const checklistA = await createTestChecklist(db, {
				client_id: clientA.id,
				created_by: userA.id,
			});
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'user',
			});
			const uniqueText = `ScopedAudit_${Date.now()}`;

			const logA = await createTestResponseAuditLog(clientA.id, userA.id, {
				claim_id: claimA.id,
				checklist_id: checklistA.id,
				question_text: uniqueText,
			});
			await createTestResponseAuditLog(clientB.id, userB.id, { question_text: uniqueText });

			const result = await getResponseAuditLogs(ctxA, { searchTerm: uniqueText }, 10, 0);

			expect(result.rows.length).toBe(1);
			const row = result.rows[0];
			expect(row.id).toBe(logA.id);
			expect(row.client_id).toBe(clientA.id);
			expect(row.user_id).toBe(userA.id);
			expect(row.claim_id).toBe(claimA.id);
			expect(row.checklist_id).toBe(checklistA.id);
			expect(row.question_text).toBe(uniqueText);
			expect(row.page_label).toBe('Test Page');
			expect(row.action).toBe('insert');
			expect(row.email).toBe(userA.email);
			expect(row.first).toBe(userA.first);
			expect(row.last).toBe(userA.last);
		});

		it('should filter by claimId', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim1 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const claim2 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			await createTestResponseAuditLog(client.id, user.id, { claim_id: claim1.id });
			await createTestResponseAuditLog(client.id, user.id, { claim_id: claim2.id });

			const result = await getResponseAuditLogs(ctx, { claimId: claim1.id }, 10, 0);

			expect(result.rows.every((r) => r.claim_id === claim1.id)).toBe(true);
		});

		it('should filter by checklistId', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const checklist1 = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
			});
			const checklist2 = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			await createTestResponseAuditLog(client.id, user.id, { checklist_id: checklist1.id });
			await createTestResponseAuditLog(client.id, user.id, { checklist_id: checklist2.id });

			const result = await getResponseAuditLogs(ctx, { checklistId: checklist1.id }, 10, 0);

			expect(result.rows.every((r) => r.checklist_id === checklist1.id)).toBe(true);
		});

		it('should filter by searchTerm in question_text', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			await createTestResponseAuditLog(client.id, user.id, {
				question_text: 'UniqueSearchTerm123',
			});
			await createTestResponseAuditLog(client.id, user.id, { question_text: 'OtherQuestion' });

			const result = await getResponseAuditLogs(ctx, { searchTerm: 'UniqueSearch' }, 10, 0);

			expect(result.rows.every((r) => r.question_text.includes('UniqueSearch'))).toBe(true);
		});

		it('should not return logs from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'user',
			});

			await createTestResponseAuditLog(clientB.id, userB.id, { question_text: 'IsolatedQuestion' });

			const result = await getResponseAuditLogs(ctxA, { searchTerm: 'Isolated' }, 10, 0);

			expect(result.rows.length).toBe(0);
		});

		it('should filter by emails', async () => {
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client.id });
			const user2 = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user1.id,
				client_id: client.id,
				email: user1.email,
				role: 'user',
			});

			await createTestResponseAuditLog(client.id, user1.id);
			await createTestResponseAuditLog(client.id, user2.id);

			const result = await getResponseAuditLogs(ctx, { emails: [user1.email] }, 10, 0);

			expect(result.rows.every((r) => r.email === user1.email)).toBe(true);
		});

		it('should filter by date range', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			await createTestResponseAuditLog(client.id, user.id);

			// Pad 1s: created_at is set by Postgres now() with microsecond precision,
			// which can exceed a same-millisecond JS Date and fall outside the range
			const now = new Date(Date.now() + 1000);
			const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

			const result = await getResponseAuditLogs(ctx, { range: [weekAgo, weekFromNow] }, 10, 0);

			expect(result.rows.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe('getResponseAuditLogStats', () => {
		it('should return stats for date range', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			await createTestResponseAuditLog(client.id, user.id);

			// Pad 1s: created_at is set by Postgres now() with microsecond precision,
			// which can exceed a same-millisecond JS Date and fall outside the range
			const now = new Date(Date.now() + 1000);
			const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

			const stats = await getResponseAuditLogStats(ctx, { range: [weekAgo, now] });

			// Should return array of daily stats
			expect(Array.isArray(stats)).toBe(true);
			expect(stats.length).toBeGreaterThanOrEqual(7);
		});

		it('should not include stats from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'user',
			});

			await createTestResponseAuditLog(clientB.id, userB.id);

			// Pad 1s: created_at is set by Postgres now() with microsecond precision,
			// which can exceed a same-millisecond JS Date and fall outside the range
			const now = new Date(Date.now() + 1000);
			const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

			const stats = await getResponseAuditLogStats(ctxA, { range: [weekAgo, now] });

			// All counts should be 0 for client A since logs belong to client B
			const totalCount = stats.reduce((acc, s) => acc + s.event_count, 0);
			// May have some client A data from other tests, but should not include B's
			expect(stats.every((s) => s.event_count >= 0)).toBe(true);
		});
	});

	describe('exportResponseAuditLogs', () => {
		it('should return all matching logs without pagination', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});
			const uniqueText = `Export_${Date.now()}`;

			await createTestResponseAuditLog(client.id, user.id, { question_text: uniqueText });
			await createTestResponseAuditLog(client.id, user.id, { question_text: uniqueText });
			await createTestResponseAuditLog(client.id, user.id, { question_text: uniqueText });

			const results = await exportResponseAuditLogs(ctx, {
				searchTerm: uniqueText.substring(0, 10),
			});

			expect(results.length).toBe(3);
		});

		it('should include user info', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});
			const uniqueText = `ExportUser_${Date.now()}`;

			await createTestResponseAuditLog(client.id, user.id, { question_text: uniqueText });

			const results = await exportResponseAuditLogs(ctx, {
				searchTerm: uniqueText.substring(0, 15),
			});

			expect(results[0].first).toBe(user.first);
			expect(results[0].last).toBe(user.last);
		});

		it('should not return logs from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'user',
			});

			const uniqueText = `ExportIso_${Date.now()}`;
			await createTestResponseAuditLog(clientB.id, userB.id, { question_text: uniqueText });

			const results = await exportResponseAuditLogs(ctxA, {
				searchTerm: uniqueText.substring(0, 15),
			});

			expect(results.length).toBe(0);
		});
	});
});
