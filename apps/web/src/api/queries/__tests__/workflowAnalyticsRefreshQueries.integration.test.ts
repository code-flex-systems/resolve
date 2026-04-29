/**
 * Integration tests for workflowAnalyticsRefreshQueries
 *
 * Tests cover:
 * - refreshDailyWorkflowSnapshot: aggregation correctness, SLA breach math,
 *   exclusions (recovered claims, inactive desks), idempotency, snapshot-boundary
 *   time math, location-specific vs global SLA fallback, tenant isolation
 * - getMissingSnapshotDates: identifies dates without snapshots
 * - backfillWorkflowSnapshots: end-to-end loop over missing dates
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { DB } from '@/api/database/types';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestDeskLocationType,
	createTestDeskLocation,
} from '@/__tests__/integration/fixtures';
import {
	refreshDailyWorkflowSnapshot,
	getMissingSnapshotDates,
	backfillWorkflowSnapshots,
} from '../workflowAnalyticsRefreshQueries';
import { WorkflowThresholdType, RecoveryStatus } from '@/config/enums';

// ============================================================================
// HELPERS
// ============================================================================

async function createWorkflowDefinition(
	db: Kysely<DB>,
	params: {
		client_id: string;
		created_by: string;
		name?: string;
		desk_location_id?: string | null;
		is_active?: boolean;
		deleted_at?: Date | null;
	}
) {
	return db
		.insertInto('workflow_definition')
		.values({
			client_id: params.client_id,
			name: params.name || `Test Workflow ${Date.now()}-${Math.random()}`,
			desk_location_id: params.desk_location_id ?? null,
			is_active: params.is_active ?? true,
			created_by: params.created_by,
			deleted_at: params.deleted_at ?? null,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

async function createWorkflowThreshold(
	db: Kysely<DB>,
	params: {
		client_id: string;
		workflow_definition_id: string;
		threshold_type: string;
		threshold_value: number;
		is_active?: boolean;
	}
) {
	return db
		.insertInto('workflow_threshold')
		.values({
			client_id: params.client_id,
			workflow_definition_id: params.workflow_definition_id,
			threshold_type: params.threshold_type,
			threshold_value: params.threshold_value,
			is_active: params.is_active ?? true,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

async function createClaimTransition(
	db: Kysely<DB>,
	params: {
		client_id: string;
		claim_id: string;
		desk_location_id: string;
		entered_at: Date;
	}
) {
	return db
		.insertInto('claim_desk_location_transition')
		.values({
			client_id: params.client_id,
			claim_id: params.claim_id,
			desk_location_id: params.desk_location_id,
			entered_at: params.entered_at,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/** Read snapshot rows for a client + date directly from analytics schema. */
async function readSnapshots(
	db: Kysely<DB>,
	clientId: string,
	snapshotDate: string
) {
	const result = await sql<{
		desk_location_id: string;
		claims_count: string;
		avg_hours_in_stage: string | null;
		median_hours_in_stage: string | null;
		claims_breaching_sla: string;
	}>`
		SELECT desk_location_id, claims_count, avg_hours_in_stage, median_hours_in_stage, claims_breaching_sla
		FROM analytics.daily_workflow_stage_snapshot
		WHERE client_id = ${clientId} AND snapshot_date = ${snapshotDate}::date
		ORDER BY desk_location_id
	`.execute(db);
	return result.rows;
}

/**
 * Build a Date that is `hours` hours before the snapshot boundary
 * (snapshotDate::date + interval '1 day'), as Postgres computes it. This
 * forces entered_at to be computed in the server's timezone, so the function
 * under test will report exactly `hours` for hours_in_stage regardless of
 * whether the connection is in UTC or another timezone.
 */
async function hoursBeforeEndOf(
	db: Kysely<DB>,
	snapshotDate: string,
	hours: number
): Promise<Date> {
	const result = await sql<{ boundary: Date }>`
		SELECT (${snapshotDate}::date + interval '1 day')::timestamptz AS boundary
	`.execute(db);
	const boundary = result.rows[0].boundary;
	return new Date(boundary.getTime() - hours * 60 * 60 * 1000);
}

