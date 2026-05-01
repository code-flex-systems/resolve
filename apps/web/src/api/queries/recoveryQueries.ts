import { sql } from 'kysely';
import { ProtectedContext } from '@/server/trpc/trpc';
import { RecoveryEventParams, RecoveryEventUpdateParams } from '@/schemas/recoverySchemas';
import { DateRangeStrict } from '@/types/types';
import { TRPCError } from '@trpc/server';
import { getFiscalYearStart } from '@/config/config';
import dayjs from 'dayjs';
import { formatDateForDB } from '@/api/utils/dateUtils';

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
	claimId: string,
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
				recovery_date: formatDateForDB(params.recovery_date),
				recovery_amount: params.recovery_amount.toString(),
				created_by: ctx.session.user.id,
				created_at: sql`now()`,
				...(params.recovery_source && { recovery_source: params.recovery_source }),
				...(params.notes && { notes: params.notes }),
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// Increment claim's actual_recovery by the new amount (delta approach)
		await trx
			.updateTable('claim')
			.set({
				actual_recovery: sql`COALESCE(actual_recovery::numeric, 0) + ${params.recovery_amount}`,
			})
			.where('claim.id', '=', claimId)
			.where('claim.client_id', '=', clientId)
			.execute();

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
export async function getRecoveryEvents(ctx: ProtectedContext, claimId: string) {
	return await ctx.db
		.selectFrom('recovery_event')
		.selectAll()
		.where('recovery_event.client_id', '=', ctx.session.user.client_id)
		.where('recovery_event.claim_id', '=', claimId)
		.where('recovery_event.deleted_at', 'is', null)
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
		checklistId?: string;
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
		.where('recovery_event.client_id', '=', ctx.session.user.client_id)
		.where('recovery_event.deleted_at', 'is', null);

	// Filter by date range
	if (filters.range) {
		query = query
			.where('recovery_event.recovery_date', '>=', filters.range[0])
			.where('recovery_event.recovery_date', '<=', filters.range[1]);
	}

	// Filter by recovery source (prefix search for index usage)
	if (filters.recoverySource) {
		query = query.where('recovery_event.recovery_source', 'ilike', `${filters.recoverySource}%`);
	}

	// Filter by recovery status on claim
	if (filters.recoveryStatus) {
		query = query.where('claim.recovery_status', '=', filters.recoveryStatus);
	}

	// Filter by checklist (join is conditionally added above)
	if (filters.checklistId) {
		query = query.where('checklist_claim.checklist_id' as any, '=', filters.checklistId);
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
 * Soft delete (archive) a recovery event and update claim's actual_recovery.
 * Returns all fields needed for logging - no separate fetch required.
 *
 * @param ctx - request context
 * @param recoveryEventId - recovery event identifier
 * @param claimId - claim identifier for verification and recalculation
 * @returns archived recovery event with all fields needed for logging
 */
export async function archiveRecoveryEvent(
	ctx: ProtectedContext,
	recoveryEventId: string,
	claimId: string
) {
	const clientId = ctx.session.user.client_id!;

	// Soft delete and return all fields needed for logging via RETURNING
	const archived = await ctx.db
		.updateTable('recovery_event')
		.set({
			deleted_at: sql`now()`,
			deleted_by: ctx.session.user.id,
		})
		.where('recovery_event.id', '=', recoveryEventId)
		.where('recovery_event.client_id', '=', clientId)
		.where('recovery_event.claim_id', '=', claimId)
		.where('recovery_event.deleted_at', 'is', null)
		.returning(['id', 'claim_id', 'recovery_amount', 'recovery_date', 'recovery_source'])
		.executeTakeFirst();

	if (!archived) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Recovery event not found',
		});
	}

	// Decrement claim's actual_recovery by the archived amount (delta approach)
	await ctx.db
		.updateTable('claim')
		.set({
			actual_recovery: sql`COALESCE(actual_recovery::numeric, 0) - ${archived.recovery_amount}::numeric`,
		})
		.where('claim.id', '=', claimId)
		.where('claim.client_id', '=', clientId)
		.execute();

	return archived;
}

