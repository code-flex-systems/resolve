'use client';
import { Spinner } from '@/components/ui/Progress';
import Tooltip from '@/components/ui/Tooltip';
import { useChecklistStore } from '@/stores/useChecklistStore';
import './styles.css';
import type { TreeNode } from '@/types/types';
import QuestionNode from './QuestionNode';
import { ChecklistMode, PageInstanceStatus, QuestionType } from '@/config/enums';
import { useEffect, useMemo, useState } from 'react';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import {
	IconCircleHalf2,
	IconAlertCircle,
	IconChevronRight,
	IconCircle,
	IconCircleCheck,
	IconFileDescription,
} from '@tabler/icons-react';
import Collapse from '@/components/ui/Collapse';

export default function TreeNode(props: TreeNode & { level: number }) {
	const { checklistId, claimId } = useChecklistParams();
	const { level, instanceId, pageId, position, status, title, children = [] } = props;
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

	const { isFetching, data: questions } = useQuestionTrpc().list(
		{ pageId },
		{ enabled: selected && !!pageId }
	);
	const { data: visibleInstanceIds = [] } = usePageTrpc().listVisibleInstances(
		{ checklistId: checklistId!, claimId: claimId! },
		{ enabled: !!checklistId && !!claimId }
	);
	const filteredChildren =
		mode === ChecklistMode.VIEW
			? children.filter((c) => visibleInstanceIds.includes(c.instanceId))
			: children;

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
		const iconColor = selected ? 'var(--text-accent)' : 'var(--text-muted)';
		const iconClassname = selected ? 'node-selected-inner' : '';
		switch (status) {
			case PageInstanceStatus.UNSTARTED:
				return (
					<Tooltip content="Unstarted">
						<IconCircle
							size={16}
							style={{ color: iconColor, ...styles.icon }}
							className={iconClassname}
						/>
					</Tooltip>
				);
			case PageInstanceStatus.IN_PROGRESS:
				return (
					<Tooltip content="Started">
						<IconCircleHalf2
							size={16}
							style={{ color: iconColor, ...styles.icon, transform: 'scaleX(-1)' }}
							className={iconClassname}
						/>
					</Tooltip>
				);
			case PageInstanceStatus.COMPLETE:
				return (
					<Tooltip content="Complete">
						<IconCircleCheck
							size={16}
							style={{ color: iconColor, ...styles.icon }}
							className={iconClassname}
						/>
					</Tooltip>
				);
			case PageInstanceStatus.STALE:
				return (
					<Tooltip content="This page has changed">
						<IconAlertCircle
							size={16}
							style={{ color: iconColor, ...styles.icon }}
							className={iconClassname}
						/>
					</Tooltip>
				);
		}
	}, [status, selected]);

	return (
		<>
			<div
				style={{
					...styles.node,
					...(selected && mode === ChecklistMode.EDIT
						? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
						: {}),
					paddingLeft: `${level * 20}px`,
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
				}}
				onClick={() => updateSelectedPage(instanceId)}
				className={selected ? 'node node-selected' : 'node'}
			>
				<div className="flex-row-left">
					{!!filteredChildren.length ? (
						<button
							style={{
								background: 'none',
								border: 'none',
								padding: '2px',
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								marginRight: 4,
							}}
							onClick={(e) => {
								setExpanded((prev) => !prev);
								clearExpandedBranch();
								e.stopPropagation();
								e.preventDefault();
							}}
						>
							<IconChevronRight
								size={14}
								style={{
									transform: expanded ? 'rotate(90deg)' : undefined,
									transition: 'transform 100ms ease',
									color: selected ? 'var(--text-accent)' : 'var(--text-muted)',
								}}
							/>
						</button>
					) : (
						<div style={{ width: 20, minWidth: 20 }} />
					)}
					<span className={selected ? 'node-selected-inner' : ''} style={{ maxWidth: 350 }}>
						{title}
						{mode === ChecklistMode.EDIT ? ` (p${position + 1})` : ''}
					</span>
				</div>
				{(mode === ChecklistMode.VIEW || isFetching) && (
					<span>{isFetching ? <Spinner size="sm" className="" /> : statusIcon}</span>
				)}
			</div>

			{questions && mode === ChecklistMode.EDIT && (
				<Collapse open={selected && !isFetching}>
					<div style={{ ...styles.questionsContainer, paddingBottom: 8 }}>
						{questions.map((q, i) => (
							<QuestionNode
								key={i}
								pagePosition={position + 1}
								questionId={q.id}
								questionText={q.text}
								questionType={q.type as QuestionType}
								questionAnswers={q.answers ?? []}
								level={level + 1}
								idx={i}
							/>
						))}
						<QuestionNode
							key="new"
							pagePosition={position + 1}
							questionId={''}
							questionText="New Question"
							questionType={undefined}
							questionAnswers={[]}
							level={level + 1}
							idx={-1}
						/>
					</div>
				</Collapse>
			)}

			{!!filteredChildren.length && (
				<Collapse open={expanded}>
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
		marginTop: 4,
		marginLeft: 6,
		marginRight: 10,
		width: 18,
		height: 18,
	},
	node: {
		width: '100%',
		minHeight: 32,
		paddingTop: 6,
		paddingBottom: 6,
	} as React.CSSProperties,
	questionsContainer: {
		borderBottomLeftRadius: 2,
		borderBottomRightRadius: 2,
		background: 'rgba(0, 0, 0, 0.02)',
	} as React.CSSProperties,
};
