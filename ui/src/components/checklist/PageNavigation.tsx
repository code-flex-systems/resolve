import {
	Collapse,
	Divider,
	Fade,
	Link,
	Paper,
	PopperProps,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
} from '@mui/material';
import {
	Add,
	ArrowForward,
	ContentPasteSearch,
	MovieCreationOutlined,
	MovieEdit,
	Visibility,
} from '@mui/icons-material';
import { OFFWHITE_COLOR } from '../../styles/theme';
import useStore, { useChecklistSlice, useGlobalSlice } from '../../state/store';
import { useAddPage, usePageInstanceTree } from '../../api/queries/page-queries';
import * as selectors from '../../state/checklist/selectors';
import * as actions from '../../state/checklist/actions';
import Toolbar from '../common/Toolbar';
import TreeNode from './TreeNode';
import BasicButton from '../common/BasicButton';
import { ChecklistMode } from '../../config/enums';
import QuestionStatsDialog from './QuestionStatsDialog';
import config from '../../config/config';
import { useEffect, useState } from 'react';
import ClaimInfo from './ClaimInfo';
import { useNavigate } from 'react-router';

export default function PageNavigation() {
	const navigate = useNavigate();
	const checklist = useChecklistSlice((state) => state.checklist)!;
	const claim = useChecklistSlice((state) => state.claim);
	const user = useGlobalSlice((state) => state.user);
	const showChecklistData = useStore(selectors.showChecklistData);
	const maxPageInstancePosition = useChecklistSlice((state) => state.maxPageInstancePosition);
	const showStatsDialog = useChecklistSlice((state) => state.showStatsDialog);
	const mode = useChecklistSlice((state) => state.mode);
	const expandAll = useChecklistSlice((state) => state.expandAll);
	const visibleInstanceIds = useChecklistSlice((state) => state.visibleInstanceIds);
	const tree = useChecklistSlice((state) => state.tree);
	let filteredTree =
		mode === ChecklistMode.VIEW ? tree.filter((c) => visibleInstanceIds.includes(c.instanceId)) : tree;

	const { mutateAsync: addPage, isPending: adding } = useAddPage(checklist.id);
	const { isFetching, refetch } = usePageInstanceTree(!tree.length, checklist.id, claim?.id);

	const getTitle = () => {
		return claim ? <ClaimInfo /> : <Typography color="secondary">{checklist?.name ?? ''}</Typography>;
	};

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
		<>
			<Paper style={styles.container}>
				<Toolbar
					left={getTitle()}
					right={
						<Fade
							in={mode === ChecklistMode.EDIT || (mode === ChecklistMode.VIEW && !!checklist && !!claim)}
						>
							<span>
								{mode === ChecklistMode.EDIT ? (
									<BasicButton
										buttonProps={{
											onClick: () => onAddPage().catch((e) => console.error(e)),
											disabled: isFetching || adding,
											variant: 'contained',
											sx: styles.button,
											color: 'secondary',
											startIcon: <Add sx={{ color: 'white' }} />,
										}}
									>
										New Page
									</BasicButton>
								) : (
									<BasicButton
										buttonProps={{
											onClick: () => {
												navigate(`/checklist/${checklist?.id}/claim/${claim?.id}/summary`);
											},
											variant: 'contained',
											sx: styles.button,
											color: 'secondary',
											endIcon: <ArrowForward sx={{ color: 'white' }} />,
										}}
									>
										Summary
									</BasicButton>
								)}
							</span>
						</Fade>
					}
					leftWidth="70%"
					rightWidth="30%"
					padding={0}
					height={35}
				/>
				<Toolbar
					left={
						<>
							{user.roles.includes(config.ROLES.ADMIN) ? (
								<ToggleButtonGroup
									color="primary"
									value={mode}
									exclusive
									onChange={(_, value) => {
										actions.updateMode(value);
										if (value === ChecklistMode.VIEW) refetch().catch((e) => console.error(e));
									}}
								>
									<ToggleButton value={ChecklistMode.VIEW} sx={styles.toggleButton}>
										<Visibility
											sx={{
												...styles.icon,
												color: mode === ChecklistMode.VIEW ? 'primary.main' : '#787878',
											}}
										/>
										View
									</ToggleButton>
									<ToggleButton value={ChecklistMode.TEST} sx={styles.toggleButton}>
										<MovieCreationOutlined
											sx={{
												...styles.icon,
												color: mode === ChecklistMode.TEST ? 'primary.main' : '#787878',
											}}
										/>
										Test
									</ToggleButton>
									<ToggleButton value={ChecklistMode.EDIT} sx={styles.toggleButton}>
										<MovieEdit
											sx={{
												...styles.icon,
												color: mode === ChecklistMode.EDIT ? 'primary.main' : '#787878',
											}}
										/>
										Edit
									</ToggleButton>
								</ToggleButtonGroup>
							) : (
								<></>
							)}
						</>
					}
					right={
						<BasicButton
							buttonProps={{
								onClick: actions.toggleExpandAll,
								sx: { height: 25 },
							}}
						>
							{expandAll ? 'Collase' : 'Expand'} All
						</BasicButton>
					}
					padding={0}
					height={35}
				/>
				<Divider />
				<div style={styles.nodeContainer}>
					<Collapse in={showChecklistData && !isFetching} unmountOnExit style={styles.nodeContainerInner}>
						<span>
							{filteredTree.map((node) => (
								<TreeNode key={node.instanceId} level={0} {...node} />
							))}
						</span>
					</Collapse>
				</div>
			</Paper>
			{showStatsDialog && <QuestionStatsDialog />}
		</>
	);
}

const styles = {
	button: {
		height: 25,
		marginLeft: '15px',
		minWidth: 120,
	},
	checklistCard: {
		backgroundColor: 'white',
		padding: '2px 5px',
	},
	container: {
		width: 'fit-content',
		minWidth: 500,
		maxWidth: 500,
		height: 'calc(100vh - 60px)',
		backgroundColor: OFFWHITE_COLOR,
		padding: 10,
		overflow: 'hidden',
	},
	icon: {
		marginRight: '5px',
	},
	nodeContainer: {
		width: '100%',
		height: 'calc(100% - 75px)',
		overflow: 'auto',
	},
	nodeContainerInner: {
		width: '100%',
		height: '100%',
	},
	toggleButton: {
		height: 25,
	},
};
