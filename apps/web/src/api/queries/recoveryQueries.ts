import { sql, type CompiledQuery } from 'kysely';
import { ProtectedContext } from '@/server/trpc/trpc';
import { RecoveryEventParams, RecoveryEventUpdateParams } from '@/schemas/recoverySchemas';
import { DateRangeStrict } from '@/types/types';
import { TRPCError } from '@trpc/server';
import config from '@/config/config';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// =====================================================================
// RECOVERY EVENT QUERIES
// =====================================================================

/**
 * Create a recovery event and update the claim's actual_recovery field.
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @param params - recovery event parameters (must include settlement_id)
 * @returns created recovery event
 */
export async function createRecoveryEvent(
	ctx: ProtectedContext,
	claimId: number,
	params: Omit<RecoveryEventParams, 'claim_id'>
) {
	const clientId = ctx.session.user.client_id!;

	// Check if we're already in a transaction to avoid nested transactions
	const isInTransaction = ctx.db.isTransaction;

	const executeOperation = async (trx: any) => {
		// Create recovery event (settlement_id is required)
		const recoveryEvent = await trx
			.insertInto('recovery_event')
			.values({
				claim_id: claimId,
				client_id: clientId,
				settlement_id: params.settlement_id,
				// Format as YYYY-MM-DD string to avoid timezone conversion when sending to PostgreSQL
				recovery_date: dayjs.utc(params.recovery_date).format('YYYY-MM-DD'),
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
	};

	// If already in a transaction, use it; otherwise create a new one
	if (isInTransaction) {
		return await executeOperation(ctx.db);
	} else {
		return await ctx.db.transaction().execute(executeOperation);
	}
}

/**
 * List recovery events for a claim.
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @returns list of recovery events
 */
export async function getRecoveryEvents(ctx: ProtectedContext, claimId: number) {
	return await ctx.db
		.selectFrom('recovery_event')
		.selectAll()
		.where('recovery_event.client_id', '=', ctx.session.user.client_id)
		.where('recovery_event.claim_id', '=', claimId)
		.orderBy('recovery_date asc')
		.orderBy('created_at asc')
		.execute();
}

/**
 * List recovery events with optional filters for breakdown page.
 *
 * @param ctx - request context
 * @param filters - optional filters including range, recovery_source, recovery_status, checklist, user
 * @param limit - maximum number of rows to return (for pagination)
 * @param offset - number of rows to skip (for pagination)
 * @returns paginated list of recovery events with claim details and total count
 */
export async function listRecoveryEventsWithFilters(
	ctx: ProtectedContext,
	filters: {
		range?: DateRangeStrict;
		recoverySource?: string;
		recoveryStatus?: string;
		checklistId?: number;
		userId?: string;
	},
	limit?: number,
	offset?: number
) {
	let query = ctx.db
		.selectFrom('recovery_event')
		.innerJoin('claim', 'recovery_event.claim_id', 'claim.id')
		// Only join checklist_claim when filtering by checklistId to avoid row duplication
		// (a claim can have multiple checklists, causing duplicate recovery event rows)
		.$if(filters.checklistId !== undefined, (qb) =>
			qb.innerJoin('checklist_claim', 'claim.id', 'checklist_claim.claim_id')
		)
		.select([
			'recovery_event.id',
			'recovery_event.claim_id',
			'recovery_event.recovery_date',
			'recovery_event.recovery_amount',
			'recovery_event.recovery_source',
			'recovery_event.notes',
			'recovery_event.created_by',
			'recovery_event.created_at',
			'claim.claim_number',
			'claim.insured',
			'claim.recovery_status',
			'claim.actual_recovery', // Team's meaningful payments (calculated from recovery events)
		])
		.where('recovery_event.client_id', '=', ctx.session.user.client_id);

	// Filter by date range
	if (filters.range) {
		query = query
			.where('recovery_event.recovery_date', '>=', filters.range[0])
			.where('recovery_event.recovery_date', '<=', filters.range[1]);
	}

	// Filter by recovery source (ILIKE for partial match)
	if (filters.recoverySource) {
		query = query.where('recovery_event.recovery_source', 'ilike', `%${filters.recoverySource}%`);
	}

	// Filter by recovery status on claim
	if (filters.recoveryStatus) {
		query = query.where('claim.recovery_status', '=', filters.recoveryStatus);
	}

	// Filter by checklist (join is conditionally added above)
	if (filters.checklistId) {
		query = query.where('checklist_claim.checklist_id' as any, '=', filters.checklistId);
	}

	// Filter by user who created the recovery event
	if (filters.userId) {
		query = query.where('recovery_event.created_by', '=', filters.userId);
	}

	// Get total count for pagination
	const countQuery = query
		.clearSelect()
		.select(({ fn }) => fn.countAll().as('count'))
		.executeTakeFirst();

	// Apply pagination and fetch rows
	const rowsQuery = query
		.orderBy('recovery_event.recovery_date desc')
		.orderBy('recovery_event.created_at desc')
		.$if(limit !== undefined, (qb) => qb.limit(limit!))
		.$if(offset !== undefined, (qb) => qb.offset(offset!))
		.execute();

	const [countResult, rows] = await Promise.all([countQuery, rowsQuery]);

	return {
		rows,
		count: countResult?.count ? Number(countResult.count) : 0,
	};
}

/**
 * Delete a recovery event and recalculate the claim's actual_recovery.
 *
 * @param ctx - request context
 * @param recoveryEventId - recovery event identifier
 * @param claimId - claim identifier for recalculation
 */
/**
 * Fetch a recovery event for logging before deletion.
 */
export async function getRecoveryEventForDeletion(ctx: ProtectedContext, recoveryEventId: number) {
	return await ctx.db
		.selectFrom('recovery_event')
		.select(['id', 'claim_id', 'recovery_amount', 'recovery_date', 'recovery_source'])
		.where('id', '=', recoveryEventId)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

export async function deleteRecoveryEvent(ctx: ProtectedContext, recoveryEventId: number, claimId: number) {
	const clientId = ctx.session.user.client_id!;

	// Delete recovery event
	const deleted = await ctx.db
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
	await recalculateClaimRecovery(ctx.db, claimId, clientId);

	return deleted;
}

/**
 * Update a recovery event and recalculate the claim's actual_recovery.
 *
 * @param ctx - request context
 * @param recoveryEventId - recovery event identifier
 * @param params - fields to update
 * @returns updated recovery event
 */
export async function updateRecoveryEvent(
	ctx: ProtectedContext,
	recoveryEventId: number,
	params: RecoveryEventUpdateParams
) {
	const clientId = ctx.session.user.client_id!;

	// First get the existing recovery event to find the claim_id
	const existing = await ctx.db
		.selectFrom('recovery_event')
		.select(['id', 'claim_id'])
		.where('recovery_event.id', '=', recoveryEventId)
		.where('recovery_event.client_id', '=', clientId)
		.executeTakeFirst();

	if (!existing) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Recovery event not found',
		});
	}

	const updateValues: Record<string, any> = {
		updated_by: ctx.session.user.id,
		updated_at: sql`now()`,
	};

	if (params.settlement_id !== undefined) {
		updateValues.settlement_id = params.settlement_id;
	}
	if (params.recovery_date !== undefined) {
		// Format as YYYY-MM-DD string to avoid timezone conversion when sending to PostgreSQL
		updateValues.recovery_date = dayjs.utc(params.recovery_date).format('YYYY-MM-DD');
	}
	if (params.recovery_amount !== undefined) {
		updateValues.recovery_amount = params.recovery_amount.toString();
	}
	if (params.recovery_source !== undefined) {
		updateValues.recovery_source = params.recovery_source;
	}
	if (params.notes !== undefined) {
		updateValues.notes = params.notes;
	}

	// Update recovery event
	const updated = await ctx.db
		.updateTable('recovery_event')
		.set(updateValues)
		.where('recovery_event.id', '=', recoveryEventId)
		.where('recovery_event.client_id', '=', clientId)
		.returningAll()
		.executeTakeFirstOrThrow();

	// Recalculate claim's actual_recovery if amount changed
	if (params.recovery_amount !== undefined) {
		await recalculateClaimRecovery(ctx.db, existing.claim_id, clientId);
	}

	return updated;
}

