'use client';

import { Box, Button, CardContent, Chip, Divider, Fade, Paper, Skeleton, Stack, Typography } from '@mui/material';
import OpenInNew from '@mui/icons-material/OpenInNew';
import ChecklistRtl from '@mui/icons-material/ChecklistRtl';
import Edit from '@mui/icons-material/Edit';
import Shield from '@mui/icons-material/Shield';
import PlaylistAddCheck from '@mui/icons-material/PlaylistAddCheck';
import Groups from '@mui/icons-material/Groups';
import Task from '@mui/icons-material/Task';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Link from 'next/link';
import { BASE_COLOR_LIGHT, containerStyles } from '@/styles/theme';
import { trpc } from '@/lib/trpc';
import { useAdminLogsTrpc } from '@/hooks/trpc/useAdminLogsTrpc';
import ChecklistProgress from '@/components/checklist/ChecklistProgress';
import Highlight from '@/components/common/Highlight';
import { formatMDY } from '@/lib/utils/utils';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import ClaimStatusChip from '@/components/common/ClaimStatusChip';
import { usePathname, useRouter } from 'next/navigation';
import { LineOfBusinessChip, LossTypeChip } from '@/components/common/ReferenceDataSelect';
import { formatCityState } from '@/schemas/addressSchemas';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';

dayjs.extend(relativeTime);

interface ClaimSummaryProps {
	claimId: number;
	onStartChecklist?: () => void;
	showChecklistProgress?: boolean;
}

