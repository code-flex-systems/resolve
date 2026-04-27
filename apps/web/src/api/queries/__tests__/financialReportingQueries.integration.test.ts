/**
 * Integration tests for financialReportingQueries
 *
 * These tests run against a real database to verify:
 * - Aggregation logic (sums, counts, averages, percentages)
 * - Date range filtering
 * - Tenant isolation (client_id scoping)
 * - Soft-delete exclusion across all joined tables
 * - Bucket assignment (aging, recovery time distribution)
 * - Status grouping (variance decomposition, settlement funnel)
 * - HAVING clause filters (recovery rate >= 3, cap by carrier >= 2)
 * - Edge cases (null handling, zero amounts, preserved statutes)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestParty,
	createTestClaimParty,
	createTestCoverage,
	createTestSettlement,
	createTestRecoveryEvent,
	createTestPayment,
} from '@/__tests__/integration/fixtures';
import { SettlementStatus } from '@/config/enums';
import {
	getRecoveryAgingBreakdown,
	getRecoveryRateByCarrier,
	getNetRecoveryByMonth,
	getNetRecoveryByLineOfBusiness,
	getPaymentToRecoveryTimeline,
	getRecoveryTimeDistribution,
	getCoverageCapUtilization,
	getCoverageCapByCarrier,
	getVarianceDecomposition,
	getSettlementFunnel,
	getNegotiationEfficiencyScatter,
	getStatuteDeadlineRisk,
} from '../financialReportingQueries';

/**
 * Helper to create the full settlement chain needed for settlement/recovery flows.
 * Creates: party -> claim_party -> coverage -> settlement
 */
async function createSettlementChain(
	db: Kysely<DB>,
	{
		client_id,
		claim_id,
		created_by,
		party_name,
		policy_limit,
		demand_amount = 50000,
		demand_date,
		settlement_amount,
		settlement_date,
		status,
	}: {
		client_id: string;
		claim_id: string;
		created_by: string;
		party_name?: string;
		policy_limit?: string | number | null;
		demand_amount?: string | number;
		demand_date?: Date;
		settlement_amount?: string | number | null;
		settlement_date?: Date | null;
		status?: SettlementStatus;
	}
) {
	const party = await createTestParty(db, {
		client_id,
		created_by,
		name: party_name,
		party_type: 'facilitator',
	});
	const claimParty = await createTestClaimParty(db, {
		claim_id,
		party_id: party.id,
		client_id,
		created_by,
		role: ['adverse_carrier'],
		policy_limit: policy_limit !== undefined && policy_limit !== null ? policy_limit.toString() : null,
	});
	const coverage = await createTestCoverage(db, {
		client_id,
		claim_id,
		created_by,
		loss_type: 'liability',
		coverage_amount: 100000,
	});
	const settlement = await createTestSettlement(db, {
		client_id,
		claim_id,
		claim_party_id: claimParty.id,
		coverage_id: coverage.id,
		created_by,
		demand_amount,
		demand_date: demand_date ?? new Date(),
		settlement_amount: settlement_amount ?? null,
		settlement_date: settlement_date ?? null,
		status: status ?? SettlementStatus.SENT,
	});
	return { party, claimParty, coverage, settlement };
}

/**
 * Helper to compute a date `daysAgo` days before now.
 */
function daysAgo(n: number): Date {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d;
}

/**
 * Wide range: last 5 years to next year. Captures all test data.
 */
function fullRange(): [Date, Date] {
	const start = new Date();
	start.setFullYear(start.getFullYear() - 5);
	const end = new Date();
	end.setFullYear(end.getFullYear() + 1);
	return [start, end];
}

/**
 * Construct a Date for the given YYYY-MM-DD at noon UTC.
 * Using noon UTC avoids timezone day-shift issues when the local timezone
 * is behind UTC (e.g., US Eastern), which would otherwise cause date columns
 * to receive the previous day.
 */
function utcNoon(dateStr: string): Date {
	return new Date(`${dateStr}T12:00:00Z`);
}

/**
 * The `claim` table has no default for `created_at`, so the standard fixture
 * inserts it as null. Several reporting queries filter on `c.created_at` —
 * this helper sets created_at to "now" so those filters match.
 */
async function setClaimCreatedAt(db: Kysely<DB>, claimId: string, createdAt: Date = new Date()) {
	await db.updateTable('claim').set({ created_at: createdAt }).where('id', '=', claimId).execute();
}

/**
 * Creates a claim and ensures created_at is populated (the fixture leaves it null
 * by default, but the variance/funnel queries filter on created_at).
 */
async function createTestClaimWithCreatedAt(
	db: Kysely<DB>,
	overrides: Parameters<typeof createTestClaim>[1]
) {
	const claim = await createTestClaim(db, overrides);
	await setClaimCreatedAt(db, claim.id);
	return claim;
}

