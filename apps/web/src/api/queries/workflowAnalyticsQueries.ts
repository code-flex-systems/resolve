import type { ProtectedContext } from '@/server/trpc/trpc';
import { sql } from 'kysely';
import { WorkflowThresholdType } from '@/config/enums';

// ============================================================================
// TIER 0 OPERATIONAL QUERIES
// ============================================================================

/**
 * Query 0.1: Desk Location Queue Depth
 *
 * Returns claims count and SLA status breakdown by desk location.
 * Uses CTEs to resolve location-specific vs global SLA thresholds and
 * to determine the latest transition (current location) for each claim.
 */
export async function getDeskLocationQueueDepth(
	ctx: ProtectedContext,
	deskLocationId?: number
) {
	const clientId = ctx.session.user.client_id;

	const rows = await ctx.db
		.with('location_sla', (db) =>
			db
				.selectFrom('desk_location as dl')
				.leftJoin('workflow_definition as wd_specific', (join) =>
					join
						.onRef('wd_specific.desk_location_id', '=', 'dl.id')
						.onRef('wd_specific.client_id', '=', 'dl.client_id')
						.on('wd_specific.is_active', '=', true)
						.on('wd_specific.deleted_at', 'is', null)
				)
				.leftJoin('workflow_definition as wd_global', (join) =>
					join
						.on('wd_global.desk_location_id', 'is', null)
						.onRef('wd_global.client_id', '=', 'dl.client_id')
						.on('wd_global.is_active', '=', true)
						.on('wd_global.deleted_at', 'is', null)
				)
				.leftJoin('workflow_threshold as wt', (join) =>
					join
						.on(
							'wt.workflow_definition_id',
							'=',
							sql<number>`COALESCE(wd_specific.id, wd_global.id)`
						)
						.on('wt.threshold_type', '=', WorkflowThresholdType.LOCATION_AGE)
						.on('wt.is_active', '=', true)
						.on('wt.deleted_at', 'is', null)
				)
				.select(['dl.id as desk_location_id', 'wt.threshold_value as sla_hours'])
				.distinctOn(['dl.id'])
				.where('dl.client_id', '=', clientId)
				.where('dl.is_active', '=', true)
				.where('dl.deleted_at', 'is', null)
				.orderBy('dl.id')
		)
		.with('current_transitions', (db) =>
			db
				.selectFrom('claim_desk_location_transition as cdlt')
				.select(['cdlt.claim_id', 'cdlt.desk_location_id', 'cdlt.entered_at'])
				.distinctOn(['cdlt.claim_id'])
				.where('cdlt.client_id', '=', clientId)
				.where('cdlt.deleted_at', 'is', null)
				.orderBy('cdlt.claim_id')
				.orderBy('cdlt.entered_at', 'desc')
		)
		.with('claim_age', (db) =>
			db
				.selectFrom('claim as c')
				.innerJoin('current_transitions as ct', (join) =>
					join
						.onRef('ct.claim_id', '=', 'c.id')
						.onRef('ct.desk_location_id', '=', 'c.desk_location_id')
				)
				.select([
					'c.id as claim_id',
					'c.desk_location_id',
					sql<number>`EXTRACT(EPOCH FROM (NOW() - ct.entered_at)) / 3600`.as(
						'hours_in_stage'
					),
				])
				.where('c.client_id', '=', clientId)
				.where('c.desk_location_id', 'is not', null)
		)
		.selectFrom('desk_location as dl')
		.innerJoin('desk_location_type as dlt', (join) =>
			join
				.onRef('dlt.id', '=', 'dl.desk_location_type_id')
				.onRef('dlt.client_id', '=', 'dl.client_id')
		)
		.leftJoin('location_sla as ls', 'ls.desk_location_id', 'dl.id')
		.leftJoin('claim_age as ca', 'ca.desk_location_id', 'dl.id')
		.select([
			'dl.id as desk_location_id',
			'dl.name as desk_location_name',
			'dlt.id as desk_location_type_id',
			'dlt.name as desk_location_type_name',
			sql<string>`COUNT(ca.claim_id)`.as('total_claims'),
			'ls.sla_hours',
			sql<string | null>`CASE WHEN ls.sla_hours IS NOT NULL THEN
				COUNT(ca.claim_id) FILTER (WHERE ca.hours_in_stage <= ls.sla_hours * 0.75)
			END`.as('healthy'),
			sql<string | null>`CASE WHEN ls.sla_hours IS NOT NULL THEN
				COUNT(ca.claim_id) FILTER (
					WHERE ca.hours_in_stage > ls.sla_hours * 0.75
					AND ca.hours_in_stage <= ls.sla_hours
				)
			END`.as('warning'),
			sql<string | null>`CASE WHEN ls.sla_hours IS NOT NULL THEN
				COUNT(ca.claim_id) FILTER (WHERE ca.hours_in_stage > ls.sla_hours)
			END`.as('breached'),
		])
		.where('dl.client_id', '=', clientId)
		.where('dl.is_active', '=', true)
		.where('dl.deleted_at', 'is', null)
		.$if(deskLocationId !== undefined, (qb) =>
			qb.where('dl.id', '=', deskLocationId!)
		)
		.groupBy(['dl.id', 'dl.name', 'dlt.id', 'dlt.name', 'ls.sla_hours'])
		.orderBy(
			sql`COALESCE(COUNT(ca.claim_id) FILTER (WHERE ca.hours_in_stage > ls.sla_hours), 0) DESC`
		)
		.orderBy(
			sql`COALESCE(COUNT(ca.claim_id) FILTER (WHERE ca.hours_in_stage > ls.sla_hours * 0.75 AND ca.hours_in_stage <= ls.sla_hours), 0) DESC`
		)
		.orderBy(sql`COUNT(ca.claim_id) DESC`)
		.execute();

	return rows.map((row) => ({
		deskLocationId: row.desk_location_id,
		deskLocationName: row.desk_location_name,
		deskLocationTypeId: row.desk_location_type_id,
		deskLocationTypeName: row.desk_location_type_name,
		totalClaims: parseInt(row.total_claims),
		slaHours: row.sla_hours,
		healthy: row.healthy ? parseInt(row.healthy) : null,
		warning: row.warning ? parseInt(row.warning) : null,
		breached: row.breached ? parseInt(row.breached) : null,
	}));
}

