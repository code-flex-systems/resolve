/**
 * Reference Data Fixtures for Integration Tests
 */

import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

/**
 * Creates a test reference_list entry
 */
export async function createTestReferenceList(
	db: Kysely<DB>,
	params: {
		client_id: string;
		entity: string;
		display_name?: string;
		description?: string;
	}
) {
	return await db
		.insertInto('reference_list')
		.values({
			client_id: params.client_id,
			entity: params.entity,
			display_name: params.display_name || params.entity,
			description: params.description || null,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Creates a test reference_option entry
 */
export async function createTestReferenceOption(
	db: Kysely<DB>,
	params: {
		reference_list_id: number;
		client_id: string;
		value: string;
		display_label?: string;
		icon_emoji?: string;
		sort_order?: number;
		is_active?: boolean;
		is_system_default?: boolean;
	}
) {
	return await db
		.insertInto('reference_option')
		.values({
			reference_list_id: params.reference_list_id,
			client_id: params.client_id,
			value: params.value,
			display_label: params.display_label || params.value,
			icon_emoji: params.icon_emoji || null,
			sort_order: params.sort_order || 1,
			is_active: params.is_active ?? true,
			is_system_default: params.is_system_default ?? false,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Helper to create a complete role list with options
 */
export async function createTestRoleList(
	db: Kysely<DB>,
	params: {
		client_id: string;
		entity: 'claimant_party_role' | 'adverse_party_role';
		roles: string[];
	}
) {
	const list = await createTestReferenceList(db, {
		client_id: params.client_id,
		entity: params.entity,
		display_name: params.entity === 'claimant_party_role' ? 'Claimant Party Role' : 'Adverse Party Role',
	});

	const options = [];
	for (let i = 0; i < params.roles.length; i++) {
		const option = await createTestReferenceOption(db, {
			reference_list_id: list.id,
			client_id: params.client_id,
			value: params.roles[i],
			display_label: params.roles[i],
			sort_order: i + 1,
		});
		options.push(option);
	}

	return { list, options };
}
