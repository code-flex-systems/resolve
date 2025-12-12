/**
 * Integration tests for referenceDataQueries
 *
 * Tests cover:
 * - getReferenceLists: Get all reference lists for client
 * - getReferenceList: Get single reference list by entity
 * - getReferenceOptions: Get options for a reference entity
 * - getReferenceOption: Get single option by entity and value
 * - getReferenceOptionById: Get option by ID
 * - createReferenceOption: Create new option
 * - updateReferenceOption: Update option
 * - deleteReferenceOption: Soft delete option
 * - restoreReferenceOption: Restore deleted option
 * - validateReferenceValue: Validate value for entity
 * - getValidReferenceValues: Get valid values for entity
 * - Tenant isolation on all operations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	getReferenceLists,
	getReferenceList,
	getReferenceOptions,
	getReferenceOption,
	getReferenceOptionById,
	createReferenceOption,
	updateReferenceOption,
	deleteReferenceOption,
	restoreReferenceOption,
	validateReferenceValue,
	getValidReferenceValues,
} from '../referenceDataQueries';
import { createTestClient, createTestUser } from '@/__tests__/integration/fixtures';

describe('referenceDataQueries integration tests', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// Helper to create a reference list
	async function createTestReferenceList(
		clientId: string,
		params: { entity?: string; display_name?: string } = {}
	) {
		const entity = params.entity || `test_entity_${Date.now()}`;
		return await db
			.insertInto('reference_list')
			.values({
				client_id: clientId,
				entity,
				display_name: params.display_name || `Test ${entity}`,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
	}

	// Helper to create a reference option
	async function createTestReferenceOption(
		clientId: string,
		referenceListId: number,
		userId: string,
		params: {
			value?: string;
			display_label?: string;
			is_active?: boolean;
			is_system_default?: boolean;
		} = {}
	) {
		const value = params.value || `value_${Date.now()}`;
		return await db
			.insertInto('reference_option')
			.values({
				client_id: clientId,
				reference_list_id: referenceListId,
				value,
				display_label: params.display_label || `Label ${value}`,
				is_active: params.is_active ?? true,
				is_system_default: params.is_system_default ?? false,
				sort_order: 0,
				created_by: userId,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
	}

	describe('getReferenceLists', () => {
		it('should return all reference lists for client', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await createTestReferenceList(client.id, { entity: `list_a_${Date.now()}`, display_name: 'List A' });
			await createTestReferenceList(client.id, { entity: `list_b_${Date.now()}`, display_name: 'List B' });

			const lists = await getReferenceLists(ctx);

			expect(lists.length).toBeGreaterThanOrEqual(2);
		});

		it('should not return deleted lists', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const list = await createTestReferenceList(client.id, { entity: `deleted_list_${Date.now()}` });
			await db
				.updateTable('reference_list')
				.set({ deleted_at: new Date() })
				.where('id', '=', list.id)
				.execute();

			const lists = await getReferenceLists(ctx);
			const found = lists.find((l) => l.id === list.id);

			expect(found).toBeUndefined();
		});

		it('should not return lists from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			const listB = await createTestReferenceList(clientB.id, { entity: `client_b_list_${Date.now()}` });

			const lists = await getReferenceLists(ctxA);
			const found = lists.find((l) => l.id === listB.id);

			expect(found).toBeUndefined();
		});

		it('should order by display_name ascending', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const suffix = Date.now();
			await createTestReferenceList(client.id, { entity: `z_entity_${suffix}`, display_name: 'Zebra' });
			await createTestReferenceList(client.id, { entity: `a_entity_${suffix}`, display_name: 'Apple' });

			const lists = await getReferenceLists(ctx);
			const zebraIdx = lists.findIndex((l) => l.display_name === 'Zebra');
			const appleIdx = lists.findIndex((l) => l.display_name === 'Apple');

			expect(appleIdx).toBeLessThan(zebraIdx);
		});
	});

	describe('getReferenceList', () => {
		it('should return reference list by entity', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const entity = `entity_${Date.now()}`;
			const list = await createTestReferenceList(client.id, { entity });

			const result = await getReferenceList(ctx, entity);

			expect(result).toBeDefined();
			expect(result!.id).toBe(list.id);
			expect(result!.entity).toBe(entity);
		});

		it('should return undefined for non-existent entity', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const result = await getReferenceList(ctx, 'nonexistent_entity');

			expect(result).toBeUndefined();
		});

		it('should not return deleted list', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const entity = `deleted_${Date.now()}`;
			const list = await createTestReferenceList(client.id, { entity });
			await db
				.updateTable('reference_list')
				.set({ deleted_at: new Date() })
				.where('id', '=', list.id)
				.execute();

			const result = await getReferenceList(ctx, entity);

			expect(result).toBeUndefined();
		});

		it('should not return list from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			const entity = `client_b_${Date.now()}`;
			await createTestReferenceList(clientB.id, { entity });

			const result = await getReferenceList(ctxA, entity);

			expect(result).toBeUndefined();
		});
	});

	describe('getReferenceOptions', () => {
		it('should return options for entity', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const entity = `options_entity_${Date.now()}`;
			const list = await createTestReferenceList(client.id, { entity });
			await createTestReferenceOption(client.id, list.id, user.id, { value: 'opt1' });
			await createTestReferenceOption(client.id, list.id, user.id, { value: 'opt2' });

			const options = await getReferenceOptions(ctx, entity);

			expect(options.length).toBe(2);
		});

		it('should return empty array if list does not exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const options = await getReferenceOptions(ctx, 'nonexistent');

			expect(options).toEqual([]);
		});

		it('should not return deleted options by default', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const entity = `deleted_opt_${Date.now()}`;
			const list = await createTestReferenceList(client.id, { entity });
			const opt = await createTestReferenceOption(client.id, list.id, user.id);
			await db
				.updateTable('reference_option')
				.set({ deleted_at: new Date() })
				.where('id', '=', opt.id)
				.execute();

			const options = await getReferenceOptions(ctx, entity);

			expect(options.find((o) => o.id === opt.id)).toBeUndefined();
		});

		it('should return deleted options when showDeleted is true', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const entity = `show_deleted_${Date.now()}`;
			const list = await createTestReferenceList(client.id, { entity });
			const opt = await createTestReferenceOption(client.id, list.id, user.id);
			await db
				.updateTable('reference_option')
				.set({ deleted_at: new Date() })
				.where('id', '=', opt.id)
				.execute();

			const options = await getReferenceOptions(ctx, entity, { showDeleted: true });

			expect(options.find((o) => o.id === opt.id)).toBeDefined();
		});

		it('should not return inactive options by default', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const entity = `inactive_opt_${Date.now()}`;
			const list = await createTestReferenceList(client.id, { entity });
			const opt = await createTestReferenceOption(client.id, list.id, user.id, { is_active: false });

			const options = await getReferenceOptions(ctx, entity);

			expect(options.find((o) => o.id === opt.id)).toBeUndefined();
		});

		it('should return inactive options when showInactive is true', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const entity = `show_inactive_${Date.now()}`;
			const list = await createTestReferenceList(client.id, { entity });
			const opt = await createTestReferenceOption(client.id, list.id, user.id, { is_active: false });

			const options = await getReferenceOptions(ctx, entity, { showInactive: true });

			expect(options.find((o) => o.id === opt.id)).toBeDefined();
		});

		it('should not return options from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			// Use different entity names per client to avoid cross-contamination
			const entityA = `isolation_a_${Date.now()}`;
			const entityB = `isolation_b_${Date.now()}`;
			const listA = await createTestReferenceList(clientA.id, { entity: entityA });
			const listB = await createTestReferenceList(clientB.id, { entity: entityB });
			await createTestReferenceOption(clientA.id, listA.id, userA.id, { value: 'opt_a' });
			await createTestReferenceOption(clientB.id, listB.id, userB.id, { value: 'opt_b' });

			const optionsA = await getReferenceOptions(ctxA, entityA);

			expect(optionsA.length).toBe(1);
			expect(optionsA[0].value).toBe('opt_a');
		});
	});

	describe('getReferenceOption', () => {
		it('should return option by entity and value', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const entity = `get_opt_${Date.now()}`;
			const list = await createTestReferenceList(client.id, { entity });
			const opt = await createTestReferenceOption(client.id, list.id, user.id, { value: 'myvalue' });

			const result = await getReferenceOption(ctx, entity, 'myvalue');

			expect(result).toBeDefined();
			expect(result!.id).toBe(opt.id);
		});

		it('should return undefined if list does not exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const result = await getReferenceOption(ctx, 'nonexistent', 'value');

			expect(result).toBeUndefined();
		});

		it('should not return deleted option by default', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const entity = `deleted_single_${Date.now()}`;
			const list = await createTestReferenceList(client.id, { entity });
			const opt = await createTestReferenceOption(client.id, list.id, user.id, { value: 'deleted_val' });
			await db
				.updateTable('reference_option')
				.set({ deleted_at: new Date() })
				.where('id', '=', opt.id)
				.execute();

			const result = await getReferenceOption(ctx, entity, 'deleted_val');

			expect(result).toBeUndefined();
		});

		it('should return deleted option when includeDeactivated is true', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const entity = `include_deleted_${Date.now()}`;
			const list = await createTestReferenceList(client.id, { entity });
			const opt = await createTestReferenceOption(client.id, list.id, user.id, { value: 'deleted_inc' });
			await db
				.updateTable('reference_option')
				.set({ deleted_at: new Date() })
				.where('id', '=', opt.id)
				.execute();

			const result = await getReferenceOption(ctx, entity, 'deleted_inc', { includeDeactivated: true });

			expect(result).toBeDefined();
			expect(result!.id).toBe(opt.id);
		});
	});

	describe('getReferenceOptionById', () => {
		it('should return option by ID with entity name', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const entity = `by_id_${Date.now()}`;
			const list = await createTestReferenceList(client.id, { entity });
			const opt = await createTestReferenceOption(client.id, list.id, user.id);

			const result = await getReferenceOptionById(ctx, opt.id);

			expect(result).toBeDefined();
			expect(result!.id).toBe(opt.id);
			expect(result!.entity).toBe(entity);
		});

		it('should return undefined for non-existent ID', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const result = await getReferenceOptionById(ctx, 999999);

			expect(result).toBeUndefined();
		});

		it('should not return option from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			const listB = await createTestReferenceList(clientB.id, { entity: `client_b_id_${Date.now()}` });
			const optB = await createTestReferenceOption(clientB.id, listB.id, userB.id);

			const result = await getReferenceOptionById(ctxA, optB.id);

			expect(result).toBeUndefined();
		});
	});

	describe('createReferenceOption', () => {
		it('should create new option', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const entity = `create_opt_${Date.now()}`;
			await createTestReferenceList(client.id, { entity });

			const result = await createReferenceOption(ctx, {
				entity,
				value: 'new_value',
				display_label: 'New Label',
				description: 'Description',
			});

			expect(result.value).toBe('new_value');
			expect(result.display_label).toBe('New Label');
			expect(result.is_active).toBe(true);
			expect(result.is_system_default).toBe(false);
			expect(result.created_by).toBe(user.id);
		});

		it('should throw when list does not exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await expect(
				createReferenceOption(ctx, {
					entity: 'nonexistent_entity',
					value: 'val',
					display_label: 'Label',
				})
			).rejects.toThrow('Reference list not found');
		});

		it('should throw when duplicate value exists', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const entity = `dup_val_${Date.now()}`;
			const list = await createTestReferenceList(client.id, { entity });
			await createTestReferenceOption(client.id, list.id, user.id, { value: 'existing' });

			await expect(
				createReferenceOption(ctx, {
					entity,
					value: 'existing',
					display_label: 'Label',
				})
			).rejects.toThrow("already exists");
		});
	});

	describe('updateReferenceOption', () => {
		it('should update option', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const list = await createTestReferenceList(client.id, { entity: `update_${Date.now()}` });
			const opt = await createTestReferenceOption(client.id, list.id, user.id, { display_label: 'Original' });

			const result = await updateReferenceOption(ctx, opt.id, { display_label: 'Updated' });

			expect(result.display_label).toBe('Updated');
			expect(result.updated_by).toBe(user.id);
		});

		it('should throw when option not found', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await expect(updateReferenceOption(ctx, 999999, { display_label: 'X' })).rejects.toThrow('not found');
		});

		it('should not update option from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			const listB = await createTestReferenceList(clientB.id, { entity: `update_iso_${Date.now()}` });
			const optB = await createTestReferenceOption(clientB.id, listB.id, userB.id);

			await expect(updateReferenceOption(ctxA, optB.id, { display_label: 'Hacked' })).rejects.toThrow('not found');
		});
	});

	describe('deleteReferenceOption', () => {
		it('should soft delete option', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const list = await createTestReferenceList(client.id, { entity: `delete_${Date.now()}` });
			const opt = await createTestReferenceOption(client.id, list.id, user.id);

			const result = await deleteReferenceOption(ctx, opt.id);

			expect(result.deleted_at).not.toBeNull();
		});

		it('should throw when option not found', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			await expect(deleteReferenceOption(ctx, 999999)).rejects.toThrow('not found');
		});

		it('should throw when deleting system default', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const list = await createTestReferenceList(client.id, { entity: `sys_default_${Date.now()}` });
			const opt = await createTestReferenceOption(client.id, list.id, user.id, { is_system_default: true });

			await expect(deleteReferenceOption(ctx, opt.id)).rejects.toThrow('Cannot delete system default');
		});

		it('should not delete option from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			const listB = await createTestReferenceList(clientB.id, { entity: `del_iso_${Date.now()}` });
			const optB = await createTestReferenceOption(clientB.id, listB.id, userB.id);

			await expect(deleteReferenceOption(ctxA, optB.id)).rejects.toThrow('not found');
		});
	});

	describe('restoreReferenceOption', () => {
		it('should restore deleted option', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const list = await createTestReferenceList(client.id, { entity: `restore_${Date.now()}` });
			const opt = await createTestReferenceOption(client.id, list.id, user.id);
			await db
				.updateTable('reference_option')
				.set({ deleted_at: new Date() })
				.where('id', '=', opt.id)
				.execute();

			const result = await restoreReferenceOption(ctx, opt.id);

			expect(result.deleted_at).toBeNull();
		});

		it('should not restore option from different client (tenant isolation)', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id, email: userA.email, role: 'user' });

			const listB = await createTestReferenceList(clientB.id, { entity: `restore_iso_${Date.now()}` });
			const optB = await createTestReferenceOption(clientB.id, listB.id, userB.id);
			await db
				.updateTable('reference_option')
				.set({ deleted_at: new Date() })
				.where('id', '=', optB.id)
				.execute();

			await expect(restoreReferenceOption(ctxA, optB.id)).rejects.toThrow();
		});
	});

	describe('validateReferenceValue', () => {
		it('should return true for valid active value', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const entity = `validate_${Date.now()}`;
			const list = await createTestReferenceList(client.id, { entity });
			await createTestReferenceOption(client.id, list.id, user.id, { value: 'valid_val', is_active: true });

			const result = await validateReferenceValue(ctx, entity, 'valid_val');

			expect(result).toBe(true);
		});

		it('should return false for inactive value', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const entity = `validate_inactive_${Date.now()}`;
			const list = await createTestReferenceList(client.id, { entity });
			await createTestReferenceOption(client.id, list.id, user.id, { value: 'inactive_val', is_active: false });

			const result = await validateReferenceValue(ctx, entity, 'inactive_val');

			expect(result).toBe(false);
		});

		it('should return false for non-existent value', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const entity = `validate_none_${Date.now()}`;
			await createTestReferenceList(client.id, { entity });

			const result = await validateReferenceValue(ctx, entity, 'nonexistent');

			expect(result).toBe(false);
		});
	});

	describe('getValidReferenceValues', () => {
		it('should return array of valid values', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const entity = `valid_vals_${Date.now()}`;
			const list = await createTestReferenceList(client.id, { entity });
			await createTestReferenceOption(client.id, list.id, user.id, { value: 'val1' });
			await createTestReferenceOption(client.id, list.id, user.id, { value: 'val2' });

			const values = await getValidReferenceValues(ctx, entity);

			expect(values).toContain('val1');
			expect(values).toContain('val2');
		});

		it('should return empty array for non-existent entity', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, { id: user.id, client_id: client.id, email: user.email, role: 'user' });

			const values = await getValidReferenceValues(ctx, 'nonexistent');

			expect(values).toEqual([]);
		});
	});
});
