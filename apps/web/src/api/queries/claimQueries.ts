import { sql } from 'kysely';
import { ClaimSearch, ClaimStatus, FeedStatus, LineOfBusiness, LossType, RecoveryStatus } from '@/config/enums';
import { Claim } from '@/types/types';
import { ProtectedContext } from '@/server/trpc/trpc';
import { getCurrentFiscalQuarterStart } from '@/lib/utils/utils';
import { TRPCError } from '@trpc/server';
import config from '@/config/config';

/**
 * Verify that a checklist exists and is accessible.
 * Admins can access all checklists, regular users can only access published checklists.
 *
 * @param ctx - request context
 * @param checklistId - checklist identifier to verify
 * @throws TRPCError if checklist is not found or not accessible
 */
async function assertChecklistPublished(ctx: ProtectedContext, checklistId: number) {
	const isAdmin = ctx.session.user.role === config.ROLES.ADMIN || ctx.session.user.role === config.ROLES.SUPER_ADMIN;
	const checklist = await ctx.db
		.selectFrom('checklist')
		.select(['id'])
		.where('checklist.client_id', '=', ctx.session.user.client_id)
		.where('checklist.id', '=', checklistId)
		.where((eb) => (isAdmin ? eb.lit(true) : eb('checklist.published', '=', true)))
		.executeTakeFirst();
	if (!checklist) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: isAdmin ? 'Checklist not found.' : 'Checklist is not published.',
		});
	}
}

export async function assignClaim(ctx: ProtectedContext, checklistId: number, claimId: number, assignee: string) {
	await assertChecklistPublished(ctx, checklistId);
	return await ctx.db
		.insertInto('checklist_claim')
		.values({
			checklist_id: checklistId,
			claim_id: claimId,
			client_id: ctx.session.user.client_id,
			created_by: ctx.session.user.id,
			status: ClaimStatus.UNWORKED,
			assignee,
		})
		.executeTakeFirstOrThrow();
}

/**
 * Retrieve a claim and update its last opened timestamp for a checklist.
 *
 * @param ctx - request context
 * @param checklistId - checklist referencing the claim
 * @param claimId - claim identifier
 * @returns claim record
 */
export async function getClaim(ctx: ProtectedContext, claimId: number, checklistId?: number) {
	if (checklistId !== undefined) {
		await assertChecklistPublished(ctx, checklistId);
		await ctx.db
			.insertInto('checklist_claim')
			.values({
				checklist_id: checklistId,
				claim_id: claimId,
				client_id: ctx.session.user.client_id,
				created_by: ctx.session.user.id,
				status: ClaimStatus.UNWORKED,
				assignee: ctx.session.user.id,
			})
			.onConflict((oc) => oc.columns(['checklist_id', 'claim_id']).doUpdateSet({ last_opened: sql`now()` }))
			.execute();
	}
	return await ctx.db
		.selectFrom('claim')
		.selectAll()
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.where('id', '=', claimId)
		.executeTakeFirstOrThrow();
}

export async function getNextClaimToAssign(ctx: ProtectedContext, feedId: number, offset = 0) {
	const row = await ctx.db
		.with('base', (qb) =>
			qb
				.selectFrom('claim')
				.selectAll('claim')
				.where('claim.client_id', '=', ctx.session.user.client_id)
				.where('claim.feed_id', '=', feedId)
				.where((eb) =>
					eb.not(
						eb.exists(
							eb
								.selectFrom('checklist_claim')
								.select(sql.raw('1').as('row'))
								.whereRef('checklist_claim.claim_id', '=', 'claim.id')
						)
					)
				)
		)
		.with('totals', (qb) => qb.selectFrom('base').select(sql<number>`count(*)`.as('total_unassigned')))
		.with('next_row', (qb) =>
			qb.selectFrom('base').selectAll().orderBy('created_at asc').orderBy('id asc').offset(offset).limit(1)
		)
		.selectFrom('totals')
		// ON TRUE; Kysely trick: 1 = 1
		.leftJoin('next_row', (join) => join.on(sql.raw('1'), '=', sql.raw('1')))
		.select(['totals.total_unassigned'])
		.selectAll('next_row')
		.executeTakeFirst();

	const { total_unassigned = 0, ...maybeClaim } = (row ?? {}) as any;
	// If next_row didn't exist, all its cols are null => claim = null
	const claim = row && maybeClaim.id != null ? (maybeClaim as Awaited<ReturnType<typeof getClaim>>) : null;

	return { claim, total: parseInt(total_unassigned.toString()) };
}

