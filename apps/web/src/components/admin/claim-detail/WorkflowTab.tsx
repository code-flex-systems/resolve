'use client';

import { Box, Button, Chip, Divider, Paper, Skeleton, Stack, Typography } from '@mui/material';
import OpenInNew from '@mui/icons-material/OpenInNew';
import { trpc } from '@/lib/trpc';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import ChecklistProgress from '@/components/checklist/ChecklistProgress';
import ClaimStatusIcon from '@/components/checklist/ClaimStatusIcon';
import Highlight from '@/components/common/Highlight';
import { formatLabel } from '@/lib/utils/claimUtils';
import { ClaimStatus } from '@/config/enums';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';

dayjs.extend(relativeTime);

interface WorkflowTabProps {
	claimId: number;
}

export default function WorkflowTab({ claimId }: WorkflowTabProps) {
	const router = useRouter();
	const { data: claimDetail, isLoading } = trpc.claim.getClaimDetail.useQuery({ claimId });

	if (isLoading) {
		return (
			<Box p={3}>
				<Stack spacing={2}>
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
	const assignmentHistory = claimDetail.checklistAssignments ?? [];

	const handleOpenChecklist = (checklistId: number) => {
		router.push(`/checklist/${checklistId}/claim/${claimId}`);
	};

	return (
		<Box p={3}>
			<Stack spacing={3} maxWidth={1000}>
				{/* Workflow Status */}
				<Paper elevation={0} sx={styles.paper}>
					<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginBottom={2}>
						Workflow Status
					</Typography>
					<Stack spacing={1.5}>
						<Box display="flex" justifyContent="space-between" alignItems="center">
							<Typography fontSize={13}>
								<Highlight bold={false}>Recovery Status:</Highlight>
							</Typography>
							{claimDetail.recovery_status ? (
								<Chip label={formatLabel(claimDetail.recovery_status)} size="small" color="primary" />
							) : (
								<Typography fontSize={13} color={BASE_COLOR_LIGHT}>
									N/A
								</Typography>
							)}
						</Box>
						<Box display="flex" justifyContent="space-between" alignItems="center">
							<Typography fontSize={13}>
								<Highlight bold={false}>Substatus:</Highlight>
							</Typography>
							{claimDetail.substatus ? (
								<Chip label={formatLabel(claimDetail.substatus)} size="small" color="secondary" />
							) : (
								<Typography fontSize={13} color={BASE_COLOR_LIGHT}>
									N/A
								</Typography>
							)}
						</Box>
					</Stack>
				</Paper>

				{/* Current Assignment */}
				{currentAssignment ? (
					<Paper elevation={0} sx={styles.paper}>
						<Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
							<Typography fontSize={13} color={BASE_COLOR_LIGHT}>
								Current Assignment
							</Typography>
							<BasicButtonStyled
								buttonProps={{
									onClick: () => handleOpenChecklist(currentAssignment.checklist_id),
									endIcon: <OpenInNew />,
								}}
							>
								Open Checklist
							</BasicButtonStyled>
						</Box>
						<Stack spacing={2}>
							<Box>
								<Typography fontSize={13}>
									<Highlight>
										{currentAssignment.assignee_first_name} {currentAssignment.assignee_last_name}
									</Highlight>{' '}
									is working through <Highlight>{currentAssignment.checklist_name}</Highlight>
								</Typography>
							</Box>
							<Divider />
							<Box display="flex" justifyContent="space-between" alignItems="center">
								<Typography fontSize={13}>
									<Highlight bold={false}>Status:</Highlight>
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
									<Highlight bold={false}>Last Opened:</Highlight>
								</Typography>
								<Typography fontSize={13}>
									{dayjs(currentAssignment.last_opened).format('MMM D, YYYY [at] h:mm A')}
								</Typography>
							</Box>
							<Box display="flex" justifyContent="space-between">
								<Typography fontSize={13}>
									<Highlight bold={false}>Created By:</Highlight>
								</Typography>
								<Typography fontSize={13}>
									{currentAssignment.creator_first_name} {currentAssignment.creator_last_name}
								</Typography>
							</Box>
							{currentAssignment.submitted_at && (
								<>
									<Divider />
									<Box display="flex" justifyContent="space-between">
										<Typography fontSize={13}>
											<Highlight bold={false}>Submitted:</Highlight>
										</Typography>
										<Typography fontSize={13}>
											{dayjs(currentAssignment.submitted_at).format('MMM D, YYYY [at] h:mm A')}
										</Typography>
									</Box>
									{currentAssignment.submitted_by_first_name && (
										<Box display="flex" justifyContent="space-between">
											<Typography fontSize={13}>
												<Highlight bold={false}>Submitted By:</Highlight>
											</Typography>
											<Typography fontSize={13}>
												{currentAssignment.submitted_by_first_name}{' '}
												{currentAssignment.submitted_by_last_name}
											</Typography>
										</Box>
									)}
									{currentAssignment.time_to_resolution_days && (
										<Box display="flex" justifyContent="space-between">
											<Typography fontSize={13}>
												<Highlight bold={false}>Time to Resolution:</Highlight>
											</Typography>
											<Typography fontSize={13} fontWeight={600}>
												{currentAssignment.time_to_resolution_days} days
											</Typography>
										</Box>
									)}
								</>
							)}
							<Divider />
							<Box>
								<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginBottom={2}>
									Progress
								</Typography>
								<ChecklistProgress
									checklistId={currentAssignment.checklist_id}
									claimId={claimId}
									width={500}
									fontSize={13}
									showInfo={false}
								/>
							</Box>
						</Stack>
					</Paper>
				) : (
					<Paper elevation={0} sx={styles.paper}>
						<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginBottom={2}>
							Current Assignment
						</Typography>
						<Typography fontSize={13} color={BASE_COLOR_LIGHT} fontStyle="italic">
							This claim is not currently assigned to any checklist
						</Typography>
					</Paper>
				)}

				{/* Assignment History */}
				{assignmentHistory.length > 0 && (
					<Paper elevation={0} sx={styles.paper}>
						<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginBottom={2}>
							Assignment History ({assignmentHistory.length} assignment
							{assignmentHistory.length !== 1 ? 's' : ''})
						</Typography>
						<Stack spacing={2}>
							{assignmentHistory.map((assignment, index) => (
								<Box key={`${assignment.checklist_id}-${assignment.claim_id}`}>
									{index > 0 && <Divider sx={{ marginBottom: 2 }} />}
									<Box display="flex" justifyContent="space-between" alignItems="flex-start">
										<Box flex={1}>
											<Typography fontSize={13} fontWeight={600} marginBottom={0.5}>
												{assignment.checklist_name}
											</Typography>
											<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={1}>
												Assigned to {assignment.assignee_first_name}{' '}
												{assignment.assignee_last_name}
											</Typography>
											<Box
												display="flex"
												gap={1}
												flexWrap="wrap"
												marginBottom={1}
												alignItems="center"
											>
												<Box
													display="flex"
													alignItems="center"
													padding="2px 8px"
													border="1px solid #85D2FF"
													bgcolor="white"
													borderRadius={3}
												>
													<ClaimStatusIcon
														status={assignment.status as ClaimStatus}
														fontSize={17}
													/>
													<Typography fontSize={14} color="primary" marginLeft="5px">
														{assignment.status}
													</Typography>
												</Box>
												{assignment.submitted_at && assignment.time_to_resolution_days && (
													<Chip
														label={`Completed in ${assignment.time_to_resolution_days} days`}
														size="small"
														color="success"
													/>
												)}
											</Box>
											<Typography fontSize={11} color={BASE_COLOR_LIGHT}>
												Last opened {dayjs(assignment.last_opened).fromNow()}
											</Typography>
										</Box>
									</Box>
								</Box>
							))}
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
