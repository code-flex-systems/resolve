import { useChecklistStore } from '@/stores/useChecklistStore';
import Comments from '../common/Comments';
import { useState, useRef, useEffect } from 'react';
import { useCommentTrpc } from '@/hooks/trpc/useCommentTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import config from '@/config/config';
import useIsAssigned from '@/hooks/useIsAssigned';
import { TreeNode } from '@/types/types';
import {
	IconChevronLeft,
	IconChevronRight,
	IconCirclePlus,
	IconMessage,
} from '@tabler/icons-react';
import Skeleton from '@/components/ui/Skeleton';
import Collapse from '@/components/ui/Collapse';
import Divider from '@/components/ui/Divider';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import Card from '../ui/Card';

const limit = 30;
const pageSize = 3;

export default function ChecklistComments({ tree }: { tree: TreeNode[] }) {
	const [newComment, setNewComment] = useState('');
	const [showNewComment, setShowNewComment] = useState(false);
	const { checklistId = '', claimId = '' } = useChecklistParams();
	const [page, setPage] = useState(0);
	const commentOffset = useChecklistStore((state) => state.commentOffset);
	const updateCommentOffset = useChecklistStore((state) => state.updateCommentOffset);
	const goToPage = useChecklistStore((state) => state.goToPage);
	const toggleHighlightedQuestion = useChecklistStore((state) => state.toggleHighlightedQuestion);
	const isAssigned = useIsAssigned(true);
	const commentFormRef = useRef<HTMLDivElement>(null);

	const { data = { rows: [], count: 0 }, isFetching } = useCommentTrpc().list(
		{ filters: { checklistId, claimId }, limit, offset: commentOffset },
		{ enabled: !!checklistId && !!claimId }
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

	// Click-away handler for comment form
	useEffect(() => {
		if (!showNewComment) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (commentFormRef.current && !commentFormRef.current.contains(e.target as Node)) {
				closeNewComment();
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [showNewComment]);

	return (
		<Card
			variant="surface"
			style={{
				width: '100%',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'flex-start',
				alignItems: 'flex-start',
				padding: 5,
			}}
		>
			<div
				style={{
					width: '100%',
					height: 40,
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					padding: '5px 10px',
				}}
			>
				<Badge
					active={Boolean(data?.count)}
					content={(data?.count ?? 0) || undefined}
					color="primary"
				>
					<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Comments</span>
				</Badge>

				{isAssigned && (
					<Tooltip content="New comment">
						<Button variant="icon" size="sm" color="neutral">
							<IconMessage size={16} style={{ transform: 'scaleX(-1)' }} />
						</Button>
					</Tooltip>
				)}
			</div>

			<Divider />

			<Collapse open={showNewComment}>
				<div
					ref={commentFormRef}
					style={{
						width: '100%',
						height: '100%',
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'flex-start',
						alignItems: 'flex-start',
						padding: 10,
					}}
				>
					<div style={{ position: 'relative', width: '100%' }}>
						<textarea
							value={newComment}
							placeholder="New comment..."
							onChange={(e) => {
								if (e.target.value.length <= config.MAX_COMMENT_SIZE) setNewComment(e.target.value);
							}}
							rows={5}
							style={{
								width: '100%',
								padding: 5,
								borderRadius: 12,
								border: '1px solid var(--border)',
								fontSize: 14,
								resize: 'none',
								fontFamily: 'inherit',
							}}
						/>
						<div style={{ position: 'absolute', bottom: 8, right: 8 }}>
							<Tooltip content="Add comment">
								<Button
									variant="icon"
									size="sm"
									color="neutral"
									onClick={() => addComment().catch(console.error)}
									disabled={!newComment || isPending}
								>
									<IconCirclePlus size={16} />
								</Button>
							</Tooltip>
						</div>
					</div>
					<div
						style={{
							width: '100%',
							display: 'flex',
							justifyContent: 'flex-end',
							alignItems: 'center',
							paddingTop: 2,
						}}
					>
						<span
							style={{
								fontSize: 'var(--text-xs)',
								color:
									newComment.length === config.MAX_COMMENT_SIZE ? 'var(--status-error)' : undefined,
							}}
						>
							Max characters: {newComment.length}/{config.MAX_COMMENT_SIZE}
						</span>
					</div>
				</div>
			</Collapse>

			<div
				style={{
					width: '100%',
					height: 200,
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'flex-start',
					alignItems: 'center',
					overflow: 'auto',
				}}
			>
				{isFetching ? (
					<div
						style={{
							width: '100%',
							display: 'flex',
							flexDirection: 'column',
							gap: 12,
							padding: 12,
						}}
					>
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} variant="rect" height={50} />
						))}
					</div>
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
			</div>

			<div
				style={{
					width: '100%',
					height: 40,
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					padding: 'var(--space-1) var(--space-2-5)',
				}}
			>
				<Button
					variant="icon"
					size="sm"
					onClick={() => updatePage(-1)}
					disabled={isFetching || (page === 0 && commentOffset === 0)}
				>
					<IconChevronLeft size={20} />
				</Button>
				<Button
					variant="icon"
					size="sm"
					onClick={() => updatePage(1)}
					disabled={isFetching || commentOffset + page + pageSize >= data.count}
				>
					<IconChevronRight size={20} />
				</Button>
			</div>
		</Card>
	);
}