/**
 * Query 0.2: Desk Location Work Units Load
 *
 * Returns task counts and utilization ratio by desk location.
 */
export async function getDeskLocationWorkLoad(
	ctx: ProtectedContext,
	deskLocationId?: number
) {
	const clientId = ctx.session.user.client_id;

	const rows = await ctx.db
		.selectFrom('desk_location as dl')
		.innerJoin('desk_location_type as dlt', (join) =>
			join
				.onRef('dlt.id', '=', 'dl.desk_location_type_id')
				.onRef('dlt.client_id', '=', 'dl.client_id')
		)
		.leftJoin('task as t', (join) =>
			join
				.onRef('t.desk_location_id', '=', 'dl.id')
				.onRef('t.client_id', '=', 'dl.client_id')
				.on('t.status', 'in', ['pending', 'in_progress'])
		)
		.select([
			'dl.id as desk_location_id',
			'dl.name as desk_location_name',
			'dlt.id as desk_location_type_id',
			'dlt.name as desk_location_type_name',
			'dl.daily_work_units as capacity',
			sql<string>`COALESCE(SUM(t.work_units), 0)`.as('current_load'),
			sql<string | null>`CASE
				WHEN dl.daily_work_units IS NOT NULL AND dl.daily_work_units > 0 THEN
					COALESCE(SUM(t.work_units), 0)::numeric / dl.daily_work_units
				ELSE NULL
			END`.as('utilization_ratio'),
		])
		.where('dl.client_id', '=', clientId)
		.where('dl.is_active', '=', true)
		.where('dl.deleted_at', 'is', null)
		.$if(deskLocationId !== undefined, (qb) =>
			qb.where('dl.id', '=', deskLocationId!)
		)
		.groupBy(['dl.id', 'dl.name', 'dlt.id', 'dlt.name', 'dl.daily_work_units'])
		.orderBy(sql`utilization_ratio DESC NULLS LAST`)
		.execute();

	return rows.map((row) => ({
		deskLocationId: row.desk_location_id,
		deskLocationName: row.desk_location_name,
		deskLocationTypeId: row.desk_location_type_id,
		deskLocationTypeName: row.desk_location_type_name,
		capacity: row.capacity,
		currentLoad: parseInt(row.current_load),
		utilizationRatio: row.utilization_ratio
			? parseFloat(row.utilization_ratio)
			: null,
	}));
}

/**
 * Query 0.3: User Workload and Capacity
 *
 * Returns per-user task counts and capacity metrics.
 */