/**
 * Bulk soft delete recovery events for a settlement.
 * Used when archiving a settlement to cascade the delete.
 * Returns all archived events for bulk logging - no separate fetch or loop required.
 *
 * @param ctx - request context
 * @param settlementId - settlement identifier
 * @param claimId - claim identifier for actual_recovery update
 * @returns array of archived recovery events with fields needed for logging
 */
export async function archiveRecoveryEventsForSettlement(
	ctx: ProtectedContext,
	settlementId: string,
	claimId: string
) {
	const clientId = ctx.session.user.client_id!;

	// Compute sum FIRST (before any rows are soft-deleted) to ensure accurate total
	const sumResult = await ctx.db
		.selectFrom('recovery_event')
		.select(({ fn }) => fn.sum<string>('recovery_amount').as('total'))
		.where('recovery_event.settlement_id', '=', settlementId)
		.where('recovery_event.client_id', '=', clientId)
		.where('recovery_event.deleted_at', 'is', null)
		.executeTakeFirst();

	const totalAmount = sumResult?.total; // Keep as string for exact numeric precision

	// THEN bulk soft delete and return fields needed for logging via RETURNING
	const archived = await ctx.db
		.updateTable('recovery_event')
		.set({
			deleted_at: sql`now()`,
			deleted_by: ctx.session.user.id,
		})
		.where('recovery_event.settlement_id', '=', settlementId)
		.where('recovery_event.client_id', '=', clientId)
		.where('recovery_event.deleted_at', 'is', null)
		.returning(['id', 'claim_id', 'recovery_amount', 'recovery_date', 'recovery_source'])
		.execute();

	// Update claim's actual_recovery using SQL arithmetic with exact numeric types
	if (totalAmount) {
		await ctx.db
			.updateTable('claim')
			.set({
				actual_recovery: sql`COALESCE(actual_recovery::numeric, 0) - ${totalAmount}::numeric`,
			})
			.where('claim.id', '=', claimId)
			.where('claim.client_id', '=', clientId)
			.execute();
	}

	return archived;
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
	recoveryEventId: string,
	params: RecoveryEventUpdateParams
) {
	const clientId = ctx.session.user.client_id!;

	// First get the existing recovery event to find the claim_id and old amount
	const existing = await ctx.db
		.selectFrom('recovery_event')
		.select(['id', 'claim_id', 'recovery_amount'])
		.where('recovery_event.id', '=', recoveryEventId)
		.where('recovery_event.client_id', '=', clientId)
		.where('recovery_event.deleted_at', 'is', null)
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
		updateValues.recovery_date = formatDateForDB(params.recovery_date);
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
		.where('recovery_event.deleted_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();

	// Update claim's actual_recovery by delta if amount changed
	if (params.recovery_amount !== undefined) {
		const newAmount = params.recovery_amount.toString();

		await ctx.db
			.updateTable('claim')
			.set({
				actual_recovery: sql`COALESCE(actual_recovery::numeric, 0) + (${newAmount}::numeric - ${existing.recovery_amount}::numeric)`,
			})
			.where('claim.id', '=', existing.claim_id)
			.where('claim.client_id', '=', clientId)
			.execute();
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
		checklistId?: string;
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
		.where('recovery_event.client_id', '=', ctx.session.user.client_id)
		.where('recovery_event.deleted_at', 'is', null);

	// Apply filters (same logic as listRecoveryEventsWithFilters)
	if (filters.range) {
		query = query
			.where('recovery_event.recovery_date', '>=', filters.range[0])
			.where('recovery_event.recovery_date', '<=', filters.range[1]);
	}

	if (filters.recoverySource) {
		// Use prefix search for index usage (parameterized to prevent injection)
		query = query.where('recovery_event.recovery_source', 'ilike', `${filters.recoverySource}%`);
	}

	if (filters.recoveryStatus) {
		query = query.where('claim.recovery_status', '=', filters.recoveryStatus);
	}

	// Filter by checklist (join is conditionally added above)
	if (filters.checklistId) {
		query = query.where('checklist_claim.checklist_id' as any, '=', filters.checklistId);
	}

	// Order by date descending
	return await query.orderBy('recovery_event.recovery_date', 'desc').execute();
}

/**
 * Manually recalculate claim's actual_recovery by summing all recovery events.
 * This is kept for data recovery/correction scenarios - normal operations use delta updates.
 * Must be called within a transaction.
 *
 * @param trx - transaction or database connection
 * @param claimId - claim identifier
 * @param clientId - client identifier
 */
export async function recalculateClaimRecovery(trx: any, claimId: string, clientId: string) {
	// Sum all non-deleted recovery events for this claim
	const result = await trx
		.selectFrom('recovery_event')
		.select(({ fn }: { fn: any }) => fn.sum('recovery_amount').as('total'))
		.where('recovery_event.claim_id', '=', claimId)
		.where('recovery_event.client_id', '=', clientId)
		.where('recovery_event.deleted_at', 'is', null)
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
// RECOVERY SUMMARY BY COVERAGE
// =====================================================================

/**
 * Get recovery summary aggregated by coverage type.
 * Used for the Settlement & Recovery tab's financial summary table.
 *
 * Returns per coverage:
 * - coverage_id, loss_type
 * - subrogable_amount: sum of payments where is_subrogable = true
 * - actual_recovery: sum of recovery_event amounts (via settlements linked to this coverage)
 *
 * The expected_recovery and balance are calculated client-side using the claim's
 * our_liability_percentage (already available from getClaimDetail).
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @returns array of coverage summaries
 */
export async function getRecoverySummaryByCoverage(ctx: ProtectedContext, claimId: string) {
	const clientId = ctx.session.user.client_id!;

	// Use subqueries for aggregation to avoid Cartesian products
	// when joining payments and recovery events to coverages
	// Each subquery is scoped by client_id and claim_id for security and efficiency
	const result = await ctx.db
		.selectFrom('claim_coverage as cc')
		.leftJoin(
			(eb) =>
				eb
					.selectFrom('claim_payment')
					.select([
						'coverage_id',
						sql<string>`COALESCE(SUM(payment_amount), 0)`.as('total_payments'),
					])
					.where('client_id', '=', clientId)
					.where('claim_id', '=', claimId)
					.where('is_subrogable', '=', true)
					.where('deleted_at', 'is', null)
					.groupBy('coverage_id')
					.as('payments'),
			(join) => join.onRef('payments.coverage_id', '=', 'cc.id')
		)
		.leftJoin(
			(eb) =>
				eb
					.selectFrom('settlement as s')
					.innerJoin('recovery_event as re', 're.settlement_id', 's.id')
					.select([
						's.coverage_id',
						sql<string>`COALESCE(SUM(re.recovery_amount), 0)`.as('total_recovery'),
					])
					.where('s.client_id', '=', clientId)
					.where('s.claim_id', '=', claimId)
					.where(sql`s.deleted_at`, 'is', null)
					.where(sql`re.deleted_at`, 'is', null)
					.groupBy('s.coverage_id')
					.as('recoveries'),
			(join) => join.onRef('recoveries.coverage_id', '=', 'cc.id')
		)
		.select([
			'cc.id as coverage_id',
			'cc.loss_type',
			sql<string>`COALESCE(payments.total_payments, '0')`.as('subrogable_amount'),
			sql<string>`COALESCE(recoveries.total_recovery, '0')`.as('actual_recovery'),
		])
		.where('cc.claim_id', '=', claimId)
		.where('cc.client_id', '=', clientId)
		.where('cc.deleted_at', 'is', null)
		.orderBy('cc.loss_type')
		.execute();

	return result;
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
 *   - recoverySource: prefix search on recovery_event.recovery_source (filters to claims with matching events)
 *   - recoveryStatus: filters claim.recovery_status
 *   - checklistId: filters by checklist assignment
 * @returns summary object with expected, actual, variance, and recovery rate
 */
export async function getRecoveryMetricsSummary(
	ctx: ProtectedContext,
	range: DateRangeStrict,
	filters?: {
		recoverySource?: string;
		recoveryStatus?: string;
		checklistId?: string;
	}
) {
	const clientId = ctx.session.user.client_id;

	// ===== EXPECTED RECOVERY QUERY (from claims) =====
	// Sum claim.expected_recovery for claims created within the date range
	// Apply same filters as actual query for consistency
	const needsChecklistJoinForExpected = !!filters?.checklistId;

	const expectedQuery = ctx.db
		.selectFrom('claim')
		.$if(needsChecklistJoinForExpected, (qb) =>
			qb.innerJoin('checklist_claim', 'checklist_claim.claim_id', 'claim.id')
		)
		.select(({ fn }) =>
			fn.coalesce(fn.sum<string>('claim.expected_recovery'), sql<string>`'0'`).as('total_expected')
		)
		.where('claim.client_id', '=', clientId)
		.where('claim.created_at', '>=', range[0])
		.where('claim.created_at', '<=', range[1])
		.$if(!!filters?.recoveryStatus, (qb) =>
			qb.where('claim.recovery_status', '=', filters!.recoveryStatus!)
		)
		.$if(!!filters?.checklistId, (qb) =>
			qb.where('checklist_claim.checklist_id' as any, '=', filters!.checklistId!)
		)
		// For recoverySource, use EXISTS to filter claims that have matching recovery events
		.$if(!!filters?.recoverySource, (qb) =>
			qb.where(({ exists, selectFrom }) =>
				exists(
					selectFrom('recovery_event')
						.select(sql`1`.as('one'))
						.whereRef('recovery_event.claim_id', '=', 'claim.id')
						.where('recovery_event.deleted_at', 'is', null)
						.where('recovery_event.recovery_date', '>=', range[0])
						.where('recovery_event.recovery_date', '<=', range[1])
						.where('recovery_event.recovery_source', 'ilike', `${filters!.recoverySource}%`)
				)
			)
		);

	// ===== ACTUAL RECOVERY QUERY (from claim.actual_recovery) =====
	// Uses the cached claim-level total for consistency with expected_recovery.
	// Both are claim cohort metrics: "for claims created in this period, what is the full picture?"
	// Individual recovery_event dates are only relevant for event-level table views.
	const actualQuery = ctx.db
		.selectFrom('claim')
		.$if(!!filters?.checklistId, (qb) =>
			qb.innerJoin('checklist_claim', 'checklist_claim.claim_id', 'claim.id')
		)
		.select(({ fn }) =>
			fn.coalesce(fn.sum<string>('claim.actual_recovery'), sql<string>`'0'`).as('total_actual')
		)
		.where('claim.client_id', '=', clientId)
		.where('claim.created_at', '>=', range[0])
		.where('claim.created_at', '<=', range[1])
		.$if(!!filters?.recoverySource, (qb) =>
			qb.where(({ exists, selectFrom }) =>
				exists(
					selectFrom('recovery_event')
						.select(sql`1`.as('one'))
						.whereRef('recovery_event.claim_id', '=', 'claim.id')
						.where('recovery_event.deleted_at', 'is', null)
						.where('recovery_event.recovery_source', 'ilike', `${filters!.recoverySource}%`)
				)
			)
		)
		.$if(!!filters?.recoveryStatus, (qb) =>
			qb.where('claim.recovery_status', '=', filters!.recoveryStatus!)
		)
		.$if(!!filters?.checklistId, (qb) =>
			qb.where('checklist_claim.checklist_id' as any, '=', filters!.checklistId!)
		);

	// Run both queries in parallel
	const [expectedResult, actualResult] = await Promise.all([
		expectedQuery.executeTakeFirst(),
		actualQuery.executeTakeFirst(),
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
 * @param filters - optional filters
 *   - recoverySource: prefix search on recovery_event.recovery_source (filters to claims with matching events)
 *   - recoveryStatus: filters claim.recovery_status
 *   - checklistId: filters by checklist assignment
 * @returns array of monthly data points
 */
export async function getRecoveryMetricsTimeSeries(
	ctx: ProtectedContext,
	range: DateRangeStrict,
	filters?: {
		recoverySource?: string;
		recoveryStatus?: string;
		checklistId?: string;
	}
) {
	const clientId = ctx.session.user.client_id;

	// Build the monthly_series CTE using generate_series
	// Convert JS dates to ISO strings and use AT TIME ZONE 'UTC' to avoid timezone issues
	const startDateStr = range[0].toISOString();
	const endDateStr = range[1].toISOString();

	const monthlySeries = ctx.db
		.selectFrom(
			sql<{ month_start: string }>`generate_series(
				date_trunc('month', ${startDateStr}::timestamptz AT TIME ZONE 'UTC'),
				date_trunc('month', ${endDateStr}::timestamptz AT TIME ZONE 'UTC'),
				interval '1 month'
			)`.as('gs')
		)
		.select(sql<string>`gs::date`.as('month_start'))
		.as('monthly_series');

	// ===== EXPECTED BY MONTH CTE (from claims) =====
	// Groups claim.expected_recovery by date_trunc('month', claim.created_at)
	const needsChecklistJoinForExpected = !!filters?.checklistId;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let expectedQuery: any = ctx.db.selectFrom('claim as c');

	if (needsChecklistJoinForExpected) {
		expectedQuery = expectedQuery.innerJoin('checklist_claim as cc', 'cc.claim_id', 'c.id');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let expectedBaseQuery: any = expectedQuery
		.select([
			sql<string>`date_trunc('month', c.created_at)::date`.as('month_start'),
			sql<number>`COALESCE(SUM(c.expected_recovery), 0)::numeric`.as('total_expected'),
		])
		.where('c.client_id', '=', clientId)
		.where('c.created_at', '>=', range[0])
		.where('c.created_at', '<=', range[1]);

	// Apply filters to expected query
	if (filters?.recoveryStatus) {
		expectedBaseQuery = expectedBaseQuery.where('c.recovery_status', '=', filters.recoveryStatus);
	}
	if (filters?.checklistId) {
		expectedBaseQuery = expectedBaseQuery.where(
			sql.ref('cc.checklist_id'),
			'=',
			filters.checklistId
		);
	}
	// For recoverySource, use EXISTS to filter claims with matching recovery events
	if (filters?.recoverySource) {
		expectedBaseQuery = expectedBaseQuery.where(({ exists, selectFrom }: any) =>
			exists(
				selectFrom('recovery_event as re_sub')
					.select(sql`1`.as('one'))
					.whereRef('re_sub.claim_id', '=', 'c.id')
					.where('re_sub.deleted_at', 'is', null)
					.where('re_sub.recovery_date', '>=', range[0])
					.where('re_sub.recovery_date', '<=', range[1])
					.where('re_sub.recovery_source', 'ilike', `${filters.recoverySource}%`)
			)
		);
	}

	const expectedByMonth = expectedBaseQuery
		.groupBy(sql`date_trunc('month', c.created_at)`)
		.as('expected_by_month');

	// ===== ACTUAL BY MONTH CTE (from claim.actual_recovery) =====
	// Uses the cached claim-level total, grouped by claim.created_at month.
	// Consistent with expected: both are claim cohort metrics.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let actualQuery: any = ctx.db.selectFrom('claim as c2');

	const needsChecklistJoinActual = !!filters?.checklistId;
	if (needsChecklistJoinActual) {
		actualQuery = actualQuery.innerJoin('checklist_claim as cc2', 'cc2.claim_id', 'c2.id');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let actualBaseQuery: any = actualQuery
		.select([
			sql<string>`date_trunc('month', c2.created_at)::date`.as('month_start'),
			sql<number>`COALESCE(SUM(c2.actual_recovery), 0)::numeric`.as('total_actual'),
		])
		.where('c2.client_id', '=', clientId)
		.where('c2.created_at', '>=', range[0])
		.where('c2.created_at', '<=', range[1]);

	// Add conditional filters
	if (filters?.recoverySource) {
		actualBaseQuery = actualBaseQuery.where(({ exists, selectFrom }: any) =>
			exists(
				selectFrom('recovery_event as re_sub')
					.select(sql`1`.as('one'))
					.whereRef('re_sub.claim_id', '=', 'c2.id')
					.where('re_sub.deleted_at', 'is', null)
					.where('re_sub.recovery_source', 'ilike', `${filters.recoverySource}%`)
			)
		);
	}
	if (filters?.recoveryStatus) {
		actualBaseQuery = actualBaseQuery.where(
			sql.ref('c2.recovery_status'),
			'=',
			filters.recoveryStatus
		);
	}
	if (filters?.checklistId) {
		actualBaseQuery = actualBaseQuery.where(sql.ref('cc2.checklist_id'), '=', filters.checklistId);
	}

	const actualByMonth = actualBaseQuery
		.groupBy(sql`date_trunc('month', c2.created_at)`)
		.as('actual_by_month');

	// Join monthly_series with both expected_by_month and actual_by_month
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let joinedQuery: any = ctx.db.selectFrom(monthlySeries);
	joinedQuery = joinedQuery.leftJoin(
		expectedByMonth,
		'expected_by_month.month_start',
		'monthly_series.month_start'
	);
	joinedQuery = joinedQuery.leftJoin(
		actualByMonth,
		'actual_by_month.month_start',
		'monthly_series.month_start'
	);

	const results = await joinedQuery
		.select([
			sql<string>`monthly_series.month_start::text`.as('month_start'),
			sql<number>`COALESCE(expected_by_month.total_expected, 0)::float`.as('expected_recovery'),
			sql<number>`COALESCE(actual_by_month.total_actual, 0)::float`.as('actual_recovery'),
		])
		.orderBy('monthly_series.month_start')
		.execute();

	return results;
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
	}
): Promise<{
	q1: string;
	q2: string;
	q3: string;
	q4: string;
}> {
	const clientId = ctx.session.user.client_id!;

	// Use provided fiscal year start or default from config
	const fiscalYearStart = params?.fiscalYearStart
		? dayjs(params.fiscalYearStart)
		: getFiscalYearStart();

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

	// Query all quarters in a single pass using CASE WHEN to assign quarters
	let query = ctx.db
		.selectFrom('recovery_event')
		.select((eb) => [
			eb.fn
				.sum(
					sql`CASE WHEN recovery_date >= ${quarters[0].start} AND recovery_date <= ${quarters[0].end} THEN recovery_amount::numeric ELSE 0 END`
				)
				.as('q1'),
			eb.fn
				.sum(
					sql`CASE WHEN recovery_date >= ${quarters[1].start} AND recovery_date <= ${quarters[1].end} THEN recovery_amount::numeric ELSE 0 END`
				)
				.as('q2'),
			eb.fn
				.sum(
					sql`CASE WHEN recovery_date >= ${quarters[2].start} AND recovery_date <= ${quarters[2].end} THEN recovery_amount::numeric ELSE 0 END`
				)
				.as('q3'),
			eb.fn
				.sum(
					sql`CASE WHEN recovery_date >= ${quarters[3].start} AND recovery_date <= ${quarters[3].end} THEN recovery_amount::numeric ELSE 0 END`
				)
				.as('q4'),
		])
		.where('client_id', '=', clientId)
		.where('deleted_at', 'is', null)
		.where('recovery_date', '>=', quarters[0].start)
		.where('recovery_date', '<=', quarters[3].end);

	const result = await query.executeTakeFirst();

	// Format results into expected shape
	return {
		q1: (result?.q1 || 0).toString(),
		q2: (result?.q2 || 0).toString(),
		q3: (result?.q3 || 0).toString(),
		q4: (result?.q4 || 0).toString(),
	};
}
