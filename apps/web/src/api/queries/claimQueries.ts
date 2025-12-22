import { sql } from 'kysely';
import { ClaimSearch, ClaimStatus, FeedStatus, RecoveryStatus } from '@/config/enums';
import { Claim } from '@/types/types';
import { ProtectedContext } from '@/server/trpc/trpc';
import { getCurrentFiscalQuarterStart } from '@/lib/utils/utils';
import { TRPCError } from '@trpc/server';
import config from '@/config/config';
import type { ClaimData } from '@/schemas/claimSchemas';

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
		feedId?: number | null;
		searchTerm?: { value: string; type: ClaimSearch };
		line_of_business?: string;
		loss_type?: string;
		recovery_status?: RecoveryStatus;
		insured?: string;
		client?: string;
		limit?: number;
		offset?: number;
	}
): Promise<{ rows: any[]; count: number }> {
	const isAdmin = ctx.session.user.role === config.ROLES.ADMIN || ctx.session.user.role === config.ROLES.SUPER_ADMIN;

	// Build base query with all filters
	let baseQuery = ctx.db
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
		baseQuery = baseQuery.where((eb) =>
			eb.or([
				// User created a checklist assignment for this claim
				eb.exists(
					eb
						.selectFrom('checklist_claim')
						.selectAll()
						.whereRef('checklist_claim.claim_id', '=', 'claim.id')
						.where('checklist_claim.created_by', '=', ctx.session.user.id)
				),
				// User is assigned to a checklist for this claim
				eb.exists(
					eb
						.selectFrom('checklist_claim')
						.selectAll()
						.whereRef('checklist_claim.claim_id', '=', 'claim.id')
						.where('checklist_claim.assignee', '=', ctx.session.user.id)
				),
				// Claim not in checklist_claim (available to all)
				eb.not(
					eb.exists(
						eb
							.selectFrom('checklist_claim')
							.selectAll()
							.whereRef('checklist_claim.claim_id', '=', 'claim.id')
					)
				),
				// User has desk access to this claim
				eb.exists(
					eb
						.selectFrom('user_desk_location')
						.selectAll()
						.whereRef('user_desk_location.desk_location_id', '=', 'claim.desk_location_id')
						.where('user_desk_location.user_id', '=', ctx.session.user.id)
						.where('user_desk_location.removed_at', 'is', null)
				),
			])
		);
	}

	baseQuery =
		feedId !== undefined
			? baseQuery.where('feed_id', feedId === null ? 'is' : '=', feedId)
			: baseQuery.where((eb) =>
					eb.or([eb('feeds.status', 'is', null), eb('feeds.status', '<>', FeedStatus.INACTIVE)])
				);

	if (searchTerm) {
		baseQuery = baseQuery.where((eb) => eb(searchTerm.type, 'ilike', `${searchTerm.value}%`));
	}

	// Join claim_party if filtering by loss_type (now on claim_party for facilitators)
	if (loss_type) {
		baseQuery = baseQuery
			.leftJoin('claim_party', 'claim_party.claim_id', 'claim.id')
			.where('claim_party.deleted_at', 'is', null)
			.where('claim_party.loss_type', '=', loss_type)
			.groupBy('claim.id')
			.groupBy('feeds.id');
	}

	if (recovery_status) {
		baseQuery = baseQuery.where('claim.recovery_status', '=', recovery_status);
	}

	if (insured) {
		baseQuery = baseQuery.where((eb) => eb(sql`lower(${eb.ref('claim.insured')})`, 'like', `%${insured.toLowerCase()}%`));
	}

	if (client) {
		baseQuery = baseQuery.where((eb) => eb(sql`lower(${eb.ref('claim.client')})`, 'like', `%${client.toLowerCase()}%`));
	}

	// Select columns based on admin status
	if (isAdmin) {
		baseQuery = baseQuery.selectAll('claim').select(['feeds.name as feed_name']);
	} else {
		baseQuery = baseQuery.select([
			'claim.id',
			'claim.claim_number',
			'claim.insured',
			'claim.date_of_loss',
			'feeds.name as feed_name',
		]);
	}

	// Wrap in CTE
	const filteredClaims = baseQuery.as('filtered_claims');

	// Select data with COUNT(*) OVER() for total count
	const results = await ctx.db
		.selectFrom(filteredClaims)
		.selectAll()
		.select(sql<string>`COUNT(*) OVER()`.as('total_count'))
		.orderBy(sql`claim_number`)
		.$if(limit != null, (qb) => qb.limit(limit!))
		.$if(offset != null, (qb) => qb.offset(offset!))
		.execute();

	// Parse count from string (PostgreSQL COUNT returns bigint as string)
	const count = results.length > 0 ? parseInt(results[0].total_count, 10) : 0;
	return { rows: results, count };
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
 * Note: loss_type is on claim_party for facilitators, not on the claim table
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
		date_of_loss: Date | null;
		loss_street_address: string | null;
		loss_city: string | null;
		loss_state: string | null;
		loss_postal_code: string | null;
		loss_country: string | null;
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
			'actual_recovery',
			'date_of_loss',
			'loss_street_address',
			'loss_city',
			'loss_state',
			'loss_postal_code',
			'loss_country',
			'recovery_status',
			'substatus',
		])
		.executeTakeFirst();

	return result;
}

