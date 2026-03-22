'use client';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Divider from '@/components/ui/Divider';
import Chip from '@/components/ui/Chip';
import { trpc } from '@/lib/trpc';
import { useAdminLogsTrpc } from '@/hooks/trpc/useAdminLogsTrpc';
import ClaimStatusIcon from '@/components/checklist/ClaimStatusIcon';
import Highlight from '@/components/common/Highlight';
import { formatMDY } from '@/lib/utils/utils';
import { ClaimStatus } from '@/config/enums';
import { ClaimSubstatusValue } from '@/components/common/ReferenceDataSelect';
import { formatCityState } from '@/schemas/addressSchemas';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface OverviewTabProps {
	claimId: string;
}

export default function OverviewTab({ claimId }: OverviewTabProps) {
	const { data: claimDetail, isLoading: claimLoading } = trpc.claim.getClaimDetail.useQuery({
		claimId,
	});
	const { listByClaim } = useAdminLogsTrpc();
	const { data: adminLogs = [], isLoading: logsLoading } = listByClaim({ claimId, limit: 20 });

	if (claimLoading) {
		return (
			<div style={{ padding: 24 }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
					<Skeleton variant="rect" height={120} />
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

	return (
		<div style={{ padding: 24 }}>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
				{/* Contextual Summary */}
				<Card variant="float" padding="lg">
					<span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
						Summary
					</span>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
						{claimDetail.insured && (
							<span style={{ fontSize: 14 }}>
								Claim filed for <Highlight>{claimDetail.insured}</Highlight>
							</span>
						)}
						{(claimDetail.client_adjuster || claimDetail.client) && (
							<span style={{ fontSize: 14 }}>
								{claimDetail.client_adjuster && (
									<>
										Representation by{' '}
										<Highlight>
											{claimDetail.client_adjuster_first && claimDetail.client_adjuster_last
												? `${claimDetail.client_adjuster_first} ${claimDetail.client_adjuster_last}`
												: claimDetail.client_adjuster}
										</Highlight>
									</>
								)}
								{claimDetail.client && (
									<>
										{' '}
										of <Highlight>{claimDetail.client}</Highlight>
									</>
								)}
							</span>
						)}
						{claimDetail.date_of_loss && (
							<span style={{ fontSize: 14 }}>
								Loss occurred on <Highlight>{formatMDY(claimDetail.date_of_loss)}</Highlight>
								{(claimDetail.loss_city || claimDetail.loss_state) && (
									<>
										{' '}
										in <Highlight>{formatCityState(claimDetail.loss_city, claimDetail.loss_state)}</Highlight>
									</>
								)}
							</span>
						)}
						{currentAssignment && (
							<span style={{ fontSize: 14 }}>
								Assigned to{' '}
								<Highlight>
									{currentAssignment.assignee_first_name} {currentAssignment.assignee_last_name}
								</Highlight>{' '}
								in <Highlight>{currentAssignment.checklist_name}</Highlight>
							</span>
						)}
						{!currentAssignment && (
							<span style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }}>
								Not currently assigned to a checklist
							</span>
						)}
						{claimDetail.substatus && (
							<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
								<span style={{ fontSize: 14 }}>Current workflow state:</span>
								<ClaimSubstatusValue value={claimDetail.substatus} fontSize={14} />
							</div>
						)}
					</div>
				</Card>

				{/* Claim Details */}
				<Card variant="beveled" padding="lg">
					<span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
						Claim Details
					</span>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span style={{ fontSize: 13 }}>
								<Highlight color="secondary.main" bold={false}>
									Claim Number:
								</Highlight>
							</span>
							<span style={{ fontSize: 13, fontWeight: 600 }}>
								{claimDetail.claim_number ?? 'N/A'}
							</span>
						</div>
						<Divider />
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span style={{ fontSize: 13 }}>
								<Highlight color="secondary.main" bold={false}>
									Insured:
								</Highlight>
							</span>
							<span style={{ fontSize: 13 }}>{claimDetail.insured ?? 'N/A'}</span>
						</div>
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span style={{ fontSize: 13 }}>
								<Highlight color="secondary.main" bold={false}>
									Client:
								</Highlight>
							</span>
							<span style={{ fontSize: 13 }}>{claimDetail.client ?? 'N/A'}</span>
						</div>
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span style={{ fontSize: 13 }}>
								<Highlight color="secondary.main" bold={false}>
									Client Adjuster:
								</Highlight>
							</span>
							<span style={{ fontSize: 13 }}>
								{claimDetail.client_adjuster_first && claimDetail.client_adjuster_last
									? `${claimDetail.client_adjuster_first} ${claimDetail.client_adjuster_last}`
									: claimDetail.client_adjuster ?? 'N/A'}
							</span>
						</div>
						<Divider />
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span style={{ fontSize: 13 }}>
								<Highlight color="secondary.main" bold={false}>
									Date of Loss:
								</Highlight>
							</span>
							<span style={{ fontSize: 13 }}>
								{claimDetail.date_of_loss ? formatMDY(claimDetail.date_of_loss) : 'N/A'}
							</span>
						</div>
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span style={{ fontSize: 13 }}>
								<Highlight color="secondary.main" bold={false}>
									Loss Location:
								</Highlight>
							</span>
							<span style={{ fontSize: 13 }}>
								{formatCityState(claimDetail.loss_city, claimDetail.loss_state) || 'N/A'}
							</span>
						</div>
						<Divider />
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span style={{ fontSize: 13 }}>
								<Highlight color="secondary.main" bold={false}>
									Created:
								</Highlight>
							</span>
							<span style={{ fontSize: 13 }}>
								{claimDetail.created_at ? formatMDY(claimDetail.created_at) : 'N/A'}
							</span>
						</div>
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span style={{ fontSize: 13 }}>
								<Highlight color="secondary.main" bold={false}>
									Last Updated:
								</Highlight>
							</span>
							<span style={{ fontSize: 13 }}>
								{claimDetail.last_update ? formatMDY(claimDetail.last_update) : 'N/A'}
							</span>
						</div>
						{claimDetail.feed_name && (
							<>
								<Divider />
								<div style={{ display: 'flex', justifyContent: 'space-between' }}>
									<span style={{ fontSize: 13 }}>
										<Highlight color="secondary.main" bold={false}>
											Feed Source:
										</Highlight>
									</span>
									<Chip  size="sm" variant="outlined">{claimDetail.feed_name}</Chip>
								</div>
							</>
						)}
					</div>
				</Card>

				{/* Checklist Progress (if assigned) */}
				{currentAssignment && (
					<Card variant="beveled" padding="lg">
						<span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
							Current Assignment
						</span>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<span style={{ fontSize: 13 }}>
									<Highlight color="secondary.main" bold={false}>
										Checklist:
									</Highlight>
								</span>
								<span style={{ fontSize: 13, fontWeight: 600 }}>
									{currentAssignment.checklist_name}
								</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<span style={{ fontSize: 13 }}>
									<Highlight color="secondary.main" bold={false}>
										Assignee:
									</Highlight>
								</span>
								<span style={{ fontSize: 13 }}>
									{currentAssignment.assignee_first_name} {currentAssignment.assignee_last_name}
								</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ fontSize: 13 }}>
									<Highlight color="secondary.main" bold={false}>
										Status:
									</Highlight>
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
									<Highlight color="secondary.main" bold={false}>
										Last Opened:
									</Highlight>
								</span>
								<span style={{ fontSize: 13 }}>
									{dayjs(currentAssignment.last_opened).format('MMM D, YYYY [at] h:mm A')}
								</span>
							</div>
							{currentAssignment.submitted_at && (
								<>
									<div style={{ display: 'flex', justifyContent: 'space-between' }}>
										<span style={{ fontSize: 13 }}>
											<Highlight color="secondary.main" bold={false}>
												Submitted:
											</Highlight>
										</span>
										<span style={{ fontSize: 13 }}>
											{dayjs(currentAssignment.submitted_at).format('MMM D, YYYY [at] h:mm A')}
										</span>
									</div>
									{currentAssignment.time_to_resolution_days && (
										<div style={{ display: 'flex', justifyContent: 'space-between' }}>
											<span style={{ fontSize: 13 }}>
												<Highlight color="secondary.main" bold={false}>
													Time to Resolution:
												</Highlight>
											</span>
											<span style={{ fontSize: 13 }}>
												{currentAssignment.time_to_resolution_days} days
											</span>
										</div>
									)}
								</>
							)}
						</div>
					</Card>
				)}

				{/* Activity Timeline */}
				<Card variant="beveled" padding="lg">
					<span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
						Activity Timeline
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
							No activity recorded yet
						</span>
					)}
					{!logsLoading && adminLogs.length > 0 && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
							{adminLogs.map((log) => (
								<div key={log.id} style={{ display: 'flex', gap: 16 }}>
									<div
										style={{
											width: 8,
											height: 8,
											borderRadius: '50%',
											backgroundColor: 'secondary.main',
											marginTop: '6px',
											flexShrink: 0,
										}}
									/>
									<div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const }}>
										<span style={{ fontSize: 13 }}>
											<Highlight color="secondary.main">
												{log.first_name} {log.last_name}
											</Highlight>{' '}
											{log.action.toLowerCase()}d{' '}
											<Highlight>{log.entity_name.toLowerCase().replace('_', ' ')}</Highlight>
										</span>
										<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
											{dayjs(log.created_at).format('MMM D, YYYY [at] h:mm A')} (
											{dayjs(log.created_at).fromNow()})
										</span>
									</div>
								</div>
							))}
						</div>
					)}
				</Card>
			</div>
		</div>
	);
}
