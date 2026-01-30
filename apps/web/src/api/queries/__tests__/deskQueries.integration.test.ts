/**
 * Integration tests for deskQueries
 *
 * These tests run against a real database to verify:
 * - Multi-tenant data isolation
 * - Desk location type CRUD operations
 * - Desk location CRUD operations
 * - User desk location assignment operations
 * - Soft delete behavior
 * - Archive/restore functionality
 * - Pagination and filtering
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestDeskLocationType,
	createTestDeskLocation,
	createTestUserDeskLocation,
} from '@/__tests__/integration/fixtures';
import {
	getDeskLocationTypes,
	getDeskLocationType,
	createDeskLocationType,
	updateDeskLocationType,
	getDeskLocationTypeLocations,
	archiveDeskLocationType,
	restoreDeskLocationType,
	getDeskLocations,
	getDeskLocation,
	createDeskLocation,
	updateDeskLocation,
	getDeskLocationClaimAssignments,
	archiveDeskLocation,
	restoreDeskLocation,
	getUserDeskLocations,
	getAllUserDeskAssignmentCounts,
	getDeskLocationUsers,
	assignUserToDeskLocation,
	bulkAssignUsersToDeskLocation,
	updateUserDeskLocationPriority,
	removeUserFromDeskLocation,
	updateUserDeskLocationPriorities,
	updateUsersDeskAssignments,
} from '../deskQueries';

describe('deskQueries integration', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// =====================================================================
	// DESK LOCATION TYPE OPERATIONS
	// =====================================================================

	describe('getDeskLocationTypes', () => {
		it('should return paginated list of desk location types', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const ts = Date.now();

			const type1 = await createTestDeskLocationType(db, { client_id: client.id, name: `UniqueListTest A ${ts}` });
			const type2 = await createTestDeskLocationType(db, { client_id: client.id, name: `UniqueListTest B ${ts}` });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Use search to filter to just our test types
			const result = await getDeskLocationTypes(ctx, `UniqueListTest`);

			expect(result.rows.some((r) => r.id === type1.id)).toBe(true);
			expect(result.rows.some((r) => r.id === type2.id)).toBe(true);
		});

		it('should include location_count for each type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id, name: `Type ${Date.now()}` });

			await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: 'Loc 1' });
			await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: 'Loc 2' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocationTypes(ctx);

			const found = result.rows.find((r) => r.id === deskType.id);
			expect(found).toBeDefined();
			expect(found?.location_count).toBe(2);
		});

		it('should exclude soft-deleted locations from location_count', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id, name: `Type ${Date.now()}` });

			await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: 'Active' });
			const deletedLoc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: 'Deleted' });

			// Soft delete one location
			await db.updateTable('desk_location').set({ deleted_at: new Date() }).where('id', '=', deletedLoc.id).execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocationTypes(ctx);

			const found = result.rows.find((r) => r.id === deskType.id);
			expect(found?.location_count).toBe(1);
		});

		it('should exclude soft-deleted types by default', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const activeType = await createTestDeskLocationType(db, { client_id: client.id, name: `Active ${Date.now()}` });
			const deletedType = await createTestDeskLocationType(db, { client_id: client.id, name: `Deleted ${Date.now()}` });

			await db.updateTable('desk_location_type').set({ deleted_at: new Date() }).where('id', '=', deletedType.id).execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocationTypes(ctx);

			expect(result.rows.some((r) => r.id === activeType.id)).toBe(true);
			expect(result.rows.some((r) => r.id === deletedType.id)).toBe(false);
		});

		it('should return only deleted types when showDeleted is true', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const activeType = await createTestDeskLocationType(db, { client_id: client.id, name: `Active ${Date.now()}` });
			const deletedType = await createTestDeskLocationType(db, { client_id: client.id, name: `Deleted ${Date.now()}` });

			await db.updateTable('desk_location_type').set({ deleted_at: new Date() }).where('id', '=', deletedType.id).execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocationTypes(ctx, undefined, undefined, undefined, true);

			expect(result.rows.some((r) => r.id === activeType.id)).toBe(false);
			expect(result.rows.some((r) => r.id === deletedType.id)).toBe(true);
		});

		it('should filter by search term', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const uniqueName = `UniqueSearchTerm${Date.now()}`;

			await createTestDeskLocationType(db, { client_id: client.id, name: uniqueName });
			await createTestDeskLocationType(db, { client_id: client.id, name: 'Other Type' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocationTypes(ctx, 'UniqueSearchTerm');

			expect(result.rows.length).toBe(1);
			expect(result.rows[0].name).toBe(uniqueName);
		});

		it('should apply pagination with limit and offset', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const ts = Date.now();
			const uniqueSearch = `PagUnique${ts}`;

			const createdTypes = [];
			for (let i = 0; i < 5; i++) {
				const type = await createTestDeskLocationType(db, { client_id: client.id, name: `${uniqueSearch}Type${i}` });
				createdTypes.push(type);
			}

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Search for our specific types to avoid interference from other tests
			const result = await getDeskLocationTypes(ctx, uniqueSearch, 2, 0);

			expect(result.rows.length).toBe(2);
			// Verify the created types are found
			expect(createdTypes.filter((t) => result.rows.some((r) => r.id === t.id)).length).toBe(2);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });

			const type1 = await createTestDeskLocationType(db, { client_id: client1.id, name: `Client1 Type ${Date.now()}` });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getDeskLocationTypes(ctx2);

			expect(result.rows.some((r) => r.id === type1.id)).toBe(false);
		});
	});

	describe('getDeskLocationType', () => {
		it('should return a single desk location type by ID', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id, name: 'Test Type' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocationType(ctx, deskType.id);

			expect(result).toBeDefined();
			expect(result?.id).toBe(deskType.id);
			expect(result?.name).toBe('Test Type');
		});

		it('should return undefined for non-existent type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocationType(ctx, 999999);

			expect(result).toBeUndefined();
		});

		it('should return even soft-deleted types (no deleted_at filter)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id, name: 'Deleted Type' });

			await db.updateTable('desk_location_type').set({ deleted_at: new Date() }).where('id', '=', deskType.id).execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocationType(ctx, deskType.id);

			expect(result).toBeDefined();
			expect(result?.deleted_at).not.toBeNull();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id, name: 'Client1 Type' });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getDeskLocationType(ctx2, deskType.id);

			expect(result).toBeUndefined();
		});
	});

	describe('createDeskLocationType', () => {
		it('should create a new desk location type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await createDeskLocationType(ctx, { name: 'New Type' });

			expect(result.name).toBe('New Type');
			expect(result.client_id).toBe(client.id);
			expect(result.created_by).toBe(user.id);
		});

		it('should create default locations when createDefaultLocations is true', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await createDeskLocationType(ctx, {
				name: 'Type With Defaults',
				createDefaultLocations: true,
			});

			// Check that default locations were created
			const locations = await db
				.selectFrom('desk_location')
				.selectAll()
				.where('desk_location_type_id', '=', result.id)
				.execute();

			// Should have 6 default locations (from SUGGESTED_DESK_LOCATIONS)
			expect(locations.length).toBe(6);
			expect(locations.some((l) => l.name === 'Pending')).toBe(true);
			expect(locations.some((l) => l.name === 'Closed')).toBe(true);
		});

		it('should not create default locations when createDefaultLocations is false', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await createDeskLocationType(ctx, {
				name: 'Type Without Defaults',
				createDefaultLocations: false,
			});

			const locations = await db
				.selectFrom('desk_location')
				.selectAll()
				.where('desk_location_type_id', '=', result.id)
				.execute();

			expect(locations.length).toBe(0);
		});
	});

	describe('updateDeskLocationType', () => {
		it('should update desk location type name', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id, name: 'Original Name' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await updateDeskLocationType(ctx, deskType.id, { name: 'Updated Name' });

			expect(result.name).toBe('Updated Name');
			expect(result.updated_by).toBe(user.id);
			expect(result.updated_at).not.toBeNull();
		});

		it('should throw for non-existent type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(updateDeskLocationType(ctx, 999999, { name: 'Test' })).rejects.toThrow();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id, name: 'Client1 Type' });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(updateDeskLocationType(ctx2, deskType.id, { name: 'Hacked' })).rejects.toThrow();
		});
	});

	describe('getDeskLocationTypeLocations', () => {
		it('should return all active locations for a type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });

			await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: 'Loc 1' });
			await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: 'Loc 2' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocationTypeLocations(ctx, deskType.id);

			expect(result.length).toBe(2);
		});

		it('should exclude soft-deleted locations', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });

			await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: 'Active' });
			const deleted = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: 'Deleted' });

			await db.updateTable('desk_location').set({ deleted_at: new Date() }).where('id', '=', deleted.id).execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocationTypeLocations(ctx, deskType.id);

			expect(result.length).toBe(1);
			expect(result[0].name).toBe('Active');
		});

		it('should return locations regardless of client context (no client_id filter)', async () => {
			// Note: This function queries by deskLocationTypeId only and does NOT filter by client_id.
			// This is intentional as it's used internally after the type has already been validated.
			// The type ID itself provides implicit client scoping since types are client-scoped.
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id });

			await createTestDeskLocation(db, { client_id: client1.id, desk_location_type_id: deskType.id, name: 'Loc 1' });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			// This returns locations for the type regardless of caller's client_id
			// The security boundary is at getDeskLocationType which IS client-scoped
			const result = await getDeskLocationTypeLocations(ctx2, deskType.id);

			expect(result.length).toBe(1);
		});
	});

	describe('archiveDeskLocationType', () => {
		it('should soft delete a desk location type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await archiveDeskLocationType(ctx, deskType.id);

			expect(result.deleted_at).not.toBeNull();
			expect(result.updated_by).toBe(user.id);
		});

		it('should throw if type not found', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(archiveDeskLocationType(ctx, 999999)).rejects.toThrow('Desk location type not found');
		});

		it('should throw if type has active locations', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });

			await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(archiveDeskLocationType(ctx, deskType.id)).rejects.toThrow(/Cannot archive desk location type/);
		});

		it('should allow archiving type if all locations are archived', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });

			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });
			await db.updateTable('desk_location').set({ deleted_at: new Date() }).where('id', '=', loc.id).execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await archiveDeskLocationType(ctx, deskType.id);

			expect(result.deleted_at).not.toBeNull();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(archiveDeskLocationType(ctx2, deskType.id)).rejects.toThrow('Desk location type not found');
		});
	});

	describe('restoreDeskLocationType', () => {
		it('should restore an archived desk location type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });

			await db.updateTable('desk_location_type').set({ deleted_at: new Date() }).where('id', '=', deskType.id).execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await restoreDeskLocationType(ctx, deskType.id);

			expect(result.deleted_at).toBeNull();
			expect(result.updated_by).toBe(user.id);
		});

		it('should throw for non-existent type', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(restoreDeskLocationType(ctx, 999999)).rejects.toThrow();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id });

			await db.updateTable('desk_location_type').set({ deleted_at: new Date() }).where('id', '=', deskType.id).execute();

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(restoreDeskLocationType(ctx2, deskType.id)).rejects.toThrow();
		});
	});

	// =====================================================================
	// DESK LOCATION OPERATIONS
	// =====================================================================

	describe('getDeskLocations', () => {
		it('should return paginated list of desk locations', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });

			await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: 'Loc A' });
			await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: 'Loc B' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocations(ctx);

			expect(result.rows.length).toBeGreaterThanOrEqual(2);
			expect(result.count).toBeGreaterThanOrEqual(2);
		});

		it('should include desk_location_type_name', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id, name: 'My Type' });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocations(ctx);

			const found = result.rows.find((r) => r.id === loc.id);
			expect(found?.desk_location_type_name).toBe('My Type');
		});

		it('should include user_count from user_desk_location', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client.id, role: 'User' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc.id, priority: 1 });
			await createTestUserDeskLocation(db, { user_id: user2.id, desk_location_id: loc.id, priority: 1 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocations(ctx, undefined, undefined, undefined, undefined, undefined, true);

			const found = result.rows.find((r) => r.id === loc.id);
			expect(Number(found?.user_count)).toBe(2);
		});

		it('should exclude removed user assignments from user_count', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc.id, priority: 1 });
			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc.id, priority: 2, removed_at: new Date() });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocations(ctx, undefined, undefined, undefined, undefined, undefined, true);

			const found = result.rows.find((r) => r.id === loc.id);
			expect(Number(found?.user_count)).toBe(1);
		});

		it('should filter by deskLocationTypeId', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const ts = Date.now();
			const type1 = await createTestDeskLocationType(db, { client_id: client.id, name: `Type1 ${ts}` });
			const type2 = await createTestDeskLocationType(db, { client_id: client.id, name: `Type2 ${ts}` });

			const loc1 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: type1.id, name: `Loc1 ${ts}` });
			await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: type2.id, name: `Loc2 ${ts}` });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocations(ctx, type1.id, undefined, undefined, undefined, undefined, true);

			expect(result.rows.every((r) => r.desk_location_type_id === type1.id)).toBe(true);
			expect(result.rows.some((r) => r.id === loc1.id)).toBe(true);
		});

		it('should exclude soft-deleted locations by default', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });

			const active = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: 'Active' });
			const deleted = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: 'Deleted' });

			await db.updateTable('desk_location').set({ deleted_at: new Date() }).where('id', '=', deleted.id).execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocations(ctx);

			expect(result.rows.some((r) => r.id === active.id)).toBe(true);
			expect(result.rows.some((r) => r.id === deleted.id)).toBe(false);
		});

		it('should return only deleted locations when showDeleted is true', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const ts = Date.now();

			const active = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Active ${ts}` });
			const deleted = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Deleted ${ts}` });

			await db.updateTable('desk_location').set({ deleted_at: new Date() }).where('id', '=', deleted.id).execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocations(ctx, undefined, undefined, undefined, undefined, true);

			expect(result.rows.some((r) => r.id === active.id)).toBe(false);
			expect(result.rows.some((r) => r.id === deleted.id)).toBe(true);
		});

		it('should exclude inactive locations by default', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const ts = Date.now();

			const active = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Active ${ts}`, is_active: true });
			const inactive = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Inactive ${ts}`, is_active: false });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocations(ctx);

			expect(result.rows.some((r) => r.id === active.id)).toBe(true);
			expect(result.rows.some((r) => r.id === inactive.id)).toBe(false);
		});

		it('should include inactive locations when showInactive is true', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const ts = Date.now();

			const active = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Active ${ts}`, is_active: true });
			const inactive = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Inactive ${ts}`, is_active: false });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocations(ctx, undefined, undefined, undefined, undefined, false, true);

			expect(result.rows.some((r) => r.id === active.id)).toBe(true);
			expect(result.rows.some((r) => r.id === inactive.id)).toBe(true);
		});

		it('should filter by search term', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const uniqueName = `UniqueLocSearch${Date.now()}`;

			await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: uniqueName });
			await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: 'Other Loc' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocations(ctx, undefined, 'UniqueLocSearch');

			expect(result.rows.length).toBe(1);
			expect(result.rows[0].name).toBe(uniqueName);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id });
			const loc = await createTestDeskLocation(db, { client_id: client1.id, desk_location_type_id: deskType.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getDeskLocations(ctx2);

			expect(result.rows.some((r) => r.id === loc.id)).toBe(false);
		});
	});

	describe('getDeskLocation', () => {
		it('should return a single desk location by ID', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id, name: 'My Type' });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: 'My Loc' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocation(ctx, loc.id);

			expect(result).toBeDefined();
			expect(result?.id).toBe(loc.id);
			expect(result?.name).toBe('My Loc');
			expect(result?.desk_location_type_name).toBe('My Type');
		});

		it('should return undefined for non-existent location', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocation(ctx, 999999);

			expect(result).toBeUndefined();
		});

		it('should return even soft-deleted locations (no deleted_at filter)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			await db.updateTable('desk_location').set({ deleted_at: new Date() }).where('id', '=', loc.id).execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocation(ctx, loc.id);

			expect(result).toBeDefined();
			expect(result?.deleted_at).not.toBeNull();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id });
			const loc = await createTestDeskLocation(db, { client_id: client1.id, desk_location_type_id: deskType.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getDeskLocation(ctx2, loc.id);

			expect(result).toBeUndefined();
		});
	});

	describe('createDeskLocation', () => {
		it('should create a new desk location', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await createDeskLocation(ctx, {
				name: 'New Location',
				desk_location_type_id: deskType.id,
				capacity_threshold: 100,
			});

			expect(result.name).toBe('New Location');
			expect(result.desk_location_type_id).toBe(deskType.id);
			expect(result.client_id).toBe(client.id);
			expect(result.created_by).toBe(user.id);
			expect(result.is_active).toBe(true);
		});

		it('should create location with is_active set to false', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await createDeskLocation(ctx, {
				name: 'Inactive Location',
				desk_location_type_id: deskType.id,
				is_active: false,
				capacity_threshold: 100,
			});

			expect(result.is_active).toBe(false);
		});
	});

	describe('updateDeskLocation', () => {
		it('should update desk location fields', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: 'Original' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await updateDeskLocation(ctx, loc.id, {
				name: 'Updated',
				is_active: false,
			});

			expect(result.name).toBe('Updated');
			expect(result.is_active).toBe(false);
			expect(result.updated_by).toBe(user.id);
		});

		it('should update desk_location_type_id', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const ts = Date.now();
			const deskType1 = await createTestDeskLocationType(db, { client_id: client.id, name: `Type1 ${ts}` });
			const deskType2 = await createTestDeskLocationType(db, { client_id: client.id, name: `Type2 ${ts}` });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType1.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await updateDeskLocation(ctx, loc.id, {
				desk_location_type_id: deskType2.id,
			});

			expect(result.desk_location_type_id).toBe(deskType2.id);
		});

		it('should throw for non-existent location', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(updateDeskLocation(ctx, 999999, { name: 'Test' })).rejects.toThrow();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id });
			const loc = await createTestDeskLocation(db, { client_id: client1.id, desk_location_type_id: deskType.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(updateDeskLocation(ctx2, loc.id, { name: 'Hacked' })).rejects.toThrow();
		});
	});

	describe('getDeskLocationClaimAssignments', () => {
		it('should return claims assigned to a desk location', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			// Create claim with desk_location_id
			await db
				.insertInto('claim')
				.values({
					client_id: client.id,
					claim_number: `CLM-${Date.now()}`,
					desk_location_id: loc.id,
				})
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocationClaimAssignments(ctx, loc.id);

			expect(result.length).toBe(1);
		});

		it('should return empty array for location with no claims', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocationClaimAssignments(ctx, loc.id);

			expect(result.length).toBe(0);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id });
			const loc = await createTestDeskLocation(db, { client_id: client1.id, desk_location_type_id: deskType.id });

			await db
				.insertInto('claim')
				.values({
					client_id: client1.id,
					claim_number: `CLM-${Date.now()}`,
					desk_location_id: loc.id,
				})
				.execute();

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getDeskLocationClaimAssignments(ctx2, loc.id);

			expect(result.length).toBe(0);
		});
	});

	describe('archiveDeskLocation', () => {
		it('should soft delete a desk location', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await archiveDeskLocation(ctx, loc.id);

			expect(result.deleted_at).not.toBeNull();
		});

		it('should remove user assignments when archiving', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			const assignment = await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc.id, priority: 1 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await archiveDeskLocation(ctx, loc.id);

			// Check assignment was removed
			const updatedAssignment = await db
				.selectFrom('user_desk_location')
				.selectAll()
				.where('id', '=', assignment.id)
				.executeTakeFirst();

			expect(updatedAssignment?.removed_at).not.toBeNull();
		});

		it('should throw if location not found', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(archiveDeskLocation(ctx, 999999)).rejects.toThrow('Desk location not found');
		});

		it('should throw if location has assigned claims', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			await db
				.insertInto('claim')
				.values({
					client_id: client.id,
					claim_number: `CLM-${Date.now()}`,
					desk_location_id: loc.id,
				})
				.execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(archiveDeskLocation(ctx, loc.id)).rejects.toThrow(/Cannot archive desk location/);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id });
			const loc = await createTestDeskLocation(db, { client_id: client1.id, desk_location_type_id: deskType.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(archiveDeskLocation(ctx2, loc.id)).rejects.toThrow('Desk location not found');
		});
	});

	describe('restoreDeskLocation', () => {
		it('should restore an archived desk location', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			await db.updateTable('desk_location').set({ deleted_at: new Date() }).where('id', '=', loc.id).execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await restoreDeskLocation(ctx, loc.id);

			expect(result.deleted_at).toBeNull();
			expect(result.updated_by).toBe(user.id);
		});

		it('should throw for non-existent location', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(restoreDeskLocation(ctx, 999999)).rejects.toThrow();
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id });
			const loc = await createTestDeskLocation(db, { client_id: client1.id, desk_location_type_id: deskType.id });

			await db.updateTable('desk_location').set({ deleted_at: new Date() }).where('id', '=', loc.id).execute();

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(restoreDeskLocation(ctx2, loc.id)).rejects.toThrow();
		});
	});

	// =====================================================================
	// USER DESK LOCATION ASSIGNMENT OPERATIONS
	// =====================================================================

	describe('getUserDeskLocations', () => {
		it('should return all desk location assignments for a user', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id, name: 'My Type' });
			const loc1 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: 'Loc 1' });
			const loc2 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: 'Loc 2' });

			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc1.id, priority: 1 });
			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc2.id, priority: 2 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getUserDeskLocations(ctx, user.id);

			expect(result.length).toBe(2);
			expect(result[0].priority).toBe(1);
			expect(result[1].priority).toBe(2);
			expect(result[0].desk_location_name).toBe('Loc 1');
			expect(result[0].desk_location_type_name).toBe('My Type');
		});

		it('should exclude removed assignments', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc.id, priority: 1 });
			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc.id, priority: 2, removed_at: new Date() });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getUserDeskLocations(ctx, user.id);

			expect(result.length).toBe(1);
			expect(result[0].priority).toBe(1);
		});

		it('should exclude deleted desk locations', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const ts = Date.now();
			const activeLoc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Active ${ts}` });
			const deletedLoc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Deleted ${ts}` });

			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: activeLoc.id, priority: 1 });
			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: deletedLoc.id, priority: 2 });

			await db.updateTable('desk_location').set({ deleted_at: new Date() }).where('id', '=', deletedLoc.id).execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getUserDeskLocations(ctx, user.id);

			expect(result.length).toBe(1);
			expect(result[0].desk_location_id).toBe(activeLoc.id);
		});

		it('should exclude deleted desk location types', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const ts = Date.now();
			const activeType = await createTestDeskLocationType(db, { client_id: client.id, name: `Active Type ${ts}` });
			const deletedType = await createTestDeskLocationType(db, { client_id: client.id, name: `Deleted Type ${ts}` });
			const activeLoc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: activeType.id });
			const locWithDeletedType = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deletedType.id });

			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: activeLoc.id, priority: 1 });
			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: locWithDeletedType.id, priority: 2 });

			await db.updateTable('desk_location_type').set({ deleted_at: new Date() }).where('id', '=', deletedType.id).execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getUserDeskLocations(ctx, user.id);

			expect(result.length).toBe(1);
			expect(result[0].desk_location_id).toBe(activeLoc.id);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id });
			const loc = await createTestDeskLocation(db, { client_id: client1.id, desk_location_type_id: deskType.id });

			await createTestUserDeskLocation(db, { user_id: user1.id, desk_location_id: loc.id, priority: 1 });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getUserDeskLocations(ctx2, user1.id);

			expect(result.length).toBe(0);
		});
	});

	describe('getAllUserDeskAssignmentCounts', () => {
		it('should return counts of desk assignments for all users', async () => {
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client.id, role: 'User' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const ts = Date.now();
			const loc1 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Loc1 ${ts}` });
			const loc2 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Loc2 ${ts}` });

			await createTestUserDeskLocation(db, { user_id: user1.id, desk_location_id: loc1.id, priority: 1 });
			await createTestUserDeskLocation(db, { user_id: user1.id, desk_location_id: loc2.id, priority: 2 });
			await createTestUserDeskLocation(db, { user_id: user2.id, desk_location_id: loc1.id, priority: 1 });

			const ctx = createTestContext(db, { id: user1.id, client_id: client.id, role: 'Admin' });

			const result = await getAllUserDeskAssignmentCounts(ctx);

			expect(result[user1.id]).toBe(2);
			expect(result[user2.id]).toBe(1);
		});

		it('should exclude removed assignments', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc.id, priority: 1 });
			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc.id, priority: 2, removed_at: new Date() });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAllUserDeskAssignmentCounts(ctx);

			expect(result[user.id]).toBe(1);
		});

		it('should exclude deleted desk locations', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const ts = Date.now();
			const activeLoc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Active ${ts}` });
			const deletedLoc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Deleted ${ts}` });

			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: activeLoc.id, priority: 1 });
			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: deletedLoc.id, priority: 2 });

			await db.updateTable('desk_location').set({ deleted_at: new Date() }).where('id', '=', deletedLoc.id).execute();

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getAllUserDeskAssignmentCounts(ctx);

			expect(result[user.id]).toBe(1);
		});

		it('should enforce tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id });
			const loc = await createTestDeskLocation(db, { client_id: client1.id, desk_location_type_id: deskType.id });

			await createTestUserDeskLocation(db, { user_id: user1.id, desk_location_id: loc.id, priority: 1 });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			const result = await getAllUserDeskAssignmentCounts(ctx2);

			expect(result[user1.id]).toBeUndefined();
		});
	});

	describe('getDeskLocationUsers', () => {
		it('should return all users assigned to a desk location', async () => {
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client.id, role: 'Admin', first: 'John', last: 'Doe' });
			const user2 = await createTestUser(db, { client_id: client.id, role: 'User', first: 'Jane', last: 'Smith' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			await createTestUserDeskLocation(db, { user_id: user1.id, desk_location_id: loc.id, priority: 1 });
			await createTestUserDeskLocation(db, { user_id: user2.id, desk_location_id: loc.id, priority: 2 });

			const ctx = createTestContext(db, { id: user1.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocationUsers(ctx, loc.id);

			expect(result.length).toBe(2);
			expect(result.some((r) => r.user_first === 'John')).toBe(true);
			expect(result.some((r) => r.user_first === 'Jane')).toBe(true);
		});

		it('should exclude removed assignments', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc.id, priority: 1 });
			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc.id, priority: 2, removed_at: new Date() });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocationUsers(ctx, loc.id);

			expect(result.length).toBe(1);
		});

		it('should order by priority', async () => {
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client.id, role: 'User' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			await createTestUserDeskLocation(db, { user_id: user1.id, desk_location_id: loc.id, priority: 2 });
			await createTestUserDeskLocation(db, { user_id: user2.id, desk_location_id: loc.id, priority: 1 });

			const ctx = createTestContext(db, { id: user1.id, client_id: client.id, role: 'Admin' });

			const result = await getDeskLocationUsers(ctx, loc.id);

			expect(result[0].user_id).toBe(user2.id);
			expect(result[1].user_id).toBe(user1.id);
		});
	});

	describe('assignUserToDeskLocation', () => {
		it('should assign user to desk location', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await assignUserToDeskLocation(ctx, {
				userId: user.id,
				deskLocationId: loc.id,
				priority: 1,
			});

			expect(result.user_id).toBe(user.id);
			expect(result.desk_location_id).toBe(loc.id);
			expect(result.priority).toBe(1);
			expect(result.assigned_by).toBe(user.id);
		});

		it('should throw if desk location not found', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(
				assignUserToDeskLocation(ctx, {
					userId: user.id,
					deskLocationId: 999999,
					priority: 1,
				})
			).rejects.toThrow('Desk location not found');
		});

		it('should replace existing assignment at same priority', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const ts = Date.now();
			const loc1 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Loc1 ${ts}` });
			const loc2 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Loc2 ${ts}` });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Assign loc1 at priority 1
			await assignUserToDeskLocation(ctx, { userId: user.id, deskLocationId: loc1.id, priority: 1 });

			// Assign loc2 at priority 1 (should replace loc1)
			await assignUserToDeskLocation(ctx, { userId: user.id, deskLocationId: loc2.id, priority: 1 });

			const assignments = await getUserDeskLocations(ctx, user.id);

			expect(assignments.length).toBe(1);
			expect(assignments[0].desk_location_id).toBe(loc2.id);
		});

		it('should replace existing user-desk combo at any priority', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Assign at priority 1
			await assignUserToDeskLocation(ctx, { userId: user.id, deskLocationId: loc.id, priority: 1 });

			// Reassign same desk at priority 2
			await assignUserToDeskLocation(ctx, { userId: user.id, deskLocationId: loc.id, priority: 2 });

			const assignments = await getUserDeskLocations(ctx, user.id);

			expect(assignments.length).toBe(1);
			expect(assignments[0].priority).toBe(2);
		});

		it('should enforce tenant isolation on desk location lookup', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client1.id });
			const loc = await createTestDeskLocation(db, { client_id: client1.id, desk_location_type_id: deskType.id });

			const ctx2 = createTestContext(db, { id: user2.id, client_id: client2.id, role: 'Admin' });

			await expect(
				assignUserToDeskLocation(ctx2, {
					userId: user2.id,
					deskLocationId: loc.id,
					priority: 1,
				})
			).rejects.toThrow('Desk location not found');
		});
	});

	describe('bulkAssignUsersToDeskLocation', () => {
		it('should assign multiple users to same desk location', async () => {
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client.id, role: 'User' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			const ctx = createTestContext(db, { id: user1.id, client_id: client.id, role: 'Admin' });

			const result = await bulkAssignUsersToDeskLocation(ctx, {
				userIds: [user1.id, user2.id],
				deskLocationId: loc.id,
				priority: 1,
			});

			expect(result.length).toBe(2);
			expect(result.every((r) => r.desk_location_id === loc.id)).toBe(true);
			expect(result.every((r) => r.priority === 1)).toBe(true);
		});

		it('should throw if desk location not found', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(
				bulkAssignUsersToDeskLocation(ctx, {
					userIds: [user.id],
					deskLocationId: 999999,
					priority: 1,
				})
			).rejects.toThrow('Desk location not found');
		});

		it('should replace existing assignments at same priority', async () => {
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client.id, role: 'User' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const ts = Date.now();
			const loc1 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Loc1 ${ts}` });
			const loc2 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Loc2 ${ts}` });

			// Create initial assignments at priority 1
			await createTestUserDeskLocation(db, { user_id: user1.id, desk_location_id: loc1.id, priority: 1 });
			await createTestUserDeskLocation(db, { user_id: user2.id, desk_location_id: loc1.id, priority: 1 });

			const ctx = createTestContext(db, { id: user1.id, client_id: client.id, role: 'Admin' });

			// Bulk assign both users to loc2 at priority 1 (should replace loc1 assignments)
			await bulkAssignUsersToDeskLocation(ctx, {
				userIds: [user1.id, user2.id],
				deskLocationId: loc2.id,
				priority: 1,
			});

			const user1Assignments = await getUserDeskLocations(ctx, user1.id);
			const user2Assignments = await getUserDeskLocations(ctx, user2.id);

			expect(user1Assignments.length).toBe(1);
			expect(user1Assignments[0].desk_location_id).toBe(loc2.id);
			expect(user2Assignments.length).toBe(1);
			expect(user2Assignments[0].desk_location_id).toBe(loc2.id);
		});
	});

	describe('updateUserDeskLocationPriority', () => {
		it('should update assignment priority', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			const assignment = await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc.id, priority: 1 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await updateUserDeskLocationPriority(ctx, assignment.id, 2);

			expect(result.priority).toBe(2);
		});

		it('should throw if assignment not found', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(updateUserDeskLocationPriority(ctx, 999999, 2)).rejects.toThrow('Assignment not found');
		});

		it('should handle updating to same priority (no-op)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			const assignment = await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc.id, priority: 1 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Update to same priority - should work without changing anything
			const result = await updateUserDeskLocationPriority(ctx, assignment.id, 1);

			expect(result.priority).toBe(1);
			expect(result.id).toBe(assignment.id);
		});

		it('should soft-delete conflicting priority assignment', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const ts = Date.now();
			const loc1 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Loc1 ${ts}` });
			const loc2 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Loc2 ${ts}` });
			const loc3 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Loc3 ${ts}` });

			const assignment1 = await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc1.id, priority: 1 });
			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc2.id, priority: 2 });
			const assignment3 = await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc3.id, priority: 3 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Update assignment3 to priority 1 (should remove assignment1)
			await updateUserDeskLocationPriority(ctx, assignment3.id, 1);

			const assignments = await getUserDeskLocations(ctx, user.id);

			const assignment1Row = await db
				.selectFrom('user_desk_location')
				.select(['removed_at', 'removed_by'])
				.where('id', '=', assignment1.id)
				.executeTakeFirstOrThrow();

			expect(assignment1Row.removed_at).not.toBeNull();
			expect(assignment1Row.removed_by).toBe(user.id);

			expect(assignments.length).toBe(2);
			expect(assignments[0].priority).toBe(1);
			expect(assignments[0].desk_location_id).toBe(loc3.id);
			expect(assignments[1].priority).toBe(2);
			expect(assignments[1].desk_location_id).toBe(loc2.id);
		});
	});

	describe('removeUserFromDeskLocation', () => {
		it('should soft delete user assignment', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			const assignment = await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc.id, priority: 1 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await removeUserFromDeskLocation(ctx, assignment.id);
			const assignmentRow = await db
				.selectFrom('user_desk_location')
				.select(['removed_at', 'removed_by'])
				.where('id', '=', assignment.id)
				.executeTakeFirstOrThrow();
			const assignments = await getUserDeskLocations(ctx, user.id);

			expect(result.removed_at).not.toBeNull();
			expect(result.removed_by).toBe(user.id);
			expect(assignmentRow.removed_at).not.toBeNull();
			expect(assignmentRow.removed_by).toBe(user.id);
			expect(assignments.length).toBe(0);
		});

		it('should throw if assignment not found or already removed', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(removeUserFromDeskLocation(ctx, 999999)).rejects.toThrow();
		});

		it('should throw if assignment already removed', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			const assignment = await createTestUserDeskLocation(db, {
				user_id: user.id,
				desk_location_id: loc.id,
				priority: 1,
				removed_at: new Date(),
			});

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await expect(removeUserFromDeskLocation(ctx, assignment.id)).rejects.toThrow();
		});
	});

	describe('updateUserDeskLocationPriorities', () => {
		it('should update multiple priorities at once', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const ts = Date.now();
			const loc1 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Loc1 ${ts}` });
			const loc2 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Loc2 ${ts}` });

			const a1 = await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc1.id, priority: 1 });
			const a2 = await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc2.id, priority: 2 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Swap priorities
			const result = await updateUserDeskLocationPriorities(ctx, [
				{ id: a1.id, priority: 2 },
				{ id: a2.id, priority: 1 },
			]);

			expect(result.length).toBe(2);
			expect(result.find((r) => r.desk_location_id === loc1.id)?.priority).toBe(2);
			expect(result.find((r) => r.desk_location_id === loc2.id)?.priority).toBe(1);
		});

		it('should return empty array for empty updates', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			const result = await updateUserDeskLocationPriorities(ctx, []);

			expect(result).toEqual([]);
		});

		it('should keep priorities contiguous after bulk updates', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const ts = Date.now();
			const loc1 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Loc1 ${ts}` });
			const loc2 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Loc2 ${ts}` });
			const loc3 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Loc3 ${ts}` });

			const a1 = await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc1.id, priority: 1 });
			const a2 = await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc2.id, priority: 2 });
			const a3 = await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc3.id, priority: 3 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await updateUserDeskLocationPriorities(ctx, [
				{ id: a1.id, priority: 2 },
				{ id: a2.id, priority: 3 },
				{ id: a3.id, priority: 1 },
			]);

			const assignments = await getUserDeskLocations(ctx, user.id);
			const priorities = assignments.map((assignment) => assignment.priority);

			expect(priorities).toEqual([1, 2, 3]);
			expect(assignments[0].desk_location_id).toBe(loc3.id);
			expect(assignments[1].desk_location_id).toBe(loc1.id);
			expect(assignments[2].desk_location_id).toBe(loc2.id);
		});
	});

	describe('updateUsersDeskAssignments', () => {
		it('should replace all assignments for a user', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const ts = Date.now();
			const loc1 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Loc1 ${ts}` });
			const loc2 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Loc2 ${ts}` });
			const loc3 = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id, name: `Loc3 ${ts}` });

			// Create initial assignment
			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc1.id, priority: 1 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			// Replace with new assignments
			const result = await updateUsersDeskAssignments(ctx, [
				{
					userId: user.id,
					assignments: [
						{ deskLocationId: loc2.id, priority: 1 },
						{ deskLocationId: loc3.id, priority: 2 },
					],
				},
			]);

			expect(result.length).toBe(1);
			expect(result[0].assignmentsUpdated).toBe(2);

			const assignments = await getUserDeskLocations(ctx, user.id);
			expect(assignments.length).toBe(2);
			expect(assignments.some((a) => a.desk_location_id === loc1.id)).toBe(false);
			expect(assignments.some((a) => a.desk_location_id === loc2.id)).toBe(true);
			expect(assignments.some((a) => a.desk_location_id === loc3.id)).toBe(true);
		});

		it('should handle multiple users at once', async () => {
			const client = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client.id, role: 'User' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			const ctx = createTestContext(db, { id: user1.id, client_id: client.id, role: 'Admin' });

			const result = await updateUsersDeskAssignments(ctx, [
				{ userId: user1.id, assignments: [{ deskLocationId: loc.id, priority: 1 }] },
				{ userId: user2.id, assignments: [{ deskLocationId: loc.id, priority: 1 }] },
			]);

			expect(result.length).toBe(2);

			const user1Assignments = await getUserDeskLocations(ctx, user1.id);
			const user2Assignments = await getUserDeskLocations(ctx, user2.id);

			expect(user1Assignments.length).toBe(1);
			expect(user2Assignments.length).toBe(1);
		});

		it('should clear all assignments when given empty array', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const loc = await createTestDeskLocation(db, { client_id: client.id, desk_location_type_id: deskType.id });

			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: loc.id, priority: 1 });

			const ctx = createTestContext(db, { id: user.id, client_id: client.id, role: 'Admin' });

			await updateUsersDeskAssignments(ctx, [{ userId: user.id, assignments: [] }]);

			const assignments = await getUserDeskLocations(ctx, user.id);
			expect(assignments.length).toBe(0);
		});
	});
});