/**
 * Query claims or a count of claims with optional feed and search filters.
 *
 * @param ctx - request context
 * @param param1 - filter options including type and pagination
 * @returns claim rows or a count depending on type
 */
export async function getClaims(
	ctx: ProtectedContext,
	{
		type,
		feedId,
		searchTerm,
		line_of_business,
		loss_type,
		recovery_status,
		insured,
		client,
		limit,
		offset,
	}: {
		type: 'data' | 'count';
		feedId?: number | null;
		searchTerm?: { value: string; type: ClaimSearch };
		line_of_business?: LineOfBusiness;
		loss_type?: LossType;
		recovery_status?: RecoveryStatus;
		insured?: string;
		client?: string;
		limit?: number;
		offset?: number;
	}
) {
	const isAdmin = ctx.session.user.role === config.ROLES.ADMIN || ctx.session.user.role === config.ROLES.SUPER_ADMIN;

	let query = ctx.db
		.selectFrom('claim')
		.leftJoin('feeds', 'claim.feed_id', 'feeds.id')
		.where('claim.client_id', '=', ctx.session.user.client_id);

	// Claim visibility filtering for contributors:
	// Contributors can only see claims that are:
	// 1. Owned by them (created_by in checklist_claim)
	// 2. Assigned to them (assignee in checklist_claim)
	// 3. Not assigned/worked (no entry in checklist_claim)
	// 4. Assigned to a desk location they are assigned to (desk-based access via claim.desk_location_id)
	if (!isAdmin) {
		query = query
			.leftJoin('checklist_claim as cc', 'claim.id', 'cc.claim_id')
			.leftJoin('user_desk_location as udl', (join) =>
				join
					.onRef('claim.desk_location_id', '=', 'udl.desk_location_id')
					.on('udl.user_id', '=', ctx.session.user.id)
					.on('udl.removed_at', 'is', null)
			)
			.where((eb) =>
				eb.or([
					eb('cc.created_by', '=', ctx.session.user.id), // Owned by them
					eb('cc.assignee', '=', ctx.session.user.id), // Assigned to them
					eb('cc.claim_id', 'is', null), // Not in checklist_claim (available)
					eb('udl.desk_location_id', 'is not', null), // Assigned to their desk location
				])
			);
	}

	query =
		feedId !== undefined
			? query.where('feed_id', feedId === null ? 'is' : '=', feedId)
			: query.where((eb) =>
					eb.or([eb('feeds.status', 'is', null), eb('feeds.status', '<>', FeedStatus.INACTIVE)])
				);

	if (searchTerm) {
		query = query.where((eb) =>
			eb(sql`lower(${eb.ref(searchTerm.type)})`, 'like', `${searchTerm.value.toLowerCase()}%`)
		);
	}

	if (line_of_business) {
		query = query
			.leftJoin('claim_party', 'claim_party.claim_id', 'claim.id')
			.where('claim_party.line_of_business', '=', line_of_business)
			.where('claim_party.deleted_at', 'is', null)
			.groupBy('claim.id')
			.groupBy('feeds.id');
	}

	if (loss_type) {
		query = query.where('claim.loss_type', '=', loss_type);
	}

	if (recovery_status) {
		query = query.where('claim.recovery_status', '=', recovery_status);
	}

	if (insured) {
		query = query.where((eb) => eb(sql`lower(${eb.ref('claim.insured')})`, 'like', `%${insured.toLowerCase()}%`));
	}

	if (client) {
		query = query.where((eb) => eb(sql`lower(${eb.ref('claim.client')})`, 'like', `%${client.toLowerCase()}%`));
	}

	if (type === 'data') {
		if (limit != null) {
			query = query.limit(limit);
		}
		if (offset != null) {
			query = query.offset(offset);
		}
		// Column restrictions: Contributors only see columns needed for search UI
		if (isAdmin) {
			query = query.selectAll('claim').select(['feeds.name as feed_name']).orderBy('claim.claim_number');
		} else {
			query = query
				.select([
					'claim.id',
					'claim.claim_number',
					'claim.insured',
					'claim.date_of_loss',
					'feeds.name as feed_name',
				])
				.orderBy('claim.claim_number');
		}
		return await query.execute();
	} else {
		query = query.select(({ fn }) => fn.countAll().as('count'));
		const count = await query.executeTakeFirst();
		return !!count && 'count' in count ? parseInt(count.count?.toString() ?? '0') : 0;
	}
}

