/**
 * Claim & Related Entity Fixtures
 */

import { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

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
 * Create a test claim liability
 */
export async function createTestClaimLiability(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		claim_party_id: number;
		line_of_business?: string | null;
		loss_type?: string | null;
		amount_paid?: number | string | null;
		coverage_amount?: number | string | null;
		created_by?: string | null;
	}
) {
	const data = {
		client_id: overrides.client_id,
		claim_party_id: overrides.claim_party_id,
		line_of_business: overrides.line_of_business ?? null,
		loss_type: overrides.loss_type ?? null,
		amount_paid: overrides.amount_paid ?? null,
		coverage_amount: overrides.coverage_amount ?? null,
		created_by: overrides.created_by ?? null,
	};

	return db
		.insertInto('claim_liability')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Create a test claim coverage
 */
export async function createTestClaimCoverage(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		claim_id: number;
		coverage_type: string;
		coverage_amount?: number | string | null;
		amount_reserved?: number | string | null;
		created_by?: string | null;
	}
) {
	const data = {
		client_id: overrides.client_id,
		claim_id: overrides.claim_id,
		coverage_type: overrides.coverage_type,
		coverage_amount: overrides.coverage_amount ?? null,
		amount_reserved: overrides.amount_reserved ?? null,
		created_by: overrides.created_by ?? null,
	};

	return db
		.insertInto('claim_coverage')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}
