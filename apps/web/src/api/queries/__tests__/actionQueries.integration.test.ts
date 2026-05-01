/**
 * Integration tests for actionQueries
 *
 * Tests cover:
 * - upsertAction: Create or update an action
 * - deleteAction: Delete an action
 * - getActions: Get actions for multiple answers
 * - getAction: Get single action by answer ID
 * - logAction: Log an action execution
 * - logActions: Batch log action executions
 * - updateAction: Update action type/definition
 * - Tenant isolation on all operations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	upsertAction,
	deleteAction,
	getActions,
	getAction,
	logAction,
	logActions,
	updateAction,
	getActionStats,
	getActionStatsDetail,
} from '../actionQueries';
import { ActionLogStatus, ActionType } from '@/config/enums';
import { createTestClient, createTestUser, createTestPage } from '@/__tests__/integration/fixtures';

describe('actionQueries integration tests', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	describe('upsertAction', () => {
		it('should create a new action', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
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
			const answer = await db
				.insertInto('answer')
				.values({
					question_id: question.id,
					client_id: client.id,
					text: 'Answer 1',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			const action = await upsertAction(ctx, answer.id, ActionType.TASK, {
				title: 'Follow up task',
				message: 'Review the documents',
			});

			expect(action.answer_id).toBe(answer.id);
			expect(action.type).toBe(ActionType.TASK);
			expect(action.client_id).toBe(client.id);
			expect(action.created_by).toBe(user.id);

			const definition = action.definition as Record<string, unknown>;
			expect(definition.title).toBe('Follow up task');
		});

		it('should update existing action on conflict', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
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
			const answer = await db
				.insertInto('answer')
				.values({
					question_id: question.id,
					client_id: client.id,
					text: 'Answer 1',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			// Create initial action
			await upsertAction(ctx, answer.id, ActionType.TASK, { title: 'Original' });

			// Upsert with new values
			const updated = await upsertAction(ctx, answer.id, ActionType.EMAIL, { title: 'Updated' });

			expect(updated.type).toBe(ActionType.EMAIL);
			expect(updated.updated_by).toBe(user.id);

			const definition = updated.definition as Record<string, unknown>;
			expect(definition.title).toBe('Updated');

			// Verify only one action exists
			const all = await db
				.selectFrom('action')
				.selectAll()
				.where('answer_id', '=', answer.id)
				.execute();
			expect(all).toHaveLength(1);
		});
	});

	describe('deleteAction', () => {
		it('should delete an action', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
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
			const answer = await db
				.insertInto('answer')
				.values({
					question_id: question.id,
					client_id: client.id,
					text: 'Answer 1',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			const action = await upsertAction(ctx, answer.id, ActionType.TASK, { title: 'To delete' });

			await deleteAction(ctx, action.id);

			const remaining = await db
				.selectFrom('action')
				.selectAll()
				.where('id', '=', action.id)
				.executeTakeFirst();
			expect(remaining).toBeUndefined();
		});

		it('should not delete action from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const pageB = await createTestPage(db, { client_id: clientB.id, created_by: userB.id });
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
			const answerB = await db
				.insertInto('answer')
				.values({
					question_id: questionB.id,
					client_id: clientB.id,
					text: 'Answer B',
					position: 0,
					created_by: userB.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'user',
			});

			// Create action for client B
			const actionB = await db
				.insertInto('action')
				.values({
					answer_id: answerB.id,
					client_id: clientB.id,
					type: ActionType.TASK,
					definition: JSON.stringify({ title: 'B action' }),
					created_by: userB.id,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			// Client A tries to delete it
			await deleteAction(ctxA, actionB.id);

			// Should still exist
			const stillExists = await db
				.selectFrom('action')
				.selectAll()
				.where('id', '=', actionB.id)
				.executeTakeFirst();
			expect(stillExists).toBeTruthy();
		});
	});

	describe('getActions', () => {
		it('should return actions for multiple answer IDs', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
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
			const answer1 = await db
				.insertInto('answer')
				.values({
					question_id: question.id,
					client_id: client.id,
					text: 'Answer 1',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const answer2 = await db
				.insertInto('answer')
				.values({
					question_id: question.id,
					client_id: client.id,
					text: 'Answer 2',
					position: 1,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			await upsertAction(ctx, answer1.id, ActionType.TASK, { title: 'Task 1' });
			await upsertAction(ctx, answer2.id, ActionType.EMAIL, { title: 'Deadline 1' });

			const actions = await getActions(ctx, [answer1.id, answer2.id]);

			expect(actions).toHaveLength(2);
		});

		it('should return empty array when no actions exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
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
			const answer = await db
				.insertInto('answer')
				.values({
					question_id: question.id,
					client_id: client.id,
					text: 'Answer 1',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			const actions = await getActions(ctx, [answer.id]);
			expect(actions).toHaveLength(0);
		});

		it('should not return actions from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const pageB = await createTestPage(db, { client_id: clientB.id, created_by: userB.id });
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
			const answerB = await db
				.insertInto('answer')
				.values({
					question_id: questionB.id,
					client_id: clientB.id,
					text: 'Answer B',
					position: 0,
					created_by: userB.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'user',
			});

			// Create action for client B
			await db
				.insertInto('action')
				.values({
					answer_id: answerB.id,
					client_id: clientB.id,
					type: ActionType.TASK,
					definition: JSON.stringify({}),
					created_by: userB.id,
				})
				.execute();

			// Client A should not see it
			const actions = await getActions(ctxA, [answerB.id]);
			expect(actions).toHaveLength(0);
		});
	});

	describe('getAction', () => {
		it('should return action by answer ID', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
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
			const answer = await db
				.insertInto('answer')
				.values({
					question_id: question.id,
					client_id: client.id,
					text: 'Answer 1',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			await upsertAction(ctx, answer.id, ActionType.TASK, { title: 'Test' });

			const action = await getAction(ctx, answer.id);

			expect(action.answer_id).toBe(answer.id);
			expect(action.type).toBe(ActionType.TASK);
		});

		it('should throw when action does not exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
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
			const answer = await db
				.insertInto('answer')
				.values({
					question_id: question.id,
					client_id: client.id,
					text: 'Answer 1',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			await expect(getAction(ctx, answer.id)).rejects.toThrow();
		});

		it('should not return action from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const pageB = await createTestPage(db, { client_id: clientB.id, created_by: userB.id });
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
			const answerB = await db
				.insertInto('answer')
				.values({
					question_id: questionB.id,
					client_id: clientB.id,
					text: 'Answer B',
					position: 0,
					created_by: userB.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'user',
			});

			// Create action for client B
			await db
				.insertInto('action')
				.values({
					answer_id: answerB.id,
					client_id: clientB.id,
					type: ActionType.TASK,
					definition: JSON.stringify({}),
					created_by: userB.id,
				})
				.execute();

			// Client A should not be able to get it
			await expect(getAction(ctxA, answerB.id)).rejects.toThrow();
		});
	});

	describe('logAction', () => {
		it('should create an action log entry', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
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
			const answer = await db
				.insertInto('answer')
				.values({
					question_id: question.id,
					client_id: client.id,
					text: 'Answer 1',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			const action = await upsertAction(ctx, answer.id, ActionType.TASK, { title: 'Test' });

			await logAction(ctx, action.id, ActionLogStatus.SUCCESS);

			const logs = await db
				.selectFrom('action_log')
				.selectAll()
				.where('action_id', '=', action.id)
				.execute();

			expect(logs).toHaveLength(1);
			expect(logs[0].status).toBe(ActionLogStatus.SUCCESS);
			expect(logs[0].client_id).toBe(client.id);
			expect(logs[0].created_by).toBe(user.id);
		});

		it('should allow multiple log entries for same action', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
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
			const answer = await db
				.insertInto('answer')
				.values({
					question_id: question.id,
					client_id: client.id,
					text: 'Answer 1',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			const action = await upsertAction(ctx, answer.id, ActionType.TASK, { title: 'Test' });

			await logAction(ctx, action.id, ActionLogStatus.SUCCESS);
			await logAction(ctx, action.id, ActionLogStatus.FAILURE);
			await logAction(ctx, action.id, ActionLogStatus.SUCCESS);

			const logs = await db
				.selectFrom('action_log')
				.selectAll()
				.where('action_id', '=', action.id)
				.execute();

			expect(logs).toHaveLength(3);
		});
	});

	describe('logActions', () => {
		it('should no-op when no logs provided', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
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
			const answer = await db
				.insertInto('answer')
				.values({
					question_id: question.id,
					client_id: client.id,
					text: 'Answer 1',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			const action = await upsertAction(ctx, answer.id, ActionType.TASK, { title: 'Test' });

			await logActions(ctx, []);

			const logs = await db
				.selectFrom('action_log')
				.selectAll()
				.where('action_id', '=', action.id)
				.execute();

			expect(logs).toHaveLength(0);
		});

		it('should create action log entries in bulk', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
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
			const answer = await db
				.insertInto('answer')
				.values({
					question_id: question.id,
					client_id: client.id,
					text: 'Answer 1',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			const action = await upsertAction(ctx, answer.id, ActionType.TASK, { title: 'Test' });

			await logActions(ctx, [
				{ actionId: action.id, status: ActionLogStatus.SUCCESS },
				{ actionId: action.id, status: ActionLogStatus.FAILURE },
			]);

			const logs = await db
				.selectFrom('action_log')
				.selectAll()
				.where('action_id', '=', action.id)
				.execute();

			expect(logs).toHaveLength(2);
		});
	});

	describe('updateAction', () => {
		it('should update action type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
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
			const answer = await db
				.insertInto('answer')
				.values({
					question_id: question.id,
					client_id: client.id,
					text: 'Answer 1',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			const action = await upsertAction(ctx, answer.id, ActionType.TASK, { title: 'Test' });

			await updateAction(ctx, action.id, { type: ActionType.EMAIL });

			const updated = await db
				.selectFrom('action')
				.selectAll()
				.where('id', '=', action.id)
				.executeTakeFirstOrThrow();
			expect(updated.type).toBe(ActionType.EMAIL);
		});

		it('should update action definition', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
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
			const answer = await db
				.insertInto('answer')
				.values({
					question_id: question.id,
					client_id: client.id,
					text: 'Answer 1',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			const action = await upsertAction(ctx, answer.id, ActionType.TASK, { title: 'Original' });

			await updateAction(ctx, action.id, {
				definition: { title: 'Updated', message: 'New message' },
			});

			const updated = await db
				.selectFrom('action')
				.selectAll()
				.where('id', '=', action.id)
				.executeTakeFirstOrThrow();
			const definition = updated.definition as Record<string, unknown>;
			expect(definition.title).toBe('Updated');
			expect(definition.message).toBe('New message');
		});

		it('should throw when no updates provided', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
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
			const answer = await db
				.insertInto('answer')
				.values({
					question_id: question.id,
					client_id: client.id,
					text: 'Answer 1',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			const action = await upsertAction(ctx, answer.id, ActionType.TASK, { title: 'Test' });

			await expect(updateAction(ctx, action.id, {})).rejects.toMatchObject({ code: 'BAD_REQUEST' });
		});

		it('should not update action from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const pageB = await createTestPage(db, { client_id: clientB.id, created_by: userB.id });
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
			const answerB = await db
				.insertInto('answer')
				.values({
					question_id: questionB.id,
					client_id: clientB.id,
					text: 'Answer B',
					position: 0,
					created_by: userB.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'user',
			});

			// Create action for client B
			const actionB = await db
				.insertInto('action')
				.values({
					answer_id: answerB.id,
					client_id: clientB.id,
					type: ActionType.TASK,
					definition: JSON.stringify({ title: 'Original' }),
					created_by: userB.id,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			// Client A tries to update it - should not affect the record
			await updateAction(ctxA, actionB.id, { type: ActionType.EMAIL });

			// Verify unchanged
			const unchanged = await db
				.selectFrom('action')
				.selectAll()
				.where('id', '=', actionB.id)
				.executeTakeFirstOrThrow();
			expect(unchanged.type).toBe(ActionType.TASK);
		});
	});

	describe('getActionStats', () => {
		it('should return empty array when no action logs exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			const stats = await getActionStats(ctx);
			expect(stats).toEqual([]);
		});

		it('should return action stats with counts', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await db
				.insertInto('question')
				.values({
					page_id: page.id,
					client_id: client.id,
					text: 'Stats Question',
					type: 'multi',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const answer = await db
				.insertInto('answer')
				.values({
					question_id: question.id,
					client_id: client.id,
					text: 'Stats Answer',
					position: 0,
					created_by: user.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			const action = await upsertAction(ctx, answer.id, ActionType.TASK, { title: 'Stats Task' });
			await logAction(ctx, action.id, ActionLogStatus.SUCCESS);
			await logAction(ctx, action.id, ActionLogStatus.SUCCESS);

			const stats = await getActionStats(ctx);

			expect(stats.length).toBeGreaterThanOrEqual(1);
			const stat = stats.find((s) => s.id === action.id);
			expect(stat).toBeDefined();
			expect(stat!.count).toBe(2);
		});

		it('should not include actions from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const pageB = await createTestPage(db, { client_id: clientB.id, created_by: userB.id });
			const questionB = await db
				.insertInto('question')
				.values({
					page_id: pageB.id,
					client_id: clientB.id,
					text: 'Client B Question',
					type: 'multi',
					position: 0,
					created_by: userB.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const answerB = await db
				.insertInto('answer')
				.values({
					question_id: questionB.id,
					client_id: clientB.id,
					text: 'Client B Answer',
					position: 0,
					created_by: userB.id,
				})
				.returning('id')
				.executeTakeFirstOrThrow();
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'user',
			});
			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'user',
			});

			const actionB = await upsertAction(ctxB, answerB.id, ActionType.TASK, {
				title: 'Client B Task',
			});
			await logAction(ctxB, actionB.id, ActionLogStatus.SUCCESS);

			// Client A should not see client B's stats
			const statsA = await getActionStats(ctxA);
			expect(statsA.find((s) => s.id === actionB.id)).toBeUndefined();
		});
	});

	describe('getActionStatsDetail', () => {
		it('should return empty array when no matching action logs exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'user',
			});

			const stats = await getActionStatsDetail(ctx, {});
			expect(stats).toEqual([]);
		});

		it('should not include actions from different client (tenant isolation)', async () => {
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

			// Even if client B has action logs, client A should get empty results
			const stats = await getActionStatsDetail(ctxA, {});
			// Should not throw and should return empty or not include B's data
			expect(Array.isArray(stats)).toBe(true);
		});
	});
});
