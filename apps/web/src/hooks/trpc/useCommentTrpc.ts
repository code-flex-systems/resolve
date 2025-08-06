import { trpc } from '@/lib/trpc';

export function useCommentTrpc() {
	const utils = trpc.useUtils();

	return {
		list: trpc.comment.getComments.useQuery,

		count: trpc.comment.getCommentCount.useQuery,

		get: trpc.comment.getComment.useQuery,

		create: trpc.comment.createComment.useMutation({
			onSuccess() {
				utils.comment.getComments.invalidate();
			},
		}),

		update: trpc.comment.updateComment.useMutation({
			onSuccess() {
				utils.comment.getComments.invalidate();
			},
		}),

		remove: trpc.comment.deleteComment.useMutation({
			onSuccess() {
				utils.comment.getComments.invalidate();
			},
		}),
	};
}
