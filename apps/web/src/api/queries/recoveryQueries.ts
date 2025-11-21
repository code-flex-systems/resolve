import { sql, type CompiledQuery } from 'kysely';
import { ProtectedContext } from '@/server/trpc/trpc';
import { RecoveryEventParams, DeadlineParams } from '@/schemas/recoverySchemas';
import { DeadlineStatus } from '@/config/enums';
import { DateRangeStrict } from '@/types/types';
import { TRPCError } from '@trpc/server';
import config from '@/config/config';
import dayjs from 'dayjs';

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

	// Check if we're already in a transaction to avoid nested transactions
	const isInTransaction = ctx.db.isTransaction;

	const executeOperation = async (trx: any) => {
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
		.orderBy('recovery_date desc')
		.orderBy('created_at desc')
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
		.leftJoin('checklist_claim', 'claim.id', 'checklist_claim.claim_id')
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
			'claim.reserved_recovery', // Client's expected recovery (from feed/manual)
			'claim.paid_recovery', // Client's reported paid amount (from feed/manual)
			'claim.expected_recovery', // Team's forecasted recovery
			'claim.actual_recovery', // Team's meaningful payments (calculated from recovery events)
			'checklist_claim.checklist_id',
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
		query = query.where(sql`recovery_event.recovery_source ILIKE ${`%${filters.recoverySource}%`}`);
	}

	// Filter by recovery status on claim
	if (filters.recoveryStatus) {
		query = query.where('claim.recovery_status', '=', filters.recoveryStatus);
	}

	// Filter by checklist
	if (filters.checklistId) {
		query = query.where('checklist_claim.checklist_id', '=', filters.checklistId);
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
		.leftJoin('checklist_claim', 'claim.id', 'checklist_claim.claim_id')
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

	if (filters.checklistId) {
		query = query.where('checklist_claim.checklist_id', '=', filters.checklistId);
	}

	if (filters.userId) {
		query = query.where('checklist_claim.assignee', '=', filters.userId);
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
 * Note: This function doesn't need transaction handling since it's a single insert operation.
 * The transaction is managed by the controller when logging is needed.
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @param params - deadline parameters
 * @returns created deadline
 */
export async function createDeadline(ctx: ProtectedContext, claimId: number, params: Omit<DeadlineParams, 'claim_id'>) {
	return await ctx.db
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
 * @param filters - optional claim ID, status, date range, and personalOnly flag
 * @returns list of deadlines
 */
export async function getDeadlines(
	ctx: ProtectedContext,
	filters: { claimId?: number; status?: string; dateRange?: DateRangeStrict; personalOnly?: boolean }
) {
	const isAdmin = ctx.session.user.role === 'Admin' || ctx.session.user.role === 'Super Admin';

	let query = ctx.db
		.selectFrom('deadline')
		.innerJoin('claim', 'deadline.claim_id', 'claim.id')
		.selectAll('deadline')
		.select('claim.claim_number')
		.where('deadline.client_id', '=', ctx.session.user.client_id);

	// Filter by personal assignments if personalOnly flag is true, or if user is a Contributor
	const shouldFilterPersonal = filters.personalOnly || !isAdmin;

	if (shouldFilterPersonal) {
		query = query
			.innerJoin('checklist_claim', 'claim.id', 'checklist_claim.claim_id')
			.leftJoin('user_desk_location', (join) =>
				join
					.onRef('checklist_claim.desk_location_id', '=', 'user_desk_location.desk_location_id')
					.on('user_desk_location.user_id', '=', ctx.session.user.id)
					.on('user_desk_location.removed_at', 'is', null)
			)
			.where((eb) =>
				eb.or([
					eb('checklist_claim.created_by', '=', ctx.session.user.id),
					eb('checklist_claim.assignee', '=', ctx.session.user.id),
					eb('user_desk_location.desk_location_id', 'is not', null), // Assigned to their desk location
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

	return await query.orderBy('deadline.deadline_date asc').orderBy('deadline.created_at desc').execute();
}

/**
 * Update a deadline's status.
 *
 * @param ctx - request context
 * @param deadlineId - deadline identifier
 * @param status - new status
 * @returns updated deadline
 */
export async function updateDeadlineStatus(ctx: ProtectedContext, deadlineId: number, status: DeadlineStatus) {
	const updated = await ctx.db
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
 * Fetch a deadline for logging before deletion.
 */
export async function getDeadlineForDeletion(ctx: ProtectedContext, deadlineId: number) {
	return await ctx.db
		.selectFrom('deadline')
		.select(['id', 'claim_id', 'deadline_date', 'deadline_type', 'status', 'description'])
		.where('id', '=', deadlineId)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

/**
 * Delete a deadline.
 *
 * @param ctx - request context
 * @param deadlineId - deadline identifier
 */
export async function deleteDeadline(ctx: ProtectedContext, deadlineId: number) {
	const deleted = await ctx.db
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
	// Build expected recovery query
	let expectedQuery = ctx.db
		.selectFrom('claim')
		.select(({ fn }) => fn.sum('expected_recovery').as('total_expected'))
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.where('claim.created_at', '>=', range[0])
		.where('claim.created_at', '<=', range[1]);

	// Apply filters to expected query if needed
	if (filters?.recoveryStatus) {
		expectedQuery = expectedQuery.where('claim.recovery_status', '=', filters.recoveryStatus);
	}

	// If filtering by recoverySource, only include claims that have recovery events from that source
	// Use EXISTS to avoid duplicate rows from join
	if (filters?.recoverySource) {
		expectedQuery = expectedQuery.where(({ eb, exists, selectFrom }) =>
			exists(
				selectFrom('recovery_event')
					.select('recovery_event.id')
					.whereRef('recovery_event.claim_id', '=', 'claim.id')
					.where('recovery_event.recovery_source', 'ilike', `%${filters.recoverySource}%`)
			)
		);
	}

	// Join checklist_claim once if either checklistId or userId filter is provided
	if (filters?.checklistId || filters?.userId) {
		expectedQuery = expectedQuery.innerJoin('checklist_claim', 'claim.id', 'checklist_claim.claim_id');

		if (filters.checklistId) {
			expectedQuery = expectedQuery.where('checklist_claim.checklist_id', '=', filters.checklistId);
		}
		if (filters.userId) {
			expectedQuery = expectedQuery.where('checklist_claim.assignee', '=', filters.userId);
		}
	}

	// Build actual recovery query - use different base depending on filters
	let actualQueryBase = ctx.db.selectFrom('recovery_event');

	// Add joins if needed for filters
	if (filters?.recoveryStatus || filters?.checklistId || filters?.userId) {
		actualQueryBase = actualQueryBase.innerJoin('claim', 'recovery_event.claim_id', 'claim.id');

		if (filters?.checklistId || filters?.userId) {
			actualQueryBase = actualQueryBase.innerJoin('checklist_claim', 'claim.id', 'checklist_claim.claim_id');
		}
	}

	const actualQuery = actualQueryBase
		.select(({ fn }) => fn.sum('recovery_amount').as('total_actual'))
		.where('recovery_event.client_id', '=', ctx.session.user.client_id)
		.where('recovery_event.recovery_date', '>=', range[0])
		.where('recovery_event.recovery_date', '<=', range[1])
		.$if(!!filters?.recoverySource, (qb) =>
			qb.where('recovery_event.recovery_source', 'ilike', `%${filters!.recoverySource}%`)
		)
		.$if(!!filters?.recoveryStatus, (qb) => qb.where('claim.recovery_status', '=', filters!.recoveryStatus))
		.$if(!!filters?.checklistId, (qb) => qb.where('checklist_claim.checklist_id', '=', filters!.checklistId))
		.$if(!!filters?.userId, (qb) => qb.where('checklist_claim.assignee', '=', filters!.userId));

	// Run both queries in parallel
	const [expectedResult, actualResult] = await Promise.all([
		expectedQuery.executeTakeFirst(),
		actualQuery.executeTakeFirst(),
	]);

	const totalExpected = expectedResult?.total_expected ? parseFloat(expectedResult.total_expected.toString()) : 0;

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
	// Build JOIN and WHERE clauses for filters
	const expectedJoins: string[] = [];

	// Join checklist_claim if needed
	if (filters?.checklistId || filters?.userId) {
		expectedJoins.push('INNER JOIN checklist_claim cc ON c.id = cc.claim_id');
	}

	const expectedJoinsStr = expectedJoins.join(' ');

	const expectedFilterClauses: string[] = [];
	if (filters?.recoveryStatus) {
		expectedFilterClauses.push(`c.recovery_status = '${filters.recoveryStatus}'`);
	}
	if (filters?.recoverySource) {
		// Use EXISTS to avoid duplicates from joining recovery_event
		expectedFilterClauses.push(
			`EXISTS (SELECT 1 FROM recovery_event re_exists WHERE re_exists.claim_id = c.id AND re_exists.recovery_source ILIKE '%${filters.recoverySource}%')`
		);
	}
	if (filters?.checklistId) {
		expectedFilterClauses.push(`cc.checklist_id = ${filters.checklistId}`);
	}
	if (filters?.userId) {
		expectedFilterClauses.push(`cc.assignee = '${filters.userId}'`);
	}
	const expectedWhereClause = expectedFilterClauses.length > 0 ? `AND ${expectedFilterClauses.join(' AND ')}` : '';

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
			${sql.raw(expectedJoinsStr)}
			WHERE c.client_id = ${ctx.session.user.client_id}
				AND c.created_at >= ${range[0]}
				AND c.created_at <= ${range[1]}
				${sql.raw(expectedWhereClause)}
			GROUP BY date_trunc('month', c.created_at)
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
			COALESCE(ebm.total_expected, 0)::float as expected_recovery,
			COALESCE(abm.total_actual, 0)::float as actual_recovery
		FROM monthly_series ms
		LEFT JOIN expected_by_month ebm ON ms.month_start = ebm.month_start
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
