import { ProtectedContext } from '@/server/trpc/trpc';
import * as commentQueries from '../queries/commentQueries';
import { Comment, CommentFilters } from '@/types/types';

export async function createComment(ctx: ProtectedContext, comment: Comment) {
	const result = await commentQueries.createComment(ctx, comment);
	return result;
}

export async function deleteComment(ctx: ProtectedContext, { id }: { id: string }) {
	const result = await commentQueries.deleteComment(ctx, id);
	return result;
}

export async function getComment(ctx: ProtectedContext, { id }: { id: string }) {
	const result = await commentQueries.getComment(ctx, id);
	return result;
}

export async function getComments(
	ctx: ProtectedContext,
	{ filters, limit, offset }: { filters: CommentFilters; limit?: number; offset?: number }
) {
	const result = await commentQueries.getComments(ctx, filters, limit, offset);
	return result;
}

export async function getCommentCount(ctx: ProtectedContext, { filters }: { filters: CommentFilters }) {
	const result = await commentQueries.getCommentCount(ctx, filters);
	return result;
}

export async function getCommentsForPage(
	ctx: ProtectedContext,
	{ checklistId, claimId, instanceId }: { checklistId: string; claimId: string; instanceId: string }
) {
	const result = await commentQueries.getCommentsForPage(ctx, checklistId, claimId, instanceId);
	const commentsMap: Record<string, (typeof result)[0]> = {};
	result.forEach((c) => {
		commentsMap[c.question_id!] = c;
	});
	return commentsMap;
}
