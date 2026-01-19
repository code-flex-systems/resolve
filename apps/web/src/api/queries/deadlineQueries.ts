import { sql } from 'kysely';
import { ProtectedContext } from '@/server/trpc/trpc';
import { DeadlineEntityType, DeadlineStatus } from '@/config/enums';
import { DateRangeStrict } from '@/types/types';
import { TRPCError } from '@trpc/server';

// =====================================================================
// DEADLINE QUERIES
// =====================================================================

/**
 * Create a deadline (standalone or linked to an entity via polymorphic association)
 * Deadlines are non-editable - to change, cancel and recreate
 *
 * @param ctx - request context
 * @param params - deadline parameters including optional entity linking
 * @returns created deadline
 */
export async function createDeadline(
	ctx: ProtectedContext,
	params: {
		claimId: number;
		deadlineType: string;
		deadlineDate: string; // ISO date string
		description?: string;
		entityType?: DeadlineEntityType;
		entityId?: number;
	}
) {
	return await ctx.db
		.insertInto('deadline')
		.values({
			claim_id: params.claimId,
			client_id: ctx.session.user.client_id!,
			deadline_type: params.deadlineType,
			deadline_date: sql<Date>`${params.deadlineDate}::date`,
			description: params.description,
			status: DeadlineStatus.PENDING,
			created_by: ctx.session.user.id,
			created_at: sql`now()`,
			// Polymorphic entity linking (optional)
			...(params.entityType && { entity_type: params.entityType }),
			...(params.entityId && { entity_id: params.entityId }),
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Get single deadline by ID
 */
export async function getDeadline(ctx: ProtectedContext, deadlineId: number) {
	return await ctx.db
		.selectFrom('deadline')
		.innerJoin('claim', 'deadline.claim_id', 'claim.id')
		.selectAll('deadline')
		.select('claim.claim_number')
		.where('deadline.id', '=', deadlineId)
		.where('deadline.client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

/**
 * Get deadlines by polymorphic entity lookup
 */
export async function getDeadlinesByEntity(
	ctx: ProtectedContext,
	entityType: DeadlineEntityType,
	entityId: number
) {
	return await ctx.db
		.selectFrom('deadline')
		.innerJoin('claim', 'deadline.claim_id', 'claim.id')
		.selectAll('deadline')
		.select('claim.claim_number')
		.where('deadline.entity_type', '=', entityType)
		.where('deadline.entity_id', '=', entityId)
		.where('deadline.client_id', '=', ctx.session.user.client_id)
		.orderBy('deadline.deadline_date asc')
		.execute();
}

/**
 * List deadlines with optional filters and pagination
 *
 * Uses single query with COUNT(*) OVER() for both count and data (avoids duplicate query execution).
 * Uses EXISTS for personal access check (avoids duplicate rows from LEFT JOINs).
 *
 * @param ctx - request context
 * @param filters - optional filters including claim ID, entity type, status, date range, personalOnly flag
 * @param limit - pagination limit
 * @param offset - pagination offset
 * @returns list of deadlines with total count
 */
export async function getDeadlines(
	ctx: ProtectedContext,
	filters: {
		claimId?: number;
		entityType?: DeadlineEntityType;
		status?: DeadlineStatus;
		dateRange?: DateRangeStrict;
		personalOnly?: boolean;
	},
	limit?: number,
	offset?: number
) {
	const isAdmin = ctx.session.user.role === 'Admin' || ctx.session.user.role === 'Super Admin';

	// Filter by personal assignments if personalOnly flag is true, or if user is a Contributor
	const shouldFilterPersonal = filters.personalOnly || !isAdmin;
	const userId = ctx.session.user.id;

	// Build base query with all filters applied once
	let baseQuery = ctx.db
		.selectFrom('deadline')
		.innerJoin('claim', 'deadline.claim_id', 'claim.id')
		.where('deadline.client_id', '=', ctx.session.user.client_id);

	// Use EXISTS for personal access check (avoids duplicate rows from LEFT JOINs)
	if (shouldFilterPersonal) {
		baseQuery = baseQuery.where((eb) =>
			eb.exists(
				eb
					.selectFrom('claim as c_access')
					.leftJoin('checklist_claim', 'checklist_claim.claim_id', 'c_access.id')
					.leftJoin('user_desk_location', (join) =>
						join
							.onRef('user_desk_location.desk_location_id', '=', 'c_access.desk_location_id')
							.on('user_desk_location.user_id', '=', userId)
							.on('user_desk_location.removed_at', 'is', null)
					)
					.select(sql`1`.as('one'))
					.whereRef('c_access.id', '=', 'claim.id')
					.where((eb2) =>
						eb2.or([
							eb2('checklist_claim.created_by', '=', userId),
							eb2('checklist_claim.assignee', '=', userId),
							eb2('user_desk_location.id', 'is not', null),
						])
					)
			)
		);
	}

	// Apply filters (single location - no duplication)
	if (filters.claimId !== undefined) {
		baseQuery = baseQuery.where('deadline.claim_id', '=', filters.claimId);
	}
	if (filters.entityType !== undefined) {
		baseQuery = baseQuery.where('deadline.entity_type', '=', filters.entityType);
	}
	if (filters.status !== undefined) {
		baseQuery = baseQuery.where('deadline.status', '=', filters.status);
	}
	if (filters.dateRange !== undefined) {
		baseQuery = baseQuery
			.where('deadline.deadline_date', '>=', filters.dateRange[0])
			.where('deadline.deadline_date', '<=', filters.dateRange[1]);
	}

	// Select columns and add COUNT(*) OVER() for total count in single query
	const rowsWithCount = await baseQuery
		.selectAll('deadline')
		.select('claim.claim_number')
		.select(sql<string>`COUNT(*) OVER()`.as('total_count'))
		.orderBy('deadline.deadline_date desc')
		.orderBy('deadline.created_at desc')
		.$if(limit !== undefined, (qb) => qb.limit(limit!))
		.$if(offset !== undefined, (qb) => qb.offset(offset!))
		.execute();

	// Extract count from first row (or default to 0 if empty)
	const count = rowsWithCount.length > 0 ? parseInt(rowsWithCount[0].total_count ?? '0') : 0;

	// Strip the total_count column from results
	const rows = rowsWithCount.map(({ total_count, ...rest }) => rest);

	return {
		rows,
		count,
	};
}

/**
 * Sync deadline status (typically called automatically when linked entity completes/cancels)
 * Used by task completion/cancellation to update linked deadline status
 *
 * @param ctx - request context
 * @param deadlineId - deadline identifier
 * @param status - new status (met, missed, or cancelled)
 * @param completedBy - optional user ID if marking as met/missed
 * @returns updated deadline
 */
export async function syncDeadlineStatus(
	ctx: ProtectedContext,
	deadlineId: number,
	status: DeadlineStatus,
	completedBy?: string
) {
	const updated = await ctx.db
		.updateTable('deadline')
		.set({
			status,
			...(completedBy && status !== DeadlineStatus.CANCELLED
				? { completed_at: sql`now()`, completed_by: completedBy }
				: {}),
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
 * Cancel a deadline (non-editable pattern - cancel instead of delete)
 *
 * @param ctx - request context
 * @param deadlineId - deadline identifier
 * @param cancellationReason - reason for cancellation
 * @returns updated deadline
 */
export async function cancelDeadline(
	ctx: ProtectedContext,
	deadlineId: number,
	cancellationReason: string
) {
	const updated = await ctx.db
		.updateTable('deadline')
		.set({
			status: DeadlineStatus.CANCELLED,
			cancelled_at: sql`now()`,
			cancelled_by: ctx.session.user.id,
			cancellation_reason: cancellationReason,
		})
		.where('deadline.id', '=', deadlineId)
		.where('deadline.client_id', '=', ctx.session.user.client_id)
		.where('deadline.status', '!=', DeadlineStatus.CANCELLED) // Don't cancel if already cancelled
		.returningAll()
		.executeTakeFirst();

	if (!updated) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Deadline not found or already cancelled',
		});
	}

	return updated;
}

/**
 * Fetch a deadline for logging before cancellation
 */
export async function getDeadlineForLogging(ctx: ProtectedContext, deadlineId: number) {
	return await ctx.db
		.selectFrom('deadline')
		.select([
			'id',
			'claim_id',
			'deadline_date',
			'deadline_type',
			'status',
			'description',
			'entity_type',
			'entity_id',
		])
		.where('id', '=', deadlineId)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

// Alias for controller compatibility
export const getDeadlineForDeletion = getDeadlineForLogging;

/**
 * Update deadline status (alias for syncDeadlineStatus for controller compatibility)
 */
export async function updateDeadlineStatus(
	ctx: ProtectedContext,
	deadlineId: number,
	status: DeadlineStatus
) {
	return await syncDeadlineStatus(ctx, deadlineId, status);
}

/**
 * Delete deadline by cancelling it (non-editable pattern)
 * This is a simplified version that doesn't require a cancellation reason
 */
export async function deleteDeadline(ctx: ProtectedContext, deadlineId: number) {
	return await cancelDeadline(ctx, deadlineId, 'Deleted by user');
}
