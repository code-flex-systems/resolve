'use client';

import { CardContent } from '@mui/material';
import PageWrapper from '@/components/common/PageWrapper';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { useState } from 'react';
import { DateRange } from '@mui/x-date-pickers-pro';
import dayjs, { Dayjs } from 'dayjs';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import { useRouter } from 'next/navigation';
import ChecklistSelect from '@/components/common/ChecklistSelect';
import BasicDateRangePicker from '@/components/common/BasicDateRangePicker';
import UserFilter from '@/components/common/UserFilter';
import ClaimFilter from '@/components/common/ClaimFilter';
import { ChecklistClaimsOutput, GetChecklistOutput } from '@/hooks/trpc/useChecklistTrpc';
import ChecklistProgress from '@/components/checklist/ChecklistProgress';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import CheckGradient from '@/components/common/CheckGradient';
import ChecklistClaims from './ChecklistClaims';
import ClaimStatusIcon from '@/components/checklist/ClaimStatusIcon';
import { ClaimStatus } from '@/config/enums';
import { formatAmount, formatDateForSentence, formatMDY, getCurrentFiscalQuarterStart } from '@/lib/utils/utils';
import ClaimStatusSelect from '@/components/common/ClaimStatusSelect';
import { useMetricsStore } from '@/stores/useMetricsStore';
import { formatCurrency } from '@/lib/utils/recoveryUtils';
import { IconArrowLeft, IconCircleCheck, IconFileText } from '@tabler/icons-react';
import Divider from '@/components/ui/Divider';

const Highlight = ({
	children,
	color = 'secondary.main',
	bold = true,
}: {
	children: React.ReactNode;
	color?: string;
	bold?: boolean;
}) => (
	<div style={{ color, fontWeight: bold ? 600 : 'inherit' }}>
		{children}
	</div>
);

