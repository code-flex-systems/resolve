/**
 * Integration tests for checklistQueries
 *
 * These tests run against a real database to verify:
 * - Multi-tenant data isolation
 * - Role-based access control (Admin vs regular users)
 * - Complex query logic (recursive CTEs, aggregations)
 * - Checklist progress calculations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestChecklist,
	createTestChecklistClaim,
	createTestDeskLocationType,
	createTestDeskLocation,
	createTestUserDeskLocation,
	createTestPage,
	createTestPageInstance,
	createTestQuestion,
	createTestAnswer,
	createTestQuestionResponse,
	createTestQuestionResponseAnswer,
} from '@/__tests__/integration/fixtures';
import {
	createChecklist,
	getChecklistForDeletion,
	deleteChecklist,
	modifyChecklistClaim,
	getChecklist,
	getChecklists,
	getChecklistCount,
	getChecklistClaim,
	getChecklistClaimProgress,
	getChecklistClaimStats,
	getChecklistSummary,
	getChecklistSummaryDetail,
	getChecklistClaims,
	exportChecklistClaims,
	getRecentChecklistClaims,
	modifyChecklist,
} from '../checklistQueries';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { ClaimStatus, SummarySegment } from '@/config/enums';

describe('checklistQueries integration', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	describe('createChecklist', () => {
		it('should create a new checklist', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await createChecklist(ctx, 'My New Checklist');

			// Assert
			expect(result.name).toBe('My New Checklist');
			expect(result.client_id).toBe(client.id);
			expect(result.created_by).toBe(user.id);
			expect(result.published).toBe(false);

			const storedChecklist = await db
				.selectFrom('checklist')
				.selectAll()
				.where('id', '=', result.id)
				.executeTakeFirstOrThrow();
			expect(storedChecklist.name).toBe('My New Checklist');
		});

		it('should copy page instances from existing checklist', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Create source checklist with pages
			const sourceChecklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Source Checklist',
			});
			const page1 = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Page 1' });
			const page2 = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Page 2' });
			await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page1.id,
				checklist_id: sourceChecklist.id,
				created_by: user.id,
				position: 0,
			});
			await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page2.id,
				checklist_id: sourceChecklist.id,
				created_by: user.id,
				position: 1,
			});

			// Act
			const newChecklist = await createChecklist(ctx, 'Copied Checklist', sourceChecklist.id);

			// Assert
			const pageInstances = await db
				.selectFrom('page_instance')
				.selectAll()
				.where('checklist_id', '=', newChecklist.id)
				.execute();

			expect(pageInstances).toHaveLength(2);
			expect(pageInstances.map((p) => p.page_id).sort()).toEqual([page1.id, page2.id].sort());
		});
	});

	describe('getChecklistForDeletion', () => {
		it('should return checklist details for deletion', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'To Delete',
				published: true,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklistForDeletion(ctx, checklist.id);

			// Assert
			expect(result).toBeDefined();
			expect(result?.id).toBe(checklist.id);
			expect(result?.name).toBe('To Delete');
			expect(result?.published).toBe(true);
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client1.id,
				created_by: user1.id,
				name: 'Client 1 Checklist',
			});

			const ctx = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result = await getChecklistForDeletion(ctx, checklist.id);

			// Assert - should not find the checklist
			expect(result).toBeUndefined();
		});
	});

	describe('deleteChecklist', () => {
		it('should delete a checklist', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'To Be Deleted',
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			await deleteChecklist(ctx, checklist.id);

			// Assert
			const result = await db
				.selectFrom('checklist')
				.selectAll()
				.where('id', '=', checklist.id)
				.executeTakeFirst();
			expect(result).toBeUndefined();
		});
	});

	describe('modifyChecklistClaim', () => {
		it('should update checklist_claim status', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: user.id,
				assignee: user.id,
				status: 'in_progress',
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			await modifyChecklistClaim(ctx, checklist.id, claim.id, ClaimStatus.BLOCKED);

			// Assert
			const result = await db
				.selectFrom('checklist_claim')
				.select(['status', 'updated_by'])
				.where('checklist_id', '=', checklist.id)
				.where('claim_id', '=', claim.id)
				.executeTakeFirst();

			expect(result?.status).toBe(ClaimStatus.BLOCKED);
			expect(result?.updated_by).toBe(user.id);
		});

		it('should set submitted_by and submitted_at when status is SUBMITTED', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: user.id,
				assignee: user.id,
				status: 'in_progress',
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			await modifyChecklistClaim(ctx, checklist.id, claim.id, ClaimStatus.SUBMITTED);

			// Assert
			const result = await db
				.selectFrom('checklist_claim')
				.select(['status', 'submitted_by', 'submitted_at'])
				.where('checklist_id', '=', checklist.id)
				.where('claim_id', '=', claim.id)
				.executeTakeFirst();

			expect(result?.status).toBe(ClaimStatus.SUBMITTED);
			expect(result?.submitted_by).toBe(user.id);
			expect(result?.submitted_at).toBeDefined();
		});

		it('should update assignee by email', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, {
				client_id: client.id,
				role: 'Admin',
				email: 'user1@test.com',
			});
			const user2 = await createTestUser(db, {
				client_id: client.id,
				role: 'Contributor',
				email: 'user2@test.com',
			});
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user1.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: user1.id,
				assignee: user1.id,
			});
			const ctx = createTestContext(db, { id: user1.id, client_id: client.id, role: 'Admin' });

			// Act
			await modifyChecklistClaim(ctx, checklist.id, claim.id, undefined, 'user2@test.com');

			// Assert
			const result = await db
				.selectFrom('checklist_claim')
				.select(['assignee'])
				.where('checklist_id', '=', checklist.id)
				.where('claim_id', '=', claim.id)
				.executeTakeFirst();

			expect(result?.assignee).toBe(user2.id);
		});

		it('should throw error when assignee email not found', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: user.id,
				assignee: user.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act & Assert
			await expect(
				modifyChecklistClaim(ctx, checklist.id, claim.id, undefined, 'nonexistent@test.com')
			).rejects.toThrow('Could not find user');
		});
	});

	describe('getChecklist', () => {
		it('should return checklist for admin regardless of published status', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const unpublishedChecklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Unpublished',
				published: false,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklist(ctx, unpublishedChecklist.id);

			// Assert
			expect(result.id).toBe(unpublishedChecklist.id);
			expect(result.name).toBe('Unpublished');
		});

		it('should only return published checklists for non-admin users', async () => {
			// Arrange
			const client = await createTestClient(db);
			const admin = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const contributor = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const unpublishedChecklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: admin.id,
				name: 'Unpublished',
				published: false,
			});
			const ctx = createTestContext(db, { id: contributor.id, client_id: client.id, role: 'Contributor' });

			// Act & Assert
			await expect(getChecklist(ctx, unpublishedChecklist.id)).rejects.toThrow();
		});

		it('should return published checklist for contributor users', async () => {
			// Arrange
			const client = await createTestClient(db);
			const admin = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const contributor = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const publishedChecklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: admin.id,
				name: 'Published For Contributor',
				published: true,
			});
			const ctx = createTestContext(db, { id: contributor.id, client_id: client.id, role: 'Contributor' });

			// Act
			const result = await getChecklist(ctx, publishedChecklist.id);

			// Assert
			expect(result.id).toBe(publishedChecklist.id);
			expect(result.name).toBe('Published For Contributor');
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client1.id,
				created_by: user1.id,
				published: true,
			});
			const ctx = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act & Assert
			await expect(getChecklist(ctx, checklist.id)).rejects.toThrow();
		});
	});

	describe('getChecklists', () => {
		it('should return all checklists for admin', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Published',
				published: true,
			});
			await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Unpublished',
				published: false,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklists(ctx);

			// Assert
			expect(result.length).toBeGreaterThanOrEqual(2);
			const names = result.map((c) => c.name);
			expect(names).toContain('Published');
			expect(names).toContain('Unpublished');
		});

		it('should only return published checklists for contributors', async () => {
			// Arrange
			const client = await createTestClient(db);
			const admin = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const contributor = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			await createTestChecklist(db, {
				client_id: client.id,
				created_by: admin.id,
				name: 'Published For Contributor',
				published: true,
			});
			await createTestChecklist(db, {
				client_id: client.id,
				created_by: admin.id,
				name: 'Unpublished For Contributor',
				published: false,
			});
			const ctx = createTestContext(db, { id: contributor.id, client_id: client.id, role: 'Contributor' });

			// Act
			const result = await getChecklists(ctx);

			// Assert
			const names = result.map((c) => c.name);
			expect(names).toContain('Published For Contributor');
			expect(names).not.toContain('Unpublished For Contributor');
		});

		it('should filter by search term', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Property Damage Checklist',
				published: true,
			});
			await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Auto Claim Checklist',
				published: true,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklists(ctx, { searchTerm: 'Property' });

			// Assert
			expect(result.length).toBe(1);
			expect(result[0].name).toBe('Property Damage Checklist');
		});

		it('should include page count', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'With Pages',
				published: true,
			});
			const page1 = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const page2 = await createTestPage(db, { client_id: client.id, created_by: user.id });
			await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page1.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});
			await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page2.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklists(ctx, { searchTerm: 'With Pages' });

			// Assert
			expect(result.length).toBe(1);
			expect(Number(result[0].page_count)).toBe(2);
		});

		it('should include creator name formatted as "First Last"', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, {
				client_id: client.id,
				role: 'Admin',
				first: 'John',
				last: 'Smith',
			});
			await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Creator Test Checklist',
				published: true,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklists(ctx, { searchTerm: 'Creator Test' });

			// Assert
			expect(result.length).toBe(1);
			expect(result[0].creator).toBe('John Smith');
		});
	});

	describe('getChecklistCount', () => {
		it('should return published and unpublished counts', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			await createTestChecklist(db, { client_id: client.id, created_by: user.id, published: true });
			await createTestChecklist(db, { client_id: client.id, created_by: user.id, published: true });
			await createTestChecklist(db, { client_id: client.id, created_by: user.id, published: false });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklistCount(ctx, client.id);

			// Assert
			expect(result.published).toBe(2);
			expect(result.unpublished).toBe(1);
			expect(result.total).toBe(3);
		});
	});

	describe('getChecklistClaim', () => {
		it('should return checklist claim with assignee details', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, {
				client_id: client.id,
				role: 'Admin',
				first: 'John',
				last: 'Doe',
				email: 'john@test.com',
			});
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: user.id,
				assignee: user.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklistClaim(ctx, checklist.id, claim.id);

			// Assert
			expect(result).toBeDefined();
			expect(result?.checklist_id).toBe(checklist.id);
			expect(result?.claim_id).toBe(claim.id);
			expect(result?.first).toBe('John');
			expect(result?.last).toBe('Doe');
			expect(result?.email).toBe('john@test.com');
		});

		it('should update last_opened timestamp', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: user.id,
				assignee: user.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			await getChecklistClaim(ctx, checklist.id, claim.id);

			// Assert
			const result = await db
				.selectFrom('checklist_claim')
				.select(['last_opened'])
				.where('checklist_id', '=', checklist.id)
				.where('claim_id', '=', claim.id)
				.executeTakeFirst();

			expect(result?.last_opened).toBeDefined();
			// Verify it's today's date
			const lastOpened = new Date(result!.last_opened!);
			const today = new Date();
			expect(lastOpened.toISOString().split('T')[0]).toBe(today.toISOString().split('T')[0]);
		});

		it('should enforce tenant isolation', async () => {
			// Arrange
			const client1 = await createTestClient(db, { name: 'Client 1' });
			const client2 = await createTestClient(db, { name: 'Client 2' });
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client1.id,
				created_by: user1.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client1.id });
			await createTestChecklistClaim(db, {
				client_id: client1.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: user1.id,
				assignee: user1.id,
			});

			const ctx = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// Act
			const result = await getChecklistClaim(ctx, checklist.id, claim.id);

			// Assert - should not find the checklist claim
			expect(result).toBeUndefined();
		});
	});

	describe('getChecklistClaimProgress', () => {
		it('should return zero progress for checklist with no responses', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			// Create page with questions
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});
			await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklistClaimProgress(ctx, checklist.id, claim.id);

			// Assert
			expect(result.totalQuestionCount).toBe(2);
			expect(result.answerCount).toBe(0);
		});

		it('should count answered questions correctly', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			// Create page with questions and answers
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const pageInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});
			const question1 = await createTestQuestion(db, {
				client_id: client.id,
				page_id: page.id,
				created_by: user.id,
			});
			const question2 = await createTestQuestion(db, {
				client_id: client.id,
				page_id: page.id,
				created_by: user.id,
			});
			const answer1 = await createTestAnswer(db, {
				client_id: client.id,
				question_id: question1.id,
				created_by: user.id,
				text: 'Yes',
			});

			// Create response for question1 with an answer
			const response1 = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: pageInstance.id,
				claim_id: claim.id,
				question_id: question1.id,
				created_by: user.id,
			});
			await createTestQuestionResponseAnswer(db, {
				response_id: response1.id,
				answer_id: answer1.id,
			});

			// Question2 remains unanswered

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklistClaimProgress(ctx, checklist.id, claim.id);

			// Assert
			expect(result.totalQuestionCount).toBe(2);
			expect(result.answerCount).toBe(1);
		});

		it('should count text responses as answered', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const pageInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});
			const question = await createTestQuestion(db, {
				client_id: client.id,
				page_id: page.id,
				created_by: user.id,
				type: 'freeform',
			});

			// Create response with text
			await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: pageInstance.id,
				claim_id: claim.id,
				question_id: question.id,
				created_by: user.id,
				response_text: 'This is my answer',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklistClaimProgress(ctx, checklist.id, claim.id);

			// Assert
			expect(result.totalQuestionCount).toBe(1);
			expect(result.answerCount).toBe(1);
		});

		it('should not count questions on locked child pages until parent answer unlocks them', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			// Parent page with one question and two answers (one of which unlocks a child page)
			const parentPage = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const parentInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: parentPage.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});
			const parentQuestion = await createTestQuestion(db, {
				client_id: client.id,
				page_id: parentPage.id,
				created_by: user.id,
			});

			// Child page (locked until parent answer is selected)
			const childPage = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const childInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: childPage.id,
				checklist_id: checklist.id,
				parent_instance_id: parentInstance.id,
				created_by: user.id,
			});
			await createTestQuestion(db, {
				client_id: client.id,
				page_id: childPage.id,
				created_by: user.id,
			});
			await createTestQuestion(db, {
				client_id: client.id,
				page_id: childPage.id,
				created_by: user.id,
			});

			// Answer that unlocks the child page
			await createTestAnswer(db, {
				client_id: client.id,
				question_id: parentQuestion.id,
				created_by: user.id,
				text: 'Yes - unlock child',
				calls_instance_id: childInstance.id,
			});
			// Answer that does NOT unlock the child page
			await createTestAnswer(db, {
				client_id: client.id,
				question_id: parentQuestion.id,
				created_by: user.id,
				text: 'No',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act - no responses yet, child page should be locked
			const result = await getChecklistClaimProgress(ctx, checklist.id, claim.id);

			// Assert - only parent's 1 question counted, child's 2 questions are hidden
			expect(result.totalQuestionCount).toBe(1);
			expect(result.answerCount).toBe(0);
		});

		it('should unlock child page questions when an unlocking answer is selected', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			const parentPage = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const parentInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: parentPage.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});
			const parentQuestion = await createTestQuestion(db, {
				client_id: client.id,
				page_id: parentPage.id,
				created_by: user.id,
			});

			const childPage = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const childInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: childPage.id,
				checklist_id: checklist.id,
				parent_instance_id: parentInstance.id,
				created_by: user.id,
			});
			await createTestQuestion(db, {
				client_id: client.id,
				page_id: childPage.id,
				created_by: user.id,
			});
			await createTestQuestion(db, {
				client_id: client.id,
				page_id: childPage.id,
				created_by: user.id,
			});

			const unlockingAnswer = await createTestAnswer(db, {
				client_id: client.id,
				question_id: parentQuestion.id,
				created_by: user.id,
				calls_instance_id: childInstance.id,
			});

			// User selects the unlocking answer on the parent question
			const response = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: parentInstance.id,
				claim_id: claim.id,
				question_id: parentQuestion.id,
				created_by: user.id,
			});
			await createTestQuestionResponseAnswer(db, {
				response_id: response.id,
				answer_id: unlockingAnswer.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklistClaimProgress(ctx, checklist.id, claim.id);

			// Assert - parent (1) + unlocked child (2) = 3 total, 1 answered (the unlocking answer)
			expect(result.totalQuestionCount).toBe(3);
			expect(result.answerCount).toBe(1);
		});

		it('should recursively unlock grandchild pages through nested answers', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			// 3-level tree: parent -> child -> grandchild
			const parentPage = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const parentInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: parentPage.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});
			const parentQuestion = await createTestQuestion(db, {
				client_id: client.id,
				page_id: parentPage.id,
				created_by: user.id,
			});

			const childPage = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const childInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: childPage.id,
				checklist_id: checklist.id,
				parent_instance_id: parentInstance.id,
				created_by: user.id,
			});
			const childQuestion = await createTestQuestion(db, {
				client_id: client.id,
				page_id: childPage.id,
				created_by: user.id,
			});

			const grandchildPage = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const grandchildInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: grandchildPage.id,
				checklist_id: checklist.id,
				parent_instance_id: childInstance.id,
				created_by: user.id,
			});
			await createTestQuestion(db, {
				client_id: client.id,
				page_id: grandchildPage.id,
				created_by: user.id,
			});

			// Parent answer unlocks child
			const parentAnswer = await createTestAnswer(db, {
				client_id: client.id,
				question_id: parentQuestion.id,
				created_by: user.id,
				calls_instance_id: childInstance.id,
			});
			// Child answer unlocks grandchild
			const childAnswer = await createTestAnswer(db, {
				client_id: client.id,
				question_id: childQuestion.id,
				created_by: user.id,
				calls_instance_id: grandchildInstance.id,
			});

			// User selects parent's unlocking answer -> child unlocks
			const parentResponse = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: parentInstance.id,
				claim_id: claim.id,
				question_id: parentQuestion.id,
				created_by: user.id,
			});
			await createTestQuestionResponseAnswer(db, {
				response_id: parentResponse.id,
				answer_id: parentAnswer.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act - first check: only parent + child unlocked, grandchild still locked
			let result = await getChecklistClaimProgress(ctx, checklist.id, claim.id);
			expect(result.totalQuestionCount).toBe(2); // parent + child
			expect(result.answerCount).toBe(1);

			// User selects child's unlocking answer -> grandchild unlocks
			const childResponse = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: childInstance.id,
				claim_id: claim.id,
				question_id: childQuestion.id,
				created_by: user.id,
			});
			await createTestQuestionResponseAnswer(db, {
				response_id: childResponse.id,
				answer_id: childAnswer.id,
			});

			// Act - second check: all 3 levels unlocked
			result = await getChecklistClaimProgress(ctx, checklist.id, claim.id);
			expect(result.totalQuestionCount).toBe(3);
			expect(result.answerCount).toBe(2);
		});

		it('should not lock up on cycles (answer A unlocks page B, answer in B unlocks back to A)', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });

			// Two top-level page instances
			const pageA = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instanceA = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: pageA.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});
			const questionA = await createTestQuestion(db, {
				client_id: client.id,
				page_id: pageA.id,
				created_by: user.id,
			});

			const pageB = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instanceB = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: pageB.id,
				checklist_id: checklist.id,
				parent_instance_id: instanceA.id,
				created_by: user.id,
			});
			const questionB = await createTestQuestion(db, {
				client_id: client.id,
				page_id: pageB.id,
				created_by: user.id,
			});

			// Cycle: answer in A calls B, answer in B calls A (would cycle without protection)
			const answerA = await createTestAnswer(db, {
				client_id: client.id,
				question_id: questionA.id,
				created_by: user.id,
				calls_instance_id: instanceB.id,
			});
			const answerB = await createTestAnswer(db, {
				client_id: client.id,
				question_id: questionB.id,
				created_by: user.id,
				calls_instance_id: instanceA.id,
			});

			// Select both answers - the recursive CTE must detect the cycle and not loop
			const responseA = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: instanceA.id,
				claim_id: claim.id,
				question_id: questionA.id,
				created_by: user.id,
			});
			await createTestQuestionResponseAnswer(db, {
				response_id: responseA.id,
				answer_id: answerA.id,
			});
			const responseB = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: instanceB.id,
				claim_id: claim.id,
				question_id: questionB.id,
				created_by: user.id,
			});
			await createTestQuestionResponseAnswer(db, {
				response_id: responseB.id,
				answer_id: answerB.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act - this would hang or error without cycle detection in the CTE
			const result = await getChecklistClaimProgress(ctx, checklist.id, claim.id);

			// Assert - both questions counted exactly once despite the cycle
			expect(result.totalQuestionCount).toBe(2);
			expect(result.answerCount).toBe(2);
		});

		it('should enforce tenant isolation', async () => {
			// Arrange - client A has a populated checklist
			const clientA = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id, role: 'Admin' });
			const checklistA = await createTestChecklist(db, {
				client_id: clientA.id,
				created_by: userA.id,
				published: true,
			});
			const claimA = await createTestClaim(db, { client_id: clientA.id });
			const pageA = await createTestPage(db, { client_id: clientA.id, created_by: userA.id });
			await createTestPageInstance(db, {
				client_id: clientA.id,
				page_id: pageA.id,
				checklist_id: checklistA.id,
				created_by: userA.id,
			});
			await createTestQuestion(db, { client_id: clientA.id, page_id: pageA.id, created_by: userA.id });

			// Client B tries to query client A's checklist+claim
			const clientB = await createTestClient(db);
			const userB = await createTestUser(db, { client_id: clientB.id, role: 'Admin' });
			const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id, role: 'Admin' });

			// Act
			const result = await getChecklistClaimProgress(ctxB, checklistA.id, claimA.id);

			// Assert - client B sees nothing for client A's data
			expect(result.totalQuestionCount).toBe(0);
			expect(result.answerCount).toBe(0);
		});
	});

	describe('getChecklistSummary', () => {
		it('should return all four counts populated correctly', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const pageInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			// Q1: regular answer (answered, not action-required)
			const q1 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const q1Answer = await createTestAnswer(db, {
				client_id: client.id,
				question_id: q1.id,
				created_by: user.id,
				text: 'Yes',
			});
			const r1 = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: pageInstance.id,
				claim_id: claim.id,
				question_id: q1.id,
				created_by: user.id,
			});
			await createTestQuestionResponseAnswer(db, { response_id: r1.id, answer_id: q1Answer.id });

			// Q2: "Unknown" answer (answered AND action-required AND unknown)
			const q2 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const q2Answer = await createTestAnswer(db, {
				client_id: client.id,
				question_id: q2.id,
				created_by: user.id,
				text: 'Unknown',
			});
			const r2 = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: pageInstance.id,
				claim_id: claim.id,
				question_id: q2.id,
				created_by: user.id,
			});
			await createTestQuestionResponseAnswer(db, { response_id: r2.id, answer_id: q2Answer.id });

			// Q3: unanswered
			await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklistSummary(ctx, checklist.id, claim.id);

			// Assert
			expect(Number(result.total_questions)).toBe(3);
			expect(Number(result.total_answered)).toBe(2);
			expect(Number(result.total_action_required)).toBe(1);
			expect(Number(result.total_unknown)).toBe(1);
		});

		it('should count text-only responses as answered', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const pageInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});
			const q = await createTestQuestion(db, {
				client_id: client.id,
				page_id: page.id,
				created_by: user.id,
				type: 'freeform',
			});
			await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: pageInstance.id,
				claim_id: claim.id,
				question_id: q.id,
				created_by: user.id,
				response_text: 'Some free-form answer',
			});
			// Control: a second unanswered question to confirm we count "1 answered" exactly
			await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklistSummary(ctx, checklist.id, claim.id);

			// Assert
			expect(Number(result.total_questions)).toBe(2);
			expect(Number(result.total_answered)).toBe(1);
			expect(Number(result.total_action_required)).toBe(0);
			expect(Number(result.total_unknown)).toBe(0);
		});

		it('should NOT count requires_upload responses without doc as answered', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const pageInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			// Q1 (control): regular answer that IS counted as answered
			const q1 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const a1 = await createTestAnswer(db, {
				client_id: client.id,
				question_id: q1.id,
				created_by: user.id,
				text: 'Yes',
			});
			const r1 = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: pageInstance.id,
				claim_id: claim.id,
				question_id: q1.id,
				created_by: user.id,
			});
			await createTestQuestionResponseAnswer(db, { response_id: r1.id, answer_id: a1.id });

			// Q2: requires_upload answer selected, but no response_doc_id - should NOT count
			const q2 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const a2 = await createTestAnswer(db, {
				client_id: client.id,
				question_id: q2.id,
				created_by: user.id,
				text: 'Upload required',
				requires_upload: true,
			});
			const r2 = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: pageInstance.id,
				claim_id: claim.id,
				question_id: q2.id,
				created_by: user.id,
			});
			await createTestQuestionResponseAnswer(db, { response_id: r2.id, answer_id: a2.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklistSummary(ctx, checklist.id, claim.id);

			// Assert
			expect(Number(result.total_questions)).toBe(2);
			expect(Number(result.total_answered)).toBe(1);
		});

		it('should count action-required answers via action table OR has_additional_info empty', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const pageInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			// Q1: answer with an associated action - action_required
			const q1 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const a1 = await createTestAnswer(db, {
				client_id: client.id,
				question_id: q1.id,
				created_by: user.id,
				text: 'Has action',
			});
			await db
				.insertInto('action')
				.values({
					answer_id: a1.id,
					client_id: client.id,
					type: 'task',
					definition: JSON.stringify({ title: 'Do something' }),
					created_by: user.id,
				})
				.execute();
			const r1 = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: pageInstance.id,
				claim_id: claim.id,
				question_id: q1.id,
				created_by: user.id,
			});
			await createTestQuestionResponseAnswer(db, { response_id: r1.id, answer_id: a1.id });

			// Q2: has_additional_info=true with empty additional_info - action_required
			const q2 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const a2 = await createTestAnswer(db, {
				client_id: client.id,
				question_id: q2.id,
				created_by: user.id,
				text: 'Needs detail',
				has_additional_info: true,
			});
			const r2 = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: pageInstance.id,
				claim_id: claim.id,
				question_id: q2.id,
				created_by: user.id,
			});
			await createTestQuestionResponseAnswer(db, {
				response_id: r2.id,
				answer_id: a2.id,
				additional_info: '',
			});

			// Q3 (control): a plain answer that is NOT action-required
			const q3 = await createTestQuestion(db, { client_id: client.id, page_id: page.id, created_by: user.id });
			const a3 = await createTestAnswer(db, {
				client_id: client.id,
				question_id: q3.id,
				created_by: user.id,
				text: 'Plain answer',
			});
			const r3 = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: pageInstance.id,
				claim_id: claim.id,
				question_id: q3.id,
				created_by: user.id,
			});
			await createTestQuestionResponseAnswer(db, { response_id: r3.id, answer_id: a3.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklistSummary(ctx, checklist.id, claim.id);

			// Assert
			expect(Number(result.total_questions)).toBe(3);
			expect(Number(result.total_answered)).toBe(3);
			expect(Number(result.total_action_required)).toBe(2);
			expect(Number(result.total_unknown)).toBe(0);
		});

		it('should isolate by client_id', async () => {
			// Arrange - client A has data, client B queries for the same checklist+claim ids
			const clientA = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id, role: 'Admin' });
			const checklistA = await createTestChecklist(db, {
				client_id: clientA.id,
				created_by: userA.id,
				published: true,
			});
			const claimA = await createTestClaim(db, { client_id: clientA.id });
			const pageA = await createTestPage(db, { client_id: clientA.id, created_by: userA.id });
			await createTestPageInstance(db, {
				client_id: clientA.id,
				page_id: pageA.id,
				checklist_id: checklistA.id,
				created_by: userA.id,
			});
			await createTestQuestion(db, { client_id: clientA.id, page_id: pageA.id, created_by: userA.id });
			await createTestQuestion(db, { client_id: clientA.id, page_id: pageA.id, created_by: userA.id });

			const clientB = await createTestClient(db);
			const userB = await createTestUser(db, { client_id: clientB.id, role: 'Admin' });
			const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id, role: 'Admin' });

			// Act - client B queries client A's IDs
			const result = await getChecklistSummary(ctxB, checklistA.id, claimA.id);

			// Assert - all zeros because page_instance.client_id is filtered by client B
			expect(Number(result.total_questions)).toBe(0);
			expect(Number(result.total_answered)).toBe(0);
			expect(Number(result.total_action_required)).toBe(0);
			expect(Number(result.total_unknown)).toBe(0);
		});
	});

	describe('getChecklistSummaryDetail', () => {
		it('ANSWERED segment returns only questions with responses', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'Detail Page' });
			const pageInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			// Answered question
			const qAnswered = await createTestQuestion(db, {
				client_id: client.id,
				page_id: page.id,
				created_by: user.id,
				text: 'Answered question',
			});
			const ans = await createTestAnswer(db, {
				client_id: client.id,
				question_id: qAnswered.id,
				created_by: user.id,
				text: 'Yes',
			});
			const resp = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: pageInstance.id,
				claim_id: claim.id,
				question_id: qAnswered.id,
				created_by: user.id,
			});
			await createTestQuestionResponseAnswer(db, { response_id: resp.id, answer_id: ans.id });

			// Unanswered question (control)
			await createTestQuestion(db, {
				client_id: client.id,
				page_id: page.id,
				created_by: user.id,
				text: 'Unanswered question',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				segment: SummarySegment.ANSWERED,
			});

			// Assert
			expect(result.count).toBe(1);
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].question_text).toBe('Answered question');
			expect(result.rows[0].answer_texts).toBe('Yes');
		});

		it('UNANSWERED segment returns only questions without responses', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'P' });
			const pageInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			// Answered question (control)
			const qAnswered = await createTestQuestion(db, {
				client_id: client.id,
				page_id: page.id,
				created_by: user.id,
				text: 'Answered Q',
			});
			const ans = await createTestAnswer(db, {
				client_id: client.id,
				question_id: qAnswered.id,
				created_by: user.id,
				text: 'Yes',
			});
			const resp = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: pageInstance.id,
				claim_id: claim.id,
				question_id: qAnswered.id,
				created_by: user.id,
			});
			await createTestQuestionResponseAnswer(db, { response_id: resp.id, answer_id: ans.id });

			// Unanswered question
			await createTestQuestion(db, {
				client_id: client.id,
				page_id: page.id,
				created_by: user.id,
				text: 'Unanswered Q',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				segment: SummarySegment.UNANSWERED,
			});

			// Assert
			expect(result.count).toBe(1);
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].question_text).toBe('Unanswered Q');
		});

		it('ACTION_REQUIRED segment returns only action-required answers', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'P' });
			const pageInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			// Q1: action-required via attached action
			const q1 = await createTestQuestion(db, {
				client_id: client.id,
				page_id: page.id,
				created_by: user.id,
				text: 'Q1 with action',
			});
			const a1 = await createTestAnswer(db, {
				client_id: client.id,
				question_id: q1.id,
				created_by: user.id,
				text: 'Yes',
			});
			await db
				.insertInto('action')
				.values({
					answer_id: a1.id,
					client_id: client.id,
					type: 'task',
					definition: JSON.stringify({ title: 'Follow-up' }),
					created_by: user.id,
				})
				.execute();
			const r1 = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: pageInstance.id,
				claim_id: claim.id,
				question_id: q1.id,
				created_by: user.id,
			});
			await createTestQuestionResponseAnswer(db, { response_id: r1.id, answer_id: a1.id });

			// Q2 (control): plain answered, NOT action-required
			const q2 = await createTestQuestion(db, {
				client_id: client.id,
				page_id: page.id,
				created_by: user.id,
				text: 'Q2 plain',
			});
			const a2 = await createTestAnswer(db, {
				client_id: client.id,
				question_id: q2.id,
				created_by: user.id,
				text: 'No',
			});
			const r2 = await createTestQuestionResponse(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				instance_id: pageInstance.id,
				claim_id: claim.id,
				question_id: q2.id,
				created_by: user.id,
			});
			await createTestQuestionResponseAnswer(db, { response_id: r2.id, answer_id: a2.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklistSummaryDetail(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				segment: SummarySegment.ACTION_REQUIRED,
			});

			// Assert
			expect(result.count).toBe(1);
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].question_text).toBe('Q1 with action');
		});

		it('respects limit and offset, returns total via window function', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id, title: 'P' });
			const pageInstance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});

			// 3 unanswered questions
			for (let i = 0; i < 3; i++) {
				await createTestQuestion(db, {
					client_id: client.id,
					page_id: page.id,
					created_by: user.id,
					text: `Q${i}`,
					position: i,
				});
			}

			// Avoid no-unused-vars: pageInstance is referenced via the join in the source
			void pageInstance;

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act - page 1: limit 2
			const page1 = await getChecklistSummaryDetail(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				segment: SummarySegment.UNANSWERED,
				limit: 2,
				offset: 0,
			});

			// Page 2: limit 2 offset 2
			const page2 = await getChecklistSummaryDetail(ctx, {
				checklistId: checklist.id,
				claimId: claim.id,
				segment: SummarySegment.UNANSWERED,
				limit: 2,
				offset: 2,
			});

			// Assert
			expect(page1.count).toBe(3);
			expect(page1.rows).toHaveLength(2);
			expect(page2.count).toBe(3);
			expect(page2.rows).toHaveLength(1);
		});

		it('isolates by client_id', async () => {
			// Arrange - client A has answered data
			const clientA = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id, role: 'Admin' });
			const checklistA = await createTestChecklist(db, {
				client_id: clientA.id,
				created_by: userA.id,
				published: true,
			});
			const claimA = await createTestClaim(db, { client_id: clientA.id });
			const pageA = await createTestPage(db, { client_id: clientA.id, created_by: userA.id });
			const piA = await createTestPageInstance(db, {
				client_id: clientA.id,
				page_id: pageA.id,
				checklist_id: checklistA.id,
				created_by: userA.id,
			});
			const qA = await createTestQuestion(db, {
				client_id: clientA.id,
				page_id: pageA.id,
				created_by: userA.id,
			});
			const ansA = await createTestAnswer(db, {
				client_id: clientA.id,
				question_id: qA.id,
				created_by: userA.id,
			});
			const respA = await createTestQuestionResponse(db, {
				client_id: clientA.id,
				checklist_id: checklistA.id,
				instance_id: piA.id,
				claim_id: claimA.id,
				question_id: qA.id,
				created_by: userA.id,
			});
			await createTestQuestionResponseAnswer(db, { response_id: respA.id, answer_id: ansA.id });

			const clientB = await createTestClient(db);
			const userB = await createTestUser(db, { client_id: clientB.id, role: 'Admin' });
			const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id, role: 'Admin' });

			// Act - client B requests detail for client A's IDs
			const result = await getChecklistSummaryDetail(ctxB, {
				checklistId: checklistA.id,
				claimId: claimA.id,
				segment: SummarySegment.ANSWERED,
			});

			// Assert
			expect(result.count).toBe(0);
			expect(result.rows).toEqual([]);
		});
	});

	describe('getChecklistClaimStats', () => {
		it('should return claim stats grouped by checklist and status', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Stats Checklist',
				published: true,
			});
			const claim1 = await createTestClaim(db, { client_id: client.id });
			const claim2 = await createTestClaim(db, { client_id: client.id });
			const claim3 = await createTestClaim(db, { client_id: client.id });

			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim1.id,
				created_by: user.id,
				assignee: user.id,
				status: 'in_progress',
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim2.id,
				created_by: user.id,
				assignee: user.id,
				status: 'in_progress',
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim3.id,
				created_by: user.id,
				assignee: user.id,
				status: 'completed',
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklistClaimStats(ctx, checklist.id);

			// Assert
			const inProgressCount = result.filter((r) => r.status === 'in_progress').length;
			const completedCount = result.filter((r) => r.status === 'completed').length;
			expect(inProgressCount).toBe(2);
			expect(completedCount).toBe(1);
		});

		it('should filter by user', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user1.id,
				published: true,
			});
			const claim1 = await createTestClaim(db, { client_id: client.id });
			const claim2 = await createTestClaim(db, { client_id: client.id });

			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim1.id,
				created_by: user1.id,
				assignee: user1.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim2.id,
				created_by: user1.id,
				assignee: user2.id,
			});

			const ctx = createTestContext(db, { id: user1.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getChecklistClaimStats(ctx, checklist.id, [user2.id]);

			// Assert
			expect(result).toHaveLength(1);
		});
	});

	describe('getChecklistClaims', () => {
		it('should return paginated checklist claims', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin', first: 'Jane', last: 'Smith' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Paginated Checklist',
				published: true,
			});

			// Create multiple claims
			for (let i = 0; i < 5; i++) {
				const claim = await createTestClaim(db, { client_id: client.id, claim_number: `PAGED-${i}` });
				await createTestChecklistClaim(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					claim_id: claim.id,
					created_by: user.id,
					assignee: user.id,
				});
			}

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const pastDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
			const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
			const result = await getChecklistClaims(
				ctx,
				{ range: [pastDate, futureDate], checklistId: checklist.id },
				3,
				0
			);

			// Assert
			expect(result.rows).toHaveLength(3);
			expect(result.count).toBe(5);
			expect(result.rows[0].checklist_name).toBe('Paginated Checklist');
			expect(result.rows[0].claim_number).toContain('PAGED-');
		});

		it('should filter by date range', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id });
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: user.id,
				assignee: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const futureDate = new Date(Date.now() + 86400000); // Tomorrow
			const farFutureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

			// Act
			const result = await getChecklistClaims(
				ctx,
				{ range: [futureDate, farFutureDate], checklistId: checklist.id },
				10,
				0
			);

			// Assert - should not find claims created before the future date filter
			expect(result.count).toBe(0);
		});

		it('should filter by claim status', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				published: true,
			});
			const claim1 = await createTestClaim(db, { client_id: client.id });
			const claim2 = await createTestClaim(db, { client_id: client.id });
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim1.id,
				created_by: user.id,
				assignee: user.id,
				status: ClaimStatus.IN_PROGRESS,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim2.id,
				created_by: user.id,
				assignee: user.id,
				status: ClaimStatus.SUBMITTED,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const pastDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
			const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

			// Act
			const result = await getChecklistClaims(
				ctx,
				{ range: [pastDate, futureDate], checklistId: checklist.id, claimStatus: ClaimStatus.SUBMITTED },
				10,
				0
			);

			// Assert
			expect(result.count).toBe(1);
			expect(result.rows[0].status).toBe(ClaimStatus.SUBMITTED);
		});

		it('should filter by users array', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const user3 = await createTestUser(db, { client_id: client.id, role: 'Contributor' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user1.id,
				published: true,
			});
			const claim1 = await createTestClaim(db, { client_id: client.id });
			const claim2 = await createTestClaim(db, { client_id: client.id });
			const claim3 = await createTestClaim(db, { client_id: client.id });

			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim1.id,
				created_by: user1.id,
				assignee: user1.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim2.id,
				created_by: user1.id,
				assignee: user2.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim3.id,
				created_by: user1.id,
				assignee: user3.id,
			});

			const ctx = createTestContext(db, { id: user1.id, client_id: client.id, role: 'Admin' });
			const pastDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
			const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

			// Act - filter to only user2 and user3
			const result = await getChecklistClaims(
				ctx,
				{ range: [pastDate, futureDate], checklistId: checklist.id, users: [user2.id, user3.id] },
				10,
				0
			);

			// Assert
			expect(result.count).toBe(2);
			const assignees = result.rows.map((r) => r.assignee);
			expect(assignees).toContain(user2.id);
			expect(assignees).toContain(user3.id);
			expect(assignees).not.toContain(user1.id);
		});
	});

	describe('exportChecklistClaims', () => {
		it('should return all matching claims without pagination', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Export Checklist',
				published: true,
			});

			for (let i = 0; i < 10; i++) {
				const claim = await createTestClaim(db, { client_id: client.id, claim_number: `EXPORT-${i}` });
				await createTestChecklistClaim(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					claim_id: claim.id,
					created_by: user.id,
					assignee: user.id,
				});
			}

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });
			const pastDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
			const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

			// Act
			const result = await exportChecklistClaims(ctx, { range: [pastDate, futureDate], checklistId: checklist.id });

			// Assert
			expect(result).toHaveLength(10);
			const exportRow = result.find((row) => row.claim_number === 'EXPORT-5');
			expect(exportRow).toBeDefined();
			expect(exportRow?.checklist_name).toBe('Export Checklist');
			expect(exportRow?.assignee_email).toBe(user.email);
		});
	});

	describe('getRecentChecklistClaims', () => {
		it('should return recent claims for the user', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Recent Checklist',
				published: true,
			});
			const claim = await createTestClaim(db, { client_id: client.id, claim_number: 'RECENT-001' });
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: user.id,
				assignee: user.id,
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await getRecentChecklistClaims(ctx);

			// Assert
			const found = result.find((r) => r.claim_number === 'RECENT-001');
			expect(found).toBeDefined();
			expect(found?.checklist_name).toBe('Recent Checklist');
			expect(found?.status).toBe(ClaimStatus.IN_PROGRESS);
		});

		it('should include claims at user desk location', async () => {
			// Arrange
			const client = await createTestClient(db);
			const creator = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskUser = await createTestUser(db, { client_id: client.id, role: 'Contributor' });

			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			await createTestUserDeskLocation(db, { user_id: deskUser.id, desk_location_id: desk.id });

			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: creator.id,
				name: 'Desk Checklist',
				published: true,
			});
			const claim = await createTestClaim(db, {
				client_id: client.id,
				claim_number: 'DESK-RECENT-001',
				desk_location_id: desk.id,
			});
			await createTestChecklistClaim(db, {
				client_id: client.id,
				checklist_id: checklist.id,
				claim_id: claim.id,
				created_by: creator.id,
				assignee: creator.id, // Assigned to creator, not deskUser
			});

			const ctx = createTestContext(db, { id: deskUser.id, client_id: client.id, role: 'Contributor' });

			// Act
			const result = await getRecentChecklistClaims(ctx);

			// Assert - deskUser should see the claim via their desk assignment
			const found = result.find((r) => r.claim_number === 'DESK-RECENT-001');
			expect(found).toBeDefined();
		});
	});

	describe('modifyChecklist', () => {
		it('should update checklist properties', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Original Name',
				published: false,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act
			const result = await modifyChecklist(ctx, checklist.id, {
				name: 'Updated Name',
				published: true,
			});

			// Assert
			expect(result.name).toBe('Updated Name');
			expect(result.published).toBe(true);
			expect(result.updated_by).toBe(user.id);

			const storedChecklist = await db
				.selectFrom('checklist')
				.selectAll()
				.where('id', '=', checklist.id)
				.executeTakeFirstOrThrow();
			expect(storedChecklist.name).toBe('Updated Name');
		});

		it('should only update provided fields', async () => {
			// Arrange
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'Keep This Name',
				published: false,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Act - only update published
			const result = await modifyChecklist(ctx, checklist.id, { published: true });

			// Assert
			expect(result.name).toBe('Keep This Name');
			expect(result.published).toBe(true);
		});
	});
});
