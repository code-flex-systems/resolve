import { Collapse, Fade, IconButton, Typography } from '@mui/material';
import * as actions from '../../state/checklist/actions';
import { useChecklistSlice } from '../../state/store';
import { KeyboardArrowRight } from '@mui/icons-material';
import './styles.css';
import { TreeNode } from '../../types';
import { useQuestions } from '../../api/queries/page-queries';

export default function TreeNode(props: TreeNode & { level: number }) {
	const { level, id, title, children = [] } = props;
	const selectedPage = useChecklistSlice((state) => state.selectedPage);
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
					<Typography>{title}</Typography>
					<Fade in={isFetching}>
						<Typography marginLeft="15px" fontSize={13} fontStyle="italic">
							Loading...
						</Typography>
					</Fade>
				</div>
			</div>
			{!!children.length && (
				<Collapse in={expanded || expandAll === true}>
					{children.map((c) => (
						<TreeNode key={c.id} {...c} level={level + 1} />
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
