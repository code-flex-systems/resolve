import type { ProtectedContext } from '@/server/trpc/trpc';
import * as workflowAnalyticsQueries from '@/api/queries/workflowAnalyticsQueries';
import { generateWorkflowSuggestions, serializeSuggestion } from '@/lib/workflow/suggestions';
import { sql } from 'kysely';
import { SuggestionStatus } from '@/config/enums';

// ============================================================================
// TIER 0 OPERATIONAL QUERIES
// ============================================================================

/**
 * Get desk location queue depth with SLA status breakdown.
 */
export async function getDeskLocationQueueDepth(
	ctx: ProtectedContext,
	input: { deskLocationId?: string }
) {
	return await workflowAnalyticsQueries.getDeskLocationQueueDepth(ctx, input.deskLocationId);
}

/**
 * Get desk location workload and utilization metrics.
 */
export async function getDeskLocationWorkLoad(
	ctx: ProtectedContext,
	input: { deskLocationId?: string }
) {
	return await workflowAnalyticsQueries.getDeskLocationWorkLoad(ctx, input.deskLocationId);
}

/**
 * Get user workload and capacity metrics.
 */
export async function getUserWorkloadAndCapacity(
	ctx: ProtectedContext,
	input: { userId?: string; deskLocationId?: string }
) {
	return await workflowAnalyticsQueries.getUserWorkloadAndCapacity(ctx, {
		userId: input.userId,
		deskLocationId: input.deskLocationId,
	});
}

/**
 * Get claims approaching or past SLA breach.
 */
export async function getClaimsApproachingSLABreach(
	ctx: ProtectedContext,
	input: { limit: number }
) {
	return await workflowAnalyticsQueries.getClaimsApproachingSLABreach(ctx, input.limit);
}

/**
 * Get task throughput for today.
 */
export async function getTaskThroughputToday(
	ctx: ProtectedContext,
	input: { deskLocationId?: string; userId?: string }
) {
	return await workflowAnalyticsQueries.getTaskThroughputToday(ctx, {
		deskLocationId: input.deskLocationId,
		userId: input.userId,
	});
}

/**
 * Get deadline status overview with counts by status bucket.
 */
export async function getDeadlineStatusOverview(
	ctx: ProtectedContext,
	input: { deadlineType?: string; createdBy?: string; claimId?: string }
) {
	return await workflowAnalyticsQueries.getDeadlineStatusOverview(ctx, {
		deadlineType: input.deadlineType,
		createdBy: input.createdBy,
		claimId: input.claimId,
	});
}

// ============================================================================
// CONFIGURATION HEALTH CHECK
// ============================================================================

/**
 * Get combined configuration health check results.
 * Surfaces workflow configuration gaps as admin action items.
 */
export async function getConfigurationHealthCheck(ctx: ProtectedContext) {
	const [
		locationsWithoutWorkflow,
		workflowsWithoutThreshold,
		locationsMissingCapacity,
		usersWithoutAssignments,
	] = await Promise.all([
		workflowAnalyticsQueries.getDeskLocationsWithoutWorkflow(ctx),
		workflowAnalyticsQueries.getWorkflowsWithoutLocationAgeThreshold(ctx),
		workflowAnalyticsQueries.getDeskLocationsMissingCapacity(ctx),
		workflowAnalyticsQueries.getUsersWithoutDeskAssignments(ctx),
	]);

	return {
		locationsWithoutWorkflow,
		workflowsWithoutThreshold,
		locationsMissingCapacity,
		usersWithoutAssignments,
	};
}

// ============================================================================
// WORKFLOW SUGGESTIONS
// ============================================================================

/**
 * Fetch current load/assignment data and run the suggestion algorithm.
 * Persists suggestions to the database with expiration and returns them with IDs.
 */