/**
 * Export all recovery events matching filters (no pagination).
 * Used for CSV export functionality.
 *
 * @param ctx - request context
 * @param filters - optional filters (same as listRecoveryEventsWithFilters)
 * @returns all matching recovery events with claim details
 */
export async function exportRecoveryEvents(
	ctx: ProtectedContext,
	filters: {
		range?: DateRangeStrict;
		recoverySource?: string;
		recoveryStatus?: string;
		checklistId?: number;
		userId?: string;
	}
) {
	let query = ctx.db
		.selectFrom('recovery_event')
		.innerJoin('claim', 'recovery_event.claim_id', 'claim.id')
		// Only join checklist_claim when filtering by checklistId to avoid row duplication
		// (a claim can have multiple checklists, causing duplicate recovery event rows)
		.$if(filters.checklistId !== undefined, (qb) =>
			qb.innerJoin('checklist_claim', 'claim.id', 'checklist_claim.claim_id')
		)
		.select([
			'recovery_event.id',
			'recovery_event.recovery_date',
			'recovery_event.recovery_amount',
			'recovery_event.recovery_source',
			'recovery_event.notes',
			'claim.id as claim_id',
			'claim.claim_number',
			'claim.insured',
			'claim.recovery_status',
			'recovery_event.created_at',
			'recovery_event.created_by',
		])
		.where('recovery_event.client_id', '=', ctx.session.user.client_id);

	// Apply filters (same logic as listRecoveryEventsWithFilters)
	if (filters.range) {
		query = query
			.where('recovery_event.recovery_date', '>=', filters.range[0])
			.where('recovery_event.recovery_date', '<=', filters.range[1]);
	}

	if (filters.recoverySource) {
		query = query.where(sql`recovery_event.recovery_source ILIKE ${`%${filters.recoverySource}%`}` as any);
	}

	if (filters.recoveryStatus) {
		query = query.where('claim.recovery_status', '=', filters.recoveryStatus);
	}

	// Filter by checklist (join is conditionally added above)
	if (filters.checklistId) {
		query = query.where('checklist_claim.checklist_id' as any, '=', filters.checklistId);
	}

	if (filters.userId) {
		query = query.where('recovery_event.created_by', '=', filters.userId);
	}

	// Order by date descending
	return await query.orderBy('recovery_event.recovery_date', 'desc').execute();
}

