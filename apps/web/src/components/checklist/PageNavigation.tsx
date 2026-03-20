'use client';
import {
	Badge,
	badgeClasses,
	Box,
	Paper,
	Stack,
	SvgIcon,
	ToggleButton,
	ToggleButtonGroup,
	Typography, Fade } from '@mui/material';
import { useRouter } from 'next/navigation';
import { BG_TERTIARY, BORDER_COLOR, BORDER_LIGHT, TEXT_MUTED, TEXT_SECONDARY } from '@/styles/theme';
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
import ClaimStatusIcon from './ClaimStatusIcon';
import ChecklistComments from './ChecklistComments';
import ChecklistChangeLog from './ChecklistChangeLog';
import { useCommentTrpc } from '@/hooks/trpc/useCommentTrpc';
import { useChecklistDeepLink } from '@/hooks/useChecklistDeepLink';
import { useEffect } from 'react';
import Legend from './Legend';
import { useCrudAlerts } from '@/hooks/useCrudAlerts';
import { IconChecklist, IconClock, IconEye, IconMessage, IconMovie, IconMovieOff, IconPlus } from '@tabler/icons-react';
import Collapse from '@/components/ui/Collapse';
import Divider from '@/components/ui/Divider';

const COMMENT_LIMIT = 30;

function ExpandAllButton({ expandAll, disabled }: { expandAll: boolean; disabled: boolean }) {
	return (
		<BasicButtonStyled
			buttonProps={{
				onClick: () => useChecklistStore.getState().toggleExpandAll(),
				disabled,
			}}
			icon={
				<SvgIcon sx={{ color: TEXT_SECONDARY }}>
					{expandAll ? (
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
							<title>collapse-all</title>
							<path
								fill="currentColor"
								d="M14,4H4V14H2V4A2,2 0 0,1 4,2H14V4M18,6H8A2,2 0 0,0 6,8V18H8V8H18V6M22,12V20A2,2 0 0,1 20,22H12A2,2 0 0,1 10,20V12A2,2 0 0,1 12,10H20A2,2 0 0,1 22,12M20,15H12V17H20V15Z"
							/>
						</svg>
					) : (
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
							<title>expand-all</title>
							<path
								fill="currentColor"
								d="M18,8H8V18H6V8A2,2 0 0,1 8,6H18V8M14,2H4A2,2 0 0,0 2,4V14H4V4H14V2M22,12V20A2,2 0 0,1 20,22H12A2,2 0 0,1 10,20V12A2,2 0 0,1 12,10H20A2,2 0 0,1 22,12M20,15H17V12H15V15H12V17H15V20H17V17H20V15Z"
							/>
						</svg>
					)}
				</SvgIcon>
			}
			tooltipProps={{ title: expandAll ? 'Collapse all' : 'Expand all' }}
			compact
		/>
	);
}

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
	const toggleComments = useChecklistStore((state) => state.toggleComments);
	const toggleChangeLog = useChecklistStore((state) => state.toggleChangeLog);
	const { showSuccess, showError } = useCrudAlerts('page');

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
		refetch: refetchTree,
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

	useEffect(() => {
		useChecklistStore.getState().updateMode(!claimId && isAdmin ? ChecklistMode.TEST : ChecklistMode.VIEW);
	}, [isAdmin, claimId]);

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
			if (newInstance) {
				const { data: freshData } = await refetchTree();
				useChecklistStore.getState().updateSelectedPage(newInstance.instance_id);
				if (freshData) {
					useChecklistStore.getState().updateSelectedPageInfoSearch(newInstance.instance_id, freshData.tree);
				}
				showSuccess('create', 'Page created');
			}
		} catch (e) {
			showError('create', e, 'Failed to create page');
		}
	};

	return (
		<>
			<Paper elevation={2} sx={{ borderRadius: 0 }} style={styles.container}>
				<>
					<Toolbar
						left={
							<>
								<IconChecklist size={20} />
								<Typography variant="h6" ml={0.5} mr={2}>
									{checklist?.name}
								</Typography>
							</>
						}
						right={
							isAdmin || isSuperAdmin ? (
								<ToggleButtonGroup
									color="secondary"
									sx={styles.toggleButtonGroup}
									value={mode}
									exclusive
									onChange={(_, value) => {
										useChecklistStore.getState().updateMode(value);
										if (value === ChecklistMode.VIEW) {
											refetchTree().catch((e: any) => console.error(e));
										} else {
											if (showComments) toggleComments();
											if (showChangeLog) toggleChangeLog();
										}
									}}
								>
									{!!claimId && (
										<ToggleButton value={ChecklistMode.VIEW} sx={styles.toggleButton}>
											<IconEye
											 style={{
													...styles.icon,
													color:
														mode === ChecklistMode.VIEW
															? 'secondary.main'
															: TEXT_MUTED,
												}}
											/>
											View
										</ToggleButton>
									)}
									<ToggleButton value={ChecklistMode.TEST} sx={styles.toggleButton}>
										<IconMovie
										 style={{
												...styles.icon,
												color:
													mode === ChecklistMode.TEST
														? 'secondary.main'
														: TEXT_MUTED,
											}}
										/>
										Test
									</ToggleButton>
									<ToggleButton value={ChecklistMode.EDIT} sx={styles.toggleButton}>
										<IconMovieOff
										 style={{
												...styles.icon,
												color:
													mode === ChecklistMode.EDIT
														? 'secondary.main'
														: TEXT_MUTED,
											}}
										/>
										Edit
									</ToggleButton>
								</ToggleButtonGroup>
							) : undefined
						}
						padding={0}
						height={36}
					/>
					<Divider />
				</>
				<Toolbar
					left={
						<Fade in={!!claim}>
							<span>
								<ClaimInfo />
							</span>
						</Fade>
					}
					right={
						<Fade
							in={mode === ChecklistMode.EDIT || (mode === ChecklistMode.VIEW && !!checklist && !!claim)}
						>
							<span>
								{mode === ChecklistMode.EDIT && (
									<BasicButtonStyled
										buttonProps={{
											onClick: () => onAddPage().catch((e) => console.error(e)),
											disabled: isFetching || adding,
											startIcon: <IconPlus size={20} />,
										}}
									>
										New Page
									</BasicButtonStyled>
								)}
								{mode === ChecklistMode.VIEW && !!checklist && !!claim && (
									<>
										<BasicButtonStyled
											buttonProps={{
												onClick: () =>
													router.push(`/checklist/${checklistId}/claim/${claimId}/summary`),
												startIcon: (
													<SvgIcon>
														<svg
															fill={'var(--text-accent)'}
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
										{!isFetchingChecklistClaim && (
											<BasicButtonStyled
												buttonProps={{
													onClick: () =>
														useChecklistStore
															.getState()
															.toggleChecklistProgressDialog(true),
													startIcon: (
														<ClaimStatusIcon
															status={
																(checklistClaim?.status ??
																	ClaimStatus.UNWORKED) as ClaimStatus
															}
														/>
													),
													sx: { ml: 1 },
												}}
												tooltipProps={{ title: 'Evaluate' }}
											>
												Evaluate
											</BasicButtonStyled>
										)}
									</>
								)}
							</span>
						</Fade>
					}
					rightWidth="100%"
					padding={0}
					height={36}
				/>

				<Box mt={1} sx={styles.nodeContainer}>
					<Box display="flex" justifyContent="space-between" alignItems="center" pb={2}>
						<Box display="flex" alignItems="center">
							<ExpandAllButton expandAll={expandAll} disabled={visibleInstanceIds.length < 2} />
							<Fade in={mode === ChecklistMode.VIEW && !!claimId}>
								<Box display="flex" justifyContent="flex-start" alignItems="center" gap={1} ml={1}>
									<BasicButtonStyled
										buttonProps={{
											onClick: () => useChecklistStore.getState().toggleChangeLog(),
										}}
										icon={
											<IconClock size={20} style={{ color: showChangeLog ? 'var(--text-accent)' : undefined, }}
											/>
										}
										tooltipProps={{
											title: `${showChangeLog ? 'Hide' : 'Show'} change log`,
										}}
										compact
									/>
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
												<IconMessage size={20} style={{ color: showComments ? 'var(--text-accent)' : undefined, }}
												/>
											}
											tooltipProps={{ title: `${showComments ? 'Hide' : 'Show'} comments` }}
											compact
										/>
									</Badge>
								</Box>
							</Fade>
						</Box>
						<Legend />
					</Box>
					<Fade in={!!checklist && !isFetching && (!claimId || !!claim)} unmountOnExit timeout={500}>
						<span>
							{navigation.tree.length ? (
								navigation.tree.map((node) => <TreeNode key={node.instanceId} level={0} {...node} />)
							) : (
								<Stack
									display="flex"
									width="100%"
									height="100%"
									justifyContent="center"
									alignItems="center"
								>
									<Typography color={TEXT_MUTED} fontSize={18}>
										No pages found
									</Typography>
								</Stack>
							)}
						</span>
					</Fade>
				</Box>
				<Collapse open={showComments}>
					<ChecklistComments tree={navigation.tree} />
				</Collapse>
				<Collapse open={showChangeLog}>
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
			fontSize: 'var(--font-size-xs)',
		},
	},
	button: {
		height: 25,
		ml: 2,
		minWidth: 120,
	},
	checklistCard: {
		bgcolor: 'var(--bg-white)',
		p: 0.5,
		px: 1,
	},
	container: {
		width: 'fit-content',
		minWidth: 500,
		maxWidth: 500,
		height: '100vh',
		backgroundColor: BG_TERTIARY,
		padding: 12,
		overflow: 'hidden',
		display: 'flex',
		flex: 1,
		flexDirection: 'column' as const,
		borderRight: `1px solid ${BORDER_COLOR}`,
		borderTop: 'none',
		borderBottom: 'none',
		borderLeft: 'none',
	},
	icon: {
		mr: 0.5,
	},
	nodeContainer: {
		width: '100%',
		overflow: 'auto',
		p: 1.5,
		bgcolor: 'var(--bg-white)',
		borderRadius: 2,
		flex: 1,
		mb: 1,
	},
	toggleButtonGroup: {
		bgcolor: 'var(--bg-white)',
		borderRadius: 'var(--radius-lg)',
	},
	toggleButton: {
		height: 28,
		px: 1.5,
		fontSize: 'var(--font-size-sm)',
		borderRadius: 'var(--radius-md)',
		textTransform: 'none' as const,
	},
};