export async function getWorkflowSuggestions(ctx: ProtectedContext) {
	const clientId = ctx.session.user.client_id!;

	return await ctx.db.transaction().execute(async (trx) => {
		// 1. Fetch ignored and hidden desk location IDs
		// Both are excluded from the algorithm so they don't regenerate new pending rows.
		// Ignored suggestions are appended back to the response; hidden ones are not.
		const [ignoredRows, hiddenRows] = await Promise.all([
			trx
				.selectFrom('workflow_suggestion')
				.where('client_id', '=', clientId)
				.where('status', '=', SuggestionStatus.IGNORED)
				.where('expires_at', '>', new Date())
				.select(['desk_location_id', 'id', 'suggestion_data'])
				.execute(),
			trx
				.selectFrom('workflow_suggestion')
				.where('client_id', '=', clientId)
				.where('status', '=', SuggestionStatus.HIDDEN)
				.where('expires_at', '>', new Date())
				.select(['desk_location_id'])
				.execute(),
		]);

		const excludedDeskLocationIds = new Set([
			...ignoredRows.map((r) => r.desk_location_id),
			...hiddenRows.map((r) => r.desk_location_id),
		]);

		// 2. Fetch suggestion input (within transaction for consistency) and filter out ignored/hidden desk locations
		const { locations, assignments, currentTasks } =
			await workflowAnalyticsQueries.getSuggestionInput(ctx, trx);

		const filteredLocations = locations.filter(
			(loc) => !excludedDeskLocationIds.has(loc.deskLocationId)
		);

		// 3. Run algorithm on filtered locations
		const suggestion = generateWorkflowSuggestions(filteredLocations, assignments, currentTasks);

		// 4. Upsert suggestions (reuse existing rows via partial unique index on client_id + desk_location_id WHERE status='pending')
		const STALE_TIME_HOURS = 24;
		const expiresAt = new Date(Date.now() + STALE_TIME_HOURS * 60 * 60 * 1000);

		const currentBreachDeskLocationIds = suggestion.resolutions.map(
			(r) => r.breach.deskLocationId
		);

		const suggestionIds = await Promise.all(
			suggestion.resolutions.map(async (resolution) => {
				const serializedData = JSON.parse(JSON.stringify(resolution));
				const result = await trx
					.insertInto('workflow_suggestion')
					.values({
						client_id: clientId,
						desk_location_id: resolution.breach.deskLocationId,
						status: SuggestionStatus.PENDING,
						suggestion_data: serializedData,
						expires_at: expiresAt.toISOString(),
					})
					.onConflict((oc) =>
						oc
							.columns(['client_id', 'desk_location_id'])
							.where('status', '=', SuggestionStatus.PENDING)
							.doUpdateSet({
								suggestion_data: serializedData,
								expires_at: expiresAt.toISOString(),
								generated_at: sql`NOW()`,
							})
					)
					.returning('id')
					.executeTakeFirstOrThrow();

				return result.id;
			})
		);

		// Delete stale pending suggestions for breaches that no longer exist
		if (currentBreachDeskLocationIds.length > 0) {
			await trx
				.deleteFrom('workflow_suggestion')
				.where('client_id', '=', clientId)
				.where('status', '=', SuggestionStatus.PENDING)
				.where('desk_location_id', 'not in', currentBreachDeskLocationIds)
				.execute();
		} else {
			// No breaches — clean up all pending suggestions
			await trx
				.deleteFrom('workflow_suggestion')
				.where('client_id', '=', clientId)
				.where('status', '=', SuggestionStatus.PENDING)
				.execute();
		}

		// Attach suggestion IDs and status to new resolutions
		suggestion.resolutions.forEach((resolution, index) => {
			resolution.suggestionId = suggestionIds[index];
			resolution.status = SuggestionStatus.PENDING;
		});

		// 5. Append ignored suggestions from database (validate shape before appending)
		const ignoredResolutions = ignoredRows
			.filter((row) => {
				const data = row.suggestion_data as any;
				return data && data.breach && Array.isArray(data.assignments);
			})
			.map((row) => ({
				...(row.suggestion_data as any),
				suggestionId: row.id,
				status: SuggestionStatus.IGNORED,
			}));

		suggestion.resolutions = [...suggestion.resolutions, ...ignoredResolutions];

		return serializeSuggestion(suggestion);
	});
}

/**
 * Execute a workflow suggestion.
 * Applies the suggested priority changes to user_desk_location table.
 */
export async function executeSuggestion(
	ctx: ProtectedContext,
	input: { suggestionId: string }
) {
	const clientId = ctx.session.user.client_id!;

	return await ctx.db.transaction().execute(async (trx) => {
		// 1. Fetch the suggestion (verify client_id and status='pending')
		const suggestion = await trx
			.selectFrom('workflow_suggestion')
			.where('id', '=', input.suggestionId)
			.where('client_id', '=', clientId)
			.where('status', '=', SuggestionStatus.PENDING)
			.select(['id', 'suggestion_data'])
			.executeTakeFirstOrThrow();

		const data = suggestion.suggestion_data as {
			assignments: Array<{ userId: string; deskLocationId: string; newPriority: number }>;
			cascadedChanges: Array<{ userId: string; deskLocationId: string; newPriority: number | null }>;
		};

		// 2. Apply priority assignments and cascaded changes
		const allChanges = [
			...data.assignments.map((a) => ({
				userId: a.userId,
				deskLocationId: a.deskLocationId,
				priority: a.newPriority,
			})),
			...data.cascadedChanges.map((c) => ({
				userId: c.userId,
				deskLocationId: c.deskLocationId,
				priority: c.newPriority,
			})),
		];

		await Promise.all(
			allChanges.map((change) =>
				trx
					.updateTable('user_desk_location')
					.set({ priority: change.priority })
					.where('user_id', '=', change.userId)
					.where('desk_location_id', '=', change.deskLocationId)
					.where('removed_at', 'is', null)
					.execute()
			)
		);

		// 3. Mark as executed
		await trx
			.updateTable('workflow_suggestion')
			.set({
				status: SuggestionStatus.EXECUTED,
				resolved_at: new Date().toISOString(),
				resolved_by: ctx.session.user.id,
			})
			.where('id', '=', input.suggestionId)
			.returning('id')
			.executeTakeFirstOrThrow();

		return { success: true };
	});
}

