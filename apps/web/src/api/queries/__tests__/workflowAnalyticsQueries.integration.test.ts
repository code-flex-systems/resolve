/**
 * Integration tests for workflowAnalyticsQueries
 *
 * Tests cover:
 * - Aggregation correctness (queue depth, work load, throughput)
 * - Date-range filtering (workflow stage metrics, deadline overview)
 * - Tenant isolation (every read function with client_id filter)
 * - Status filtering (PENDING vs EXECUTED, completed vs cancelled)
 * - Configuration health-check exclusion logic
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
	createTestUserDeskLocation,
	createTestTask,
	createTestDeadline,
} from '@/__tests__/integration/fixtures';
import {
	getDeskLocationQueueDepth,
	getDeskLocationWorkLoad,
	getUserWorkloadAndCapacity,
	getClaimsApproachingSLABreach,
	getTaskThroughputToday,
	getDeadlineStatusOverview,
	getDeskLocationsWithoutWorkflow,
	getWorkflowsWithoutLocationAgeThreshold,
	getDeskLocationsMissingCapacity,
	getUsersWithoutDeskAssignments,
	getSuggestionInput,
	getWorkflowStageMetrics,
} from '../workflowAnalyticsQueries';
import { DeadlineStatus, TaskStatus, WorkflowThresholdType, RecoveryStatus } from '@/config/enums';

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
		deleted_by?: string | null;
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
			deleted_by: params.deleted_by ?? null,
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
		deleted_at?: Date | null;
		created_by?: string;
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
			deleted_at: params.deleted_at ?? null,
			created_by: params.created_by ?? null,
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
		entered_at?: Date;
		entered_by?: string | null;
		deleted_at?: Date | null;
	}
) {
	return db
		.insertInto('claim_desk_location_transition')
		.values({
			client_id: params.client_id,
			claim_id: params.claim_id,
			desk_location_id: params.desk_location_id,
			entered_at: params.entered_at ?? new Date(),
			entered_by: params.entered_by ?? null,
			deleted_at: params.deleted_at ?? null,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

async function createTaskWithUnits(
	db: Kysely<DB>,
	params: {
		client_id: string;
		claim_id: string;
		desk_location_id: string;
		assigned_to?: string | null;
		status?: string;
		work_units?: number;
		title?: string;
		started_at?: Date | null;
		completed_at?: Date | null;
		created_at?: Date;
	}
) {
	const values: Record<string, unknown> = {
		client_id: params.client_id,
		claim_id: params.claim_id,
		desk_location_id: params.desk_location_id,
		assigned_to: params.assigned_to ?? null,
		status: params.status ?? TaskStatus.PENDING,
		work_units: params.work_units ?? 2,
		title: params.title ?? `Task ${Date.now()}-${Math.random()}`,
		started_at: params.started_at ?? null,
		completed_at: params.completed_at ?? null,
	};
	if (params.created_at !== undefined) values.created_at = params.created_at;
	return db.insertInto('task').values(values as never).returningAll().executeTakeFirstOrThrow();
}

async function insertWorkflowStageSnapshot(
	db: Kysely<DB>,
	params: {
		client_id: string;
		desk_location_id: string;
		snapshot_date: string; // YYYY-MM-DD
		claims_count: number;
		avg_hours_in_stage?: number | null;
		median_hours_in_stage?: number | null;
		claims_breaching_sla: number;
	}
) {
	// Cross-schema insert via raw SQL because Kysely's withSchema('test') prefixes
	// unqualified table names; raw SQL respects the explicit `analytics.` prefix.
	await sql`
		INSERT INTO analytics.daily_workflow_stage_snapshot (
			client_id, desk_location_id, snapshot_date, claims_count,
			avg_hours_in_stage, median_hours_in_stage, claims_breaching_sla
		) VALUES (
			${params.client_id}::uuid,
			${params.desk_location_id}::uuid,
			${params.snapshot_date}::date,
			${params.claims_count},
			${params.avg_hours_in_stage ?? null},
			${params.median_hours_in_stage ?? null},
			${params.claims_breaching_sla}
		)
	`.execute(db);
}

describe('workflowAnalyticsQueries integration tests', () => {
	let db: Kysely<DB>;

	beforeAll(() => {
		db = getTestDb();
	});

	// ============================================================================
	// getDeskLocationQueueDepth
	// ============================================================================

	describe('getDeskLocationQueueDepth', () => {
		it('returns claim count and open work units for a desk location', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Eval Desk',
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Two claims at this desk, with current transitions
			const claim1 = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
			});
			const claim2 = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: claim1.id,
				desk_location_id: desk.id,
				entered_at: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3h ago
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: claim2.id,
				desk_location_id: desk.id,
				entered_at: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1h ago
			});

			// Open tasks: 3 + 5 = 8 work units
			await createTaskWithUnits(db, {
				client_id: client.id,
				claim_id: claim1.id,
				desk_location_id: desk.id,
				status: TaskStatus.PENDING,
				work_units: 3,
			});
			await createTaskWithUnits(db, {
				client_id: client.id,
				claim_id: claim2.id,
				desk_location_id: desk.id,
				status: TaskStatus.IN_PROGRESS,
				work_units: 5,
			});
			// Completed task should not be counted
			await createTaskWithUnits(db, {
				client_id: client.id,
				claim_id: claim1.id,
				desk_location_id: desk.id,
				status: TaskStatus.COMPLETED,
				work_units: 99,
				completed_at: new Date(),
			});

			const result = await getDeskLocationQueueDepth(ctx, desk.id);

			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].deskLocationId).toBe(desk.id);
			expect(result.rows[0].deskLocationName).toBe('Eval Desk');
			expect(result.rows[0].totalClaims).toBe(2);
			expect(result.rows[0].openWorkUnits).toBe(8);
			expect(result.rows[0].slaHours).toBeNull(); // no workflow + threshold defined
			expect(result.rows[0].healthy).toBeNull();
			expect(result.rows[0].warning).toBeNull();
			expect(result.rows[0].breached).toBeNull();
		});

		it('returns SLA breakdown when location_age threshold is configured', async () => {
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

			// Workflow with 100-hour SLA → healthy <= 75h, warning 75-100h, breached > 100h
			const wf = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
			});
			await createWorkflowThreshold(db, {
				client_id: client.id,
				workflow_definition_id: wf.id,
				threshold_type: WorkflowThresholdType.LOCATION_AGE,
				threshold_value: 100,
			});

			// Claim entered 50h ago → healthy
			const healthyClaim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: healthyClaim.id,
				desk_location_id: desk.id,
				entered_at: new Date(Date.now() - 50 * 60 * 60 * 1000),
			});

			// Claim entered 80h ago → warning (between 75 and 100)
			const warningClaim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: warningClaim.id,
				desk_location_id: desk.id,
				entered_at: new Date(Date.now() - 80 * 60 * 60 * 1000),
			});

			// Claim entered 150h ago → breached
			const breachedClaim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: breachedClaim.id,
				desk_location_id: desk.id,
				entered_at: new Date(Date.now() - 150 * 60 * 60 * 1000),
			});

			const result = await getDeskLocationQueueDepth(ctx, desk.id);

			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].slaHours).toBe(100);
			expect(result.rows[0].totalClaims).toBe(3);
			expect(result.rows[0].healthy).toBe(1);
			expect(result.rows[0].warning).toBe(1);
			expect(result.rows[0].breached).toBe(1);
		});

		it('uses latest transition (not stale ones) for current-stage age', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const otherDesk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Other Desk',
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Claim has TWO transitions; current desk is the LATER one (other desk)
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: otherDesk.id,
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				entered_at: new Date(Date.now() - 10 * 60 * 60 * 1000),
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: otherDesk.id,
				entered_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
			});

			// First desk should not include this claim (latest transition is to otherDesk)
			const result = await getDeskLocationQueueDepth(ctx, desk.id);
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].totalClaims).toBe(0);

			const otherResult = await getDeskLocationQueueDepth(ctx, otherDesk.id);
			expect(otherResult.rows[0].totalClaims).toBe(1);
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
			const claimA = await createTestClaim(db, {
				client_id: clientA.id,
				created_by: userA.id,
				desk_location_id: deskA.id,
			});
			await createClaimTransition(db, {
				client_id: clientA.id,
				claim_id: claimA.id,
				desk_location_id: deskA.id,
			});

			// Control: client B has its own desk that should appear
			const deskTypeB = await createTestDeskLocationType(db, { client_id: clientB.id });
			const deskB = await createTestDeskLocation(db, {
				client_id: clientB.id,
				desk_location_type_id: deskTypeB.id,
				name: 'B Desk',
			});

			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});

			const result = await getDeskLocationQueueDepth(ctxB);
			const ids = result.rows.map((r) => r.deskLocationId);
			expect(ids).toContain(deskB.id);
			expect(ids).not.toContain(deskA.id);
		});
	});

	// ============================================================================
	// getDeskLocationWorkLoad
	// ============================================================================

	describe('getDeskLocationWorkLoad', () => {
		it('aggregates open task work_units and computes utilization ratio', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				daily_work_units: 20,
			});
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// 4 + 6 = 10 open units
			await createTaskWithUnits(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				status: TaskStatus.PENDING,
				work_units: 4,
			});
			await createTaskWithUnits(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				status: TaskStatus.IN_PROGRESS,
				work_units: 6,
			});
			// Completed task — should NOT count
			await createTaskWithUnits(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				status: TaskStatus.COMPLETED,
				work_units: 50,
				completed_at: new Date(),
			});

			const result = await getDeskLocationWorkLoad(ctx, desk.id);

			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].deskLocationId).toBe(desk.id);
			expect(result.rows[0].capacity).toBe(20);
			expect(result.rows[0].currentLoad).toBe(10);
			expect(result.rows[0].utilizationRatio).toBe(0.5);
			expect(result.workloadUtilizationRatio).toBe(0.5);
		});

		it('returns null utilization when daily_work_units is null', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				daily_work_units: null,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const result = await getDeskLocationWorkLoad(ctx, desk.id);

			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].capacity).toBeNull();
			expect(result.rows[0].currentLoad).toBe(0);
			expect(result.rows[0].utilizationRatio).toBeNull();
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
				name: 'A Desk',
			});
			// Control: client B has own desk
			const deskTypeB = await createTestDeskLocationType(db, { client_id: clientB.id });
			const deskB = await createTestDeskLocation(db, {
				client_id: clientB.id,
				desk_location_type_id: deskTypeB.id,
				name: 'B Desk',
			});

			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});

			const result = await getDeskLocationWorkLoad(ctxB);
			const ids = result.rows.map((r) => r.deskLocationId);
			expect(ids).toContain(deskB.id);
			expect(ids).not.toContain(deskA.id);
		});
	});

	// ============================================================================
	// getUserWorkloadAndCapacity
	// ============================================================================

	describe('getUserWorkloadAndCapacity', () => {
		it('returns in-progress work units and pending tasks visible to the user', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id, first: 'Alice', last: 'Smith' });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
			});
			await createTestUserDeskLocation(db, { user_id: user.id, desk_location_id: desk.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// 2 in-progress tasks assigned to user with work_units 3 and 4
			await createTaskWithUnits(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.IN_PROGRESS,
				work_units: 3,
				started_at: new Date(),
			});
			await createTaskWithUnits(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.IN_PROGRESS,
				work_units: 4,
				started_at: new Date(),
			});

			// 2 pending+unassigned tasks at user's desk (visible queue)
			await createTaskWithUnits(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: null,
				status: TaskStatus.PENDING,
				work_units: 1,
			});
			await createTaskWithUnits(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: null,
				status: TaskStatus.PENDING,
				work_units: 2,
			});

			const result = await getUserWorkloadAndCapacity(ctx, {
				userId: user.id,
				userDailyWorkUnits: 100,
			});

			expect(result).toHaveLength(1);
			expect(result[0].userId).toBe(user.id);
			expect(result[0].firstName).toBe('Alice');
			expect(result[0].lastName).toBe('Smith');
			// Capacity is bound in via raw SQL literal; pg returns it as a string.
			expect(Number(result[0].capacity)).toBe(100);
			expect(result[0].currentLoad).toBe(7); // 3 + 4
			expect(result[0].tasksInProgress).toBe(2);
			expect(result[0].tasksAvailableInQueue).toBe(2);
			expect(result[0].utilizationRatio).toBe(0.07);
		});

		it('excludes disabled users', async () => {
			const client = await createTestClient(db);
			const activeUser = await createTestUser(db, {
				client_id: client.id,
				disabled: false,
				first: 'Active',
				last: 'User',
			});
			const disabledUser = await createTestUser(db, {
				client_id: client.id,
				disabled: true,
				first: 'Disabled',
				last: 'User',
			});
			const ctx = createTestContext(db, {
				id: activeUser.id,
				client_id: client.id,
				email: activeUser.email,
				role: 'Admin',
			});

			const result = await getUserWorkloadAndCapacity(ctx);

			const ids = result.map((r) => r.userId);
			expect(ids).toContain(activeUser.id);
			expect(ids).not.toContain(disabledUser.id);
		});

		it('returns zero load and zero queue for users with no tasks', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const result = await getUserWorkloadAndCapacity(ctx, { userId: user.id });

			expect(result).toHaveLength(1);
			expect(result[0].currentLoad).toBe(0);
			expect(result[0].tasksInProgress).toBe(0);
			expect(result[0].tasksAvailableInQueue).toBe(0);
			expect(result[0].currentTaskId).toBeNull();
		});

		it('enforces tenant isolation', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });

			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});

			const result = await getUserWorkloadAndCapacity(ctxB);
			const ids = result.map((r) => r.userId);
			expect(ids).toContain(userB.id);
			expect(ids).not.toContain(userA.id);
		});
	});

	// ============================================================================
	// getClaimsApproachingSLABreach
	// ============================================================================

	describe('getClaimsApproachingSLABreach', () => {
		it('returns claims past 50% of SLA in ascending hours_remaining order', async () => {
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

			// SLA = 100 hours; warn threshold = 50 (anything where hours_remaining < 50)
			const wf = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
			});
			await createWorkflowThreshold(db, {
				client_id: client.id,
				workflow_definition_id: wf.id,
				threshold_type: WorkflowThresholdType.LOCATION_AGE,
				threshold_value: 100,
			});

			// Claim 1: entered 30h ago → 70h remaining → NOT in warning
			const healthyClaim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.PENDING,
				claim_number: 'CLM-HEALTHY',
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: healthyClaim.id,
				desk_location_id: desk.id,
				entered_at: new Date(Date.now() - 30 * 60 * 60 * 1000),
			});

			// Claim 2: entered 60h ago → 40h remaining → warning (40 < 50)
			const warningClaim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.IN_PROGRESS,
				claim_number: 'CLM-WARNING',
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: warningClaim.id,
				desk_location_id: desk.id,
				entered_at: new Date(Date.now() - 60 * 60 * 60 * 1000),
			});

			// Claim 3: entered 110h ago → -10h remaining → breached
			const breachedClaim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.PENDING,
				claim_number: 'CLM-BREACHED',
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: breachedClaim.id,
				desk_location_id: desk.id,
				entered_at: new Date(Date.now() - 110 * 60 * 60 * 1000),
			});

			const result = await getClaimsApproachingSLABreach(ctx);

			expect(result).toHaveLength(2);
			// Most-breached first (lowest hours_remaining)
			expect(result[0].claimNumber).toBe('CLM-BREACHED');
			expect(result[0].slaStatus).toBe('breached');
			expect(result[1].claimNumber).toBe('CLM-WARNING');
			expect(result[1].slaStatus).toBe('warning');
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

			const wf = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
			});
			await createWorkflowThreshold(db, {
				client_id: client.id,
				workflow_definition_id: wf.id,
				threshold_type: WorkflowThresholdType.LOCATION_AGE,
				threshold_value: 100,
			});

			// Control: pending claim past warning threshold → SHOULD appear
			const includedClaim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.PENDING,
				claim_number: 'CLM-INCLUDED',
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: includedClaim.id,
				desk_location_id: desk.id,
				entered_at: new Date(Date.now() - 80 * 60 * 60 * 1000),
			});

			// Recovered claim past warning threshold → should be excluded
			const recoveredClaim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.RECOVERED,
				claim_number: 'CLM-RECOVERED',
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: recoveredClaim.id,
				desk_location_id: desk.id,
				entered_at: new Date(Date.now() - 80 * 60 * 60 * 1000),
			});

			// Closed claim past warning threshold → should be excluded
			const closedClaim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				recovery_status: RecoveryStatus.CLOSED_NO_RECOVERY,
				claim_number: 'CLM-CLOSED',
			});
			await createClaimTransition(db, {
				client_id: client.id,
				claim_id: closedClaim.id,
				desk_location_id: desk.id,
				entered_at: new Date(Date.now() - 80 * 60 * 60 * 1000),
			});

			const result = await getClaimsApproachingSLABreach(ctx);
			const claimNumbers = result.map((r) => r.claimNumber);
			expect(claimNumbers).toContain('CLM-INCLUDED');
			expect(claimNumbers).not.toContain('CLM-RECOVERED');
			expect(claimNumbers).not.toContain('CLM-CLOSED');
		});

		it('respects the limit parameter', async () => {
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

			const wf = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
			});
			await createWorkflowThreshold(db, {
				client_id: client.id,
				workflow_definition_id: wf.id,
				threshold_type: WorkflowThresholdType.LOCATION_AGE,
				threshold_value: 100,
			});

			// Three breaching claims
			for (let i = 0; i < 3; i++) {
				const c = await createTestClaim(db, {
					client_id: client.id,
					created_by: user.id,
					desk_location_id: desk.id,
					recovery_status: RecoveryStatus.PENDING,
					claim_number: `CLM-LIMIT-${i}`,
				});
				await createClaimTransition(db, {
					client_id: client.id,
					claim_id: c.id,
					desk_location_id: desk.id,
					entered_at: new Date(Date.now() - (110 + i) * 60 * 60 * 1000),
				});
			}

			const result = await getClaimsApproachingSLABreach(ctx, 2);
			expect(result).toHaveLength(2);
		});

		it('enforces tenant isolation', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });

			// Client A: desk + workflow + claim approaching SLA breach
			const deskTypeA = await createTestDeskLocationType(db, { client_id: clientA.id });
			const deskA = await createTestDeskLocation(db, {
				client_id: clientA.id,
				desk_location_type_id: deskTypeA.id,
			});
			const wfA = await createWorkflowDefinition(db, {
				client_id: clientA.id,
				created_by: userA.id,
				desk_location_id: deskA.id,
			});
			await createWorkflowThreshold(db, {
				client_id: clientA.id,
				workflow_definition_id: wfA.id,
				threshold_type: WorkflowThresholdType.LOCATION_AGE,
				threshold_value: 100,
			});
			const claimA = await createTestClaim(db, {
				client_id: clientA.id,
				created_by: userA.id,
				desk_location_id: deskA.id,
				recovery_status: RecoveryStatus.PENDING,
				claim_number: 'CLM-A-TENANT',
			});
			await createClaimTransition(db, {
				client_id: clientA.id,
				claim_id: claimA.id,
				desk_location_id: deskA.id,
				entered_at: new Date(Date.now() - 110 * 60 * 60 * 1000),
			});

			// Client B: parallel setup with a control claim that SHOULD appear
			const deskTypeB = await createTestDeskLocationType(db, { client_id: clientB.id });
			const deskB = await createTestDeskLocation(db, {
				client_id: clientB.id,
				desk_location_type_id: deskTypeB.id,
			});
			const wfB = await createWorkflowDefinition(db, {
				client_id: clientB.id,
				created_by: userB.id,
				desk_location_id: deskB.id,
			});
			await createWorkflowThreshold(db, {
				client_id: clientB.id,
				workflow_definition_id: wfB.id,
				threshold_type: WorkflowThresholdType.LOCATION_AGE,
				threshold_value: 100,
			});
			const claimB = await createTestClaim(db, {
				client_id: clientB.id,
				created_by: userB.id,
				desk_location_id: deskB.id,
				recovery_status: RecoveryStatus.PENDING,
				claim_number: 'CLM-B-TENANT',
			});
			await createClaimTransition(db, {
				client_id: clientB.id,
				claim_id: claimB.id,
				desk_location_id: deskB.id,
				entered_at: new Date(Date.now() - 110 * 60 * 60 * 1000),
			});

			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});
			const result = await getClaimsApproachingSLABreach(ctxB);
			const claimNumbers = result.map((r) => r.claimNumber);
			// Positive control: client B sees their own claim
			expect(claimNumbers).toContain('CLM-B-TENANT');
			// Tenant isolation: client B does NOT see client A's claim
			expect(claimNumbers).not.toContain('CLM-A-TENANT');
		});
	});

	// ============================================================================
	// getTaskThroughputToday
	// ============================================================================

	describe('getTaskThroughputToday', () => {
		it('returns counts and totals for tasks completed and created today', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// 1 completed today (created today as well, completed_at = now) — work_units 5
			await createTaskWithUnits(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.COMPLETED,
				work_units: 5,
				completed_at: new Date(),
			});
			// 1 pending created today — work_units 3
			await createTaskWithUnits(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.PENDING,
				work_units: 3,
			});

			const result = await getTaskThroughputToday(ctx);

			// 2 created today (3+5=8 units), 1 completed today (5 units)
			// Window-function totals come back from pg as strings.
			expect(Number(result.totals.tasksCreated)).toBe(2);
			expect(Number(result.totals.workUnitsCreated)).toBe(8);
			expect(Number(result.totals.tasksCompleted)).toBe(1);
			expect(Number(result.totals.workUnitsCompleted)).toBe(5);
		});

		it('does not count tasks completed yesterday', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Control: completed today
			await createTaskWithUnits(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.COMPLETED,
				work_units: 4,
				completed_at: new Date(),
			});

			// Completed yesterday — should NOT count toward "completed today"
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			yesterday.setHours(12, 0, 0, 0);
			await createTaskWithUnits(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.COMPLETED,
				work_units: 99,
				completed_at: yesterday,
			});

			const result = await getTaskThroughputToday(ctx);

			expect(Number(result.totals.tasksCompleted)).toBe(1);
			expect(Number(result.totals.workUnitsCompleted)).toBe(4);
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
			const claimA = await createTestClaim(db, {
				client_id: clientA.id,
				created_by: userA.id,
				desk_location_id: deskA.id,
			});
			await createTaskWithUnits(db, {
				client_id: clientA.id,
				claim_id: claimA.id,
				desk_location_id: deskA.id,
				assigned_to: userA.id,
				status: TaskStatus.COMPLETED,
				work_units: 7,
				completed_at: new Date(),
			});

			// Control: client B has its own desk
			const deskTypeB = await createTestDeskLocationType(db, { client_id: clientB.id });
			await createTestDeskLocation(db, {
				client_id: clientB.id,
				desk_location_type_id: deskTypeB.id,
			});

			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});
			const result = await getTaskThroughputToday(ctxB);

			// B sees no tasks (zero from `?? 0` fallback when no rows)
			expect(Number(result.totals.tasksCompleted)).toBe(0);
			expect(Number(result.totals.workUnitsCompleted)).toBe(0);
		});
	});

	// ============================================================================
	// getDeadlineStatusOverview
	// ============================================================================

	describe('getDeadlineStatusOverview', () => {
		it('counts deadlines correctly across status buckets', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const yesterday = new Date(today);
			yesterday.setDate(yesterday.getDate() - 1);
			const inThreeDays = new Date(today);
			inThreeDays.setDate(inThreeDays.getDate() + 3);
			const inFifteenDays = new Date(today);
			inFifteenDays.setDate(inFifteenDays.getDate() + 15);

			// 1 overdue (yesterday, pending)
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				deadline_date: yesterday,
				status: DeadlineStatus.PENDING,
			});
			// 2 due today (pending)
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				deadline_date: today,
				status: DeadlineStatus.PENDING,
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				deadline_date: today,
				status: DeadlineStatus.PENDING,
			});
			// 1 due in next 7 days
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				deadline_date: inThreeDays,
				status: DeadlineStatus.PENDING,
			});
			// 1 outside the 7-day window — NOT in next7Days bucket
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				deadline_date: inFifteenDays,
				status: DeadlineStatus.PENDING,
			});
			// 3 met / completed
			for (let i = 0; i < 3; i++) {
				await createTestDeadline(db, {
					client_id: client.id,
					claim_id: claim.id,
					created_by: user.id,
					deadline_date: yesterday,
					status: DeadlineStatus.MET,
				});
			}
			// 1 cancelled
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claim.id,
				created_by: user.id,
				deadline_date: yesterday,
				status: DeadlineStatus.CANCELLED,
			});

			const result = await getDeadlineStatusOverview(ctx);

			expect(result.overdue).toBe(1);
			expect(result.dueToday).toBe(2);
			expect(result.next7Days).toBe(1);
			expect(result.completed).toBe(3);
			expect(result.cancelled).toBe(1);
		});

		it('filters by claimId when provided', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claimA = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const claimB = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const today = new Date();
			today.setHours(0, 0, 0, 0);

			// 2 due-today on claim A (control + included)
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claimA.id,
				created_by: user.id,
				deadline_date: today,
				status: DeadlineStatus.PENDING,
			});
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claimA.id,
				created_by: user.id,
				deadline_date: today,
				status: DeadlineStatus.PENDING,
			});

			// 1 due-today on claim B — must be excluded by filter
			await createTestDeadline(db, {
				client_id: client.id,
				claim_id: claimB.id,
				created_by: user.id,
				deadline_date: today,
				status: DeadlineStatus.PENDING,
			});

			const result = await getDeadlineStatusOverview(ctx, { claimId: claimA.id });

			expect(result.dueToday).toBe(2);
		});

		it('enforces tenant isolation', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });
			const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });

			const today = new Date();
			today.setHours(0, 0, 0, 0);
			await createTestDeadline(db, {
				client_id: clientA.id,
				claim_id: claimA.id,
				created_by: userA.id,
				deadline_date: today,
				status: DeadlineStatus.PENDING,
			});

			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});
			const result = await getDeadlineStatusOverview(ctxB);

			expect(result.overdue).toBe(0);
			expect(result.dueToday).toBe(0);
			expect(result.next7Days).toBe(0);
			expect(result.completed).toBe(0);
			expect(result.cancelled).toBe(0);
		});
	});

	// ============================================================================
	// getDeskLocationsWithoutWorkflow
	// ============================================================================

	describe('getDeskLocationsWithoutWorkflow', () => {
		it('returns only desk locations missing both location-specific and global workflows', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Desk A: has location-specific workflow → excluded
			const deskA = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Desk A',
			});
			await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: deskA.id,
			});

			// Desk B: no workflow — INCLUDED
			const deskB = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Desk B',
			});

			const result = await getDeskLocationsWithoutWorkflow(ctx);
			const ids = result.map((r) => r.deskLocationId);
			expect(ids).toContain(deskB.id);
			expect(ids).not.toContain(deskA.id);
		});

		it('excludes all desks when a global workflow exists', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Two desks — both should be covered by the global workflow
			await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});

			// Global workflow covers everything → both desks should be excluded
			await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: null,
			});

			const result = await getDeskLocationsWithoutWorkflow(ctx);
			expect(result).toHaveLength(0);
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
				name: 'Tenant A Desk',
			});
			// Control: client B has a desk that should appear
			const deskTypeB = await createTestDeskLocationType(db, { client_id: clientB.id });
			const deskB = await createTestDeskLocation(db, {
				client_id: clientB.id,
				desk_location_type_id: deskTypeB.id,
				name: 'Tenant B Desk',
			});

			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});

			const result = await getDeskLocationsWithoutWorkflow(ctxB);
			const ids = result.map((r) => r.deskLocationId);
			expect(ids).toContain(deskB.id);
			expect(ids).not.toContain(deskA.id);
		});
	});

	// ============================================================================
	// getWorkflowsWithoutLocationAgeThreshold
	// ============================================================================

	describe('getWorkflowsWithoutLocationAgeThreshold', () => {
		it('returns workflows that have no active location_age threshold', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			// Two desks so we can have two location-specific workflows in one client
			// (the unique partial index forbids more than one ACTIVE global workflow per client)
			const deskA = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'WF A Desk',
			});
			const deskB = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'WF B Desk',
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Workflow A — has location_age threshold → excluded
			const wfA = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: deskA.id,
				name: 'Configured WF',
			});
			await createWorkflowThreshold(db, {
				client_id: client.id,
				workflow_definition_id: wfA.id,
				threshold_type: WorkflowThresholdType.LOCATION_AGE,
				threshold_value: 24,
			});

			// Workflow B — no threshold → INCLUDED
			const wfB = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: deskB.id,
				name: 'Unconfigured WF',
			});

			const result = await getWorkflowsWithoutLocationAgeThreshold(ctx);
			const ids = result.map((r) => r.workflowDefinitionId);
			expect(ids).toContain(wfB.id);
			expect(ids).not.toContain(wfA.id);
		});

		it('treats workflows whose only threshold is a different type as missing', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const wf = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				name: 'WF Wrong Threshold',
			});
			// Has user_capacity threshold but NOT location_age
			await createWorkflowThreshold(db, {
				client_id: client.id,
				workflow_definition_id: wf.id,
				threshold_type: WorkflowThresholdType.USER_CAPACITY,
				threshold_value: 10,
			});

			const result = await getWorkflowsWithoutLocationAgeThreshold(ctx);
			expect(result.some((r) => r.workflowDefinitionId === wf.id)).toBe(true);
		});

		it('reports workflow scope correctly', async () => {
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

			const globalWf = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: null,
				name: 'Global Unconfigured',
			});
			const specificWf = await createWorkflowDefinition(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
				name: 'Specific Unconfigured',
			});

			const result = await getWorkflowsWithoutLocationAgeThreshold(ctx);
			const globalRow = result.find((r) => r.workflowDefinitionId === globalWf.id);
			const specificRow = result.find((r) => r.workflowDefinitionId === specificWf.id);

			expect(globalRow?.workflowScope).toBe('Global');
			expect(specificRow?.workflowScope).toBe('Location-specific');
		});

		it('enforces tenant isolation', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			const userB = await createTestUser(db, { client_id: clientB.id });

			const wfA = await createWorkflowDefinition(db, {
				client_id: clientA.id,
				created_by: userA.id,
				name: 'Tenant A Unconfigured',
			});
			// Control: client B also has an unconfigured workflow
			const wfB = await createWorkflowDefinition(db, {
				client_id: clientB.id,
				created_by: userB.id,
				name: 'Tenant B Unconfigured',
			});

			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});
			const result = await getWorkflowsWithoutLocationAgeThreshold(ctxB);
			const ids = result.map((r) => r.workflowDefinitionId);
			expect(ids).toContain(wfB.id);
			expect(ids).not.toContain(wfA.id);
		});
	});

	// ============================================================================
	// getDeskLocationsMissingCapacity
	// ============================================================================

	describe('getDeskLocationsMissingCapacity', () => {
		it('returns only desks where daily_work_units is null', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// With capacity → excluded
			const configured = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				daily_work_units: 10,
				name: 'Configured',
			});
			// Without capacity → INCLUDED
			const missing = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				daily_work_units: null,
				name: 'Missing Capacity',
			});

			const result = await getDeskLocationsMissingCapacity(ctx);
			const ids = result.map((r) => r.deskLocationId);
			expect(ids).toContain(missing.id);
			expect(ids).not.toContain(configured.id);
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
				daily_work_units: null,
				name: 'A Missing',
			});
			// Control: client B also has a missing-capacity desk
			const deskTypeB = await createTestDeskLocationType(db, { client_id: clientB.id });
			const deskB = await createTestDeskLocation(db, {
				client_id: clientB.id,
				desk_location_type_id: deskTypeB.id,
				daily_work_units: null,
				name: 'B Missing',
			});

			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});
			const result = await getDeskLocationsMissingCapacity(ctxB);
			const ids = result.map((r) => r.deskLocationId);
			expect(ids).toContain(deskB.id);
			expect(ids).not.toContain(deskA.id);
		});
	});

	// ============================================================================
	// getUsersWithoutDeskAssignments
	// ============================================================================

	describe('getUsersWithoutDeskAssignments', () => {
		it('returns only active users without active desk assignments', async () => {
			const client = await createTestClient(db);
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});

			// Assigned user → excluded
			const assignedUser = await createTestUser(db, {
				client_id: client.id,
				first: 'Assigned',
				last: 'User',
			});
			await createTestUserDeskLocation(db, {
				user_id: assignedUser.id,
				desk_location_id: desk.id,
			});

			// Unassigned user → INCLUDED
			const unassignedUser = await createTestUser(db, {
				client_id: client.id,
				first: 'Unassigned',
				last: 'User',
			});

			// Disabled user without assignment → excluded (disabled = true)
			const disabledUser = await createTestUser(db, {
				client_id: client.id,
				disabled: true,
				first: 'Disabled',
				last: 'User',
			});

			const ctx = createTestContext(db, {
				id: assignedUser.id,
				client_id: client.id,
				email: assignedUser.email,
				role: 'Admin',
			});

			const result = await getUsersWithoutDeskAssignments(ctx);
			const ids = result.map((r) => r.userId);
			expect(ids).toContain(unassignedUser.id);
			expect(ids).not.toContain(assignedUser.id);
			expect(ids).not.toContain(disabledUser.id);
		});

		it('treats user with only removed desk assignment as unassigned', async () => {
			const client = await createTestClient(db);
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
			});
			const user = await createTestUser(db, { client_id: client.id });
			await createTestUserDeskLocation(db, {
				user_id: user.id,
				desk_location_id: desk.id,
				removed_at: new Date(),
			});

			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const result = await getUsersWithoutDeskAssignments(ctx);
			expect(result.some((r) => r.userId === user.id)).toBe(true);
		});

		it('enforces tenant isolation', async () => {
			const clientA = await createTestClient(db);
			const clientB = await createTestClient(db);
			const userA = await createTestUser(db, { client_id: clientA.id });
			// Control: client B also has an unassigned user
			const userB = await createTestUser(db, { client_id: clientB.id });

			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});

			const result = await getUsersWithoutDeskAssignments(ctxB);
			const ids = result.map((r) => r.userId);
			expect(ids).toContain(userB.id);
			expect(ids).not.toContain(userA.id);
		});
	});

	// ============================================================================
	// getSuggestionInput
	// ============================================================================

	describe('getSuggestionInput', () => {
		it('returns desk locations, assignments, and current tasks for a tenant', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, {
				client_id: client.id,
				first: 'Aria',
				last: 'Park',
			});
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const desk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'Suggestion Desk',
			});
			const claim = await createTestClaim(db, {
				client_id: client.id,
				created_by: user.id,
				desk_location_id: desk.id,
			});
			await createTestUserDeskLocation(db, {
				user_id: user.id,
				desk_location_id: desk.id,
				priority: 2,
			});

			// Open task at this desk: 4 + 6 = 10 work units
			await createTaskWithUnits(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.IN_PROGRESS,
				work_units: 4,
				started_at: new Date(),
			});
			await createTaskWithUnits(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: null,
				status: TaskStatus.PENDING,
				work_units: 6,
			});
			// Completed task should not contribute to open task units
			await createTaskWithUnits(db, {
				client_id: client.id,
				claim_id: claim.id,
				desk_location_id: desk.id,
				assigned_to: user.id,
				status: TaskStatus.COMPLETED,
				work_units: 99,
				completed_at: new Date(),
			});

			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const result = await getSuggestionInput(ctx);

			// Locations: at least our desk, with openTaskUnits = 10
			const ourLoc = result.locations.find((l) => l.deskLocationId === desk.id);
			expect(ourLoc).toBeDefined();
			expect(ourLoc!.openTaskUnits).toBe(10);
			expect(ourLoc!.deskLocationName).toBe('Suggestion Desk');

			// Assignments: one record for our user-desk link
			const ourAssignment = result.assignments.find(
				(a) => a.userId === user.id && a.deskLocationId === desk.id
			);
			expect(ourAssignment).toBeDefined();
			expect(ourAssignment!.priority).toBe(2);
			expect(ourAssignment!.userName).toBe('Aria Park');

			// Current tasks: only the in-progress task with started_at + assigned_to
			const userTasks = result.currentTasks.filter((t) => t.userId === user.id);
			expect(userTasks).toHaveLength(1);
			expect(userTasks[0].totalWorkUnits).toBe(4);
		});

		it('excludes inactive and deleted desk locations', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });

			// Active desk → INCLUDED
			const activeDesk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				is_active: true,
				name: 'Active Desk',
			});

			// Inactive desk → excluded
			const inactiveDesk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				is_active: false,
				name: 'Inactive Desk',
			});

			// Soft-deleted desk → excluded
			const deletedDesk = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				is_active: true,
				name: 'Deleted Desk',
			});
			await db
				.updateTable('desk_location')
				.set({ deleted_at: new Date() })
				.where('id', '=', deletedDesk.id)
				.execute();

			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			const result = await getSuggestionInput(ctx);
			const ids = result.locations.map((l) => l.deskLocationId);
			expect(ids).toContain(activeDesk.id);
			expect(ids).not.toContain(inactiveDesk.id);
			expect(ids).not.toContain(deletedDesk.id);
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
				name: 'Tenant A Desk',
			});
			await createTestUserDeskLocation(db, {
				user_id: userA.id,
				desk_location_id: deskA.id,
				priority: 1,
			});

			// Control: client B has its own desk + user assignment
			const deskTypeB = await createTestDeskLocationType(db, { client_id: clientB.id });
			const deskB = await createTestDeskLocation(db, {
				client_id: clientB.id,
				desk_location_type_id: deskTypeB.id,
				name: 'Tenant B Desk',
			});
			await createTestUserDeskLocation(db, {
				user_id: userB.id,
				desk_location_id: deskB.id,
				priority: 1,
			});

			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});

			const result = await getSuggestionInput(ctxB);
			const locIds = result.locations.map((l) => l.deskLocationId);
			expect(locIds).toContain(deskB.id);
			expect(locIds).not.toContain(deskA.id);

			const assignedUserIds = result.assignments.map((a) => a.userId);
			expect(assignedUserIds).toContain(userB.id);
			expect(assignedUserIds).not.toContain(userA.id);
		});
	});

	// ============================================================================
	// getWorkflowStageMetrics
	// ============================================================================

	describe('getWorkflowStageMetrics', () => {
		it('returns rollup rows within the requested date range', async () => {
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

			// In range
			await insertWorkflowStageSnapshot(db, {
				client_id: client.id,
				desk_location_id: desk.id,
				snapshot_date: '2026-01-10',
				claims_count: 5,
				avg_hours_in_stage: 12.5,
				median_hours_in_stage: 10.0,
				claims_breaching_sla: 1,
			});
			await insertWorkflowStageSnapshot(db, {
				client_id: client.id,
				desk_location_id: desk.id,
				snapshot_date: '2026-01-15',
				claims_count: 7,
				avg_hours_in_stage: 14.0,
				median_hours_in_stage: 13.0,
				claims_breaching_sla: 2,
			});
			// Out of range — should be excluded
			await insertWorkflowStageSnapshot(db, {
				client_id: client.id,
				desk_location_id: desk.id,
				snapshot_date: '2026-02-01',
				claims_count: 99,
				claims_breaching_sla: 50,
			});

			const result = await getWorkflowStageMetrics(ctx, {
				startDate: '2026-01-01',
				endDate: '2026-01-31',
			});

			expect(result).toHaveLength(2);
			// Ordered ascending by date
			expect(result[0].claimsCount).toBe(5);
			expect(result[0].avgHoursInStage).toBe(12.5);
			expect(result[0].medianHoursInStage).toBe(10.0);
			expect(result[0].claimsBreachingSla).toBe(1);
			expect(result[1].claimsCount).toBe(7);
			expect(result[1].claimsBreachingSla).toBe(2);
		});

		it('filters by deskLocationId when provided', async () => {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const deskType = await createTestDeskLocationType(db, { client_id: client.id });
			const deskA = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'A',
			});
			const deskB = await createTestDeskLocation(db, {
				client_id: client.id,
				desk_location_type_id: deskType.id,
				name: 'B',
			});
			const ctx = createTestContext(db, {
				id: user.id,
				client_id: client.id,
				email: user.email,
				role: 'Admin',
			});

			// Control: row for desk A — INCLUDED
			await insertWorkflowStageSnapshot(db, {
				client_id: client.id,
				desk_location_id: deskA.id,
				snapshot_date: '2026-01-10',
				claims_count: 3,
				claims_breaching_sla: 0,
			});
			// Row for desk B — should be filtered out
			await insertWorkflowStageSnapshot(db, {
				client_id: client.id,
				desk_location_id: deskB.id,
				snapshot_date: '2026-01-10',
				claims_count: 99,
				claims_breaching_sla: 0,
			});

			const result = await getWorkflowStageMetrics(ctx, {
				startDate: '2026-01-01',
				endDate: '2026-01-31',
				deskLocationId: deskA.id,
			});

			expect(result).toHaveLength(1);
			expect(result[0].deskLocationId).toBe(deskA.id);
			expect(result[0].claimsCount).toBe(3);
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
			await insertWorkflowStageSnapshot(db, {
				client_id: clientA.id,
				desk_location_id: deskA.id,
				snapshot_date: '2026-01-10',
				claims_count: 11,
				claims_breaching_sla: 1,
			});

			// Control: client B has its own snapshot in range
			const deskTypeB = await createTestDeskLocationType(db, { client_id: clientB.id });
			const deskB = await createTestDeskLocation(db, {
				client_id: clientB.id,
				desk_location_type_id: deskTypeB.id,
			});
			await insertWorkflowStageSnapshot(db, {
				client_id: clientB.id,
				desk_location_id: deskB.id,
				snapshot_date: '2026-01-10',
				claims_count: 22,
				claims_breaching_sla: 0,
			});

			const ctxB = createTestContext(db, {
				id: userB.id,
				client_id: clientB.id,
				email: userB.email,
				role: 'Admin',
			});

			const result = await getWorkflowStageMetrics(ctxB, {
				startDate: '2026-01-01',
				endDate: '2026-01-31',
			});

			expect(result).toHaveLength(1);
			expect(result[0].deskLocationId).toBe(deskB.id);
			expect(result[0].claimsCount).toBe(22);
		});
	});
});
