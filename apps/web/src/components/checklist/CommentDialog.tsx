import { Textarea } from '@/components/ui/Input';
import BasicDialog from '../common/BasicDialog';
import { useState } from 'react';
import config from '@/config/config';
import { useCommentTrpc } from '@/hooks/trpc/useCommentTrpc';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { formatMDY, formatUser } from '@/lib/utils/utils';
import { useSession } from '@/lib/auth/use-session';
import { IconCirclePlus, IconTrash } from '@tabler/icons-react';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';

export default function CommentDialog() {
	const { data: session } = useSession();
	const { instanceId, questionId, existingComment } = useChecklistStore(
		(state) => state.questionCommentDialog
	);
	const toggleQuestionCommentDialog = useChecklistStore(
		(state) => state.toggleQuestionCommentDialog
	);
	const clearExistingComment = useChecklistStore((state) => state.clearExistingComment);
	const [comment, setComment] = useState(existingComment?.body ?? '');
	const { checklistId = '', claimId = '' } = useChecklistParams();
	const { mutateAsync: createComment, isPending } = useCommentTrpc().create;
	const { mutateAsync: removeComment, isPending: isDeleting } = useCommentTrpc().remove;
	const inTransition = isPending || isDeleting;

	if (!instanceId || !questionId) return <></>;

	const addComment = async () => {
		try {
			await createComment({
				checklistId,
				claimId,
				instanceId,
				questionId,
				body: comment,
			});
			toggleQuestionCommentDialog();
		} catch (e) {
			console.error(e);
		}
	};

	const deleteComment = async () => {
		try {
			if (!existingComment) return;
			await removeComment({ id: existingComment.id });
			clearExistingComment();
			setComment('');
		} catch (e) {
			console.error(e);
		}
	};

	return (
		<BasicDialog
			title={existingComment ? `${formatUser(existingComment)} said...` : 'Add a comment...'}
			onClose={() => toggleQuestionCommentDialog()}
			closeDisabled={inTransition}
			width={400}
		>
			<Textarea
				value={comment}
				placeholder="New comment..."
				onChange={(e) => {
					if (e.target.value.length <= config.MAX_COMMENT_SIZE) setComment(e.target.value);
				}}
				rows={5}
				fullWidth
				endAdornment={
					!existingComment || session?.user.id === existingComment.created_by ? (
						<span style={{ marginTop: 90, marginRight: 5 }}>
							{existingComment ? (
								<Tooltip content="Delete comment">
									<Button
										variant="icon"
										size="sm"
										color="neutral"
										onClick={() => deleteComment().catch(console.error)}
										disabled={inTransition}
									>
										<IconTrash size={16} />
									</Button>
								</Tooltip>
							) : (
								<Tooltip content="Add comment">
									<Button
										variant="icon"
										size="sm"
										color="neutral"
										onClick={() => addComment().catch(console.error)}
										disabled={!comment || inTransition}
									>
										<IconCirclePlus size={16} />
									</Button>
								</Tooltip>
							)}
						</span>
					) : undefined
				}
				autoFocus
				disabled={comment.length >= config.MAX_COMMENT_SIZE || !!existingComment || inTransition}
			/>
			<div
				style={{
					width: '100%',
					display: 'flex',
					justifyContent: 'flex-end',
					alignItems: 'center',
					paddingTop: '2px',
				}}
			>
				{!!existingComment && (
					<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
						{formatMDY(existingComment.created_at)}
					</span>
				)}
				{!existingComment && (
					<span
						style={{
							fontSize: 'var(--text-xs)',
							color: comment.length === config.MAX_COMMENT_SIZE ? 'error' : undefined,
						}}
					>
						Max characters: {comment.length}/{config.MAX_COMMENT_SIZE}
					</span>
				)}
			</div>
		</BasicDialog>
	);
}
