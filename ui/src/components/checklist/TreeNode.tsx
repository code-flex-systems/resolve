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
import { DEFAULT_QUESTION } from '../../config/defaults';
import { ChecklistMode } from '../../config/enums';

export default function TreeNode(props: TreeNode & { level: number }) {
	const { level, id, title, children = [] } = props;
	const selectedPage = useChecklistSlice((state) => state.selectedPage);
	const selectedPageData = useStore(useShallow(selectors.selectedPageData));
	const mode = useChecklistSlice((state) => state.mode);
	const pages = useChecklistSlice((state) => state.pages);
	const expandAll = useChecklistSlice((state) => state.expandAll);
	const expanded = !!useChecklistSlice((state) => state.expanded).get(id);
	let selected = selectedPage === id;
	const { isFetching } = useQuestions(id, selected && !pages.has(id), actions.updatePage);

	return (
		<>
			<div
				style={{ ...styles.node, paddingLeft: level * 10 }}
				onClick={() => actions.updateSelectedPage(id)}
				className={selected ? 'node node-selected flex-row-between' : 'node flex-row-between'}
			>
				<div className="flex-row-left">
					{!!children.length ? (
						<IconButton
							onClick={(e) => {
								actions.toggleExpanded(id);
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
					<Typography>
						{title}
						{mode === ChecklistMode.EDIT ? ` (p${id})` : ''}
					</Typography>
					<Fade in={isFetching}>
						<Typography marginLeft="15px" fontSize={13} fontStyle="italic">
							Loading...
						</Typography>
					</Fade>
				</div>
			</div>

			{selectedPageData && (
				<Collapse in={selected && !isFetching}>
					{selectedPageData.map((q, i) => (
						<QuestionNode
							key={`p${id}.q${q.id}`}
							pageId={id}
							questionId={q.id}
							questionText={q.q_text}
							questionAnswers={q.answers}
							level={level + 1}
							idx={i}
						/>
					))}
					{mode === ChecklistMode.EDIT && (
						<QuestionNode
							key={`p${id}.q${0}`}
							pageId={id}
							questionId={-1}
							questionText="New Question"
							questionAnswers={[]}
							level={level + 1}
							idx={-1}
						/>
					)}
				</Collapse>
			)}

			{!!children.length && (
				<Collapse in={expanded || expandAll === true}>
					{children.map((c) => (
						<TreeNode key={`p${c.id}`} {...c} level={level + 1} />
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
