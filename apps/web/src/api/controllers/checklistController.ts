import * as checklistQueries from '@/api/queries/checklistQueries';
import { SummarySegment } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';

export async function createChecklist(
	ctx: ProtectedContext,
	{ name, existingChecklistId }: { name: string; existingChecklistId?: number }
) {
	let results = await checklistQueries.createChecklist(ctx, name, 'System', existingChecklistId);
	return results;
}

export async function deleteChecklist(ctx: ProtectedContext, { id }: { id: number }) {
	await checklistQueries.deleteChecklist(ctx, id);
}

export async function getChecklist(ctx: ProtectedContext, { id }: { id: number }) {
	let results = await checklistQueries.getChecklist(ctx, id);
	return results;
}

export async function getChecklists(ctx: ProtectedContext, { searchTerm }: { searchTerm?: string }) {
	let results = await checklistQueries.getChecklists(ctx, searchTerm);
	return results;
}

export async function getChecklistClaim(
	ctx: ProtectedContext,
	{ checklistId, claimId }: { checklistId: number; claimId: number }
) {
	let results = await checklistQueries.getChecklistClaim(ctx, checklistId, claimId);
	return results;
}

export async function getChecklistSummary(
	ctx: ProtectedContext,
	{ checklistId, claimId }: { checklistId: number; claimId: number }
) {
	let results = await checklistQueries.getChecklistSummary(ctx, checklistId, claimId);
	return results;
}

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
	const [data = [], count = 0] = await Promise.all([
		checklistQueries.getChecklistSummaryDetail(ctx, { ...input, mode: 'rows' }),
		checklistQueries.getChecklistSummaryDetail(ctx, { ...input, mode: 'count' }),
	]);
	return { rows: data, count: count };
}

export async function getRecentChecklistClaims(ctx: ProtectedContext) {
	let results = await checklistQueries.getRecentChecklistClaims(ctx);
	return results;
}

export async function modifyChecklist(ctx: ProtectedContext, { id, params }: { id: number; params: object }) {
	let results = await checklistQueries.modifyChecklist(ctx, id, params);
	return results;
}