/**
 * Bulk insert claim records.
 * Note: loss_type is on claim_party for facilitators, not on the claim table
 *
 * @param ctx - request context
 * @param claims - claim objects without ids
 * @returns all created/updated claims
 */
export async function createClaims(ctx: ProtectedContext, claims: ClaimData[]) {
	const result = await ctx.db
		.insertInto('claim')
		.values(
			claims.map((c) => ({
				claim_number: c.claim_number,
				client: c.client,
				client_adjuster: c.client_adjuster,
				insured: c.insured,
				claim_amount: c.claim_amount,
				date_of_loss: c.date_of_loss,
				loss_street_address: c.loss_street_address,
				loss_city: c.loss_city,
				loss_state: c.loss_state,
				loss_postal_code: c.loss_postal_code,
				loss_country: c.loss_country,
				last_updated_by: c.last_updated_by,
				last_update: c.last_update,
				client_id: ctx.session.user.client_id!,
				created_by: ctx.session.user.id,
			}))
		)
		.onConflict((oc) =>
			oc.column('claim_number').doUpdateSet((eb) => ({
				client: eb.ref('excluded.client'),
				client_adjuster: eb.ref('excluded.client_adjuster'),
				insured: eb.ref('excluded.insured'),
				claim_amount: eb.ref('excluded.claim_amount'),
				date_of_loss: eb.ref('excluded.date_of_loss'),
				loss_street_address: eb.ref('excluded.loss_street_address'),
				loss_city: eb.ref('excluded.loss_city'),
				loss_state: eb.ref('excluded.loss_state'),
				loss_postal_code: eb.ref('excluded.loss_postal_code'),
				loss_country: eb.ref('excluded.loss_country'),
				last_updated_by: eb.ref('excluded.last_updated_by'),
				last_update: eb.ref('excluded.last_update'),
			}))
		)
		.returningAll()
		.execute();
	return result;
}

/**
 * Get aggregated party data for a claim
 * Returns distinct loss types (from facilitators) and total liability percentage (from entities)
 * Note: loss_type is on claim_party for facilitators, liability_percentage is on claim_party for entities
 */
export async function getClaimPartyAggregates(ctx: ProtectedContext, claimId: number) {
	const result = await ctx.db
		.selectFrom('claim_party')
		.select(({ fn }) => [
			// Aggregate distinct loss types from facilitators (filtering out nulls)
			fn.agg<string[]>('array_agg', [sql`DISTINCT claim_party.loss_type`]).as('loss_type_array'),
			// Sum liability percentage from entities only (entities have no parent)
			sql<string>`SUM(CASE WHEN claim_party.parent_claim_party_id IS NULL THEN claim_party.liability_percentage ELSE 0 END)`.as('total_liability_percentage'),
		])
		.where('claim_party.claim_id', '=', claimId)
		.where('claim_party.deleted_at', 'is', null)
		.executeTakeFirst();

	// Filter out nulls from loss_type array
	const lossTypes = result?.loss_type_array?.filter((lt: string | null) => lt !== null) || [];
	const totalLiabilityPercentage = result?.total_liability_percentage ? parseFloat(result.total_liability_percentage) : 0;

	// Calculate our liability percentage (100% - total other parties' liability)
	const ourLiabilityPercentage = Math.max(0, 100 - totalLiabilityPercentage);

	return {
		loss_type: lossTypes,
		total_liability_percentage: totalLiabilityPercentage,
		our_liability_percentage: ourLiabilityPercentage,
	};
}

