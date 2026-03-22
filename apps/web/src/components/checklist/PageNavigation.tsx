'use client';
import { useRouter } from 'next/navigation';
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
import Badge from '@/components/ui/Badge';

const COMMENT_LIMIT = 30;

function ExpandAllButton({ expandAll, disabled }: { expandAll: boolean; disabled: boolean }) {
	return (
		<BasicButtonStyled
			buttonProps={{
				onClick: () => useChecklistStore.getState().toggleExpandAll(),
				disabled,
			}}
			icon={
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={24} height={24} style={{ color: 'var(--text-secondary)' }}>
					{expandAll ? (
						<>
							<title>collapse-all</title>
							<path
								fill="currentColor"
								d="M14,4H4V14H2V4A2,2 0 0,1 4,2H14V4M18,6H8A2,2 0 0,0 6,8V18H8V8H18V6M22,12V20A2,2 0 0,1 20,22H12A2,2 0 0,1 10,20V12A2,2 0 0,1 12,10H20A2,2 0 0,1 22,12M20,15H12V17H20V15Z"
							/>
						</>
					) : (
						<>
							<title>expand-all</title>
							<path
								fill="currentColor"
								d="M18,8H8V18H6V8A2,2 0 0,1 8,6H18V8M14,2H4A2,2 0 0,0 2,4V14H4V4H14V2M22,12V20A2,2 0 0,1 20,22H12A2,2 0 0,1 10,20V12A2,2 0 0,1 12,10H20A2,2 0 0,1 22,12M20,15H17V12H15V15H12V17H15V20H17V17H20V15Z"
							/>
						</>
					)}
				</svg>
			}
			tooltipProps={{ title: expandAll ? 'Collapse all' : 'Expand all' }}
			compact
		/>
	);
}

