'use client';
import { Box, Collapse, Fade, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import * as actions from '@/state/checklist/actions';
import { useChecklistSlice } from '@/state/store';
import { Adjust, CheckCircle, Error, KeyboardArrowRight, PanoramaFishEye } from '@mui/icons-material';
import './styles.css';
import type { TreeNode } from '@/types/types';
import QuestionNode from './QuestionNode';
import { ChecklistMode, PageInstanceStatus } from '@/config/enums';
import { useEffect, useMemo, useState } from 'react';
import theme from '@/styles/theme';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';

export default function TreeNode(props: TreeNode & { level: number }) {
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const { level, instanceId, pageId, status, title, children = [] } = props;
	const selectedPageInstance = useChecklistSlice((state) => state.selectedPageInstance);
	const mode = useChecklistSlice((state) => state.mode);
	const expandAll = useChecklistSlice((state) => state.expandAll);
	const [expanded, setExpanded] = useState(false);
	const selected = selectedPageInstance === instanceId;

	const { isFetching, data: questions } = useQuestionTrpc().list({ pageId }, { enabled: selected });
	const { data: visibleInstanceIds = [] } = usePageTrpc().listVisibleInstances(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);
	const filteredChildren =
		mode === ChecklistMode.VIEW ? children.filter((c) => visibleInstanceIds.includes(c.instanceId)) : children;

	useEffect(() => setExpanded(expandAll), [expandAll]);

	const statusIcon = useMemo(() => {
		const iconColor = selected ? 'white' : theme.palette.primary.main;
		const iconClassname = selected ? 'node-selected-inner' : '';
		switch (status) {
			case PageInstanceStatus.UNSTARTED:
				return <PanoramaFishEye sx={{ color: iconColor }} className={iconClassname} style={styles.icon} />;
			case PageInstanceStatus.IN_PROGRESS:
				return <Adjust sx={{ color: iconColor }} className={iconClassname} style={styles.icon} />;
			case PageInstanceStatus.COMPLETE:
				return <CheckCircle sx={{ color: iconColor }} className={iconClassname} style={styles.icon} />;
			case PageInstanceStatus.STALE:
				return (
					<Tooltip title="This page has changed">
						<Error sx={{ color: iconColor }} className={iconClassname} style={styles.icon} />
					</Tooltip>
				);
		}
	}, [status, selected]);

	return (
		<>
			<Box
				sx={{
					...styles.node,
					...(selected && mode === ChecklistMode.EDIT
						? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
						: {}),
					paddingLeft: `${level * 10}px`,
					'&:hover .node-selected-inner': {
						color: theme.palette.primary.main,
					},
				}}
				onClick={() => {
					actions.updateSelectedPage(instanceId);
					actions.updateSelectedPageInfo(props);
				}}
				display="flex"
				justifyContent="space-between"
				alignItems="center"
				className={selected ? 'node node-selected' : 'node'}
			>
				<div className="flex-row-left">
					{!!filteredChildren.length ? (
						<IconButton
							onClick={(e) => {
								setExpanded((prev) => !prev);
								e.stopPropagation();
								e.preventDefault();
							}}
							disableRipple
						>
							<KeyboardArrowRight
								sx={{
									transform: expanded ? 'rotate(90deg)' : undefined,
									transition: 'transform 100ms ease',
								}}
								className={selected ? 'node-selected-inner' : ''}
							/>
						</IconButton>
					) : (
						<div style={{ width: 30, minWidth: 30 }} />
					)}
					<Typography
						maxWidth={350}
						color={selected ? 'white' : ''}
						className={selected ? 'node-selected-inner' : ''}
					>
						{title}
						{mode === ChecklistMode.EDIT ? ` (p${pageId}.i${instanceId})` : ''}
					</Typography>
					<Fade in={isFetching && selected} unmountOnExit>
						<span>
							<Typography
								marginLeft="15px"
								fontSize={13}
								fontStyle="italic"
								color={selected ? 'white' : ''}
								className={selected ? 'node-selected-inner' : ''}
							>
								Loading...
							</Typography>
						</span>
					</Fade>
				</div>
				<Fade in={mode === ChecklistMode.VIEW} unmountOnExit>
					<span>{statusIcon}</span>
				</Fade>
			</Box>

			{questions && mode === ChecklistMode.EDIT && (
				<Collapse in={selected && !isFetching} unmountOnExit>
					<Stack bgcolor="rgba(33, 106, 196, 0.1)" paddingBottom="5px" style={styles.questionsContainer}>
						{questions.map((q, i) => (
							<QuestionNode
								key={i}
								pageId={pageId}
								questionId={q.id}
								questionText={q.text}
								questionAnswers={q.answers ?? []}
								level={level + 1}
								idx={i}
							/>
						))}
						<QuestionNode
							key={-1}
							pageId={pageId}
							questionId={-1}
							questionText="New Question"
							questionAnswers={[]}
							level={level + 1}
							idx={-1}
						/>
					</Stack>
				</Collapse>
			)}

			{!!filteredChildren.length && (
				<Collapse in={expanded} unmountOnExit>
					<span>
						{filteredChildren.map((c) => (
							<TreeNode key={`i${c.instanceId}`} {...c} level={level + 1} />
						))}
					</span>
				</Collapse>
			)}
		</>
	);
}

const styles = {
	icon: {
		marginTop: '4px',
		marginLeft: '5px',
		marginRight: '10px',
	},
	node: {
		width: '100%',
		minHeight: 30,
		padding: '2px 0px',
		borderTopLeftRadius: 5,
		borderTopRightRadius: 5,
		borderBottomLeftRadius: 5,
		borderBottomRightRadius: 5,
	},
	questionsContainer: {
		borderBottomLeftRadius: 5,
		borderBottomRightRadius: 5,
	},
	reportIcon: {
		color: 'primary.main',
		margin: '0px 5px',
	},
};
