'use client';

import { useState } from 'react';
import {
	Box,
	Typography,
	Chip,
	Skeleton,
	Button,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	List,
	ListItem,
	ListItemText,
} from '@mui/material';
import { containerStyles, TEXT_PRIMARY, TEXT_SECONDARY } from '@/styles/theme';
import SuggestionCard from './SuggestionCard';
import SuggestionDetailDialog from './SuggestionDetailDialog';
import { WorkflowSuggestionsResult, useWorkflowAnalyticsTrpc } from '@/hooks/trpc/useWorkflowAnalyticsTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import PeopleIcon from '@mui/icons-material/People';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
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
		<Box
			sx={{
				mb: 3,
				p: 2,
				borderRadius: 2,
				backgroundColor: '#f8fafc',
				border: '1px solid #e2e8f0',
			}}
		>
			<Skeleton variant="text" width={200} sx={{ fontSize: 13, mb: 1.5 }} />
			<Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
				<Skeleton variant="rounded" width={110} height={24} />
				<Skeleton variant="rounded" width={135} height={24} />
				<Skeleton variant="rounded" width={100} height={24} />
				<Skeleton variant="rounded" width={125} height={24} />
			</Box>
		</Box>
	);
}

function CardSkeleton() {
	return (
		<Box
			sx={{
				...containerStyles.beveledCard,
				p: 2.5,
				display: 'flex',
				alignItems: 'flex-start',
				gap: 2,
			}}
		>
			<Skeleton variant="rounded" width={44} height={44} sx={{ borderRadius: '10px', flexShrink: 0 }} />
			<Box sx={{ flex: 1 }}>
				<Skeleton variant="text" width="70%" sx={{ fontSize: 15, mb: 0.5 }} />
				<Skeleton variant="text" width="50%" sx={{ fontSize: 13, mb: 1 }} />
				<Skeleton variant="text" width="40%" sx={{ fontSize: 13, mb: 0.5 }} />
				<Skeleton variant="text" width="30%" sx={{ fontSize: 13 }} />
			</Box>
		</Box>
	);
}

/**
 * SuggestionsPanel - Displays workflow suggestions with assignment recommendations
 * Shows breach resolutions ordered by priority (algorithm output order)
 */