export async function getUserWorkloadAndCapacity(
	ctx: ProtectedContext,
	options?: {
		userId?: string;
		deskLocationId?: number;
		userDailyWorkUnits?: number;
	}
) {
	const clientId = ctx.session.user.client_id;
	const userDailyWorkUnits = options?.userDailyWorkUnits ?? 96; // Default: 8 hours at 5 min/unit

	const rows = await ctx.db
		.with('user_load', (db) =>
			db
				.selectFrom('task as t')
				.select([
					't.claimed_by as user_id',
					sql<string>`COUNT(*)`.as('tasks_claimed'),
					sql<string>`COALESCE(SUM(t.work_units), 0)`.as('work_units_claimed'),
				])
				.where('t.client_id', '=', clientId)
				.where('t.status', '=', 'in_progress')
				.where('t.claimed_by', 'is not', null)
				.groupBy('t.claimed_by')
		)
		.with('user_pending', (db) => {
			let query = db
				.selectFrom('user_desk_location as udl')
				.innerJoin('task as t', (join) =>
					join
						.onRef('t.desk_location_id', '=', 'udl.desk_location_id')
						.on('t.client_id', '=', clientId)
						.on('t.status', '=', 'pending')
						.on('t.claimed_by', 'is', null)
				)
				.select([
					'udl.user_id',
					sql<string>`COUNT(DISTINCT t.id)`.as('tasks_available'),
				])
				.where('udl.removed_at', 'is', null);

			if (options?.deskLocationId !== undefined) {
				query = query.where('udl.desk_location_id', '=', options.deskLocationId);
			}

			return query.groupBy('udl.user_id');
		})
		.selectFrom('users as u')
		.leftJoin('user_load as ul', 'ul.user_id', 'u.id')
		.leftJoin('user_pending as up', 'up.user_id', 'u.id')
		.select([
			'u.id as user_id',
			'u.first as first_name',
			'u.last as last_name',
			'u.role',
			sql<number>`${userDailyWorkUnits}`.as('capacity'),
			sql<string>`COALESCE(ul.work_units_claimed, 0)`.as('current_load'),
			sql<string>`COALESCE(ul.tasks_claimed, 0)`.as('tasks_in_progress'),
			sql<string>`COALESCE(up.tasks_available, 0)`.as('tasks_available_in_queue'),
			sql<string | null>`CASE
				WHEN ${userDailyWorkUnits} > 0 THEN
					COALESCE(ul.work_units_claimed, 0)::numeric / ${userDailyWorkUnits}
				ELSE NULL
			END`.as('utilization_ratio'),
		])
		.where('u.client_id', '=', clientId)
		.where('u.disabled', '=', false)
		.$if(options?.userId !== undefined, (qb) =>
			qb.where('u.id', '=', options!.userId!)
		)
		.orderBy(sql`utilization_ratio DESC NULLS LAST`)
		.execute();

	return rows.map((row) => ({
		userId: row.user_id,
		firstName: row.first_name,
		lastName: row.last_name,
		role: row.role,
		capacity: row.capacity,
		currentLoad: parseInt(row.current_load),
		tasksInProgress: parseInt(row.tasks_in_progress),
		tasksAvailableInQueue: parseInt(row.tasks_available_in_queue),
		utilizationRatio: row.utilization_ratio
			? parseFloat(row.utilization_ratio)
			: null,
	}));
}

/**
 * Query 0.5: Claims Approaching SLA Breach
 *
 * Returns claims ordered by hours remaining until SLA breach.
 * Only includes claims where hours_remaining < sla_hours * 0.5 (warning+).
 */