/**
 * Query a count of claims.
 *
 * @param ctx - request context
 * @param clientId - required client ID
 * @returns a count
 */
export async function getClaimCount(ctx: ProtectedContext, clientId: string) {
	const results = await ctx.db
		.selectFrom('claim')
		.select(({ eb, fn }) => [
			eb.case().when('feed_id', 'is', null).then(true).else(false).end().as('manual'),
			fn.count('id').as('count'),
		])
		.where('claim.client_id', '=', clientId)
		.groupBy('manual')
		.execute();
	let total = 0;
	const formattedResults = results.map((r) => {
		const count = parseInt(r.count.toString());
		total += count;
		return { ...r, count };
	});
	return {
		total,
		fed: formattedResults.find((r) => !r.manual)?.count ?? 0,
		manual: formattedResults.find((r) => r.manual)?.count ?? 0,
	};
}

export async function getRolloverClaimCount(ctx: ProtectedContext) {
	const currentFQStartDate = getCurrentFiscalQuarterStart().toDate();
	const count = await ctx.db
		.selectFrom('claim')
		.leftJoin('checklist_claim', 'claim.id', 'checklist_claim.claim_id')
		.leftJoin('checklist', (join) =>
			join
				.onRef('checklist_claim.checklist_id', '=', 'checklist.id')
				.on('checklist.client_id', '=', ctx.session.user.client_id)
		)
		.select(({ fn }) => fn.countAll().as('count'))
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.where((eb) =>
			eb.or([
				eb.and([eb('checklist_claim.claim_id', 'is', null), eb('claim.created_at', '<', currentFQStartDate)]),
				eb('checklist_claim.created_at', '<', currentFQStartDate),
			])
		)
		.executeTakeFirstOrThrow();
	return { count: parseInt(count.count.toString()) };
}

/**
 * Update an existing claim
 */
export async function updateClaim(
	ctx: ProtectedContext,
	claimId: number,
	updates: Partial<{
		claim_number: string | null;
		client: string | null;
		client_adjuster: string | null;
		insured: string | null;
		claim_amount: string | null;
		total_incurred: string | null;
		date_of_loss: Date | null;
		loss_location: string | null;
		reserved_recovery: string | null; // Client's expected recovery (from feed/manual)
		paid_recovery: string | null; // Client's reported paid amount (from feed/manual)
		expected_recovery: string | null; // Team's forecasted recovery
		loss_type: string;
		recovery_status: string;
		substatus: string;
	}>
) {
	const result = await ctx.db
		.updateTable('claim')
		.set({
			...updates,
			last_updated_by: ctx.session.user.id,
			last_update: new Date(),
		})
		.where('id', '=', claimId)
		.where('client_id', '=', ctx.session.user.client_id!)
		.returning([
			'id',
			'claim_number',
			'client',
			'client_adjuster',
			'insured',
			'claim_amount',
			'total_incurred',
			'reserved_recovery',
			'paid_recovery',
			'expected_recovery',
			'actual_recovery',
			'date_of_loss',
			'loss_location',
			'loss_type',
			'recovery_status',
			'substatus',
		])
		.executeTakeFirst();

	return result;
}

/**
 * Bulk insert claim records.
 *
 * @param ctx - request context
 * @param claims - claim objects without ids
 * @returns all created/updated claims
 */
export async function createClaims(ctx: ProtectedContext, claims: Omit<Claim, 'id'>[]) {
	const result = await ctx.db
		.insertInto('claim')
		.values(
			claims.map((c) => ({
				claim_number: c.claim_number,
				client: c.client,
				client_adjuster: c.client_adjuster,
				insured: c.insured,
				claim_amount: c.claim_amount,
				total_incurred: c.total_incurred,
				date_of_loss: c.date_of_loss,
				loss_location: c.loss_location,
				last_updated_by: c.last_updated_by,
				last_update: c.last_update,
				reserved_recovery: c.reserved_recovery, // Client's expected recovery (from feed/manual)
				paid_recovery: c.paid_recovery, // Client's reported paid amount (from feed/manual)
				loss_type: c.loss_type,
				client_id: ctx.session.user.client_id,
				created_by: ctx.session.user.id,
			}))
		)
		.onConflict((oc) =>
			oc.column('claim_number').doUpdateSet((eb) => ({
				client: eb.ref('excluded.client'),
				client_adjuster: eb.ref('excluded.client_adjuster'),
				insured: eb.ref('excluded.insured'),
				claim_amount: eb.ref('excluded.claim_amount'),
				total_incurred: eb.ref('excluded.total_incurred'),
				date_of_loss: eb.ref('excluded.date_of_loss'),
				loss_location: eb.ref('excluded.loss_location'),
				last_updated_by: eb.ref('excluded.last_updated_by'),
				last_update: eb.ref('excluded.last_update'),
				reserved_recovery: eb.ref('excluded.reserved_recovery'),
				paid_recovery: eb.ref('excluded.paid_recovery'),
				loss_type: eb.ref('excluded.loss_type'),
			}))
		)
		.returningAll()
		.execute();
	return result;
}

