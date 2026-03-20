'use client';

import { IconAlertTriangle, IconPlayerPlay, IconRefresh, IconUsers } from '@tabler/icons-react';
import Skeleton from '@/components/ui/Skeleton';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import { useState } from 'react';
import Card from '@/components/ui/Card';
import SuggestionCard from './SuggestionCard';
import SuggestionDetailDialog from './SuggestionDetailDialog';
import { WorkflowSuggestionsResult, useWorkflowAnalyticsTrpc } from '@/hooks/trpc/useWorkflowAnalyticsTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import { getSeverityLabel, getSeverityColor } from '@/lib/workflow/suggestions';
import { SuggestionStatus } from '@/config/enums';

type Resolution = NonNullable<WorkflowSuggestionsResult>['resolutions'][number];

interface SuggestionsPanelProps {
	data: WorkflowSuggestionsResult | undefined;
	isFetching: boolean;
	refetch: () => void;
}

function SummarySkeleton() {
	return (
		<div
			style={{
				marginBottom: 24,
				padding: 16,
				borderRadius: 8,
				backgroundColor: 'var(--bg-secondary)',
				border: '1px solid var(--border)',
			}}
		>
			<Skeleton variant="text" width={200} height={13} />
			<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
				<Skeleton variant="rect" width={110} height={24} />
				<Skeleton variant="rect" width={135} height={24} />
				<Skeleton variant="rect" width={100} height={24} />
				<Skeleton variant="rect" width={125} height={24} />
			</div>
		</div>
	);
}

function CardSkeleton() {
	return (
		<Card
			variant="beveled"
			padding="md"
			style={{
				display: 'flex',
				alignItems: 'flex-start',
				gap: 16,
			}}
		>
			<Skeleton variant="rect" width={44} height={44} />
			<div style={{ flex: 1 }}>
				<Skeleton variant="text" width="70%" height={15} />
				<Skeleton variant="text" width="50%" height={13} />
				<Skeleton variant="text" width="40%" height={13} />
				<Skeleton variant="text" width="30%" height={13} />
			</div>
		</Card>
	);
}

