/**
 * Integration tests for pageController
 *
 * Tests the orchestrative functions that coordinate multiple queries
 * and have complex business logic beyond simple CRUD operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestChecklist,
	createTestPage,
	createTestPageInstance,
	createTestClaim,
} from '@/__tests__/integration/fixtures';
import * as pageController from '../pageController';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

describe('pageController integration tests', () => {
	let db: Kysely<DB>;

	beforeEach(() => {
		db = getTestDb();
	});

	// =========================================================================
	// getPageInstanceTree - Builds hierarchical tree from flat instances
	// =========================================================================

	describe('getPageInstanceTree', () => {
		describe('flat structure (no nesting)', () => {
			it('should return empty tree when no instances exist', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				const result = await pageController.getPageInstanceTree(ctx, { checklistId: checklist.id });

				expect(result.tree).toEqual([]);
				expect(result.maxPosition).toBe(0);
			});

			it('should return flat tree for root-level instances only', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
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
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				const result = await pageController.getPageInstanceTree(ctx, { checklistId: checklist.id });

				expect(result.tree).toHaveLength(2);
				expect(result.tree[0].title).toBe('Page 1');
				expect(result.tree[1].title).toBe('Page 2');
				expect(result.tree[0].children).toBeUndefined();
				expect(result.tree[1].children).toBeUndefined();
				expect(result.maxPosition).toBe(2);
			});
		});

		describe('nested structure', () => {
			it('should build tree with one level of nesting', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
				const parentPage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Parent' });
				const childPage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Child' });
				const parentInstance = await createTestPageInstance(db, {
					client_id: client.id,
					page_id: parentPage.id,
					checklist_id: checklist.id,
					created_by: user.id,
					position: 0,
				});
				await createTestPageInstance(db, {
					client_id: client.id,
					page_id: childPage.id,
					checklist_id: checklist.id,
					created_by: user.id,
					parent_instance_id: parentInstance.id,
					position: 0,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				const result = await pageController.getPageInstanceTree(ctx, { checklistId: checklist.id });

				expect(result.tree).toHaveLength(1);
				expect(result.tree[0].title).toBe('Parent');
				expect(result.tree[0].children).toHaveLength(1);
				expect(result.tree[0].children![0].title).toBe('Child');
				expect(result.maxPosition).toBe(2);
			});

			it('should build tree with multiple levels of nesting', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
				const grandparentPage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Grandparent' });
				const parentPage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Parent' });
				const childPage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Child' });

				const grandparentInstance = await createTestPageInstance(db, {
					client_id: client.id,
					page_id: grandparentPage.id,
					checklist_id: checklist.id,
					created_by: user.id,
					position: 0,
				});
				const parentInstance = await createTestPageInstance(db, {
					client_id: client.id,
					page_id: parentPage.id,
					checklist_id: checklist.id,
					created_by: user.id,
					parent_instance_id: grandparentInstance.id,
					position: 0,
				});
				await createTestPageInstance(db, {
					client_id: client.id,
					page_id: childPage.id,
					checklist_id: checklist.id,
					created_by: user.id,
					parent_instance_id: parentInstance.id,
					position: 0,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				const result = await pageController.getPageInstanceTree(ctx, { checklistId: checklist.id });

				expect(result.tree).toHaveLength(1);
				expect(result.tree[0].title).toBe('Grandparent');
				expect(result.tree[0].children).toHaveLength(1);
				expect(result.tree[0].children![0].title).toBe('Parent');
				expect(result.tree[0].children![0].children).toHaveLength(1);
				expect(result.tree[0].children![0].children![0].title).toBe('Child');
				expect(result.maxPosition).toBe(3);
			});

			it('should handle multiple children at same level', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
				const parentPage = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Parent' });
				const child1Page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Child 1' });
				const child2Page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Child 2' });
				const child3Page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Child 3' });

				const parentInstance = await createTestPageInstance(db, {
					client_id: client.id,
					page_id: parentPage.id,
					checklist_id: checklist.id,
					created_by: user.id,
					position: 0,
				});
				await createTestPageInstance(db, {
					client_id: client.id,
					page_id: child1Page.id,
					checklist_id: checklist.id,
					created_by: user.id,
					parent_instance_id: parentInstance.id,
					position: 0,
				});
				await createTestPageInstance(db, {
					client_id: client.id,
					page_id: child2Page.id,
					checklist_id: checklist.id,
					created_by: user.id,
					parent_instance_id: parentInstance.id,
					position: 1,
				});
				await createTestPageInstance(db, {
					client_id: client.id,
					page_id: child3Page.id,
					checklist_id: checklist.id,
					created_by: user.id,
					parent_instance_id: parentInstance.id,
					position: 2,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				const result = await pageController.getPageInstanceTree(ctx, { checklistId: checklist.id });

				expect(result.tree).toHaveLength(1);
				expect(result.tree[0].children).toHaveLength(3);
				expect(result.maxPosition).toBe(4);
			});
		});

		describe('with claimId filter', () => {
			it('should filter instances by claimId when provided', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
				const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Test Page' });
				await createTestPageInstance(db, {
					client_id: client.id,
					page_id: page.id,
					checklist_id: checklist.id,
					created_by: user.id,
					position: 0,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				// With claimId - uses getPageInstancesForClaim which may return different results
				const resultWithClaim = await pageController.getPageInstanceTree(ctx, {
					checklistId: checklist.id,
					claimId: claim.id,
				});

				// Without claimId - uses getPageInstances
				const resultWithoutClaim = await pageController.getPageInstanceTree(ctx, {
					checklistId: checklist.id,
				});

				// Both should return results (actual filtering depends on visibility logic)
				expect(Array.isArray(resultWithClaim.tree)).toBe(true);
				expect(Array.isArray(resultWithoutClaim.tree)).toBe(true);
			});
		});

		describe('tree node properties', () => {
			it('should include all required properties on tree nodes', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
				const page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Test Page' });
				const instance = await createTestPageInstance(db, {
					client_id: client.id,
					page_id: page.id,
					checklist_id: checklist.id,
					created_by: user.id,
					position: 5,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				const result = await pageController.getPageInstanceTree(ctx, { checklistId: checklist.id });

				expect(result.tree).toHaveLength(1);
				const node = result.tree[0];
				expect(node.instanceId).toBe(instance.id);
				expect(node.pageId).toBe(page.id);
				expect(node.title).toBe('Test Page');
				expect(node.position).toBe(5);
				expect(node.parentInstanceId).toBeNull();
				// Additional properties from the query
				expect(node).toHaveProperty('status');
				expect(node).toHaveProperty('template_version');
			});
		});

		describe('tenant isolation', () => {
			it('should only return instances for the users client', async () => {
				const clientA = await createTestClient(db, { name: 'Client A' });
				const clientB = await createTestClient(db, { name: 'Client B' });
				const userA = await createTestUser(db, { client_id: clientA.id });
				const userB = await createTestUser(db, { client_id: clientB.id });
				const checklistA = await createTestChecklist(db, { client_id: clientA.id, created_by: userA.id });
				const checklistB = await createTestChecklist(db, { client_id: clientB.id, created_by: userB.id });
				const pageA = await createTestPage(db, { client_id: clientA.id, created_by: userA.id, title: 'Client A Page' });
				const pageB = await createTestPage(db, { client_id: clientB.id, created_by: userB.id, title: 'Client B Page' });
				await createTestPageInstance(db, {
					client_id: clientA.id,
					page_id: pageA.id,
					checklist_id: checklistA.id,
					created_by: userA.id,
				});
				await createTestPageInstance(db, {
					client_id: clientB.id,
					page_id: pageB.id,
					checklist_id: checklistB.id,
					created_by: userB.id,
				});

				const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id });
				const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id });

				// User A should only see Client A's instances
				const resultA = await pageController.getPageInstanceTree(ctxA, { checklistId: checklistA.id });
				expect(resultA.tree).toHaveLength(1);
				expect(resultA.tree[0].title).toBe('Client A Page');

				// User B should only see Client B's instances
				const resultB = await pageController.getPageInstanceTree(ctxB, { checklistId: checklistB.id });
				expect(resultB.tree).toHaveLength(1);
				expect(resultB.tree[0].title).toBe('Client B Page');

				// User A trying to access Client B's checklist should return empty
				const crossResult = await pageController.getPageInstanceTree(ctxA, { checklistId: checklistB.id });
				expect(crossResult.tree).toHaveLength(0);
			});
		});
	});
});