describe('financialReportingQueries integration', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// ========================================================================
	// 1. getRecoveryAgingBreakdown
	// ========================================================================
	describe('getRecoveryAgingBreakdown', () => {
		it('aggregates open demands and bucketizes settlements by demand age', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			// Settlement with status 'sent' demand age = 10 days -> bucket '0-30', open_demand
			await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				demand_amount: 5000,
				demand_date: daysAgo(10),
				status: SettlementStatus.SENT,
			});
			// Settlement with status 'sent' demand age = 45 days -> bucket '31-60'
			await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				demand_amount: 7000,
				demand_date: daysAgo(45),
				status: SettlementStatus.SENT,
			});

			const result = await getRecoveryAgingBreakdown(db, client.id, fullRange());

			expect(result.length).toBeGreaterThanOrEqual(2);
			const bucket030 = result.find((r) => r.bucket === '0-30');
			const bucket3160 = result.find((r) => r.bucket === '31-60');

			expect(bucket030).toBeDefined();
			expect(bucket030!.open_demand).toBe(5000);
			expect(bucket030!.count).toBe(1);

			expect(bucket3160).toBeDefined();
			expect(bucket3160!.open_demand).toBe(7000);
			expect(bucket3160!.count).toBe(1);
		});

		it('computes settled_outstanding as settlement_amount - recovered for settled status', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				demand_amount: 10000,
				demand_date: daysAgo(15),
				settlement_amount: 8000,
				settlement_date: daysAgo(5),
				status: SettlementStatus.SETTLED,
			});

			// Recovered $3000 of the $8000 settlement -> outstanding = $5000
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_amount: 3000,
			});

			const result = await getRecoveryAgingBreakdown(db, client.id, fullRange());

			const bucket030 = result.find((r) => r.bucket === '0-30');
			expect(bucket030).toBeDefined();
			expect(bucket030!.settled_outstanding).toBe(5000);
			expect(bucket030!.total_recovered).toBe(3000);
		});

		it('excludes settlements with status closed', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			// Control: an open one we expect to see
			await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				demand_amount: 1000,
				demand_date: daysAgo(5),
				status: SettlementStatus.SENT,
			});
			// Closed should be excluded
			await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				demand_amount: 9999,
				demand_date: daysAgo(5),
				status: SettlementStatus.CLOSED,
			});

			const result = await getRecoveryAgingBreakdown(db, client.id, fullRange());
			const bucket030 = result.find((r) => r.bucket === '0-30');

			expect(bucket030).toBeDefined();
			expect(bucket030!.count).toBe(1);
			expect(bucket030!.open_demand).toBe(1000);
		});

		it('enforces tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client1.id });
			const claim2 = await createTestClaim(db, { client_id: client2.id });

			await createSettlementChain(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				created_by: user1.id,
				demand_amount: 5000,
				demand_date: daysAgo(10),
				status: SettlementStatus.SENT,
			});
			// Control - client2 has its own data
			await createSettlementChain(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				created_by: user2.id,
				demand_amount: 9999,
				demand_date: daysAgo(10),
				status: SettlementStatus.SENT,
			});

			const result1 = await getRecoveryAgingBreakdown(db, client1.id, fullRange());
			const totalDemand1 = result1.reduce((sum, r) => sum + r.open_demand, 0);
			expect(totalDemand1).toBe(5000);
		});

		it('excludes soft-deleted settlements', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			// Control: active
			await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				demand_amount: 1234,
				demand_date: daysAgo(5),
				status: SettlementStatus.SENT,
			});
			// To be deleted
			const { settlement: toDelete } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				demand_amount: 9999,
				demand_date: daysAgo(5),
				status: SettlementStatus.SENT,
			});
			await db
				.updateTable('settlement')
				.set({ deleted_at: new Date(), deleted_by: user.id })
				.where('id', '=', toDelete.id)
				.execute();

			const result = await getRecoveryAgingBreakdown(db, client.id, fullRange());
			const totalDemand = result.reduce((sum, r) => sum + r.open_demand, 0);
			expect(totalDemand).toBe(1234);
		});
	});

	// ========================================================================
	// 2. getRecoveryRateByCarrier
	// ========================================================================
	describe('getRecoveryRateByCarrier', () => {
		it('computes recovery rate, demand_total, settled_total per carrier (HAVING >= 3)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			// Create 3 settled settlements for one carrier so it satisfies HAVING >= 3
			// Demands: 10000, 20000, 30000 (total 60000)
			// Settled: 5000, 10000, 15000 (total 30000) -> rate 50%
			// Settle/demand date deltas: 10, 20, 30 days -> avg 20

			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'CarrierA',
			});
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
				role: ['adverse_carrier'],
			});
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				loss_type: 'liability',
				coverage_amount: 100000,
			});

			const demandDate = daysAgo(60);
			for (const [demand, settled, deltaDays] of [
				[10000, 5000, 10],
				[20000, 10000, 20],
				[30000, 15000, 30],
			] as const) {
				const settleDate = new Date(demandDate);
				settleDate.setDate(settleDate.getDate() + deltaDays);
				await createTestSettlement(db, {
					client_id: client.id,
					claim_id: claim.id,
					claim_party_id: claimParty.id,
					coverage_id: coverage.id,
					created_by: user.id,
					demand_amount: demand,
					demand_date: demandDate,
					settlement_amount: settled,
					settlement_date: settleDate,
					status: SettlementStatus.SETTLED,
				});
			}

			const result = await getRecoveryRateByCarrier(db, client.id, fullRange());

			expect(result).toHaveLength(1);
			expect(result[0].party_name).toBe('CarrierA');
			expect(result[0].demand_total).toBe(60000);
			expect(result[0].settled_total).toBe(30000);
			expect(result[0].recovery_rate).toBe(50);
			expect(result[0].avg_days_to_settle).toBe(20);
			expect(result[0].settlement_count).toBe(3);
		});

		it('excludes carriers with fewer than 3 settlements', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			// Carrier B: 2 settlements (should be excluded)
			const partyB = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'CarrierB',
			});
			const claimPartyB = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: partyB.id,
				client_id: client.id,
				created_by: user.id,
				role: ['adverse_carrier'],
			});
			const coverageB = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				loss_type: 'liability',
			});
			for (let i = 0; i < 2; i++) {
				const demandDate = daysAgo(30);
				const settleDate = new Date(demandDate);
				settleDate.setDate(settleDate.getDate() + 5);
				await createTestSettlement(db, {
					client_id: client.id,
					claim_id: claim.id,
					claim_party_id: claimPartyB.id,
					coverage_id: coverageB.id,
					created_by: user.id,
					demand_amount: 1000,
					demand_date: demandDate,
					settlement_amount: 500,
					settlement_date: settleDate,
					status: SettlementStatus.SETTLED,
				});
			}

			// Control: Carrier C with 3 settlements (should be included)
			const partyC = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'CarrierC',
			});
			const claimPartyC = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: partyC.id,
				client_id: client.id,
				created_by: user.id,
				role: ['adverse_carrier'],
			});
			const coverageC = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				loss_type: 'liability',
			});
			for (let i = 0; i < 3; i++) {
				const demandDate = daysAgo(30);
				const settleDate = new Date(demandDate);
				settleDate.setDate(settleDate.getDate() + 5);
				await createTestSettlement(db, {
					client_id: client.id,
					claim_id: claim.id,
					claim_party_id: claimPartyC.id,
					coverage_id: coverageC.id,
					created_by: user.id,
					demand_amount: 1000,
					demand_date: demandDate,
					settlement_amount: 800,
					settlement_date: settleDate,
					status: SettlementStatus.SETTLED,
				});
			}

			const result = await getRecoveryRateByCarrier(db, client.id, fullRange());
			const names = result.map((r) => r.party_name);
			expect(names).toContain('CarrierC');
			expect(names).not.toContain('CarrierB');
		});

		it('excludes settlements with null settlement_date', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			const party = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'NullDateCarrier',
			});
			const claimParty = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: party.id,
				client_id: client.id,
				created_by: user.id,
			});
			const coverage = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				loss_type: 'liability',
			});
			// 3 settlements with settlement_amount but null settlement_date
			for (let i = 0; i < 3; i++) {
				await createTestSettlement(db, {
					client_id: client.id,
					claim_id: claim.id,
					claim_party_id: claimParty.id,
					coverage_id: coverage.id,
					created_by: user.id,
					demand_amount: 1000,
					demand_date: daysAgo(60),
					settlement_amount: 500,
					settlement_date: null,
					status: SettlementStatus.SETTLED,
				});
			}

			const result = await getRecoveryRateByCarrier(db, client.id, fullRange());
			expect(result.find((r) => r.party_name === 'NullDateCarrier')).toBeUndefined();
		});

		it('enforces tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client1.id });
			const claim2 = await createTestClaim(db, { client_id: client2.id });

			// 3 settled settlements for client 1 carrier
			const party1 = await createTestParty(db, {
				client_id: client1.id,
				created_by: user1.id,
				name: 'CarrierClient1',
			});
			const cp1 = await createTestClaimParty(db, {
				claim_id: claim1.id,
				party_id: party1.id,
				client_id: client1.id,
				created_by: user1.id,
			});
			const cov1 = await createTestCoverage(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				created_by: user1.id,
				loss_type: 'liability',
			});
			for (let i = 0; i < 3; i++) {
				const demand = daysAgo(60);
				const settle = new Date(demand);
				settle.setDate(settle.getDate() + 10);
				await createTestSettlement(db, {
					client_id: client1.id,
					claim_id: claim1.id,
					claim_party_id: cp1.id,
					coverage_id: cov1.id,
					created_by: user1.id,
					demand_amount: 1000,
					demand_date: demand,
					settlement_amount: 800,
					settlement_date: settle,
					status: SettlementStatus.SETTLED,
				});
			}

			// Control: client 2 also has 3 settlements
			const party2 = await createTestParty(db, {
				client_id: client2.id,
				created_by: user2.id,
				name: 'CarrierClient2',
			});
			const cp2 = await createTestClaimParty(db, {
				claim_id: claim2.id,
				party_id: party2.id,
				client_id: client2.id,
				created_by: user2.id,
			});
			const cov2 = await createTestCoverage(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				created_by: user2.id,
				loss_type: 'liability',
			});
			for (let i = 0; i < 3; i++) {
				const demand = daysAgo(60);
				const settle = new Date(demand);
				settle.setDate(settle.getDate() + 10);
				await createTestSettlement(db, {
					client_id: client2.id,
					claim_id: claim2.id,
					claim_party_id: cp2.id,
					coverage_id: cov2.id,
					created_by: user2.id,
					demand_amount: 1000,
					demand_date: demand,
					settlement_amount: 800,
					settlement_date: settle,
					status: SettlementStatus.SETTLED,
				});
			}

			const result = await getRecoveryRateByCarrier(db, client1.id, fullRange());
			expect(result.map((r) => r.party_name)).toEqual(['CarrierClient1']);
		});
	});

	// ========================================================================
	// 3. getNetRecoveryByMonth
	// ========================================================================
	describe('getNetRecoveryByMonth', () => {
		it('aggregates payments and recoveries by month within range', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});
			const coverage = await db
				.selectFrom('claim_coverage')
				.select('id')
				.where('claim_id', '=', claim.id)
				.executeTakeFirstOrThrow();

			// Pick a fixed month in the past to avoid month-boundary issues with "now"
			const baseDate = utcNoon('2024-06-15');
			const baseDate2 = utcNoon('2024-06-20');

			// Payment 1: $1000 (not expense)
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_date: baseDate,
				payment_amount: 1000,
				is_subrogable: true,
				is_expense: false,
			});
			// Payment 2: $500 expense
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_date: baseDate2,
				payment_amount: 500,
				is_subrogable: true,
				is_expense: true,
			});
			// Recovery: $300
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: baseDate2,
				recovery_amount: 300,
			});

			// Range covers June 2024
			const range: [Date, Date] = [utcNoon('2024-06-01'), utcNoon('2024-06-30')];
			const result = await getNetRecoveryByMonth(db, client.id, range);

			expect(result).toHaveLength(1);
			expect(result[0].period).toBe('2024-06');
			expect(result[0].payments_out).toBe(1000);
			expect(result[0].expenses).toBe(500);
			expect(result[0].recovery_in).toBe(300);
			// net_position = 300 - 1000 - 500 = -1200
			expect(result[0].net_position).toBe(-1200);
			// rate = 300 / (1000 + 500) * 100 = 20.0
			expect(result[0].net_recovery_rate).toBe(20);
		});

		it('excludes non-subrogable payments', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});
			const coverage = await db
				.selectFrom('claim_coverage')
				.select('id')
				.where('claim_id', '=', claim.id)
				.executeTakeFirstOrThrow();

			const date = utcNoon('2024-07-15');

			// Subrogable: $1000 (control - should be counted)
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_date: date,
				payment_amount: 1000,
				is_subrogable: true,
				is_expense: false,
			});
			// Non-subrogable: $9999 (should be excluded)
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: coverage.id,
				created_by: user.id,
				payment_date: date,
				payment_amount: 9999,
				is_subrogable: false,
				is_expense: false,
			});

			const range: [Date, Date] = [utcNoon('2024-07-01'), utcNoon('2024-07-31')];
			const result = await getNetRecoveryByMonth(db, client.id, range);
			expect(result.find((r) => r.period === '2024-07')!.payments_out).toBe(1000);
		});

		it('returns zeroed periods when range has no data', async () => {
			const client = await createTestClient(db);
			await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const range: [Date, Date] = [utcNoon('2024-01-01'), utcNoon('2024-03-31')];
			const result = await getNetRecoveryByMonth(db, client.id, range);

			// generate_series produces 3 months (Jan, Feb, Mar)
			expect(result).toHaveLength(3);
			result.forEach((r) => {
				expect(r.payments_out).toBe(0);
				expect(r.expenses).toBe(0);
				expect(r.recovery_in).toBe(0);
				expect(r.net_position).toBe(0);
				// nullif on (0 + 0) = 0 -> null, then Number(null) = 0
				expect(r.net_recovery_rate).toBe(0);
			});
		});

		it('enforces tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client1.id });
			const claim2 = await createTestClaim(db, { client_id: client2.id });
			await createSettlementChain(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				created_by: user1.id,
			});
			await createSettlementChain(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				created_by: user2.id,
			});
			const cov1 = await db
				.selectFrom('claim_coverage')
				.select('id')
				.where('claim_id', '=', claim1.id)
				.executeTakeFirstOrThrow();
			const cov2 = await db
				.selectFrom('claim_coverage')
				.select('id')
				.where('claim_id', '=', claim2.id)
				.executeTakeFirstOrThrow();

			const date = utcNoon('2024-08-15');
			await createTestPayment(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				coverage_id: cov1.id,
				created_by: user1.id,
				payment_date: date,
				payment_amount: 1000,
				is_subrogable: true,
				is_expense: false,
			});
			// Control: client2 has data
			await createTestPayment(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				coverage_id: cov2.id,
				created_by: user2.id,
				payment_date: date,
				payment_amount: 9999,
				is_subrogable: true,
				is_expense: false,
			});

			const range: [Date, Date] = [utcNoon('2024-08-01'), utcNoon('2024-08-31')];
			const result = await getNetRecoveryByMonth(db, client1.id, range);
			expect(result.find((r) => r.period === '2024-08')!.payments_out).toBe(1000);
		});
	});

	// ========================================================================
	// 4. getNetRecoveryByLineOfBusiness
	// ========================================================================
	describe('getNetRecoveryByLineOfBusiness', () => {
		it('aggregates payments and recoveries by line_of_business', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			// Claim A: line_of_business = 'auto'
			const claimA = await createTestClaim(db, { client_id: client.id });
			await db
				.updateTable('claim')
				.set({ line_of_business: 'auto' })
				.where('id', '=', claimA.id)
				.execute();
			const { settlement: settlementA } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claimA.id,
				created_by: user.id,
			});
			const covA = await db
				.selectFrom('claim_coverage')
				.select('id')
				.where('claim_id', '=', claimA.id)
				.executeTakeFirstOrThrow();
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claimA.id,
				coverage_id: covA.id,
				created_by: user.id,
				payment_date: utcNoon('2024-09-15'),
				payment_amount: 2000,
				is_subrogable: true,
				is_expense: false,
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claimA.id,
				settlement_id: settlementA.id,
				created_by: user.id,
				recovery_date: utcNoon('2024-09-20'),
				recovery_amount: 800,
			});

			// Claim B: line_of_business = 'property'
			const claimB = await createTestClaim(db, { client_id: client.id });
			await db
				.updateTable('claim')
				.set({ line_of_business: 'property' })
				.where('id', '=', claimB.id)
				.execute();
			const { settlement: settlementB } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claimB.id,
				created_by: user.id,
			});
			const covB = await db
				.selectFrom('claim_coverage')
				.select('id')
				.where('claim_id', '=', claimB.id)
				.executeTakeFirstOrThrow();
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claimB.id,
				coverage_id: covB.id,
				created_by: user.id,
				payment_date: utcNoon('2024-09-15'),
				payment_amount: 5000,
				is_subrogable: true,
				is_expense: false,
			});
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claimB.id,
				coverage_id: covB.id,
				created_by: user.id,
				payment_date: utcNoon('2024-09-15'),
				payment_amount: 1000,
				is_subrogable: true,
				is_expense: true,
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claimB.id,
				settlement_id: settlementB.id,
				created_by: user.id,
				recovery_date: utcNoon('2024-09-20'),
				recovery_amount: 3000,
			});

			const range: [Date, Date] = [utcNoon('2024-09-01'), utcNoon('2024-09-30')];
			const result = await getNetRecoveryByLineOfBusiness(db, client.id, range);

			const auto = result.find((r) => r.line_of_business === 'auto');
			const property = result.find((r) => r.line_of_business === 'property');

			expect(auto).toBeDefined();
			expect(auto!.payments_out).toBe(2000);
			expect(auto!.expenses).toBe(0);
			expect(auto!.recovery_in).toBe(800);
			expect(auto!.claim_count).toBe(1);
			// 800 / 2000 * 100 = 40.0
			expect(auto!.net_recovery_rate).toBe(40);

			expect(property).toBeDefined();
			expect(property!.payments_out).toBe(5000);
			expect(property!.expenses).toBe(1000);
			expect(property!.recovery_in).toBe(3000);
			expect(property!.claim_count).toBe(1);
			// 3000 / (5000 + 1000) * 100 = 50.0
			expect(property!.net_recovery_rate).toBe(50);
		});

		it("treats null line_of_business as 'Unclassified'", async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			// line_of_business stays null
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});
			const cov = await db
				.selectFrom('claim_coverage')
				.select('id')
				.where('claim_id', '=', claim.id)
				.executeTakeFirstOrThrow();
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: cov.id,
				created_by: user.id,
				payment_date: utcNoon('2024-10-15'),
				payment_amount: 100,
				is_subrogable: true,
				is_expense: false,
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: utcNoon('2024-10-20'),
				recovery_amount: 50,
			});

			const range: [Date, Date] = [utcNoon('2024-10-01'), utcNoon('2024-10-31')];
			const result = await getNetRecoveryByLineOfBusiness(db, client.id, range);

			const unclassified = result.find((r) => r.line_of_business === 'Unclassified');
			expect(unclassified).toBeDefined();
			expect(unclassified!.payments_out).toBe(100);
			expect(unclassified!.recovery_in).toBe(50);
		});

		it('enforces tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client1.id });
			await db.updateTable('claim').set({ line_of_business: 'auto' }).where('id', '=', claim1.id).execute();
			await createSettlementChain(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				created_by: user1.id,
			});
			const cov1 = await db
				.selectFrom('claim_coverage')
				.select('id')
				.where('claim_id', '=', claim1.id)
				.executeTakeFirstOrThrow();
			await createTestPayment(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				coverage_id: cov1.id,
				created_by: user1.id,
				payment_date: utcNoon('2024-11-15'),
				payment_amount: 1000,
				is_subrogable: true,
				is_expense: false,
			});

			// Control - client 2 data
			const claim2 = await createTestClaim(db, { client_id: client2.id });
			await db.updateTable('claim').set({ line_of_business: 'auto' }).where('id', '=', claim2.id).execute();
			await createSettlementChain(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				created_by: user2.id,
			});
			const cov2 = await db
				.selectFrom('claim_coverage')
				.select('id')
				.where('claim_id', '=', claim2.id)
				.executeTakeFirstOrThrow();
			await createTestPayment(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				coverage_id: cov2.id,
				created_by: user2.id,
				payment_date: utcNoon('2024-11-15'),
				payment_amount: 9999,
				is_subrogable: true,
				is_expense: false,
			});

			const range: [Date, Date] = [utcNoon('2024-11-01'), utcNoon('2024-11-30')];
			const result = await getNetRecoveryByLineOfBusiness(db, client1.id, range);

			// Only client1 should appear; check the auto bucket is exactly 1000
			const auto = result.find((r) => r.line_of_business === 'auto');
			expect(auto?.payments_out).toBe(1000);
		});
	});

	// ========================================================================
	// 5. getPaymentToRecoveryTimeline
	// ========================================================================
	describe('getPaymentToRecoveryTimeline', () => {
		it('computes avg/median days from first payment to first recovery, grouped by month', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			// Two claims, both first paid in March 2024, recoveries 30 and 50 days later.
			// avg = 40, median = 40
			const claimA = await createTestClaim(db, { client_id: client.id });
			const { settlement: sA } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claimA.id,
				created_by: user.id,
			});
			const covA = await db
				.selectFrom('claim_coverage')
				.select('id')
				.where('claim_id', '=', claimA.id)
				.executeTakeFirstOrThrow();
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claimA.id,
				coverage_id: covA.id,
				created_by: user.id,
				payment_date: utcNoon('2024-03-01'),
				payment_amount: 1000,
				is_subrogable: true,
				is_expense: false,
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claimA.id,
				settlement_id: sA.id,
				created_by: user.id,
				recovery_date: utcNoon('2024-03-31'),
				recovery_amount: 100,
			});

			const claimB = await createTestClaim(db, { client_id: client.id });
			const { settlement: sB } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claimB.id,
				created_by: user.id,
			});
			const covB = await db
				.selectFrom('claim_coverage')
				.select('id')
				.where('claim_id', '=', claimB.id)
				.executeTakeFirstOrThrow();
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claimB.id,
				coverage_id: covB.id,
				created_by: user.id,
				payment_date: utcNoon('2024-03-01'),
				payment_amount: 1000,
				is_subrogable: true,
				is_expense: false,
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claimB.id,
				settlement_id: sB.id,
				created_by: user.id,
				recovery_date: utcNoon('2024-04-20'),
				recovery_amount: 100,
			});

			const range: [Date, Date] = [utcNoon('2024-03-01'), utcNoon('2024-03-31')];
			const result = await getPaymentToRecoveryTimeline(db, client.id, range);

			const march = result.find((r) => r.period === '2024-03');
			expect(march).toBeDefined();
			expect(march!.claim_count).toBe(2);
			expect(march!.avg_days_to_first_recovery).toBe(40);
			expect(march!.median_days).toBe(40);
		});

		it('only counts expense=false payments for first_payment date', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });
			const { settlement } = await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
			});
			const cov = await db
				.selectFrom('claim_coverage')
				.select('id')
				.where('claim_id', '=', claim.id)
				.executeTakeFirstOrThrow();

			// Expense first (should be ignored as a "first payment")
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: cov.id,
				created_by: user.id,
				payment_date: utcNoon('2024-05-01'),
				payment_amount: 100,
				is_subrogable: true,
				is_expense: true,
			});
			// Real payment (control - this becomes the first payment)
			await createTestPayment(db, {
				client_id: client.id,
				claim_id: claim.id,
				coverage_id: cov.id,
				created_by: user.id,
				payment_date: utcNoon('2024-05-10'),
				payment_amount: 1000,
				is_subrogable: true,
				is_expense: false,
			});
			await createTestRecoveryEvent(db, {
				client_id: client.id,
				claim_id: claim.id,
				settlement_id: settlement.id,
				created_by: user.id,
				recovery_date: utcNoon('2024-05-30'),
				recovery_amount: 500,
			});

			const range: [Date, Date] = [utcNoon('2024-05-01'), utcNoon('2024-05-31')];
			const result = await getPaymentToRecoveryTimeline(db, client.id, range);
			const may = result.find((r) => r.period === '2024-05');
			expect(may).toBeDefined();
			// First payment May 10, recovery May 30 -> 20 days (NOT 29)
			expect(may!.avg_days_to_first_recovery).toBe(20);
		});

		it('returns empty when no claims have both payment and recovery', async () => {
			const client = await createTestClient(db);
			await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const range: [Date, Date] = [utcNoon('2024-01-01'), utcNoon('2024-12-31')];
			const result = await getPaymentToRecoveryTimeline(db, client.id, range);
			expect(result).toEqual([]);
		});
	});

	// ========================================================================
	// 6. getRecoveryTimeDistribution
	// ========================================================================
	describe('getRecoveryTimeDistribution', () => {
		it('buckets claims by days-to-recovery into histogram', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			// 3 claims with deltas: 15 (-> '0-30'), 45 (-> '31-60'), 200 (-> '180+')
			const deltas = [15, 45, 200];
			for (const d of deltas) {
				const claim = await createTestClaim(db, { client_id: client.id });
				const { settlement } = await createSettlementChain(db, {
					client_id: client.id,
					claim_id: claim.id,
					created_by: user.id,
				});
				const cov = await db
					.selectFrom('claim_coverage')
					.select('id')
					.where('claim_id', '=', claim.id)
					.executeTakeFirstOrThrow();
				const pay = utcNoon('2023-01-01');
				const rec = new Date(pay);
				rec.setDate(rec.getDate() + d);
				await createTestPayment(db, {
					client_id: client.id,
					claim_id: claim.id,
					coverage_id: cov.id,
					created_by: user.id,
					payment_date: pay,
					payment_amount: 1000,
					is_subrogable: true,
					is_expense: false,
				});
				await createTestRecoveryEvent(db, {
					client_id: client.id,
					claim_id: claim.id,
					settlement_id: settlement.id,
					created_by: user.id,
					recovery_date: rec,
					recovery_amount: 100,
				});
			}

			const range: [Date, Date] = [utcNoon('2022-01-01'), utcNoon('2024-12-31')];
			const result = await getRecoveryTimeDistribution(db, client.id, range);

			const b030 = result.find((r) => r.bucket === '0-30');
			const b3160 = result.find((r) => r.bucket === '31-60');
			const b180plus = result.find((r) => r.bucket === '180+');

			expect(b030?.count).toBe(1);
			expect(b030?.avg_days).toBe(15);
			expect(b3160?.count).toBe(1);
			expect(b3160?.avg_days).toBe(45);
			expect(b180plus?.count).toBe(1);
			expect(b180plus?.avg_days).toBe(200);
		});

		it('orders buckets by bucket_sort ascending', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			// Insert in non-sorted order: 200 days first, then 15
			for (const d of [200, 15]) {
				const claim = await createTestClaim(db, { client_id: client.id });
				const { settlement } = await createSettlementChain(db, {
					client_id: client.id,
					claim_id: claim.id,
					created_by: user.id,
				});
				const cov = await db
					.selectFrom('claim_coverage')
					.select('id')
					.where('claim_id', '=', claim.id)
					.executeTakeFirstOrThrow();
				const pay = utcNoon('2023-02-01');
				const rec = new Date(pay);
				rec.setDate(rec.getDate() + d);
				await createTestPayment(db, {
					client_id: client.id,
					claim_id: claim.id,
					coverage_id: cov.id,
					created_by: user.id,
					payment_date: pay,
					payment_amount: 1000,
					is_subrogable: true,
					is_expense: false,
				});
				await createTestRecoveryEvent(db, {
					client_id: client.id,
					claim_id: claim.id,
					settlement_id: settlement.id,
					created_by: user.id,
					recovery_date: rec,
					recovery_amount: 100,
				});
			}

			const range: [Date, Date] = [utcNoon('2022-01-01'), utcNoon('2024-12-31')];
			const result = await getRecoveryTimeDistribution(db, client.id, range);

			expect(result[0].bucket).toBe('0-30');
			expect(result[result.length - 1].bucket).toBe('180+');
		});
	});

	// ========================================================================
	// 7. getCoverageCapUtilization
	// ========================================================================
	describe('getCoverageCapUtilization', () => {
		it('categorizes settlements by % of policy_limit', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			// Cap-constrained: settlement >= 90% of limit. Limit 10000, settlement 9500 (95%)
			await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				policy_limit: 10000,
				demand_amount: 12000,
				demand_date: daysAgo(20),
				settlement_amount: 9500,
				settlement_date: daysAgo(10),
				status: SettlementStatus.SETTLED,
			});
			// Near cap: 70-90%. Limit 10000, settlement 8000 (80%)
			await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				policy_limit: 10000,
				demand_amount: 9000,
				demand_date: daysAgo(20),
				settlement_amount: 8000,
				settlement_date: daysAgo(10),
				status: SettlementStatus.SETTLED,
			});
			// Below cap: <70%. Limit 10000, settlement 5000 (50%)
			await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				policy_limit: 10000,
				demand_amount: 6000,
				demand_date: daysAgo(20),
				settlement_amount: 5000,
				settlement_date: daysAgo(10),
				status: SettlementStatus.SETTLED,
			});

			const result = await getCoverageCapUtilization(db, client.id, fullRange());

			const constrained = result.find((r) => r.category.startsWith('Cap Constrained'));
			const nearCap = result.find((r) => r.category.startsWith('Near Cap'));
			const belowCap = result.find((r) => r.category.startsWith('Below Cap'));

			expect(constrained?.count).toBe(1);
			expect(constrained?.total_settled).toBe(9500);
			expect(constrained?.total_demanded).toBe(12000);
			// demand 12000 - cap 10000 = 2000
			expect(constrained?.demand_exceeding_cap).toBe(2000);

			expect(nearCap?.count).toBe(1);
			expect(nearCap?.total_settled).toBe(8000);
			// demand 9000 < cap 10000 -> 0
			expect(nearCap?.demand_exceeding_cap).toBe(0);

			expect(belowCap?.count).toBe(1);
			expect(belowCap?.total_settled).toBe(5000);
			expect(belowCap?.demand_exceeding_cap).toBe(0);
		});

		it('excludes settlements where claim_party.policy_limit is null', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			// Control: with policy_limit
			await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				policy_limit: 10000,
				demand_amount: 5000,
				demand_date: daysAgo(20),
				settlement_amount: 4000,
				settlement_date: daysAgo(10),
				status: SettlementStatus.SETTLED,
			});
			// Excluded: no policy_limit
			await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				policy_limit: null,
				demand_amount: 9999,
				demand_date: daysAgo(20),
				settlement_amount: 8000,
				settlement_date: daysAgo(10),
				status: SettlementStatus.SETTLED,
			});

			const result = await getCoverageCapUtilization(db, client.id, fullRange());
			const totalCount = result.reduce((s, r) => s + r.count, 0);
			expect(totalCount).toBe(1);
		});

		it('enforces tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client1.id });
			const claim2 = await createTestClaim(db, { client_id: client2.id });

			await createSettlementChain(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				created_by: user1.id,
				policy_limit: 10000,
				demand_amount: 5000,
				demand_date: daysAgo(15),
				settlement_amount: 4000,
				settlement_date: daysAgo(5),
				status: SettlementStatus.SETTLED,
			});
			// Control: other client
			await createSettlementChain(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				created_by: user2.id,
				policy_limit: 10000,
				demand_amount: 9999,
				demand_date: daysAgo(15),
				settlement_amount: 8000,
				settlement_date: daysAgo(5),
				status: SettlementStatus.SETTLED,
			});

			const result = await getCoverageCapUtilization(db, client1.id, fullRange());
			const total = result.reduce((s, r) => s + r.total_settled, 0);
			expect(total).toBe(4000);
		});
	});

	// ========================================================================
	// 8. getCoverageCapByCarrier
	// ========================================================================
	describe('getCoverageCapByCarrier', () => {
		it('computes cap_constrained_pct per carrier (HAVING >= 2)', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			// CarrierX: 2 settlements, 1 cap-constrained -> 50%
			const partyX = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'CarrierX',
			});
			const cpX = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: partyX.id,
				client_id: client.id,
				created_by: user.id,
				policy_limit: '10000',
			});
			const covX = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				loss_type: 'liability',
			});

			// Cap-constrained: 9500 (95%)
			await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: cpX.id,
				coverage_id: covX.id,
				created_by: user.id,
				demand_amount: 11000,
				demand_date: daysAgo(20),
				settlement_amount: 9500,
				settlement_date: daysAgo(10),
				status: SettlementStatus.SETTLED,
			});
			// Not constrained: 5000 (50%)
			await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: cpX.id,
				coverage_id: covX.id,
				created_by: user.id,
				demand_amount: 6000,
				demand_date: daysAgo(20),
				settlement_amount: 5000,
				settlement_date: daysAgo(10),
				status: SettlementStatus.SETTLED,
			});

			const result = await getCoverageCapByCarrier(db, client.id, fullRange());
			const x = result.find((r) => r.party_name === 'CarrierX');

			expect(x).toBeDefined();
			expect(x!.settlement_count).toBe(2);
			expect(x!.cap_constrained_count).toBe(1);
			expect(x!.cap_constrained_pct).toBe(50);
			expect(x!.total_demanded).toBe(17000);
			expect(x!.total_settled).toBe(14500);
			// greatest(11000 - 10000, 0) = 1000; greatest(6000 - 10000, 0) = 0
			expect(x!.amount_over_cap).toBe(1000);
		});

		it('excludes carriers with fewer than 2 settlements', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			// CarrierLow: 1 settlement (excluded)
			const partyLow = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'CarrierLow',
			});
			const cpLow = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: partyLow.id,
				client_id: client.id,
				created_by: user.id,
				policy_limit: '10000',
			});
			const covLow = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				loss_type: 'liability',
			});
			await createTestSettlement(db, {
				client_id: client.id,
				claim_id: claim.id,
				claim_party_id: cpLow.id,
				coverage_id: covLow.id,
				created_by: user.id,
				demand_amount: 5000,
				demand_date: daysAgo(20),
				settlement_amount: 4000,
				settlement_date: daysAgo(10),
				status: SettlementStatus.SETTLED,
			});

			// Control: CarrierEnough with 2 settlements (included)
			const partyOk = await createTestParty(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'CarrierEnough',
			});
			const cpOk = await createTestClaimParty(db, {
				claim_id: claim.id,
				party_id: partyOk.id,
				client_id: client.id,
				created_by: user.id,
				policy_limit: '10000',
			});
			const covOk = await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				loss_type: 'liability',
			});
			for (let i = 0; i < 2; i++) {
				await createTestSettlement(db, {
					client_id: client.id,
					claim_id: claim.id,
					claim_party_id: cpOk.id,
					coverage_id: covOk.id,
					created_by: user.id,
					demand_amount: 5000,
					demand_date: daysAgo(20),
					settlement_amount: 4000,
					settlement_date: daysAgo(10),
					status: SettlementStatus.SETTLED,
				});
			}

			const result = await getCoverageCapByCarrier(db, client.id, fullRange());
			const names = result.map((r) => r.party_name);
			expect(names).toContain('CarrierEnough');
			expect(names).not.toContain('CarrierLow');
		});
	});

	// ========================================================================
	// 9. getVarianceDecomposition
	// ========================================================================
	describe('getVarianceDecomposition', () => {
		it('computes variance per recovery_status (expected - actual, clamped to 0)', async () => {
			const client = await createTestClient(db);
			await createTestUser(db, { client_id: client.id, role: 'Admin' });

			// pending: expected 1000, actual 200 -> variance 800
			await createTestClaimWithCreatedAt(db, {
				client_id: client.id,
				expected_recovery: 1000,
				actual_recovery: 200,
				recovery_status: 'pending',
			});
			// in_progress: expected 5000, actual 3000 -> variance 2000 (combined w/ next)
			await createTestClaimWithCreatedAt(db, {
				client_id: client.id,
				expected_recovery: 5000,
				actual_recovery: 3000,
				recovery_status: 'in_progress',
			});
			// in_progress: expected 2000, actual 500 -> variance 1500. Total in_progress = 3500
			await createTestClaimWithCreatedAt(db, {
				client_id: client.id,
				expected_recovery: 2000,
				actual_recovery: 500,
				recovery_status: 'in_progress',
			});
			// recovered: expected 1000, actual 1500 -> max(1000-1500, 0) = 0
			await createTestClaimWithCreatedAt(db, {
				client_id: client.id,
				expected_recovery: 1000,
				actual_recovery: 1500,
				recovery_status: 'recovered',
			});
			// closed_no_recovery: expected 800, actual 0 -> 800
			await createTestClaimWithCreatedAt(db, {
				client_id: client.id,
				expected_recovery: 800,
				actual_recovery: 0,
				recovery_status: 'closed_no_recovery',
			});

			const result = await getVarianceDecomposition(db, client.id, fullRange());

			expect(result).toHaveLength(4);

			const closedNoRecovery = result.find((r) => r.name === 'Closed - No Recovery');
			const pending = result.find((r) => r.name === 'Pending - Not Started');
			const inProgress = result.find((r) => r.name === 'In Progress - Outstanding');
			const recovered = result.find((r) => r.name === 'Recovered - Shortfall');

			expect(closedNoRecovery?.value).toBe(800);
			expect(closedNoRecovery?.count).toBe(1);
			expect(pending?.value).toBe(800);
			expect(pending?.count).toBe(1);
			expect(inProgress?.value).toBe(3500);
			expect(inProgress?.count).toBe(2);
			expect(recovered?.value).toBe(0);
			expect(recovered?.count).toBe(1);
		});

		it('excludes claims with null expected_recovery or expected_recovery <= 0', async () => {
			const client = await createTestClient(db);
			await createTestUser(db, { client_id: client.id, role: 'Admin' });

			// Control - included
			await createTestClaimWithCreatedAt(db, {
				client_id: client.id,
				expected_recovery: 500,
				actual_recovery: 0,
				recovery_status: 'pending',
			});
			// Excluded: null expected
			await createTestClaimWithCreatedAt(db, {
				client_id: client.id,
				expected_recovery: null,
				actual_recovery: 0,
				recovery_status: 'pending',
			});
			// Excluded: zero expected
			await createTestClaimWithCreatedAt(db, {
				client_id: client.id,
				expected_recovery: 0,
				actual_recovery: 0,
				recovery_status: 'pending',
			});

			const result = await getVarianceDecomposition(db, client.id, fullRange());
			const pending = result.find((r) => r.name === 'Pending - Not Started');
			expect(pending?.count).toBe(1);
			expect(pending?.value).toBe(500);
		});

		it('returns zero values for all statuses when no data exists', async () => {
			const client = await createTestClient(db);

			const result = await getVarianceDecomposition(db, client.id, fullRange());
			expect(result).toHaveLength(4);
			result.forEach((r) => {
				expect(r.value).toBe(0);
				expect(r.count).toBe(0);
			});
		});

		it('enforces tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);

			await createTestClaimWithCreatedAt(db, {
				client_id: client1.id,
				expected_recovery: 100,
				actual_recovery: 0,
				recovery_status: 'pending',
			});
			// Control: client2 has data the query should NOT see
			await createTestClaimWithCreatedAt(db, {
				client_id: client2.id,
				expected_recovery: 9999,
				actual_recovery: 0,
				recovery_status: 'pending',
			});

			const result = await getVarianceDecomposition(db, client1.id, fullRange());
			const pending = result.find((r) => r.name === 'Pending - Not Started');
			expect(pending?.value).toBe(100);
			expect(pending?.count).toBe(1);
		});
	});

	// ========================================================================
	// 10. getSettlementFunnel
	// ========================================================================
	describe('getSettlementFunnel', () => {
		it('aggregates count and totals per substatus (stage)', async () => {
			const client = await createTestClient(db);

			await createTestClaimWithCreatedAt(db, {
				client_id: client.id,
				substatus: 'investigation',
				expected_recovery: 1000,
				actual_recovery: 0,
				total_incurred: 100,
			});
			await createTestClaimWithCreatedAt(db, {
				client_id: client.id,
				substatus: 'investigation',
				expected_recovery: 2000,
				actual_recovery: 500,
				total_incurred: 200,
			});
			await createTestClaimWithCreatedAt(db, {
				client_id: client.id,
				substatus: 'demand_sent',
				expected_recovery: 3000,
				actual_recovery: 1000,
				total_incurred: 300,
			});

			const result = await getSettlementFunnel(db, client.id, fullRange());

			const investigation = result.find((r) => r.stage === 'investigation');
			const demandSent = result.find((r) => r.stage === 'demand_sent');

			expect(investigation?.count).toBe(2);
			expect(investigation?.total_expected).toBe(3000);
			expect(investigation?.total_actual).toBe(500);
			expect(investigation?.total_incurred).toBe(300);
			expect(demandSent?.count).toBe(1);
			expect(demandSent?.total_expected).toBe(3000);
		});

		it('excludes claims with null substatus', async () => {
			const client = await createTestClient(db);

			// Control
			await createTestClaimWithCreatedAt(db, {
				client_id: client.id,
				substatus: 'investigation',
				expected_recovery: 100,
			});
			// Excluded
			await createTestClaimWithCreatedAt(db, { client_id: client.id, substatus: null });

			const result = await getSettlementFunnel(db, client.id, fullRange());
			const totalCount = result.reduce((s, r) => s + r.count, 0);
			expect(totalCount).toBe(1);
			expect(result[0].stage).toBe('investigation');
		});

		it('orders results in funnel stage order', async () => {
			const client = await createTestClient(db);

			// Insert in reverse order
			await createTestClaimWithCreatedAt(db, { client_id: client.id, substatus: 'litigation', expected_recovery: 1 });
			await createTestClaimWithCreatedAt(db, { client_id: client.id, substatus: 'investigation', expected_recovery: 1 });
			await createTestClaimWithCreatedAt(db, { client_id: client.id, substatus: 'demand_sent', expected_recovery: 1 });

			const result = await getSettlementFunnel(db, client.id, fullRange());
			expect(result.map((r) => r.stage)).toEqual(['investigation', 'demand_sent', 'litigation']);
		});

		it('enforces tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);

			await createTestClaimWithCreatedAt(db, {
				client_id: client1.id,
				substatus: 'investigation',
				expected_recovery: 100,
			});
			// Control
			await createTestClaimWithCreatedAt(db, {
				client_id: client2.id,
				substatus: 'investigation',
				expected_recovery: 9999,
			});

			const result = await getSettlementFunnel(db, client1.id, fullRange());
			const inv = result.find((r) => r.stage === 'investigation');
			expect(inv?.total_expected).toBe(100);
		});
	});

	// ========================================================================
	// 11. getNegotiationEfficiencyScatter
	// ========================================================================
	describe('getNegotiationEfficiencyScatter', () => {
		it('returns settlement-level scatter points with recovery_pct and days_to_settle', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id, claim_number: 'CLM-SCAT-1' });

			// Demand 10000, settled 8000 -> recovery_pct = 80, days = 30
			await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				party_name: 'CarrierScat1',
				policy_limit: 20000,
				demand_amount: 10000,
				demand_date: daysAgo(40),
				settlement_amount: 8000,
				settlement_date: daysAgo(10),
				status: SettlementStatus.SETTLED,
			});

			const result = await getNegotiationEfficiencyScatter(db, client.id, fullRange());

			expect(result).toHaveLength(1);
			expect(result[0].claim_number).toBe('CLM-SCAT-1');
			expect(result[0].party_name).toBe('CarrierScat1');
			expect(result[0].demand).toBe(10000);
			expect(result[0].settled).toBe(8000);
			expect(result[0].recovery_pct).toBe(80);
			expect(result[0].days_to_settle).toBe(30);
			expect(result[0].cap_constrained).toBe(false);
		});

		it('flags cap_constrained=true when settlement_amount >= 90% of policy_limit', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			// Settlement 9500, limit 10000 -> 95% -> cap constrained
			await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				policy_limit: 10000,
				demand_amount: 12000,
				demand_date: daysAgo(20),
				settlement_amount: 9500,
				settlement_date: daysAgo(10),
				status: SettlementStatus.SETTLED,
			});

			const result = await getNegotiationEfficiencyScatter(db, client.id, fullRange());
			expect(result).toHaveLength(1);
			expect(result[0].cap_constrained).toBe(true);
		});

		it('excludes settlements where settlement_date < demand_date', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });
			const claim = await createTestClaim(db, { client_id: client.id });

			// Control: valid (settle after demand)
			await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				party_name: 'ValidCarrier',
				demand_amount: 5000,
				demand_date: daysAgo(30),
				settlement_amount: 4000,
				settlement_date: daysAgo(10),
				status: SettlementStatus.SETTLED,
			});
			// Invalid: settlement before demand (demand 10 days ago, settlement 30 days ago)
			await createSettlementChain(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				party_name: 'InvalidCarrier',
				demand_amount: 5000,
				demand_date: daysAgo(10),
				settlement_amount: 9999,
				settlement_date: daysAgo(30),
				status: SettlementStatus.SETTLED,
			});

			const result = await getNegotiationEfficiencyScatter(db, client.id, fullRange());
			const partyNames = result.map((r) => r.party_name);
			expect(partyNames).toContain('ValidCarrier');
			expect(partyNames).not.toContain('InvalidCarrier');
		});

		it('enforces tenant isolation', async () => {
			const client1 = await createTestClient(db);
			const client2 = await createTestClient(db);
			const user1 = await createTestUser(db, { client_id: client1.id, role: 'Admin' });
			const user2 = await createTestUser(db, { client_id: client2.id, role: 'Admin' });
			const claim1 = await createTestClaim(db, { client_id: client1.id, claim_number: 'CLM-T1' });
			const claim2 = await createTestClaim(db, { client_id: client2.id, claim_number: 'CLM-T2' });

			await createSettlementChain(db, {
				client_id: client1.id,
				claim_id: claim1.id,
				created_by: user1.id,
				demand_amount: 1000,
				demand_date: daysAgo(20),
				settlement_amount: 900,
				settlement_date: daysAgo(10),
				status: SettlementStatus.SETTLED,
			});
			// Control
			await createSettlementChain(db, {
				client_id: client2.id,
				claim_id: claim2.id,
				created_by: user2.id,
				demand_amount: 1000,
				demand_date: daysAgo(20),
				settlement_amount: 900,
				settlement_date: daysAgo(10),
				status: SettlementStatus.SETTLED,
			});

			const result = await getNegotiationEfficiencyScatter(db, client1.id, fullRange());
			expect(result).toHaveLength(1);
			expect(result[0].claim_number).toBe('CLM-T1');
		});
	});

	// ========================================================================
	// 12. getStatuteDeadlineRisk
	// ========================================================================
	describe('getStatuteDeadlineRisk', () => {
		it('returns coverage rows with days_remaining and urgency, ordered ascending', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			// Critical (10 days from now)
			const claimCritical = await createTestClaim(db, {
				client_id: client.id,
				claim_number: 'CLM-CRIT',
				expected_recovery: 1000,
				actual_recovery: 0,
				recovery_status: 'in_progress',
			});
			const futureCritical = new Date();
			futureCritical.setDate(futureCritical.getDate() + 10);
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claimCritical.id,
				created_by: user.id,
				loss_type: 'liability',
				subro_applicable: true,
				statute_date: futureCritical,
				statute_preserved: false,
			});

			// Warning (60 days from now)
			const claimWarning = await createTestClaim(db, {
				client_id: client.id,
				claim_number: 'CLM-WARN',
				expected_recovery: 2000,
				actual_recovery: 0,
				recovery_status: 'pending',
			});
			const futureWarning = new Date();
			futureWarning.setDate(futureWarning.getDate() + 60);
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claimWarning.id,
				created_by: user.id,
				loss_type: 'liability',
				subro_applicable: true,
				statute_date: futureWarning,
				statute_preserved: false,
			});

			// Ok (200 days from now)
			const claimOk = await createTestClaim(db, {
				client_id: client.id,
				claim_number: 'CLM-OK',
				expected_recovery: 3000,
				actual_recovery: 0,
				recovery_status: 'in_progress',
			});
			const futureOk = new Date();
			futureOk.setDate(futureOk.getDate() + 200);
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claimOk.id,
				created_by: user.id,
				loss_type: 'liability',
				subro_applicable: true,
				statute_date: futureOk,
				statute_preserved: false,
			});

			// Range covers all the future statutes
			const farFuture = new Date();
			farFuture.setFullYear(farFuture.getFullYear() + 2);
			const result = await getStatuteDeadlineRisk(db, client.id, [new Date(), farFuture]);

			expect(result).toHaveLength(3);
			// Ordered ascending by days_remaining
			expect(result[0].claim_number).toBe('CLM-CRIT');
			expect(result[0].urgency).toBe('critical');
			expect(result[1].claim_number).toBe('CLM-WARN');
			expect(result[1].urgency).toBe('warning');
			expect(result[2].claim_number).toBe('CLM-OK');
			expect(result[2].urgency).toBe('ok');
		});

		it('excludes coverages where statute_preserved=true', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const future = new Date();
			future.setDate(future.getDate() + 10);

			// Control: not preserved
			const claimA = await createTestClaim(db, {
				client_id: client.id,
				claim_number: 'CLM-NOT-PRESERVED',
				recovery_status: 'in_progress',
			});
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claimA.id,
				created_by: user.id,
				loss_type: 'liability',
				subro_applicable: true,
				statute_date: future,
				statute_preserved: false,
			});

			// Excluded: preserved
			const claimB = await createTestClaim(db, {
				client_id: client.id,
				claim_number: 'CLM-PRESERVED',
				recovery_status: 'in_progress',
			});
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claimB.id,
				created_by: user.id,
				loss_type: 'liability',
				subro_applicable: true,
				statute_date: future,
				statute_preserved: true,
			});

			const farFuture = new Date();
			farFuture.setFullYear(farFuture.getFullYear() + 2);
			const result = await getStatuteDeadlineRisk(db, client.id, [new Date(), farFuture]);
			const numbers = result.map((r) => r.claim_number);
			expect(numbers).toContain('CLM-NOT-PRESERVED');
			expect(numbers).not.toContain('CLM-PRESERVED');
		});

		it('excludes coverages where subro_applicable=false', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const future = new Date();
			future.setDate(future.getDate() + 10);

			// Control
			const claimA = await createTestClaim(db, {
				client_id: client.id,
				claim_number: 'CLM-SUBRO',
				recovery_status: 'in_progress',
			});
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claimA.id,
				created_by: user.id,
				loss_type: 'liability',
				subro_applicable: true,
				statute_date: future,
				statute_preserved: false,
			});

			// Excluded
			const claimB = await createTestClaim(db, {
				client_id: client.id,
				claim_number: 'CLM-NO-SUBRO',
				recovery_status: 'in_progress',
			});
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claimB.id,
				created_by: user.id,
				loss_type: 'liability',
				subro_applicable: false,
				statute_date: future,
				statute_preserved: false,
			});

			const farFuture = new Date();
			farFuture.setFullYear(farFuture.getFullYear() + 2);
			const result = await getStatuteDeadlineRisk(db, client.id, [new Date(), farFuture]);
			const numbers = result.map((r) => r.claim_number);
			expect(numbers).toContain('CLM-SUBRO');
			expect(numbers).not.toContain('CLM-NO-SUBRO');
		});

		it('only returns claims with recovery_status of pending or in_progress', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, role: 'Admin' });

			const future = new Date();
			future.setDate(future.getDate() + 30);

			// Control: in_progress (included)
			const claimIn = await createTestClaim(db, {
				client_id: client.id,
				claim_number: 'CLM-IN',
				recovery_status: 'in_progress',
			});
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claimIn.id,
				created_by: user.id,
				loss_type: 'liability',
				subro_applicable: true,
				statute_date: future,
				statute_preserved: false,
			});

			// Excluded: recovered
			const claimRec = await createTestClaim(db, {
				client_id: client.id,
				claim_number: 'CLM-REC',
				recovery_status: 'recovered',
			});
			await createTestCoverage(db, {
				client_id: client.id,
				claim_id: claimRec.id,
				created_by: user.id,
				loss_type: 'liability',
				subro_applicable: true,
				statute_date: future,
				statute_preserved: false,
			});

			const farFuture = new Date();
			farFuture.setFullYear(farFuture.getFullYear() + 2);
			const result = await getStatuteDeadlineRisk(db, client.id, [new Date(), farFuture]);
			const numbers = result.map((r) => r.claim_number);
			expect(numbers).toContain('CLM-IN');
			expect(numbers).not.toContain('CLM-REC');
		});
	});
});
