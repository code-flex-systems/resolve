import { sql } from 'kysely';
import { ProtectedContext } from '@/server/trpc/trpc';
import { RecoveryEventParams, RecoveryEventUpdateParams } from '@/schemas/recoverySchemas';
import { DateRangeStrict } from '@/types/types';
import { TRPCError } from '@trpc/server';
import { getFiscalYearStart } from '@/config/config';
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
export async function getRecoveryEvents(ctx: ProtectedContext, claimId: number) {
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
 * Soft delete (archive) a recovery event and update claim's actual_recovery.
 * Returns all fields needed for logging - no separate fetch required.
 *
 * @param ctx - request context
 * @param recoveryEventId - recovery event identifier
 * @param claimId - claim identifier for verification and recalculation
 * @returns archived recovery event with all fields needed for logging
 */
export async function archiveRecoveryEvent(ctx: ProtectedContext, recoveryEventId: number, claimId: number) {
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
	const archivedAmount = parseFloat(archived.recovery_amount);
	await ctx.db
		.updateTable('claim')
		.set({
			actual_recovery: sql`COALESCE(actual_recovery::numeric, 0) - ${archivedAmount}`,
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
	settlementId: number,
	claimId: number
) {
	const clientId = ctx.session.user.client_id!;

	// Bulk soft delete and return all fields needed for logging via RETURNING
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

	if (archived.length > 0) {
		// Calculate total and decrement claim's actual_recovery in one operation
		const totalAmount = archived.reduce(
			(sum, event) => sum + parseFloat(event.recovery_amount),
			0
		);

		await ctx.db
			.updateTable('claim')
			.set({
				actual_recovery: sql`COALESCE(actual_recovery::numeric, 0) - ${totalAmount}`,
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
	recoveryEventId: number,
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
		.where('recovery_event.deleted_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();

	// Update claim's actual_recovery by delta if amount changed
	if (params.recovery_amount !== undefined) {
		const oldAmount = parseFloat(existing.recovery_amount);
		const newAmount = params.recovery_amount;
		const delta = newAmount - oldAmount;

		await ctx.db
			.updateTable('claim')
			.set({
				actual_recovery: sql`COALESCE(actual_recovery::numeric, 0) + ${delta}`,
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

	if (filters.userId) {
		query = query.where('recovery_event.created_by', '=', filters.userId);
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
export async function recalculateClaimRecovery(trx: any, claimId: number, clientId: string) {
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
export async function getRecoverySummaryByCoverage(ctx: ProtectedContext, claimId: number) {
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
		.where('recovery_event.deleted_at', 'is', null)
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
 *   - recoverySource: applies to both (filters to claims with recovery events from matching source - prefix search)
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

	// Build the monthly_series CTE using generate_series
	const monthlySeries = ctx.db
		.selectFrom(
			sql<{ month_start: string }>`generate_series(
				date_trunc('month', ${range[0]}::timestamp),
				date_trunc('month', ${range[1]}::timestamp),
				interval '1 month'
			)`.as('gs')
		)
		.select(sql<string>`date_trunc('month', gs)::date`.as('month_start'))
		.as('monthly_series');

	// Build the actual_by_month CTE with conditional joins and parameterized filters
	// Start with base query
	let actualQuery = ctx.db.selectFrom('recovery_event as re');

	// Add conditional joins based on filters
	const needsClaimJoin = filters?.recoveryStatus || filters?.checklistId || filters?.userId;
	const needsChecklistJoin = filters?.checklistId || filters?.userId;

	if (needsClaimJoin) {
		actualQuery = actualQuery.innerJoin('claim as c2', 'c2.id', 're.claim_id');
	}
	if (needsChecklistJoin) {
		actualQuery = actualQuery.innerJoin('checklist_claim as cc2', 'cc2.claim_id', 'c2.id');
	}

	// Add selections and base filters
	let baseQuery = actualQuery
		.select([
			sql<string>`date_trunc('month', re.recovery_date)::date`.as('month_start'),
			sql<number>`COALESCE(SUM(re.recovery_amount), 0)::numeric`.as('total_actual'),
		])
		.where('re.client_id', '=', ctx.session.user.client_id)
		.where('re.deleted_at', 'is', null)
		.where('re.recovery_date', '>=', range[0])
		.where('re.recovery_date', '<=', range[1]);

	// Add conditional filters - all parameterized to prevent SQL injection
	if (filters?.recoverySource) {
		baseQuery = baseQuery.where('re.recovery_source', 'ilike', `${filters.recoverySource}%`);
	}
	if (filters?.recoveryStatus) {
		baseQuery = baseQuery.where(sql.ref('c2.recovery_status'), '=', filters.recoveryStatus);
	}
	if (filters?.checklistId) {
		baseQuery = baseQuery.where(sql.ref('cc2.checklist_id'), '=', filters.checklistId);
	}
	if (filters?.userId) {
		baseQuery = baseQuery.where(sql.ref('cc2.assignee'), '=', filters.userId);
	}

	const actualByMonth = baseQuery.groupBy(sql`date_trunc('month', re.recovery_date)`).as('actual_by_month');

	// Join monthly_series with actual_by_month and return results
	const results = await ctx.db
		.selectFrom(monthlySeries)
		.leftJoin(actualByMonth, 'actual_by_month.month_start', 'monthly_series.month_start')
		.select([
			sql<string>`monthly_series.month_start::text`.as('month_start'),
			sql<number>`0::float`.as('expected_recovery'),
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
	const fiscalYearStart = params?.fiscalYearStart ? dayjs(params.fiscalYearStart) : getFiscalYearStart();

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

	// Optional user filter
	if (params?.userId) {
		query = query.where('created_by', '=', params.userId);
	}

	const result = await query.executeTakeFirst();

	// Format results into expected shape
	return {
		q1: (result?.q1 || 0).toString(),
		q2: (result?.q2 || 0).toString(),
		q3: (result?.q3 || 0).toString(),
		q4: (result?.q4 || 0).toString(),
	};
}
