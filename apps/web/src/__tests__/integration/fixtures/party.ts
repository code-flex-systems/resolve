/**
 * Party Fixtures
 */

import { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

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
		is_business?: boolean;
		first_name?: string | null;
		middle_name?: string | null;
		last_name?: string | null;
		suffix?: string | null;
		organization?: string | null;
		notes?: string | null;
		deleted_at?: Date | null;
		deleted_by?: string | null;
	}
) {
	const data = {
		client_id: overrides.client_id,
		name: overrides.name || `Test Party ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		party_type: overrides.party_type || 'facilitator',
		is_business: overrides.is_business ?? true,
		first_name: overrides.first_name ?? null,
		middle_name: overrides.middle_name ?? null,
		last_name: overrides.last_name ?? null,
		suffix: overrides.suffix ?? null,
		organization: overrides.organization ?? null,
		notes: overrides.notes ?? null,
		deleted_at: overrides.deleted_at ?? null,
		deleted_by: overrides.deleted_by ?? null,
		created_by: overrides.created_by,
	};

	return db.insertInto('party').values(data).returningAll().executeTakeFirstOrThrow();
}

/**
 * Create a test party address
 */
export async function createTestPartyAddress(
	db: Kysely<DB>,
	overrides: {
		party_id: string;
		created_by: string;
		name?: string | null;
		street_address?: string | null;
		city?: string | null;
		state?: string | null;
		postal_code?: string | null;
		country?: string | null;
		address_type?: string;
		address_status?: string;
		deleted_at?: Date | null;
		deleted_by?: string | null;
	}
) {
	const data = {
		party_id: overrides.party_id,
		name: overrides.name ?? `Address ${Date.now()}`,
		street_address: overrides.street_address ?? null,
		city: overrides.city ?? null,
		state: overrides.state ?? null,
		postal_code: overrides.postal_code ?? null,
		country: overrides.country ?? null,
		address_type: overrides.address_type ?? 'business',
		address_status: overrides.address_status ?? 'valid',
		deleted_at: overrides.deleted_at ?? null,
		deleted_by: overrides.deleted_by ?? null,
		created_by: overrides.created_by,
	};

	return db.insertInto('party_address').values(data).returningAll().executeTakeFirstOrThrow();
}

/**
 * Create a test party phone
 */
export async function createTestPartyPhone(
	db: Kysely<DB>,
	overrides: {
		party_id: string;
		client_id: string;
		created_by: string;
		phone_number?: string;
		country_code?: string | null;
		area_code?: string | null;
		extension?: string | null;
		phone_type?: string;
		phone_status?: string;
		deleted_at?: Date | null;
		deleted_by?: string | null;
	}
) {
	const data = {
		party_id: overrides.party_id,
		client_id: overrides.client_id,
		phone_number: overrides.phone_number ?? `555-${Date.now().toString().slice(-7)}`,
		country_code: overrides.country_code ?? null,
		area_code: overrides.area_code ?? null,
		extension: overrides.extension ?? null,
		phone_type: overrides.phone_type ?? 'work',
		phone_status: overrides.phone_status ?? 'valid',
		deleted_at: overrides.deleted_at ?? null,
		deleted_by: overrides.deleted_by ?? null,
		created_by: overrides.created_by,
	};

	return db.insertInto('party_phone').values(data).returningAll().executeTakeFirstOrThrow();
}

/**
 * Create a test party email
 */
export async function createTestPartyEmail(
	db: Kysely<DB>,
	overrides: {
		party_id: string;
		client_id: string;
		created_by: string;
		email_address?: string;
		email_type?: string;
		deleted_at?: Date | null;
		deleted_by?: string | null;
	}
) {
	const data = {
		party_id: overrides.party_id,
		client_id: overrides.client_id,
		email_address: overrides.email_address ?? `test-${Date.now()}@example.com`,
		email_type: overrides.email_type ?? 'business',
		deleted_at: overrides.deleted_at ?? null,
		deleted_by: overrides.deleted_by ?? null,
		created_by: overrides.created_by,
	};

	return db.insertInto('party_email').values(data).returningAll().executeTakeFirstOrThrow();
}

/**
 * Create a test party representative
 */
export async function createTestPartyRepresentative(
	db: Kysely<DB>,
	overrides: {
		party_id: string;
		created_by: string;
		address_id?: string | null;
		first_name?: string;
		last_name?: string;
		title?: string | null;
		email?: string | null;
		phone?: string | null;
		mobile_phone?: string | null;
		fax?: string | null;
		is_primary?: boolean;
		deleted_at?: Date | null;
		deleted_by?: string | null;
	}
) {
	const data = {
		party_id: overrides.party_id,
		address_id: overrides.address_id ?? null,
		first_name: overrides.first_name || 'Test',
		last_name: overrides.last_name || `Rep ${Date.now()}`,
		title: overrides.title ?? null,
		email: overrides.email ?? null,
		phone: overrides.phone ?? null,
		mobile_phone: overrides.mobile_phone ?? null,
		fax: overrides.fax ?? null,
		is_primary: overrides.is_primary ?? false,
		deleted_at: overrides.deleted_at ?? null,
		deleted_by: overrides.deleted_by ?? null,
		created_by: overrides.created_by,
	};

	return db
		.insertInto('party_representative')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Create a test claim party link
 */
export async function createTestClaimParty(
	db: Kysely<DB>,
	overrides: {
		claim_id: string;
		party_id: string;
		client_id: string;
		created_by: string;
		role?: string[];
		representative_id?: string | null;
		is_primary?: boolean;
		notes?: string | null;
		external_reference?: string | null;
		liability_percentage?: string | null;
		parent_claim_party_id?: string | null;
		loss_type?: string | null;
		policy_limit?: string | null;
		deleted_at?: Date | null;
		deleted_by?: string | null;
	}
) {
	const data = {
		claim_id: overrides.claim_id,
		party_id: overrides.party_id,
		client_id: overrides.client_id,
		role: overrides.role || ['adverse_carrier'],
		representative_id: overrides.representative_id ?? null,
		is_primary: overrides.is_primary ?? false,
		notes: overrides.notes ?? null,
		external_reference: overrides.external_reference ?? null,
		liability_percentage: overrides.liability_percentage ?? null,
		parent_claim_party_id: overrides.parent_claim_party_id ?? null,
		loss_type: overrides.loss_type ?? null,
		policy_limit: overrides.policy_limit ?? null,
		deleted_at: overrides.deleted_at ?? null,
		deleted_by: overrides.deleted_by ?? null,
		created_by: overrides.created_by,
	};

	return db.insertInto('claim_party').values(data).returningAll().executeTakeFirstOrThrow();
}