export async function getClaimsApproachingSLABreach(
	ctx: ProtectedContext,
	limit: number = 20
) {
	const clientId = ctx.session.user.client_id;

	const rows = await ctx.db
		.with('location_sla', (db) =>
			db
				.selectFrom('desk_location as dl')
				.leftJoin('workflow_definition as wd_specific', (join) =>
					join
						.onRef('wd_specific.desk_location_id', '=', 'dl.id')
						.onRef('wd_specific.client_id', '=', 'dl.client_id')
						.on('wd_specific.is_active', '=', true)
						.on('wd_specific.deleted_at', 'is', null)
				)
				.leftJoin('workflow_definition as wd_global', (join) =>
					join
						.on('wd_global.desk_location_id', 'is', null)
						.onRef('wd_global.client_id', '=', 'dl.client_id')
						.on('wd_global.is_active', '=', true)
						.on('wd_global.deleted_at', 'is', null)
				)
				.leftJoin('workflow_threshold as wt', (join) =>
					join
						.on(
							'wt.workflow_definition_id',
							'=',
							sql<number>`COALESCE(wd_specific.id, wd_global.id)`
						)
						.on('wt.threshold_type', '=', WorkflowThresholdType.LOCATION_AGE)
						.on('wt.is_active', '=', true)
						.on('wt.deleted_at', 'is', null)
				)
				.select(['dl.id as desk_location_id', 'wt.threshold_value as sla_hours'])
				.distinctOn(['dl.id'])
				.where('dl.client_id', '=', clientId)
				.where('dl.is_active', '=', true)
				.where('dl.deleted_at', 'is', null)
				.orderBy('dl.id')
		)
		.with('current_transitions', (db) =>
			db
				.selectFrom('claim_desk_location_transition as cdlt')
				.select(['cdlt.claim_id', 'cdlt.desk_location_id', 'cdlt.entered_at'])
				.distinctOn(['cdlt.claim_id'])
				.where('cdlt.client_id', '=', clientId)
				.where('cdlt.deleted_at', 'is', null)
				.orderBy('cdlt.claim_id')
				.orderBy('cdlt.entered_at', 'desc')
		)
		.with('claim_sla_status', (db) =>
			db
				.selectFrom('claim as c')
				.innerJoin('current_transitions as ct', (join) =>
					join
						.onRef('ct.claim_id', '=', 'c.id')
						.onRef('ct.desk_location_id', '=', 'c.desk_location_id')
				)
				.innerJoin('desk_location as dl', (join) =>
					join
						.onRef('dl.id', '=', 'c.desk_location_id')
						.onRef('dl.client_id', '=', 'c.client_id')
				)
				.innerJoin('location_sla as ls', (join) =>
					join
						.onRef('ls.desk_location_id', '=', 'dl.id')
						.on('ls.sla_hours', 'is not', null)
				)
				.select([
					'c.id as claim_id',
					'c.claim_number',
					'c.desk_location_id',
					'c.recovery_status',
					'c.client_adjuster',
					'dl.name as desk_location_name',
					'ct.entered_at as stage_entered_at',
					'ls.sla_hours',
					sql<number>`EXTRACT(EPOCH FROM (NOW() - ct.entered_at)) / 3600`.as(
						'hours_in_stage'
					),
					sql<number>`ls.sla_hours - (EXTRACT(EPOCH FROM (NOW() - ct.entered_at)) / 3600)`.as(
						'hours_remaining'
					),
				])
				.where('c.client_id', '=', clientId)
				.where('c.desk_location_id', 'is not', null)
				.where('c.recovery_status', 'not in', [
					'closed_no_recovery',
					'recovered',
				])
		)
		.selectFrom('claim_sla_status as css')
		.leftJoin('users as u', (join) =>
			join
				.onRef('u.id', '=', 'css.client_adjuster')
				.on('u.client_id', '=', clientId)
		)
		.select([
			'css.claim_id',
			'css.claim_number',
			'css.desk_location_id',
			'css.desk_location_name',
			'css.recovery_status',
			'u.first as adjuster_first_name',
			'u.last as adjuster_last_name',
			'css.stage_entered_at',
			'css.hours_in_stage',
			'css.sla_hours',
			'css.hours_remaining',
			sql<string>`CASE
				WHEN css.hours_remaining < 0 THEN 'breached'
				WHEN css.hours_remaining < css.sla_hours * 0.25 THEN 'critical'
				WHEN css.hours_remaining < css.sla_hours * 0.5 THEN 'warning'
				ELSE 'healthy'
			END`.as('sla_status'),
		])
		.where(sql<boolean>`css.hours_remaining < css.sla_hours * 0.5`)
		.orderBy('css.hours_remaining', 'asc')
		.limit(limit)
		.execute();

	return rows.map((row) => ({
		claimId: row.claim_id,
		claimNumber: row.claim_number,
		deskLocationId: row.desk_location_id,
		deskLocationName: row.desk_location_name,
		recoveryStatus: row.recovery_status,
		adjusterFirstName: row.adjuster_first_name,
		adjusterLastName: row.adjuster_last_name,
		stageEnteredAt: row.stage_entered_at,
		hoursInStage: Number(row.hours_in_stage),
		slaHours: row.sla_hours!,
		hoursRemaining: Number(row.hours_remaining),
		slaStatus: row.sla_status as 'breached' | 'critical' | 'warning' | 'healthy',
	}));
}