/**
 * Get aggregated party/liability data for a claim
 * Returns distinct LOBs and summed recovery amounts
 */
export async function getClaimPartyAggregates(ctx: ProtectedContext, claimId: number) {
	const result = await ctx.db
		.selectFrom('claim_party')
		.select(({ fn }) => [
			// Aggregate distinct LOBs as array
			fn.agg<string[]>('array_agg', [sql`DISTINCT line_of_business`]).as('line_of_business_array'),
			// Sum paid recovery
			fn.sum<string>('paid_recovery').as('total_paid_recovery'),
			// Sum reserved recovery
			fn.sum<string>('reserved_recovery').as('total_reserved_recovery'),
		])
		.where('claim_party.claim_id', '=', claimId)
		.where('claim_party.deleted_at', 'is', null)
		.executeTakeFirst();

	// Filter out nulls from LOB array
	const lobs = result?.line_of_business_array?.filter((lob: string | null) => lob !== null) || [];

	return {
		line_of_business: lobs,
		total_paid_recovery: result?.total_paid_recovery || '0',
		total_reserved_recovery: result?.total_reserved_recovery || '0',
	};
}

/**
 * Get detailed claim information for admin panel.
 * Includes checklist assignments, feed info, and recovery data.
 *
 * @param ctx - request context
 * @param claimId - claim identifier
 * @returns detailed claim information
 */
