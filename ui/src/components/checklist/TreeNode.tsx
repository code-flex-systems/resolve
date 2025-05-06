import { Collapse, Fade, IconButton, Tooltip, Typography } from '@mui/material';
import * as actions from '../../state/checklist/actions';
import useStore, { useChecklistSlice } from '../../state/store';
import { BarChart, KeyboardArrowRight } from '@mui/icons-material';
import './styles.css';
import { TreeNode } from '../../types';
import { useQuestions } from '../../api/queries/page-queries';
import * as selectors from '../../state/checklist/selectors';
import { useShallow } from 'zustand/react/shallow';
import QuestionNode from './QuestionNode';
import { ChecklistMode, PageInstanceStatus, QuestionType } from '../../config/enums';
import { useEffect, useMemo, useState } from 'react';
import BasicButton from '../common/BasicButton';
import { IconAlertCircleFilled, IconCircle, IconCircleCheckFilled, IconPercentage50 } from '@tabler/icons-react';
import theme from '../../styles/theme';

export default function TreeNode(props: TreeNode & { level: number }) {
	const { level, instanceId, pageId, status, title, children = [] } = props;
	const selectedPageInstance = useChecklistSlice((state) => state.selectedPageInstance);
	const selectedPageData = useStore(useShallow(selectors.selectedPageData));
	const mode = useChecklistSlice((state) => state.mode);
	const pages = useChecklistSlice((state) => state.pages);
	const expandAll = useChecklistSlice((state) => state.expandAll);
	const visibleInstanceIds = useChecklistSlice((state) => state.visibleInstanceIds);
	const [expanded, setExpanded] = useState(false);
	let selected = selectedPageInstance === instanceId;
	let filteredChildren =
		mode === ChecklistMode.VIEW ? children.filter((c) => visibleInstanceIds.includes(c.instanceId)) : children;

	const { isFetching } = useQuestions(pageId, selected && !pages.has(pageId), actions.updatePage);

	useEffect(() => setExpanded(expandAll), [expandAll]);

	const statusIcon = useMemo(() => {
		switch (status) {
			case PageInstanceStatus.UNSTARTED:
				return <IconCircle size={18} color={theme.palette.primary.main} style={styles.icon} />;
			case PageInstanceStatus.IN_PROGRESS:
				return (
					<IconPercentage50
						style={{ ...styles.icon, color: theme.palette.primary.main, transform: 'scaleX(-1)' }}
						className="status-icon"
						size={18}
					/>
				);
			case PageInstanceStatus.COMPLETE:
				return <IconCircleCheckFilled color={theme.palette.primary.main} size={18} style={styles.icon} />;
			case PageInstanceStatus.STALE:
				return (
					<Tooltip title="This page has changed">
						<IconAlertCircleFilled color={theme.palette.warning.main} size={18} style={styles.icon} />
					</Tooltip>
				);
		}
	}, [status]);

	return (
		<>
			<div
				style={{ ...styles.node, paddingLeft: level * 10 }}
				onClick={() => {
					actions.updateSelectedPage(instanceId);
					actions.updateSelectedPageInfo(props);
				}}
				className={selected ? 'node node-selected flex-row-between' : 'node flex-row-between'}
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
							/>
						</IconButton>
					) : (
						<div style={{ width: 30 }} />
					)}
					<Typography>
						{title}
						{mode === ChecklistMode.EDIT ? ` (p${pageId}.i${instanceId})` : ''}
					</Typography>
					<Fade in={isFetching && selected} unmountOnExit>
						<Typography marginLeft="15px" fontSize={13} fontStyle="italic">
							Loading...
						</Typography>
					</Fade>
				</div>
				{mode === ChecklistMode.EDIT && (
					<BasicButton
						buttonProps={{
							onClick: actions.toggleStatsDialog,
						}}
						tooltipProps={{
							title: 'Open report',
							placement: 'bottom-end',
							arrow: true,
						}}
						icon={<BarChart className="node-report-icon" sx={styles.reportIcon} />}
					/>
				)}
				<Fade in={mode === ChecklistMode.VIEW} unmountOnExit>
					{statusIcon}
				</Fade>
			</div>

			{selectedPageData && mode === ChecklistMode.EDIT && (
				<Collapse in={selected && !isFetching} unmountOnExit>
					{selectedPageData.map((q, i) => (
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
						questionType={QuestionType.SINGLE}
						questionAnswers={[]}
						level={level + 1}
						idx={-1}
					/>
				</Collapse>
			)}

			{!!filteredChildren.length && (
				<Collapse in={expanded} unmountOnExit>
					{filteredChildren.map((c) => (
						<TreeNode key={`i${c.instanceId}`} {...c} level={level + 1} />
					))}
				</Collapse>
			)}
		</>
	);
}

const styles = {
	icon: {
		margin: '0px 5px',
	},
	node: {
		width: '100%',
		minHeight: 30,
		margin: '2px 0px',
		borderRadius: 5,
	},
	reportIcon: {
		color: 'primary.main',
		margin: '0px 5px',
	},
};
