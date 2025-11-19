'use client';

import { Box, Button, CardContent, Chip, Divider, Fade, Paper, Skeleton, Stack, Typography } from '@mui/material';
import OpenInNew from '@mui/icons-material/OpenInNew';
import ChecklistRtl from '@mui/icons-material/ChecklistRtl';
import Edit from '@mui/icons-material/Edit';
import Shield from '@mui/icons-material/Shield';
import PlaylistAddCheck from '@mui/icons-material/PlaylistAddCheck';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { trpc } from '@/lib/trpc';
import { useAdminLogsTrpc } from '@/hooks/trpc/useAdminLogsTrpc';
import ChecklistProgress from '@/components/checklist/ChecklistProgress';
import Highlight from '@/components/common/Highlight';
import { formatMDY } from '@/lib/utils/utils';
import { formatCurrencyExact, formatRecoveryStatus } from '@/lib/utils/recoveryUtils';
import { formatLineOfBusiness, formatLossType, LOB_ICONS, LOSS_TYPE_ICONS } from '@/lib/utils/claimUtils';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { LineOfBusiness, LossType } from '@/config/enums';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';

dayjs.extend(relativeTime);

interface ClaimSummaryProps {
	claimId: number;
	onStartChecklist?: () => void;
}

export default function ClaimSummary({ claimId, onStartChecklist }: ClaimSummaryProps) {
	const router = useRouter();
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const canEditClaim = isAdmin || isSuperAdmin;
	const { data: claimDetail, isLoading: claimLoading } = trpc.claim.getClaimDetail.useQuery(
		{ claimId },
		{ enabled: !!claimId }
	);
	const { listByClaim } = useAdminLogsTrpc();
	const { data: adminLogs = [], isLoading: logsLoading } = listByClaim({ claimId, limit: 5 }, { enabled: !!claimId });

	const handleViewFullDetails = () => {
		if (claimId) {
			// Navigate to standalone claim details page (not admin-only)
			router.push(`/claims/${claimId}`);
		}
	};

	const handleOpenInChecklist = () => {
		const mostRecentAssignment = claimDetail?.checklistAssignments?.[0];
		if (mostRecentAssignment) {
			router.push(`/checklist/${mostRecentAssignment.checklist_id}/claim/${claimId}`);
		}
	};

	const handleEditClaim = () => {
		if (claimId) {
			router.push(`/admin/claims/edit/${claimId}`);
		}
	};

	const handleAddCoverage = () => {
		if (claimId) {
			// Navigate to standalone page with coverage tab
			router.push(`/claims/${claimId}?tab=coverage`);
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
								<Chip
									icon={
										<Box marginLeft="5px">
											<Typography fontSize={14}>
												{LOB_ICONS[claimDetail.line_of_business as LineOfBusiness]}
											</Typography>
										</Box>
									}
									label={formatLineOfBusiness(claimDetail.line_of_business)}
									size="small"
									color="primary"
									variant="outlined"
								/>
							)}
							{claimDetail.loss_type && (
								<Chip
									icon={
										<Box marginLeft="5px">
											<Typography fontSize={14} marginLeft="5px">
												{LOSS_TYPE_ICONS[claimDetail.loss_type as LossType]}
											</Typography>
										</Box>
									}
									label={formatLossType(claimDetail.loss_type)}
									size="small"
									color="secondary"
									variant="outlined"
								/>
							)}
							{claimDetail.recovery_status && (
								<Chip
									label={formatRecoveryStatus(claimDetail.recovery_status)}
									size="small"
									variant="outlined"
								/>
							)}
						</Box>

						{/* Key Metrics Card */}
						<Paper elevation={0} style={{ height: 'fit-content' }} sx={styles.paper}>
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

						{/* Checklist Progress (if applicable) */}
						{currentAssignment && (
							<Paper elevation={0} style={{ height: 'fit-content' }} sx={styles.paper}>
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
						<Paper elevation={0} style={{ height: 'fit-content' }} sx={styles.paper}>
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
									{claimDetail.client_adjuster ?? 'N/A'}
								</Typography>
								<Typography fontSize={13}>
									<Highlight bold={false}>Date of Loss:</Highlight>{' '}
									{claimDetail.date_of_loss ? formatMDY(claimDetail.date_of_loss) : 'N/A'}
								</Typography>
								<Typography fontSize={13}>
									<Highlight bold={false}>Loss Location:</Highlight>{' '}
									{claimDetail.loss_location ?? 'N/A'}
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
						<Paper elevation={0} style={{ height: 'fit-content' }} sx={styles.paper}>
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
						{canEditClaim && (
							<Box display="flex" gap={1}>
								<Button
									variant="outlined"
									size="small"
									startIcon={<Edit />}
									onClick={handleEditClaim}
									fullWidth
								>
									Edit
								</Button>
								<Button
									variant="outlined"
									size="small"
									startIcon={<Shield />}
									onClick={handleAddCoverage}
									fullWidth
								>
									Add Coverage
								</Button>
							</Box>
						)}
					</Stack>
				</Box>
			</Box>
		</Fade>
	);
}

const styles = {
	paper: {
		padding: '15px',
		border: 1,
		borderColor: 'divider',
		height: 'fit-content',
	},
};
