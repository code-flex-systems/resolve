'use client';
import {
	Badge,
	badgeClasses,
	Box,
	Collapse,
	Divider,
	Fade,
	Paper,
	SvgIcon,
	ToggleButton,
	ToggleButtonGroup,
} from '@mui/material';
import { AccessTime, Add, MovieCreationOutlined, MovieEdit, SmsOutlined, Visibility } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import theme, { BASE_COLOR } from '@/styles/theme';
import { useChecklistStore } from '@/stores/useChecklistStore';
import Toolbar from '../common/Toolbar';
import TreeNode from './TreeNode';
import { ChecklistMode, ClaimStatus } from '@/config/enums';
import QuestionStatsDialog from './QuestionStatsDialog';
import ClaimInfo from './ClaimInfo';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';
import BasicButtonStyled from '../common/BasicButtonStyled';
import ChecklistInfo from './ChecklistInfo';
import ClaimStatusIcon from './ClaimStatusIcon';
import ChecklistComments from './ChecklistComments';
import ChecklistChangeLog from './ChecklistChangeLog';
import { useCommentTrpc } from '@/hooks/trpc/useCommentTrpc';
import { useChecklistDeepLink } from '@/hooks/useChecklistDeepLink';

const COMMENT_LIMIT = 30;

export default function PageNavigation() {
	const router = useRouter();
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const { checklistId = -1, claimId } = useChecklistParams();
	const showStatsDialog = useChecklistStore((state) => state.showStatsDialog);
	const mode = useChecklistStore((state) => state.mode);
	const expandAll = useChecklistStore((state) => state.expandAll);
	const showChangeLog = useChecklistStore((state) => state.showChangeLog);
	const showComments = useChecklistStore((state) => state.showComments);
	const commentOffset = useChecklistStore((state) => state.commentOffset);

	const { data: checklist, isSuccess: isChSuccess } = useChecklistTrpc().get(
		{ id: checklistId! },
		{ enabled: checklistId !== -1 }
	);
	const { data: claim, isSuccess: isClSuccess } = useClaimTrpc().get(
		{ checklistId, claimId: claimId! },
		{ enabled: checklistId !== -1 && !!claimId }
	);
	const { data: checklistClaim, isFetching: isFetchingChecklistClaim } = useChecklistTrpc().getForClaim(
		{ checklistId, claimId: claimId! },
		{ enabled: checklistId !== -1 && !!claimId }
	);

	const { mutateAsync: addPage, isPending: adding } = usePageTrpc().createTemplate;
	const { data: visibleInstanceIds = [] } = usePageTrpc().listVisibleInstances(
		{ checklistId, claimId: claimId! },
		{ enabled: checklistId !== -1 && !!claimId }
	);
	const {
		data: navigation = { tree: [], maxPosition: 0 },
		isFetching,
		refetch,
		isSuccess: isNavSuccess,
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
	const { data: commentData } = useCommentTrpc().list(
		{ filters: { checklistId, claimId }, limit: COMMENT_LIMIT, offset: commentOffset },
		{ enabled: checklistId !== -1 && !!claimId }
	);

	useChecklistDeepLink(isChSuccess && isClSuccess && isNavSuccess);

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
			if (newInstance) useChecklistStore.getState().updateSelectedPage(newInstance.instance_id);
		} catch (e) {
			console.error(e);
		}
	};

	return (
		<>
			<Paper elevation={2} sx={{ borderRadius: 0 }} style={styles.container}>
				{(isAdmin || isSuperAdmin) && (
					<>
						<Toolbar
							left={
								<ToggleButtonGroup
									color="secondary"
									sx={{ bgcolor: 'white', borderRadius: 2 }}
									value={mode}
									exclusive
									onChange={(_, value) => {
										useChecklistStore.getState().updateMode(value);
										if (value === ChecklistMode.VIEW) refetch().catch((e) => console.error(e));
									}}
								>
									<ToggleButton value={ChecklistMode.VIEW} sx={styles.toggleButton}>
										<Visibility
											sx={{
												...styles.icon,
												color: mode === ChecklistMode.VIEW ? 'secondary.main' : '#787878',
											}}
										/>
										View
									</ToggleButton>
									<ToggleButton
										value={ChecklistMode.TEST}
										sx={{ ...styles.toggleButton, padding: '0px 12.5px' }}
									>
										<MovieCreationOutlined
											sx={{
												...styles.icon,
												color: mode === ChecklistMode.TEST ? 'secondary.main' : '#787878',
											}}
										/>
										Test
									</ToggleButton>
									<ToggleButton value={ChecklistMode.EDIT} sx={styles.toggleButton}>
										<MovieEdit
											sx={{
												...styles.icon,
												color: mode === ChecklistMode.EDIT ? 'secondary.main' : '#787878',
											}}
										/>
										Edit
									</ToggleButton>
								</ToggleButtonGroup>
							}
							padding={0}
							height={40}
						/>
						<Divider flexItem sx={{ margin: '2.5px 0px 2.5px' }} />
					</>
				)}
				<Toolbar
					left={
						<>
							<ClaimInfo />
							<ChecklistInfo />
						</>
					}
					right={
						<Fade
							in={mode === ChecklistMode.EDIT || (mode === ChecklistMode.VIEW && !!checklist && !!claim)}
						>
							<span>
								{mode === ChecklistMode.EDIT ? (
									<BasicButtonStyled
										buttonProps={{
											onClick: () => onAddPage().catch((e) => console.error(e)),
											disabled: isFetching || adding,
											startIcon: <Add />,
										}}
									>
										New Page
									</BasicButtonStyled>
								) : (
									<BasicButtonStyled
										buttonProps={{
											onClick: () =>
												router.push(`/checklist/${checklistId}/claim/${claimId}/summary`),
											startIcon: (
												<SvgIcon>
													<svg
														fill={theme.palette.secondary.main}
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 24 24"
													>
														<title>chart-donut-variant</title>
														<path d="M13,2.05C18.05,2.55 22,6.82 22,12C22,13.45 21.68,14.83 21.12,16.07L18.5,14.54C18.82,13.75 19,12.9 19,12C19,8.47 16.39,5.57 13,5.08V2.05M12,19C14.21,19 16.17,18 17.45,16.38L20.05,17.91C18.23,20.39 15.3,22 12,22C6.47,22 2,17.5 2,12C2,6.81 5.94,2.55 11,2.05V5.08C7.61,5.57 5,8.47 5,12A7,7 0 0,0 12,19M12,6A6,6 0 0,1 18,12C18,14.97 15.84,17.44 13,17.92V14.83C14.17,14.42 15,13.31 15,12A3,3 0 0,0 12,9L11.45,9.05L9.91,6.38C10.56,6.13 11.26,6 12,6M6,12C6,10.14 6.85,8.5 8.18,7.38L9.72,10.05C9.27,10.57 9,11.26 9,12C9,13.31 9.83,14.42 11,14.83V17.92C8.16,17.44 6,14.97 6,12Z" />
													</svg>
												</SvgIcon>
											),
										}}
										tooltipProps={{ title: 'Q/A Summary' }}
									>
										Q/A Summary
									</BasicButtonStyled>
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
							<Box marginRight="5px">
								<BasicButtonStyled
									buttonProps={{
										onClick: () => useChecklistStore.getState().toggleExpandAll(),
										disabled: visibleInstanceIds.length < 2,
									}}
									icon={
										<SvgIcon>
											{expandAll ? (
												<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
													<title>collapse-all</title>
													<path
														fill={BASE_COLOR}
														d="M14,4H4V14H2V4A2,2 0 0,1 4,2H14V4M18,6H8A2,2 0 0,0 6,8V18H8V8H18V6M22,12V20A2,2 0 0,1 20,22H12A2,2 0 0,1 10,20V12A2,2 0 0,1 12,10H20A2,2 0 0,1 22,12M20,15H12V17H20V15Z"
													/>
												</svg>
											) : (
												<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
													<title>expand-all</title>
													<path
														fill={BASE_COLOR}
														d="M18,8H8V18H6V8A2,2 0 0,1 8,6H18V8M14,2H4A2,2 0 0,0 2,4V14H4V4H14V2M22,12V20A2,2 0 0,1 20,22H12A2,2 0 0,1 10,20V12A2,2 0 0,1 12,10H20A2,2 0 0,1 22,12M20,15H17V12H15V15H12V17H15V20H17V17H20V15Z"
													/>
												</svg>
											)}
										</SvgIcon>
									}
									tooltipProps={{ title: expandAll ? 'Collapse all' : 'Expand all' }}
								/>
							</Box>
							<Fade in={mode === ChecklistMode.VIEW}>
								<Box display="flex" justifyContent="flex-start" alignItems="center">
									<Box marginRight="5px">
										<BasicButtonStyled
											buttonProps={{
												onClick: () => useChecklistStore.getState().toggleChangeLog(),
											}}
											icon={
												<AccessTime
													sx={{
														color: showChangeLog ? theme.palette.primary.main : undefined,
													}}
												/>
											}
											tooltipProps={{ title: `${showChangeLog ? 'Hide' : 'Show'} change log` }}
										/>
									</Box>
									<Badge
										badgeContent={commentData?.count ?? 0}
										color="secondary"
										showZero={false}
										sx={styles.badge}
									>
										<BasicButtonStyled
											buttonProps={{
												onClick: () => useChecklistStore.getState().toggleComments(),
											}}
											icon={
												<SmsOutlined
													sx={{
														color: showComments ? theme.palette.secondary.main : undefined,
													}}
												/>
											}
											tooltipProps={{ title: `${showComments ? 'Hide' : 'Show'} comments` }}
										/>
									</Badge>
								</Box>
							</Fade>
						</>
					}
					right={
						<>
							<Fade in={!isFetchingChecklistClaim && mode === ChecklistMode.VIEW}>
								<span>
									<BasicButtonStyled
										buttonProps={{
											onClick: () => useChecklistStore.getState().toggleChecklistProgressDialog(true),
											startIcon: (
												<ClaimStatusIcon
													status={
														(checklistClaim?.status ?? ClaimStatus.UNWORKED) as ClaimStatus
													}
												/>
											),
										}}
										tooltipProps={{ title: 'Evaluate' }}
									>
										Evaluate
									</BasicButtonStyled>
								</span>
							</Fade>
						</>
					}
					padding={'0px 0px 5px'}
					height={40}
				/>
				<Divider />
				<div style={styles.nodeContainer}>
					<Fade in={!!checklist && !isFetching && (!claimId || !!claim)} unmountOnExit timeout={500}>
						<span>
							{navigation.tree.map((node) => (
								<TreeNode key={node.instanceId} level={0} {...node} />
							))}
						</span>
					</Fade>
				</div>
				<Collapse in={showComments} unmountOnExit>
					<ChecklistComments tree={navigation.tree} />
				</Collapse>
				<Collapse in={showChangeLog} unmountOnExit>
					<ChecklistChangeLog />
				</Collapse>
			</Paper>
			{showStatsDialog && <QuestionStatsDialog />}
		</>
	);
}

const styles = {
	badge: {
		[`& .${badgeClasses.badge}`]: {
			top: 5,
			right: -2,
			fontSize: 10,
		},
	},
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
		height: '100vh',
		backgroundColor: '#F7F8FA',
		padding: 10,
		overflow: 'hidden',
		display: 'flex',
		flex: 1,
		flexDirection: 'column' as const,
	},
	icon: {
		marginRight: '5px',
	},
	nodeContainer: {
		width: '100%',
		overflow: 'auto',
		margin: '10px 0px',
		padding: '10px',
		backgroundColor: 'white',
		flex: 1,
	},
	toggleButton: {
		height: 29,
		borderRadius: 2,
	},
};
