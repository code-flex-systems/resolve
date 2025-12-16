'use client';
import { Box, CircularProgress, Collapse, Fade, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useChecklistStore } from '@/stores/useChecklistStore';
import Adjust from '@mui/icons-material/Adjust';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Error from '@mui/icons-material/Error';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import PanoramaFishEye from '@mui/icons-material/PanoramaFishEye';
import './styles.css';
import type { TreeNode } from '@/types/types';
import QuestionNode from './QuestionNode';
import { ChecklistMode, PageInstanceStatus, QuestionType } from '@/config/enums';
import { useEffect, useMemo, useState } from 'react';
import theme, { BORDER_LIGHT, containerStyles } from '@/styles/theme';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';

export default function TreeNode(props: TreeNode & { level: number }) {
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const { level, instanceId, pageId, status, title, children = [] } = props;
	const selectedPageInstance = useChecklistStore((state) => state.selectedPageInstance);
	const mode = useChecklistStore((state) => state.mode);
	const expandAll = useChecklistStore((state) => state.expandAll);
	const expandedBranch = useChecklistStore((state) => state.expandedBranch);
	const updateExpandedBranch = useChecklistStore((state) => state.updateExpandedBranch);
	const clearExpandedBranch = useChecklistStore((state) => state.clearExpandedBranch);
	const updateSelectedPageInfo = useChecklistStore((state) => state.updateSelectedPageInfo);
	const updateSelectedPage = useChecklistStore((state) => state.updateSelectedPage);
	const [expanded, setExpanded] = useState(false);
	const selected = selectedPageInstance === instanceId;
	const childIds = children.map((c) => c.instanceId);

	const { isFetching, data: questions } = useQuestionTrpc().list({ pageId }, { enabled: selected });
	const { data: visibleInstanceIds = [] } = usePageTrpc().listVisibleInstances(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);
	const filteredChildren =
		mode === ChecklistMode.VIEW ? children.filter((c) => visibleInstanceIds.includes(c.instanceId)) : children;

	useEffect(() => {
		for (const id of childIds) {
			if (expandedBranch.has(id)) {
				updateExpandedBranch(instanceId);
				setExpanded(true);
				continue;
			}
		}
	}, [instanceId, childIds, expandedBranch]);

	useEffect(() => {
		clearExpandedBranch();
		setExpanded(expandAll);
	}, [expandAll]);

	useEffect(() => {
		if (selectedPageInstance === instanceId) updateSelectedPageInfo(props);
	}, [selectedPageInstance, props]);

	const statusIcon = useMemo(() => {
		const iconColor = selected ? 'white' : theme.palette.primary.main;
		const iconClassname = selected ? 'node-selected-inner' : '';
		switch (status) {
			case PageInstanceStatus.UNSTARTED:
				return (
					<Tooltip title="Unstarted">
						<PanoramaFishEye sx={{ color: iconColor, ...styles.icon }} className={iconClassname} />
					</Tooltip>
				);
			case PageInstanceStatus.IN_PROGRESS:
				return (
					<Tooltip title="Started">
						<Adjust sx={{ color: iconColor, ...styles.icon }} className={iconClassname} />
					</Tooltip>
				);
			case PageInstanceStatus.COMPLETE:
				return (
					<Tooltip title="Complete">
						<CheckCircle sx={{ color: iconColor, ...styles.icon }} className={iconClassname} />
					</Tooltip>
				);
			case PageInstanceStatus.STALE:
				return (
					<Tooltip title="This page has changed">
						<Error sx={{ color: iconColor, ...styles.icon }} className={iconClassname} />
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
					paddingLeft: `${level * 20}px`,
					'&:hover .node-selected-inner': {
						// color: theme.palette.primary.main,
					},
				}}
				onClick={() => updateSelectedPage(instanceId)}
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
								clearExpandedBranch();
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
						<Box sx={{ width: 30, minWidth: 30 }} />
					)}
					<Typography
						maxWidth={350}
						color={selected ? 'white' : ''}
						className={selected ? 'node-selected-inner' : ''}
					>
						{title}
						{mode === ChecklistMode.EDIT ? ` (p${pageId}.i${instanceId})` : ''}
					</Typography>
				</div>
				<Fade in={mode === ChecklistMode.VIEW || isFetching} unmountOnExit>
					<span>
						{isFetching ? (
							<CircularProgress size={19} sx={{ color: 'white', ...styles.icon }} />
						) : (
							statusIcon
						)}
					</span>
				</Fade>
			</Box>

			{questions && mode === ChecklistMode.EDIT && (
				<Collapse in={selected && !isFetching} unmountOnExit>
					<Stack pb={1} sx={styles.questionsContainer}>
						{questions.map((q, i) => (
							<QuestionNode
								key={i}
								pageId={pageId}
								questionId={q.id}
								questionText={q.text}
								questionType={q.type as QuestionType}
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
							questionType={undefined}
							questionAnswers={[]}
							level={level + 1}
							idx={-1}
						/>
					</Stack>
				</Collapse>
			)}

			{!!filteredChildren.length && (
				<Collapse in={expanded} timeout={expandedBranch.has(instanceId) ? 0 : 100}>
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
		mt: 0.5,
		ml: 0.75,
		mr: 1.25,
		width: 18,
		height: 18,
	},
	node: {
		width: '100%',
		minHeight: 32,
		py: 0.75,
	},
	questionsContainer: {
		borderBottomLeftRadius: 2,
		borderBottomRightRadius: 2,
		background: containerStyles.gradientCard.background,
	},
};
