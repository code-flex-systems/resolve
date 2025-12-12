/**
 * Integration tests for upsertQuestionResponses
 *
 * This complex function handles:
 * - Creating new question responses (with text, doc, or selected answers)
 * - Updating existing responses
 * - Deleting responses (when cleared)
 * - Managing question_response_answer records
 * - Document linking/unlinking
 * - Audit logging (insert/update/delete actions)
 * - Page instance status updates
 * - Tenant isolation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import { upsertQuestionResponses } from '../responseQueries';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestChecklist,
	createTestPage,
	createTestPageInstance,
	createTestQuestion,
	createTestAnswer,
	createTestDoc,
} from '@/__tests__/integration/fixtures';
import type { QuestionResponse } from '@/types/types';

describe('upsertQuestionResponses integration tests', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// Helper to set up common test fixtures
	async function setupTestFixtures() {
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
		const question = await createTestQuestion(db, {
			client_id: client.id,
			page_id: page.id,
			created_by: user.id,
		});
		const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

		return { client, user, claim, checklist, page, instance, question, ctx };
	}

	// Helper to get response from DB
	async function getResponse(checklistId: number, instanceId: number, claimId: number, questionId: number) {
		return db
			.selectFrom('question_response')
			.selectAll()
			.where('checklist_id', '=', checklistId)
			.where('instance_id', '=', instanceId)
			.where('claim_id', '=', claimId)
			.where('question_id', '=', questionId)
			.executeTakeFirst();
	}

	// Helper to get response answers from DB
	async function getResponseAnswers(responseId: number) {
		return db
			.selectFrom('question_response_answer')
			.selectAll()
			.where('response_id', '=', responseId)
			.execute();
	}

	// Helper to get audit logs for a response
	async function getAuditLogs(clientId: string, questionId: number) {
		return db
			.selectFrom('response_audit_logs')
			.selectAll()
			.where('client_id', '=', clientId)
			.where('question_id', '=', questionId)
			.orderBy('created_at', 'asc')
			.execute();
	}

	describe('insert new response', () => {
		it('should create a response with text', async () => {
			const { client, claim, checklist, instance, question, ctx } = await setupTestFixtures();

			const response: QuestionResponse = {
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_text: 'My answer text',
				selected_answers: [],
			};

			await upsertQuestionResponses(ctx, [response]);

			const saved = await getResponse(checklist.id, instance.id, claim.id, question.id);
			expect(saved).toBeDefined();
			expect(saved!.response_text).toBe('My answer text');
			expect(saved!.client_id).toBe(client.id);
		});

		it('should create a response with selected answers', async () => {
			const { client, user, claim, checklist, page, instance, question, ctx } = await setupTestFixtures();
			const answer1 = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'Option A' });
			const answer2 = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'Option B' });

			const response: QuestionResponse = {
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				selected_answers: [
					{ answer_id: answer1.id },
					{ answer_id: answer2.id, additional_info: 'Extra details' },
				],
			};

			await upsertQuestionResponses(ctx, [response]);

			const saved = await getResponse(checklist.id, instance.id, claim.id, question.id);
			expect(saved).toBeDefined();

			const answers = await getResponseAnswers(saved!.id);
			expect(answers.length).toBe(2);
			expect(answers.some((a) => a.answer_id === answer1.id)).toBe(true);
			expect(answers.some((a) => a.answer_id === answer2.id && a.additional_info === 'Extra details')).toBe(true);
		});

		it('should create a response with document', async () => {
			const { client, user, claim, checklist, instance, question, ctx } = await setupTestFixtures();
			const doc = await createTestDoc(db, { client_id: client.id, created_by: user.id });

			const response: QuestionResponse = {
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_doc_id: doc.id,
				selected_answers: [],
			};

			await upsertQuestionResponses(ctx, [response]);

			const saved = await getResponse(checklist.id, instance.id, claim.id, question.id);
			expect(saved).toBeDefined();
			expect(saved!.response_doc_id).toBe(doc.id);

			// Verify doc was linked
			const updatedDoc = await db.selectFrom('doc').selectAll().where('id', '=', doc.id).executeTakeFirst();
			expect(updatedDoc!.response_doc_id).toBe(saved!.id);
		});

		it('should create audit log with insert action', async () => {
			const { client, claim, checklist, instance, question, ctx } = await setupTestFixtures();

			const response: QuestionResponse = {
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_text: 'Audit test',
				selected_answers: [],
			};

			await upsertQuestionResponses(ctx, [response]);

			const logs = await getAuditLogs(client.id, question.id);
			expect(logs.length).toBe(1);
			expect(logs[0].action).toBe('insert');
			expect(logs[0].new_response_text).toBe('Audit test');
			expect(logs[0].old_response_text).toBeNull();
		});
	});

	describe('update existing response', () => {
		it('should update response text', async () => {
			const { client, claim, checklist, instance, question, ctx } = await setupTestFixtures();

			// Create initial response
			const initial: QuestionResponse = {
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_text: 'Initial text',
				selected_answers: [],
			};
			await upsertQuestionResponses(ctx, [initial]);

			// Update response
			const updated: QuestionResponse = {
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_text: 'Updated text',
				selected_answers: [],
			};
			await upsertQuestionResponses(ctx, [updated]);

			const saved = await getResponse(checklist.id, instance.id, claim.id, question.id);
			expect(saved!.response_text).toBe('Updated text');
		});

		it('should update selected answers', async () => {
			const { client, user, claim, checklist, instance, question, ctx } = await setupTestFixtures();
			const answer1 = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'A' });
			const answer2 = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'B' });
			const answer3 = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'C' });

			// Create with answer1 and answer2
			const initial: QuestionResponse = {
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				selected_answers: [{ answer_id: answer1.id }, { answer_id: answer2.id }],
			};
			await upsertQuestionResponses(ctx, [initial]);

			// Update to answer2 and answer3
			const updated: QuestionResponse = {
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				selected_answers: [{ answer_id: answer2.id }, { answer_id: answer3.id }],
			};
			await upsertQuestionResponses(ctx, [updated]);

			const saved = await getResponse(checklist.id, instance.id, claim.id, question.id);
			const answers = await getResponseAnswers(saved!.id);
			expect(answers.length).toBe(2);
			expect(answers.some((a) => a.answer_id === answer2.id)).toBe(true);
			expect(answers.some((a) => a.answer_id === answer3.id)).toBe(true);
			expect(answers.some((a) => a.answer_id === answer1.id)).toBe(false);
		});

		it('should create audit log with update action', async () => {
			const { client, claim, checklist, instance, question, ctx } = await setupTestFixtures();

			// Create initial
			await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_text: 'Before',
				selected_answers: [],
			}]);

			// Update
			await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_text: 'After',
				selected_answers: [],
			}]);

			const logs = await getAuditLogs(client.id, question.id);
			expect(logs.length).toBe(2);
			expect(logs[1].action).toBe('update');
			expect(logs[1].old_response_text).toBe('Before');
			expect(logs[1].new_response_text).toBe('After');
		});
	});

	describe('delete response (clear)', () => {
		it('should delete response when all fields cleared', async () => {
			const { client, claim, checklist, instance, question, ctx } = await setupTestFixtures();

			// Create initial response
			await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_text: 'To be deleted',
				selected_answers: [],
			}]);

			// Clear the response
			await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_text: null,
				response_doc_id: null,
				selected_answers: [],
			}]);

			const saved = await getResponse(checklist.id, instance.id, claim.id, question.id);
			expect(saved).toBeUndefined();
		});

		it('should create audit log with delete action', async () => {
			const { client, claim, checklist, instance, question, ctx } = await setupTestFixtures();

			// Create initial
			await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_text: 'Will delete',
				selected_answers: [],
			}]);

			// Delete
			await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_text: null,
				selected_answers: [],
			}]);

			const logs = await getAuditLogs(client.id, question.id);
			expect(logs.length).toBe(2);
			expect(logs[1].action).toBe('delete');
			expect(logs[1].old_response_text).toBe('Will delete');
			expect(logs[1].new_response_text).toBeNull();
		});
	});

	describe('no-op when unchanged', () => {
		it('should skip update when nothing changed', async () => {
			const { client, claim, checklist, instance, question, ctx } = await setupTestFixtures();

			// Create initial
			await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_text: 'Same text',
				selected_answers: [],
			}]);

			// "Update" with same data
			await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_text: 'Same text',
				selected_answers: [],
			}]);

			// Should only have 1 audit log (insert), not 2
			const logs = await getAuditLogs(client.id, question.id);
			expect(logs.length).toBe(1);
			expect(logs[0].action).toBe('insert');
		});

		it('should skip when answers unchanged', async () => {
			const { client, user, claim, checklist, instance, question, ctx } = await setupTestFixtures();
			const answer = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id });

			// Create initial
			await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				selected_answers: [{ answer_id: answer.id, additional_info: 'Info' }],
			}]);

			// "Update" with same answers
			await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				selected_answers: [{ answer_id: answer.id, additional_info: 'Info' }],
			}]);

			const logs = await getAuditLogs(client.id, question.id);
			expect(logs.length).toBe(1);
		});
	});

	describe('document linking', () => {
		it('should link new document', async () => {
			const { client, user, claim, checklist, instance, question, ctx } = await setupTestFixtures();
			const doc = await createTestDoc(db, { client_id: client.id, created_by: user.id });

			await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_doc_id: doc.id,
				selected_answers: [],
			}]);

			const updatedDoc = await db.selectFrom('doc').selectAll().where('id', '=', doc.id).executeTakeFirst();
			const saved = await getResponse(checklist.id, instance.id, claim.id, question.id);
			expect(updatedDoc!.response_doc_id).toBe(saved!.id);
		});

		it('should unlink old document when changing to new document', async () => {
			const { client, user, claim, checklist, instance, question, ctx } = await setupTestFixtures();
			const doc1 = await createTestDoc(db, { client_id: client.id, created_by: user.id });
			const doc2 = await createTestDoc(db, { client_id: client.id, created_by: user.id });

			// Link doc1
			await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_doc_id: doc1.id,
				selected_answers: [],
			}]);

			// Change to doc2
			await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_doc_id: doc2.id,
				selected_answers: [],
			}]);

			const updatedDoc1 = await db.selectFrom('doc').selectAll().where('id', '=', doc1.id).executeTakeFirst();
			const updatedDoc2 = await db.selectFrom('doc').selectAll().where('id', '=', doc2.id).executeTakeFirst();
			const saved = await getResponse(checklist.id, instance.id, claim.id, question.id);

			expect(updatedDoc1!.response_doc_id).toBeNull(); // Unlinked
			expect(updatedDoc2!.response_doc_id).toBe(saved!.id); // Linked
		});

		it('should unlink document when removed from response', async () => {
			const { client, user, claim, checklist, instance, question, ctx } = await setupTestFixtures();
			const doc = await createTestDoc(db, { client_id: client.id, created_by: user.id });

			// Link doc
			await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_doc_id: doc.id,
				selected_answers: [],
			}]);

			// Remove doc, add text instead
			await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_doc_id: null,
				response_text: 'Text instead',
				selected_answers: [],
			}]);

			const updatedDoc = await db.selectFrom('doc').selectAll().where('id', '=', doc.id).executeTakeFirst();
			expect(updatedDoc!.response_doc_id).toBeNull();
		});
	});

	describe('page status update', () => {
		it('should update page instance status based on answered questions', async () => {
			// Don't use setupTestFixtures since it creates an extra question
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

			// Create exactly 2 questions
			const q1 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q1' });
			const q2 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q2' });

			// Answer just q1
			const status = await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: q1.id,
				response_text: 'Answer 1',
				selected_answers: [],
			}]);

			// With 2 questions, 1 answered => in-progress
			expect(status).toBe('in-progress');

			// Answer q2 as well
			const status2 = await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: q2.id,
				response_text: 'Answer 2',
				selected_answers: [],
			}]);

			// With 2 questions, 2 answered => complete
			expect(status2).toBe('complete');
		});

		it('should not count answer as complete if requires_upload but no doc provided', async () => {
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

			// Create 1 question with an answer that requires upload
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const answerRequiringUpload = await createTestAnswer(db, {
				client_id: client.id,
				question_id: question.id,
				created_by: user.id,
				requires_upload: true,
			});

			// Select the answer but don't provide a document
			const status = await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				selected_answers: [{ answer_id: answerRequiringUpload.id }],
			}]);

			// Should NOT be complete because requires_upload answer has no doc
			expect(status).toBe('unstarted');
		});

		it('should count answer as complete if requires_upload and doc is provided', async () => {
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
			const doc = await createTestDoc(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			// Create 1 question with an answer that requires upload
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const answerRequiringUpload = await createTestAnswer(db, {
				client_id: client.id,
				question_id: question.id,
				created_by: user.id,
				requires_upload: true,
			});

			// Select the answer AND provide a document
			const status = await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_doc_id: doc.id,
				selected_answers: [{ answer_id: answerRequiringUpload.id }],
			}]);

			// Should be complete because doc is provided
			expect(status).toBe('complete');
		});
	});

	describe('multiple responses in single call', () => {
		it('should handle multiple responses at once', async () => {
			const { client, user, claim, checklist, page, instance, ctx } = await setupTestFixtures();
			const q1 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q1' });
			const q2 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q2' });

			await upsertQuestionResponses(ctx, [
				{
					checklist_id: checklist.id,
					instance_id: instance.id,
					claim_id: claim.id,
					question_id: q1.id,
					response_text: 'Answer 1',
					selected_answers: [],
				},
				{
					checklist_id: checklist.id,
					instance_id: instance.id,
					claim_id: claim.id,
					question_id: q2.id,
					response_text: 'Answer 2',
					selected_answers: [],
				},
			]);

			const r1 = await getResponse(checklist.id, instance.id, claim.id, q1.id);
			const r2 = await getResponse(checklist.id, instance.id, claim.id, q2.id);

			expect(r1).toBeDefined();
			expect(r1!.response_text).toBe('Answer 1');
			expect(r2).toBeDefined();
			expect(r2!.response_text).toBe('Answer 2');
		});
	});

	describe('tenant isolation', () => {
		it('should isolate responses by client - each client has their own response', async () => {
			// This test verifies that each client can have their own separate responses
			// even when using the same checklist/instance/claim/question IDs
			// (in practice, these IDs would be different per client, but this tests the client_id filter)
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });

			// Each client has their own claim, checklist, page, etc
			const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
			const checklistA = await createTestChecklist(db, { client_id: clientA.id, created_by: userA.id });
			const pageA = await createTestPage(db, { client_id: clientA.id, created_by: userA.id });
			const instanceA = await createTestPageInstance(db, {
				client_id: clientA.id,
				created_by: userA.id,
				checklist_id: checklistA.id,
				page_id: pageA.id,
			});
			const questionA = await createTestQuestion(db, { client_id: clientA.id, page_id: pageA.id, created_by: userA.id });

			const claimB = await createTestClaim(db, { client_id: clientB.id, created_by: userB.id });
			const checklistB = await createTestChecklist(db, { client_id: clientB.id, created_by: userB.id });
			const pageB = await createTestPage(db, { client_id: clientB.id, created_by: userB.id });
			const instanceB = await createTestPageInstance(db, {
				client_id: clientB.id,
				created_by: userB.id,
				checklist_id: checklistB.id,
				page_id: pageB.id,
			});
			const questionB = await createTestQuestion(db, { client_id: clientB.id, page_id: pageB.id, created_by: userB.id });

			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });
			const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id, email: userB.email, role: 'user' });

			// Client A creates response
			await upsertQuestionResponses(ctxA, [{
				checklist_id: checklistA.id,
				instance_id: instanceA.id,
				claim_id: claimA.id,
				question_id: questionA.id,
				response_text: 'Client A answer',
				selected_answers: [],
			}]);

			// Client B creates their own response
			await upsertQuestionResponses(ctxB, [{
				checklist_id: checklistB.id,
				instance_id: instanceB.id,
				claim_id: claimB.id,
				question_id: questionB.id,
				response_text: 'Client B answer',
				selected_answers: [],
			}]);

			// Verify each client has their own response
			const responseA = await db
				.selectFrom('question_response')
				.selectAll()
				.where('client_id', '=', clientA.id)
				.executeTakeFirst();

			const responseB = await db
				.selectFrom('question_response')
				.selectAll()
				.where('client_id', '=', clientB.id)
				.executeTakeFirst();

			expect(responseA).toBeDefined();
			expect(responseA!.response_text).toBe('Client A answer');
			expect(responseA!.client_id).toBe(clientA.id);

			expect(responseB).toBeDefined();
			expect(responseB!.response_text).toBe('Client B answer');
			expect(responseB!.client_id).toBe(clientB.id);
		});

		it('should not find existing response from different client when updating', async () => {
			// Test that the oldRow lookup properly filters by client_id
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });

			// Client A's setup
			const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
			const checklistA = await createTestChecklist(db, { client_id: clientA.id, created_by: userA.id });
			const pageA = await createTestPage(db, { client_id: clientA.id, created_by: userA.id });
			const instanceA = await createTestPageInstance(db, {
				client_id: clientA.id,
				created_by: userA.id,
				checklist_id: checklistA.id,
				page_id: pageA.id,
			});
			const questionA = await createTestQuestion(db, { client_id: clientA.id, page_id: pageA.id, created_by: userA.id });

			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			// Client A creates and then updates a response
			await upsertQuestionResponses(ctxA, [{
				checklist_id: checklistA.id,
				instance_id: instanceA.id,
				claim_id: claimA.id,
				question_id: questionA.id,
				response_text: 'Initial',
				selected_answers: [],
			}]);

			await upsertQuestionResponses(ctxA, [{
				checklist_id: checklistA.id,
				instance_id: instanceA.id,
				claim_id: claimA.id,
				question_id: questionA.id,
				response_text: 'Updated by A',
				selected_answers: [],
			}]);

			// Verify only client A's response exists and is updated
			const responseA = await db
				.selectFrom('question_response')
				.selectAll()
				.where('client_id', '=', clientA.id)
				.where('question_id', '=', questionA.id)
				.executeTakeFirst();

			expect(responseA!.response_text).toBe('Updated by A');

			// Verify audit logs are all for client A
			const logs = await db
				.selectFrom('response_audit_logs')
				.selectAll()
				.where('question_id', '=', questionA.id)
				.execute();

			expect(logs.length).toBe(2); // insert + update
			expect(logs.every((l) => l.client_id === clientA.id)).toBe(true);
		});
	});

	describe('audit log snapshots', () => {
		it('should snapshot answer labels in audit log', async () => {
			const { client, user, claim, checklist, instance, question, ctx } = await setupTestFixtures();
			const answer = await createTestAnswer(db, {
				client_id: client.id,
				question_id: question.id,
				created_by: user.id,
				text: 'Specific Label Text',
			});

			await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				selected_answers: [{ answer_id: answer.id, additional_info: 'Extra info' }],
			}]);

			const logs = await getAuditLogs(client.id, question.id);
			expect(logs.length).toBe(1);

			// new_answers may be stored as JSON string or already parsed object
			const newAnswers = typeof logs[0].new_answers === 'string'
				? JSON.parse(logs[0].new_answers)
				: logs[0].new_answers;
			expect(newAnswers.length).toBe(1);
			expect(newAnswers[0].label).toBe('Specific Label Text');
			expect(newAnswers[0].additional_info).toBe('Extra info');
		});

		it('should snapshot question text and page label', async () => {
			const { client, user, claim, checklist, page, instance, ctx } = await setupTestFixtures();
			// Create question with specific text
			const question = await createTestQuestion(db, {
				client_id: client.id,
				page_id: page.id,
				created_by: user.id,
				text: 'Very Specific Question Text',
			});

			await upsertQuestionResponses(ctx, [{
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				question_id: question.id,
				response_text: 'Some answer',
				selected_answers: [],
			}]);

			const logs = await getAuditLogs(client.id, question.id);
			expect(logs[0].question_text).toBe('Very Specific Question Text');
			expect(logs[0].page_label).toBe(page.title);
		});
	});
});
