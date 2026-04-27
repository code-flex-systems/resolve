'use client';

import { IconChecklist, IconCircleCheck, IconEdit, IconExternalLink, IconListCheck, IconShield, IconSubtask, IconUsersGroup } from '@tabler/icons-react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Divider from '@/components/ui/Divider';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import Link from 'next/link';
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
import { useState } from 'react';
import ClaimEditDialog from './claim-detail/ClaimEditDialog';

dayjs.extend(relativeTime);

interface ClaimSummaryProps {
	claimId: string;
	onStartChecklist?: () => void;
	showChecklistProgress?: boolean;
}

export default function ClaimSummary({ claimId, onStartChecklist, showChecklistProgress = true }: ClaimSummaryProps) {
	const router = useRouter();
	const pathname = usePathname();
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const canEditClaim = isAdmin || isSuperAdmin;
	const [showEditDialog, setShowEditDialog] = useState(false);
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
			router.push(`/checklists/${mostRecentAssignment.checklist_id}/claim/${claimId}`);
		}
	};

	const handleEditClaim = () => {
		setShowEditDialog(true);
	};

	// Get the most recently accessed checklist assignment
	const currentAssignment = claimDetail?.checklistAssignments?.[0] ?? null;

	if (claimLoading) {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
				<Skeleton variant="rect" height={60} />
				<Skeleton variant="rect" height={150} />
				<Skeleton variant="rect" height={200} />
			</div>
		);
	}

	if (!claimDetail) {
		return (
			<span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
				Claim not found
			</span>
		);
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
			<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
				{/* Scrollable Content */}
				<div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 4, paddingBottom: 8 }}>
						{/* Header with status badges */}
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
						</div>

						{/* Key Metrics Card */}
						<Card variant="float" padding="md" style={{ height: 'fit-content' }}>
							<span style={{ color: 'var(--text-accent)', marginBottom: '10px' }}>
								{claimDetail.claim_number}
							</span>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
								<div style={{ display: 'flex', flexDirection: 'column' as const, width: '50%', padding: 8 }}>
									<span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
										Claim Amount
									</span>
									<span style={{ fontSize: 16 }}>
										{formatCurrencyExact(Number(claimDetail.claim_amount) || 0)}
									</span>
								</div>
								<div style={{ display: 'flex', flexDirection: 'column' as const, width: '50%', padding: 8 }}>
									<span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
										Total Incurred
									</span>
									<span style={{ fontSize: 16 }}>
										{formatCurrencyExact(Number(claimDetail.total_incurred) || 0)}
									</span>
								</div>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
								<div style={{ display: 'flex', flexDirection: 'column' as const, width: '50%', padding: 8 }}>
									<span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
										Expected Recovery
									</span>
									<span style={{ fontSize: 16 }}>
										{formatCurrencyExact(Number(claimDetail.expected_recovery) || 0)}
									</span>
								</div>
								<div style={{ display: 'flex', flexDirection: 'column' as const, width: '50%', padding: 8 }}>
									<span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
										Actual Recovery
									</span>
									<span style={{ fontSize: 16 }}>
										{formatCurrencyExact(Number(claimDetail.actual_recovery) || 0)}
									</span>
								</div>
							</div>
						</Card>

						{/* Quick Summary: Coverage, Parties, Tasks */}
						<Card variant="beveled" padding="md" style={{ height: 'fit-content' }}>
							<span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, display: 'block' }}>
								Quick Summary
							</span>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
								{/* Coverage Summary - shows count of coverages and Entity parties */}
								<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
									<IconShield size={18} style={{ color: 'var(--text-muted)' }} />
									<span style={{ fontSize: 13 }}>
										<Highlight bold={false}>Coverage:</Highlight>{' '}
										{claimDetail.coverageSummary.count === 0 ? (
											<span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
												None entered
											</span>
										) : (
											<>
												{claimDetail.coverageSummary.count} coverage
												{claimDetail.coverageSummary.count === 1 ? '' : 's'} from{' '}
												{claimDetail.coverageSummary.partyCount} part
												{claimDetail.coverageSummary.partyCount === 1 ? 'y' : 'ies'}
											</>
										)}
									</span>
								</div>

								{/* Liability Summary - shows total liability % from entity parties */}
								<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
									<IconUsersGroup size={18} style={{ color: 'var(--text-muted)' }} />
									<span style={{ fontSize: 13, display: 'flex' }}>
										<Highlight bold={false}>Liability:</Highlight>{' '}
										{claimDetail.partySummary.count === 0 ? (
											<span style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginLeft: 4 }}>
												None linked
											</span>
										) : (
											<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
												{claimDetail.partySummary.totalLiability}% from{' '}
												{claimDetail.partySummary.count} part
												{claimDetail.partySummary.count === 1 ? 'y' : 'ies'}
												{claimDetail.partySummary.totalLiability === 100 && (
													<IconCircleCheck size={14} style={{ color: 'var(--status-success)', }} />
												)}
											</div>
										)}
									</span>
								</div>

								{/* Task Summary */}
								<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
									<IconSubtask size={18} style={{ color: 'var(--text-muted)' }} />
									<span style={{ fontSize: 13 }}>
										<Highlight bold={false}>Tasks:</Highlight>{' '}
										{(() => {
											const totalTasks =
												claimDetail.taskSummary.completed +
												claimDetail.taskSummary.in_progress +
												claimDetail.taskSummary.pending;
											return totalTasks === 0 ? (
												<span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
													None created
												</span>
											) : (
												<Link
													href={`${getViewRoute()}?tab=workflow`}
													style={{ textDecoration: 'none' }}
												>
													<div
														style={{
															color: 'var(--text-accent)',
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
													</div>
												</Link>
											);
										})()}
									</span>
								</div>
							</div>
						</Card>

						{/* Checklist Progress (if applicable) */}
						{showChecklistProgress && currentAssignment && (
							<Card variant="beveled" padding="md" style={{ height: 'fit-content' }}>
								<span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '10px' }}>
									Progress through {currentAssignment.checklist_name}
								</span>
								<div style={{ display: 'flex', justifyContent: 'center', paddingBlock: '15px' }}>
									<ChecklistProgress
										checklistId={currentAssignment.checklist_id}
										claimId={claimId}
										width={250}
										fontSize={14}
										showInfo={false}
									/>
								</div>
								<div style={{ display: 'flex', justifyContent: 'center', paddingTop: '10px' }}>
									<Button
										variant="outlined"
										startIcon={<IconChecklist size={20} />}
										onClick={handleOpenInChecklist}
										fullWidth
									>
										Open in Checklist
									</Button>
								</div>
							</Card>
						)}

						{/* Contextual Info */}
						<Card variant="beveled" padding="md" style={{ height: 'fit-content' }}>
							<span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '10px' }}>
								Information
							</span>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
								{currentAssignment && (
									<span style={{ fontSize: 13 }}>
										Assigned to{' '}
										<Highlight>
											{currentAssignment.assignee_first_name}{' '}
											{currentAssignment.assignee_last_name}
										</Highlight>{' '}
										working through <Highlight>{currentAssignment.checklist_name}</Highlight>
									</span>
								)}
								{!currentAssignment && (
									<div>
										<span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '10px', fontStyle: 'italic' }}>
											Not currently assigned to a checklist
										</span>
										{onStartChecklist && (
											<Button
												variant="outlined"
												startIcon={<IconListCheck size={20} />}
												onClick={onStartChecklist}
												size="sm"
												fullWidth
												color="success"
											>
												Start a Checklist
											</Button>
										)}
									</div>
								)}
								<Divider />
								<span style={{ fontSize: 13 }}>
									<Highlight bold={false}>Insured:</Highlight> {claimDetail.insured ?? 'N/A'}
								</span>
								<span style={{ fontSize: 13 }}>
									<Highlight bold={false}>Client Adjuster:</Highlight>{' '}
									{claimDetail.client_adjuster_first && claimDetail.client_adjuster_last
										? `${claimDetail.client_adjuster_first} ${claimDetail.client_adjuster_last}`
										: (claimDetail.client_adjuster ?? 'N/A')}
								</span>
								<span style={{ fontSize: 13 }}>
									<Highlight bold={false}>Date of Loss:</Highlight>{' '}
									{claimDetail.date_of_loss ? formatMDY(claimDetail.date_of_loss?.toString()) : 'N/A'}
								</span>
								<span style={{ fontSize: 13 }}>
									<Highlight bold={false}>Loss Location:</Highlight>{' '}
									{formatCityState(claimDetail.loss_city, claimDetail.loss_state) || 'N/A'}
								</span>
								{claimDetail.feed_name && (
									<>
										<Divider />
										<span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
											Ingested from{' '}
											<div style={{ fontWeight: 600 }}>
												{claimDetail.feed_name}
											</div>
										</span>
									</>
								)}
							</div>
						</Card>

						{/* Recent Activity */}
						<Card variant="beveled" padding="md" style={{ height: 'fit-content' }}>
							<span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '10px' }}>
								Recent Activity
							</span>
							{logsLoading && (
								<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
									<Skeleton variant="text" />
									<Skeleton variant="text" />
									<Skeleton variant="text" />
								</div>
							)}
							{!logsLoading && adminLogs.length === 0 && (
								<span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
									No recent activity
								</span>
							)}
							{!logsLoading && adminLogs.length > 0 && (
								<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
									{adminLogs.map((log) => (
										<span key={log.id} style={{ fontSize: 13 }}>
											<Highlight>
												{log.first_name} {log.last_name}
											</Highlight>{' '}
											{log.action.toLowerCase()}d{' '}
											<Highlight>{log.entity_name.toLowerCase().replace('_', ' ')}</Highlight>{' '}
											<div style={{ color: 'var(--text-muted)' }}>
												{dayjs(log.created_at).fromNow()}
											</div>
										</span>
									))}
								</div>
							)}
						</Card>
					</div>
				</div>

				{/* Sticky Action Buttons */}
				<div
					style={{
						flexShrink: 0,
						borderTop: '1px solid var(--border)',
						padding: '16px 0',
						marginTop: 'auto',
					}}
				>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
						<Button variant="contained" startIcon={<IconExternalLink size={20} />} onClick={handleViewFullDetails} fullWidth>
							View Full Details
						</Button>
						<Button
							variant="outlined"
							size="sm"
							startIcon={<IconEdit size={20} />}
							onClick={handleEditClaim}
							fullWidth
						>
							Edit
						</Button>
					</div>
				</div>
			</div>

			{showEditDialog && (
				<ClaimEditDialog claimId={claimId} onClose={() => setShowEditDialog(false)} />
			)}
		</div>
	);
}