/**
 * Query 0.6: Task Throughput Today
 *
 * Returns completed task counts for today, grouped by desk location and user.
 */
export async function getTaskThroughputToday(
	ctx: ProtectedContext,
	options?: {
		deskLocationId?: number;
		userId?: string;
	}
) {
	const clientId = ctx.session.user.client_id;

	const rows = await ctx.db
		.selectFrom('task as t')
		.innerJoin('desk_location as dl', (join) =>
			join
				.onRef('dl.id', '=', 't.desk_location_id')
				.onRef('dl.client_id', '=', 't.client_id')
		)
		.leftJoin('users as u', (join) =>
			join
				.onRef('u.id', '=', 't.completed_by')
				.onRef('u.client_id', '=', 't.client_id')
		)
		.select([
			'dl.id as desk_location_id',
			'dl.name as desk_location_name',
			't.completed_by as user_id',
			'u.first as user_first_name',
			'u.last as user_last_name',
			sql<string>`COUNT(*)`.as('tasks_completed'),
			sql<string>`SUM(t.work_units)`.as('work_units_completed'),
		])
		.where('t.client_id', '=', clientId)
		.where('t.status', '=', 'completed')
		.where('t.completed_at', '>=', sql<Date>`CURRENT_DATE`)
		.where('t.completed_at', '<', sql<Date>`CURRENT_DATE + INTERVAL '1 day'`)
		.$if(options?.deskLocationId !== undefined, (qb) =>
			qb.where('t.desk_location_id', '=', options!.deskLocationId!)
		)
		.$if(options?.userId !== undefined, (qb) =>
			qb.where('t.completed_by', '=', options!.userId!)
		)
		.groupBy(['dl.id', 'dl.name', 't.completed_by', 'u.first', 'u.last'])
		.orderBy('dl.name')
		.orderBy(sql`SUM(t.work_units) DESC`)
		.execute();

	return rows.map((row) => ({
		deskLocationId: row.desk_location_id,
		deskLocationName: row.desk_location_name,
		userId: row.user_id,
		userFirstName: row.user_first_name,
		userLastName: row.user_last_name,
		tasksCompleted: parseInt(row.tasks_completed),
		workUnitsCompleted: parseInt(row.work_units_completed || '0'),
	}));
}

/**
 * Query 0.4: Deadline Status Overview
 *
 * Returns counts of deadlines by status bucket: overdue, due today, next 7 days,
 * completed, and cancelled. Supports optional filters for dashboard views.
 */
export async function getDeadlineStatusOverview(
	ctx: ProtectedContext,
	options?: {
		deadlineType?: string;
		createdBy?: string;
		claimId?: number;
	}
) {
	const clientId = ctx.session.user.client_id;

	const result = await ctx.db
		.selectFrom('deadline as d')
		.select([
			sql<string>`COUNT(*) FILTER (
				WHERE d.deadline_date < CURRENT_DATE
				AND d.status = 'pending'
			)`.as('overdue'),
			sql<string>`COUNT(*) FILTER (
				WHERE d.deadline_date = CURRENT_DATE
				AND d.status = 'pending'
			)`.as('due_today'),
			sql<string>`COUNT(*) FILTER (
				WHERE d.deadline_date > CURRENT_DATE
				AND d.deadline_date <= CURRENT_DATE + INTERVAL '7 days'
				AND d.status = 'pending'
			)`.as('next_7_days'),
			sql<string>`COUNT(*) FILTER (WHERE d.status = 'completed')`.as(
				'completed'
			),
			sql<string>`COUNT(*) FILTER (WHERE d.status = 'cancelled')`.as(
				'cancelled'
			),
		])
		.where('d.client_id', '=', clientId)
		.$if(options?.deadlineType !== undefined, (qb) =>
			qb.where('d.deadline_type', '=', options!.deadlineType!)
		)
		.$if(options?.createdBy !== undefined, (qb) =>
			qb.where('d.created_by', '=', options!.createdBy!)
		)
		.$if(options?.claimId !== undefined, (qb) =>
			qb.where('d.claim_id', '=', options!.claimId!)
		)
		.executeTakeFirstOrThrow();

	return {
		overdue: parseInt(result.overdue),
		dueToday: parseInt(result.due_today),
		next7Days: parseInt(result.next_7_days),
		completed: parseInt(result.completed),
		cancelled: parseInt(result.cancelled),
	};
}

