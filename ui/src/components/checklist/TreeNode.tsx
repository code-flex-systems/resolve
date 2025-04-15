import { Collapse, Fade, IconButton, Typography } from '@mui/material';
import * as actions from '../../state/checklist/actions';
import useStore, { useChecklistSlice } from '../../state/store';
import { KeyboardArrowRight } from '@mui/icons-material';
import './styles.css';
import { TreeNode } from '../../types';
import { useQuestions } from '../../api/queries/page-queries';
import * as selectors from '../../state/checklist/selectors';
import { useShallow } from 'zustand/react/shallow';
import QuestionNode from './QuestionNode';
import { ChecklistMode, QuestionType } from '../../config/enums';

export default function TreeNode(props: TreeNode & { level: number }) {
	const { level, instanceId, pageId, title, children = [] } = props;
	const selectedPageInstance = useChecklistSlice((state) => state.selectedPageInstance);
	const selectedPageData = useStore(useShallow(selectors.selectedPageData));
	const mode = useChecklistSlice((state) => state.mode);
	const pages = useChecklistSlice((state) => state.pages);
	const expandAll = useChecklistSlice((state) => state.expandAll);
	const expanded = !!useChecklistSlice((state) => state.expanded).get(instanceId);
	let selected = selectedPageInstance === instanceId;
	const { isFetching } = useQuestions(pageId, selected && !pages.has(pageId), actions.updatePage);

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
					{!!children.length ? (
						<IconButton
							onClick={(e) => {
								actions.toggleExpanded(instanceId);
								e.stopPropagation();
								e.preventDefault();
							}}
							disableRipple
						>
							<KeyboardArrowRight
								sx={{
									transform: expanded || expandAll === true ? 'rotate(90deg)' : undefined,
									transition: 'transform 100ms ease',
								}}
							/>
						</IconButton>
					) : (
						<div style={{ width: 30 }} />
					)}
					<Typography noWrap>
						{title}
						{mode === ChecklistMode.EDIT ? ` (p${pageId})` : ''}
					</Typography>
					<Fade in={isFetching}>
						<Typography marginLeft="15px" fontSize={13} fontStyle="italic">
							Loading...
						</Typography>
					</Fade>
				</div>
			</div>

			{selectedPageData && mode === ChecklistMode.EDIT && (
				<Collapse in={selected && !isFetching}>
					{selectedPageData.map((q, i) => (
						<QuestionNode
							key={`p${pageId}.q${q.id}`}
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
						key={`p${pageId}.q${0}`}
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

			{!!children.length && (
				<Collapse in={expanded || expandAll === true}>
					{children.map((c) => (
						<TreeNode key={`p${c.pageId}`} {...c} level={level + 1} />
					))}
				</Collapse>
			)}
		</>
	);
}

const styles = {
	node: {
		width: '100%',
		height: 30,
		borderRadius: 5,
	},
};
