import { ProtectedContext } from '@/server/trpc/trpc';
import * as commentQueries from '../queries/commentQueries';
import { Comment, CommentFilters } from '@/types/types';

export async function createComment(ctx: ProtectedContext, comment: Comment) {
	const result = await commentQueries.createComment(ctx, comment);
	return result;
}

export async function deleteComment(ctx: ProtectedContext, { id }: { id: number }) {
	await commentQueries.deleteComment(ctx, id);
}

export async function getComment(ctx: ProtectedContext, { id }: { id: number }) {
	const result = await commentQueries.getComment(ctx, id);
	return result;
}

export async function getComments(
	ctx: ProtectedContext,
	{ filters, limit }: { filters: CommentFilters; limit?: number }
) {
	const result = await commentQueries.getComments(ctx, filters, limit);
	return result;
}

export async function getCommentCount(ctx: ProtectedContext, { filters }: { filters: CommentFilters }) {
	const result = await commentQueries.getCommentCount(ctx, filters);
	return result;
}

export async function modifyComment(ctx: ProtectedContext, { id, body }: { id: number; body: string }) {
	const result = await commentQueries.modifyComment(ctx, id, body);
	return result;
}
