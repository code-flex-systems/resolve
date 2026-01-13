import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createPage,
	copyPageTemplate,
	createPageInstance,
	getPageInstanceForDeletion,
	deletePageInstance,
	getPage,
	getPages,
	getPageInstance,
	getPageInstances,
	getPageInstancesForClaim,
	getVisiblePageInstances,
	modifyPage,
	modifyPageInstanceStatus,
} from '../pageQueries';
import { getPageInstanceTree } from '@/api/controllers/pageController';
import {
	createTestClient,
	createTestUser,
	createTestChecklist,
	createTestPage,
	createTestPageInstance,
	createTestQuestion,
	createTestAnswer,
	createTestClaim,
	createTestQuestionResponse,
	createTestQuestionResponseAnswer,
	createTestAnswerCallEdge,
} from '@/__tests__/integration/fixtures';
import { PageInstanceStatus } from '@/config/enums';

describe('pageQueries integration', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// =====================================================================
	// PAGE TEMPLATE OPERATIONS
	// =====================================================================

	describe('createPage', () => {
		it('should create a new page template and instance', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await createPage(ctx, checklist.id, {
				title: 'Test Page',
				parentId: -1,
				position: 0,
			});

			expect(result.id).toBeDefined();
			expect(result.title).toBe('Test Page');
			expect(result.instance_id).toBeDefined();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client1.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Creating page for client2 user in client1's checklist
			// The page will be created with client2's client_id
			const result = await createPage(ctx2, checklist.id, {
				title: 'Test Page',
				parentId: -1,
				position: 0,
			});

			// The page is created with client2's client_id
			const page = await db
				.selectFrom('page')
				.selectAll()
				.where('id', '=', result.id)
				.executeTakeFirst();

			expect(page?.client_id).toBe(client2.id);
		});
	});

	describe('copyPageTemplate', () => {
		it('should copy a page template with questions and answers', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Original' });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id, text: 'Q1' });
			await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'A1' });
			await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id, text: 'A2', position: 1 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await copyPageTemplate(ctx, checklist.id, page.id, { parentId: -1, position: 0 });

			expect(result.id).not.toBe(page.id);
			expect(result.title).toBe('Original');
			expect(result.instance_id).toBeDefined();

			// Verify questions were copied
			const copiedQuestions = await db
				.selectFrom('question')
				.selectAll()
				.where('page_id', '=', result.id)
				.execute();
			expect(copiedQuestions.length).toBe(1);
			expect(copiedQuestions[0].text).toBe('Q1');

			// Verify answers were copied
			const copiedAnswers = await db
				.selectFrom('answer')
				.selectAll()
				.where('question_id', '=', copiedQuestions[0].id)
				.execute();
			expect(copiedAnswers.length).toBe(2);
		});

		it('should throw if page template does not exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(
				copyPageTemplate(ctx, checklist.id, 999999, { parentId: -1, position: 0 })
			).rejects.toThrow('Page template does not exist');
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client2.id, created_by: user2.id });
			const page = await createTestPage(db, { client_id: client1.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(
				copyPageTemplate(ctx2, checklist.id, page.id, { parentId: -1, position: 0 })
			).rejects.toThrow();
		});

		it('should create answer_call_edges for answers that reference instances (bulk INSERT)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });

			// Create multiple target page instances that will be referenced by answers
			const targetPage1 = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Target1' });
			const targetPage2 = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Target2' });
			const targetInstance1 = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: targetPage1.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});
			const targetInstance2 = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: targetPage2.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			// Create source page with MULTIPLE questions, each with answers that call different instances
			// This tests the bulk INSERT with VALUES-based mapping
			const sourcePage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Source' });

			// Question 1 with 2 answers (1 with calls_instance_id)
			const question1 = await createTestQuestion(db, {
				client_id: client.id,
				page_id: sourcePage.id,
				created_by: user.id,
				text: 'Q1',
				position: 0,
			});
			await createTestAnswer(db, {
				client_id: client.id,
				question_id: question1.id,
				created_by: user.id,
				text: 'Q1-A1 - calls target1',
				calls_instance_id: targetInstance1.id,
				position: 0,
			});
			await createTestAnswer(db, {
				client_id: client.id,
				question_id: question1.id,
				created_by: user.id,
				text: 'Q1-A2 - no call',
				position: 1,
			});

			// Question 2 with 2 answers (both with calls_instance_id to different targets)
			const question2 = await createTestQuestion(db, {
				client_id: client.id,
				page_id: sourcePage.id,
				created_by: user.id,
				text: 'Q2',
				position: 1,
			});
			await createTestAnswer(db, {
				client_id: client.id,
				question_id: question2.id,
				created_by: user.id,
				text: 'Q2-A1 - calls target1',
				calls_instance_id: targetInstance1.id,
				position: 0,
			});
			await createTestAnswer(db, {
				client_id: client.id,
				question_id: question2.id,
				created_by: user.id,
				text: 'Q2-A2 - calls target2',
				calls_instance_id: targetInstance2.id,
				position: 1,
			});

			// Question 3 with 1 answer (no calls_instance_id)
			const question3 = await createTestQuestion(db, {
				client_id: client.id,
				page_id: sourcePage.id,
				created_by: user.id,
				text: 'Q3',
				position: 2,
			});
			await createTestAnswer(db, {
				client_id: client.id,
				question_id: question3.id,
				created_by: user.id,
				text: 'Q3-A1 - no call',
				position: 0,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Copy the page template - this should use the bulk INSERT with VALUES mapping
			const result = await copyPageTemplate(ctx, checklist.id, sourcePage.id, { parentId: -1, position: 0 });

			// Verify all questions were copied
			const copiedQuestions = await db
				.selectFrom('question')
				.selectAll()
				.where('page_id', '=', result.id)
				.orderBy('position')
				.execute();
			expect(copiedQuestions.length).toBe(3);
			expect(copiedQuestions[0].text).toBe('Q1');
			expect(copiedQuestions[1].text).toBe('Q2');
			expect(copiedQuestions[2].text).toBe('Q3');

			// Verify all answers were copied with correct calls_instance_id preserved
			const allCopiedAnswers = await db
				.selectFrom('answer')
				.selectAll()
				.where(
					'question_id',
					'in',
					copiedQuestions.map((q) => q.id)
				)
				.execute();
			expect(allCopiedAnswers.length).toBe(5); // 2 + 2 + 1

			// Count answers with calls_instance_id
			const answersWithCalls = allCopiedAnswers.filter((a) => a.calls_instance_id !== null);
			expect(answersWithCalls.length).toBe(3); // Q1-A1, Q2-A1, Q2-A2

			// Verify answer_call_edges were created for ALL copied answers with calls_instance_id
			const edges = await db
				.selectFrom('answer_call_edges')
				.selectAll()
				.where('from_instance_id', '=', result.instance_id)
				.execute();

			expect(edges.length).toBe(3); // One edge per answer with calls_instance_id

			// Verify edge targets
			const edgeTargets = edges.map((e) => e.to_instance_id).sort();
			expect(edgeTargets).toEqual([targetInstance1.id, targetInstance1.id, targetInstance2.id].sort());

			// Verify all edges have correct checklist_id and client_id
			expect(edges.every((e) => e.checklist_id === checklist.id)).toBe(true);
			expect(edges.every((e) => e.client_id === client.id)).toBe(true);
		});
	});

	describe('getPage', () => {
		it('should return a page template by id', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'My Page' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPage(ctx, page.id);

			expect(result.id).toBe(page.id);
			expect(result.title).toBe('My Page');
		});

		it('should throw for non-existent page', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(getPage(ctx, 999999)).rejects.toThrow();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client1.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(getPage(ctx2, page.id)).rejects.toThrow();
		});
	});

	describe('getPages', () => {
		it('should return all visible pages for a client', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const ts = Date.now();
			await createTestPage(db, { client_id: client.id, created_by: user.id, title: `Page1 ${ts}`, hidden: false });
			await createTestPage(db, { client_id: client.id, created_by: user.id, title: `Page2 ${ts}`, hidden: false });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPages(ctx);

			expect(result.filter((p) => p.title.includes(ts.toString())).length).toBe(2);
		});

		it('should exclude hidden pages', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const ts = Date.now();
			const visible = await createTestPage(db, { client_id: client.id, created_by: user.id, title: `Visible ${ts}`, hidden: false });
			await createTestPage(db, { client_id: client.id, created_by: user.id, title: `Hidden ${ts}`, hidden: true });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPages(ctx);

			expect(result.some((p) => p.id === visible.id)).toBe(true);
			expect(result.filter((p) => p.title.includes(ts.toString())).length).toBe(1);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client1.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getPages(ctx2);

			expect(result.some((p) => p.id === page.id)).toBe(false);
		});
	});

	describe('modifyPage', () => {
		it('should update page title', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Original' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await modifyPage(ctx, page.id, { title: 'Updated' });

			expect(result.title).toBe('Updated');
		});

		it('should update page hidden flag', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id, hidden: false });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await modifyPage(ctx, page.id, { hidden: true });

			expect(result.hidden).toBe(true);
		});

		it('should throw if no updates provided', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(modifyPage(ctx, page.id, {})).rejects.toThrow('No updates');
		});
	});

	// =====================================================================
	// PAGE INSTANCE OPERATIONS
	// =====================================================================

	describe('createPageInstance', () => {
		it('should create a page instance linked to a checklist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await createPageInstance(ctx, {
				checklistId: checklist.id,
				pageId: page.id,
				parentId: -1,
				position: 0,
			});

			expect(result.id).toBeDefined();
			expect(result.checklist_id).toBe(checklist.id);
			expect(result.page_id).toBe(page.id);
		});

		it('should shift positions when inserting', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page1 = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const page2 = await createTestPage(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Create first instance at position 0
			const inst1 = await createPageInstance(ctx, {
				checklistId: checklist.id,
				pageId: page1.id,
				parentId: -1,
				position: 0,
			});

			// Create second instance at position 0 (should shift first to 1)
			await createPageInstance(ctx, {
				checklistId: checklist.id,
				pageId: page2.id,
				parentId: -1,
				position: 0,
			});

			// Check inst1 was shifted
			const updated = await db
				.selectFrom('page_instance')
				.select('position')
				.where('id', '=', inst1.id)
				.executeTakeFirst();

			expect(updated?.position).toBe(1);
		});

		it('should create answer_call_edges for existing page with calls_instance_id answers', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });

			// Create a target page instance that will be referenced by an answer
			const targetPage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Target' });
			const targetInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: targetPage.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			// Create a page with a question and answer that references the target instance
			const sourcePage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Source' });
			const question = await createTestQuestion(db, {
				client_id: client.id,
				page_id: sourcePage.id,
				created_by: user.id,
				text: 'Q1',
			});
			const answer = await createTestAnswer(db, {
				client_id: client.id,
				question_id: question.id,
				created_by: user.id,
				text: 'A1 - calls target',
				calls_instance_id: targetInstance.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Create a new instance of the source page (this should create answer_call_edges)
			const newInstance = await createPageInstance(ctx, {
				checklistId: checklist.id,
				pageId: sourcePage.id,
				parentId: -1,
				position: 0,
			});

			// Verify answer_call_edges were created for the new instance
			const edges = await db
				.selectFrom('answer_call_edges')
				.selectAll()
				.where('from_instance_id', '=', newInstance.id)
				.execute();

			expect(edges.length).toBe(1);
			expect(edges[0].answer_id).toBe(answer.id);
			expect(edges[0].to_instance_id).toBe(targetInstance.id);
			expect(edges[0].checklist_id).toBe(checklist.id);
		});
	});

	describe('getPageInstanceForDeletion', () => {
		it('should return page instance with page title', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Test Title' });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPageInstanceForDeletion(ctx, instance.id);

			expect(result?.id).toBe(instance.id);
			expect(result?.title).toBe('Test Title');
		});

		it('should return undefined for non-existent instance', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPageInstanceForDeletion(ctx, 999999);

			expect(result).toBeUndefined();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client1.id, created_by: user1.id });
			const page = await createTestPage(db, { client_id: client1.id, created_by: user1.id });
			const instance = await createTestPageInstance(db, {
				client_id: client1.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getPageInstanceForDeletion(ctx2, instance.id);

			expect(result).toBeUndefined();
		});
	});

	describe('deletePageInstance', () => {
		it('should delete a page instance', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await deletePageInstance(ctx, instance.id);

			const deleted = await db
				.selectFrom('page_instance')
				.selectAll()
				.where('id', '=', instance.id)
				.executeTakeFirst();

			expect(deleted).toBeUndefined();
		});

		it('should reorder remaining instances after deletion', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page1 = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const page2 = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const page3 = await createTestPage(db, { client_id: client.id, created_by: user.id });

			const inst1 = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page1.id,
				checklist_id: checklist.id,
				created_by: user.id,
				position: 0,
			});
			const inst2 = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page2.id,
				checklist_id: checklist.id,
				created_by: user.id,
				position: 1,
			});
			const inst3 = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page3.id,
				checklist_id: checklist.id,
				created_by: user.id,
				position: 2,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Delete middle instance
			await deletePageInstance(ctx, inst2.id);

			// Check positions were updated
			const remaining = await db
				.selectFrom('page_instance')
				.select(['id', 'position'])
				.where('id', 'in', [inst1.id, inst3.id])
				.orderBy('position')
				.execute();

			expect(remaining[0].id).toBe(inst1.id);
			expect(remaining[0].position).toBe(0);
			expect(remaining[1].id).toBe(inst3.id);
			expect(remaining[1].position).toBe(1);
		});

		it('should clear answer calls_instance_id references', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const targetInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});
			const answer = await createTestAnswer(db, {
				client_id: client.id,
				question_id: question.id,
				created_by: user.id,
				calls_instance_id: targetInstance.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await deletePageInstance(ctx, targetInstance.id);

			// Verify answer's calls_instance_id was cleared
			const updatedAnswer = await db
				.selectFrom('answer')
				.select('calls_instance_id')
				.where('id', '=', answer.id)
				.executeTakeFirst();

			expect(updatedAnswer?.calls_instance_id).toBeNull();
		});

		it('should clear answer calls, delete instance comments, and reorder siblings', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const page1 = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Page 1' });
			const page2 = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Page 2' });
			const page3 = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Page 3' });
			const question = await createTestQuestion(db, {
				client_id: client.id,
				page_id: page1.id,
				created_by: user.id,
			});

			const inst1 = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page1.id,
				checklist_id: checklist.id,
				created_by: user.id,
				position: 0,
			});
			const inst2 = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page2.id,
				checklist_id: checklist.id,
				created_by: user.id,
				position: 1,
			});
			const inst3 = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page3.id,
				checklist_id: checklist.id,
				created_by: user.id,
				position: 2,
			});

			const answer = await createTestAnswer(db, {
				client_id: client.id,
				question_id: question.id,
				created_by: user.id,
				text: 'Answer referencing instance',
				calls_instance_id: inst2.id,
			});

			const comment = await db
				.insertInto('comment')
				.values({
					checklist_id: checklist.id,
					claim_id: claim.id,
					instance_id: inst2.id,
					body: 'Instance comment',
					client_id: client.id,
					created_by: user.id,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await deletePageInstance(ctx, inst2.id);

			const updatedAnswer = await db
				.selectFrom('answer')
				.select('calls_instance_id')
				.where('id', '=', answer.id)
				.executeTakeFirst();
			expect(updatedAnswer?.calls_instance_id).toBeNull();

			const deletedComment = await db
				.selectFrom('comment')
				.selectAll()
				.where('id', '=', comment.id)
				.executeTakeFirst();
			expect(deletedComment).toBeUndefined();

			const remaining = await db
				.selectFrom('page_instance')
				.select(['id', 'position'])
				.where('id', 'in', [inst1.id, inst3.id])
				.orderBy('position')
				.execute();

			expect(remaining[0].id).toBe(inst1.id);
			expect(remaining[0].position).toBe(0);
			expect(remaining[1].id).toBe(inst3.id);
			expect(remaining[1].position).toBe(1);
		});
	});

	describe('getPageInstance', () => {
		it('should return a page instance with page template data', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Test' });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
				position: 5,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPageInstance(ctx, instance.id);

			expect(result.id).toBe(page.id);
			expect(result.title).toBe('Test');
			expect(result.instance_id).toBe(instance.id);
			expect(result.position).toBe(5);
		});

		it('should throw for non-existent instance', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(getPageInstance(ctx, 999999)).rejects.toThrow();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client1.id, created_by: user1.id });
			const page = await createTestPage(db, { client_id: client1.id, created_by: user1.id });
			const instance = await createTestPageInstance(db, {
				client_id: client1.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(getPageInstance(ctx2, instance.id)).rejects.toThrow();
		});
	});

	describe('getPageInstances', () => {
		it('should return all page instances for a checklist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page1 = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Page 1' });
			const page2 = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Page 2' });

			await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page1.id,
				checklist_id: checklist.id,
				created_by: user.id,
				position: 0,
			});
			await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page2.id,
				checklist_id: checklist.id,
				created_by: user.id,
				position: 1,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPageInstances(ctx, checklist.id);

			expect(result.length).toBe(2);
			expect(result[0].title).toBe('Page 1');
			expect(result[1].title).toBe('Page 2');
		});

		it('should filter by parentId = -1 (root pages)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const rootPage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Root' });
			const childPage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Child' });

			const rootInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: rootPage.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: null,
			});
			await createTestPageInstance(db, {
				client_id: client.id,
				page_id: childPage.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: rootInstance.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPageInstances(ctx, checklist.id, -1);

			expect(result.length).toBe(1);
			expect(result[0].title).toBe('Root');
		});

		it('should filter by specific parentId', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const rootPage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Root' });
			const childPage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Child' });

			const rootInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: rootPage.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: null,
			});
			await createTestPageInstance(db, {
				client_id: client.id,
				page_id: childPage.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: rootInstance.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPageInstances(ctx, checklist.id, rootInstance.id);

			expect(result.length).toBe(1);
			expect(result[0].title).toBe('Child');
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client1.id, created_by: user1.id });
			const page = await createTestPage(db, { client_id: client1.id, created_by: user1.id });

			await createTestPageInstance(db, {
				client_id: client1.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getPageInstances(ctx2, checklist.id);

			expect(result.length).toBe(0);
		});
	});

	describe('getPageInstancesForClaim', () => {
		it('should return page instances with status for a claim', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Test' });

			await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPageInstancesForClaim(ctx, checklist.id, claim.id);

			expect(result.length).toBe(1);
			expect(result[0].title).toBe('Test');
			expect(result[0].status).toBe(PageInstanceStatus.UNSTARTED);
		});

		it('should return STALE status when template version differs', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });

			// Update page version to 1 (default is 0)
			await db.updateTable('page').set({ version: 1 }).where('id', '=', page.id).execute();

			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			// Create a status with old template version (0 != 1)
			await db
				.insertInto('page_instance_status')
				.values({
					claim_id: claim.id,
					page_instance_id: instance.id,
					status: PageInstanceStatus.COMPLETE,
					template_version: 0, // Old version, page has version 1
					client_id: client.id,
				})
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPageInstancesForClaim(ctx, checklist.id, claim.id);

			expect(result[0].status).toBe(PageInstanceStatus.STALE);
		});

		it('should return COMPLETE status from page_instance_status', async () => {
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

			// Create status with matching template version
			await db
				.insertInto('page_instance_status')
				.values({
					claim_id: claim.id,
					page_instance_id: instance.id,
					status: PageInstanceStatus.COMPLETE,
					template_version: page.version,
					client_id: client.id,
				})
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPageInstancesForClaim(ctx, checklist.id, claim.id);

			expect(result[0].status).toBe(PageInstanceStatus.COMPLETE);
		});

		it('should filter by parentId = -1 (root pages)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const rootPage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Root' });
			const childPage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Child' });

			const rootInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: rootPage.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: null,
			});
			await createTestPageInstance(db, {
				client_id: client.id,
				page_id: childPage.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: rootInstance.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPageInstancesForClaim(ctx, checklist.id, claim.id, -1);

			expect(result.length).toBe(1);
			expect(result[0].title).toBe('Root');
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client1.id, created_by: user1.id });
			const claim = await createTestClaim(db, { client_id: client1.id, created_by: user1.id });
			const page = await createTestPage(db, { client_id: client1.id, created_by: user1.id });

			await createTestPageInstance(db, {
				client_id: client1.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getPageInstancesForClaim(ctx2, checklist.id, claim.id);

			expect(result.length).toBe(0);
		});
	});

	describe('getVisiblePageInstances', () => {
		it('should return root-level page instances', async () => {
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
				parent_instance_id: null,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getVisiblePageInstances(ctx, checklist.id, claim.id);

			expect(result).toContain(instance.id);
		});

		it('should include child instances called via answer responses', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			const rootPage = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const childPage = await createTestPage(db, { client_id: client.id, created_by: user.id });

			const rootInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: rootPage.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: null,
			});

			const childInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: childPage.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: rootInstance.id,
			});

			// Create question and answer that calls childInstance
			const question = await createTestQuestion(db, { client_id: client.id, page_id: rootPage.id, created_by: user.id });
			const answer = await createTestAnswer(db, {
				client_id: client.id,
				question_id: question.id,
				created_by: user.id,
				calls_instance_id: childInstance.id,
			});

			// Create the answer_call_edge (materialized edge for visibility checks)
			await createTestAnswerCallEdge(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				from_instance_id: rootInstance.id,
				to_instance_id: childInstance.id,
				answer_id: answer.id,
			});

			// Create response that selects this answer
			const response = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: rootInstance.id,
				claim_id: claim.id,
				created_by: user.id,
				question_id: question.id,
			});
			await createTestQuestionResponseAnswer(db, { response_id: response.id, answer_id: answer.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getVisiblePageInstances(ctx, checklist.id, claim.id);

			expect(result).toContain(rootInstance.id);
			expect(result).toContain(childInstance.id);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client1.id, created_by: user1.id });
			const claim = await createTestClaim(db, { client_id: client1.id, created_by: user1.id });
			const page = await createTestPage(db, { client_id: client1.id, created_by: user1.id });

			const instance = await createTestPageInstance(db, {
				client_id: client1.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user1.id,
				parent_instance_id: null,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getVisiblePageInstances(ctx2, checklist.id, claim.id);

			expect(result).not.toContain(instance.id);
		});
	});

	describe('modifyPageInstanceStatus', () => {
		it('should create page instance status', async () => {
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

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await modifyPageInstanceStatus(ctx, {
				claimId: claim.id,
				instanceIds: [instance.id],
				newStatus: PageInstanceStatus.COMPLETE,
				templateVersion: 1,
			});

			const status = await db
				.selectFrom('page_instance_status')
				.selectAll()
				.where('claim_id', '=', claim.id)
				.where('page_instance_id', '=', instance.id)
				.executeTakeFirst();

			expect(status?.status).toBe(PageInstanceStatus.COMPLETE);
			expect(status?.template_version).toBe(1);
		});

		it('should update existing page instance status (upsert)', async () => {
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

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Create initial status
			await modifyPageInstanceStatus(ctx, {
				claimId: claim.id,
				instanceIds: [instance.id],
				newStatus: PageInstanceStatus.IN_PROGRESS,
				templateVersion: 1,
			});

			// Update status
			await modifyPageInstanceStatus(ctx, {
				claimId: claim.id,
				instanceIds: [instance.id],
				newStatus: PageInstanceStatus.COMPLETE,
				templateVersion: 2,
			});

			const status = await db
				.selectFrom('page_instance_status')
				.selectAll()
				.where('claim_id', '=', claim.id)
				.where('page_instance_id', '=', instance.id)
				.executeTakeFirst();

			expect(status?.status).toBe(PageInstanceStatus.COMPLETE);
			expect(status?.template_version).toBe(2);
		});

		it('should handle multiple instance ids', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const page1 = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const page2 = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance1 = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page1.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});
			const instance2 = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page2.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await modifyPageInstanceStatus(ctx, {
				claimId: claim.id,
				instanceIds: [instance1.id, instance2.id],
				newStatus: PageInstanceStatus.COMPLETE,
				templateVersion: 1,
			});

			const statuses = await db
				.selectFrom('page_instance_status')
				.selectAll()
				.where('claim_id', '=', claim.id)
				.execute();

			expect(statuses.length).toBe(2);
			expect(statuses.every((s) => s.status === PageInstanceStatus.COMPLETE)).toBe(true);
		});
	});

	// =====================================================================
	// TREE BUILDING (Controller)
	// =====================================================================

	describe('getPageInstanceTree', () => {
		it('should return correct hierarchical structure with adjacency map', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });

			// Create a 3-level hierarchy:
			// Root1 (position 0)
			//   ├── Child1 (position 0)
			//   │   └── Grandchild1 (position 0)
			//   └── Child2 (position 1)
			// Root2 (position 1)

			const root1Page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Root1' });
			const root2Page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Root2' });
			const child1Page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Child1' });
			const child2Page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Child2' });
			const grandchild1Page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Grandchild1' });

			const root1 = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: root1Page.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: null,
				position: 0,
			});

			const root2 = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: root2Page.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: null,
				position: 1,
			});

			const child1 = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: child1Page.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: root1.id,
				position: 0,
			});

			const child2 = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: child2Page.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: root1.id,
				position: 1,
			});

			const grandchild1 = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: grandchild1Page.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: child1.id,
				position: 0,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPageInstanceTree(ctx, { checklistId: checklist.id });

			// Verify structure
			expect(result.tree.length).toBe(2); // 2 roots
			expect(result.maxPosition).toBe(5); // 5 total instances

			// Find Root1 and Root2 in the tree
			const root1Node = result.tree.find((n) => n.instanceId === root1.id);
			const root2Node = result.tree.find((n) => n.instanceId === root2.id);

			expect(root1Node).toBeDefined();
			expect(root2Node).toBeDefined();

			// Root1 should have 2 children
			expect(root1Node?.title).toBe('Root1');
			expect(root1Node?.children?.length).toBe(2);

			// Root2 should have no children
			expect(root2Node?.title).toBe('Root2');
			expect(root2Node?.children).toBeUndefined();

			// Verify Child1 and Child2 under Root1
			const child1Node = root1Node?.children?.find((n) => n.instanceId === child1.id);
			const child2Node = root1Node?.children?.find((n) => n.instanceId === child2.id);

			expect(child1Node).toBeDefined();
			expect(child1Node?.title).toBe('Child1');
			expect(child2Node).toBeDefined();
			expect(child2Node?.title).toBe('Child2');

			// Child1 should have 1 grandchild
			expect(child1Node?.children?.length).toBe(1);
			expect(child1Node?.children?.[0].instanceId).toBe(grandchild1.id);
			expect(child1Node?.children?.[0].title).toBe('Grandchild1');

			// Child2 should have no children
			expect(child2Node?.children).toBeUndefined();

			// Verify parent references are correct
			expect(root1Node?.parentInstanceId).toBeNull();
			expect(child1Node?.parentInstanceId).toBe(root1.id);
			expect(child1Node?.children?.[0].parentInstanceId).toBe(child1.id);
		});

		it('should return empty tree for checklist with no instances', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPageInstanceTree(ctx, { checklistId: checklist.id });

			expect(result.tree).toEqual([]);
			expect(result.maxPosition).toBe(0);
		});

		it('should include status when claimId is provided', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Test' });

			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: null,
			});

			// Create status for this instance
			await db
				.insertInto('page_instance_status')
				.values({
					claim_id: claim.id,
					page_instance_id: instance.id,
					status: PageInstanceStatus.COMPLETE,
					template_version: page.version,
					client_id: client.id,
				})
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPageInstanceTree(ctx, { checklistId: checklist.id, claimId: claim.id });

			expect(result.tree.length).toBe(1);
			expect(result.tree[0].status).toBe(PageInstanceStatus.COMPLETE);
		});

		it('should return children in position order', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });

			// Create parent and multiple children with specific positions
			const parentPage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Parent' });
			const childAPage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'ChildA' });
			const childBPage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'ChildB' });
			const childCPage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'ChildC' });

			const parent = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: parentPage.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: null,
				position: 0,
			});

			// Create children in non-sequential order to verify ordering works
			const childC = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: childCPage.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: parent.id,
				position: 2,
			});
			const childA = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: childAPage.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: parent.id,
				position: 0,
			});
			const childB = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: childBPage.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: parent.id,
				position: 1,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPageInstanceTree(ctx, { checklistId: checklist.id });

			expect(result.tree.length).toBe(1);
			const parentNode = result.tree[0];
			expect(parentNode.children?.length).toBe(3);

			// Verify children are in position order regardless of insertion order
			expect(parentNode.children?.[0].instanceId).toBe(childA.id);
			expect(parentNode.children?.[0].title).toBe('ChildA');
			expect(parentNode.children?.[0].position).toBe(0);

			expect(parentNode.children?.[1].instanceId).toBe(childB.id);
			expect(parentNode.children?.[1].title).toBe('ChildB');
			expect(parentNode.children?.[1].position).toBe(1);

			expect(parentNode.children?.[2].instanceId).toBe(childC.id);
			expect(parentNode.children?.[2].title).toBe('ChildC');
			expect(parentNode.children?.[2].position).toBe(2);
		});

		it('should return different statuses per instance with claim-filtered path', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });

			// Create parent with 2 children, each with different status
			const parentPage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Parent' });
			const child1Page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Child1' });
			const child2Page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Child2' });

			const parent = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: parentPage.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: null,
				position: 0,
			});
			const child1 = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: child1Page.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: parent.id,
				position: 0,
			});
			const child2 = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: child2Page.id,
				checklist_id: checklist.id,
				created_by: user.id,
				parent_instance_id: parent.id,
				position: 1,
			});

			// Set different statuses for each instance
			await db
				.insertInto('page_instance_status')
				.values([
					{
						claim_id: claim.id,
						page_instance_id: parent.id,
						status: PageInstanceStatus.COMPLETE,
						template_version: parentPage.version,
						client_id: client.id,
					},
					{
						claim_id: claim.id,
						page_instance_id: child1.id,
						status: PageInstanceStatus.IN_PROGRESS,
						template_version: child1Page.version,
						client_id: client.id,
					},
					// child2 has no status - should be UNSTARTED
				])
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getPageInstanceTree(ctx, { checklistId: checklist.id, claimId: claim.id });

			expect(result.tree.length).toBe(1);
			const parentNode = result.tree[0];

			// Parent should be COMPLETE
			expect(parentNode.status).toBe(PageInstanceStatus.COMPLETE);

			// Child1 should be IN_PROGRESS
			const child1Node = parentNode.children?.find((c) => c.instanceId === child1.id);
			expect(child1Node?.status).toBe(PageInstanceStatus.IN_PROGRESS);

			// Child2 should be UNSTARTED (no status record)
			const child2Node = parentNode.children?.find((c) => c.instanceId === child2.id);
			expect(child2Node?.status).toBe(PageInstanceStatus.UNSTARTED);
		});
	});
});
