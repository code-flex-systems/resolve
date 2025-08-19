import { protectedProcedure, router } from '../trpc';
import {
	createComment,
	deleteComment,
	getComment,
	getCommentCount,
	getComments,
	getCommentsForPage,
} from '@/api/controllers/commentController';
import config from '@/config/config';
import { checkRole } from '@/lib/auth/checkRole';
import { requireOwnership } from '@/lib/auth/requireOwnership';
import {
	createCommentInput,
	deleteCommentInput,
	getCommentCountInput,
	getCommentInput,
	getCommentsForPageInput,
	getCommentsInput,
} from '@/schemas/commentSchemas';

export const commentRouter = router({
	createComment: protectedProcedure.input(createCommentInput).mutation(async ({ input, ctx }) => {
		if (!checkRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN])) {
			await requireOwnership(ctx, input.checklistId, input.claimId);
		}
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

	getCommentsForPage: protectedProcedure.input(getCommentsForPageInput).query(async ({ input, ctx }) => {
		return getCommentsForPage(ctx, input);
	}),
});
