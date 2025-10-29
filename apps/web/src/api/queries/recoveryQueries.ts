import { sql, type CompiledQuery, Transaction } from 'kysely';
import { db } from '@/api/database/kysely';
import { DB } from '@/api/database/types';
import { ProtectedContext } from '@/server/trpc/trpc';
import { RecoveryEventParams, DeadlineParams } from '@/schemas/recoverySchemas';
import { DeadlineStatus } from '@/config/enums';
import { DateRangeStrict } from '@/types/types';
import { TRPCError } from '@trpc/server';

// =====================================================================
// RECOVERY EVENT QUERIES
// =====================================================================

/**
 * Create a recovery event and update the claim's actual_recovery field.
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @param params - recovery event parameters
 * @returns created recovery event
 */
export async function createRecoveryEvent(
	ctx: ProtectedContext,
	claimId: number,
	params: Omit<RecoveryEventParams, 'claim_id'>
) {
	const clientId = ctx.session.user.client_id!;

	return await db.transaction().execute(async (trx) => {
		// Create recovery event
		const recoveryEvent = await trx
			.insertInto('recovery_event')
			.values({
				claim_id: claimId,
				client_id: clientId,
				recovery_date: params.recovery_date,
				recovery_amount: params.recovery_amount.toString(),
				created_by: ctx.session.user.id,
				created_at: sql`now()`,
				...(params.recovery_source && { recovery_source: params.recovery_source }),
				...(params.notes && { notes: params.notes }),
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// Recalculate and update claim's actual_recovery
		await recalculateClaimRecovery(trx, claimId, clientId);

		return recoveryEvent;
	});
}

/**
 * List recovery events for a claim.
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @returns list of recovery events
 */
export async function getRecoveryEvents(ctx: ProtectedContext, claimId: number) {
	return await db
		.selectFrom('recovery_event')
		.selectAll()
		.where('recovery_event.client_id', '=', ctx.session.user.client_id)
		.where('recovery_event.claim_id', '=', claimId)
		.orderBy('recovery_date desc')
		.orderBy('created_at desc')
		.execute();
}

/**
 * Delete a recovery event and recalculate the claim's actual_recovery.
 *
 * @param ctx - request context
 * @param recoveryEventId - recovery event identifier
 * @param claimId - claim identifier for recalculation
 */
export async function deleteRecoveryEvent(
	ctx: ProtectedContext,
	recoveryEventId: number,
	claimId: number
) {
	const clientId = ctx.session.user.client_id!;

	return await db.transaction().execute(async (trx) => {
		// Delete recovery event
		const deleted = await trx
			.deleteFrom('recovery_event')
			.where('recovery_event.id', '=', recoveryEventId)
			.where('recovery_event.client_id', '=', clientId)
			.where('recovery_event.claim_id', '=', claimId)
			.returning(['id'])
			.executeTakeFirst();

		if (!deleted) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Recovery event not found',
			});
		}

		// Recalculate claim's actual_recovery
		await recalculateClaimRecovery(trx, claimId, clientId);

		return deleted;
	});
}

/**
 * Helper: Recalculate and update claim.actual_recovery from all recovery_event records.
 * Must be called within a transaction.
 */
async function recalculateClaimRecovery(
	trx: Transaction<DB>,
	claimId: number,
	clientId: string
) {
	// Sum all recovery events for this claim
	const result = await trx
		.selectFrom('recovery_event')
		.select(({ fn }) => fn.sum('recovery_amount').as('total'))
		.where('recovery_event.claim_id', '=', claimId)
		.where('recovery_event.client_id', '=', clientId)
		.executeTakeFirst();

	const totalRecovery = result?.total ? result.total.toString() : null;

	// Update claim's actual_recovery
	await trx
		.updateTable('claim')
		.set({
			actual_recovery: totalRecovery,
		})
		.where('claim.id', '=', claimId)
		.where('claim.client_id', '=', clientId)
		.execute();
}

// =====================================================================
// DEADLINE QUERIES
// =====================================================================

/**
 * Create a deadline for a claim.
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @param params - deadline parameters
 * @returns created deadline
 */
