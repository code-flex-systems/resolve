import { Kysely, sql } from 'kysely';

/**
 * Migration: add_workflow_analytics_schema
 * Created: 2026-01-28
 *
 * Creates the analytics schema and Tier 1 rollup table:
 *   - analytics schema (separate from main application schema)
 *   - analytics.daily_workflow_stage_snapshot - End-of-day claim distribution across workflow stages
 *
 * This table is populated by nightly batch jobs and supports management dashboards
 * with "data through yesterday" semantics.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// ========================================================================
	// 1. CREATE ANALYTICS SCHEMA
	// ========================================================================
	await sql`CREATE SCHEMA IF NOT EXISTS analytics`.execute(db);

	// ========================================================================
	// 2. DAILY WORKFLOW STAGE SNAPSHOT
	// ========================================================================
	// Purpose:
	//   Captures end-of-day snapshot of claim distribution and timing across
	//   workflow stages (desk locations). Enables trend analysis of workflow
	//   efficiency over time.
	//
	// Use Cases:
	//   - Stage occupancy trends
	//   - Average time-in-stage tracking
	//   - SLA breach trends
	//
	// Note:
	//   - claims_count: Active claims at this location at end of day
	//   - avg/median_hours_in_stage: For claims currently at this location
	//   - claims_breaching_sla: Count of claims past their SLA threshold
	//
	// Staleness: 24 hours.
	await sql`
		CREATE TABLE analytics.daily_workflow_stage_snapshot (
			id SERIAL PRIMARY KEY,
			client_id UUID NOT NULL REFERENCES client(id),
			snapshot_date DATE NOT NULL,
			desk_location_id INTEGER NOT NULL REFERENCES desk_location(id),
			claims_count INTEGER NOT NULL DEFAULT 0,
			avg_hours_in_stage NUMERIC,
			median_hours_in_stage NUMERIC,
			claims_breaching_sla INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT uq_daily_workflow_stage_snapshot
				UNIQUE (client_id, snapshot_date, desk_location_id)
		)
	`.execute(db);

	// Index for stage queries with date range filter
	await sql`
		CREATE INDEX idx_daily_workflow_stage_snapshot_lookup
		ON analytics.daily_workflow_stage_snapshot (client_id, snapshot_date)
	`.execute(db);

	// Index for single-location trend queries
	await sql`
		CREATE INDEX idx_daily_workflow_stage_snapshot_location
		ON analytics.daily_workflow_stage_snapshot (client_id, desk_location_id, snapshot_date)
	`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	await sql`DROP TABLE IF EXISTS analytics.daily_workflow_stage_snapshot`.execute(db);
	// Note: We don't drop the analytics schema as other tables may depend on it
}