/**
 * Compute YYYY-MM-DD for (CURRENT_DATE - N days) using Postgres so the date
 * matches what the function under test will produce.
 */
async function pgDateMinusDays(db: Kysely<DB>, days: number): Promise<string> {
	const result = await sql<{ d: Date }>`
		SELECT (CURRENT_DATE - ${sql.lit(days)} * interval '1 day')::date AS d
	`.execute(db);
	return result.rows[0].d.toISOString().split('T')[0];
}

/** Build a timestamp at noon (server tz) for a given YYYY-MM-DD date. */
async function pgNoonOn(db: Kysely<DB>, dateStr: string): Promise<Date> {
	const result = await sql<{ ts: Date }>`
		SELECT (${dateStr}::date + interval '12 hours')::timestamptz AS ts
	`.execute(db);
	return result.rows[0].ts;
}

describe('workflowAnalyticsRefreshQueries integration tests', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// ============================================================================
	// refreshDailyWorkflowSnapshot
	// ============================================================================

	describe('refreshDailyWorkflowSnapshot', () => {
		it('aggregates claims_count, avg/median hours, and SLA breach count per desk', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// SLA threshold = 24 hours
			const wf = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
			});
			await createWorkflowThreshold(db, {
				client_id: client.id,
				workflow_definition_id: wf.id,
				threshold_type: WorkflowThresholdType.LOCATION_AGE,
				threshold_value: 24,
			});

			const snapshotDate = '2026-04-15';
			// 3 claims at desk: 10h, 30h, 50h in stage (relative to end of snapshotDate)
			// SLA = 24h → 2 claims breach (30h, 50h)
			const hoursList = [10, 30, 50];
			for (const hours of hoursList) {
				const claim = await createTestClaim(db, {
					client_id: client.id,
					created_by: user.id,
					desk_location_id: desk.id,
					recovery_status: RecoveryStatus.PENDING,
				});
				await createClaimTransition(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: desk.id,
					entered_at: await hoursBeforeEndOf(db, snapshotDate, hours),
				});
			}

			await refreshDailyWorkflowSnapshot(ctx, snapshotDate);

			const rows = await readSnapshots(db, client.id, snapshotDate);
			expect(rows).toHaveLength(1);
			expect(rows[0].desk_location_id).toBe(desk.id);
			expect(Number(rows[0].claims_count)).toBe(3);
			// avg(10,30,50) = 30, median = 30
			expect(Number(rows[0].avg_hours_in_stage)).toBe(30);
			expect(Number(rows[0].median_hours_in_stage)).toBe(30);
			// 30h and 50h exceed 24h SLA
			expect(Number(rows[0].claims_breaching_sla)).toBe(2);
		});

		it('reports zero SLA breaches when no LOCATION_AGE threshold is configured', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Workflow exists but no LOCATION_AGE threshold
			await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
			});

			const snapshotDate = '2026-04-15';
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.PENDING,
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				entered_at: await hoursBeforeEndOf(db, snapshotDate, 1000),
			});

			await refreshDailyWorkflowSnapshot(ctx, snapshotDate);

			const rows = await readSnapshots(db, client.id, snapshotDate);
			expect(rows).toHaveLength(1);
			expect(Number(rows[0].claims_count)).toBe(1);
			// No SLA threshold → no breach reported even though claim has been in stage 1000h
			expect(Number(rows[0].claims_breaching_sla)).toBe(0);
		});

		it('falls back to global workflow threshold when no location-specific workflow exists', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Global workflow (no desk_location_id) with 12h SLA
			const globalWf = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: null,
			});
			await createWorkflowThreshold(db, {
				client_id: client.id,
				workflow_definition_id: globalWf.id,
				threshold_type: WorkflowThresholdType.LOCATION_AGE,
				threshold_value: 12,
			});

			const snapshotDate = '2026-04-15';
			// Claim has been in stage 20h → exceeds global 12h SLA
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.PENDING,
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				entered_at: await hoursBeforeEndOf(db, snapshotDate, 20),
			});

			await refreshDailyWorkflowSnapshot(ctx, snapshotDate);

			const rows = await readSnapshots(db, client.id, snapshotDate);
			expect(rows).toHaveLength(1);
			expect(Number(rows[0].claims_breaching_sla)).toBe(1);
		});

		it('prefers location-specific SLA over global when both exist', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Global SLA = 5h (would be breached)
			const globalWf = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: null,
			});
			await createWorkflowThreshold(db, {
				client_id: client.id,
				workflow_definition_id: globalWf.id,
				threshold_type: WorkflowThresholdType.LOCATION_AGE,
				threshold_value: 5,
			});
			// Location-specific SLA = 100h (NOT breached) — should win
			const specificWf = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
			});
			await createWorkflowThreshold(db, {
				client_id: client.id,
				workflow_definition_id: specificWf.id,
				threshold_type: WorkflowThresholdType.LOCATION_AGE,
				threshold_value: 100,
			});

			const snapshotDate = '2026-04-15';
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.PENDING,
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				entered_at: await hoursBeforeEndOf(db, snapshotDate, 20),
			});

			await refreshDailyWorkflowSnapshot(ctx, snapshotDate);

			const rows = await readSnapshots(db, client.id, snapshotDate);
			// 20h claim is under location SLA (100h), so 0 breaches (not 1 as the global 5h would imply)
			expect(Number(rows[0].claims_breaching_sla)).toBe(0);
		});

		it('excludes recovered and closed_no_recovery claims', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const snapshotDate = '2026-04-15';

			// Control: 1 pending claim (should be counted)
			const pending = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.PENDING,
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: pending.id,
				desk_location_id: desk.id,
				entered_at: await hoursBeforeEndOf(db, snapshotDate, 10),
			});

			// Excluded: recovered
			const recovered = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.RECOVERED,
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: recovered.id,
				desk_location_id: desk.id,
				entered_at: await hoursBeforeEndOf(db, snapshotDate, 10),
			});

			// Excluded: closed_no_recovery
			const closed = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.CLOSED_NO_RECOVERY,
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: closed.id,
				desk_location_id: desk.id,
				entered_at: await hoursBeforeEndOf(db, snapshotDate, 10),
			});

			await refreshDailyWorkflowSnapshot(ctx, snapshotDate);

			const rows = await readSnapshots(db, client.id, snapshotDate);
			expect(rows).toHaveLength(1);
			expect(Number(rows[0].claims_count)).toBe(1);
		});

		it('reports zero SLA breaches for inactive and soft-deleted desks (excluded from SLA lookup)', async () => {
			// NOTE: The function inserts snapshot rows for ALL desks with active claims,
			// regardless of desk active/deleted status. Active/non-deleted filtering only
			// applies to the SLA lookup (location_sla CTE), so inactive/deleted desks
			// always have claims_breaching_sla = 0 even when their claims would otherwise
			// breach the SLA. This test pins down that behavior so a future change is
			// surfaced explicitly.
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// All 3 desks get a workflow + 5h SLA.
			const setupDesk = async (
				name: string,
				isActive: boolean,
				deletedAt: Date | null
			) => {
				const desk = await createTestDeskLocation(db, {
					client_id: client.id,
					desk_location_type_id: deskType.id,
					is_active: isActive,
					name,
				});
				if (deletedAt) {
					await db
						.updateTable('desk_location')
						.set({ deleted_at: deletedAt })
						.where('id', '=', desk.id)
						.execute();
				}
				const wf = await createWorkflowDefinition(db, {
					client_id: client.id,
					created_by: user.id,
					desk_location_id: desk.id,
				});
				await createWorkflowThreshold(db, {
					client_id: client.id,
					workflow_definition_id: wf.id,
					threshold_type: WorkflowThresholdType.LOCATION_AGE,
					threshold_value: 5,
				});
				return desk;
			};

			const activeDesk = await setupDesk('Active Desk', true, null);
			const inactiveDesk = await setupDesk('Inactive Desk', false, null);
			const deletedDesk = await setupDesk('Deleted Desk', true, new Date());

			const snapshotDate = '2026-04-15';

			// One claim at each desk, in stage 50h (would breach 5h SLA if SLA applied)
			for (const desk of [activeDesk, inactiveDesk, deletedDesk]) {
				const claim = await createTestClaim(db, {
					client_id: client.id,
					created_by: user.id,
					desk_location_id: desk.id,
					recovery_status: RecoveryStatus.PENDING,
				});
				await createClaimTransition(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: desk.id,
					entered_at: await hoursBeforeEndOf(db, snapshotDate, 50),
				});
			}

			await refreshDailyWorkflowSnapshot(ctx, snapshotDate);

			const rows = await readSnapshots(db, client.id, snapshotDate);
			// Snapshot rows are produced for all 3 desks
			expect(rows).toHaveLength(3);

			const activeRow = rows.find((r) => r.desk_location_id === activeDesk.id);
			const inactiveRow = rows.find((r) => r.desk_location_id === inactiveDesk.id);
			const deletedRow = rows.find((r) => r.desk_location_id === deletedDesk.id);

			// Active desk: SLA lookup hits → 50h > 5h → 1 breach
			expect(Number(activeRow!.claims_breaching_sla)).toBe(1);
			// Inactive desk: SLA lookup excludes → 0 breaches reported despite 50h in stage
			expect(Number(inactiveRow!.claims_breaching_sla)).toBe(0);
			// Deleted desk: SLA lookup excludes → 0 breaches reported despite 50h in stage
			expect(Number(deletedRow!.claims_breaching_sla)).toBe(0);
		});

		it('uses snapshot boundary (end of day) instead of NOW for time-in-stage', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Run a snapshot for a date 30 days ago. If the function used NOW(),
			// the hours_in_stage would be ~720+ regardless of entered_at. Using the
			// snapshot boundary, hours_in_stage should reflect entered_at relative
			// to that historical date.
			const historicalDate = '2025-12-01';
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.PENDING,
			});
			// Entered the desk 5h before end-of-day on the historical date
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				entered_at: await hoursBeforeEndOf(db, historicalDate, 5),
			});

			await refreshDailyWorkflowSnapshot(ctx, historicalDate);

			const rows = await readSnapshots(db, client.id, historicalDate);
			expect(rows).toHaveLength(1);
			// Should be ~5h, not ~thousands of hours (NOW() would inflate this)
			const avgHours = Number(rows[0].avg_hours_in_stage);
			expect(avgHours).toBeGreaterThan(4.9);
			expect(avgHours).toBeLessThan(5.1);
		});

		it('is idempotent: re-running for same date updates instead of inserting duplicates', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const snapshotDate = '2026-04-15';

			// First run: 1 claim in stage for 10h
			const claim1 = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.PENDING,
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: claim1.id,
				desk_location_id: desk.id,
				entered_at: await hoursBeforeEndOf(db, snapshotDate, 10),
			});

			await refreshDailyWorkflowSnapshot(ctx, snapshotDate);
			const firstRows = await readSnapshots(db, client.id, snapshotDate);
			expect(firstRows).toHaveLength(1);
			expect(Number(firstRows[0].claims_count)).toBe(1);

			// Add a second claim
			const claim2 = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.PENDING,
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: claim2.id,
				desk_location_id: desk.id,
				entered_at: await hoursBeforeEndOf(db, snapshotDate, 30),
			});

			// Re-run the same date
			await refreshDailyWorkflowSnapshot(ctx, snapshotDate);
			const secondRows = await readSnapshots(db, client.id, snapshotDate);
			// Still one row (UPSERT, not insert) but with updated values
			expect(secondRows).toHaveLength(1);
			expect(Number(secondRows[0].claims_count)).toBe(2);
			expect(Number(secondRows[0].avg_hours_in_stage)).toBe(20); // (10+30)/2
		});

		it('uses most recent transition when a claim has multiple desk transitions', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const snapshotDate = '2026-04-15';
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.PENDING,
			});
			// Older transition (50h ago)
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				entered_at: await hoursBeforeEndOf(db, snapshotDate, 50),
			});
			// More recent transition (10h ago) — this is the one that should be used
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				entered_at: await hoursBeforeEndOf(db, snapshotDate, 10),
			});

			await refreshDailyWorkflowSnapshot(ctx, snapshotDate);

			const rows = await readSnapshots(db, client.id, snapshotDate);
			expect(rows).toHaveLength(1);
			// Should use the 10h transition, not the 50h one
			expect(Number(rows[0].avg_hours_in_stage)).toBeGreaterThan(9.9);
			expect(Number(rows[0].avg_hours_in_stage)).toBeLessThan(10.1);
		});

		it('enforces tenant isolation', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const deskTypeA = await createTestDeskLocationType(db, { client_id: clientA.id });
			const deskA = await createTestDeskLocation(db, {
				client_id: clientA.id,
				desk_location_type_id: deskTypeA.id,
			});
			const deskTypeB = await createTestDeskLocationType(db, { client_id: clientB.id });
			const deskB = await createTestDeskLocation(db, {
				client_id: clientB.id,
				desk_location_type_id: deskTypeB.id,
			});

			const snapshotDate = '2026-04-15';

			// Each client has 1 claim at their own desk
			const claimA = await createTestClaim(db, {
				client_id: clientA.id,
				created_by: userA.id,
				desk_location_id: deskA.id,
				recovery_status: RecoveryStatus.PENDING,
			});
			await createClaimTransition(db, {
				client_id: clientA.id,
				claim_id: claimA.id,
				desk_location_id: deskA.id,
				entered_at: await hoursBeforeEndOf(db, snapshotDate, 10),
			});
			const claimB = await createTestClaim(db, {
				client_id: clientB.id,
				created_by: userB.id,
				desk_location_id: deskB.id,
				recovery_status: RecoveryStatus.PENDING,
			});
			await createClaimTransition(db, {
				client_id: clientB.id,
				claim_id: claimB.id,
				desk_location_id: deskB.id,
				entered_at: await hoursBeforeEndOf(db, snapshotDate, 30),
			});

			// Run snapshot only for client A
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'Admin',
			});
			await refreshDailyWorkflowSnapshot(ctxA, snapshotDate);

			const aRows = await readSnapshots(db, clientA.id, snapshotDate);
			const bRows = await readSnapshots(db, clientB.id, snapshotDate);

			// Client A has a snapshot, client B does not (we never ran for them)
			expect(aRows).toHaveLength(1);
			expect(aRows[0].desk_location_id).toBe(deskA.id);
			expect(Number(aRows[0].claims_count)).toBe(1);
			expect(bRows).toHaveLength(0);
		});

		it('produces one snapshot row per desk with correctly partitioned aggregates', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk1 = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Desk 1',
			});
			const desk2 = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Desk 2',
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const snapshotDate = '2026-04-15';

			// Desk 1: 2 claims (10h, 20h) — avg = 15
			for (const hours of [10, 20]) {
				const claim = await createTestClaim(db, {
					client_id: client.id,
					created_by: user.id,
					desk_location_id: desk1.id,
					recovery_status: RecoveryStatus.PENDING,
				});
				await createClaimTransition(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: desk1.id,
					entered_at: await hoursBeforeEndOf(db, snapshotDate, hours),
				});
			}

			// Desk 2: 3 claims (40h, 60h, 80h) — avg = 60
			for (const hours of [40, 60, 80]) {
				const claim = await createTestClaim(db, {
					client_id: client.id,
					created_by: user.id,
					desk_location_id: desk2.id,
					recovery_status: RecoveryStatus.PENDING,
				});
				await createClaimTransition(db, {
					client_id: client.id,
					claim_id: claim.id,
					desk_location_id: desk2.id,
					entered_at: await hoursBeforeEndOf(db, snapshotDate, hours),
				});
			}

			await refreshDailyWorkflowSnapshot(ctx, snapshotDate);

			const rows = await readSnapshots(db, client.id, snapshotDate);
			expect(rows).toHaveLength(2);

			const desk1Row = rows.find((r) => r.desk_location_id === desk1.id);
			const desk2Row = rows.find((r) => r.desk_location_id === desk2.id);

			expect(Number(desk1Row!.claims_count)).toBe(2);
			expect(Number(desk1Row!.avg_hours_in_stage)).toBe(15);

			expect(Number(desk2Row!.claims_count)).toBe(3);
			expect(Number(desk2Row!.avg_hours_in_stage)).toBe(60);
		});

		it('ignores SLA from inactive workflow definitions', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Inactive workflow with 5h SLA — should be ignored
			const inactiveWf = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				is_active: false,
			});
			await createWorkflowThreshold(db, {
				client_id: client.id,
				workflow_definition_id: inactiveWf.id,
				threshold_type: WorkflowThresholdType.LOCATION_AGE,
				threshold_value: 5,
			});

			const snapshotDate = '2026-04-15';
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.PENDING,
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				entered_at: await hoursBeforeEndOf(db, snapshotDate, 50),
			});

			await refreshDailyWorkflowSnapshot(ctx, snapshotDate);

			const rows = await readSnapshots(db, client.id, snapshotDate);
			expect(rows).toHaveLength(1);
			// Workflow inactive → SLA not applied → 0 breaches reported
			expect(Number(rows[0].claims_breaching_sla)).toBe(0);
		});

		it('ignores SLA from soft-deleted workflow definitions', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const deletedWf = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				deleted_at: new Date(),
			});
			await createWorkflowThreshold(db, {
				client_id: client.id,
				workflow_definition_id: deletedWf.id,
				threshold_type: WorkflowThresholdType.LOCATION_AGE,
				threshold_value: 5,
			});

			const snapshotDate = '2026-04-15';
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.PENDING,
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				entered_at: await hoursBeforeEndOf(db, snapshotDate, 50),
			});

			await refreshDailyWorkflowSnapshot(ctx, snapshotDate);

			const rows = await readSnapshots(db, client.id, snapshotDate);
			expect(rows).toHaveLength(1);
			expect(Number(rows[0].claims_breaching_sla)).toBe(0);
		});

		it('ignores inactive thresholds, falling back to no SLA when no other threshold exists', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Active workflow but only an inactive threshold
			const wf = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
			});
			await createWorkflowThreshold(db, {
				client_id: client.id,
				workflow_definition_id: wf.id,
				threshold_type: WorkflowThresholdType.LOCATION_AGE,
				threshold_value: 5,
				is_active: false,
			});

			const snapshotDate = '2026-04-15';
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.PENDING,
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				entered_at: await hoursBeforeEndOf(db, snapshotDate, 50),
			});

			await refreshDailyWorkflowSnapshot(ctx, snapshotDate);

			const rows = await readSnapshots(db, client.id, snapshotDate);
			expect(rows).toHaveLength(1);
			// Threshold inactive → SLA hours null → 0 breaches
			expect(Number(rows[0].claims_breaching_sla)).toBe(0);
		});
	});

	// ============================================================================
	// getMissingSnapshotDates
	// ============================================================================

	describe('getMissingSnapshotDates', () => {
		it('returns dates from earliest claim to yesterday that lack snapshots', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Create a claim with a known created_at (2 days ago)
			const twoDaysAgo = new Date();
			twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);
			twoDaysAgo.setUTCHours(0, 0, 0, 0);
			await db
				.insertInto('claim')
				.values({
					client_id: client.id,
					claim_number: `CLM-${Date.now()}`,
					insured: 'Test Insured',
					created_by: user.id,
					created_at: twoDaysAgo,
				})
				.execute();

			const missing = await getMissingSnapshotDates(ctx);

			// Should include 2 days ago and 1 day ago (yesterday); excludes today
			expect(missing.length).toBeGreaterThanOrEqual(2);
			const today = new Date();
			today.setUTCHours(0, 0, 0, 0);
			const yesterday = new Date(today);
			yesterday.setUTCDate(today.getUTCDate() - 1);
			const yyyyMmDd = (d: Date) => d.toISOString().split('T')[0];
			expect(missing).toContain(yyyyMmDd(yesterday));
			expect(missing).toContain(yyyyMmDd(twoDaysAgo));
			// Today should not be in the list
			expect(missing).not.toContain(yyyyMmDd(today));
		});

		it('excludes dates that already have snapshots', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Claim 3 days ago
			const threeDaysAgo = new Date();
			threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);
			threeDaysAgo.setUTCHours(0, 0, 0, 0);
			const claim = await db
				.insertInto('claim')
				.values({
					client_id: client.id,
					claim_number: `CLM-${Date.now()}`,
					insured: 'Test Insured',
					created_by: user.id,
					created_at: threeDaysAgo,
					desk_location_id: desk.id,
					recovery_status: RecoveryStatus.PENDING,
				})
				.returningAll()
				.executeTakeFirstOrThrow();
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				entered_at: threeDaysAgo,
			});

			// Run snapshot for 2 days ago
			const twoDaysAgo = new Date(threeDaysAgo);
			twoDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() + 1);
			const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
			await refreshDailyWorkflowSnapshot(ctx, twoDaysAgoStr);

			const missing = await getMissingSnapshotDates(ctx);

			// 2 days ago should NOT be in missing (we just snapshotted it)
			expect(missing).not.toContain(twoDaysAgoStr);
			// 3 days ago and 1 day ago should still be missing
			const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];
			expect(missing).toContain(threeDaysAgoStr);
		});

		it('enforces tenant isolation - each client computes range from its own claims', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });

			// Use Postgres-derived dates so they match what the function will compute
			const yesterdayStr = await pgDateMinusDays(db, 1);
			const fiveDaysAgoStr = await pgDateMinusDays(db, 5);
			const yesterdayTs = await pgNoonOn(db, yesterdayStr);
			const fiveDaysAgoTs = await pgNoonOn(db, fiveDaysAgoStr);

			// Client A's earliest claim is exactly yesterday (range = 1 day).
			await db
				.insertInto('claim')
				.values({
					client_id: clientA.id,
					claim_number: `CLM-A-${Date.now()}`,
					insured: 'A Insured',
					created_by: userA.id,
					created_at: yesterdayTs,
				})
				.execute();

			// Client B's earliest claim is 5 days ago (range = 5 days, NOT 30-day fallback).
			await db
				.insertInto('claim')
				.values({
					client_id: clientB.id,
					claim_number: `CLM-B-${Date.now()}`,
					insured: 'B Insured',
					created_by: userB.id,
					created_at: fiveDaysAgoTs,
				})
				.execute();

			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'Admin',
			});
			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});

			const missingA = await getMissingSnapshotDates(ctxA);
			const missingB = await getMissingSnapshotDates(ctxB);

			// Client A range = yesterday only (1 day). Proves client A's range
			// is computed from its OWN claim, not influenced by client B's earlier claim.
			expect(missingA).toEqual([yesterdayStr]);

			// Client B range = 5 days ago through yesterday (5 days). Proves client B's
			// range is computed from its OWN earliest claim, not from client A.
			expect(missingB).toHaveLength(5);
			expect(missingB[0]).toBe(fiveDaysAgoStr);
			expect(missingB[missingB.length - 1]).toBe(yesterdayStr);
		});
	});

	// ============================================================================
	// backfillWorkflowSnapshots
	// ============================================================================

	describe('backfillWorkflowSnapshots', () => {
		it('processes all missing dates and populates snapshots', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Use Postgres-derived dates so the range matches what backfill computes
			const twoDaysAgoStr = await pgDateMinusDays(db, 2);
			const twoDaysAgoTs = await pgNoonOn(db, twoDaysAgoStr);
			const claim = await db
				.insertInto('claim')
				.values({
					client_id: client.id,
					claim_number: `CLM-${Date.now()}`,
					insured: 'Test Insured',
					created_by: user.id,
					created_at: twoDaysAgoTs,
					desk_location_id: desk.id,
					recovery_status: RecoveryStatus.PENDING,
				})
				.returningAll()
				.executeTakeFirstOrThrow();
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				entered_at: twoDaysAgoTs,
			});

			const result = await backfillWorkflowSnapshots(ctx);

			// Earliest claim is 2 days ago, so range covers 2 days ago + yesterday = 2 dates,
			// each producing 1 snapshot row (one desk with one claim) = 2 rows total.
			expect(result.datesProcessed).toBe(2);
			expect(result.totalRowsAffected).toBe(2);

			// After backfill, no dates should be missing
			const missing = await getMissingSnapshotDates(ctx);
			expect(missing).toHaveLength(0);
		});

		it('upserts (not duplicates) when re-running backfill on dates that already have rows', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Claim 2 days ago at the desk
			const twoDaysAgo = new Date();
			twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);
			twoDaysAgo.setUTCHours(0, 0, 0, 0);
			const claim = await db
				.insertInto('claim')
				.values({
					client_id: client.id,
					claim_number: `CLM-${Date.now()}`,
					insured: 'Test Insured',
					created_by: user.id,
					created_at: twoDaysAgo,
					desk_location_id: desk.id,
					recovery_status: RecoveryStatus.PENDING,
				})
				.returningAll()
				.executeTakeFirstOrThrow();
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				entered_at: twoDaysAgo,
			});

			// First run populates snapshots
			await backfillWorkflowSnapshots(ctx);
			const firstSnapshotCount = await sql<{ count: string }>`
				SELECT COUNT(*) AS count FROM analytics.daily_workflow_stage_snapshot
				WHERE client_id = ${client.id}
			`.execute(db);

			// Second run upserts the same dates (no new rows, just updates)
			await backfillWorkflowSnapshots(ctx);
			const secondSnapshotCount = await sql<{ count: string }>`
				SELECT COUNT(*) AS count FROM analytics.daily_workflow_stage_snapshot
				WHERE client_id = ${client.id}
			`.execute(db);

			// Total snapshot rows should not have grown — UPSERT not duplicate INSERT
			expect(Number(secondSnapshotCount.rows[0].count)).toBe(
				Number(firstSnapshotCount.rows[0].count)
			);
		});

		it('enforces tenant isolation - only writes snapshots for the calling client', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });

			const deskTypeA = await createTestDeskLocationType(db, { client_id: clientA.id });
			const deskA = await createTestDeskLocation(db, {
				client_id: clientA.id,
				desk_location_type_id: deskTypeA.id,
			});
			const deskTypeB = await createTestDeskLocationType(db, { client_id: clientB.id });
			const deskB = await createTestDeskLocation(db, {
				client_id: clientB.id,
				desk_location_type_id: deskTypeB.id,
			});

			// Both clients have a claim from yesterday
			const yesterday = new Date();
			yesterday.setUTCDate(yesterday.getUTCDate() - 1);
			yesterday.setUTCHours(0, 0, 0, 0);

			const claimA = await db
				.insertInto('claim')
				.values({
					client_id: clientA.id,
					claim_number: `CLM-A-${Date.now()}`,
					insured: 'A',
					created_by: userA.id,
					created_at: yesterday,
					desk_location_id: deskA.id,
					recovery_status: RecoveryStatus.PENDING,
				})
				.returningAll()
				.executeTakeFirstOrThrow();
			await createClaimTransition(db, {
				client_id: clientA.id,
				claim_id: claimA.id,
				desk_location_id: deskA.id,
				entered_at: yesterday,
			});

			const claimB = await db
				.insertInto('claim')
				.values({
					client_id: clientB.id,
					claim_number: `CLM-B-${Date.now()}`,
					insured: 'B',
					created_by: userB.id,
					created_at: yesterday,
					desk_location_id: deskB.id,
					recovery_status: RecoveryStatus.PENDING,
				})
				.returningAll()
				.executeTakeFirstOrThrow();
			await createClaimTransition(db, {
				client_id: clientB.id,
				claim_id: claimB.id,
				desk_location_id: deskB.id,
				entered_at: yesterday,
			});

			// Run backfill only for client A
			const ctxA = createTestContext(db, {
				id: userA.id,
				client_id: clientA.id,
				email: userA.email,
				role: 'Admin',
			});
			await backfillWorkflowSnapshots(ctxA);

			// Client A has snapshot rows; client B does not
			const aRows = await sql<{ count: string }>`
				SELECT COUNT(*) AS count FROM analytics.daily_workflow_stage_snapshot
				WHERE client_id = ${clientA.id}
			`.execute(db);
			const bRows = await sql<{ count: string }>`
				SELECT COUNT(*) AS count FROM analytics.daily_workflow_stage_snapshot
				WHERE client_id = ${clientB.id}
			`.execute(db);

			expect(Number(aRows.rows[0].count)).toBeGreaterThan(0);
			expect(Number(bRows.rows[0].count)).toBe(0);
		});
	});
});