/**
 * Recalculate and update the expected_recovery cached field on a claim.
 *
 * Formula: expected_recovery = (100% - sum(claim_party.liability_percentage)) / 100 × claim.total_incurred
 *
 * Call this function transactionally when:
 * - claim_party.liability_percentage is created/updated/deleted
 * - claim.total_incurred is updated (via recalculateClaimTotalIncurred)
 *
 * @param ctx - request context (can use transaction context)
 * @param claimId - claim identifier to recalculate
 * @returns the updated expected_recovery value
 */
export async function recalculateClaimExpectedRecovery(ctx: ProtectedContext, claimId: number) {
	// Get sum of liability percentages from entities only (entities have no parent_claim_party_id)
	const partyResult = await ctx.db
		.selectFrom('claim_party')
		.select(({ fn }) => [fn.sum<string>('liability_percentage').as('total_liability_percentage')])
		.where('claim_id', '=', claimId)
		.where('deleted_at', 'is', null)
		.where('parent_claim_party_id', 'is', null)
		.executeTakeFirst();

	// Get total_incurred from claim
	const claimResult = await ctx.db
		.selectFrom('claim')
		.select(['total_incurred'])
		.where('id', '=', claimId)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();

	const totalLiabilityPercentage = partyResult?.total_liability_percentage
		? parseFloat(partyResult.total_liability_percentage)
		: 0;
	const totalIncurred = claimResult?.total_incurred
		? parseFloat(claimResult.total_incurred.toString())
		: 0;

	// Calculate our liability percentage (100% - total other parties' liability)
	const ourLiabilityPercentage = Math.max(0, 100 - totalLiabilityPercentage);

	// Calculate expected recovery: our liability % × total incurred
	const expectedRecovery = (ourLiabilityPercentage / 100) * totalIncurred;

	// Update the claim's cached expected_recovery field
	await ctx.db
		.updateTable('claim')
		.set({ expected_recovery: expectedRecovery.toFixed(2) })
		.where('id', '=', claimId)
		.where('client_id', '=', ctx.session.user.client_id)
		.execute();

	return expectedRecovery;
}

/**
 * Recalculate and update the total_incurred field on a claim.
 * total_incurred = sum of all amount_reserved from claim_coverage for this claim.
 *
 * This should be called whenever coverage amount_reserved changes:
 * - createClaimCoverage (if amount_reserved is set)
 * - updateClaimCoverage (if amount_reserved is changed)
 * - deleteClaimCoverage
 *
 * @param ctx - request context
 * @param claimId - claim to recalculate
 * @returns the new total_incurred value
 */
