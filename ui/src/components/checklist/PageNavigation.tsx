import { Collapse, Divider, Paper, Typography } from '@mui/material';
import { OFFWHITE_COLOR } from '../../styles/theme';
import { useChecklistSlice, useGlobalSlice } from '../../state/store';
import { usePageInstanceTree } from '../../api/queries/page-queries';
import * as actions from '../../state/checklist/actions';
import Toolbar from '../common/Toolbar';
import TreeNode from './TreeNode';
import BasicButton from '../common/BasicButton';

export default function PageNavigation() {
	const checklist = useGlobalSlice((state) => state.checklist);
	const expandAll = useChecklistSlice((state) => state.expandAll);
	const { isFetching, refetch } = usePageInstanceTree(actions.updateTree);
	const tree = useChecklistSlice((state) => state.tree);

	return (
		<Paper style={styles.container}>
			<Toolbar
				left={
					<Typography fontSize={17} fontWeight="bold">
						{checklist?.name ?? ''}
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
			<Collapse in={!isFetching} style={{ width: '100%', height: '100%' }}>
				<div style={{ width: '100%', height: 'calc(100% - 35px)', overflow: 'auto' }}>
					{tree.map((node) => (
						<TreeNode key={node.instanceId} level={0} {...node} />
					))}
				</div>
			</Collapse>
		</Paper>
	);
}

const styles = {
	container: {
		width: 'fit-content',
		minWidth: 500,
		height: 'calc(100vh - 60px)',
		backgroundColor: OFFWHITE_COLOR,
		padding: 10,
		overflow: 'hidden',
	},
};