export default function SuggestionsPanel({ data, isFetching, refetch }: SuggestionsPanelProps) {
	const [selectedResolution, setSelectedResolution] = useState<Resolution | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [executeAllDialogOpen, setExecuteAllDialogOpen] = useState(false);
	const [hiddenSuggestionIds, setHiddenSuggestionIds] = useState<Set<string>>(new Set());

	const showAlert = useAlertStore((state) => state.showAlert);
	const { executeSuggestion, executeAllSuggestions, updateSuggestion } = useWorkflowAnalyticsTrpc();

	const isBusy =
		isFetching ||
		executeSuggestion.isPending ||
		executeAllSuggestions.isPending ||
		updateSuggestion.isPending;

	const resolutions = data?.resolutions ?? [];

	const visibleResolutions = resolutions.filter(
		(res) => !res.suggestionId || !hiddenSuggestionIds.has(res.suggestionId)
	);

	const pendingResolutions = visibleResolutions.filter(
		(res) => res.status !== SuggestionStatus.IGNORED && res.suggestionId
	);

	const handleSuggestionClick = (resolution: Resolution) => {
		if (isBusy) return;
		setSelectedResolution(resolution);
		setDialogOpen(true);
	};

	const handleDialogClose = () => {
		setDialogOpen(false);
		setSelectedResolution(null);
	};

	const handleExecute = () => {
		if (!selectedResolution?.suggestionId) return;
		executeSuggestion.mutate(
			{ suggestionId: selectedResolution.suggestionId },
			{
				onSuccess: () => {
					showAlert('Suggestion executed successfully', 'success');
					refetch();
					handleDialogClose();
				},
				onError: (error) => {
					showAlert(error.message || 'Failed to execute suggestion', 'error');
				},
			}
		);
	};

	const handleExecuteAll = () => {
		executeAllSuggestions.mutate(undefined, {
			onSuccess: (result) => {
				showAlert(
					`${result.executed} suggestion${result.executed !== 1 ? 's' : ''} executed successfully`,
					'success'
				);
				refetch();
				setExecuteAllDialogOpen(false);
			},
			onError: (error) => {
				showAlert(error.message || 'Failed to execute suggestions', 'error');
			},
		});
	};

	const handleHide = () => {
		if (!selectedResolution?.suggestionId) return;
		updateSuggestion.mutate(
			{ suggestionId: selectedResolution.suggestionId, status: SuggestionStatus.HIDDEN },
			{
				onSuccess: () => {
					setHiddenSuggestionIds((prev) => new Set(prev).add(selectedResolution.suggestionId!));
					handleDialogClose();
				},
				onError: (error) => {
					showAlert(error.message || 'Failed to hide suggestion', 'error');
				},
			}
		);
	};

	const handleIgnore = () => {
		if (!selectedResolution?.suggestionId) return;
		updateSuggestion.mutate(
			{ suggestionId: selectedResolution.suggestionId, status: SuggestionStatus.IGNORED },
			{
				onSuccess: () => {
					refetch();
					handleDialogClose();
				},
				onError: (error) => {
					showAlert(error.message || 'Failed to ignore suggestion', 'error');
				},
			}
		);
	};

	const handleRestore = () => {
		if (!selectedResolution?.suggestionId) return;
		updateSuggestion.mutate(
			{ suggestionId: selectedResolution.suggestionId, status: SuggestionStatus.PENDING },
			{
				onSuccess: () => {
					refetch();
					handleDialogClose();
				},
				onError: (error) => {
					showAlert(error.message || 'Failed to restore suggestion', 'error');
				},
			}
		);
	};

	if (!data && !isFetching) {
		return null;
	}

	if (!isFetching && data && data.breachesDetected === 0) {
		return (
			<Card variant="beveled" padding="lg">
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
					<span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
						Suggested Actions
					</span>
					<Chip size="sm">0 recommendations</Chip>
				</div>
				<p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: '32px 0' }}>
					All desk locations are within capacity. No bottlenecks detected.
				</p>
			</Card>
		);
	}

	const displayedResolutions = visibleResolutions.slice(0, 3);
	const hasMore = visibleResolutions.length > 3;

	const executeAllFooter = (
		<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
			<Button
				onClick={() => setExecuteAllDialogOpen(false)}
				variant="text"
				disabled={executeAllSuggestions.isPending}
			>
				Cancel
			</Button>
			<Button
				onClick={handleExecuteAll}
				variant="contained"
				color="success"
				disabled={executeAllSuggestions.isPending}
			>
				{executeAllSuggestions.isPending ? 'Executing...' : `Execute ${pendingResolutions.length} Suggestion${pendingResolutions.length !== 1 ? 's' : ''}`}
			</Button>
		</div>
	);

	return (
		<Card variant="beveled" padding="lg">
			{/* Header */}
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
					<span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
						Suggested Actions
					</span>
					{!data ? (
						<Skeleton variant="rect" width={130} height={24} />
					) : (
						<Chip size="sm">
							{visibleResolutions.length} recommendation{visibleResolutions.length !== 1 ? 's' : ''}
						</Chip>
					)}
				</div>
				<div style={{ display: 'flex', gap: 8 }}>
					<Button
						size="sm"
						variant="text"
						startIcon={<IconRefresh size={16} />}
						onClick={refetch}
						disabled={isBusy}
					>
						Recalculate
					</Button>
					{pendingResolutions.length > 0 && (
						<Button
							size="sm"
							variant="contained"
							color="success"
							startIcon={<IconPlayerPlay size={16} />}
							onClick={() => setExecuteAllDialogOpen(true)}
							disabled={isBusy}
						>
							Execute All
						</Button>
					)}
				</div>
			</div>

			{/* Analysis Summary */}
			{isFetching ? (
				<SummarySkeleton />
			) : data && (
				<div
					style={{
						marginBottom: 24,
						padding: 16,
						borderRadius: 8,
						backgroundColor: 'var(--bg-secondary)',
						border: '1px solid var(--border)',
					}}
				>
					<span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 12 }}>
						Last analysis: {new Date(data.generatedAt).toLocaleString()}
					</span>
					<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
						<Chip size="sm" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
							{data.breachesFullyResolved} fully resolved
						</Chip>
						<Chip size="sm" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
							{data.breachesPartiallyResolved} partially resolved
						</Chip>
						<Chip size="sm" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
							{data.summary.totalUnresolved} unresolved
						</Chip>
						<Chip size="sm" style={{ backgroundColor: '#e0f2fe', color: '#075985' }}>
							{data.summary.totalAssignments} total assignment{data.summary.totalAssignments !== 1 ? 's' : ''}
						</Chip>
					</div>
				</div>
			)}

			{/* Suggestions list */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				{isFetching ? (
					<>
						<CardSkeleton />
						<CardSkeleton />
						<CardSkeleton />
					</>
				) : (
					displayedResolutions.map((resolution, index) => {
						const { breach, assignments, shortfall, usersNeeded, status } = resolution;
						const isIgnored = status === SuggestionStatus.IGNORED;
						const reductionPercent = usersNeeded > 0 ? Math.round((assignments.length / usersNeeded) * 100) : 0;
						const isFullyResolved = shortfall === 0;

						const userNames = assignments.map((a) => a.userName).slice(0, 2);
						const assignmentText =
							assignments.length === 1
								? userNames[0]
								: assignments.length === 2
									? `${userNames[0]} and ${userNames[1]}`
									: `${userNames[0]}, ${userNames[1]}, and ${assignments.length - 2} other${assignments.length > 3 ? 's' : ''}`;

						const severityColors = getSeverityColor(breach.severity);

						return (
							<div
								key={`${breach.deskLocationId}-${index}`}
								style={{
									position: 'relative',
									opacity: isIgnored ? 0.6 : 1,
								}}
							>
								{isIgnored && (
									<Chip
										size="sm"
										style={{
											position: 'absolute',
											bottom: 12,
											right: 12,
											zIndex: 1,
											backgroundColor: '#f1f5f9',
											color: 'var(--text-secondary)',
											fontSize: 10,
											fontWeight: 700,
											height: 20,
										}}
									>
										IGNORED
									</Chip>
								)}
								<SuggestionCard
									icon={<IconUsers size={20} />}
									title={`Reassign ${assignments.length} user${assignments.length !== 1 ? 's' : ''} to ${breach.deskLocationTypeName} - ${breach.deskLocationName}`}
									subtitle={`${breach.excessUnits} excess work units • ${usersNeeded} user${usersNeeded !== 1 ? 's' : ''} needed`}
									benefit={
										isFullyResolved
											? 'Resolve bottleneck'
											: `Reduce bottleneck by ${reductionPercent}% (${assignments.length}/${usersNeeded} assigned)`
									}
									details={assignments.length > 0 ? assignmentText : 'No available users'}
									severityChip={
										<Chip
											size="sm"
											style={{
												backgroundColor: severityColors.bg,
												color: severityColors.color,
												fontSize: 11,
												fontWeight: 600,
												height: 22,
											}}
										>
											{getSeverityLabel(breach.severity)}
										</Chip>
									}
									onClick={isBusy ? undefined : () => handleSuggestionClick(resolution)}
								/>
							</div>
						);
					})
				)}
			</div>

			{/* Allocation failures warning */}
			{!isFetching && data && data.summary.totalUnresolved > 0 && (
				<div
					style={{
						marginTop: 16,
						padding: 16,
						borderRadius: 8,
						backgroundColor: 'rgba(245, 158, 11, 0.08)',
						border: '1px solid rgba(245, 158, 11, 0.2)',
						display: 'flex',
						gap: 12,
					}}
				>
					<IconAlertTriangle size={20} style={{ color: 'var(--status-warning)', flexShrink: 0, marginTop: 2 }} />
					<div>
						<span style={{ fontSize: 13, fontWeight: 600, color: '#b45309', display: 'block', marginBottom: 4 }}>
							Team Capacity Strain
						</span>
						<span style={{ fontSize: 13, color: '#92400e' }}>
							{data.summary.totalUnresolved} breach{data.summary.totalUnresolved !== 1 ? 'es' : ''} could not be fully
							resolved due to limited team availability. Consider adjusting workload or capacity thresholds.
						</span>
					</div>
				</div>
			)}

			{/* View all link */}
			{!isFetching && hasMore && (
				<div style={{ textAlign: 'center', marginTop: 20 }}>
					<Button size="sm" variant="text" disabled={isBusy}>
						View All Actions
					</Button>
				</div>
			)}

			{/* Suggestion Detail Dialog */}
			<SuggestionDetailDialog
				open={dialogOpen}
				onClose={handleDialogClose}
				resolution={selectedResolution}
				onExecute={handleExecute}
				onHide={handleHide}
				onIgnore={handleIgnore}
				onRestore={handleRestore}
				isBusy={isBusy}
			/>

			{/* Execute All Confirmation Dialog */}
			<Dialog
				open={executeAllDialogOpen}
				onClose={() => !executeAllSuggestions.isPending && setExecuteAllDialogOpen(false)}
				title="Execute All Suggestions"
				size="md"
				footer={executeAllFooter}
			>
				<p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
					The following {pendingResolutions.length} suggestion{pendingResolutions.length !== 1 ? 's' : ''} will
					be executed, applying priority changes to user desk assignments:
				</p>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
					{pendingResolutions.map((res, idx) => (
						<div key={idx} style={{ padding: '4px 0' }}>
							<span style={{ fontSize: 13, fontWeight: 500, display: 'block' }}>
								{res.breach.deskLocationTypeName} - {res.breach.deskLocationName}
							</span>
							<span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
								{res.assignments.length} user{res.assignments.length !== 1 ? 's' : ''} reassigned
							</span>
						</div>
					))}
				</div>
				{visibleResolutions.some((r) => r.status === SuggestionStatus.IGNORED) && (
					<p style={{ fontSize: 13, color: '#92400e', marginTop: 12, fontStyle: 'italic' }}>
						Ignored suggestions will not be executed.
					</p>
				)}
			</Dialog>
		</Card>
	);
}