export default function ClaimsView() {
	const router = useRouter();
	const today = dayjs();
	const currentQuarterStart = getCurrentFiscalQuarterStart();
	const [range, setRange] = useState<DateRange<Dayjs>>([currentQuarterStart.startOf('day'), today.endOf('day')]);
	const [users, setUsers] = useState<GetUserOutput[]>([]);
	const [checklist, setChecklist] = useState<GetChecklistOutput | null>(null);
	const [claim, setClaim] = useState<ChecklistClaimsOutput[number] | null>(null);
	const selectedClaimStatus = useMetricsStore((state) => state.selectedClaimStatus);
	const setClaimStatus = useMetricsStore((state) => state.setClaimStatus);
	const isClaimSubmitted = claim?.status === ClaimStatus.SUBMITTED;
	const isClaimBlocked = claim?.status === ClaimStatus.BLOCKED;

	return (
		<PageWrapper>
			<div
style={{ flex: 1, width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', padding: '10px' }}>
				<div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
					<div style={{ marginRight: '5px' }}>
						<BasicButtonStyled
							icon={<IconArrowLeft size={20} />}
							buttonProps={{ onClick: () => router.back() }}
							tooltipProps={{ title: 'Back to dashboard' }}
						/>
					</div>
					<div style={{ marginRight: '5px' }}>
						<BasicDateRangePicker defaultLabel="This Quarter" defaultValue={range} onConfirm={setRange} />
					</div>
					<div style={{ marginRight: '5px' }}>
						<ChecklistSelect checklist={checklist} setChecklist={setChecklist} clearable={false} />
					</div>
					<div style={{ marginRight: '5px' }}>
						<ClaimStatusSelect claimStatus={selectedClaimStatus} setClaimStatus={setClaimStatus} />
					</div>

					<UserFilter
						users={users}
						setUsers={setUsers}
						width="100%"
						text="Filter by current assignee"
						multi={false}
					/>
				</div>
				<div style={styles.divider}>
					<Divider />
				</div>
				<div
style={{ width: '100%', height: 'calc(100vh - 70px)', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', padding: '20px', overflow: 'auto' }}>
					<div style={{ width: 400, height: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
						<div style={styles.paper}>
							<div
style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', paddingTop: '10px', paddingLeft: '10px' }}>
								{claim ? (
									<ClaimStatusIcon status={claim.status as ClaimStatus} fontSize={17} />
								) : (
									<IconCircleCheck size={20} style={{ color: BASE_COLOR_LIGHT }} />
								)}
								<span style={{ fontSize: 13, color: BASE_COLOR_LIGHT, marginLeft: '5px' }}>
									Progress through {checklist?.name ?? 'checklist'}
								</span>
							</div>

							<div>
								<div
style={{ width: '100%', height: 150, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
									{!!claim && (
										<ChecklistProgress
											checklistId={checklist?.id ?? -1}
											claimId={claim?.claim_id ?? -1}
											width={300}
											fontSize={15}
											showInfo={false}
										/>
									)}
									{!claim && (
										<span style={{ fontSize: 14, width: 250, color: BASE_COLOR_LIGHT }}>
											Select a claim to see its progress through the checklist
										</span>
									)}
								</div>
							</div>
						</div>
						<div style={{ ...styles.paper, flex: 1, marginTop: '20px' }}>
							<div
style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', paddingTop: '10px', paddingLeft: '10px' }}>
								<IconFileText size={20} style={{ color: BASE_COLOR_LIGHT }} />
								<span style={{ fontSize: 13, color: BASE_COLOR_LIGHT, marginLeft: '5px' }}>
									Details
								</span>
							</div>
							<div>
								<div
style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0px 20px' }}>
									{!!claim && (
										<div
style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', paddingTop: '20px' }}>
											<span style={{ fontSize: 30, color: 'primary' }}>
												{claim.claim_number}
											</span>
											<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
												<CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
													<span style={{ color: '#d9d9d9', fontSize: 15 }}>
														Actual Recovery
													</span>
													<span style={{ fontSize: 18 }}>
														{formatAmount(claim.actual_recovery ?? 0, true)}
													</span>
												</CardContent>
											</div>
											<span style={{ fontSize: 14, marginTop: '10px' }}>
												{claim.assignee === claim.created_by ? (
													<>
														This claim{' '}
														{isClaimSubmitted
															? 'was submitted by'
															: 'is currently being worked by '}
														<Highlight>
															{claim.assignee_first} {claim.assignee_last}
														</Highlight>
														.
													</>
												) : (
													<>
														The initial assignee{' '}
														<Highlight>
															{claim.created_by_first} {claim.created_by_last}
														</Highlight>
														{isClaimSubmitted
															? ' handed off this claim '
															: ' has handed off this claim '}
														to{' '}
														<Highlight>
															{claim.assignee_first} {claim.assignee_last}
														</Highlight>
														{isClaimSubmitted && ' before submission'}.
													</>
												)}
											</span>
											<span style={{ fontSize: 14, paddingTop: '10px' }}>
												{claim.updated_at ? (
													isClaimBlocked ? (
														<>
															The claim has been blocked since{' '}
															{formatMDY(claim.updated_at)}.
														</>
													) : (
														<>
															The last update was made{' '}
															{formatDateForSentence(formatMDY(claim.updated_at))}.
														</>
													)
												) : (
													<>
														No action has been taken since the claim was assigned{' '}
														{formatDateForSentence(formatMDY(claim.created_at))}.
													</>
												)}
											</span>
											<div style={{ paddingTop: '20px' }}>
												<BasicButtonStyled
													buttonProps={{
														onClick: () => {
															router.push(
																`/checklist/${claim.checklist_id}/claim/${claim.claim_id}`
															);
														},
													}}>
													Open in checklist...
												</BasicButtonStyled>
											</div>
											<div style={{ paddingTop: '10px' }}>
												<BasicButtonStyled
													buttonProps={{
														onClick: () => {
															router.push(
																`/checklist/${claim.checklist_id}/claim/${claim.claim_id}/summary`
															);
														},
													}}>
													Go to checklist summary...
												</BasicButtonStyled>
											</div>
											<div style={{ paddingTop: '10px' }}>
												<BasicButtonStyled
													buttonProps={{
														onClick: () => {},
													}}>
													See activity...
												</BasicButtonStyled>
											</div>
										</div>
									)}
									{!claim && (
										<span style={{ fontSize: 14, width: 250, color: BASE_COLOR_LIGHT }}>
											Select a claim to see details
										</span>
									)}
								</div>
							</div>
						</div>
					</div>

					<ChecklistClaims checklistId={checklist?.id} user={users[0]} range={range} setClaim={setClaim} />
				</div>
			</div>
		</PageWrapper>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		padding: '0px 10px',
	},
	containerInner: {
		width: '100%',
		height: 'calc(100vh - 60px)',
		padding: '20px 0px 10px',
	},
	divider: {
		width: '100%',
	},
	dividerDot: {
		minWidth: 5,
		width: 5,
		height: 5,
		borderRadius: 10,
		backgroundColor: '#d9d9d9',
		margin: '0px 5px',
	},
	paper: {
		width: '100%',
		height: 'fit-content',
		zIndex: 10,
		padding: '24px',
		borderRadius: 6,
	},
	table: {
		width: '49.5%',
		height: 'calc(100vh - 290px)',
		border: '1px solid #E0E0E0',
	},
};
