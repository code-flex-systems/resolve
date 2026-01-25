import * as checklistQueries from '@/api/queries/checklistQueries';
import { ClaimStatus, SummarySegment } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { DateRangeStrict } from '@/types/types';
import type { ChecklistParams } from '@/schemas/checklistSchemas';
import { logAdminAction, AdminAction } from '@/api/utils/adminActionLogger';
import { EntityName } from '@/api/utils/activityLogger';

/**
 * Create a checklist optionally copying another.
 *
 * @param ctx - request context
 * @param input - name and optional source checklist id
 * @returns the created checklist
 */
export async function createChecklist(
	ctx: ProtectedContext,
	{ name, existingChecklistId }: { name: string; existingChecklistId?: number }
) {
	// Create checklist and log admin action within transaction
	const results = await ctx.db.transaction().execute(async (trx) => {
		const created = await checklistQueries.createChecklist({ ...ctx, db: trx }, name, existingChecklistId);

		// Log checklist creation
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: created.id,
			entityName: EntityName.CHECKLIST,
			action: AdminAction.CREATE,
			value: { name: created.name, sourceChecklistId: existingChecklistId },
		});

		return created;
	});

	return results;
}

export async function modifyChecklistClaim(
	ctx: ProtectedContext,
	{
		checklistId,
		claimId,
		status,
		assignee,
	}: { checklistId: number; claimId: number; status?: ClaimStatus; assignee?: string }
) {
	await checklistQueries.modifyChecklistClaim(ctx, checklistId, claimId, status, assignee);
}

/**
 * Delete a checklist.
 *
 * @param ctx - request context
 * @param input - checklist id
 */
export async function deleteChecklist(ctx: ProtectedContext, { id }: { id: number }) {
	// Delete checklist and log admin action within transaction
	await ctx.db.transaction().execute(async (trx) => {
		// Fetch checklist data BEFORE deletion for logging
		const checklist = await checklistQueries.getChecklistForDeletion({ ...ctx, db: trx }, id);

		// Delete the checklist
		await checklistQueries.deleteChecklist({ ...ctx, db: trx }, id);

		// Log admin action for checklist deletion
		if (checklist) {
			await logAdminAction({ ...ctx, db: trx }, {
				entityId: id,
				entityName: EntityName.CHECKLIST,
				action: AdminAction.DELETE,
				value: { name: checklist.name, published: checklist.published },
			});
		}
	});
}

/**
 * Fetch a single checklist by id.
 *
 * @param ctx - request context
 * @param input - checklist id
 */
export async function getChecklist(ctx: ProtectedContext, { id }: { id: number }) {
	const results = await checklistQueries.getChecklist(ctx, id);
	return results;
}

/**
 * List checklists optionally filtered by a search term.
 *
 * @param ctx - request context
 * @param input - optional search term
 */
export async function getChecklists(ctx: ProtectedContext, { searchTerm }: { searchTerm?: string }) {
	const results = await checklistQueries.getChecklists(ctx, { searchTerm });
	return results;
}

/**
 * Count published/unpublished checklists with optional client ID.
 *
 * @param ctx - request context
 * @param input - client ID
 */
export async function getChecklistCount(ctx: ProtectedContext, { clientId }: { clientId: string }) {
	const results = await checklistQueries.getChecklistCount(ctx, clientId);
	return results;
}

/**
 * Retrieve the mapping row for a checklist claim.
 *
 * @param ctx - request context
 * @param input - checklist and claim ids
 */
export async function getChecklistClaim(
	ctx: ProtectedContext,
	{ checklistId, claimId }: { checklistId: number; claimId: number }
) {
	const results = await checklistQueries.getChecklistClaim(ctx, checklistId, claimId);
	return results;
}

export async function getChecklistClaimProgress(
	ctx: ProtectedContext,
	{ checklistId, claimId }: { checklistId: number; claimId: number }
) {
	const results = await checklistQueries.getChecklistClaimProgress(ctx, checklistId, claimId);
	return results;
}

export async function getChecklistClaimStats(
	ctx: ProtectedContext,
	{ checklistId, users }: { checklistId?: number; users?: string[] }
) {
	const results = await checklistQueries.getChecklistClaimStats(ctx, checklistId, users);
	const formattedResults: Record<ClaimStatus, number> = {
		[ClaimStatus.SUBMITTED]: 0,
		[ClaimStatus.IN_PROGRESS]: 0,
		[ClaimStatus.BLOCKED]: 0,
		[ClaimStatus.UNWORKED]: 0,
	};
	results.forEach((row) => {
		const claimStatus = row.status as ClaimStatus;
		formattedResults[claimStatus] += 1;
	});
	return formattedResults;
}

/**
 * Summarize answers for a claim on a checklist.
 *
 * @param ctx - request context
 * @param input - checklist id and claim id
 */
export async function getChecklistSummary(
	ctx: ProtectedContext,
	{ checklistId, claimId }: { checklistId: number; claimId: number }
) {
	const results = await checklistQueries.getChecklistSummary(ctx, checklistId, claimId);
	return results;
}

/**
 * Get detailed summary rows and counts for a claim.
 * Query uses window function to return rows and count in a single query.
 *
 * @param ctx - request context
 * @param input - options including pagination and segment
 * @returns row data with total count
 */
export async function getChecklistSummaryDetail(
	ctx: ProtectedContext,
	input: {
		checklistId: number;
		claimId: number;
		segment: SummarySegment;
		limit?: number;
		offset?: number;
	}
) {
	return await checklistQueries.getChecklistSummaryDetail(ctx, input);
}

export async function getChecklistClaims(
	ctx: ProtectedContext,
	{
		filters,
		limit,
		offset,
	}: {
		filters: { range: DateRangeStrict; checklistId?: number; users?: string[]; claimStatus?: ClaimStatus };
		limit: number;
		offset: number;
	}
) {
	const results = await checklistQueries.getChecklistClaims(ctx, filters, limit, offset);
	return results;
}

/**
 * Export all checklist claims matching filters (for CSV export).
 *
 * @param ctx - request context
 * @param filters - filters for checklist claims
 * @returns all matching checklist claims
 */
export async function exportChecklistClaims(
	ctx: ProtectedContext,
	{ filters }: { filters: { range: DateRangeStrict; checklistId?: number; users?: string[]; claimStatus?: ClaimStatus } }
) {
	return await checklistQueries.exportChecklistClaims(ctx, filters);
}

/**
 * Fetch the most recently opened claims.
 *
 * @param ctx - request context
 */
export async function getRecentChecklistClaims(ctx: ProtectedContext) {
	const results = await checklistQueries.getRecentChecklistClaims(ctx);
	return results;
}

/**
 * Update checklist properties.
 *
 * @param ctx - request context
 * @param input - checklist id and update fields
 * @returns the updated checklist
 */
export async function modifyChecklist(
	ctx: ProtectedContext,
	{ id, params }: { id: number; params: ChecklistParams }
) {
	// Update checklist and log admin action within transaction
	const results = await ctx.db.transaction().execute(async (trx) => {
		const updated = await checklistQueries.modifyChecklist({ ...ctx, db: trx }, id, params);

		// Log admin action for checklist update
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.CHECKLIST,
			action: AdminAction.UPDATE,
			value: params,
		});

		return updated;
	});

	return results;
}
