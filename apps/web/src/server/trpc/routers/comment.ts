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
		if (!checkRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN])) {
			// Verify user is the creator of the comment
			const comment = await getComment(ctx, input);
			if (comment.created_by !== ctx.session.user.id) {
				throw new Error('FORBIDDEN: You can only delete your own comments');
			}
		}
		return deleteComment(ctx, input);
	}),

	getComment: protectedProcedure.input(getCommentInput).query(async ({ input, ctx }) => {
		const comment = await getComment(ctx, input);
		// Verify user has ownership/assignment to the claim this comment belongs to
		if (!checkRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN])) {
			await requireOwnership(ctx, comment.checklist_id, comment.claim_id);
		}
		return comment;
	}),

	getComments: protectedProcedure.input(getCommentsInput).query(async ({ input, ctx }) => {
		// If querying comments for a specific claim, verify ownership/assignment
		if (
			input.filters.claimId &&
			input.filters.checklistId &&
			!checkRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN])
		) {
			await requireOwnership(ctx, input.filters.checklistId, input.filters.claimId);
		}
		return getComments(ctx, input);
	}),

	getCommentCount: protectedProcedure.input(getCommentCountInput).query(async ({ input, ctx }) => {
		return getCommentCount(ctx, input);
	}),

	getCommentsForPage: protectedProcedure
		.input(getCommentsForPageInput)
		.query(async ({ input, ctx }) => {
			if (!checkRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN])) {
				await requireOwnership(ctx, input.checklistId, input.claimId);
			}
			return getCommentsForPage(ctx, input);
		}),
});
