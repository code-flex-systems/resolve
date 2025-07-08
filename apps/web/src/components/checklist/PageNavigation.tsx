'use client';
import { Collapse, Divider, Fade, Paper, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Add, ArrowForward, MovieCreationOutlined, MovieEdit, Visibility } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { OFFWHITE_COLOR } from '@/styles/theme';
import { useChecklistSlice, useGlobalSlice } from '@/state/store';
import * as actions from '@/state/checklist/actions';
import Toolbar from '../common/Toolbar';
import TreeNode from './TreeNode';
import BasicButton from '../common/BasicButton';
import { ChecklistMode } from '@/config/enums';
import QuestionStatsDialog from './QuestionStatsDialog';
import config from '@/config/config';
import ClaimInfo from './ClaimInfo';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';

export default function PageNavigation() {
	const router = useRouter();
	const { checklistId = -1, claimId } = useChecklistParams();
	const user = useGlobalSlice((state) => state.user);
	const showStatsDialog = useChecklistSlice((state) => state.showStatsDialog);
	const mode = useChecklistSlice((state) => state.mode);
	const expandAll = useChecklistSlice((state) => state.expandAll);

	const { data: checklist } = useChecklistTrpc().get({ id: checklistId! }, { enabled: checklistId !== -1 });
	const { data: claim } = useClaimTrpc().get(
		{ checklistId, claimId: claimId! },
		{ enabled: checklistId !== -1 && !!claimId }
	);
	const {
		data: navigation = { tree: [], maxPosition: 0 },
		isFetching,
		refetch,
	} = usePageTrpc().getInstanceTree(
		{
			checklistId,
			claimId,
		},
		{
			enabled: checklistId !== -1,
			select: (data = { tree: [], maxPosition: 0 }) => {
				return {
					maxPosition: data.maxPosition,
					tree:
						mode === ChecklistMode.VIEW && !!visibleInstanceIds.length
							? data.tree.filter((c) => visibleInstanceIds.includes(c.instanceId))
							: data.tree,
				};
			},
		}
	);
	const { mutateAsync: addPage, isPending: adding } = usePageTrpc().createTemplate;
	const { data: visibleInstanceIds = [] } = usePageTrpc().listVisibleInstances(
		{ checklistId, claimId: claimId! },
		{ enabled: checklistId !== -1 && !!claimId }
	);

	const getTitle = () => {
		return claim ? <ClaimInfo /> : <Typography color="secondary">{checklist?.name ?? ''}</Typography>;
	};

	const onAddPage = async () => {
		try {
			const newInstance = await addPage({
				checklistId,
				params: {
					parentId: -1,
					title: 'New Page',
					position: navigation.maxPosition + 1,
				},
			});
			if (newInstance) actions.updateSelectedPage(newInstance.instance_id);
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
											onClick: () =>
												router.push(`/checklist/${checklistId}/claim/${claimId}/summary`),
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
					height={40}
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
					padding={'0px 0px 5px'}
					height={40}
				/>
				<Divider />
				<div style={styles.nodeContainer}>
					<Collapse in={!!checklist && !isFetching && (!claimId || !!claim)} unmountOnExit timeout={1000}>
						{navigation.tree.map((node) => (
							<TreeNode key={node.instanceId} level={0} {...node} />
						))}
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
		borderRadius: 0,
	},
	icon: {
		marginRight: '5px',
	},
	nodeContainer: {
		width: '100%',
		height: 'calc(100% - 75px)',
		overflow: 'auto',
		paddingTop: 10,
	},
	toggleButton: {
		height: 25,
	},
};
