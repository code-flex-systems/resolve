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
		party_category?: string;
		organization?: string | null;
		email?: string | null;
		phone?: string | null;
		street_address?: string | null;
		city?: string | null;
		state?: string | null;
		postal_code?: string | null;
		country?: string | null;
		notes?: string | null;
		deleted_at?: Date | null;
		deleted_by?: string | null;
	}
) {
	const data = {
		client_id: overrides.client_id,
		name: overrides.name || `Test Party ${Date.now()}`,
		party_type: overrides.party_type || 'facilitator',
		party_category: overrides.party_category || 'adverse_carrier',
		organization: overrides.organization ?? null,
		email: overrides.email ?? null,
		phone: overrides.phone ?? null,
		street_address: overrides.street_address ?? null,
		city: overrides.city ?? null,
		state: overrides.state ?? null,
		postal_code: overrides.postal_code ?? null,
		country: overrides.country ?? null,
		notes: overrides.notes ?? null,
		deleted_at: overrides.deleted_at ?? null,
		deleted_by: overrides.deleted_by ?? null,
		created_by: overrides.created_by,
	};

	return db
		.insertInto('party')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Create a test party office
 */
export async function createTestPartyOffice(
	db: Kysely<DB>,
	overrides: {
		party_id: number;
		created_by: string;
		office_name?: string | null;
		street_address?: string | null;
		city?: string | null;
		state?: string | null;
		postal_code?: string | null;
		country?: string | null;
		phone?: string | null;
		fax?: string | null;
		is_primary?: boolean;
		deleted_at?: Date | null;
		deleted_by?: string | null;
	}
) {
	const data = {
		party_id: overrides.party_id,
		office_name: overrides.office_name ?? `Office ${Date.now()}`,
		street_address: overrides.street_address ?? null,
		city: overrides.city ?? null,
		state: overrides.state ?? null,
		postal_code: overrides.postal_code ?? null,
		country: overrides.country ?? null,
		phone: overrides.phone ?? null,
		fax: overrides.fax ?? null,
		is_primary: overrides.is_primary ?? false,
		deleted_at: overrides.deleted_at ?? null,
		deleted_by: overrides.deleted_by ?? null,
		created_by: overrides.created_by,
	};

	return db
		.insertInto('party_office')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Create a test party representative
 */
export async function createTestPartyRepresentative(
	db: Kysely<DB>,
	overrides: {
		party_id: number;
		created_by: string;
		office_id?: number | null;
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
		office_id: overrides.office_id ?? null,
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
		claim_id: number;
		party_id: number;
		created_by: string;
		role?: string;
		representative_id?: number | null;
		is_primary?: boolean;
		notes?: string | null;
		external_reference?: string | null;
		liability_percentage?: string | null;
		parent_claim_party_id?: number | null;
		deleted_at?: Date | null;
		deleted_by?: string | null;
	}
) {
	const data = {
		claim_id: overrides.claim_id,
		party_id: overrides.party_id,
		role: overrides.role || 'adverse_carrier',
		representative_id: overrides.representative_id ?? null,
		is_primary: overrides.is_primary ?? false,
		notes: overrides.notes ?? null,
		external_reference: overrides.external_reference ?? null,
		liability_percentage: overrides.liability_percentage ?? null,
		parent_claim_party_id: overrides.parent_claim_party_id ?? null,
		deleted_at: overrides.deleted_at ?? null,
		deleted_by: overrides.deleted_by ?? null,
		created_by: overrides.created_by,
	};

	return db
		.insertInto('claim_party')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}
