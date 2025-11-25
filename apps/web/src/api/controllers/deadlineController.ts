import * as deadlineQueries from '@/api/queries/deadlineQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import type { DeadlineParams } from '@/schemas/deadlineSchemas';
import { DeadlineStatus } from '@/config/enums';
import { DateRangeStrict } from '@/types/types';
import { logAdminAction, AdminAction, EntityName } from '@/api/utils/adminActionLogger';

// =====================================================================
// DEADLINE CONTROLLERS
// =====================================================================

/**
 * Create a deadline for a claim.
 *
 * @param ctx - request context
 * @param input - claim id and deadline parameters
 * @returns the newly created deadline
 */
export async function createDeadline(
	ctx: ProtectedContext,
	{
		claimId,
		params,
	}: {
		claimId: number;
		params: Omit<DeadlineParams, 'claimId'>;
	}
) {
	// Create deadline and log admin action within transaction
	const created = await ctx.db.transaction().execute(async (trx) => {
		const deadline = await deadlineQueries.createDeadline({ ...ctx, db: trx }, { claimId, ...params });

		// Log deadline creation
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: deadline.id,
				entityName: EntityName.DEADLINE,
				action: AdminAction.CREATE,
				value: {
					claimId,
					deadline_date: deadline.deadline_date,
					deadline_type: deadline.deadline_type,
					status: deadline.status,
					description: deadline.description,
				},
			}
		);

		return deadline;
	});

	return created;
}

/**
 * List deadlines with optional filters.
 *
 * @param ctx - request context
 * @param filters - optional claim id, status, and date range
 * @returns list of deadlines
 */
export async function listDeadlines(
	ctx: ProtectedContext,
	filters: {
		claimId?: number;
		status?: DeadlineStatus;
		dateRange?: DateRangeStrict;
		personalOnly?: boolean;
	}
) {
	return await deadlineQueries.getDeadlines(ctx, filters);
}

/**
 * Update a deadline's status.
 *
 * @param ctx - request context
 * @param input - deadline id and new status
 * @returns updated deadline
 */
export async function updateDeadlineStatus(
	ctx: ProtectedContext,
	{
		deadlineId,
		status,
	}: {
		deadlineId: number;
		status: DeadlineStatus;
	}
) {
	// Update deadline status and log admin action within transaction
	const updated = await ctx.db.transaction().execute(async (trx) => {
		const deadline = await deadlineQueries.updateDeadlineStatus({ ...ctx, db: trx }, deadlineId, status);

		// Log admin action for deadline status update
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: deadlineId,
				entityName: EntityName.DEADLINE,
				action: AdminAction.UPDATE,
				value: { status },
			}
		);

		return deadline;
	});

	return updated;
}

/**
 * Delete a deadline.
 *
 * @param ctx - request context
 * @param input - deadline id
 */
export async function deleteDeadline(ctx: ProtectedContext, { deadlineId }: { deadlineId: number }) {
	// Delete deadline and log admin action within transaction
	await ctx.db.transaction().execute(async (trx) => {
		// Fetch deadline data BEFORE deletion for logging
		const deadline = await deadlineQueries.getDeadlineForDeletion({ ...ctx, db: trx }, deadlineId);

		// Delete the deadline
		await deadlineQueries.deleteDeadline({ ...ctx, db: trx }, deadlineId);

		// Log admin action for deadline deletion
		if (deadline) {
			await logAdminAction(
				{ ...ctx, db: trx },
				{
					entityId: deadlineId,
					entityName: EntityName.DEADLINE,
					action: AdminAction.DELETE,
					value: {
						claimId: deadline.claim_id,
						deadline_date: deadline.deadline_date,
						deadline_type: deadline.deadline_type,
						status: deadline.status,
						description: deadline.description,
					},
				}
			);
		}
	});
}