export async function createDeadline(
	ctx: ProtectedContext,
	claimId: number,
	params: Omit<DeadlineParams, 'claim_id'>
) {
	return await db
		.insertInto('deadline')
		.values({
			claim_id: claimId,
			client_id: ctx.session.user.client_id!,
			deadline_type: params.deadline_type,
			deadline_date: params.deadline_date,
			status: params.status ?? 'pending',
			created_by: ctx.session.user.id,
			created_at: sql`now()`,
			...(params.description && { description: params.description }),
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * List deadlines with optional filters.
 *
 * @param ctx - request context
 * @param filters - optional claim ID, status, and date range filters
 * @returns list of deadlines
 */
export async function getDeadlines(
	ctx: ProtectedContext,
	filters: { claimId?: number; status?: string; dateRange?: DateRangeStrict }
) {
	const isAdmin =
		ctx.session.user.role === 'Admin' || ctx.session.user.role === 'Super Admin';

	let query = db
		.selectFrom('deadline')
		.selectAll('deadline')
		.where('deadline.client_id', '=', ctx.session.user.client_id);

	// For Contributors, only show deadlines for claims they're assigned to
	if (!isAdmin) {
		query = query
			.innerJoin('claim', 'deadline.claim_id', 'claim.id')
			.innerJoin('checklist_claim', 'claim.id', 'checklist_claim.claim_id')
			.where((eb) =>
				eb.or([
					eb('checklist_claim.created_by', '=', ctx.session.user.id),
					eb('checklist_claim.assignee', '=', ctx.session.user.id),
				])
			);
	}

	if (filters.claimId) {
		query = query.where('deadline.claim_id', '=', filters.claimId);
	}

	if (filters.status) {
		query = query.where('deadline.status', '=', filters.status);
	}

	if (filters.dateRange) {
		query = query
			.where('deadline.deadline_date', '>=', filters.dateRange[0])
			.where('deadline.deadline_date', '<=', filters.dateRange[1]);
	}

	return await query
		.orderBy('deadline.deadline_date asc')
		.orderBy('deadline.created_at desc')
		.execute();
}

/**
 * Update a deadline's status.
 *
 * @param ctx - request context
 * @param deadlineId - deadline identifier
 * @param status - new status
 * @returns updated deadline
 */
export async function updateDeadlineStatus(
	ctx: ProtectedContext,
	deadlineId: number,
	status: DeadlineStatus
) {
	const updated = await db
		.updateTable('deadline')
		.set({
			status,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('deadline.id', '=', deadlineId)
		.where('deadline.client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirst();

	if (!updated) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Deadline not found',
		});
	}

	return updated;
}

/**
 * Delete a deadline.
 *
 * @param ctx - request context
 * @param deadlineId - deadline identifier
 */
export async function deleteDeadline(ctx: ProtectedContext, deadlineId: number) {
	const deleted = await db
		.deleteFrom('deadline')
		.where('deadline.id', '=', deadlineId)
		.where('deadline.client_id', '=', ctx.session.user.client_id)
		.returning(['id'])
		.executeTakeFirst();

	if (!deleted) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Deadline not found',
		});
	}

	return deleted;
}

// =====================================================================
// RECOVERY METRICS QUERIES
// =====================================================================

/**
 * Get recovery metrics summary for KPI display.
 * Returns expected vs actual recovery totals within a date range.
 *
 * @param ctx - request context
 * @param range - date range [startDate, endDate]
 * @returns summary object with expected, actual, variance, and recovery rate
 */
export async function getRecoveryMetricsSummary(
	ctx: ProtectedContext,
	range: DateRangeStrict
) {
	// Run both queries in parallel
	const [expectedResult, actualResult] = await Promise.all([
		// Get total expected recovery for claims created in range
		db
			.selectFrom('claim')
			.select(({ fn }) => fn.sum('expected_recovery').as('total_expected'))
			.where('claim.client_id', '=', ctx.session.user.client_id)
			.where('claim.created_at', '>=', range[0])
			.where('claim.created_at', '<=', range[1])
			.executeTakeFirst(),
		// Get total actual recovery for recovery events in range
		db
			.selectFrom('recovery_event')
			.select(({ fn }) => fn.sum('recovery_amount').as('total_actual'))
			.where('recovery_event.client_id', '=', ctx.session.user.client_id)
			.where('recovery_event.recovery_date', '>=', range[0])
			.where('recovery_event.recovery_date', '<=', range[1])
			.executeTakeFirst(),
	]);

	const totalExpected = expectedResult?.total_expected
		? parseFloat(expectedResult.total_expected.toString())
		: 0;

	const totalActual = actualResult?.total_actual
		? parseFloat(actualResult.total_actual.toString())
		: 0;

	// Calculate variance and recovery rate
	const variance = totalActual - totalExpected;
	const recoveryRate = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0;

	return {
		total_expected: totalExpected,
		total_actual: totalActual,
		variance,
		recovery_rate: recoveryRate,
	};
}

/**
 * Get recovery metrics time series for graphing.
 * Returns monthly intervals with expected and actual recovery amounts.
 *
 * @param ctx - request context
 * @param range - date range [startDate, endDate]
 * @returns array of monthly data points
 */
export async function getRecoveryMetricsTimeSeries(
	ctx: ProtectedContext,
	range: DateRangeStrict
) {
	const query: CompiledQuery<{
		month_start: string;
		expected_recovery: number;
		actual_recovery: number;
	}> = sql`
		WITH monthly_series AS (
			SELECT
				date_trunc('month', gs.month)::date as month_start
			FROM generate_series(
				date_trunc('month', ${range[0]}::timestamp),
				date_trunc('month', ${range[1]}::timestamp),
				interval '1 month'
			) as gs(month)
		),
		expected_by_month AS (
			SELECT
				date_trunc('month', c.created_at)::date as month_start,
				COALESCE(SUM(c.expected_recovery), 0)::numeric as total_expected
			FROM claim c
			WHERE c.client_id = ${ctx.session.user.client_id}
				AND c.created_at >= ${range[0]}
				AND c.created_at <= ${range[1]}
			GROUP BY date_trunc('month', c.created_at)
		),
		actual_by_month AS (
			SELECT
				date_trunc('month', re.recovery_date)::date as month_start,
				COALESCE(SUM(re.recovery_amount), 0)::numeric as total_actual
			FROM recovery_event re
			WHERE re.client_id = ${ctx.session.user.client_id}
				AND re.recovery_date >= ${range[0]}
				AND re.recovery_date <= ${range[1]}
			GROUP BY date_trunc('month', re.recovery_date)
		)
		SELECT
			ms.month_start::text,
			COALESCE(ebm.total_expected, 0)::float as expected_recovery,
			COALESCE(abm.total_actual, 0)::float as actual_recovery
		FROM monthly_series ms
		LEFT JOIN expected_by_month ebm ON ms.month_start = ebm.month_start
		LEFT JOIN actual_by_month abm ON ms.month_start = abm.month_start
		ORDER BY ms.month_start
	`.compile(db);

	return (await db.executeQuery(query))?.rows ?? [];
}