/**
 * Helper: Recalculate and update claim.actual_recovery from all recovery_event records.
 * Must be called within a transaction.
 */
async function recalculateClaimRecovery(trx: any, claimId: number, clientId: string) {
	// Sum all recovery events for this claim
	const result = await trx
		.selectFrom('recovery_event')
		.select(({ fn }: { fn: any }) => fn.sum('recovery_amount').as('total'))
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
// RECOVERY METRICS QUERIES
// =====================================================================

/**
 * Get recovery metrics summary for KPI display.
 * Returns expected vs actual recovery totals within a date range.
 *
 * @param ctx - request context
 * @param range - date range [startDate, endDate]
 * @param filters - optional filters
 *   - recoverySource: applies to both (filters to claims with recovery events from matching source)
 *   - recoveryStatus: applies to both (filters claim.recovery_status)
 *   - checklistId: applies to both (filters by checklist assignment)
 *   - userId: applies to both (filters by claim assignee)
 * @returns summary object with expected, actual, variance, and recovery rate
 */
export async function getRecoveryMetricsSummary(
	ctx: ProtectedContext,
	range: DateRangeStrict,
	filters?: {
		recoverySource?: string;
		recoveryStatus?: string;
		checklistId?: number;
		userId?: string;
	}
) {
	// TODO: expected_recovery is now calculated per-claim from:
	// (100 - sum(claim_party.liability_percentage)) / 100 * sum(claim_liability.amount_paid)
	// For now we return 0 until this complex aggregation is implemented
	// The calculation needs to:
	// 1. Get each claim's parties and their liability percentages
	// 2. Get each claim's liabilities and their amount_paid values
	// 3. Calculate expected_recovery = (100 - party_liability_total) / 100 * amount_paid_total per claim
	// 4. Sum all expected_recovery values
	const totalExpected = 0;

	// Build actual recovery query with all joins upfront (conditionally applied)
	const needsClaimJoin = !!(filters?.recoveryStatus || filters?.checklistId || filters?.userId);
	const needsChecklistJoin = !!(filters?.checklistId || filters?.userId);

	const actualQuery = ctx.db
		.selectFrom('recovery_event')
		.$if(needsClaimJoin, (qb) => qb.innerJoin('claim', 'recovery_event.claim_id', 'claim.id'))
		.$if(needsChecklistJoin, (qb) =>
			qb.innerJoin('checklist_claim', 'checklist_claim.claim_id', 'recovery_event.claim_id')
		)
		.select(({ fn }) => fn.sum('recovery_amount').as('total_actual'))
		.where('recovery_event.client_id', '=', ctx.session.user.client_id)
		.where('recovery_event.recovery_date', '>=', range[0])
		.where('recovery_event.recovery_date', '<=', range[1])
		.$if(!!filters?.recoverySource, (qb) =>
			qb.where('recovery_event.recovery_source', 'ilike', `%${filters!.recoverySource}%`)
		)
		.$if(!!filters?.recoveryStatus, (qb) =>
			qb.where(sql`claim.recovery_status = ${filters!.recoveryStatus}` as any)
		)
		.$if(!!filters?.checklistId, (qb) =>
			qb.where(sql`checklist_claim.checklist_id = ${filters!.checklistId}` as any)
		)
		.$if(!!filters?.userId, (qb) => qb.where(sql`checklist_claim.assignee = ${filters!.userId}` as any));

	// Run actual query
	const actualResult = await actualQuery.executeTakeFirst();

	const totalActual = actualResult?.total_actual ? parseFloat(actualResult.total_actual.toString()) : 0;

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
 * @param filters - optional filters
 *   - recoverySource: applies to both (filters to claims with recovery events from matching source)
 *   - recoveryStatus: applies to both (filters claim.recovery_status)
 *   - checklistId: applies to both (filters by checklist assignment)
 *   - userId: applies to both (filters by claim assignee)
 * @returns array of monthly data points
 */
export async function getRecoveryMetricsTimeSeries(
	ctx: ProtectedContext,
	range: DateRangeStrict,
	filters?: {
		recoverySource?: string;
		recoveryStatus?: string;
		checklistId?: number;
		userId?: string;
	}
) {
	// NOTE: expected_recovery is now calculated per-claim from party liability percentages
	// and liability amount_paid. We no longer query it from the claim table.
	// The expected_by_month CTE has been removed and we return 0 for expected_recovery.

	// For actual recovery, need to join claim for recovery_status
	const actualJoins =
		filters?.recoveryStatus || filters?.checklistId || filters?.userId
			? filters?.checklistId || filters?.userId
				? 'INNER JOIN claim c2 ON re.claim_id = c2.id INNER JOIN checklist_claim cc2 ON c2.id = cc2.claim_id'
				: 'INNER JOIN claim c2 ON re.claim_id = c2.id'
			: '';
	const actualFilterClauses: string[] = [];
	if (filters?.recoverySource) {
		actualFilterClauses.push(`re.recovery_source ILIKE '%${filters.recoverySource}%'`);
	}
	if (filters?.recoveryStatus) {
		actualFilterClauses.push(`c2.recovery_status = '${filters.recoveryStatus}'`);
	}
	if (filters?.checklistId) {
		actualFilterClauses.push(`cc2.checklist_id = ${filters.checklistId}`);
	}
	if (filters?.userId) {
		actualFilterClauses.push(`cc2.assignee = '${filters.userId}'`);
	}
	const actualWhereClause = actualFilterClauses.length > 0 ? `AND ${actualFilterClauses.join(' AND ')}` : '';

	// TODO: expected_recovery is now calculated per-claim from party liability percentages
	// and liability amount_paid. For now, we return 0 for expected_recovery in the time series.
	// See getRecoveryMetricsSummary for the calculation formula.
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
		actual_by_month AS (
			SELECT
				date_trunc('month', re.recovery_date)::date as month_start,
				COALESCE(SUM(re.recovery_amount), 0)::numeric as total_actual
			FROM recovery_event re
			${sql.raw(actualJoins)}
			WHERE re.client_id = ${ctx.session.user.client_id}
				AND re.recovery_date >= ${range[0]}
				AND re.recovery_date <= ${range[1]}
				${sql.raw(actualWhereClause)}
			GROUP BY date_trunc('month', re.recovery_date)
		)
		SELECT
			ms.month_start::text,
			0::float as expected_recovery,
			COALESCE(abm.total_actual, 0)::float as actual_recovery
		FROM monthly_series ms
		LEFT JOIN actual_by_month abm ON ms.month_start = abm.month_start
		ORDER BY ms.month_start
	`.compile(ctx.db);

	return (await ctx.db.executeQuery(query))?.rows ?? [];
}

// =====================================================================
// QUARTERLY RECOVERY STATS
// =====================================================================

/**
 * Get total actual recovery amounts per fiscal quarter.
 *
 * @param ctx - request context
 * @param params - optional fiscal year start date and user ID filter
 * @returns recovery totals for Q1-Q4
 */
export async function getQuarterlyRecoveryStats(
	ctx: ProtectedContext,
	params?: {
		fiscalYearStart?: Date;
		userId?: string;
	}
): Promise<{
	q1: string;
	q2: string;
	q3: string;
	q4: string;
}> {
	const clientId = ctx.session.user.client_id!;

	// Use provided fiscal year start or default from config
	const fiscalYearStart = params?.fiscalYearStart ? dayjs(params.fiscalYearStart) : config.FISCAL_YEAR_START_DATE;

	// Calculate quarter date ranges
	const quarters = [
		{
			name: 'q1',
			start: fiscalYearStart.toDate(),
			end: fiscalYearStart.add(3, 'months').subtract(1, 'day').toDate(),
		},
		{
			name: 'q2',
			start: fiscalYearStart.add(3, 'months').toDate(),
			end: fiscalYearStart.add(6, 'months').subtract(1, 'day').toDate(),
		},
		{
			name: 'q3',
			start: fiscalYearStart.add(6, 'months').toDate(),
			end: fiscalYearStart.add(9, 'months').subtract(1, 'day').toDate(),
		},
		{
			name: 'q4',
			start: fiscalYearStart.add(9, 'months').toDate(),
			end: fiscalYearStart.add(12, 'months').subtract(1, 'day').toDate(),
		},
	];

	// Query recovery amounts for each quarter
	const results = await Promise.all(
		quarters.map(async (quarter) => {
			let query = ctx.db
				.selectFrom('recovery_event')
				.select((eb) => eb.fn.sum('recovery_amount').as('total'))
				.where('client_id', '=', clientId)
				.where('recovery_date', '>=', quarter.start)
				.where('recovery_date', '<=', quarter.end);

			// Optional user filter (future enhancement)
			if (params?.userId) {
				query = query.where('created_by', '=', params.userId);
			}

			const result = await query.executeTakeFirst();

			return {
				quarter: quarter.name,
				total: result?.total || '0',
			};
		})
	);

	// Format results into expected shape
	return {
		q1: (results.find((r) => r.quarter === 'q1')?.total || '0').toString(),
		q2: (results.find((r) => r.quarter === 'q2')?.total || '0').toString(),
		q3: (results.find((r) => r.quarter === 'q3')?.total || '0').toString(),
		q4: (results.find((r) => r.quarter === 'q4')?.total || '0').toString(),
	};
}