function ToggleGroup({ value, options, onChange }: { value: ChecklistMode; options: { value: ChecklistMode; label: string; icon: React.ReactNode; hidden?: boolean }[]; onChange: (value: ChecklistMode) => void }) {
	return (
		<div style={{ display: 'inline-flex', backgroundColor: 'var(--bg-white)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
			{options.filter(o => !o.hidden).map((option) => (
				<button
					key={option.value}
					type="button"
					onClick={() => onChange(option.value)}
					style={{
						height: 28,
						padding: '0 12px',
						fontSize: 'var(--font-size-sm)',
						border: 'none',
						borderRadius: 'var(--radius-md)',
						textTransform: 'none',
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						gap: 4,
						backgroundColor: value === option.value ? 'var(--bg-tertiary)' : 'transparent',
						color: value === option.value ? 'var(--text-primary)' : 'var(--text-muted)',
						fontWeight: value === option.value ? 600 : 400,
					}}
				>
					{option.icon}
					{option.label}
				</button>
			))}
		</div>
	);
}

export default function PageNavigation() {
	const router = useRouter();
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const { checklistId = '', claimId } = useChecklistParams();
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
		{ enabled: !!checklistId }
	);
	const { data: claim, isSuccess: isClSuccess } = useClaimTrpc().get(
		{ checklistId, claimId: claimId! },
		{ enabled: !!checklistId && !!claimId }
	);
	const { data: checklistClaim, isFetching: isFetchingChecklistClaim } = useChecklistTrpc().getForClaim(
		{ checklistId, claimId: claimId! },
		{ enabled: !!checklistId && !!claimId }
	);

	const { mutateAsync: addPage, isPending: adding } = usePageTrpc().createTemplate;
	const { data: visibleInstanceIds = [] } = usePageTrpc().listVisibleInstances(
		{ checklistId, claimId: claimId! },
		{ enabled: !!checklistId && !!claimId }
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
			enabled: !!checklistId,
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
		{ enabled: !!checklistId && !!claimId }
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
					parentId: undefined,
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

	const handleModeChange = (value: ChecklistMode) => {
		useChecklistStore.getState().updateMode(value);
		if (value === ChecklistMode.VIEW) {
			refetchTree().catch((e: any) => console.error(e));
		} else {
			if (showComments) toggleComments();
			if (showChangeLog) toggleChangeLog();
		}
	};

	return (
		<>
			<div style={containerStyle}>
				<>
					<Toolbar
						left={
							<>
								<IconChecklist size={20} />
								<span style={{ fontSize: 18, fontWeight: 600, marginLeft: 4, marginRight: 16 }}>
									{checklist?.name}
								</span>
							</>
						}
						right={
							isAdmin || isSuperAdmin ? (
								<ToggleGroup
									value={mode}
									onChange={handleModeChange}
									options={[
										{
											value: ChecklistMode.VIEW,
											label: 'View',
											icon: <IconEye size={16} style={{ marginRight: 4, color: mode === ChecklistMode.VIEW ? 'var(--text-accent)' : 'var(--text-muted)' }} />,
											hidden: !claimId,
										},
										{
											value: ChecklistMode.TEST,
											label: 'Test',
											icon: <IconMovie size={16} style={{ marginRight: 4, color: mode === ChecklistMode.TEST ? 'var(--text-accent)' : 'var(--text-muted)' }} />,
										},
										{
											value: ChecklistMode.EDIT,
											label: 'Edit',
											icon: <IconMovieOff size={16} style={{ marginRight: 4, color: mode === ChecklistMode.EDIT ? 'var(--text-accent)' : 'var(--text-muted)' }} />,
										},
									]}
								/>
							) : undefined
						}
						padding={0}
						height={36}
					/>
					<Divider />
				</>
				<Toolbar
					left={
						!!claim ? (
							<span>
								<ClaimInfo />
							</span>
						) : undefined
					}
					right={
						(mode === ChecklistMode.EDIT || (mode === ChecklistMode.VIEW && !!checklist && !!claim)) ? (
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
													<svg
														fill={'var(--text-accent)'}
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 24 24"
														width={24}
														height={24}
													>
														<title>chart-donut-variant</title>
														<path d="M13,2.05C18.05,2.55 22,6.82 22,12C22,13.45 21.68,14.83 21.12,16.07L18.5,14.54C18.82,13.75 19,12.9 19,12C19,8.47 16.39,5.57 13,5.08V2.05M12,19C14.21,19 16.17,18 17.45,16.38L20.05,17.91C18.23,20.39 15.3,22 12,22C6.47,22 2,17.5 2,12C2,6.81 5.94,2.55 11,2.05V5.08C7.61,5.57 5,8.47 5,12A7,7 0 0,0 12,19M12,6A6,6 0 0,1 18,12C18,14.97 15.84,17.44 13,17.92V14.83C14.17,14.42 15,13.31 15,12A3,3 0 0,0 12,9L11.45,9.05L9.91,6.38C10.56,6.13 11.26,6 12,6M6,12C6,10.14 6.85,8.5 8.18,7.38L9.72,10.05C9.27,10.57 9,11.26 9,12C9,13.31 9.83,14.42 11,14.83V17.92C8.16,17.44 6,14.97 6,12Z" />
													</svg>
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
												}}
												tooltipProps={{ title: 'Evaluate' }}
											>
												Evaluate
											</BasicButtonStyled>
										)}
									</>
								)}
							</span>
						) : undefined
					}
					rightWidth="100%"
					padding={0}
					height={36}
				/>

				<div style={{ marginTop: 8, width: '100%', overflow: 'auto', padding: 12, backgroundColor: 'var(--bg-white)', borderRadius: 8, flex: 1, marginBottom: 8 }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16 }}>
						<div style={{ display: 'flex', alignItems: 'center' }}>
							<ExpandAllButton expandAll={expandAll} disabled={visibleInstanceIds.length < 2} />
							{mode === ChecklistMode.VIEW && !!claimId && (
								<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8, marginLeft: 8 }}>
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
									<Badge content={(commentData?.count ?? 0) || undefined} color="primary">
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
								</div>
							)}
						</div>
						<Legend />
					</div>
					{!!checklist && !isFetching && (!claimId || !!claim) && (
						<span>
							{navigation.tree.length ? (
								navigation.tree.map((node) => <TreeNode key={node.instanceId} level={0} {...node} />)
							) : (
								<div
									style={{
										display: 'flex',
										width: '100%',
										height: '100%',
										justifyContent: 'center',
										alignItems: 'center',
									}}
								>
									<span style={{ color: 'var(--text-muted)', fontSize: 18 }}>
										No pages found
									</span>
								</div>
							)}
						</span>
					)}
				</div>
				<Collapse open={showComments}>
					<ChecklistComments tree={navigation.tree} />
				</Collapse>
				<Collapse open={showChangeLog}>
					<ChecklistChangeLog />
				</Collapse>
			</div>
			{showStatsDialog && <QuestionStatsDialog />}
		</>
	);
}

const containerStyle: React.CSSProperties = {
	width: 'fit-content',
	minWidth: 500,
	maxWidth: 500,
	height: '100vh',
	backgroundColor: 'var(--bg-secondary)',
	padding: 12,
	overflow: 'hidden',
	display: 'flex',
	flex: 1,
	flexDirection: 'column',
	borderRight: '1px solid var(--border-strong)',
};