export async function getClaimDetail(ctx: ProtectedContext, claimId: number) {
	const isAdmin = ctx.session.user.role === config.ROLES.ADMIN || ctx.session.user.role === config.ROLES.SUPER_ADMIN;

	// Get basic claim info with feed info
	// Note: actual_recovery is already a column on claim table (sum of recovery_event records)
	const claim = await ctx.db
		.selectFrom('claim')
		.leftJoin('feeds', 'claim.feed_id', 'feeds.id')
		.selectAll('claim')
		.select(['feeds.name as feed_name'])
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.where('claim.id', '=', claimId)
		.executeTakeFirst();

	if (!claim) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Claim not found.',
		});
	}

	// Authorization check for contributors: verify user has access to this claim
	if (!isAdmin) {
		// Check if user has access via checklist_claim (ownership/assignment) or desk location
		const hasAccess = await ctx.db
			.selectFrom('claim')
			.leftJoin('checklist_claim', 'claim.id', 'checklist_claim.claim_id')
			.leftJoin('user_desk_location', (join) =>
				join
					.onRef('claim.desk_location_id', '=', 'user_desk_location.desk_location_id')
					.on('user_desk_location.user_id', '=', ctx.session.user.id)
					.on('user_desk_location.removed_at', 'is', null)
			)
			.select(sql`1`.as('has_access'))
			.where('claim.id', '=', claimId)
			.where((eb) =>
				eb.or([
					eb('checklist_claim.created_by', '=', ctx.session.user.id), // Owned by them
					eb('checklist_claim.assignee', '=', ctx.session.user.id), // Assigned to them
					eb('user_desk_location.desk_location_id', 'is not', null), // Assigned to their desk location
				])
			)
			.executeTakeFirst();

		if (!hasAccess) {
			throw new TRPCError({
				code: 'FORBIDDEN',
				message: 'You do not have access to this claim.',
			});
		}
	}

	// Get all checklist assignments for this claim
	// A claim can be worked in multiple checklists
	const checklistAssignmentsQuery = ctx.db
		.selectFrom('checklist_claim')
		.innerJoin('checklist', 'checklist_claim.checklist_id', 'checklist.id')
		.innerJoin('users as assignee', 'checklist_claim.assignee', 'assignee.id')
		.innerJoin('users as creator', 'checklist_claim.created_by', 'creator.id')
		.leftJoin('users as submitter', 'checklist_claim.submitted_by', 'submitter.id')
		.select((eb) => [
			'checklist_claim.claim_id',
			'checklist_claim.checklist_id',
			'checklist_claim.status',
			'checklist_claim.assignee',
			'checklist_claim.created_by',
			'checklist_claim.submitted_by',
			'checklist_claim.submitted_at',
			'checklist_claim.created_at',
			'checklist_claim.updated_at',
			'checklist_claim.last_opened',
			'checklist_claim.time_to_resolution_days',
			eb.ref('checklist.name').as('checklist_name'),
			eb.ref('assignee.first').as('assignee_first_name'),
			eb.ref('assignee.last').as('assignee_last_name'),
			eb.ref('creator.first').as('creator_first_name'),
			eb.ref('creator.last').as('creator_last_name'),
			eb.ref('submitter.first').as('submitted_by_first_name'),
			eb.ref('submitter.last').as('submitted_by_last_name'),
		])
		.where('checklist_claim.claim_id', '=', claimId)
		.where('checklist_claim.client_id', '=', ctx.session.user.client_id)
		.where((eb) => (isAdmin ? eb.lit(true) : eb('checklist.published', '=', true)))
		.orderBy('checklist_claim.last_opened', 'desc');

	// Get insured coverage summary (claim_coverage table)
	const coverageSummaryQuery = ctx.db
		.selectFrom('claim_coverage')
		.select((eb) => [eb.fn.count('id').as('count'), eb.fn.sum('coverage_amount').as('total')])
		.where('claim_id', '=', claimId)
		.where('client_id', '=', ctx.session.user.client_id);

	// Get party/liability summary (claim_party table - only non-deleted)
	const partySummaryQuery = ctx.db
		.selectFrom('claim_party')
		.select((eb) => [eb.fn.count('id').as('count'), eb.fn.sum('liability_percentage').as('total_liability')])
		.where('claim_id', '=', claimId)
		.where('deleted_at', 'is', null);

	// Get task summary by status
	const taskSummaryQuery = ctx.db
		.selectFrom('task')
		.innerJoin('deadline', 'task.id', 'deadline.entity_id')
		.select((eb) => ['deadline.status', eb.fn.count('task.id').as('count')])
		.where('task.claim_id', '=', claimId)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.groupBy('deadline.status');

	const [checklistAssignments, coverageSummary, partySummary, taskSummary, partyAggregates] = await Promise.all([
		checklistAssignmentsQuery.execute(),
		coverageSummaryQuery.executeTakeFirst(),
		partySummaryQuery.executeTakeFirst(),
		taskSummaryQuery.execute(),
		getClaimPartyAggregates(ctx, claimId),
	]);

	// Transform task summary into object
	const taskCounts = {
		pending: 0,
		in_progress: 0,
		completed: 0,
		cancelled: 0,
	};
	taskSummary.forEach((row) => {
		const status = row.status as keyof typeof taskCounts;
		if (status in taskCounts) {
			taskCounts[status] = Number(row.count);
		}
	});

	return {
		...claim,
		checklistAssignments,
		coverageSummary: {
			count: Number(coverageSummary?.count || 0),
			total: Number(coverageSummary?.total || 0),
		},
		partySummary: {
			count: Number(partySummary?.count || 0),
			totalLiability: Number(partySummary?.total_liability || 0),
		},
		taskSummary: taskCounts,
		aggregated_line_of_business: partyAggregates.line_of_business,
		aggregated_paid_recovery: partyAggregates.total_paid_recovery,
		aggregated_reserved_recovery: partyAggregates.total_reserved_recovery,
	};
}

/**
 * Get all claims assigned to the current user with filters, pagination, and metrics
 *
 * @param ctx - request context
 * @param filters - filter options
 * @returns claims with count and metrics
 */
