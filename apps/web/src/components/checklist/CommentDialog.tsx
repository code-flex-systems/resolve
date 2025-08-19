import { Box, InputAdornment, TextField, Typography } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import { useState } from 'react';
import config from '@/config/config';
import BasicButtonStyled from '../common/BasicButtonStyled';
import { AddCircle, Delete } from '@mui/icons-material';
import { useCommentTrpc } from '@/hooks/trpc/useCommentTrpc';
import { clearExistingComment, toggleQuestionCommentDialog } from '@/state/checklist/actions';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useChecklistSlice } from '@/state/store';
import { formatMDY, formatUser } from '@/lib/utils/utils';
import { useSession } from 'next-auth/react';
import { BASE_COLOR_LIGHT } from '@/styles/theme';

export default function CommentDialog() {
	const { data: session } = useSession();
	const { instanceId, questionId, existingComment } = useChecklistSlice((state) => state.questionCommentDialog);
	const [comment, setComment] = useState(existingComment?.body ?? '');
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
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
			title={
				existingComment
					? `${formatUser(existingComment)} said...`
					: `Add a comment to this question (q${questionId})`
			}
			onClose={() => toggleQuestionCommentDialog()}
			closeDisabled={inTransition}
			width={400}
		>
			<TextField
				value={comment}
				placeholder="New comment..."
				onChange={(e) => {
					if (e.target.value.length <= config.MAX_COMMENT_SIZE) setComment(e.target.value);
				}}
				multiline
				rows={5}
				variant="outlined"
				sx={styles.textField}
				fullWidth
				slotProps={{
					input: {
						endAdornment:
							!existingComment || session?.user.id === existingComment.created_by ? (
								<InputAdornment sx={{ marginTop: '90px', marginRight: '5px' }} position="end">
									{existingComment ? (
										<BasicButtonStyled
											buttonProps={{
												onClick: () => deleteComment().catch(console.error),
												disabled: inTransition,
											}}
											icon={<Delete />}
											tooltipProps={{ title: 'Delete comment' }}
										/>
									) : (
										<BasicButtonStyled
											buttonProps={{
												onClick: () => addComment().catch(console.error),
												disabled: !comment || inTransition,
											}}
											icon={<AddCircle />}
											tooltipProps={{ title: 'Add comment' }}
										/>
									)}
								</InputAdornment>
							) : undefined,
					},
				}}
				autoFocus
				disabled={comment.length >= config.MAX_COMMENT_SIZE || !!existingComment || inTransition}
			/>
			<Box width="100%" display="flex" justifyContent="flex-end" alignItems="center" paddingTop="2px">
				{!!existingComment && (
					<Typography fontSize={12} color={BASE_COLOR_LIGHT}>
						{formatMDY(existingComment.created_at)}
					</Typography>
				)}
				{!existingComment && (
					<Typography fontSize={12} color={comment.length === config.MAX_COMMENT_SIZE ? 'error' : undefined}>
						Max characters: {comment.length}/{config.MAX_COMMENT_SIZE}
					</Typography>
				)}
			</Box>
		</BasicDialog>
	);
}

const styles = {
	textField: {
		'& .MuiOutlinedInput-root': {
			padding: '5px',
			borderRadius: 3,
		},
		'& .MuiOutlinedInput-input': {
			fontSize: 14,
			padding: '5px',
		},
	},
};
