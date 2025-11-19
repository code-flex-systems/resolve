'use client';

import { Box, Chip, Divider, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { trpc } from '@/lib/trpc';
import { useAdminLogsTrpc } from '@/hooks/trpc/useAdminLogsTrpc';
import ClaimStatusIcon from '@/components/checklist/ClaimStatusIcon';
import Highlight from '@/components/common/Highlight';
import { formatLabel } from '@/lib/utils/claimUtils';
import { formatMDY } from '@/lib/utils/utils';
import { ClaimStatus } from '@/config/enums';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface OverviewTabProps {
	claimId: number;
}

export default function OverviewTab({ claimId }: OverviewTabProps) {
	const { data: claimDetail, isLoading: claimLoading } = trpc.claim.getClaimDetail.useQuery({
		claimId,
	});
	const { listByClaim } = useAdminLogsTrpc();
	const { data: adminLogs = [], isLoading: logsLoading } = listByClaim({ claimId, limit: 20 });

	if (claimLoading) {
		return (
			<Box p={3}>
				<Stack spacing={2}>
					<Skeleton variant="rectangular" height={120} />
					<Skeleton variant="rectangular" height={200} />
					<Skeleton variant="rectangular" height={300} />
				</Stack>
			</Box>
		);
	}

	if (!claimDetail) {
		return (
			<Box p={3}>
				<Typography color="text.secondary">Claim not found</Typography>
			</Box>
		);
	}

	const currentAssignment = claimDetail.checklistAssignments?.[0] ?? null;

	return (
		<Box p={3}>
			<Stack spacing={3} maxWidth={1000}>
				{/* Contextual Summary */}
				<Paper elevation={0} sx={styles.paper}>
					<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginBottom={2}>
						Summary
					</Typography>
					<Stack spacing={1.5}>
						{claimDetail.insured && (
							<Typography fontSize={14}>
								Claim filed for <Highlight>{claimDetail.insured}</Highlight>
							</Typography>
						)}
						{(claimDetail.client_adjuster || claimDetail.client) && (
							<Typography fontSize={14}>
								{claimDetail.client_adjuster && (
									<>
										Representation by <Highlight>{claimDetail.client_adjuster}</Highlight>
									</>
								)}
								{claimDetail.client && (
									<>
										{' '}
										of <Highlight>{claimDetail.client}</Highlight>
									</>
								)}
							</Typography>
						)}
						{claimDetail.date_of_loss && (
							<Typography fontSize={14}>
								Loss occurred on <Highlight>{formatMDY(claimDetail.date_of_loss)}</Highlight>
								{claimDetail.loss_location && (
									<>
										{' '}
										in <Highlight>{claimDetail.loss_location}</Highlight>
									</>
								)}
							</Typography>
						)}
						{currentAssignment && (
							<Typography fontSize={14}>
								Assigned to{' '}
								<Highlight>
									{currentAssignment.assignee_first_name} {currentAssignment.assignee_last_name}
								</Highlight>{' '}
								in <Highlight>{currentAssignment.checklist_name}</Highlight>
							</Typography>
						)}
						{!currentAssignment && (
							<Typography fontSize={14} color={BASE_COLOR_LIGHT} fontStyle="italic">
								Not currently assigned to a checklist
							</Typography>
						)}
						{claimDetail.substatus && (
							<Typography fontSize={14}>
								Current workflow state: <Highlight>{formatLabel(claimDetail.substatus)}</Highlight>
							</Typography>
						)}
					</Stack>
				</Paper>

				{/* Claim Details */}
				<Paper elevation={0} sx={styles.paper}>
					<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginBottom={2}>
						Claim Details
					</Typography>
					<Stack spacing={1.5}>
						<Box display="flex" justifyContent="space-between">
							<Typography fontSize={13}>
								<Highlight color="secondary.main" bold={false}>
									Claim Number:
								</Highlight>
							</Typography>
							<Typography fontSize={13} fontWeight={600}>
								{claimDetail.claim_number ?? 'N/A'}
							</Typography>
						</Box>
						<Divider />
						<Box display="flex" justifyContent="space-between">
							<Typography fontSize={13}>
								<Highlight color="secondary.main" bold={false}>
									Insured:
								</Highlight>
							</Typography>
							<Typography fontSize={13}>{claimDetail.insured ?? 'N/A'}</Typography>
						</Box>
						<Box display="flex" justifyContent="space-between">
							<Typography fontSize={13}>
								<Highlight color="secondary.main" bold={false}>
									Client:
								</Highlight>
							</Typography>
							<Typography fontSize={13}>{claimDetail.client ?? 'N/A'}</Typography>
						</Box>
						<Box display="flex" justifyContent="space-between">
							<Typography fontSize={13}>
								<Highlight color="secondary.main" bold={false}>
									Client Adjuster:
								</Highlight>
							</Typography>
							<Typography fontSize={13}>{claimDetail.client_adjuster ?? 'N/A'}</Typography>
						</Box>
						<Divider />
						<Box display="flex" justifyContent="space-between">
							<Typography fontSize={13}>
								<Highlight color="secondary.main" bold={false}>
									Date of Loss:
								</Highlight>
							</Typography>
							<Typography fontSize={13}>
								{claimDetail.date_of_loss ? formatMDY(claimDetail.date_of_loss) : 'N/A'}
							</Typography>
						</Box>
						<Box display="flex" justifyContent="space-between">
							<Typography fontSize={13}>
								<Highlight color="secondary.main" bold={false}>
									Loss Location:
								</Highlight>
							</Typography>
							<Typography fontSize={13}>{claimDetail.loss_location ?? 'N/A'}</Typography>
						</Box>
						<Divider />
						<Box display="flex" justifyContent="space-between">
							<Typography fontSize={13}>
								<Highlight color="secondary.main" bold={false}>
									Created:
								</Highlight>
							</Typography>
							<Typography fontSize={13}>
								{claimDetail.created_at ? formatMDY(claimDetail.created_at) : 'N/A'}
							</Typography>
						</Box>
						<Box display="flex" justifyContent="space-between">
							<Typography fontSize={13}>
								<Highlight color="secondary.main" bold={false}>
									Last Updated:
								</Highlight>
							</Typography>
							<Typography fontSize={13}>
								{claimDetail.last_update ? formatMDY(claimDetail.last_update) : 'N/A'}
							</Typography>
						</Box>
						{claimDetail.feed_name && (
							<>
								<Divider />
								<Box display="flex" justifyContent="space-between">
									<Typography fontSize={13}>
										<Highlight color="secondary.main" bold={false}>
											Feed Source:
										</Highlight>
									</Typography>
									<Chip label={claimDetail.feed_name} size="small" variant="outlined" />
								</Box>
							</>
						)}
					</Stack>
				</Paper>

				{/* Activity Timeline */}
				<Paper elevation={0} sx={styles.paper}>
					<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginBottom={2}>
						Activity Timeline
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
							No activity recorded yet
						</Typography>
					)}
					{!logsLoading && adminLogs.length > 0 && (
						<Stack spacing={2}>
							{adminLogs.map((log) => (
								<Box key={log.id} display="flex" gap={2}>
									<Box
										sx={{
											width: 8,
											height: 8,
											borderRadius: '50%',
											bgcolor: 'secondary.main',
											marginTop: '6px',
											flexShrink: 0,
										}}
									/>
									<Box flex={1}>
										<Typography fontSize={13}>
											<Highlight color="secondary.main">
												{log.first_name} {log.last_name}
											</Highlight>{' '}
											{log.action.toLowerCase()}d{' '}
											<Highlight>{log.entity_name.toLowerCase().replace('_', ' ')}</Highlight>
										</Typography>
										<Typography fontSize={12} color={BASE_COLOR_LIGHT}>
											{dayjs(log.created_at).format('MMM D, YYYY [at] h:mm A')} (
											{dayjs(log.created_at).fromNow()})
										</Typography>
									</Box>
								</Box>
							))}
						</Stack>
					)}
				</Paper>

				{/* Checklist Progress (if assigned) */}
				{currentAssignment && (
					<Paper elevation={0} sx={styles.paper}>
						<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginBottom={2}>
							Current Assignment
						</Typography>
						<Stack spacing={1.5}>
							<Box display="flex" justifyContent="space-between">
								<Typography fontSize={13}>
									<Highlight color="secondary.main" bold={false}>
										Checklist:
									</Highlight>
								</Typography>
								<Typography fontSize={13} fontWeight={600}>
									{currentAssignment.checklist_name}
								</Typography>
							</Box>
							<Box display="flex" justifyContent="space-between">
								<Typography fontSize={13}>
									<Highlight color="secondary.main" bold={false}>
										Assignee:
									</Highlight>
								</Typography>
								<Typography fontSize={13}>
									{currentAssignment.assignee_first_name} {currentAssignment.assignee_last_name}
								</Typography>
							</Box>
							<Box display="flex" justifyContent="space-between" alignItems="center">
								<Typography fontSize={13}>
									<Highlight color="secondary.main" bold={false}>
										Status:
									</Highlight>
								</Typography>
								<Box
									display="flex"
									alignItems="center"
									padding="2px 8px"
									border="1px solid #85D2FF"
									bgcolor="white"
									borderRadius={3}
								>
									<ClaimStatusIcon status={currentAssignment.status as ClaimStatus} fontSize={17} />
									<Typography fontSize={14} color="primary" marginLeft="5px">
										{currentAssignment.status}
									</Typography>
								</Box>
							</Box>
							<Box display="flex" justifyContent="space-between">
								<Typography fontSize={13}>
									<Highlight color="secondary.main" bold={false}>
										Last Opened:
									</Highlight>
								</Typography>
								<Typography fontSize={13}>
									{dayjs(currentAssignment.last_opened).format('MMM D, YYYY [at] h:mm A')}
								</Typography>
							</Box>
							{currentAssignment.submitted_at && (
								<>
									<Box display="flex" justifyContent="space-between">
										<Typography fontSize={13}>
											<Highlight color="secondary.main" bold={false}>
												Submitted:
											</Highlight>
										</Typography>
										<Typography fontSize={13}>
											{dayjs(currentAssignment.submitted_at).format('MMM D, YYYY [at] h:mm A')}
										</Typography>
									</Box>
									{currentAssignment.time_to_resolution_days && (
										<Box display="flex" justifyContent="space-between">
											<Typography fontSize={13}>
												<Highlight color="secondary.main" bold={false}>
													Time to Resolution:
												</Highlight>
											</Typography>
											<Typography fontSize={13}>
												{currentAssignment.time_to_resolution_days} days
											</Typography>
										</Box>
									)}
								</>
							)}
						</Stack>
					</Paper>
				)}
			</Stack>
		</Box>
	);
}

const styles = {
	paper: {
		padding: '20px',
		border: 1,
		borderColor: 'divider',
	},
};
