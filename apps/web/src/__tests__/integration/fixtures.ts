/**
 * Integration Test Fixtures
 *
 * Factory functions for creating test data in the database.
 * Each function inserts a record and returns the created entity.
 */

import { Kysely } from 'kysely';
import { randomUUID } from 'crypto';
import type { DB } from '@/api/database/types';

/**
 * Create a test client
 */
export async function createTestClient(
	db: Kysely<DB>,
	overrides: { id?: string; name?: string; clerk_org_id?: string | null } = {}
) {
	const data = {
		id: overrides.id || randomUUID(),
		name: overrides.name || 'Test Client',
		clerk_org_id: overrides.clerk_org_id ?? null,
	};

	return db
		.insertInto('client')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Create a test user
 */
export async function createTestUser(
	db: Kysely<DB>,
	overrides: {
		id?: string;
		client_id: string;
		email?: string;
		first?: string;
		last?: string;
		role?: string;
		disabled?: boolean;
		created_by?: string | null;
	}
) {
	const data = {
		id: overrides.id || randomUUID(),
		client_id: overrides.client_id,
		email: overrides.email || `test-${randomUUID()}@example.com`,
		first: overrides.first || 'Test',
		last: overrides.last || 'User',
		role: overrides.role || 'Admin',
		disabled: overrides.disabled ?? false,
		created_by: overrides.created_by ?? null,
	};

	return db
		.insertInto('users')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

// Counter to ensure unique claim numbers within same test run
let claimCounter = 0;

/**
 * Create a test claim
 */
export async function createTestClaim(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		claim_number?: string;
		client?: string | null;
		client_adjuster?: string | null;
		insured?: string | null;
		claim_amount?: number | string | null;
		total_incurred?: number | string | null;
		date_of_loss?: Date | string | null;
		loss_location?: string | null;
		expected_recovery?: number | string | null;
		actual_recovery?: number | string | null;
		recovery_status?: string | null;
		substatus?: string | null;
		created_by?: string | null;
		desk_location_id?: number | null;
		feed_id?: number | null;
	}
) {
	claimCounter++;
	const data = {
		client_id: overrides.client_id,
		claim_number: overrides.claim_number || `CLM-${Date.now()}-${claimCounter}`,
		client: overrides.client ?? null,
		client_adjuster: overrides.client_adjuster ?? null,
		insured: overrides.insured ?? 'Test Insured',
		claim_amount: overrides.claim_amount ?? null,
		total_incurred: overrides.total_incurred ?? null,
		date_of_loss: overrides.date_of_loss ?? null,
		loss_location: overrides.loss_location ?? null,
		expected_recovery: overrides.expected_recovery ?? null,
		actual_recovery: overrides.actual_recovery ?? null,
		recovery_status: overrides.recovery_status ?? null,
		substatus: overrides.substatus ?? null,
		created_by: overrides.created_by ?? null,
		desk_location_id: overrides.desk_location_id ?? null,
		feed_id: overrides.feed_id ?? null,
	};

	return db
		.insertInto('claim')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Create a test checklist
 */
export async function createTestChecklist(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		created_by: string;
		name?: string;
		description?: string | null;
		published?: boolean;
	}
) {
	const data = {
		client_id: overrides.client_id,
		name: overrides.name || `Test Checklist ${Date.now()}`,
		description: overrides.description ?? null,
		published: overrides.published ?? false,
		created_by: overrides.created_by,
	};

	return db
		.insertInto('checklist')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Create a test checklist-claim association
 */
export async function createTestChecklistClaim(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		checklist_id: number;
		claim_id: number;
		created_by: string;
		assignee?: string | null;
		status?: string;
	}
) {
	const data = {
		client_id: overrides.client_id,
		checklist_id: overrides.checklist_id,
		claim_id: overrides.claim_id,
		created_by: overrides.created_by,
		assignee: overrides.assignee ?? null,
		status: overrides.status || 'in_progress',
	};

	return db
		.insertInto('checklist_claim')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Create a test party (company/organization)
 */
export async function createTestParty(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		created_by: string;
		name?: string;
		party_type?: string;
		party_category?: string;
		email?: string | null;
		phone?: string | null;
		address?: string | null;
	}
) {
	const data = {
		client_id: overrides.client_id,
		name: overrides.name || `Test Party ${Date.now()}`,
		party_type: overrides.party_type || 'facilitator',
		party_category: overrides.party_category || 'adverse_carrier',
		email: overrides.email ?? null,
		phone: overrides.phone ?? null,
		address: overrides.address ?? null,
		created_by: overrides.created_by,
	};

	return db
		.insertInto('party')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Create a test claim-party association
 */
export async function createTestClaimParty(
	db: Kysely<DB>,
	overrides: {
		claim_id: number;
		party_id: number;
		role?: string;
		is_primary?: boolean;
		liability_percentage?: number | string | null;
		notes?: string | null;
		created_by?: string | null;
	}
) {
	const data = {
		claim_id: overrides.claim_id,
		party_id: overrides.party_id,
		role: overrides.role || 'adverse_carrier',
		is_primary: overrides.is_primary ?? false,
		liability_percentage: overrides.liability_percentage ?? null,
		notes: overrides.notes ?? null,
		created_by: overrides.created_by ?? null,
	};

	return db
		.insertInto('claim_party')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

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
		name: overrides.name || `Test Desk Type ${Date.now()}`,
		created_by: overrides.created_by ?? null,
	};

	return db
		.insertInto('desk_location_type')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Create a test desk location
 */
export async function createTestDeskLocation(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		desk_location_type_id: number;
		name?: string;
		is_active?: boolean;
		created_by?: string | null;
	}
) {
	const data = {
		client_id: overrides.client_id,
		desk_location_type_id: overrides.desk_location_type_id,
		name: overrides.name || `Test Desk ${Date.now()}`,
		is_active: overrides.is_active ?? true,
		created_by: overrides.created_by ?? null,
	};

	return db
		.insertInto('desk_location')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Create a test user desk location assignment
 */
export async function createTestUserDeskLocation(
	db: Kysely<DB>,
	overrides: {
		user_id: string;
		desk_location_id: number;
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

	return db
		.insertInto('user_desk_location')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Create a test task
 */
export async function createTestTask(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		claim_id: number;
		desk_location_id: number;
		assigned_by: string;
		title?: string;
		description?: string | null;
		status?: string;
		claimed_by?: string | null;
		completed_by?: string | null;
		completed_at?: Date | string | null;
	}
) {
	const data = {
		client_id: overrides.client_id,
		claim_id: overrides.claim_id,
		desk_location_id: overrides.desk_location_id,
		assigned_by: overrides.assigned_by,
		title: overrides.title || `Test Task ${Date.now()}`,
		description: overrides.description ?? null,
		status: overrides.status || 'pending',
		claimed_by: overrides.claimed_by ?? null,
		completed_by: overrides.completed_by ?? null,
		completed_at: overrides.completed_at ?? null,
	};

	return db
		.insertInto('task')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Create a test deadline
 */
export async function createTestDeadline(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		claim_id: number;
		created_by: string;
		deadline_type?: string;
		deadline_date?: Date | string;
		description?: string | null;
		status?: string;
	}
) {
	const data = {
		client_id: overrides.client_id,
		claim_id: overrides.claim_id,
		created_by: overrides.created_by,
		deadline_type: overrides.deadline_type || 'custom',
		deadline_date: overrides.deadline_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
		description: overrides.description ?? null,
		status: overrides.status || 'pending',
	};

	return db
		.insertInto('deadline')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Create a test feed
 */
export async function createTestFeed(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		created_by: string;
		name?: string;
		feed_type?: string;
		schedule?: number;
		status?: string;
		connection_options?: Record<string, unknown>;
	}
) {
	const data = {
		client_id: overrides.client_id,
		created_by: overrides.created_by,
		name: overrides.name || `Test Feed ${Date.now()}`,
		feed_type: overrides.feed_type || 'sftp',
		schedule: overrides.schedule ?? 0,
		status: overrides.status || 'Inactive',
		connection_options: JSON.stringify(overrides.connection_options || { host: 'test.example.com' }),
	};

	return db
		.insertInto('feeds')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}