export async function listMyClaims(
	ctx: ProtectedContext,
	{
		searchTerm,
		claimStatus,
		recoveryStatus,
		limit = 500,
		offset = 0,
		sortField = 'claim.last_update',
		sortOrder = 'desc',
	}: {
		searchTerm?: string;
		claimStatus?: ClaimStatus;
		recoveryStatus?: RecoveryStatus;
		limit?: number;
		offset?: number;
		sortField?: string;
		sortOrder?: 'asc' | 'desc';
	}
) {
	// Base query: get claims where user is the assignee
	let query = ctx.db
		.selectFrom('claim')
		.innerJoin('checklist_claim', 'claim.id', 'checklist_claim.claim_id')
		.innerJoin('checklist', 'checklist_claim.checklist_id', 'checklist.id')
		.leftJoin('feeds', 'claim.feed_id', 'feeds.id')
		.leftJoin('users as assignee_user', 'checklist_claim.assignee', 'assignee_user.id')
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.where('checklist_claim.assignee', '=', ctx.session.user.id);

	// Apply filters
	if (searchTerm && searchTerm.length > 0) {
		query = query.where((eb) =>
			eb.or([
				eb(sql`lower(${eb.ref('claim.claim_number')})`, 'like', `%${searchTerm.toLowerCase()}%`),
				eb(sql`lower(${eb.ref('claim.insured')})`, 'like', `%${searchTerm.toLowerCase()}%`),
				eb(sql`lower(${eb.ref('claim.client')})`, 'like', `%${searchTerm.toLowerCase()}%`),
			])
		);
	}

	if (claimStatus) {
		query = query.where('checklist_claim.status', '=', claimStatus);
	}

	if (recoveryStatus) {
		query = query.where('claim.recovery_status', '=', recoveryStatus);
	}

	// Get total count and metrics from distinct claims to avoid duplicates
	// First get distinct claim IDs with their most recent assignment, then aggregate
	const distinctClaimsSubquery = query
		.distinctOn('claim.id')
		.select(['claim.id', 'claim.claim_amount', 'checklist_claim.created_at as assignment_created_at'])
		.orderBy('claim.id')
		.orderBy('checklist_claim.created_at', 'desc')
		.as('distinct_claims');

	const metricsQuery = await ctx.db
		.selectFrom(distinctClaimsSubquery)
		.select(({ fn }) => [
			fn.countAll().as('count'),
			fn.sum('distinct_claims.claim_amount').as('total_value'),
			fn
				.avg(sql`EXTRACT(epoch FROM (NOW() - distinct_claims.assignment_created_at)) / 86400`)
				.as('avg_days_in_queue'),
		])
		.executeTakeFirst();

	const count = parseInt(metricsQuery?.count?.toString() ?? '0');
	const totalValue = parseFloat(metricsQuery?.total_value?.toString() ?? '0');
	const avgDaysInQueue = parseFloat(metricsQuery?.avg_days_in_queue?.toString() ?? '0');

	// Get data (with optional pagination)
	// Use DISTINCT ON to ensure each claim appears only once (take most recent assignment)
	const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';
	const rows = await query
		.distinctOn('claim.id')
		.select([
			'claim.id',
			'claim.claim_number',
			'claim.client',
			'claim.insured',
			'claim.claim_amount',
			'claim.date_of_loss',
			'claim.last_update',
			'claim.expected_recovery',
			'claim.actual_recovery',
			'claim.recovery_status',
			'claim.created_at',
			'checklist_claim.status as claim_status',
			'checklist_claim.checklist_id',
			'checklist_claim.assignee',
			'checklist_claim.created_at as assigned_at',
			'checklist.name as checklist_name',
			'assignee_user.first as assignee_first',
			'assignee_user.last as assignee_last',
			'assignee_user.email as assignee_email',
		])
		.orderBy('claim.id')
		.orderBy('checklist_claim.created_at', 'desc') // Most recent assignment first
		.orderBy(sortField as any, sortDirection)
		.limit(limit)
		.offset(offset)
		.execute();

	return {
		rows,
		count,
		metrics: {
			totalValue,
			avgDaysInQueue: Math.round(avgDaysInQueue * 10) / 10, // Round to 1 decimal
		},
	};
}

/**
 * Get claims assigned to the user's desk locations, ordered by desk priority
 * Used for the "Desk Queue" tab when desk hierarchy feature is enabled
 */