export default function SuggestionsPanel({ data, isFetching, refetch }: SuggestionsPanelProps) {
	const [selectedResolution, setSelectedResolution] = useState<Resolution | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [executeAllDialogOpen, setExecuteAllDialogOpen] = useState(false);
	const [hiddenSuggestionIds, setHiddenSuggestionIds] = useState<Set<string>>(new Set());

	const showAlert = useAlertStore((state) => state.showAlert);
	const { executeSuggestion, executeAllSuggestions, updateSuggestion } = useWorkflowAnalyticsTrpc();

	// Combine all busy states for disabling interactions
	const isBusy =
		isFetching ||
		executeSuggestion.isPending ||
		executeAllSuggestions.isPending ||
		updateSuggestion.isPending;

	// Safe destructure with defaults for when data is undefined (initial load)
	const resolutions = data?.resolutions ?? [];

	// Filter out hidden suggestions client-side
	// Note: Ignored suggestions are NOT filtered out - they come from the API response
	const visibleResolutions = resolutions.filter(
		(res) => !res.suggestionId || !hiddenSuggestionIds.has(res.suggestionId)
	);

	// Separate pending (actionable) from ignored resolutions
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
					// Update local state to hide the suggestion (no refetch)
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
					// Refresh to get new suggestions (ignored one will appear from database)
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
					// Refresh to get updated suggestions
					refetch();
					handleDialogClose();
				},
				onError: (error) => {
					showAlert(error.message || 'Failed to restore suggestion', 'error');
				},
			}
		);
	};

	// No data and not fetching — nothing to render
	if (!data && !isFetching) {
		return null;
	}

	// No breaches detected (and not currently fetching new data)
	if (!isFetching && data && data.breachesDetected === 0) {
		return (
			<Box sx={{ ...containerStyles.beveledCard, p: 3 }}>
				<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
					<Typography
						sx={{
							fontSize: 17,
							fontWeight: 600,
							color: TEXT_PRIMARY,
						}}
					>
						Suggested Actions
					</Typography>
					<Chip label="0 recommendations" size="small" sx={{ backgroundColor: '#f1f5f9', fontWeight: 500 }} />
				</Box>
				<Typography sx={{ fontSize: 14, color: TEXT_SECONDARY, textAlign: 'center', py: 4 }}>
					All desk locations are within capacity. No bottlenecks detected.
				</Typography>
			</Box>
		);
	}

	// Calculate how many resolutions to show initially (limit to 3)
	const displayedResolutions = visibleResolutions.slice(0, 3);
	const hasMore = visibleResolutions.length > 3;

	return (
		<Box sx={{ ...containerStyles.beveledCard, p: 3 }}>
			{/* Header */}
			<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
					<Typography
						sx={{
							fontSize: 17,
							fontWeight: 600,
							color: TEXT_PRIMARY,
						}}
					>
						Suggested Actions
					</Typography>
					{!data ? (
						<Skeleton variant="rounded" width={130} height={24} />
					) : (
						<Chip
							label={`${visibleResolutions.length} recommendation${visibleResolutions.length !== 1 ? 's' : ''}`}
							size="small"
							sx={{ backgroundColor: '#f1f5f9', fontWeight: 500 }}
						/>
					)}
				</Box>
				<Box sx={{ display: 'flex', gap: 1 }}>
					<Button
						size="small"
						startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
						onClick={refetch}
						disabled={isBusy}
						sx={{ textTransform: 'none', fontWeight: 500, fontSize: 13 }}
					>
						Recalculate
					</Button>
					{pendingResolutions.length > 0 && (
						<Button
							size="small"
							variant="contained"
							color="success"
							startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}
							onClick={() => setExecuteAllDialogOpen(true)}
							disabled={isBusy}
							sx={{ textTransform: 'none', fontWeight: 500, fontSize: 13 }}
						>
							Execute All
						</Button>
					)}
				</Box>
			</Box>

			{/* Analysis Summary */}
			{isFetching ? (
				<SummarySkeleton />
			) : data && (
				<Box
					sx={{
						mb: 3,
						p: 2,
						borderRadius: 2,
						backgroundColor: '#f8fafc',
						border: '1px solid #e2e8f0',
					}}
				>
					{/* Last Analysis Time */}
					<Typography sx={{ fontSize: 13, color: TEXT_SECONDARY, mb: 1.5 }}>
						Last analysis: {new Date(data.generatedAt).toLocaleString()}
					</Typography>

					{/* Status Chips */}
					<Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
						<Chip
							label={`${data.breachesFullyResolved} fully resolved`}
							size="small"
							sx={{
								backgroundColor: '#dcfce7',
								color: '#15803d',
								fontWeight: 500,
								fontSize: 12,
							}}
						/>
						<Chip
							label={`${data.breachesPartiallyResolved} partially resolved`}
							size="small"
							sx={{
								backgroundColor: '#fef3c7',
								color: '#92400e',
								fontWeight: 500,
								fontSize: 12,
							}}
						/>
						<Chip
							label={`${data.summary.totalUnresolved} unresolved`}
							size="small"
							sx={{
								backgroundColor: '#fee2e2',
								color: '#991b1b',
								fontWeight: 500,
								fontSize: 12,
							}}
						/>
						<Chip
							label={`${data.summary.totalAssignments} total assignment${data.summary.totalAssignments !== 1 ? 's' : ''}`}
							size="small"
							sx={{
								backgroundColor: '#e0f2fe',
								color: '#075985',
								fontWeight: 500,
								fontSize: 12,
							}}
						/>
					</Box>
				</Box>
			)}

			{/* Suggestions list */}
			<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
				{isFetching ? (
					<>
						<CardSkeleton />
						<CardSkeleton />
						<CardSkeleton />
					</>
				) : (
					displayedResolutions.map((resolution, index) => {
						const { breach, assignments, shortfall, usersNeeded, status } = resolution;

						// Check if this is an ignored suggestion
						const isIgnored = status === SuggestionStatus.IGNORED;

						// Calculate reduction percentage based on users assigned vs users needed
						const reductionPercent = usersNeeded > 0 ? Math.round((assignments.length / usersNeeded) * 100) : 0;

						// Determine if fully resolved
						const isFullyResolved = shortfall === 0;

						// Build user assignment details
						const userNames = assignments.map((a) => a.userName).slice(0, 2);
						const assignmentText =
							assignments.length === 1
								? userNames[0]
								: assignments.length === 2
									? `${userNames[0]} and ${userNames[1]}`
									: `${userNames[0]}, ${userNames[1]}, and ${assignments.length - 2} other${assignments.length > 3 ? 's' : ''}`;

						// Get severity colors
						const severityColors = getSeverityColor(breach.severity);

						return (
							<Box
								key={`${breach.deskLocationId}-${index}`}
								sx={{
									position: 'relative',
									opacity: isIgnored ? 0.6 : 1,
								}}
							>
								{isIgnored && (
									<Chip
										label="IGNORED"
										size="small"
										sx={{
											position: 'absolute',
											bottom: 12,
											right: 12,
											zIndex: 1,
											backgroundColor: '#f1f5f9',
											color: '#64748b',
											fontSize: 10,
											fontWeight: 700,
											height: 20,
										}}
									/>
								)}
								<SuggestionCard
									icon={<PeopleIcon />}
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
											label={getSeverityLabel(breach.severity)}
											size="small"
											sx={{
												backgroundColor: severityColors.bg,
												color: severityColors.color,
												fontSize: 11,
												fontWeight: 600,
												height: 22,
											}}
										/>
									}
									onClick={isBusy ? undefined : () => handleSuggestionClick(resolution)}
								/>
							</Box>
						);
					})
				)}
			</Box>

			{/* Show allocation failures if any */}
			{!isFetching && data && data.summary.totalUnresolved > 0 && (
				<Box
					sx={{
						mt: 2,
						p: 2,
						borderRadius: 2,
						backgroundColor: 'rgba(245, 158, 11, 0.08)',
						border: '1px solid rgba(245, 158, 11, 0.2)',
						display: 'flex',
						gap: 1.5,
					}}
				>
					<WarningAmberIcon sx={{ fontSize: 20, color: '#f59e0b', flexShrink: 0, mt: 0.25 }} />
					<Box>
						<Typography sx={{ fontSize: 13, fontWeight: 600, color: '#b45309', mb: 0.5 }}>
							Team Capacity Strain
						</Typography>
						<Typography sx={{ fontSize: 13, color: '#92400e' }}>
							{data.summary.totalUnresolved} breach{data.summary.totalUnresolved !== 1 ? 'es' : ''} could not be fully
							resolved due to limited team availability. Consider adjusting workload or capacity thresholds.
						</Typography>
					</Box>
				</Box>
			)}

			{/* View all link */}
			{!isFetching && hasMore && (
				<Box sx={{ textAlign: 'center', mt: 2.5 }}>
					<Button size="small" disabled={isBusy} sx={{ textTransform: 'none', fontWeight: 600 }}>
						View All Actions
					</Button>
				</Box>
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
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>
					Execute All Suggestions
				</DialogTitle>
				<DialogContent>
					<Typography sx={{ fontSize: 14, color: TEXT_SECONDARY, mb: 2 }}>
						The following {pendingResolutions.length} suggestion{pendingResolutions.length !== 1 ? 's' : ''} will
						be executed, applying priority changes to user desk assignments:
					</Typography>
					<List dense disablePadding>
						{pendingResolutions.map((res, idx) => (
							<ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
								<ListItemText
									primary={`${res.breach.deskLocationTypeName} - ${res.breach.deskLocationName}`}
									secondary={`${res.assignments.length} user${res.assignments.length !== 1 ? 's' : ''} reassigned`}
									primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
									secondaryTypographyProps={{ fontSize: 12 }}
								/>
							</ListItem>
						))}
					</List>
					{visibleResolutions.some((r) => r.status === SuggestionStatus.IGNORED) && (
						<Typography sx={{ fontSize: 13, color: '#92400e', mt: 1.5, fontStyle: 'italic' }}>
							Ignored suggestions will not be executed.
						</Typography>
					)}
				</DialogContent>
				<DialogActions sx={{ px: 3, py: 2 }}>
					<Button
						onClick={() => setExecuteAllDialogOpen(false)}
						disabled={executeAllSuggestions.isPending}
						sx={{ textTransform: 'none' }}
					>
						Cancel
					</Button>
					<Button
						onClick={handleExecuteAll}
						variant="contained"
						color="success"
						disabled={executeAllSuggestions.isPending}
						sx={{ textTransform: 'none' }}
					>
						{executeAllSuggestions.isPending ? 'Executing...' : `Execute ${pendingResolutions.length} Suggestion${pendingResolutions.length !== 1 ? 's' : ''}`}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