export async function recalculateTotalIncurred(ctx: ProtectedContext, claimId: number) {
	// Get sum of amount_reserved from all active (non-deleted) coverages for this claim
	const result = await ctx.db
		.selectFrom('claim_coverage')
		.select(({ fn }) => [fn.sum<string>('amount_reserved').as('total_reserved')])
		.where('claim_id', '=', claimId)
		.where('deleted_at', 'is', null)
		.executeTakeFirst();

	const totalIncurred = result?.total_reserved ? parseFloat(result.total_reserved) : 0;

	// Update the claim's cached total_incurred field
	await ctx.db
		.updateTable('claim')
		.set({ total_incurred: totalIncurred.toFixed(2) })
		.where('id', '=', claimId)
		.where('client_id', '=', ctx.session.user.client_id)
		.execute();

	return totalIncurred;
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

	// Get coverage summary with count of coverages and distinct Entity-type parties with coverages
	// Coverages are linked to Entity parties via claim_party_id
	const coverageSummaryQuery = ctx.db
		.selectFrom('claim_coverage')
		.innerJoin('claim_party', 'claim_coverage.claim_party_id', 'claim_party.id')
		.innerJoin('party', 'claim_party.party_id', 'party.id')
		.select((eb) => [
			eb.fn.count('claim_coverage.id').as('count'),
			eb.fn.sum('claim_coverage.coverage_amount').as('total'),
			eb.fn.count(sql`DISTINCT claim_party.id`).as('partyCount'),
		])
		.where('claim_coverage.claim_id', '=', claimId)
		.where('claim_coverage.client_id', '=', ctx.session.user.client_id)
		.where('claim_coverage.deleted_at', 'is', null)
		.where('claim_party.deleted_at', 'is', null)
		.where('party.party_type', '=', 'entity');

	// Get Facilitator party count for liability summary
	// Only Facilitator-type parties contribute to liability percentages
	const partySummaryQuery = ctx.db
		.selectFrom('claim_party')
		.innerJoin('party', 'claim_party.party_id', 'party.id')
		.select((eb) => [eb.fn.count('claim_party.id').as('count')])
		.where('claim_party.claim_id', '=', claimId)
		.where('claim_party.deleted_at', 'is', null)
		.where('party.party_type', '=', 'facilitator');

	// Get total liability percentage from Facilitator-type parties only
	const liabilitySummaryQuery = ctx.db
		.selectFrom('claim_party')
		.innerJoin('party', 'claim_party.party_id', 'party.id')
		.select((eb) => [eb.fn.sum('claim_party.liability_percentage').as('total_liability')])
		.where('claim_party.claim_id', '=', claimId)
		.where('claim_party.deleted_at', 'is', null)
		.where('party.party_type', '=', 'facilitator');


	// Get task summary by status
	const taskSummaryQuery = ctx.db
		.selectFrom('task')
		.innerJoin('deadline', 'task.id', 'deadline.entity_id')
		.select((eb) => ['deadline.status', eb.fn.count('task.id').as('count')])
		.where('task.claim_id', '=', claimId)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.groupBy('deadline.status');

	const [checklistAssignments, coverageSummary, partySummary, liabilitySummary, taskSummary, partyAggregates] =
		await Promise.all([
			checklistAssignmentsQuery.execute(),
			coverageSummaryQuery.executeTakeFirst(),
			partySummaryQuery.executeTakeFirst(),
			liabilitySummaryQuery.executeTakeFirst(),
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
			partyCount: Number(coverageSummary?.partyCount || 0),
		},
		partySummary: {
			count: Number(partySummary?.count || 0),
			totalLiability: Number(liabilitySummary?.total_liability || 0),
		},
		taskSummary: taskCounts,
		// Aggregated values from parties (loss types from facilitators)
		aggregated_loss_type: partyAggregates.loss_type,
		// Liability percentages (from entities only)
		total_liability_percentage: partyAggregates.total_liability_percentage,
		our_liability_percentage: partyAggregates.our_liability_percentage,
		// expected_recovery is stored on the claim itself, calculated from liability %s and total_incurred
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
	// Build base query with ROW_NUMBER() window function to eliminate DISTINCT ON
	let baseQuery = ctx.db
		.selectFrom('claim')
		.innerJoin('checklist_claim', 'claim.id', 'checklist_claim.claim_id')
		.innerJoin('checklist', 'checklist_claim.checklist_id', 'checklist.id')
		.leftJoin('feeds', 'claim.feed_id', 'feeds.id')
		.leftJoin('users as assignee_user', 'checklist_claim.assignee', 'assignee_user.id')
		.select([
			'claim.id',
			'claim.claim_number',
			'claim.client',
			'claim.insured',
			'claim.claim_amount',
			'claim.date_of_loss',
			'claim.last_update',
			'claim.actual_recovery',
			'claim.expected_recovery',
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
			// Window function to rank rows per claim (most recent assignment first)
			sql<number>`ROW_NUMBER() OVER (
				PARTITION BY claim.id
				ORDER BY checklist_claim.created_at DESC
			)`.as('row_num'),
		])
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.where('checklist_claim.assignee', '=', ctx.session.user.id);

	// Apply filters (using ILIKE with prefix search for B-tree index usage)
	if (searchTerm && searchTerm.length > 0) {
		baseQuery = baseQuery.where((eb) =>
			eb.or([
				eb('claim.claim_number', 'ilike', `${searchTerm}%`),
				eb('claim.insured', 'ilike', `${searchTerm}%`),
				eb('claim.client', 'ilike', `${searchTerm}%`),
			])
		);
	}

	if (claimStatus) {
		baseQuery = baseQuery.where('checklist_claim.status', '=', claimStatus);
	}

	if (recoveryStatus) {
		baseQuery = baseQuery.where('claim.recovery_status', '=', recoveryStatus);
	}

	// Wrap in CTE
	const rankedClaims = baseQuery.as('ranked_claims');

	// Get metrics from CTE (only counting distinct claims where row_num = 1)
	const metricsQuery = await ctx.db
		.selectFrom(rankedClaims)
		.select(({ fn }) => [
			fn.countAll().as('count'),
			fn.sum('ranked_claims.claim_amount').as('total_value'),
			fn
				.avg(sql`EXTRACT(epoch FROM (NOW() - ranked_claims.assigned_at)) / 86400`)
				.as('avg_days_in_queue'),
		])
		.where('ranked_claims.row_num', '=', 1)
		.executeTakeFirst();

	const count = parseInt(metricsQuery?.count?.toString() ?? '0');
	const totalValue = parseFloat(metricsQuery?.total_value?.toString() ?? '0');
	const avgDaysInQueue = parseFloat(metricsQuery?.avg_days_in_queue?.toString() ?? '0');

	// Get data with pagination (filter to row_num = 1 for distinct claims)
	const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';
	// Remove table prefix from sortField since we're selecting from CTE
	const sortColumn = sortField.includes('.') ? sortField.split('.')[1] : sortField;
	const rows = await ctx.db
		.selectFrom(rankedClaims)
		.selectAll()
		.where('ranked_claims.row_num', '=', 1)
		.orderBy(sortColumn as any, sortDirection)
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
	// Build base query with ROW_NUMBER() window function to eliminate DISTINCT ON
	let baseQuery = ctx.db
		.selectFrom('user_desk_location')
		.innerJoin('desk_location', 'user_desk_location.desk_location_id', 'desk_location.id')
		.innerJoin('claim', 'desk_location.id', 'claim.desk_location_id')
		.innerJoin('checklist_claim', 'claim.id', 'checklist_claim.claim_id')
		.innerJoin('checklist', 'checklist_claim.checklist_id', 'checklist.id')
		.leftJoin('feeds', 'claim.feed_id', 'feeds.id')
		.leftJoin('users as assignee_user', 'checklist_claim.assignee', 'assignee_user.id')
		.select([
			'claim.id',
			'claim.claim_number',
			'claim.client',
			'claim.insured',
			'claim.claim_amount',
			'claim.date_of_loss',
			'claim.last_update',
			'claim.actual_recovery',
			'claim.expected_recovery',
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
			// Window function to rank rows per claim (highest priority desk, then most recent assignment)
			sql<number>`ROW_NUMBER() OVER (
				PARTITION BY claim.id
				ORDER BY user_desk_location.priority ASC, checklist_claim.created_at DESC
			)`.as('row_num'),
		])
		.where('user_desk_location.user_id', '=', ctx.session.user.id)
		.where('user_desk_location.removed_at', 'is', null)
		.where('desk_location.deleted_at', 'is', null)
		.where('claim.client_id', '=', ctx.session.user.client_id);

	// Apply filters (using ILIKE with prefix search for B-tree index usage)
	if (searchTerm && searchTerm.length > 0) {
		baseQuery = baseQuery.where((eb) =>
			eb.or([
				eb('claim.claim_number', 'ilike', `${searchTerm}%`),
				eb('claim.insured', 'ilike', `${searchTerm}%`),
				eb('claim.client', 'ilike', `${searchTerm}%`),
			])
		);
	}

	if (claimStatus) {
		baseQuery = baseQuery.where('checklist_claim.status', '=', claimStatus);
	}

	if (recoveryStatus) {
		baseQuery = baseQuery.where('claim.recovery_status', '=', recoveryStatus);
	}

	// Wrap in CTE
	const rankedClaims = baseQuery.as('ranked_claims');

	// Get metrics from CTE (only counting distinct claims where row_num = 1)
	const metricsQuery = await ctx.db
		.selectFrom(rankedClaims)
		.select(({ fn }) => [
			fn.countAll().as('count'),
			fn.sum('ranked_claims.claim_amount').as('total_value'),
			fn
				.avg(sql`EXTRACT(epoch FROM (NOW() - ranked_claims.assigned_at)) / 86400`)
				.as('avg_days_in_queue'),
		])
		.where('ranked_claims.row_num', '=', 1)
		.executeTakeFirst();

	const count = parseInt(metricsQuery?.count?.toString() ?? '0');
	const totalValue = parseFloat(metricsQuery?.total_value?.toString() ?? '0');
	const avgDaysInQueue = parseFloat(metricsQuery?.avg_days_in_queue?.toString() ?? '0');

	// Get data with pagination (filter to row_num = 1 for distinct claims, ordered by desk priority)
	const rows = await ctx.db
		.selectFrom(rankedClaims)
		.selectAll()
		.where('ranked_claims.row_num', '=', 1)
		.orderBy('ranked_claims.desk_priority', 'asc')
		.orderBy('ranked_claims.last_update', 'desc')
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