/**
 * Execute all pending workflow suggestions for the client.
 * Runs in a single transaction — all-or-nothing.
 */
export async function executeAllSuggestions(ctx: ProtectedContext) {
	const clientId = ctx.session.user.client_id!;

	return await ctx.db.transaction().execute(async (trx) => {
		// 1. Fetch all pending suggestions
		const pendingSuggestions = await trx
			.selectFrom('workflow_suggestion')
			.where('client_id', '=', clientId)
			.where('status', '=', SuggestionStatus.PENDING)
			.select(['id', 'suggestion_data'])
			.execute();

		if (pendingSuggestions.length === 0) {
			return { executed: 0 };
		}

		// 2. Apply all priority changes
		for (const suggestion of pendingSuggestions) {
			const data = suggestion.suggestion_data as {
				assignments: Array<{ userId: string; deskLocationId: string; newPriority: number }>;
				cascadedChanges: Array<{ userId: string; deskLocationId: string; newPriority: number | null }>;
			};

			const allChanges = [
				...data.assignments.map((a) => ({
					userId: a.userId,
					deskLocationId: a.deskLocationId,
					priority: a.newPriority,
				})),
				...data.cascadedChanges.map((c) => ({
					userId: c.userId,
					deskLocationId: c.deskLocationId,
					priority: c.newPriority,
				})),
			];

			await Promise.all(
				allChanges.map((change) =>
					trx
						.updateTable('user_desk_location')
						.set({ priority: change.priority })
						.where('user_id', '=', change.userId)
						.where('desk_location_id', '=', change.deskLocationId)
						.execute()
				)
			);
		}

		// 3. Mark all as executed in a single update
		await trx
			.updateTable('workflow_suggestion')
			.set({
				status: SuggestionStatus.EXECUTED,
				resolved_at: new Date().toISOString(),
				resolved_by: ctx.session.user.id,
			})
			.where('client_id', '=', clientId)
			.where('status', '=', SuggestionStatus.PENDING)
			.execute();

		return { executed: pendingSuggestions.length };
	});
}

/**
 * Update a workflow suggestion status.
 * Used for hide, ignore, or restore operations.
 * Cannot be used to set EXECUTED status — use executeSuggestion instead.
 */
export async function updateSuggestion(
	ctx: ProtectedContext,
	input: { suggestionId: string; status: SuggestionStatus }
) {
	// Restoring to PENDING clears resolution metadata
	const isRestoring = input.status === SuggestionStatus.PENDING;

	await ctx.db
		.updateTable('workflow_suggestion')
		.set({
			status: input.status,
			resolved_at: isRestoring ? null : new Date().toISOString(),
			resolved_by: isRestoring ? null : ctx.session.user.id,
		})
		.where('id', '=', input.suggestionId)
		.where('client_id', '=', ctx.session.user.client_id!)
		.where((eb) =>
			eb.or([
				eb('status', '=', SuggestionStatus.PENDING),
				eb('status', '=', SuggestionStatus.IGNORED),
			])
		)
		.returning('id')
		.executeTakeFirstOrThrow();

	return { success: true };
}

// ============================================================================
// TIER 1 BATCH QUERIES
// ============================================================================

/**
 * Get workflow stage metrics from the daily snapshot rollup table.
 */
export async function getWorkflowStageMetrics(
	ctx: ProtectedContext,
	input: { startDate: string; endDate: string; deskLocationTypeId?: string; deskLocationId?: string }
) {
	return await workflowAnalyticsQueries.getWorkflowStageMetrics(ctx, {
		startDate: input.startDate,
		endDate: input.endDate,
		deskLocationTypeId: input.deskLocationTypeId,
		deskLocationId: input.deskLocationId,
	});
}
