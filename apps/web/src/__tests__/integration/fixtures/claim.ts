/**
 * Claim & Related Entity Fixtures
 */

import { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import type { Insertable } from 'kysely';

type ClaimInsert = Insertable<DB['claim']>;

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
		loss_street_address?: string | null;
		loss_city?: string | null;
		loss_state?: string | null;
		loss_postal_code?: string | null;
		loss_country?: string | null;
		expected_recovery?: number | string | null;
		actual_recovery?: number | string | null;
		recovery_status?: string | null;
		substatus?: string | null;
		created_by?: string | null;
		desk_location_id?: string | null;
		feed_id?: string | null;
		created_at?: Date | string;
	}
) {
	claimCounter++;
	const data: ClaimInsert = {
		client_id: overrides.client_id,
		claim_number: overrides.claim_number || `CLM-${Date.now()}-${claimCounter}`,
		client: overrides.client ?? null,
		client_adjuster: overrides.client_adjuster ?? null,
		insured: overrides.insured ?? 'Test Insured',
		claim_amount: overrides.claim_amount ?? null,
		total_incurred: overrides.total_incurred ?? null,
		date_of_loss: overrides.date_of_loss ?? null,
		loss_street_address: overrides.loss_street_address ?? null,
		loss_city: overrides.loss_city ?? null,
		loss_state: overrides.loss_state ?? null,
		loss_postal_code: overrides.loss_postal_code ?? null,
		loss_country: overrides.loss_country ?? null,
		expected_recovery: overrides.expected_recovery ?? null,
		actual_recovery: overrides.actual_recovery ?? null,
		recovery_status: overrides.recovery_status ?? null,
		substatus: overrides.substatus ?? null,
		created_by: overrides.created_by ?? null,
		desk_location_id: overrides.desk_location_id ?? null,
		feed_id: overrides.feed_id ?? null,
	};

	// Default created_at to "now" so that date-range queries (e.g. recovery metrics)
	// pick up claims from a freshly seeded fixture.
	data.created_at = overrides.created_at ?? new Date();

	return db.insertInto('claim').values(data).returningAll().executeTakeFirstOrThrow();
}

// NOTE: createTestClaimParty is defined in party.ts to avoid duplication

/**
 * Create a test claim coverage
 */
export async function createTestClaimCoverage(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		claim_id: string;
		claim_party_id?: string | null;
		loss_type: string;
		coverage_amount?: number | string | null;
		amount_reserved?: number | string | null;
		created_by?: string | null;
	}
) {
	const data = {
		client_id: overrides.client_id,
		claim_id: overrides.claim_id,
		claim_party_id: overrides.claim_party_id ?? null,
		loss_type: overrides.loss_type,
		coverage_amount: overrides.coverage_amount ?? null,
		amount_reserved: overrides.amount_reserved ?? null,
		created_by: overrides.created_by ?? null,
	};

	return db.insertInto('claim_coverage').values(data).returningAll().executeTakeFirstOrThrow();
}
