/**
 * Desk Location Fixtures
 */

import { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

/**
 * Create a test desk location type
 */
export async function createTestDeskLocationType(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		name?: string;
		created_by?: string | null;
	}
) {
	const data = {
		client_id: overrides.client_id,
		name: overrides.name || `Test Desk Type ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		created_by: overrides.created_by ?? null,
	};

	return db.insertInto('desk_location_type').values(data).returningAll().executeTakeFirstOrThrow();
}

/**
 * Create a test desk location
 */
export async function createTestDeskLocation(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		desk_location_type_id: string;
		name?: string;
		is_active?: boolean;
		created_by?: string | null;
		daily_work_units?: number | null;
	}
) {
	const data = {
		client_id: overrides.client_id,
		desk_location_type_id: overrides.desk_location_type_id,
		name: overrides.name || `Test Desk ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		is_active: overrides.is_active ?? true,
		created_by: overrides.created_by ?? null,
		daily_work_units: overrides.daily_work_units ?? null,
	};

	return db.insertInto('desk_location').values(data).returningAll().executeTakeFirstOrThrow();
}

/**
 * Create a test user desk location assignment
 */
export async function createTestUserDeskLocation(
	db: Kysely<DB>,
	overrides: {
		user_id: string;
		desk_location_id: string;
		priority?: number;
		assigned_by?: string | null;
		removed_at?: Date | string | null;
		removed_by?: string | null;
	}
) {
	const data = {
		user_id: overrides.user_id,
		desk_location_id: overrides.desk_location_id,
		priority: overrides.priority ?? 1,
		assigned_by: overrides.assigned_by ?? null,
		removed_at: overrides.removed_at ?? null,
		removed_by: overrides.removed_by ?? null,
	};

	return db.insertInto('user_desk_location').values(data).returningAll().executeTakeFirstOrThrow();
}