// ============================================================================
// CONFIGURATION HEALTH CHECK QUERIES
// ============================================================================

/**
 * Desk locations without workflow definition (no SLA tracking possible).
 */
export async function getDeskLocationsWithoutWorkflow(ctx: ProtectedContext) {
	const clientId = ctx.session.user.client_id;

	const rows = await ctx.db
		.selectFrom('desk_location as dl')
		.innerJoin('desk_location_type as dlt', (join) =>
			join
				.onRef('dlt.id', '=', 'dl.desk_location_type_id')
				.onRef('dlt.client_id', '=', 'dl.client_id')
		)
		.leftJoin('workflow_definition as wd', (join) =>
			join
				.onRef('wd.desk_location_id', '=', 'dl.id')
				.onRef('wd.client_id', '=', 'dl.client_id')
				.on('wd.is_active', '=', true)
				.on('wd.deleted_at', 'is', null)
		)
		.select([
			'dl.id as desk_location_id',
			'dl.name as desk_location_name',
			'dlt.name as desk_location_type_name',
			'dl.created_at',
		])
		.where('dl.client_id', '=', clientId)
		.where('dl.is_active', '=', true)
		.where('dl.deleted_at', 'is', null)
		.where('wd.id', 'is', null)
		.where((eb) =>
			eb.not(
				eb.exists(
					eb
						.selectFrom('workflow_definition as wd_global')
						.select(sql.raw('1').as('_'))
						.where('wd_global.client_id', '=', eb.ref('dl.client_id'))
						.where('wd_global.desk_location_id', 'is', null)
						.where('wd_global.is_active', '=', true)
						.where('wd_global.deleted_at', 'is', null)
				)
			)
		)
		.orderBy('dlt.name')
		.orderBy('dl.name')
		.execute();

	return rows.map((row) => ({
		deskLocationId: row.desk_location_id,
		deskLocationName: row.desk_location_name,
		deskLocationTypeName: row.desk_location_type_name,
		createdAt: row.created_at,
	}));
}

/**
 * Workflows without location_age threshold (no SLA metrics possible).
 */
export async function getWorkflowsWithoutLocationAgeThreshold(
	ctx: ProtectedContext
) {
	const clientId = ctx.session.user.client_id;

	const rows = await ctx.db
		.selectFrom('workflow_definition as wd')
		.leftJoin('desk_location as dl', (join) =>
			join
				.onRef('dl.id', '=', 'wd.desk_location_id')
				.onRef('dl.client_id', '=', 'wd.client_id')
		)
		.leftJoin('workflow_threshold as wt', (join) =>
			join
				.onRef('wt.workflow_definition_id', '=', 'wd.id')
				.on('wt.threshold_type', '=', WorkflowThresholdType.LOCATION_AGE)
				.on('wt.is_active', '=', true)
				.on('wt.deleted_at', 'is', null)
		)
		.select([
			'wd.id as workflow_definition_id',
			'wd.name as workflow_name',
			'dl.name as desk_location_name',
			sql<string>`CASE WHEN wd.desk_location_id IS NULL THEN 'Global' ELSE 'Location-specific' END`.as(
				'workflow_scope'
			),
		])
		.where('wd.client_id', '=', clientId)
		.where('wd.is_active', '=', true)
		.where('wd.deleted_at', 'is', null)
		.where('wt.id', 'is', null)
		.orderBy('wd.name')
		.execute();

	return rows.map((row) => ({
		workflowDefinitionId: row.workflow_definition_id,
		workflowName: row.workflow_name,
		deskLocationName: row.desk_location_name,
		workflowScope: row.workflow_scope as 'Global' | 'Location-specific',
	}));
}

/**
 * Desk locations missing capacity configuration (no utilization tracking possible).
 */