export async function listMyDeskClaims(
	ctx: ProtectedContext,
	{
		searchTerm,
		claimStatus,
		recoveryStatus,
		limit = 500,
		offset = 0,
	}: {
		searchTerm?: string;
		claimStatus?: ClaimStatus;
		recoveryStatus?: RecoveryStatus;
		limit?: number;
		offset?: number;
	}
) {
	// Base query: get claims assigned to desk locations where user is assigned
	// desk_location_id is now on claim table, not checklist_claim
	let query = ctx.db
		.selectFrom('user_desk_location')
		.innerJoin('desk_location', 'user_desk_location.desk_location_id', 'desk_location.id')
		.innerJoin('claim', 'desk_location.id', 'claim.desk_location_id')
		.innerJoin('checklist_claim', 'claim.id', 'checklist_claim.claim_id')
		.innerJoin('checklist', 'checklist_claim.checklist_id', 'checklist.id')
		.leftJoin('feeds', 'claim.feed_id', 'feeds.id')
		.leftJoin('users as assignee_user', 'checklist_claim.assignee', 'assignee_user.id')
		.where('user_desk_location.user_id', '=', ctx.session.user.id)
		.where('user_desk_location.removed_at', 'is', null)
		.where('desk_location.deleted_at', 'is', null)
		.where('claim.client_id', '=', ctx.session.user.client_id);

	// Apply filters
	if (searchTerm && searchTerm.length > 0) {
		query = query.where((eb) =>
			eb.or([
				eb(sql`lower(${eb.ref('claim.claim_number')})`, 'like', `%${searchTerm.toLowerCase()}%`),
				eb(sql`lower(${eb.ref('claim.insured')})`, 'like', `%${searchTerm.toLowerCase()}%`),
				eb(sql`lower(${eb.ref('claim.client')})`, 'like', `%${searchTerm.toLowerCase()}%`),
			])
		);
	}

	if (claimStatus) {
		query = query.where('checklist_claim.status', '=', claimStatus);
	}

	if (recoveryStatus) {
		query = query.where('claim.recovery_status', '=', recoveryStatus);
	}

	// Get total count and metrics from distinct claims to avoid duplicates
	// First get distinct claim IDs with their highest priority desk assignment, then aggregate
	const distinctClaimsSubquery = query
		.distinctOn('claim.id')
		.select(['claim.id', 'claim.claim_amount', 'checklist_claim.created_at as assignment_created_at'])
		.orderBy('claim.id')
		.orderBy('user_desk_location.priority', 'asc')
		.orderBy('checklist_claim.created_at', 'desc')
		.as('distinct_claims');

	const metricsQuery = await ctx.db
		.selectFrom(distinctClaimsSubquery)
		.select(({ fn }) => [
			fn.countAll().as('count'),
			fn.sum('distinct_claims.claim_amount').as('total_value'),
			fn
				.avg(sql`EXTRACT(epoch FROM (NOW() - distinct_claims.assignment_created_at)) / 86400`)
				.as('avg_days_in_queue'),
		])
		.executeTakeFirst();

	const count = parseInt(metricsQuery?.count?.toString() ?? '0');
	const totalValue = parseFloat(metricsQuery?.total_value?.toString() ?? '0');
	const avgDaysInQueue = parseFloat(metricsQuery?.avg_days_in_queue?.toString() ?? '0');

	// Get data (ordered by desk priority, then by last update)
	// Use DISTINCT ON to ensure each claim appears only once (take highest priority desk assignment)
	const rows = await query
		.distinctOn('claim.id')
		.select([
			'claim.id',
			'claim.claim_number',
			'claim.client',
			'claim.insured',
			'claim.claim_amount',
			'claim.date_of_loss',
			'claim.last_update',
			'claim.expected_recovery',
			'claim.actual_recovery',
			'claim.recovery_status',
			'claim.created_at',
			'claim.desk_location_id',
			'checklist_claim.status as claim_status',
			'checklist_claim.checklist_id',
			'checklist_claim.assignee',
			'checklist_claim.created_at as assigned_at',
			'checklist.name as checklist_name',
			'assignee_user.first as assignee_first',
			'assignee_user.last as assignee_last',
			'assignee_user.email as assignee_email',
			'user_desk_location.priority as desk_priority',
			'desk_location.name as desk_location_name',
		])
		.orderBy('claim.id')
		.orderBy('user_desk_location.priority asc') // Higher priority desks first (1, 2, 3...)
		.orderBy('checklist_claim.created_at desc') // Most recent assignment first
		.orderBy('claim.last_update desc') // Then by last update
		.limit(limit)
		.offset(offset)
		.execute();

	return {
		rows,
		count,
		metrics: {
			totalValue,
			avgDaysInQueue: Math.round(avgDaysInQueue * 10) / 10, // Round to 1 decimal
		},
	};
}
