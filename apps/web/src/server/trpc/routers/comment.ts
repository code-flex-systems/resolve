import { protectedProcedure, router } from '../trpc';
import {
	createComment,
	deleteComment,
	getComment,
	getCommentCount,
	getComments,
	modifyComment,
} from '@/api/controllers/commentController';
import {
	createCommentInput,
	deleteCommentInput,
	getCommentCountInput,
	getCommentInput,
	getCommentsInput,
	updateCommentInput,
} from '@/schemas/commentSchemas';

export const commentRouter = router({
	createComment: protectedProcedure.input(createCommentInput).mutation(async ({ input, ctx }) => {
		return createComment(ctx, input);
	}),

	deleteComment: protectedProcedure.input(deleteCommentInput).mutation(async ({ input, ctx }) => {
		return deleteComment(ctx, input);
	}),

	getComment: protectedProcedure.input(getCommentInput).query(async ({ input, ctx }) => {
		return getComment(ctx, input);
	}),

	getComments: protectedProcedure.input(getCommentsInput).query(async ({ input, ctx }) => {
		return getComments(ctx, input);
	}),

	getCommentCount: protectedProcedure.input(getCommentCountInput).query(async ({ input, ctx }) => {
		return getCommentCount(ctx, input);
	}),

	updateComment: protectedProcedure.input(updateCommentInput).mutation(async ({ input, ctx }) => {
		return modifyComment(ctx, input);
	}),
});
