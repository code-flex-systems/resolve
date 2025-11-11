import { trpc } from '@/lib/trpc';
import type { RouterOutput } from '@/types/routerTypes';

type CommentOutput = RouterOutput['comment'];

export function useCommentTrpc() {
	const utils = trpc.useUtils();

	return {
		list: trpc.comment.getComments.useQuery,

		listForPage: trpc.comment.getCommentsForPage.useQuery,

		count: trpc.comment.getCommentCount.useQuery,

		get: trpc.comment.getComment.useQuery,

		create: trpc.comment.createComment.useMutation({
			onSuccess(data) {
				utils.comment.getComments.invalidate();
				if (data.instance_id != null && data.question_id != null) {
					utils.comment.getCommentsForPage.setData(
						{ checklistId: data.checklist_id, claimId: data.claim_id, instanceId: data.instance_id },
						(prev) => {
							if (!prev) {
								return { [data.question_id!]: { ...data } };
							} else {
								return { ...prev, [data.question_id!]: { ...data } };
							}
						}
					);
				}
			},
		}),

		remove: trpc.comment.deleteComment.useMutation({
			onSuccess(data) {
				utils.comment.getComments.invalidate();
				if (data.instance_id && data.question_id) {
					utils.comment.getCommentsForPage.setData(
						{ checklistId: data.checklist_id, claimId: data.claim_id, instanceId: data.instance_id },
						(prev) => {
							if (!prev) {
								return prev;
							} else {
								let newState = { ...prev };
								delete newState[data.question_id!];
								return newState;
							}
						}
					);
				}
			},
		}),
	};
}

export type GetCommentOutput = CommentOutput['getComment'];
