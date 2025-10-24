import {
	Badge,
	badgeClasses,
	Box,
	ClickAwayListener,
	Collapse,
	Divider,
	IconButton,
	InputAdornment,
	Stack,
	TextField,
	Typography,
} from '@mui/material';
import AddCircle from '@mui/icons-material/AddCircle';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import SmsOutlined from '@mui/icons-material/SmsOutlined';
import { useChecklistStore } from '@/stores/useChecklistStore';
import Comments from '../common/Comments';
import { useState } from 'react';
import { useCommentTrpc } from '@/hooks/trpc/useCommentTrpc';
import WobbleLoadingIndicator from '../common/WobbleLoadingIndicator';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import BasicButtonStyled from '../common/BasicButtonStyled';
import config from '@/config/config';
import useIsAssigned from '@/hooks/useIsAssigned';
import { TreeNode } from '@/types/types';

const limit = 30;
const pageSize = 3;

export default function ChecklistComments({ tree }: { tree: TreeNode[] }) {
	const [newComment, setNewComment] = useState('');
	const [showNewComment, setShowNewComment] = useState(false);
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const [page, setPage] = useState(0);
	const commentOffset = useChecklistStore((state) => state.commentOffset);
	const updateCommentOffset = useChecklistStore((state) => state.updateCommentOffset);
	const goToPage = useChecklistStore((state) => state.goToPage);
	const toggleHighlightedQuestion = useChecklistStore((state) => state.toggleHighlightedQuestion);
	const isAssigned = useIsAssigned(true);

	const { data = { rows: [], count: 0 }, isFetching } = useCommentTrpc().list(
		{ filters: { checklistId, claimId }, limit, offset: commentOffset },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);
	const { mutateAsync: createComment, isPending } = useCommentTrpc().create;

	const updatePage = (direction: number) => {
		const newPageOffset = page + pageSize * direction;
		if (newPageOffset < 0) {
			updateCommentOffset(direction);
			setPage(limit - pageSize);
		} else if (newPageOffset >= limit) {
			updateCommentOffset(direction);
			setPage(0);
		} else {
			setPage(newPageOffset);
		}
	};

	const closeNewComment = () => {
		setNewComment('');
		setShowNewComment(false);
	};

	const addComment = async () => {
		try {
			await createComment({ checklistId, claimId, body: newComment });
			closeNewComment();
		} catch (e) {
			console.error(e);
		}
	};

	return (
		<Stack width="100%" display="flex" justifyContent="flex-start" alignItems="flex-start" bgcolor="white">
			<Box
				width="100%"
				height={40}
				display="flex"
				justifyContent="space-between"
				alignItems="center"
				padding="5px 10px"
			>
				<Badge badgeContent={data?.count ?? 0} color="secondary" showZero={false} sx={styles.badge}>
					<Typography fontSize={15}>Comments</Typography>
				</Badge>

				{isAssigned && (
					<BasicButtonStyled
						buttonProps={{
							onClick: () => setShowNewComment(true),
						}}
						icon={<SmsOutlined sx={{ transform: 'scaleX(-1)' }} />}
						tooltipProps={{ title: 'New comment' }}
					/>
				)}
			</Box>

			<Divider flexItem sx={{ margin: '0px 10px' }} />

			<Collapse in={showNewComment} unmountOnExit sx={{ width: '100%' }}>
				<ClickAwayListener onClickAway={closeNewComment}>
					<Stack
						width="100%"
						height="100%"
						display="flex"
						justifyContent="flex-start"
						alignItems="flex-start"
						padding="10px"
					>
						<TextField
							value={newComment}
							placeholder="New comment..."
							onChange={(e) => {
								if (e.target.value.length <= config.MAX_COMMENT_SIZE) setNewComment(e.target.value);
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
													disabled: !newComment || isPending,
												}}
												icon={<AddCircle />}
												tooltipProps={{ title: 'Add comment' }}
											/>
										</InputAdornment>
									),
								},
							}}
						/>
						<Box width="100%" display="flex" justifyContent="flex-end" alignItems="center" paddingTop="2px">
							<Typography
								fontSize={12}
								color={newComment.length === config.MAX_COMMENT_SIZE ? 'error' : undefined}
							>
								Max characters: {newComment.length}/{config.MAX_COMMENT_SIZE}
							</Typography>
						</Box>
					</Stack>
				</ClickAwayListener>
			</Collapse>

			<Stack
				width="100%"
				height={200}
				display="flex"
				justifyContent="flex-start"
				alignItems="center"
				overflow="auto"
			>
				{isFetching ? (
					<Stack width="100%" height="100%" display="flex" justifyContent="center" alignItems="center">
						<WobbleLoadingIndicator hideMsg />
					</Stack>
				) : (
					<Comments
						width={460}
						filters={{ checklistId, claimId }}
						limit={limit}
						offset={commentOffset}
						page={page}
						pageSize={pageSize}
						viewingInChecklist
						onNavigate={({ instanceId, questionId }) => {
							if (instanceId) goToPage(instanceId, tree);
							if (questionId) toggleHighlightedQuestion(questionId);
						}}
					/>
				)}
			</Stack>

			<Box width="100%" height={40} display="flex" justifyContent="center" alignItems="center" padding="5px 10px">
				<IconButton onClick={() => updatePage(-1)} disabled={isFetching || (page === 0 && commentOffset === 0)}>
					<KeyboardArrowLeft />
				</IconButton>
				<IconButton
					onClick={() => updatePage(1)}
					disabled={isFetching || commentOffset + page + pageSize >= data.count}
				>
					<KeyboardArrowRight />
				</IconButton>
			</Box>
		</Stack>
	);
}

const styles = {
	badge: {
		[`& .${badgeClasses.badge}`]: {
			top: 5,
			right: -10,
			fontSize: 10,
		},
	},
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
