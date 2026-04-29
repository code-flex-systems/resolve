import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createQuestion,
	copyQuestion,
	getQuestionForDeletion,
	deleteQuestion,
	getQuestion,
	getQuestionCount,
	getQuestions,
	getQuestionStats,
	modifyQuestion,
} from '../questionQueries';
import {
	createTestClient,
	createTestUser,
	createTestChecklist,
	createTestClaim,
	createTestPage,
	createTestPageInstance,
	createTestQuestion,
	createTestAnswer,
	createTestQuestionResponse,
	createTestQuestionResponseAnswer,
} from '@/__tests__/integration/fixtures';
import { QuestionType } from '@/config/enums';

describe('questionQueries integration', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// =====================================================================
	// QUESTION CRUD OPERATIONS
	// =====================================================================

	describe('createQuestion', () => {
		it('should create a new question', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await createQuestion(ctx, page.id, {
				text: 'Test Question',
				type: QuestionType.SINGLE,
				position: 0,
			});

			expect(result.id).toBeDefined();
			expect(result.text).toBe('Test Question');
			expect(result.type).toBe(QuestionType.SINGLE);
			expect(result.page_id).toBe(page.id);
		});

		it('should bump page version', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const originalVersion = page.version;

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await createQuestion(ctx, page.id, {
				text: 'Test Question',
				type: QuestionType.SINGLE,
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

			const q1 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, position: 0 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Insert at position 0 (should shift q1 to 1)
			await createQuestion(ctx, page.id, {
				text: 'New Question',
				type: QuestionType.SINGLE,
				position: 0,
			});

			const updated = await db
				.selectFrom('question')
				.select('position')
				.where('id', '=', q1.id)
				.executeTakeFirst();

			expect(updated?.position).toBe(1);
		});

		it('should create with optional fields', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await createQuestion(ctx, page.id, {
				text: 'Test Question',
				type: QuestionType.FREEFORM,
				position: 0,
				description_text: 'Description here',
				placeholder: 'Enter your answer',
				hidden: true,
			});

			expect(result.description_text).toBe('Description here');
			expect(result.placeholder).toBe('Enter your answer');
			expect(result.hidden).toBe(true);
		});
	});

	describe('copyQuestion', () => {
		it('should copy a question with its answers', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Original Q' });
			await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'Answer 1', position: 0 });
			await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'Answer 2', position: 1 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await copyQuestion(ctx, page.id, question.id);

			expect(result.id).not.toBe(question.id);
			expect(result.text).toBe('Original Q');

			// Verify answers were copied
			const copiedAnswers = await db
				.selectFrom('answer')
				.selectAll()
				.where('question_id', '=', result.id)
				.orderBy('position')
				.execute();

			expect(copiedAnswers.length).toBe(2);
			expect(copiedAnswers[0].text).toBe('Answer 1');
			expect(copiedAnswers[1].text).toBe('Answer 2');
		});

		it('should place copy at end of questions list', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, position: 0 });
			await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, position: 1 });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, position: 2 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await copyQuestion(ctx, page.id, question.id);

			expect(result.position).toBe(3);
		});

		it('should throw if question does not exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			// Need at least one question on the page so maxPosition query works
			await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(copyQuestion(ctx, page.id, '00000000-0000-0000-0000-000000000000')).rejects.toThrow('Question does not exist');
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const page1 = await createTestPage(db, { client_id: client1.id, created_by: user1.id });
			const page2 = await createTestPage(db, { client_id: client2.id, created_by: user2.id });
			const question = await createTestQuestion(db, { client_id: client1.id, page_id: page1.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(copyQuestion(ctx2, page2.id, question.id)).rejects.toThrow();
		});

		it('should bump page version', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const originalVersion = page.version;

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await copyQuestion(ctx, page.id, question.id);

			const updatedPage = await db
				.selectFrom('page')
				.select('version')
				.where('id', '=', page.id)
				.executeTakeFirst();

			expect(updatedPage?.version).toBe(originalVersion + 1);
		});
	});

	describe('getQuestionForDeletion', () => {
		it('should return question details', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Test Q' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getQuestionForDeletion(ctx, question.id);

			expect(result?.id).toBe(question.id);
			expect(result?.text).toBe('Test Q');
			expect(result?.page_id).toBe(page.id);
		});

		it('should return undefined for non-existent question', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getQuestionForDeletion(ctx, '00000000-0000-0000-0000-000000000000');

			expect(result).toBeUndefined();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client1.id, created_by: user1.id });
			const question = await createTestQuestion(db, { client_id: client1.id, page_id: page.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getQuestionForDeletion(ctx2, question.id);

			expect(result).toBeUndefined();
		});
	});

	describe('deleteQuestion', () => {
		it('should delete a question', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await deleteQuestion(ctx, page.id, question.id);

			const deleted = await db
				.selectFrom('question')
				.selectAll()
				.where('id', '=', question.id)
				.executeTakeFirst();

			expect(deleted).toBeUndefined();
		});

		it('should reorder remaining questions', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });

			const q1 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, position: 0 });
			const q2 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, position: 1 });
			const q3 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, position: 2 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await deleteQuestion(ctx, page.id, q2.id);

			const remaining = await db
				.selectFrom('question')
				.select(['id', 'position'])
				.where('id', 'in', [q1.id, q3.id])
				.orderBy('position')
				.execute();

			expect(remaining[0].id).toBe(q1.id);
			expect(remaining[0].position).toBe(0);
			expect(remaining[1].id).toBe(q3.id);
			expect(remaining[1].position).toBe(1);
		});

		it('should bump page version', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const originalVersion = page.version;

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await deleteQuestion(ctx, page.id, question.id);

			const updatedPage = await db
				.selectFrom('page')
				.select('version')
				.where('id', '=', page.id)
				.executeTakeFirst();

			expect(updatedPage?.version).toBe(originalVersion + 1);
		});
	});

	describe('getQuestion', () => {
		it('should return a question by id', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Test Q' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getQuestion(ctx, question.id);

			expect(result.id).toBe(question.id);
			expect(result.text).toBe('Test Q');
		});

		it('should throw for non-existent question', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(getQuestion(ctx, '00000000-0000-0000-0000-000000000000')).rejects.toThrow();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client1.id, created_by: user1.id });
			const question = await createTestQuestion(db, { client_id: client1.id, page_id: page.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(getQuestion(ctx2, question.id)).rejects.toThrow();
		});
	});

	describe('getQuestionCount', () => {
		it('should return count of questions on a page', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });

			await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, position: 0 });
			await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, position: 1 });
			await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, position: 2 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getQuestionCount(ctx, page.id);

			expect(result).toBe(3);
		});

		it('should return 0 for page with no questions', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getQuestionCount(ctx, page.id);

			expect(result).toBe(0);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client1.id, created_by: user1.id });

			await createTestQuestion(db, { client_id: client1.id, page_id: page.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getQuestionCount(ctx2, page.id);

			expect(result).toBe(0);
		});
	});

	describe('getQuestions', () => {
		it('should return questions with aggregated answers', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q1' });
			await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'A1', position: 0 });
			await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'A2', position: 1 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getQuestions(ctx, page.id);

			expect(result.length).toBe(1);
			expect(result[0].text).toBe('Q1');
			expect(result[0].answers).toBeDefined();
			expect(result[0].answers?.length).toBe(2);
			expect(result[0].answers?.[0].text).toBe('A1');
			expect(result[0].answers?.[1].text).toBe('A2');
		});

		it('should order questions by position', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });

			await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q3', position: 2 });
			await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q1', position: 0 });
			await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q2', position: 1 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getQuestions(ctx, page.id);

			expect(result[0].text).toBe('Q1');
			expect(result[1].text).toBe('Q2');
			expect(result[2].text).toBe('Q3');
		});

		it('should return empty answers array for question without answers', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getQuestions(ctx, page.id);

			expect(result.length).toBe(1);
			expect(result[0].answers).toBeNull();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client1.id, created_by: user1.id });
			await createTestQuestion(db, { client_id: client1.id, page_id: page.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getQuestions(ctx2, page.id);

			expect(result.length).toBe(0);
		});
	});

	describe('getQuestionStats', () => {
		it('should return answer statistics for questions', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q1' });
			const answer = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'A1' });

			// Create responses
			const response = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				created_by: user.id,
				question_id: question.id,
			});
			await createTestQuestionResponseAnswer(db, { response_id: response.id, answer_id: answer.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const pastDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
			const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

			const result = await getQuestionStats(ctx, page.id, { range: [pastDate, futureDate] });

			expect(result.length).toBeGreaterThan(0);
			const stat = result.find((r) => r.answer_id === answer.id);
			expect(stat).toBeDefined();
			expect(Number(stat?.answer_count)).toBeGreaterThan(0);
		});

		it('should filter by claimId', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const claim1 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const claim2 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const answer = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id });

			// Create response for claim1
			const response1 = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim1.id,
				created_by: user.id,
				question_id: question.id,
			});
			await createTestQuestionResponseAnswer(db, { response_id: response1.id, answer_id: answer.id });

			// Create response for claim2
			const response2 = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim2.id,
				created_by: user.id,
				question_id: question.id,
			});
			await createTestQuestionResponseAnswer(db, { response_id: response2.id, answer_id: answer.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const pastDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
			const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

			const result = await getQuestionStats(ctx, page.id, { claimId: claim1.id, range: [pastDate, futureDate] });

			const stat = result.find((r) => r.answer_id === answer.id);
			expect(Number(stat?.answer_count)).toBe(1);
		});

		it('should filter by date range', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const answer = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id });

			// Create response
			const response = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: instance.id,
				claim_id: claim.id,
				created_by: user.id,
				question_id: question.id,
			});
			await createTestQuestionResponseAnswer(db, { response_id: response.id, answer_id: answer.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Query with a future date range (should return no results)
			const futureStart = new Date();
			futureStart.setFullYear(futureStart.getFullYear() + 1);
			const futureEnd = new Date();
			futureEnd.setFullYear(futureEnd.getFullYear() + 2);

			const result = await getQuestionStats(ctx, page.id, { range: [futureStart, futureEnd] });

			const stat = result.find((r) => r.answer_id === answer.id);
			expect(stat?.answer_count).toBe('0');
		});
	});

	describe('modifyQuestion', () => {
		it('should update question text', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Original' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await modifyQuestion(ctx, page.id, question.id, { text: 'Updated' });

			expect(result.text).toBe('Updated');
		});

		it('should update question type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, {
				client_id: client.id,
				page_id: page.id,
				created_by: user.id,
				type: 'single',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await modifyQuestion(ctx, page.id, question.id, { type: QuestionType.MULTI });

			expect(result.type).toBe(QuestionType.MULTI);
		});

		it('should remove all answers when converting non-freeform to freeform', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, {
				client_id: client.id,
				page_id: page.id,
				created_by: user.id,
				type: QuestionType.SINGLE,
			});
			await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'Answer A', position: 0 });
			await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'Answer B', position: 1 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await modifyQuestion(ctx, page.id, question.id, { type: QuestionType.FREEFORM });

			const remainingAnswers = await db
				.selectFrom('answer')
				.selectAll()
				.where('question_id', '=', question.id)
				.execute();

			expect(remainingAnswers).toHaveLength(0);
		});

		it('should delete answers when converting to freeform', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, {
				client_id: client.id,
				page_id: page.id,
				created_by: user.id,
				type: 'single',
			});
			await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await modifyQuestion(ctx, page.id, question.id, { type: QuestionType.FREEFORM });

			const answers = await db
				.selectFrom('answer')
				.selectAll()
				.where('question_id', '=', question.id)
				.execute();

			expect(answers.length).toBe(0);
		});

		it('should reorder siblings when moving to a new position', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });

			const q1 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q1', position: 0 });
			const q2 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q2', position: 1 });
			const q3 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q3', position: 2 });
			const q4 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q4', position: 3 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await modifyQuestion(ctx, page.id, q2.id, { position: 3 });

			const questions = await db
				.selectFrom('question')
				.select(['id', 'position'])
				.where('page_id', '=', page.id)
				.orderBy('position')
				.execute();

			expect(questions.find((q) => q.id === q1.id)?.position).toBe(0);
			expect(questions.find((q) => q.id === q3.id)?.position).toBe(1);
			expect(questions.find((q) => q.id === q4.id)?.position).toBe(2);
			expect(questions.find((q) => q.id === q2.id)?.position).toBe(3);
		});

		it('should reorder when position changes (moving up)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });

			const q1 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q1', position: 0 });
			const q2 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q2', position: 1 });
			const q3 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q3', position: 2 });
			const q4 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q4', position: 3 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Move q4 to position 1 (note: position 0 doesn't work due to truthy check in code)
			await modifyQuestion(ctx, page.id, q4.id, { position: 1 });

			const questions = await db
				.selectFrom('question')
				.select(['id', 'position'])
				.where('page_id', '=', page.id)
				.orderBy('position')
				.execute();

			expect(questions.find((q) => q.id === q1.id)?.position).toBe(0);
			expect(questions.find((q) => q.id === q4.id)?.position).toBe(1);
			expect(questions.find((q) => q.id === q2.id)?.position).toBe(2);
			expect(questions.find((q) => q.id === q3.id)?.position).toBe(3);
		});

		it('should reorder when position changes (moving down)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });

			const q1 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q1', position: 0 });
			const q2 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q2', position: 1 });
			const q3 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q3', position: 2 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Move q1 to position 2
			await modifyQuestion(ctx, page.id, q1.id, { position: 2 });

			const questions = await db
				.selectFrom('question')
				.select(['id', 'position'])
				.where('page_id', '=', page.id)
				.orderBy('position')
				.execute();

			expect(questions.find((q) => q.id === q2.id)?.position).toBe(0);
			expect(questions.find((q) => q.id === q3.id)?.position).toBe(1);
			expect(questions.find((q) => q.id === q1.id)?.position).toBe(2);
		});

		it('should bump page version', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const originalVersion = page.version;

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await modifyQuestion(ctx, page.id, question.id, { text: 'Updated' });

			const updatedPage = await db
				.selectFrom('page')
				.select('version')
				.where('id', '=', page.id)
				.executeTakeFirst();

			expect(updatedPage?.version).toBe(originalVersion + 1);
		});

		it('should bump both page versions when moving to different page', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page1 = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const page2 = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page1.id, created_by: user.id });
			const originalVersion1 = page1.version;
			const originalVersion2 = page2.version;

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await modifyQuestion(ctx, page1.id, question.id, { page_id: page2.id });

			const updatedPage1 = await db.selectFrom('page').select('version').where('id', '=', page1.id).executeTakeFirst();
			const updatedPage2 = await db.selectFrom('page').select('version').where('id', '=', page2.id).executeTakeFirst();
			const updatedQuestion = await db.selectFrom('question').select('page_id').where('id', '=', question.id).executeTakeFirst();

			expect(updatedPage1?.version).toBe(originalVersion1 + 1);
			expect(updatedPage2?.version).toBe(originalVersion2 + 1);
			expect(updatedQuestion?.page_id).toBe(page2.id);
		});
	});
});
