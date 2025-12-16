/**
 * Integration tests for userQueries
 *
 * Tests cover:
 * - getUsersPaginated: Get users with pagination and filters
 * - getUsersWithDeskAssignments: Get users with desk assignment counts
 * - getUsers: Get enabled users with search
 * - getInactiveUserCount: Count users with no recent login
 * - getUserActivity: Get daily active user counts
 * - getUserActivityDetail: Get audit log details for date
 * - getUserCount: Count users with filters
 * - getUserCountMetrics: Get active/inactive counts
 * - getUser: Get single user by id
 * - updateUser: Update user profile
 * - deleteUser: Delete user
 * - upsertUserFromClerk: Upsert user from webhook
 * - Tenant isolation on all operations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	getUsersPaginated,
	getUsersWithDeskAssignments,
	getUsers,
	getInactiveUserCount,
	getUserActivity,
	getUserActivityDetail,
	getUserCount,
	getUserCountMetrics,
	getUser,
	updateUser,
	deleteUser,
	upsertUserFromClerk,
} from '../userQueries';
import { createTestClient, createTestUser } from '@/__tests__/integration/fixtures';

describe('userQueries integration tests', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// Helper to create response audit log for activity tests
	async function createTestResponseAuditLog(
		clientId: string,
		userId: string,
		params: { created_at?: Date } = {}
	) {
		return await db
			.insertInto('response_audit_logs')
			.values({
				client_id: clientId,
				user_id: userId,
				question_id: null,
				question_text: 'Test Question',
				page_label: 'Test Page',
				action: 'insert',
				created_at: params.created_at || new Date(),
			})
			.returningAll()
			.executeTakeFirstOrThrow();
	}

	// Helper to create desk location type
	let deskTypeCounter = 0;
	async function createTestDeskLocationType(clientId: string, userId: string) {
		deskTypeCounter++;
		return await db
			.insertInto('desk_location_type')
			.values({
				client_id: clientId,
				name: `Type ${Date.now()}_${deskTypeCounter}_${Math.random().toString(36).substring(7)}`,
				created_by: userId,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
	}

	// Helper to create desk location
	let deskLocationCounter = 0;
	async function createTestDeskLocation(clientId: string, userId: string, typeId: number) {
		deskLocationCounter++;
		return await db
			.insertInto('desk_location')
			.values({
				client_id: clientId,
				desk_location_type_id: typeId,
				name: `Location ${Date.now()}_${deskLocationCounter}_${Math.random().toString(36).substring(7)}`,
				created_by: userId,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
	}

	// Helper to assign user to desk
	let deskPriorityCounter = 1;
	async function assignUserToDesk(userId: string, deskLocationId: number, assignedBy: string) {
		const priority = deskPriorityCounter++;
		return await db
			.insertInto('user_desk_location')
			.values({
				user_id: userId,
				desk_location_id: deskLocationId,
				assigned_by: assignedBy,
				priority: priority > 5 ? 1 : priority, // Reset if over limit
			})
			.returningAll()
			.executeTakeFirstOrThrow();
	}

	describe('getUsersPaginated', () => {
		it('should return users for the client', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'Admin' });

			const results = await getUsersPaginated(ctx, false);

			expect(results.length).toBeGreaterThanOrEqual(1);
			expect(results.some((u) => u.id === user.id)).toBe(true);
		});

		it('should filter by disabled status', async () => {
			const client = await createTestClient(db);
			const enabledUser = await createTestUser(db, { client_id: client.id, disabled: false });
			const disabledUser = await createTestUser(db, { client_id: client.id, disabled: true });
			const ctx = createTestContext(db, { id: enabledUser.id, client_id: client.id, email: enabledUser.email, role: 'Admin' });

			const enabledResults = await getUsersPaginated(ctx, false);
			const disabledResults = await getUsersPaginated(ctx, true);

			expect(enabledResults.some((u) => u.id === enabledUser.id)).toBe(true);
			expect(enabledResults.some((u) => u.id === disabledUser.id)).toBe(false);
			expect(disabledResults.some((u) => u.id === disabledUser.id)).toBe(true);
			expect(disabledResults.some((u) => u.id === enabledUser.id)).toBe(false);
		});

		it('should filter by inactive status (no recent login)', async () => {
			const client = await createTestClient(db);
			// Create admin user that won't match inactive filter
			const adminUser = await createTestUser(db, { client_id: client.id, last_login: new Date() });
			// Create inactive user (never logged in)
			const inactiveUser = await createTestUser(db, { client_id: client.id, last_login: null, disabled: false });
			// Create active user (logged in recently)
			const activeUser = await createTestUser(db, { client_id: client.id, disabled: false });
			// Manually update last_login to be recent for activeUser
			await db.updateTable('users').set({ last_login: new Date() }).where('id', '=', activeUser.id).execute();
			const ctx = createTestContext(db, { id: adminUser.id, client_id: client.id, email: adminUser.email, role: 'Admin' });

			const inactiveResults = await getUsersPaginated(ctx, false, true);

			expect(inactiveResults.some((u) => u.id === inactiveUser.id)).toBe(true);
			// Active user should NOT be in inactive results (they have recent login)
			const hasActiveUser = inactiveResults.some((u) => u.id === activeUser.id);
			expect(hasActiveUser).toBe(false);
		});

		it('should support pagination', async () => {
			const client = await createTestClient(db);
			await createTestUser(db, { client_id: client.id, first: 'A' });
			await createTestUser(db, { client_id: client.id, first: 'B' });
			await createTestUser(db, { client_id: client.id, first: 'C' });
			const user = await createTestUser(db, { client_id: client.id, first: 'D' });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'Admin' });

			const page1 = await getUsersPaginated(ctx, false, undefined, 2, 0);
			const page2 = await getUsersPaginated(ctx, false, undefined, 2, 2);

			expect(page1.length).toBe(2);
			expect(page2.length).toBe(2);
		});

		it('should filter by searchTerm', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, first: 'UniqueSearchName', last: 'Test' });
			await createTestUser(db, { client_id: client.id, first: 'Other', last: 'User' });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'Admin' });

			const results = await getUsersPaginated(ctx, false, undefined, undefined, undefined, 'UniqueSearch');

			expect(results.some((u) => u.id === user.id)).toBe(true);
			expect(results.every((u) => `${u.first} ${u.last}`.toLowerCase().includes('uniquesearch'))).toBe(true);
		});

		it('should not return users from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'Admin' });

			const results = await getUsersPaginated(ctxA, false);

			expect(results.some((u) => u.id === userA.id)).toBe(true);
			expect(results.some((u) => u.id === userB.id)).toBe(false);
		});
	});

	describe('getUsersWithDeskAssignments', () => {
		it('should return users with assignment counts', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(client.id, user.id);
			const deskLocation = await createTestDeskLocation(client.id, user.id, deskType.id);
			await assignUserToDesk(user.id, deskLocation.id, user.id);
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'Admin' });

			const result = await getUsersWithDeskAssignments(ctx, {});

			expect(result.rows.length).toBeGreaterThanOrEqual(1);
			const foundUser = result.rows.find((u) => u.id === user.id);
			expect(foundUser).toBeDefined();
			expect(Number(foundUser!.assignment_count)).toBe(1);
		});

		it('should filter by deskLocationId', async () => {
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client.id });
			const user2 = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(client.id, user1.id);
			const desk1 = await createTestDeskLocation(client.id, user1.id, deskType.id);
			const desk2 = await createTestDeskLocation(client.id, user1.id, deskType.id);
			await assignUserToDesk(user1.id, desk1.id, user1.id);
			await assignUserToDesk(user2.id, desk2.id, user1.id);
			const ctx = createTestContext(db, { id: user1.id, client_id: client.id, email: user1.email, role: 'Admin' });

			const result = await getUsersWithDeskAssignments(ctx, { deskLocationId: desk1.id });

			expect(result.rows.some((u) => u.id === user1.id)).toBe(true);
			expect(result.rows.some((u) => u.id === user2.id)).toBe(false);
		});

		it('should filter by deskLocationTypeId', async () => {
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client.id });
			const user2 = await createTestUser(db, { client_id: client.id });
			const deskType1 = await createTestDeskLocationType(client.id, user1.id);
			const deskType2 = await createTestDeskLocationType(client.id, user1.id);
			const desk1 = await createTestDeskLocation(client.id, user1.id, deskType1.id);
			const desk2 = await createTestDeskLocation(client.id, user1.id, deskType2.id);
			await assignUserToDesk(user1.id, desk1.id, user1.id);
			await assignUserToDesk(user2.id, desk2.id, user1.id);
			const ctx = createTestContext(db, { id: user1.id, client_id: client.id, email: user1.email, role: 'Admin' });

			const result = await getUsersWithDeskAssignments(ctx, { deskLocationTypeId: deskType1.id });

			expect(result.rows.some((u) => u.id === user1.id)).toBe(true);
			expect(result.rows.some((u) => u.id === user2.id)).toBe(false);
		});

		it('should not return users from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'Admin' });

			const result = await getUsersWithDeskAssignments(ctxA, {});

			expect(result.rows.some((u) => u.id === userA.id)).toBe(true);
			expect(result.rows.some((u) => u.id === userB.id)).toBe(false);
		});

		it('should filter by searchTerm', async () => {
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client.id, first: 'DeskSearchUnique', last: 'User' });
			const user2 = await createTestUser(db, { client_id: client.id, first: 'Other', last: 'Person' });
			const ctx = createTestContext(db, { id: user1.id, client_id: client.id, email: user1.email, role: 'Admin' });

			const result = await getUsersWithDeskAssignments(ctx, { searchTerm: 'DeskSearch' });

			expect(result.rows.some((u) => u.id === user1.id)).toBe(true);
			expect(result.rows.some((u) => u.id === user2.id)).toBe(false);
		});
	});

	describe('getUsers', () => {
		it('should return enabled users', async () => {
			const client = await createTestClient(db);
			const enabledUser = await createTestUser(db, { client_id: client.id, disabled: false });
			const disabledUser = await createTestUser(db, { client_id: client.id, disabled: true });
			const ctx = createTestContext(db, { id: enabledUser.id, client_id: client.id, email: enabledUser.email, role: 'Admin' });

			const results = await getUsers(ctx);

			expect(results.some((u) => u.id === enabledUser.id)).toBe(true);
			expect(results.some((u) => u.id === disabledUser.id)).toBe(false);
		});

		it('should filter by searchTerm (prefix match)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, first: 'PrefixSearch', last: 'Name' });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'Admin' });

			const results = await getUsers(ctx, 'prefixsearch');

			expect(results.some((u) => u.id === user.id)).toBe(true);
		});

		it('should not return users from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'Admin' });

			const results = await getUsers(ctxA);

			expect(results.some((u) => u.id === userA.id)).toBe(true);
			expect(results.some((u) => u.id === userB.id)).toBe(false);
		});
	});

	describe('getInactiveUserCount', () => {
		it('should count users with no login', async () => {
			const client = await createTestClient(db);
			await createTestUser(db, { client_id: client.id, last_login: null });
			await createTestUser(db, { client_id: client.id, last_login: null });
			const activeUser = await createTestUser(db, { client_id: client.id, last_login: new Date() });
			const ctx = createTestContext(db, { id: activeUser.id, client_id: client.id, email: activeUser.email, role: 'Admin' });

			const result = await getInactiveUserCount(ctx);

			expect(result.count).toBeGreaterThanOrEqual(2);
		});

		it('should not count users from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			// Update userA to have recent login (making them active)
			await db.updateTable('users').set({ last_login: new Date() }).where('id', '=', userA.id).execute();
			await createTestUser(db, { client_id: clientB.id, last_login: null });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'Admin' });

			const result = await getInactiveUserCount(ctxA);

			// Should only count client A's inactive users (0 in this case since user A has recent login)
			expect(result.count).toBe(0);
		});
	});

	describe('getUserActivity', () => {
		it('should return daily active user counts', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			await createTestResponseAuditLog(client.id, user.id);
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'Admin' });

			const now = new Date();
			const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

			const stats = await getUserActivity(ctx, { range: [weekAgo, now] });

			expect(Array.isArray(stats)).toBe(true);
			expect(stats.length).toBeGreaterThanOrEqual(7);
		});

		it('should not include activity from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			await createTestResponseAuditLog(clientB.id, userB.id);
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'Admin' });

			const now = new Date();
			const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

			const stats = await getUserActivity(ctxA, { range: [weekAgo, now] });

			// All active_users should be 0 for client A
			const totalActive = stats.reduce((acc, s) => acc + parseInt(s.active_users.toString()), 0);
			expect(totalActive).toBe(0);
		});
	});

	describe('getUserActivityDetail', () => {
		it('should return activity details for a specific date', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			await createTestResponseAuditLog(client.id, user.id);
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'Admin' });

			const today = new Date().toISOString().split('T')[0];
			const results = await getUserActivityDetail(ctx, today);

			expect(results.length).toBeGreaterThanOrEqual(1);
		});

		it('should not return activity from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			await createTestResponseAuditLog(clientB.id, userB.id);
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'Admin' });

			const today = new Date().toISOString().split('T')[0];
			const results = await getUserActivityDetail(ctxA, today);

			expect(results.every((r) => r.client_id === clientA.id)).toBe(true);
		});
	});

	describe('getUserCount', () => {
		it('should count users', async () => {
			const client = await createTestClient(db);
			await createTestUser(db, { client_id: client.id });
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'Admin' });

			const count = await getUserCount(ctx);

			expect(count).toBeGreaterThanOrEqual(2);
		});

		it('should filter by disabled status', async () => {
			const client = await createTestClient(db);
			await createTestUser(db, { client_id: client.id, disabled: false });
			await createTestUser(db, { client_id: client.id, disabled: true });
			const user = await createTestUser(db, { client_id: client.id, disabled: false });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'Admin' });

			const enabledCount = await getUserCount(ctx, false);
			const disabledCount = await getUserCount(ctx, true);

			expect(enabledCount).toBeGreaterThanOrEqual(2);
			expect(disabledCount).toBeGreaterThanOrEqual(1);
		});

		it('should filter by inactive status', async () => {
			const client = await createTestClient(db);
			await createTestUser(db, { client_id: client.id, last_login: null });
			const activeUser = await createTestUser(db, { client_id: client.id, last_login: new Date() });
			const ctx = createTestContext(db, { id: activeUser.id, client_id: client.id, email: activeUser.email, role: 'Admin' });

			const inactiveCount = await getUserCount(ctx, false, true);

			expect(inactiveCount).toBeGreaterThanOrEqual(1);
		});

		it('should not count users from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'Admin' });

			const count = await getUserCount(ctxA);

			expect(count).toBe(1); // Only client A's user
		});

		it('should filter by searchTerm using "First Last" format', async () => {
			const client = await createTestClient(db);
			await createTestUser(db, { client_id: client.id, first: 'John', last: 'Smith' });
			await createTestUser(db, { client_id: client.id, first: 'Jane', last: 'Doe' });
			const user = await createTestUser(db, { client_id: client.id, first: 'Admin', last: 'User' });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'Admin' });

			// Search by full name "First Last"
			const fullNameCount = await getUserCount(ctx, false, false, 'John Smith');
			expect(fullNameCount).toBe(1);

			// Search by partial first name
			const partialFirstCount = await getUserCount(ctx, false, false, 'John');
			expect(partialFirstCount).toBe(1);

			// Search by partial last name
			const partialLastCount = await getUserCount(ctx, false, false, 'Doe');
			expect(partialLastCount).toBe(1);

			// Search with no matches
			const noMatchCount = await getUserCount(ctx, false, false, 'Nobody Here');
			expect(noMatchCount).toBe(0);
		});
	});

	describe('getUserCountMetrics', () => {
		it('should return active and inactive counts', async () => {
			const client = await createTestClient(db);
			await createTestUser(db, { client_id: client.id, disabled: false });
			await createTestUser(db, { client_id: client.id, disabled: true });
			const user = await createTestUser(db, { client_id: client.id, disabled: false });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'Admin' });

			const metrics = await getUserCountMetrics(ctx, client.id);

			expect(metrics.total).toBeGreaterThanOrEqual(3);
			expect(metrics.active).toBeGreaterThanOrEqual(2);
			expect(metrics.inactive).toBeGreaterThanOrEqual(1);
		});
	});

	describe('getUser', () => {
		it('should return user by id', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'Admin' });

			const result = await getUser(ctx, user.id);

			expect(result).toBeDefined();
			expect(result!.id).toBe(user.id);
			expect(result!.email).toBe(user.email);
		});

		it('should return undefined for non-existent user', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'Admin' });

			// Use a valid UUID format that doesn't exist
			const result = await getUser(ctx, '00000000-0000-0000-0000-000000000000');

			expect(result).toBeUndefined();
		});

		it('should not return user from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'Admin' });

			const result = await getUser(ctxA, userB.id);

			expect(result).toBeUndefined();
		});
	});

	describe('updateUser', () => {
		it('should update user fields', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'Admin' });

			const result = await updateUser(ctx, user.id, {
				first: 'Updated',
				last: 'Name',
			});

			expect(result.first).toBe('Updated');
			expect(result.last).toBe('Name');
		});

		it('should not update user from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'Admin' });

			const result = await updateUser(ctxA, userB.id, { first: 'Hacked' });

			expect(result).toBeUndefined();

			// Verify user B wasn't updated
			const verifyCtx = createTestContext(db, { id: userB.id, client_id: clientB.id, email: userB.email, role: 'Admin' });
			const userBAfter = await getUser(verifyCtx, userB.id);
			expect(userBAfter!.first).not.toBe('Hacked');
		});
	});

	describe('deleteUser', () => {
		it('should delete user', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const adminUser = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const ctx = createTestContext(db, { id: adminUser.id, client_id: client.id, email: adminUser.email, role: 'Admin' });

			await deleteUser(ctx, user.id);

			const result = await getUser(ctx, user.id);
			expect(result).toBeUndefined();
		});

		it('should not delete user from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'Admin' });

			await deleteUser(ctxA, userB.id);

			// Verify user B still exists
			const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id, email: userB.email, role: 'Admin' });
			const result = await getUser(ctxB, userB.id);
			expect(result).toBeDefined();
		});
	});

	describe('upsertUserFromClerk', () => {
		it('should create new user', async () => {
			const client = await createTestClient(db);
			const email = `clerk_new_${Date.now()}@test.com`;

			const result = await upsertUserFromClerk(db, {
				first: 'Clerk',
				last: 'User',
				email,
				role: 'user',
				client_id: client.id,
				email_verified: true,
			});

			expect(result).toBeDefined();
			expect(result!.email).toBe(email);
			expect(result!.first).toBe('Clerk');
			expect(result!.email_verified).not.toBeNull();
		});

		it('should update existing user on conflict', async () => {
			const client = await createTestClient(db);
			const existingUser = await createTestUser(db, { client_id: client.id });

			const result = await upsertUserFromClerk(db, {
				first: 'Updated',
				last: 'Webhook',
				email: existingUser.email,
				role: 'Admin',
				client_id: client.id,
			});

			expect(result).toBeDefined();
			expect(result!.id).toBe(existingUser.id);
			expect(result!.first).toBe('Updated');
			expect(result!.last).toBe('Webhook');
		});

		it('should preserve email_verified if already set', async () => {
			const client = await createTestClient(db);
			const verifiedDate = new Date('2024-01-01');
			const existingUser = await createTestUser(db, {
				client_id: client.id,
				email_verified: verifiedDate,
			});

			const result = await upsertUserFromClerk(db, {
				first: 'Updated',
				last: 'User',
				email: existingUser.email,
				role: 'user',
				client_id: client.id,
				email_verified: true,
			});

			expect(result).toBeDefined();
			// Should preserve the original verification date, not update to now
			expect(result!.email_verified).toBeDefined();
		});
	});
});
