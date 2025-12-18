/**
 * Settlement Fixtures
 */

import { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { SettlementStatus } from '@/config/enums';

/**
 * Create a test settlement
 */
export async function createTestSettlement(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		claim_id: number;
		claim_party_id: number;
		coverage_id: number;
		created_by: string;
		demand_amount?: string | number;
		demand_date?: Date | string;
		agreed_liability_percentage?: string | number | null;
		settlement_amount?: string | number | null;
		settlement_date?: Date | string | null;
		status?: SettlementStatus;
		notes?: string | null;
	}
) {
	const data = {
		client_id: overrides.client_id,
		claim_id: overrides.claim_id,
		claim_party_id: overrides.claim_party_id,
		coverage_id: overrides.coverage_id,
		created_by: overrides.created_by,
		demand_amount: overrides.demand_amount?.toString() || '10000.00',
		demand_date: overrides.demand_date || new Date(),
		status: overrides.status || SettlementStatus.SENT,
		...(overrides.agreed_liability_percentage !== undefined && {
			agreed_liability_percentage: overrides.agreed_liability_percentage?.toString() ?? null,
		}),
		...(overrides.settlement_amount !== undefined && {
			settlement_amount: overrides.settlement_amount?.toString() ?? null,
		}),
		...(overrides.settlement_date !== undefined && {
			settlement_date: overrides.settlement_date,
		}),
		...(overrides.notes !== undefined && { notes: overrides.notes }),
	};

	return db
		.insertInto('settlement')
		.values(data as any)
		.returningAll()
		.executeTakeFirstOrThrow();
}
