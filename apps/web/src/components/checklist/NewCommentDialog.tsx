import { InputAdornment, TextField } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import { useState } from 'react';
import config from '@/config/config';
import BasicButtonStyled from '../common/BasicButtonStyled';
import { AddCircle } from '@mui/icons-material';
import { useCommentTrpc } from '@/hooks/trpc/useCommentTrpc';
import { toggleQuestionCommentDialog } from '@/state/checklist/actions';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useChecklistSlice } from '@/state/store';

export default function NewCommentDialog() {
	const [comment, setComment] = useState('');
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const { mutateAsync: createComment, isPending } = useCommentTrpc().create;
	const questionCommentDialog = useChecklistSlice((state) => state.questionCommentDialog);

	if (!questionCommentDialog) return <></>;

	const addComment = async () => {
		try {
			await createComment({
				checklistId,
				claimId,
				instanceId: questionCommentDialog.instanceId,
				questionId: questionCommentDialog.questionId,
				body: comment,
			});
			toggleQuestionCommentDialog();
		} catch (e) {
			console.error(e);
		}
	};

	return (
		<BasicDialog
			title={`Add a comment to this question (q${questionCommentDialog.questionId})`}
			onClose={() => toggleQuestionCommentDialog()}
			closeDisabled={isPending}
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
						endAdornment: (
							<InputAdornment sx={{ marginTop: '90px', marginRight: '5px' }} position="end">
								<BasicButtonStyled
									buttonProps={{
										onClick: () => addComment().catch(console.error),
										disabled: !comment || isPending,
									}}
									icon={<AddCircle />}
									tooltipProps={{ title: 'Add comment' }}
								/>
							</InputAdornment>
						),
					},
				}}
				autoFocus
			/>
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
