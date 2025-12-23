/**
 * Payment Fixtures
 */

import { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

/**
 * Create a test payment
 */
export async function createTestPayment(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		claim_id: number;
		coverage_id: number;
		created_by: string;
		payment_date?: Date | string;
		payment_amount?: string | number;
		is_subrogable?: boolean;
		is_expense?: boolean;
		payee_claim_party_id?: number | null;
		description?: string | null;
		external_reference?: string | null;
		feed_id?: string | null;
		payment_code?: string | null;
		manually_overridden?: boolean;
		deleted_at?: Date | null;
		deleted_by?: string | null;
	}
) {
	const paymentDate = overrides.payment_date
		? typeof overrides.payment_date === 'string'
			? overrides.payment_date
			: overrides.payment_date.toISOString().split('T')[0]
		: new Date().toISOString().split('T')[0];

	const data = {
		client_id: overrides.client_id,
		claim_id: overrides.claim_id,
		coverage_id: overrides.coverage_id,
		created_by: overrides.created_by,
		payment_date: paymentDate,
		payment_amount: overrides.payment_amount?.toString() ?? '1000',
		is_subrogable: overrides.is_subrogable ?? true,
		is_expense: overrides.is_expense ?? false,
		payee_claim_party_id: overrides.payee_claim_party_id ?? null,
		description: overrides.description ?? null,
		external_reference: overrides.external_reference ?? null,
		feed_id: overrides.feed_id ?? null,
		payment_code: overrides.payment_code ?? null,
		manually_overridden: overrides.manually_overridden ?? false,
		deleted_at: overrides.deleted_at ?? null,
		deleted_by: overrides.deleted_by ?? null,
	};

	return db.insertInto('claim_payment').values(data).returningAll().executeTakeFirstOrThrow();
}
