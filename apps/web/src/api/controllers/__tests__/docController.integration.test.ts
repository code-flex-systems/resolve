/**
 * Integration tests for docController
 *
 * Tests the orchestrative functions that coordinate multiple queries
 * and have complex business logic beyond simple CRUD operations.
 *
 * Note: storage calls will fail in test environment but the
 * controller is designed to continue with DB operations even if blob
 * deletion fails. These tests verify the DB orchestration logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestDoc,
	createTestDocGroup,
} from '@/__tests__/integration/fixtures';
import * as docController from '../docController';
import { DocType, DocStatus } from '@/config/enums';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

describe('docController integration tests', () => {
	let db: Kysely<DB>;

	beforeEach(() => {
		db = getTestDb();
	});

	// =========================================================================
	// deleteDocGroup - Recursive deletion with blob storage cleanup
	// =========================================================================

	describe('deleteDocGroup', () => {
		describe('empty group deletion', () => {
			it('should delete an empty doc group', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const group = await createTestDocGroup(db, {
					client_id: client.id,
					created_by: user.id,
					name: 'Empty Folder',
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				await docController.deleteDocGroup(ctx, { groupId: group.id });

				// Verify group was soft-deleted
				const deletedGroup = await db
					.selectFrom('doc_group')
					.selectAll()
					.where('id', '=', group.id)
					.where('deleted_at', 'is', null)
					.executeTakeFirst();

				expect(deletedGroup).toBeUndefined();

				// Confirm row still exists with deleted_at populated
				const archivedGroup = await db
					.selectFrom('doc_group')
					.selectAll()
					.where('id', '=', group.id)
					.executeTakeFirst();
				expect(archivedGroup).toBeDefined();
				expect(archivedGroup?.deleted_at).not.toBeNull();
			});
		});

		describe('group with documents', () => {
			it('should delete all documents in the group', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const group = await createTestDocGroup(db, {
					client_id: client.id,
					created_by: user.id,
					name: 'Folder with Docs',
				});
				// Create documents in the group
				const doc1 = await createTestDoc(db, {
					client_id: client.id,
					created_by: user.id,
					doc_group_id: group.id,
					filename: 'doc1.pdf',
				});
				const doc2 = await createTestDoc(db, {
					client_id: client.id,
					created_by: user.id,
					doc_group_id: group.id,
					filename: 'doc2.pdf',
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				await docController.deleteDocGroup(ctx, { groupId: group.id });

				// Verify all documents were soft-deleted (no rows remain with deleted_at null)
				const remainingDocs = await db
					.selectFrom('doc')
					.selectAll()
					.where('id', 'in', [doc1.id, doc2.id])
					.where('deleted_at', 'is', null)
					.execute();

				expect(remainingDocs).toHaveLength(0);

				// Confirm rows still exist with deleted_at populated
				const archivedDocs = await db
					.selectFrom('doc')
					.selectAll()
					.where('id', 'in', [doc1.id, doc2.id])
					.execute();
				expect(archivedDocs).toHaveLength(2);
				expect(archivedDocs.every((d) => d.deleted_at !== null)).toBe(true);

				// Verify group was soft-deleted
				const deletedGroup = await db
					.selectFrom('doc_group')
					.selectAll()
					.where('id', '=', group.id)
					.where('deleted_at', 'is', null)
					.executeTakeFirst();

				expect(deletedGroup).toBeUndefined();
			});
		});

		describe('nested group hierarchy', () => {
			it('should delete child groups via CASCADE', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const parentGroup = await createTestDocGroup(db, {
					client_id: client.id,
					created_by: user.id,
					name: 'Parent Folder',
				});
				const childGroup = await createTestDocGroup(db, {
					client_id: client.id,
					created_by: user.id,
					name: 'Child Folder',
					parent_group_id: parentGroup.id,
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				await docController.deleteDocGroup(ctx, { groupId: parentGroup.id });

				// Verify both parent and child groups were soft-deleted
				const remainingGroups = await db
					.selectFrom('doc_group')
					.selectAll()
					.where('id', 'in', [parentGroup.id, childGroup.id])
					.where('deleted_at', 'is', null)
					.execute();

				expect(remainingGroups).toHaveLength(0);

				// Confirm rows still exist with deleted_at populated
				const archivedGroups = await db
					.selectFrom('doc_group')
					.selectAll()
					.where('id', 'in', [parentGroup.id, childGroup.id])
					.execute();
				expect(archivedGroups).toHaveLength(2);
				expect(archivedGroups.every((g) => g.deleted_at !== null)).toBe(true);
			});

			it('should delete documents in nested groups', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const parentGroup = await createTestDocGroup(db, {
					client_id: client.id,
					created_by: user.id,
					name: 'Parent Folder',
				});
				const childGroup = await createTestDocGroup(db, {
					client_id: client.id,
					created_by: user.id,
					name: 'Child Folder',
					parent_group_id: parentGroup.id,
				});
				// Create doc in parent group
				const parentDoc = await createTestDoc(db, {
					client_id: client.id,
					created_by: user.id,
					doc_group_id: parentGroup.id,
					filename: 'parent-doc.pdf',
				});
				// Create doc in child group
				const childDoc = await createTestDoc(db, {
					client_id: client.id,
					created_by: user.id,
					doc_group_id: childGroup.id,
					filename: 'child-doc.pdf',
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				await docController.deleteDocGroup(ctx, { groupId: parentGroup.id });

				// Verify all documents were soft-deleted (both parent and child)
				const remainingDocs = await db
					.selectFrom('doc')
					.selectAll()
					.where('id', 'in', [parentDoc.id, childDoc.id])
					.where('deleted_at', 'is', null)
					.execute();

				expect(remainingDocs).toHaveLength(0);

				// Confirm rows still exist with deleted_at populated
				const archivedDocs = await db
					.selectFrom('doc')
					.selectAll()
					.where('id', 'in', [parentDoc.id, childDoc.id])
					.execute();
				expect(archivedDocs).toHaveLength(2);
				expect(archivedDocs.every((d) => d.deleted_at !== null)).toBe(true);
			});
		});

		describe('error handling', () => {
			it('should throw NOT_FOUND when group does not exist', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				await expect(
					docController.deleteDocGroup(ctx, { groupId: '00000000-0000-0000-0000-000000000000' })
				).rejects.toThrow('Document group not found');
			});
		});

		describe('tenant isolation', () => {
			it('should not delete groups from different client', async () => {
				const clientA = await createTestClient(db, { name: 'Client A' });
				const clientB = await createTestClient(db, { name: 'Client B' });
				const userA = await createTestUser(db, { client_id: clientA.id });
				const userB = await createTestUser(db, { client_id: clientB.id });
				const groupA = await createTestDocGroup(db, {
					client_id: clientA.id,
					created_by: userA.id,
					name: 'Client A Folder',
				});
				const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id });

				// User B trying to delete Client A's group
				await expect(docController.deleteDocGroup(ctxB, { groupId: groupA.id })).rejects.toThrow();

				// Verify group still exists
				const groupStillExists = await db
					.selectFrom('doc_group')
					.selectAll()
					.where('id', '=', groupA.id)
					.executeTakeFirst();

				expect(groupStillExists).toBeDefined();
			});
		});

		describe('documents not in group', () => {
			it('should not affect documents outside the deleted group', async () => {
				const client = await createTestClient(db);
				const user = await createTestUser(db, { client_id: client.id });
				const groupToDelete = await createTestDocGroup(db, {
					client_id: client.id,
					created_by: user.id,
					name: 'Folder To Delete',
				});
				const otherGroup = await createTestDocGroup(db, {
					client_id: client.id,
					created_by: user.id,
					name: 'Other Folder',
				});
				// Doc in group to delete
				await createTestDoc(db, {
					client_id: client.id,
					created_by: user.id,
					doc_group_id: groupToDelete.id,
					filename: 'delete-me.pdf',
				});
				// Doc in other group (should remain)
				const otherDoc = await createTestDoc(db, {
					client_id: client.id,
					created_by: user.id,
					doc_group_id: otherGroup.id,
					filename: 'keep-me.pdf',
				});
				// Doc with no group (should remain)
				const orphanDoc = await createTestDoc(db, {
					client_id: client.id,
					created_by: user.id,
					doc_group_id: null,
					filename: 'orphan.pdf',
				});
				const ctx = createTestContext(db, { id: user.id, client_id: client.id });

				await docController.deleteDocGroup(ctx, { groupId: groupToDelete.id });

				// Verify other docs still exist
				const remainingDocs = await db
					.selectFrom('doc')
					.selectAll()
					.where('id', 'in', [otherDoc.id, orphanDoc.id])
					.execute();

				expect(remainingDocs).toHaveLength(2);
			});
		});
	});

	// =========================================================================
	// createDoc - Document creation with optional auto-organization
	// =========================================================================

	describe('createDoc', () => {
		it('should create a document without auto-organize', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id });

			const doc = await docController.createDoc(ctx, {
				params: {
					filename: 'test-doc.pdf',
					alias: 'test-alias',
					doc_type: DocType.OTHER,
					doc_status: DocStatus.APPROVED,
					claim_id: claim.id,
				},
				storageKey: 'test-storage-key-123',
				autoOrganize: false,
			});

			expect(doc).toBeDefined();
			expect(doc.filename).toBe('test-doc.pdf');
			expect(doc.storage_key).toBe('test-storage-key-123');
			expect(doc.doc_group_id).toBeNull();
		});

		it('should create document with auto-organize into user folder', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id });

			const doc = await docController.createDoc(ctx, {
				params: {
					filename: 'auto-organized.pdf',
					alias: 'auto-alias',
					doc_type: DocType.OTHER,
					doc_status: DocStatus.APPROVED,
					claim_id: claim.id,
				},
				storageKey: 'storage-key-auto',
				autoOrganize: true,
			});

			expect(doc).toBeDefined();
			expect(doc.filename).toBe('auto-organized.pdf');
			// When autoOrganize is true, doc_group_id should be set to user's folder
			expect(doc.doc_group_id).not.toBeNull();

			// Verify the folder exists and belongs to the user
			const userFolder = await db
				.selectFrom('doc_group')
				.selectAll()
				.where('id', '=', doc.doc_group_id!)
				.executeTakeFirst();

			expect(userFolder).toBeDefined();
			expect(userFolder!.user_id).toBe(user.id);
		});

		it('should reuse existing user folder on subsequent auto-organize', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id });

			// Create first doc with auto-organize
			const doc1 = await docController.createDoc(ctx, {
				params: {
					filename: 'first.pdf',
					alias: 'first-alias',
					doc_type: DocType.OTHER,
					doc_status: DocStatus.APPROVED,
					claim_id: claim.id,
				},
				storageKey: 'storage-key-1',
				autoOrganize: true,
			});

			// Create second doc with auto-organize
			const doc2 = await docController.createDoc(ctx, {
				params: {
					filename: 'second.pdf',
					alias: 'second-alias',
					doc_type: DocType.OTHER,
					doc_status: DocStatus.APPROVED,
					claim_id: claim.id,
				},
				storageKey: 'storage-key-2',
				autoOrganize: true,
			});

			// Both docs should be in the same user folder
			expect(doc1.doc_group_id).toBe(doc2.doc_group_id);
		});
	});
});
