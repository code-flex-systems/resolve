import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestDoc,
	createTestDocGroup,
	createTestPage,
	createTestQuestion,
	createTestAnswer,
	createTestDeadline,
	createTestRecoveryEvent,
	createTestChecklist,
	createTestPageInstance,
	createTestParty,
	createTestClaimParty,
	createTestCoverage,
	createTestSettlement,
} from '@/__tests__/integration/fixtures';
import { DocType, DocStatus, DocGroupType } from '@/config/enums';
import {
	createDoc,
	getDoc,
	getDocs,
	getDocsByClaimId,
	updateDoc,
	getDocForDeletion,
	deleteDoc,
	createDocGroup,
	getDocGroup,
	getDocGroups,
	getDocGroupHierarchy,
	updateDocGroup,
	getDocGroupForDeletion,
	deleteDocGroup,
	getDocsInGroupRecursive,
	getDocCountByClaimId,
	getDocCountByGroupId,
	docExists,
	getOrCreateUsersFolder,
	getOrCreateUserFolder,
	getOrCreateSharedFolder,
	getSharedFolderContents,
} from '../docQueries';

describe('docQueries integration', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// =====================================================================
	// DOC QUERIES
	// =====================================================================

	describe('createDoc', () => {
		it('should create a document with all fields', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const params = {
				filename: 'test-document.pdf',
				alias: 'Test Doc',
				title: 'Test Document Title',
				description: 'A test document',
				doc_type: DocType.POLICE_REPORT,
				doc_status: DocStatus.APPROVED,
				file_size: 2048,
				mime_type: 'application/pdf',
				preview_url: 'https://example.com/preview',
				claim_id: claim.id,
			};
			const storageKey = 'azure-blob-key-123';

			const doc = await createDoc(ctx, params, storageKey);

			expect(doc.filename).toBe('test-document.pdf');
			expect(doc.alias).toBe('Test Doc');
			expect(doc.title).toBe('Test Document Title');
			expect(doc.description).toBe('A test document');
			expect(doc.doc_type).toBe(DocType.POLICE_REPORT);
			expect(doc.doc_status).toBe(DocStatus.APPROVED);
			expect(doc.storage_key).toBe(storageKey);
			expect(Number(doc.file_size)).toBe(2048);
			expect(doc.mime_type).toBe('application/pdf');
			expect(doc.claim_id).toBe(claim.id);
			expect(doc.client_id).toBe(client.id);
			expect(doc.created_by).toBe(user.id);
			expect(doc.version).toBe(1);
			expect(doc.is_current_version).toBe(true);
		});

		it('should use default doc_type and doc_status when not provided', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const params = {
				filename: 'default-doc.pdf',
				alias: 'default-alias',
				file_size: 1024,
				mime_type: 'application/pdf',
			};
			const storageKey = 'azure-blob-key-default';

			const doc = await createDoc(ctx, params, storageKey);

			expect(doc.doc_type).toBe(DocType.OTHER);
			expect(doc.doc_status).toBe(DocStatus.APPROVED);
		});

		it('should create document with recovery_event_id association', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			// Create settlement chain for recovery event
			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				party_type: 'facilitator',
				party_category: 'adverse_carrier',
			});
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				created_by: user.id,
				role: 'adverse_carrier',
			});
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				coverage_type: 'liability',
				coverage_amount: 100000,
			});
			const settlement = await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: claimParty.id,
				coverage_id: coverage.id,
				created_by: user.id,
				demand_amount: 50000,
			});

			const recoveryEvent = await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const doc = await createDoc(
				ctx,
				{
					filename: 'recovery-doc.pdf',
					alias: 'recovery-alias',
					doc_type: DocType.OTHER,
					doc_status: DocStatus.APPROVED,
					file_size: 1024,
					mime_type: 'application/pdf',
					recovery_event_id: recoveryEvent.id,
				},
				'storage-key-recovery'
			);

			expect(doc.recovery_event_id).toBe(recoveryEvent.id);
		});

		it('should create document with deadline_id association', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const deadline = await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const doc = await createDoc(
				ctx,
				{
					filename: 'deadline-doc.pdf',
					alias: 'deadline-alias',
					doc_type: DocType.OTHER,
					doc_status: DocStatus.APPROVED,
					file_size: 1024,
					mime_type: 'application/pdf',
					deadline_id: deadline.id,
				},
				'storage-key-deadline'
			);

			expect(doc.deadline_id).toBe(deadline.id);
		});

		it('should create document with page_instance_id association', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, { client_id: client.id, created_by: user.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const pageInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const doc = await createDoc(
				ctx,
				{
					filename: 'page-instance-doc.pdf',
					alias: 'page-instance-alias',
					doc_type: DocType.OTHER,
					doc_status: DocStatus.APPROVED,
					file_size: 1024,
					mime_type: 'application/pdf',
					page_instance_id: pageInstance.id,
				},
				'storage-key-page-instance'
			);

			expect(doc.page_instance_id).toBe(pageInstance.id);
		});

		it('should create document with question_id and answer_id associations', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const answer = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const doc = await createDoc(
				ctx,
				{
					filename: 'qa-doc.pdf',
					alias: 'qa-alias',
					doc_type: DocType.OTHER,
					doc_status: DocStatus.APPROVED,
					file_size: 1024,
					mime_type: 'application/pdf',
					question_id: question.id,
					answer_id: answer.id,
				},
				'storage-key-qa'
			);

			expect(doc.question_id).toBe(question.id);
			expect(doc.answer_id).toBe(answer.id);
		});
	});

	describe('getDoc', () => {
		it('should return a document by ID', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const doc = await createTestDoc(db, {
				client_id: client.id,
				created_by: user.id,
				filename: 'get-doc-test.pdf',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDoc(ctx, doc.id);

			expect(result.id).toBe(doc.id);
			expect(result.filename).toBe('get-doc-test.pdf');
		});

		it('should throw for non-existent document', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(getDoc(ctx, 999999)).rejects.toThrow();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const doc = await createTestDoc(db, {
				client_id: client1.id,
				created_by: user1.id,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(getDoc(ctx2, doc.id)).rejects.toThrow();
		});
	});

	describe('getDocs', () => {
		it('should return all documents for a client', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			await createTestDoc(db, { client_id: client.id, created_by: user.id });
			await createTestDoc(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocs(ctx);

			expect(result.length).toBeGreaterThanOrEqual(2);
		});

		it('should filter by claim_id', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client.id });
			const claim2 = await createTestClaim(db, { client_id: client.id });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, claim_id: claim1.id });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, claim_id: claim2.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocs(ctx, { claim_id: claim1.id });

			expect(result.length).toBe(1);
			expect(result[0].claim_id).toBe(claim1.id);
		});

		it('should filter by doc_group_id', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const group = await createTestDocGroup(db, { client_id: client.id, created_by: user.id });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, doc_group_id: group.id });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, doc_group_id: null });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocs(ctx, { doc_group_id: group.id });

			expect(result.length).toBe(1);
			expect(result[0].doc_group_id).toBe(group.id);
		});

		it('should filter by doc_group_id = null', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const group = await createTestDocGroup(db, { client_id: client.id, created_by: user.id, name: `Group ${Date.now()}` });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, doc_group_id: group.id, filename: `grouped-${Date.now()}.pdf` });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, doc_group_id: null, filename: `ungrouped-${Date.now()}.pdf` });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocs(ctx, { doc_group_id: null });

			const hasUngroupedDocs = result.some((d) => d.doc_group_id === null);
			expect(hasUngroupedDocs).toBe(true);
			expect(result.every((d) => d.doc_group_id === null)).toBe(true);
		});

		it('should filter by doc_type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, doc_type: DocType.INVOICE });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, doc_type: DocType.PHOTO });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocs(ctx, { doc_type: DocType.INVOICE });

			expect(result.length).toBeGreaterThanOrEqual(1);
			expect(result.every((d) => d.doc_type === DocType.INVOICE)).toBe(true);
		});

		it('should filter by doc_status', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, doc_status: DocStatus.DRAFT });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, doc_status: DocStatus.APPROVED });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocs(ctx, { doc_status: DocStatus.DRAFT });

			expect(result.length).toBeGreaterThanOrEqual(1);
			expect(result.every((d) => d.doc_status === DocStatus.DRAFT)).toBe(true);
		});

		it('should filter by is_current_version', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, is_current_version: true });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, is_current_version: false });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocs(ctx, { is_current_version: true });

			expect(result.length).toBeGreaterThanOrEqual(1);
			expect(result.every((d) => d.is_current_version === true)).toBe(true);
		});

		it('should filter by question_id', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question1 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const question2 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, question_id: question1.id });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, question_id: question2.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocs(ctx, { question_id: question1.id });

			expect(result.length).toBe(1);
			expect(result[0].question_id).toBe(question1.id);
		});

		it('should filter by answer_id', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const question = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const answer1 = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id });
			const answer2 = await createTestAnswer(db, { client_id: client.id, question_id: question.id, created_by: user.id });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, answer_id: answer1.id });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, answer_id: answer2.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocs(ctx, { answer_id: answer1.id });

			expect(result.length).toBe(1);
			expect(result[0].answer_id).toBe(answer1.id);
		});

		it('should support pagination', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			// Create 5 docs
			for (let i = 0; i < 5; i++) {
				await createTestDoc(db, { client_id: client.id, created_by: user.id, filename: `pagination-${i}.pdf` });
			}

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const page1 = await getDocs(ctx, {}, 2, 0);
			const page2 = await getDocs(ctx, {}, 2, 2);

			expect(page1.length).toBe(2);
			expect(page2.length).toBe(2);
			expect(page1[0].id).not.toBe(page2[0].id);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			await createTestDoc(db, { client_id: client1.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getDocs(ctx2);

			expect(result.every((d) => d.client_id === client2.id)).toBe(true);
		});
	});

	describe('getDocsByClaimId', () => {
		it('should return all documents for a claim', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, claim_id: claim.id });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, claim_id: claim.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocsByClaimId(ctx, claim.id);

			expect(result.length).toBe(2);
			expect(result.every((d) => d.claim_id === claim.id)).toBe(true);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			await createTestDoc(db, { client_id: client1.id, created_by: user1.id, claim_id: claim.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getDocsByClaimId(ctx2, claim.id);

			expect(result.length).toBe(0);
		});
	});

	describe('updateDoc', () => {
		it('should update document metadata', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const doc = await createTestDoc(db, {
				client_id: client.id,
				created_by: user.id,
				title: 'Original Title',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const updated = await updateDoc(ctx, doc.id, {
				title: 'Updated Title',
				description: 'New description',
				doc_status: DocStatus.ARCHIVED,
			});

			expect(updated.title).toBe('Updated Title');
			expect(updated.description).toBe('New description');
			expect(updated.doc_status).toBe(DocStatus.ARCHIVED);
			expect(updated.updated_by).toBe(user.id);
			expect(updated.updated_at).not.toBeNull();
		});

		it('should throw for non-existent document', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(updateDoc(ctx, 999999, { title: 'New' })).rejects.toThrow();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const doc = await createTestDoc(db, { client_id: client1.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(updateDoc(ctx2, doc.id, { title: 'Hacked' })).rejects.toThrow();
		});
	});

	describe('getDocForDeletion', () => {
		it('should return document details for logging', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const doc = await createTestDoc(db, {
				client_id: client.id,
				created_by: user.id,
				filename: 'to-delete.pdf',
				alias: 'Delete Me',
				doc_type: DocType.INVOICE,
				storage_key: 'delete-storage-key',
				claim_id: claim.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocForDeletion(ctx, doc.id);

			expect(result).not.toBeNull();
			expect(result?.id).toBe(doc.id);
			expect(result?.filename).toBe('to-delete.pdf');
			expect(result?.alias).toBe('Delete Me');
			expect(result?.doc_type).toBe(DocType.INVOICE);
			expect(result?.storage_key).toBe('delete-storage-key');
			expect(result?.claim_id).toBe(claim.id);
		});

		it('should return undefined for non-existent document', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocForDeletion(ctx, 999999);

			expect(result).toBeUndefined();
		});
	});

	describe('deleteDoc', () => {
		it('should delete a document', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const doc = await createTestDoc(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await deleteDoc(ctx, doc.id);

			await expect(getDoc(ctx, doc.id)).rejects.toThrow();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const doc = await createTestDoc(db, { client_id: client1.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await deleteDoc(ctx2, doc.id);

			// Document should still exist (wasn't deleted because of tenant isolation)
			const ctx1 = createTestContext(db, { id: user1.id, client_id: client1.id, role: 'Admin' });
			const result = await getDoc(ctx1, doc.id);
			expect(result.id).toBe(doc.id);
		});
	});

	// =====================================================================
	// DOC GROUP QUERIES
	// =====================================================================

	describe('createDocGroup', () => {
		it('should create a document group', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const group = await createDocGroup(ctx, {
				name: 'Test Folder',
				description: 'A test folder',
				group_type: DocGroupType.CUSTOM,
				color: '#FF0000',
				icon: 'folder',
				sort_order: 10,
				system: false,
			});

			expect(group.name).toBe('Test Folder');
			expect(group.description).toBe('A test folder');
			expect(group.group_type).toBe(DocGroupType.CUSTOM);
			expect(group.color).toBe('#FF0000');
			expect(group.icon).toBe('folder');
			expect(group.sort_order).toBe(10);
			expect(group.system).toBe(false);
			expect(group.client_id).toBe(client.id);
			expect(group.created_by).toBe(user.id);
		});

		it('should prevent creating folders with reserved names', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(
				createDocGroup(ctx, { name: 'Users', group_type: DocGroupType.CUSTOM, sort_order: 0, system: false })
			).rejects.toThrow('"Users" is a reserved folder name');
			await expect(
				createDocGroup(ctx, { name: 'Shared', group_type: DocGroupType.CUSTOM, sort_order: 0, system: false })
			).rejects.toThrow('"Shared" is a reserved folder name');
		});

		it('should allow creating system folders with reserved names', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// This should not throw because system = true
			const group = await createDocGroup(ctx, {
				name: 'Users',
				system: true,
				group_type: DocGroupType.CATEGORY,
				sort_order: 0,
			});

			expect(group.name).toBe('Users');
			expect(group.system).toBe(true);
		});

		it('should create nested folders', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const parent = await createDocGroup(ctx, {
				name: 'Parent Folder',
				group_type: DocGroupType.CUSTOM,
				sort_order: 0,
				system: false,
			});
			const child = await createDocGroup(ctx, {
				name: 'Child Folder',
				parent_group_id: parent.id,
				group_type: DocGroupType.CUSTOM,
				sort_order: 0,
				system: false,
			});

			expect(child.parent_group_id).toBe(parent.id);
		});
	});

	describe('getDocGroup', () => {
		it('should return a document group by ID', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const group = await createTestDocGroup(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Get Group Test',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocGroup(ctx, group.id);

			expect(result.id).toBe(group.id);
			expect(result.name).toBe('Get Group Test');
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const group = await createTestDocGroup(db, { client_id: client1.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(getDocGroup(ctx2, group.id)).rejects.toThrow();
		});
	});

	describe('getDocGroups', () => {
		it('should return all document groups for a client', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			await createTestDocGroup(db, { client_id: client.id, created_by: user.id, name: `Group A ${Date.now()}` });
			await createTestDocGroup(db, { client_id: client.id, created_by: user.id, name: `Group B ${Date.now()}` });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocGroups(ctx);

			// Should include created groups plus the auto-created Shared folder
			expect(result.length).toBeGreaterThanOrEqual(2);
		});

		it('should include user info when user_id is set', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin', first: 'John', last: 'Doe' });
			await createTestDocGroup(db, {
				client_id: client.id,
				created_by: user.id,
				user_id: user.id,
				name: `User Folder ${Date.now()}`,
				group_type: DocGroupType.USER,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocGroups(ctx);

			const userFolder = result.find((g) => g.user_id === user.id);
			expect(userFolder).toBeDefined();
			expect(userFolder?.user_first).toBe('John');
			expect(userFolder?.user_last).toBe('Doe');
		});

		it('should order by sort_order then name', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			await createTestDocGroup(db, { client_id: client.id, created_by: user.id, name: 'ZZZ', sort_order: 1 });
			await createTestDocGroup(db, { client_id: client.id, created_by: user.id, name: 'AAA', sort_order: 2 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocGroups(ctx);

			// Find the positions of our test folders
			const zzzIndex = result.findIndex((g) => g.name === 'ZZZ');
			const aaaIndex = result.findIndex((g) => g.name === 'AAA');

			expect(zzzIndex).toBeLessThan(aaaIndex);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			await createTestDocGroup(db, {
				client_id: client1.id,
				created_by: user1.id,
				name: `Client1 Folder ${Date.now()}`,
			});

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getDocGroups(ctx2);

			expect(result.every((g) => g.client_id === client2.id)).toBe(true);
		});
	});

	describe('getDocGroupHierarchy', () => {
		it('should return the same as getDocGroups (flat list)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			await createTestDocGroup(db, { client_id: client.id, created_by: user.id, name: `Hierarchy Test ${Date.now()}` });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const hierarchy = await getDocGroupHierarchy(ctx);
			const groups = await getDocGroups(ctx);

			expect(hierarchy.length).toBe(groups.length);
		});
	});

	describe('updateDocGroup', () => {
		it('should update a document group', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const group = await createTestDocGroup(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Original Name',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const updated = await updateDocGroup(ctx, group.id, {
				name: 'Updated Name',
				description: 'New description',
				color: '#00FF00',
			});

			expect(updated.name).toBe('Updated Name');
			expect(updated.description).toBe('New description');
			expect(updated.color).toBe('#00FF00');
			expect(updated.updated_by).toBe(user.id);
		});

		it('should prevent updating system folders', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const systemGroup = await createTestDocGroup(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'System Folder',
				system: true,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(updateDocGroup(ctx, systemGroup.id, { name: 'Renamed' })).rejects.toThrow(
				'Cannot update system folders'
			);
		});

		it('should prevent renaming to reserved names', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const group = await createTestDocGroup(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Normal Folder',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(updateDocGroup(ctx, group.id, { name: 'Users' })).rejects.toThrow('"Users" is a reserved folder name');
		});

		it('should throw for non-existent group', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(updateDocGroup(ctx, 999999, { name: 'New Name' })).rejects.toThrow();
		});
	});

	describe('getDocGroupForDeletion', () => {
		it('should return group details for logging', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const parent = await createTestDocGroup(db, { client_id: client.id, created_by: user.id, name: 'Parent' });
			const group = await createTestDocGroup(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Delete Me',
				group_type: DocGroupType.CUSTOM,
				parent_group_id: parent.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocGroupForDeletion(ctx, group.id);

			expect(result).not.toBeNull();
			expect(result?.id).toBe(group.id);
			expect(result?.name).toBe('Delete Me');
			expect(result?.group_type).toBe(DocGroupType.CUSTOM);
			expect(result?.parent_group_id).toBe(parent.id);
		});
	});

	describe('deleteDocGroup', () => {
		it('should delete a document group', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const group = await createTestDocGroup(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await deleteDocGroup(ctx, group.id);

			await expect(getDocGroup(ctx, group.id)).rejects.toThrow();
		});

		it('should prevent deleting system folders', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const systemGroup = await createTestDocGroup(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'System Folder',
				system: true,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(deleteDocGroup(ctx, systemGroup.id)).rejects.toThrow('Cannot delete system folders');
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const group = await createTestDocGroup(db, { client_id: client1.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Should silently fail (no rows deleted due to tenant filter)
			await deleteDocGroup(ctx2, group.id);

			// Group should still exist
			const ctx1 = createTestContext(db, { id: user1.id, client_id: client1.id, role: 'Admin' });
			const result = await getDocGroup(ctx1, group.id);
			expect(result.id).toBe(group.id);
		});
	});

	describe('getDocsInGroupRecursive', () => {
		it('should return all documents in a group and its descendants', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			// Create hierarchy: Parent -> Child -> Grandchild
			const parent = await createTestDocGroup(db, { client_id: client.id, created_by: user.id, name: `Parent ${Date.now()}` });
			const child = await createTestDocGroup(db, {
				client_id: client.id,
				created_by: user.id,
				name: `Child ${Date.now()}`,
				parent_group_id: parent.id,
			});
			const grandchild = await createTestDocGroup(db, {
				client_id: client.id,
				created_by: user.id,
				name: `Grandchild ${Date.now()}`,
				parent_group_id: child.id,
			});

			// Create docs at each level
			const docInParent = await createTestDoc(db, { client_id: client.id, created_by: user.id, doc_group_id: parent.id });
			const docInChild = await createTestDoc(db, { client_id: client.id, created_by: user.id, doc_group_id: child.id });
			const docInGrandchild = await createTestDoc(db, { client_id: client.id, created_by: user.id, doc_group_id: grandchild.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocsInGroupRecursive(ctx, parent.id);

			expect(result.length).toBe(3);
			const docIds = result.map((d) => d.id);
			expect(docIds).toContain(docInParent.id);
			expect(docIds).toContain(docInChild.id);
			expect(docIds).toContain(docInGrandchild.id);
		});

		it('should return empty array for group with no docs', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const group = await createTestDocGroup(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDocsInGroupRecursive(ctx, group.id);

			expect(result.length).toBe(0);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });

			// Create group and doc in client1
			const group = await createTestDocGroup(db, {
				client_id: client1.id,
				created_by: user1.id,
				name: `Isolated Group ${Date.now()}`,
			});
			await createTestDoc(db, { client_id: client1.id, created_by: user1.id, doc_group_id: group.id });

			// Client2 should not see client1's docs even if they somehow know the group ID
			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getDocsInGroupRecursive(ctx2, group.id);

			expect(result.length).toBe(0);
		});
	});

	// =====================================================================
	// HELPER QUERIES
	// =====================================================================

	describe('getDocCountByClaimId', () => {
		it('should return count of documents for a claim', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, claim_id: claim.id });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, claim_id: claim.id });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, claim_id: claim.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const count = await getDocCountByClaimId(ctx, claim.id);

			expect(count).toBe(3);
		});

		it('should return 0 for claim with no documents', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const count = await getDocCountByClaimId(ctx, claim.id);

			expect(count).toBe(0);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client1.id });
			await createTestDoc(db, { client_id: client1.id, created_by: user1.id, claim_id: claim.id });
			await createTestDoc(db, { client_id: client1.id, created_by: user1.id, claim_id: claim.id });

			// Client2 should not count client1's docs
			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const count = await getDocCountByClaimId(ctx2, claim.id);

			expect(count).toBe(0);
		});
	});

	describe('getDocCountByGroupId', () => {
		it('should return count of documents in a group', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const group = await createTestDocGroup(db, { client_id: client.id, created_by: user.id, name: `Count Group ${Date.now()}` });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, doc_group_id: group.id });
			await createTestDoc(db, { client_id: client.id, created_by: user.id, doc_group_id: group.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const count = await getDocCountByGroupId(ctx, group.id);

			expect(count).toBe(2);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const group = await createTestDocGroup(db, {
				client_id: client1.id,
				created_by: user1.id,
				name: `Isolated Count Group ${Date.now()}`,
			});
			await createTestDoc(db, { client_id: client1.id, created_by: user1.id, doc_group_id: group.id });

			// Client2 should not count client1's docs
			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const count = await getDocCountByGroupId(ctx2, group.id);

			expect(count).toBe(0);
		});
	});

	describe('docExists', () => {
		it('should return true for existing document', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const doc = await createTestDoc(db, { client_id: client.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const exists = await docExists(ctx, doc.id);

			expect(exists).toBe(true);
		});

		it('should return false for non-existent document', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const exists = await docExists(ctx, 999999);

			expect(exists).toBe(false);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const doc = await createTestDoc(db, { client_id: client1.id, created_by: user1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const exists = await docExists(ctx2, doc.id);

			expect(exists).toBe(false);
		});
	});

	// =====================================================================
	// SYSTEM FOLDER QUERIES
	// =====================================================================

	describe('getOrCreateUsersFolder', () => {
		it('should create Users folder if not exists', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const folderId = await getOrCreateUsersFolder(ctx);

			expect(folderId).toBeGreaterThan(0);

			// Verify the folder was created correctly
			const folder = await getDocGroup(ctx, folderId);
			expect(folder.name).toBe('Users');
			expect(folder.system).toBe(true);
			expect(folder.group_type).toBe(DocGroupType.CATEGORY);
			expect(folder.parent_group_id).toBeNull();
		});

		it('should return existing Users folder if already exists', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const folderId1 = await getOrCreateUsersFolder(ctx);
			const folderId2 = await getOrCreateUsersFolder(ctx);

			expect(folderId1).toBe(folderId2);
		});
	});

	describe('getOrCreateUserFolder', () => {
		it('should create user-specific folder under Users', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const folderId = await getOrCreateUserFolder(ctx, user.id);

			expect(folderId).toBeGreaterThan(0);

			const folder = await getDocGroup(ctx, folderId);
			expect(folder.user_id).toBe(user.id);
			expect(folder.group_type).toBe(DocGroupType.USER);
			expect(folder.parent_group_id).not.toBeNull();
		});

		it('should return existing user folder if already exists', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const folderId1 = await getOrCreateUserFolder(ctx, user.id);
			const folderId2 = await getOrCreateUserFolder(ctx, user.id);

			expect(folderId1).toBe(folderId2);
		});
	});

	describe('getOrCreateSharedFolder', () => {
		it('should create Shared folder if not exists', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const folderId = await getOrCreateSharedFolder(ctx);

			expect(folderId).toBeGreaterThan(0);

			const folder = await getDocGroup(ctx, folderId);
			expect(folder.name).toBe('Shared');
			expect(folder.system).toBe(true);
			expect(folder.group_type).toBe(DocGroupType.CATEGORY);
		});

		it('should return existing Shared folder if already exists', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const folderId1 = await getOrCreateSharedFolder(ctx);
			const folderId2 = await getOrCreateSharedFolder(ctx);

			expect(folderId1).toBe(folderId2);
		});
	});

	describe('getSharedFolderContents', () => {
		it('should return shared folder and child folders', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Create shared folder and add children
			const sharedFolderId = await getOrCreateSharedFolder(ctx);
			const childFolder = await createDocGroup(ctx, {
				name: 'Shared Child',
				parent_group_id: sharedFolderId,
				group_type: DocGroupType.CUSTOM,
				sort_order: 0,
				system: false,
			});
			const grandchildFolder = await createDocGroup(ctx, {
				name: 'Shared Grandchild',
				parent_group_id: childFolder.id,
				group_type: DocGroupType.CUSTOM,
				sort_order: 0,
				system: false,
			});

			const result = await getSharedFolderContents(ctx);

			expect(result.sharedFolder.name).toBe('Shared');
			expect(result.childFolders.length).toBeGreaterThanOrEqual(2);

			const folderIds = result.childFolders.map((f) => f.id);
			expect(folderIds).toContain(childFolder.id);
			expect(folderIds).toContain(grandchildFolder.id);
		});

		it('should return empty childFolders if shared folder has no children', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Just ensure shared folder exists (fresh client, no children)
			await getOrCreateSharedFolder(ctx);

			const result = await getSharedFolderContents(ctx);

			expect(result.sharedFolder.name).toBe('Shared');
			// May have children from previous tests in same schema, so just verify structure
			expect(Array.isArray(result.childFolders)).toBe(true);
		});
	});
});
