'use client';

import { IconExternalLink } from '@tabler/icons-react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Divider from '@/components/ui/Divider';
import Chip from '@/components/ui/Chip';
import { trpc } from '@/lib/trpc';
import ChecklistProgress from '@/components/checklist/ChecklistProgress';
import ClaimStatusIcon from '@/components/checklist/ClaimStatusIcon';
import Highlight from '@/components/common/Highlight';
import { formatLabel } from '@/lib/utils/claimUtils';
import { ClaimStatus } from '@/config/enums';
import { ClaimSubstatusChip } from '@/components/common/ReferenceDataSelect';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import TaskListPanel from '@/components/common/TaskListPanel';

dayjs.extend(relativeTime);

interface WorkflowTabProps {
	claimId: number;
}

export default function WorkflowTab({ claimId }: WorkflowTabProps) {
	const router = useRouter();
	const { data: claimDetail, isLoading } = trpc.claim.getClaimDetail.useQuery({ claimId });

	if (isLoading) {
		return (
			<div style={{ padding: 24 }}>
				<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
					<Skeleton variant="rect" height={200} />
					<Skeleton variant="rect" height={300} />
				</div>
			</div>
		);
	}

	if (!claimDetail) {
		return (
			<div style={{ padding: 24 }}>
				<span style={{ color: 'var(--text-secondary)' }}>Claim not found</span>
			</div>
		);
	}

	const currentAssignment = claimDetail.checklistAssignments?.[0] ?? null;
	const assignmentHistory = claimDetail.checklistAssignments ?? [];

	const handleOpenChecklist = (checklistId: number) => {
		router.push(`/checklist/${checklistId}/claim/${claimId}`);
	};

	return (
		<div style={{ padding: 24 }}>
			<div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1000, margin: "0 auto" }}>
				{/* Workflow Status */}
				<Card variant="float" padding="lg">
					<span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, display: 'block' }}>
						Workflow Status
					</span>
					<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<span style={{ fontSize: 13 }}>
								<Highlight bold={false}>Recovery Status:</Highlight>
							</span>
							{claimDetail.recovery_status ? (
								<Chip  size="sm" color="info">{formatLabel(claimDetail.recovery_status)}</Chip>
							) : (
								<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
									N/A
								</span>
							)}
						</div>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<span style={{ fontSize: 13 }}>
								<Highlight bold={false}>Substatus:</Highlight>
							</span>
							{claimDetail.substatus ? (
								<ClaimSubstatusChip value={claimDetail.substatus} showEmoji={false} />
							) : (
								<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
									N/A
								</span>
							)}
						</div>
					</div>
				</Card>

				{/* Current Assignment */}
				{currentAssignment ? (
					<Card variant="beveled" padding="lg">
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
							<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
								Current Assignment
							</span>
							<BasicButtonStyled
								buttonProps={{
									onClick: () => handleOpenChecklist(currentAssignment.checklist_id),
									endIcon: <IconExternalLink size={20} />,
								}}
							>
								Open Checklist
							</BasicButtonStyled>
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
							<div>
								<span style={{ fontSize: 13 }}>
									<Highlight>
										{currentAssignment.assignee_first_name} {currentAssignment.assignee_last_name}
									</Highlight>{' '}
									is working through <Highlight>{currentAssignment.checklist_name}</Highlight>
								</span>
							</div>
							<Divider />
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<span style={{ fontSize: 13 }}>
									<Highlight bold={false}>Status:</Highlight>
								</span>
								<div style={{ display: 'flex', alignItems: 'center', padding: '2px 8px', border: '1px solid #85D2FF', backgroundColor: 'white', borderRadius: 12 }}>
									<ClaimStatusIcon status={currentAssignment.status as ClaimStatus} fontSize={17} />
									<span style={{ fontSize: 14, color: 'var(--text-accent)', marginLeft: '5px' }}>
										{currentAssignment.status}
									</span>
								</div>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<span style={{ fontSize: 13 }}>
									<Highlight bold={false}>Last Opened:</Highlight>
								</span>
								<span style={{ fontSize: 13 }}>
									{dayjs(currentAssignment.last_opened).format('MMM D, YYYY [at] h:mm A')}
								</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<span style={{ fontSize: 13 }}>
									<Highlight bold={false}>Created By:</Highlight>
								</span>
								<span style={{ fontSize: 13 }}>
									{currentAssignment.creator_first_name} {currentAssignment.creator_last_name}
								</span>
							</div>
							{currentAssignment.submitted_at && (
								<>
									<Divider />
									<div style={{ display: 'flex', justifyContent: 'space-between' }}>
										<span style={{ fontSize: 13 }}>
											<Highlight bold={false}>Submitted:</Highlight>
										</span>
										<span style={{ fontSize: 13 }}>
											{dayjs(currentAssignment.submitted_at).format('MMM D, YYYY [at] h:mm A')}
										</span>
									</div>
									{currentAssignment.submitted_by_first_name && (
										<div style={{ display: 'flex', justifyContent: 'space-between' }}>
											<span style={{ fontSize: 13 }}>
												<Highlight bold={false}>Submitted By:</Highlight>
											</span>
											<span style={{ fontSize: 13 }}>
												{currentAssignment.submitted_by_first_name}{' '}
												{currentAssignment.submitted_by_last_name}
											</span>
										</div>
									)}
									{currentAssignment.time_to_resolution_days && (
										<div style={{ display: 'flex', justifyContent: 'space-between' }}>
											<span style={{ fontSize: 13 }}>
												<Highlight bold={false}>Time to Resolution:</Highlight>
											</span>
											<span style={{ fontSize: 13, fontWeight: 600 }}>
												{currentAssignment.time_to_resolution_days} days
											</span>
										</div>
									)}
								</>
							)}
							<Divider />
							<div>
								<span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, display: 'block' }}>
									Progress
								</span>
								<ChecklistProgress
									checklistId={currentAssignment.checklist_id}
									claimId={claimId}
									width={500}
									fontSize={13}
									showInfo={false}
								/>
							</div>
						</div>
					</Card>
				) : (
					<Card variant="beveled" padding="lg">
						<span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, display: 'block' }}>
							Current Assignment
						</span>
						<span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
							This claim is not currently assigned to any checklist
						</span>
					</Card>
				)}

				{/* Assignment History */}
				{assignmentHistory.length > 0 && (
					<Card variant="beveled" padding="lg">
						<span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, display: 'block' }}>
							Assignment History ({assignmentHistory.length} assignment
							{assignmentHistory.length !== 1 ? 's' : ''})
						</span>
						<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
							{assignmentHistory.map((assignment, index) => (
								<div key={`${assignment.checklist_id}-${assignment.claim_id}`}>
									{index > 0 && <Divider />}
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
										<div style={{ flex: 1 }}>
											<span style={{ fontSize: 13, fontWeight: 600 }}>
												{assignment.checklist_name}
											</span>
											<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
												Assigned to {assignment.assignee_first_name}{' '}
												{assignment.assignee_last_name}
											</span>
											<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
												<div
													style={{
														display: 'flex',
														alignItems: 'center',
														padding: '2px 8px',
														border: '1px solid #85D2FF',
														backgroundColor: 'white',
														borderRadius: 12,
													}}
												>
													<ClaimStatusIcon
														status={assignment.status as ClaimStatus}
														fontSize={17}
													/>
													<span style={{ fontSize: 14, color: 'var(--text-accent)', marginLeft: 5 }}>
														{assignment.status}
													</span>
												</div>
												{assignment.submitted_at && assignment.time_to_resolution_days && (
													<Chip size="sm" color="success">
														{`Completed in ${assignment.time_to_resolution_days} days`}
													</Chip>
												)}
											</div>
											<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
												Last opened {dayjs(assignment.last_opened).fromNow()}
											</span>
										</div>
									</div>
								</div>
							))}
						</div>
					</Card>
				)}

				{/* Tasks */}
				<Card variant="beveled" padding="lg">
					<span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, display: 'block' }}>
						Tasks
					</span>
					<TaskListPanel
						claimId={claimId}
						claimNumber={claimDetail.claim_number ?? undefined}
					/>
				</Card>
			</div>
		</div>
	);
}
