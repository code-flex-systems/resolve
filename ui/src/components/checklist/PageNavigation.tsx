import { Collapse, Divider, Paper, Typography } from '@mui/material';
import { OFFWHITE_COLOR } from '../../styles/theme';
import { useChecklistSlice, useGlobalSlice } from '../../state/store';
import { useAddPage, usePageInstanceTree } from '../../api/queries/page-queries';
import * as actions from '../../state/checklist/actions';
import Toolbar from '../common/Toolbar';
import TreeNode from './TreeNode';
import BasicButton from '../common/BasicButton';
import { ChecklistMode } from '../../config/enums';
import { Add } from '@mui/icons-material';

export default function PageNavigation() {
	const checklist = useGlobalSlice((state) => state.checklist);
	const maxPageInstancePosition = useChecklistSlice((state) => state.maxPageInstancePosition);
	const mode = useChecklistSlice((state) => state.mode);
	const expandAll = useChecklistSlice((state) => state.expandAll);
	const { mutateAsync: addPage, isPending: adding } = useAddPage(checklist?.id ?? -1);
	const { isFetching, refetch } = usePageInstanceTree(actions.updateTree);
	const tree = useChecklistSlice((state) => state.tree);

	const onAddPage = async () => {
		try {
			let newInstance = await addPage({
				parentId: -1,
				title: 'New Page',
				position: maxPageInstancePosition + 1,
			});
			await refetch();
			actions.updateSelectedPage(newInstance.id);
		} catch (e) {
			console.error(e);
		}
	};

	return (
		<Paper style={styles.container}>
			<Toolbar
				left={
					<Typography fontSize={17} fontWeight="bold">
						{checklist?.name ?? ''}
					</Typography>
				}
				right={
					<>
						<BasicButton
							buttonProps={{
								onClick: actions.toggleExpandAll,
								sx: { height: 25 },
							}}
						>
							{expandAll ? 'Collase' : 'Expand'} All
						</BasicButton>
						{mode === ChecklistMode.EDIT && (
							<BasicButton
								buttonProps={{
									onClick: () => onAddPage().catch((e) => console.error(e)),
									disabled: isFetching || adding,
									variant: 'contained',
									sx: { height: 25, marginLeft: '15px' },
									startIcon: <Add sx={{ color: 'white' }} />,
								}}
							>
								New Page
							</BasicButton>
						)}
					</>
				}
				padding={0}
				height={35}
			/>
			<Divider />
			<Collapse in={!isFetching} style={styles.nodeContainer}>
				<div style={styles.nodeContainerInner}>
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
	nodeContainer: {
		width: '100%',
		height: 'calc(100% - 35px)',
		overflow: 'auto',
	},
	nodeContainerInner: {
		width: '100%',
		height: '100%',
	},
};
