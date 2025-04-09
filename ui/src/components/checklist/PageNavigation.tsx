import { Collapse, Divider, Paper, Typography } from '@mui/material';
import { OFFWHITE_COLOR } from '../../styles/theme';
import { useChecklistSlice } from '../../state/store';
import { usePageInstanceTree } from '../../api/queries/page-queries';
import * as actions from '../../state/checklist/actions';
import Toolbar from '../common/Toolbar';
import TreeNode from './TreeNode';
import BasicButton from '../common/BasicButton';

export default function PageNavigation() {
	const expandAll = useChecklistSlice((state) => state.expandAll);
	const { isFetching, refetch } = usePageInstanceTree(actions.updateTree);
	const tree = useChecklistSlice((state) => state.tree);

	return (
		<Paper style={styles.container}>
			<Toolbar
				left={
					<Typography fontSize={17} fontWeight="bold">
						Checklist 1
					</Typography>
				}
				right={
					<BasicButton
						buttonProps={{
							onClick: actions.toggleExpandAll,
						}}
					>
						{expandAll ? 'Collase' : 'Expand'} All
					</BasicButton>
				}
				padding={0}
				height={35}
			/>
			<Divider />
			<Collapse in={!isFetching}>
				{tree.map((node) => (
					<TreeNode key={node.instanceId} level={0} {...node} />
				))}
			</Collapse>
		</Paper>
	);
}

const styles = {
	container: {
		minWidth: 300,
		height: '100%',
		backgroundColor: OFFWHITE_COLOR,
		padding: 10,
	},
};