export async function getDeskLocationsMissingCapacity(ctx: ProtectedContext) {
	const clientId = ctx.session.user.client_id;

	const rows = await ctx.db
		.selectFrom('desk_location as dl')
		.innerJoin('desk_location_type as dlt', (join) =>
			join
				.onRef('dlt.id', '=', 'dl.desk_location_type_id')
				.onRef('dlt.client_id', '=', 'dl.client_id')
		)
		.select([
			'dl.id as desk_location_id',
			'dl.name as desk_location_name',
			'dlt.name as desk_location_type_name',
		])
		.where('dl.client_id', '=', clientId)
		.where('dl.is_active', '=', true)
		.where('dl.deleted_at', 'is', null)
		.where('dl.daily_work_units', 'is', null)
		.orderBy('dlt.name')
		.orderBy('dl.name')
		.execute();

	return rows.map((row) => ({
		deskLocationId: row.desk_location_id,
		deskLocationName: row.desk_location_name,
		deskLocationTypeName: row.desk_location_type_name,
	}));
}

/**
 * Users without desk location assignments (cannot see or work on tasks).
 */
export async function getUsersWithoutDeskAssignments(ctx: ProtectedContext) {
	const clientId = ctx.session.user.client_id;

	const rows = await ctx.db
		.selectFrom('users as u')
		.leftJoin('user_desk_location as udl', (join) =>
			join.onRef('udl.user_id', '=', 'u.id').on('udl.removed_at', 'is', null)
		)
		.select([
			'u.id as user_id',
			'u.first',
			'u.last',
			'u.email',
			'u.role',
		])
		.where('u.client_id', '=', clientId)
		.where('u.disabled', '=', false)
		.where('udl.id', 'is', null)
		.orderBy('u.last')
		.orderBy('u.first')
		.execute();

	return rows.map((row) => ({
		userId: row.user_id,
		firstName: row.first,
		lastName: row.last,
		email: row.email,
		role: row.role,
	}));
}

// ============================================================================
// TIER 1 BATCH QUERIES (reads from analytics rollup tables)
// ============================================================================

/**
 * Query 1.6: Workflow Stage Metrics - Time Series
 *
 * Reads from analytics.daily_workflow_stage_snapshot rollup table.
 * Shows stage occupancy and SLA metrics over time.
 */
export async function getWorkflowStageMetrics(
	ctx: ProtectedContext,
	options: {
		startDate: string;
		endDate: string;
		deskLocationTypeId?: number;
		deskLocationId?: number;
	}
) {
	const clientId = ctx.session.user.client_id;

	const rows = await ctx.db
		.selectFrom('analytics.daily_workflow_stage_snapshot as dwss')
		.innerJoin('desk_location as dl', (join) =>
			join
				.onRef('dl.id', '=', 'dwss.desk_location_id')
				.onRef('dl.client_id', '=', 'dwss.client_id')
		)
		.innerJoin('desk_location_type as dlt', (join) =>
			join
				.onRef('dlt.id', '=', 'dl.desk_location_type_id')
				.onRef('dlt.client_id', '=', 'dl.client_id')
		)
		.select([
			'dwss.snapshot_date',
			'dl.id as desk_location_id',
			'dl.name as desk_location_name',
			'dlt.id as desk_location_type_id',
			'dlt.name as desk_location_type_name',
			'dwss.claims_count',
			'dwss.avg_hours_in_stage',
			'dwss.median_hours_in_stage',
			'dwss.claims_breaching_sla',
		])
		.where('dwss.client_id', '=', clientId)
		.where('dwss.snapshot_date', '>=', sql<Date>`${options.startDate}::date`)
		.where('dwss.snapshot_date', '<=', sql<Date>`${options.endDate}::date`)
		.$if(options.deskLocationTypeId !== undefined, (qb) =>
			qb.where('dlt.id', '=', options.deskLocationTypeId!)
		)
		.$if(options.deskLocationId !== undefined, (qb) =>
			qb.where('dwss.desk_location_id', '=', options.deskLocationId!)
		)
		.orderBy('dwss.snapshot_date', 'asc')
		.orderBy('dlt.name')
		.orderBy('dl.name')
		.execute();

	return rows.map((row) => ({
		snapshotDate: row.snapshot_date,
		deskLocationId: row.desk_location_id,
		deskLocationName: row.desk_location_name,
		deskLocationTypeId: row.desk_location_type_id,
		deskLocationTypeName: row.desk_location_type_name,
		claimsCount: row.claims_count,
		avgHoursInStage: row.avg_hours_in_stage
			? parseFloat(String(row.avg_hours_in_stage))
			: null,
		medianHoursInStage: row.median_hours_in_stage
			? parseFloat(String(row.median_hours_in_stage))
			: null,
		claimsBreachingSla: row.claims_breaching_sla,
	}));
}