export default function ClaimSummary({ claimId, onStartChecklist, showChecklistProgress = true }: ClaimSummaryProps) {
	const router = useRouter();
	const pathname = usePathname();
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const canEditClaim = isAdmin || isSuperAdmin;
	const { data: claimDetail, isLoading: claimLoading } = trpc.claim.getClaimDetail.useQuery(
		{ claimId },
		{ enabled: !!claimId }
	);
	const { listByClaim } = useAdminLogsTrpc();
	const { data: adminLogs = [], isLoading: logsLoading } = listByClaim({ claimId, limit: 5 }, { enabled: !!claimId });

	const getViewRoute = () => {
		return pathname.startsWith('/admin') && (isAdmin || isSuperAdmin)
			? `/admin/claims/${claimId}`
			: `/my-claims/${claimId}`;
	};

	const handleViewFullDetails = () => {
		if (claimId) router.push(getViewRoute());
	};

	const handleOpenInChecklist = () => {
		const mostRecentAssignment = claimDetail?.checklistAssignments?.[0];
		if (mostRecentAssignment) {
			router.push(`/checklist/${mostRecentAssignment.checklist_id}/claim/${claimId}`);
		}
	};

	const handleEditClaim = () => {
		if (claimId) {
			router.push(
				pathname.startsWith('/admin') && (isAdmin || isSuperAdmin)
					? `/admin/claims/edit/${claimId}`
					: `/my-claims/edit/${claimId}`
			);
		}
	};

	// Get the most recently accessed checklist assignment
	const currentAssignment = claimDetail?.checklistAssignments?.[0] ?? null;

	if (claimLoading) {
		return (
			<Stack spacing={2}>
				<Skeleton variant="rectangular" height={60} />
				<Skeleton variant="rectangular" height={150} />
				<Skeleton variant="rectangular" height={200} />
			</Stack>
		);
	}

	if (!claimDetail) {
		return (
			<Typography fontSize={13} color={BASE_COLOR_LIGHT} fontStyle="italic">
				Claim not found
			</Typography>
		);
	}

	return (
		<Fade in={true}>
			<Box display="flex" flexDirection="column" minHeight="100%" maxHeight="100%">
				{/* Scrollable Content */}
				<Box
					flex={1}
					overflow="auto"
					sx={{
						'&::-webkit-scrollbar': {
							width: '8px',
						},
						'&::-webkit-scrollbar-track': {
							background: '#f1f1f1',
							borderRadius: '4px',
						},
						'&::-webkit-scrollbar-thumb': {
							background: '#888',
							borderRadius: '4px',
						},
						'&::-webkit-scrollbar-thumb:hover': {
							background: '#555',
						},
					}}
				>
					<Stack spacing={2} mr={1}>
						{/* Header with status badges */}
						<Box display="flex" flexWrap="wrap" gap={1}>
							{claimDetail.line_of_business && (
								<LineOfBusinessChip value={claimDetail.line_of_business} />
							)}
							{claimDetail.aggregated_loss_type &&
								claimDetail.aggregated_loss_type.length > 0 &&
								claimDetail.aggregated_loss_type.map((lt: string) => (
									<LossTypeChip key={lt} value={lt} />
								))}
							<ClaimStatusChip
								recoveryStatus={claimDetail.recovery_status}
								substatus={claimDetail.substatus}
							/>
						</Box>

						{/* Key Metrics Card */}
						<Paper elevation={0} sx={styles.gradientPaper}>
							<Typography variant="h5" color="primary" marginBottom="10px">
								{claimDetail.claim_number}
							</Typography>
							<Box display="flex" justifyContent="space-between" alignItems="flex-start">
								<CardContent sx={{ width: '50%', p: 1, '&:last-child': { pb: 1 } }}>
									<Typography color={BASE_COLOR_LIGHT} fontSize={13} gutterBottom>
										Claim Amount
									</Typography>
									<Typography variant="h6" fontSize={16}>
										{formatCurrencyExact(Number(claimDetail.claim_amount) || 0)}
									</Typography>
								</CardContent>
								<CardContent sx={{ width: '50%', p: 1, '&:last-child': { pb: 1 } }}>
									<Typography color={BASE_COLOR_LIGHT} fontSize={13} gutterBottom>
										Total Incurred
									</Typography>
									<Typography variant="h6" fontSize={16}>
										{formatCurrencyExact(Number(claimDetail.total_incurred) || 0)}
									</Typography>
								</CardContent>
							</Box>
							<Box display="flex" justifyContent="space-between" alignItems="flex-start">
								<CardContent sx={{ width: '50%', p: 1, '&:last-child': { pb: 1 } }}>
									<Typography color={BASE_COLOR_LIGHT} fontSize={13} gutterBottom>
										Expected Recovery
									</Typography>
									<Typography variant="h6" fontSize={16}>
										{formatCurrencyExact(Number(claimDetail.expected_recovery) || 0)}
									</Typography>
								</CardContent>
								<CardContent sx={{ width: '50%', p: 1, '&:last-child': { pb: 1 } }}>
									<Typography color={BASE_COLOR_LIGHT} fontSize={13} gutterBottom>
										Actual Recovery
									</Typography>
									<Typography variant="h6" fontSize={16}>
										{formatCurrencyExact(Number(claimDetail.actual_recovery) || 0)}
									</Typography>
								</CardContent>
							</Box>
						</Paper>

						{/* Quick Summary: Coverage, Parties, Tasks */}
						<Paper elevation={0} sx={styles.beveledPaper}>
							<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginBottom="10px">
								Quick Summary
							</Typography>
							<Stack spacing={1.5}>
								{/* Coverage Summary - shows count of coverages and Entity parties */}
								<Box display="flex" alignItems="center" gap={1}>
									<Shield sx={{ fontSize: 18, color: BASE_COLOR_LIGHT }} />
									<Typography fontSize={13}>
										<Highlight bold={false}>Coverage:</Highlight>{' '}
										{claimDetail.coverageSummary.count === 0 ? (
											<Box component="span" fontStyle="italic" color={BASE_COLOR_LIGHT}>
												None entered
											</Box>
										) : (
											<>
												{claimDetail.coverageSummary.count} coverage
												{claimDetail.coverageSummary.count === 1 ? '' : 's'} from{' '}
												{claimDetail.coverageSummary.partyCount} part
												{claimDetail.coverageSummary.partyCount === 1 ? 'y' : 'ies'}
											</>
										)}
									</Typography>
								</Box>

								{/* Liability Summary - shows total liability % from entity parties */}
								<Box display="flex" alignItems="center" gap={1}>
									<Groups sx={{ fontSize: 18, color: BASE_COLOR_LIGHT }} />
									<Typography fontSize={13} display="flex">
										<Highlight bold={false}>Liability:</Highlight>{' '}
										{claimDetail.partySummary.count === 0 ? (
											<Box component="span" fontStyle="italic" color={BASE_COLOR_LIGHT} ml={0.5}>
												None linked
											</Box>
										) : (
											<Box display="flex" alignItems="center" gap={1} ml={0.5}>
												{claimDetail.partySummary.totalLiability}% from{' '}
												{claimDetail.partySummary.count} part
												{claimDetail.partySummary.count === 1 ? 'y' : 'ies'}
												{claimDetail.partySummary.totalLiability === 100 && (
													<CheckCircle
														sx={{
															fontSize: 14,
															color: 'success.main',
														}}
													/>
												)}
											</Box>
										)}
									</Typography>
								</Box>

								{/* Task Summary */}
								<Box display="flex" alignItems="center" gap={1}>
									<Task sx={{ fontSize: 18, color: BASE_COLOR_LIGHT }} />
									<Typography fontSize={13}>
										<Highlight bold={false}>Tasks:</Highlight>{' '}
										{(() => {
											const totalTasks =
												claimDetail.taskSummary.completed +
												claimDetail.taskSummary.in_progress +
												claimDetail.taskSummary.pending;
											return totalTasks === 0 ? (
												<Box component="span" fontStyle="italic" color={BASE_COLOR_LIGHT}>
													None created
												</Box>
											) : (
												<Link
													href={`${getViewRoute()}?tab=workflow`}
													style={{ textDecoration: 'none' }}
												>
													<Box
														component="span"
														sx={{
															color: 'primary.main',
															'&:hover': {
																textDecoration: 'underline',
															},
														}}
													>
														{claimDetail.taskSummary.completed > 0 && (
															<>{claimDetail.taskSummary.completed} completed</>
														)}
														{claimDetail.taskSummary.completed > 0 &&
															claimDetail.taskSummary.in_progress > 0 &&
															', '}
														{claimDetail.taskSummary.in_progress > 0 && (
															<>{claimDetail.taskSummary.in_progress} in progress</>
														)}
														{(claimDetail.taskSummary.completed > 0 ||
															claimDetail.taskSummary.in_progress > 0) &&
															claimDetail.taskSummary.pending > 0 &&
															', '}
														{claimDetail.taskSummary.pending > 0 && (
															<>{claimDetail.taskSummary.pending} pending</>
														)}
													</Box>
												</Link>
											);
										})()}
									</Typography>
								</Box>
							</Stack>
						</Paper>

						{/* Checklist Progress (if applicable) */}
						{showChecklistProgress && currentAssignment && (
							<Paper elevation={0} sx={styles.beveledPaper}>
								<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginBottom="10px">
									Progress through {currentAssignment.checklist_name}
								</Typography>
								<Box display="flex" justifyContent="center" paddingY="15px">
									<ChecklistProgress
										checklistId={currentAssignment.checklist_id}
										claimId={claimId}
										width={250}
										fontSize={14}
										showInfo={false}
									/>
								</Box>
								<Box display="flex" justifyContent="center" paddingTop="10px">
									<Button
										variant="outlined"
										startIcon={<ChecklistRtl />}
										onClick={handleOpenInChecklist}
										fullWidth
									>
										Open in Checklist
									</Button>
								</Box>
							</Paper>
						)}

						{/* Contextual Info */}
						<Paper elevation={0} sx={styles.beveledPaper}>
							<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginBottom="10px">
								Information
							</Typography>
							<Stack spacing={1.5}>
								{currentAssignment && (
									<Typography fontSize={13}>
										Assigned to{' '}
										<Highlight>
											{currentAssignment.assignee_first_name}{' '}
											{currentAssignment.assignee_last_name}
										</Highlight>{' '}
										working through <Highlight>{currentAssignment.checklist_name}</Highlight>
									</Typography>
								)}
								{!currentAssignment && (
									<Box>
										<Typography
											fontSize={13}
											color={BASE_COLOR_LIGHT}
											fontStyle="italic"
											marginBottom="10px"
										>
											Not currently assigned to a checklist
										</Typography>
										{onStartChecklist && (
											<Button
												variant="outlined"
												startIcon={<PlaylistAddCheck />}
												onClick={onStartChecklist}
												size="small"
												fullWidth
												color="success"
											>
												Start a Checklist
											</Button>
										)}
									</Box>
								)}
								<Divider />
								<Typography fontSize={13}>
									<Highlight bold={false}>Insured:</Highlight> {claimDetail.insured ?? 'N/A'}
								</Typography>
								<Typography fontSize={13}>
									<Highlight bold={false}>Client Adjuster:</Highlight>{' '}
									{claimDetail.client_adjuster_first && claimDetail.client_adjuster_last
										? `${claimDetail.client_adjuster_first} ${claimDetail.client_adjuster_last}`
										: (claimDetail.client_adjuster ?? 'N/A')}
								</Typography>
								<Typography fontSize={13}>
									<Highlight bold={false}>Date of Loss:</Highlight>{' '}
									{claimDetail.date_of_loss ? formatMDY(claimDetail.date_of_loss?.toString()) : 'N/A'}
								</Typography>
								<Typography fontSize={13}>
									<Highlight bold={false}>Loss Location:</Highlight>{' '}
									{formatCityState(claimDetail.loss_city, claimDetail.loss_state) || 'N/A'}
								</Typography>
								{claimDetail.feed_name && (
									<>
										<Divider />
										<Typography fontSize={12} color={BASE_COLOR_LIGHT} fontStyle="italic">
											Ingested from{' '}
											<Box component="span" fontWeight={600}>
												{claimDetail.feed_name}
											</Box>
										</Typography>
									</>
								)}
							</Stack>
						</Paper>

						{/* Recent Activity */}
						<Paper elevation={0} sx={styles.beveledPaper}>
							<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginBottom="10px">
								Recent Activity
							</Typography>
							{logsLoading && (
								<Stack spacing={1}>
									<Skeleton variant="text" />
									<Skeleton variant="text" />
									<Skeleton variant="text" />
								</Stack>
							)}
							{!logsLoading && adminLogs.length === 0 && (
								<Typography fontSize={13} color={BASE_COLOR_LIGHT} fontStyle="italic">
									No recent activity
								</Typography>
							)}
							{!logsLoading && adminLogs.length > 0 && (
								<Stack spacing={1}>
									{adminLogs.map((log) => (
										<Typography key={log.id} fontSize={13}>
											<Highlight>
												{log.first_name} {log.last_name}
											</Highlight>{' '}
											{log.action.toLowerCase()}d{' '}
											<Highlight>{log.entity_name.toLowerCase().replace('_', ' ')}</Highlight>{' '}
											<Box component="span" color={BASE_COLOR_LIGHT}>
												{dayjs(log.created_at).fromNow()}
											</Box>
										</Typography>
									))}
								</Stack>
							)}
						</Paper>
					</Stack>
				</Box>

				{/* Sticky Action Buttons */}
				<Box
					sx={{
						borderTop: '1px solid',
						borderColor: 'divider',
						backgroundColor: 'white',
						padding: '16px',
						marginTop: '10px',
					}}
				>
					<Stack spacing={1.5}>
						<Button variant="contained" startIcon={<OpenInNew />} onClick={handleViewFullDetails} fullWidth>
							View Full Details
						</Button>
						<Button
							variant="outlined"
							size="small"
							startIcon={<Edit />}
							onClick={handleEditClaim}
							fullWidth
						>
							Edit
						</Button>
					</Stack>
				</Box>
			</Box>
		</Fade>
	);
}

const styles = {
	gradientPaper: {
		...containerStyles.gradientCard,
		height: 'fit-content',
	},
	beveledPaper: {
		...containerStyles.beveledCard,
		padding: '20px',
		height: 'fit-content',
	},
};
