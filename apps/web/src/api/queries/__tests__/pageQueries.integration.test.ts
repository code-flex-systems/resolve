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
});
