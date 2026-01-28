import type { ProtectedContext } from '@/server/trpc/trpc';
import { sql } from 'kysely';
import { WorkflowThresholdType } from '@/config/enums';

/**
 * Workflow Analytics Refresh Queries
 *
 * These queries populate the analytics rollup tables. They should be run:
 *   - Nightly batch job: Run after midnight for previous day's data
 *   - Backfill: Run in a loop for historical dates
 *
 * All queries use UPSERT (ON CONFLICT DO UPDATE) for idempotency.
 * Re-running a query for the same date will update existing records.
 *
 * NOTE: These functions are NOT exposed via router - they're called directly
 * by the nightly job runner.
 */

// ============================================================================
// REFRESH QUERIES
// ============================================================================

/**
 * Refresh daily_workflow_stage_snapshot for a single date.
 *
 * This captures the state of claims at each desk location at end of day,
 * including time-in-stage metrics and SLA breach counts.
 *
 * Dependencies:
 *   - claim_desk_location_transition table must be populated
 *   - workflow_definition and workflow_threshold for SLA lookups
 *
 * Note: Uses Kysely CTEs with INSERT...SELECT...ON CONFLICT pattern.
 * PostgreSQL-specific aggregates (PERCENTILE_CONT, COUNT FILTER) use sql helpers.
 *
 * IMPORTANT: Time calculations use the snapshot boundary (snapshotDate + 1 day)
 * rather than NOW() to ensure historical snapshots represent end-of-day for
 * the requested date. This is critical for accurate backfills and for nightly
 * jobs that may run hours after midnight.
 *
 * @param ctx - Protected context (requires client_id)
 * @param snapshotDate - Date to populate (typically yesterday: CURRENT_DATE - 1)
 * @returns Number of rows affected
 */
export async function refreshDailyWorkflowSnapshot(
	ctx: ProtectedContext,
	snapshotDate: string
): Promise<{ rowsAffected: number }> {
	const clientId = ctx.session.user.client_id;

	const result = await ctx.db
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
		.with('claim_stage_times', (db) =>
			db
				.selectFrom('claim as c')
				.innerJoin('current_transitions as ct', (join) =>
					join
						.onRef('ct.claim_id', '=', 'c.id')
						.onRef('ct.desk_location_id', '=', 'c.desk_location_id')
				)
				.select([
					'c.desk_location_id',
					// Use snapshot boundary (end of day) instead of NOW() for accurate historical snapshots
					sql<number>`EXTRACT(EPOCH FROM ((${snapshotDate}::date + interval '1 day') - ct.entered_at)) / 3600`.as(
						'hours_in_stage'
					),
				])
				.where('c.client_id', '=', clientId)
				.where('c.desk_location_id', 'is not', null)
				.where('c.recovery_status', 'not in', ['recovered', 'closed_no_recovery'])
		)
		.insertInto('analytics.daily_workflow_stage_snapshot')
		.columns([
			'client_id',
			'snapshot_date',
			'desk_location_id',
			'claims_count',
			'avg_hours_in_stage',
			'median_hours_in_stage',
			'claims_breaching_sla',
		])
		.expression((eb) =>
			eb
				.selectFrom('claim_stage_times as cst')
				.leftJoin('location_sla as ls', 'ls.desk_location_id', 'cst.desk_location_id')
				.select([
					sql<string>`${clientId}::uuid`.as('client_id'),
					sql<Date>`${snapshotDate}::date`.as('snapshot_date'),
					'cst.desk_location_id',
					sql<number>`COUNT(*)`.as('claims_count'),
					sql<number>`AVG(cst.hours_in_stage)`.as('avg_hours_in_stage'),
					sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cst.hours_in_stage)`.as(
						'median_hours_in_stage'
					),
					sql<number>`COUNT(*) FILTER (
						WHERE ls.sla_hours IS NOT NULL
						AND cst.hours_in_stage > ls.sla_hours
					)`.as('claims_breaching_sla'),
				])
				.groupBy('cst.desk_location_id')
		)
		.onConflict((oc) =>
			oc.columns(['client_id', 'snapshot_date', 'desk_location_id']).doUpdateSet({
				claims_count: (eb) => eb.ref('excluded.claims_count'),
				avg_hours_in_stage: (eb) => eb.ref('excluded.avg_hours_in_stage'),
				median_hours_in_stage: (eb) => eb.ref('excluded.median_hours_in_stage'),
				claims_breaching_sla: (eb) => eb.ref('excluded.claims_breaching_sla'),
			})
		)
		.execute();

	return { rowsAffected: result.length };
}

/**
 * Get list of dates that need backfilling for workflow snapshots.
 *
 * Returns dates from the earliest claim to yesterday that don't have
 * snapshot data yet.
 *
 * Note: Uses raw SQL for PostgreSQL's generate_series() function which has
 * no Kysely equivalent. The rest of the query references the analytics
 * snapshot table which is in our DB types.
 *
 * @param ctx - Protected context
 * @returns Array of date strings (YYYY-MM-DD format)
 */
export async function getMissingSnapshotDates(
	ctx: ProtectedContext
): Promise<string[]> {
	const clientId = ctx.session.user.client_id;

	// Raw SQL needed for generate_series() which is PostgreSQL-specific
	const result = await sql<{ missing_date: Date }>`
		WITH date_range AS (
			SELECT generate_series(
				(SELECT COALESCE(MIN(created_at)::date, CURRENT_DATE - 30) FROM claim WHERE client_id = ${clientId}),
				CURRENT_DATE - 1,
				'1 day'::interval
			)::date AS snapshot_date
		),
		existing_dates AS (
			SELECT DISTINCT snapshot_date
			FROM analytics.daily_workflow_stage_snapshot
			WHERE client_id = ${clientId}
		)
		SELECT dr.snapshot_date AS missing_date
		FROM date_range dr
		LEFT JOIN existing_dates ed ON ed.snapshot_date = dr.snapshot_date
		WHERE ed.snapshot_date IS NULL
		ORDER BY dr.snapshot_date ASC
	`.execute(ctx.db);

	return result.rows.map((row) => row.missing_date.toISOString().split('T')[0]);
}

/**
 * Backfill workflow snapshots for all missing dates.
 *
 * Runs refreshDailyWorkflowSnapshot for each missing date.
 * Use with caution - may take significant time for large date ranges.
 *
 * @param ctx - Protected context
 * @returns Summary of backfill operation
 */
export async function backfillWorkflowSnapshots(
	ctx: ProtectedContext
): Promise<{ datesProcessed: number; totalRowsAffected: number }> {
	const missingDates = await getMissingSnapshotDates(ctx);

	let totalRowsAffected = 0;

	for (const date of missingDates) {
		const { rowsAffected } = await refreshDailyWorkflowSnapshot(ctx, date);
		totalRowsAffected += rowsAffected;
	}

	return {
		datesProcessed: missingDates.length,
		totalRowsAffected,
	};
}
