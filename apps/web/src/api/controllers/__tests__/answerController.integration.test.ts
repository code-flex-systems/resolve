/**
 * Integration tests for answerController
 *
 * Tests the orchestrative functions that coordinate multiple queries
 * and have complex business logic beyond simple CRUD operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestPage,
	createTestQuestion,
	createTestAnswer,
} from '@/__tests__/integration/fixtures';
import * as answerController from '../answerController';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

describe('answerController integration tests', () => {
	let db: Kysely<DB>;

	beforeEach(() => {
		db = getTestDb();
	});

	// =========================================================================
	// copyAnswer - Fetches existing answer, transforms data, creates copy
	// =========================================================================

	describe('copyAnswer', () => {
		async function setupTestFixtures() {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, {
				client_id: client.id,
				page_id: page.id,
				created_by: user.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id });

			return { client, user, page, question, ctx };
		}

		describe('basic copy functionality', () => {
			it('should copy an answer to the same question', async () => {
				const { client, user, page, question, ctx } = await setupTestFixtures();
				const originalAnswer = await createTestAnswer(db, {
					client_id: client.id,
					question_id: question.id,
					created_by: user.id,
					text: 'Original answer text',
					position: 1,
				});

				const copiedAnswer = await answerController.copyAnswer(ctx, {
					pageId: page.id,
					questionId: question.id,
					answerId: originalAnswer.id,
				});

				expect(copiedAnswer.id).not.toBe(originalAnswer.id);
				expect(copiedAnswer.text).toBe('Original answer text');
				expect(copiedAnswer.question_id).toBe(question.id);
			});

			it('should copy an answer to a different question', async () => {
				const { client, user, page, question, ctx } = await setupTestFixtures();

				// Create a second question on the same page
				const question2 = await createTestQuestion(db, {
					client_id: client.id,
					page_id: page.id,
					created_by: user.id,
					text: 'Second question',
				});

				const originalAnswer = await createTestAnswer(db, {
					client_id: client.id,
					question_id: question.id,
					created_by: user.id,
					text: 'Answer to copy',
				});

				const copiedAnswer = await answerController.copyAnswer(ctx, {
					pageId: page.id,
					questionId: question2.id,
					answerId: originalAnswer.id,
				});

				expect(copiedAnswer.id).not.toBe(originalAnswer.id);
				expect(copiedAnswer.question_id).toBe(question2.id);
				expect(copiedAnswer.text).toBe('Answer to copy');
			});
		});

		describe('property preservation', () => {
			it('should preserve all answer properties when copying', async () => {
				const { client, user, page, question, ctx } = await setupTestFixtures();
				// Note: has_additional_info and requires_upload are mutually exclusive per DB constraint
				const originalAnswer = await createTestAnswer(db, {
					client_id: client.id,
					question_id: question.id,
					created_by: user.id,
					text: 'Detailed answer',
					position: 5,
					grade: 10,
					has_additional_info: true,
					requires_upload: false,
					hidden: false,
				});

				const copiedAnswer = await answerController.copyAnswer(ctx, {
					pageId: page.id,
					questionId: question.id,
					answerId: originalAnswer.id,
				});

				expect(copiedAnswer.text).toBe('Detailed answer');
				expect(copiedAnswer.position).toBe(5);
				expect(copiedAnswer.grade).toBe('10'); // Note: grade is stored as string in DB
				expect(copiedAnswer.has_additional_info).toBe(true);
				expect(copiedAnswer.requires_upload).toBe(false); // Matches original fixture
				expect(copiedAnswer.hidden).toBe(false);
			});

			it('should convert numeric string fields correctly when copying', async () => {
				const { client, user, page, question, ctx } = await setupTestFixtures();
				// Test the Number() conversions in copyAnswer for grade and additional_info_num_lines
				const originalAnswer = await createTestAnswer(db, {
					client_id: client.id,
					question_id: question.id,
					created_by: user.id,
					text: 'Answer with numeric fields',
					grade: 75,
					has_additional_info: true,
					requires_upload: false,
					additional_info_num_lines: 5,
				});

				const copiedAnswer = await answerController.copyAnswer(ctx, {
					pageId: page.id,
					questionId: question.id,
					answerId: originalAnswer.id,
				});

				// grade is stored as decimal/string in DB, additional_info_num_lines as integer
				expect(copiedAnswer.grade).toBe('75');
				expect(copiedAnswer.additional_info_num_lines).toBe(5);
			});

			it('should handle null/undefined optional properties', async () => {
				const { client, user, page, question, ctx } = await setupTestFixtures();
				const originalAnswer = await createTestAnswer(db, {
					client_id: client.id,
					question_id: question.id,
					created_by: user.id,
					text: 'Minimal answer',
					grade: null,
					has_additional_info: false,
					requires_upload: false,
				});

				const copiedAnswer = await answerController.copyAnswer(ctx, {
					pageId: page.id,
					questionId: question.id,
					answerId: originalAnswer.id,
				});

				expect(copiedAnswer.text).toBe('Minimal answer');
				expect(copiedAnswer.grade).toBeNull();
				expect(copiedAnswer.has_additional_info).toBe(false);
				expect(copiedAnswer.requires_upload).toBe(false);
			});
		});

		describe('error handling', () => {
			it('should throw when answer does not exist', async () => {
				const { page, question, ctx } = await setupTestFixtures();

				// getAnswer uses executeTakeFirstOrThrow() which throws 'no result'
				await expect(
					answerController.copyAnswer(ctx, {
						pageId: page.id,
						questionId: question.id,
						answerId: 999999,
					})
				).rejects.toThrow('no result');
			});
		});

		describe('database persistence', () => {
			it('should persist copied answer to database', async () => {
				const { client, user, page, question, ctx } = await setupTestFixtures();
				const originalAnswer = await createTestAnswer(db, {
					client_id: client.id,
					question_id: question.id,
					created_by: user.id,
					text: 'Persistent answer',
				});

				const copiedAnswer = await answerController.copyAnswer(ctx, {
					pageId: page.id,
					questionId: question.id,
					answerId: originalAnswer.id,
				});

				// Verify directly in database
				const dbAnswer = await db
					.selectFrom('answer')
					.selectAll()
					.where('id', '=', copiedAnswer.id)
					.executeTakeFirst();

				expect(dbAnswer).toBeDefined();
				expect(dbAnswer!.text).toBe('Persistent answer');
				expect(dbAnswer!.client_id).toBe(client.id);
			});

			it('should not modify the original answer', async () => {
				const { client, user, page, question, ctx } = await setupTestFixtures();
				const originalAnswer = await createTestAnswer(db, {
					client_id: client.id,
					question_id: question.id,
					created_by: user.id,
					text: 'Original text',
				});

				await answerController.copyAnswer(ctx, {
					pageId: page.id,
					questionId: question.id,
					answerId: originalAnswer.id,
				});

				// Verify original is unchanged
				const dbOriginal = await db
					.selectFrom('answer')
					.selectAll()
					.where('id', '=', originalAnswer.id)
					.executeTakeFirst();

				expect(dbOriginal).toBeDefined();
				expect(dbOriginal!.text).toBe('Original text');
			});
		});

		describe('tenant isolation', () => {
			it('should not allow copying answer from different client', async () => {
				const clientA = await createTestClient(db, { name: 'Client A' });
				const clientB = await createTestClient(db, { name: 'Client B' });
				const userA = await createTestUser(db, { client_id: clientA.id });
				const userB = await createTestUser(db, { client_id: clientB.id });
				const pageA = await createTestPage(db, { client_id: clientA.id, created_by: userA.id });
				const pageB = await createTestPage(db, { client_id: clientB.id, created_by: userB.id });
				const questionA = await createTestQuestion(db, {
					client_id: clientA.id,
					page_id: pageA.id,
					created_by: userA.id,
				});
				const questionB = await createTestQuestion(db, {
					client_id: clientB.id,
					page_id: pageB.id,
					created_by: userB.id,
				});
				const answerA = await createTestAnswer(db, {
					client_id: clientA.id,
					question_id: questionA.id,
					created_by: userA.id,
					text: 'Client A answer',
				});

				const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id });

				// User B trying to copy Client A's answer
				await expect(
					answerController.copyAnswer(ctxB, {
						pageId: pageB.id,
						questionId: questionB.id,
						answerId: answerA.id,
					})
				).rejects.toThrow();
			});
		});
	});
});
