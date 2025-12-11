import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createAnswer,
	getAnswerForDeletion,
	deleteAnswer,
	getAnswer,
	getAnswers,
	getAnswerCount,
	getAnswerCallGraph,
	modifyAnswer,
} from '../answerQueries';
import {
	createTestClient,
	createTestUser,
	createTestChecklist,
	createTestPage,
	createTestPageInstance,
	createTestQuestion,
	createTestAnswer,
} from '@/__tests__/integration/fixtures';

describe('answerQueries integration', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// =====================================================================
	// ANSWER CRUD OPERATIONS
	// =====================================================================

	describe('createAnswer', () => {
		it('should create a new answer', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await createAnswer(ctx, page.id, question.id, {
				text: 'Test Answer',
				position: 0,
				grade: 1,
			});

			expect(result.id).toBeDefined();
			expect(result.text).toBe('Test Answer');
			// grade is numeric in DB, returns as string
			expect(result.grade).toBe('1');
			expect(result.question_id).toBe(question.id);
		});

		it('should bump page version', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const originalVersion = page.version;

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await createAnswer(ctx, page.id, question.id, {
				text: 'Test Answer',
				position: 0,
			});

			const updatedPage = await db
				.selectFrom('page')
				.select('version')
				.where('id', '=', page.id)
				.executeTakeFirst();

			expect(updatedPage?.version).toBe(originalVersion + 1);
		});

		it('should shift positions when inserting', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });

			const a1 = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, position: 0 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Insert at position 0 (should shift a1 to 1)
			await createAnswer(ctx, page.id, question.id, {
				text: 'New Answer',
				position: 0,
			});

			const updated = await db
				.selectFrom('answer')
				.select('position')
				.where('id', '=', a1.id)
				.executeTakeFirst();

			expect(updated?.position).toBe(1);
		});

		it('should create with optional fields', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Note: has_additional_info and requires_upload are mutually exclusive (check constraint)
			const result = await createAnswer(ctx, page.id, question.id, {
				text: 'Test Answer',
				position: 0,
				description_text: 'Description here',
				has_additional_info: true,
				additional_info_placeholder: 'Enter details',
				additional_info_num_lines: 3,
				hidden: true,
				requires_upload: false,
			});

			expect(result.description_text).toBe('Description here');
			expect(result.has_additional_info).toBe(true);
			expect(result.additional_info_placeholder).toBe('Enter details');
			expect(result.additional_info_num_lines).toBe(3);
			expect(result.hidden).toBe(true);
			expect(result.requires_upload).toBe(false);
		});

		it('should create with calls_instance_id', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const childPage = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });

			await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			const childInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: childPage.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await createAnswer(ctx, page.id, question.id, {
				text: 'Go to child',
				position: 0,
				calls_instance_id: childInstance.id,
			});

			expect(result.calls_instance_id).toBe(childInstance.id);
		});

		it('should detect and prevent cycles in calls_instance_id', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });

			const pageA = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const pageB = await createTestPage(db, { client_id: client.id, created_by: user.id });

			const instanceA = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: pageA.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			const instanceB = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: pageB.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			// Create question on pageA that calls instanceB
			const questionA = await createTestQuestion(db, { client_id: client.id, page_id: pageA.id, created_by: user.id });
			await createTestAnswer(db, {
				client_id: client.id,
				question_id: questionA.id,
				created_by: user.id,
				calls_instance_id: instanceB.id,
			});

			// Create question on pageB
			const questionB = await createTestQuestion(db, { client_id: client.id, page_id: pageB.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Try to create answer on pageB that calls instanceA (would create cycle: A->B->A)
			await expect(
				createAnswer(ctx, pageB.id, questionB.id, {
					text: 'Back to A',
					position: 0,
					calls_instance_id: instanceA.id,
				})
			).rejects.toThrow(/would create a cycle/);
		});
	});

	describe('getAnswerForDeletion', () => {
		it('should return answer details', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const answer = await createTestAnswer(db, {
				client_id: client.id,
				question_id: question.id,
				created_by: user.id,
				text: 'Test A',
				grade: 5,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAnswerForDeletion(ctx, answer.id);

			expect(result?.id).toBe(answer.id);
			expect(result?.text).toBe('Test A');
			// grade is numeric in DB, returns as string
			expect(result?.grade).toBe('5');
			expect(result?.question_id).toBe(question.id);
		});

		it('should return undefined for non-existent answer', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAnswerForDeletion(ctx, 999999);

			expect(result).toBeUndefined();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client1.id, created_by: user1.id });
			const question = await createTestQuestion(db, { client_id: client1.id, page_id: page.id, created_by: user1.id });
			const answer = await createTestAnswer(db, { client_id: client1.id, question_id: question.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getAnswerForDeletion(ctx2, answer.id);

			expect(result).toBeUndefined();
		});
	});

	describe('deleteAnswer', () => {
		it('should delete an answer', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const answer = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await deleteAnswer(ctx, page.id, answer.id);

			const deleted = await db
				.selectFrom('answer')
				.selectAll()
				.where('id', '=', answer.id)
				.executeTakeFirst();

			expect(deleted).toBeUndefined();
		});

		it('should reorder remaining answers', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });

			const a1 = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, position: 0 });
			const a2 = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, position: 1 });
			const a3 = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, position: 2 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await deleteAnswer(ctx, page.id, a2.id);

			const remaining = await db
				.selectFrom('answer')
				.select(['id', 'position'])
				.where('id', 'in', [a1.id, a3.id])
				.orderBy('position')
				.execute();

			expect(remaining[0].id).toBe(a1.id);
			expect(remaining[0].position).toBe(0);
			expect(remaining[1].id).toBe(a3.id);
			expect(remaining[1].position).toBe(1);
		});

		it('should bump page version', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const answer = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id });
			const originalVersion = page.version;

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await deleteAnswer(ctx, page.id, answer.id);

			const updatedPage = await db
				.selectFrom('page')
				.select('version')
				.where('id', '=', page.id)
				.executeTakeFirst();

			expect(updatedPage?.version).toBe(originalVersion + 1);
		});
	});

	describe('getAnswer', () => {
		it('should return an answer by id', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const answer = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'Test A' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAnswer(ctx, answer.id);

			expect(result.id).toBe(answer.id);
			expect(result.text).toBe('Test A');
		});

		it('should throw for non-existent answer', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(getAnswer(ctx, 999999)).rejects.toThrow();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client1.id, created_by: user1.id });
			const question = await createTestQuestion(db, { client_id: client1.id, page_id: page.id, created_by: user1.id });
			const answer = await createTestAnswer(db, { client_id: client1.id, question_id: question.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(getAnswer(ctx2, answer.id)).rejects.toThrow();
		});
	});

	describe('getAnswers', () => {
		it('should return all answers for a question', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });

			await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'A1', position: 0 });
			await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'A2', position: 1 });
			await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'A3', position: 2 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAnswers(ctx, question.id);

			expect(result.length).toBe(3);
		});

		it('should order answers by position', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });

			await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'A3', position: 2 });
			await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'A1', position: 0 });
			await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'A2', position: 1 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAnswers(ctx, question.id);

			expect(result[0].text).toBe('A1');
			expect(result[1].text).toBe('A2');
			expect(result[2].text).toBe('A3');
		});

		it('should return empty array for question without answers', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAnswers(ctx, question.id);

			expect(result.length).toBe(0);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client1.id, created_by: user1.id });
			const question = await createTestQuestion(db, { client_id: client1.id, page_id: page.id, created_by: user1.id });
			await createTestAnswer(db, { client_id: client1.id, question_id: question.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getAnswers(ctx2, question.id);

			expect(result.length).toBe(0);
		});
	});

	describe('getAnswerCount', () => {
		it('should return count of answers for a question', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });

			await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, position: 0 });
			await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, position: 1 });
			await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, position: 2 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAnswerCount(ctx, question.id);

			expect(result).toBe(3);
		});

		it('should return 0 for question with no answers', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAnswerCount(ctx, question.id);

			expect(result).toBe(0);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client1.id, created_by: user1.id });
			const question = await createTestQuestion(db, { client_id: client1.id, page_id: page.id, created_by: user1.id });
			await createTestAnswer(db, { client_id: client1.id, question_id: question.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getAnswerCount(ctx2, question.id);

			expect(result).toBe(0);
		});
	});

	describe('getAnswerCallGraph', () => {
		it('should return answer call edges for a checklist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });

			const pageA = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const pageB = await createTestPage(db, { client_id: client.id, created_by: user.id });

			const instanceA = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: pageA.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			const instanceB = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: pageB.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			const questionA = await createTestQuestion(db, { client_id: client.id, page_id: pageA.id, created_by: user.id });
			await createTestAnswer(db, {
				client_id: client.id,
				question_id: questionA.id,
				created_by: user.id,
				calls_instance_id: instanceB.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAnswerCallGraph(ctx, checklist.id);

			expect(result.length).toBe(1);
			expect(result[0].from_instance_id).toBe(instanceA.id);
			expect(result[0].to_instance_id).toBe(instanceB.id);
		});

		it('should return empty array for checklist with no answer calls', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });

			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			await createTestAnswer(db, {
				client_id: client.id,
				question_id: question.id,
				created_by: user.id,
				calls_instance_id: null,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAnswerCallGraph(ctx, checklist.id);

			expect(result.length).toBe(0);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client1.id, created_by: user1.id });

			const pageA = await createTestPage(db, { client_id: client1.id, created_by: user1.id });
			const pageB = await createTestPage(db, { client_id: client1.id, created_by: user1.id });

			await createTestPageInstance(db, {
				client_id: client1.id,
				page_id: pageA.id,
				checklist_id: checklist.id,
				created_by: user1.id,
			});

			const instanceB = await createTestPageInstance(db, {
				client_id: client1.id,
				page_id: pageB.id,
				checklist_id: checklist.id,
				created_by: user1.id,
			});

			const questionA = await createTestQuestion(db, { client_id: client1.id, page_id: pageA.id, created_by: user1.id });
			await createTestAnswer(db, {
				client_id: client1.id,
				question_id: questionA.id,
				created_by: user1.id,
				calls_instance_id: instanceB.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getAnswerCallGraph(ctx2, checklist.id);

			// Should return empty because client2 user can't see client1's data
			expect(result.length).toBe(0);
		});
	});

	describe('modifyAnswer', () => {
		it('should update answer text', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const answer = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'Original' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await modifyAnswer(ctx, page.id, answer.id, { text: 'Updated' });

			expect(result.text).toBe('Updated');
		});

		it('should update answer grade', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const answer = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, grade: 1 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await modifyAnswer(ctx, page.id, answer.id, { grade: 5 });

			// grade is numeric in DB, returns as string
			expect(result.grade).toBe('5');
		});

		it('should update multiple fields', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const answer = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await modifyAnswer(ctx, page.id, answer.id, {
				text: 'New text',
				description_text: 'New description',
				has_additional_info: true,
				hidden: true,
			});

			expect(result.text).toBe('New text');
			expect(result.description_text).toBe('New description');
			expect(result.has_additional_info).toBe(true);
			expect(result.hidden).toBe(true);
		});

		it('should reorder when position changes (moving up)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });

			const a1 = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'A1', position: 0 });
			const a2 = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'A2', position: 1 });
			const a3 = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'A3', position: 2 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Move a3 to position 0
			await modifyAnswer(ctx, page.id, a3.id, { position: 0 });

			const answers = await db
				.selectFrom('answer')
				.select(['id', 'position'])
				.where('question_id', '=', question.id)
				.orderBy('position')
				.execute();

			expect(answers.find((a) => a.id === a3.id)?.position).toBe(0);
			expect(answers.find((a) => a.id === a1.id)?.position).toBe(1);
			expect(answers.find((a) => a.id === a2.id)?.position).toBe(2);
		});

		it('should reorder when position changes (moving down)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });

			const a1 = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'A1', position: 0 });
			const a2 = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'A2', position: 1 });
			const a3 = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'A3', position: 2 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Move a1 to position 2
			await modifyAnswer(ctx, page.id, a1.id, { position: 2 });

			const answers = await db
				.selectFrom('answer')
				.select(['id', 'position'])
				.where('question_id', '=', question.id)
				.orderBy('position')
				.execute();

			expect(answers.find((a) => a.id === a2.id)?.position).toBe(0);
			expect(answers.find((a) => a.id === a3.id)?.position).toBe(1);
			expect(answers.find((a) => a.id === a1.id)?.position).toBe(2);
		});

		it('should bump page version', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const answer = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id });
			const originalVersion = page.version;

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await modifyAnswer(ctx, page.id, answer.id, { text: 'Updated' });

			const updatedPage = await db
				.selectFrom('page')
				.select('version')
				.where('id', '=', page.id)
				.executeTakeFirst();

			expect(updatedPage?.version).toBe(originalVersion + 1);
		});

		it('should detect and prevent cycles when updating calls_instance_id', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });

			const pageA = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const pageB = await createTestPage(db, { client_id: client.id, created_by: user.id });

			const instanceA = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: pageA.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			const instanceB = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: pageB.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			// Create question on pageA that calls instanceB
			const questionA = await createTestQuestion(db, { client_id: client.id, page_id: pageA.id, created_by: user.id });
			await createTestAnswer(db, {
				client_id: client.id,
				question_id: questionA.id,
				created_by: user.id,
				calls_instance_id: instanceB.id,
			});

			// Create question on pageB with no call
			const questionB = await createTestQuestion(db, { client_id: client.id, page_id: pageB.id, created_by: user.id });
			const answerB = await createTestAnswer(db, {
				client_id: client.id,
				question_id: questionB.id,
				created_by: user.id,
				calls_instance_id: null,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Try to update answerB to call instanceA (would create cycle: A->B->A)
			await expect(
				modifyAnswer(ctx, pageB.id, answerB.id, { calls_instance_id: instanceA.id })
			).rejects.toThrow(/would create a cycle/);
		});

		it('should allow updating calls_instance_id to null', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });

			const pageA = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const pageB = await createTestPage(db, { client_id: client.id, created_by: user.id });

			await createTestPageInstance(db, {
				client_id: client.id,
				page_id: pageA.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			const instanceB = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: pageB.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			const questionA = await createTestQuestion(db, { client_id: client.id, page_id: pageA.id, created_by: user.id });
			const answer = await createTestAnswer(db, {
				client_id: client.id,
				question_id: questionA.id,
				created_by: user.id,
				calls_instance_id: instanceB.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await modifyAnswer(ctx, pageA.id, answer.id, { calls_instance_id: null });

			expect(result.calls_instance_id).toBeNull();
		});
	});
});
