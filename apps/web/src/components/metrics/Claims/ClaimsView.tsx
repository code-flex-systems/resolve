'use client';

import { Box, Divider, Fade, Paper, Stack, Typography } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Subject from '@mui/icons-material/Subject';
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
import { formatDateForSentence, formatMDY, getCurrentFiscalQuarterStart } from '@/lib/utils/utils';
import ClaimStatusSelect from '@/components/common/ClaimStatusSelect';
import { useMetricsStore } from '@/stores/useMetricsStore';

const Highlight = ({
	children,
	color = 'secondary.main',
	bold = true,
}: {
	children: React.ReactNode;
	color?: string;
	bold?: boolean;
}) => (
	<Box component="span" sx={{ color, fontWeight: bold ? 600 : 'inherit' }}>
		{children}
	</Box>
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
			<Stack
				flex={1}
				width="100%"
				display="flex"
				justifyContent="flex-start"
				alignItems="flex-start"
				padding="10px"
			>
				<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center">
					<Box marginRight="5px">
						<BasicButtonStyled
							icon={<ArrowBack />}
							buttonProps={{ onClick: () => router.back() }}
							tooltipProps={{ title: 'Back to dashboard' }}
						/>
					</Box>
					<Box marginRight="5px">
						<BasicDateRangePicker defaultLabel="This Quarter" defaultValue={range} onConfirm={setRange} />
					</Box>
					<Box marginRight="5px">
						<ChecklistSelect checklist={checklist} setChecklist={setChecklist} clearable={false} />
					</Box>
					<Box marginRight="5px">
						<ClaimStatusSelect claimStatus={selectedClaimStatus} setClaimStatus={setClaimStatus} />
					</Box>

					<UserFilter
						users={users}
						setUsers={setUsers}
						width="100%"
						text="Filter by current assignee"
						multi={false}
					/>
				</Box>
				<div style={styles.divider}>
					<Divider />
				</div>
				<Box
					width="100%"
					height="calc(100vh - 70px)"
					display="flex"
					justifyContent="flex-start"
					alignItems="flex-start"
					bgcolor="#F7F8FA"
					padding="20px"
				>
					<Stack width={400} height="100%" display="flex" justifyContent="flex-start" alignItems="flex-start">
						<Paper elevation={0} sx={styles.paper}>
							<Box
								width="100%"
								display="flex"
								justifyContent="flex-start"
								alignItems="center"
								paddingTop="10px"
								paddingLeft="10px"
							>
								{claim ? (
									<ClaimStatusIcon status={claim.status as ClaimStatus} fontSize={17} />
								) : (
									<CheckCircle sx={{ color: BASE_COLOR_LIGHT }} />
								)}
								<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginLeft="5px">
									Progress through {checklist?.name ?? 'checklist'}
								</Typography>
							</Box>

							<Fade key={claim ? 'data' : 'none'} in={true}>
								<Stack
									width="100%"
									height={150}
									display="flex"
									justifyContent="center"
									alignItems="center"
								>
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
										<Typography fontSize={14} width={250} color={BASE_COLOR_LIGHT}>
											Select a claim to see its progress through the checklist
										</Typography>
									)}
								</Stack>
							</Fade>
						</Paper>
						<Paper elevation={0} sx={{ ...styles.paper, flex: 1, marginTop: '20px' }}>
							<Box
								width="100%"
								display="flex"
								justifyContent="flex-start"
								alignItems="center"
								paddingTop="10px"
								paddingLeft="10px"
							>
								<Subject sx={{ color: BASE_COLOR_LIGHT }} />
								<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginLeft="5px">
									Details
								</Typography>
							</Box>
							<Fade key={claim ? 'data' : 'none'} in={true}>
								<Stack
									width="100%"
									height="100%"
									display="flex"
									justifyContent="center"
									alignItems="center"
									padding="0px 20px"
								>
									{!!claim && (
										<Stack
											width="100%"
											height="100%"
											display="flex"
											justifyContent="flex-start"
											alignItems="flex-start"
											paddingTop="20px"
										>
											<Typography fontSize={14}>
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
											</Typography>
											<Typography fontSize={14} paddingTop="10px">
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
											</Typography>
											<Box paddingTop="20px">
												<BasicButtonStyled
													buttonProps={{
														onClick: () => {
															router.push(
																`/checklist/${claim.checklist_id}/claim/${claim.claim_id}`
															);
														},
													}}
												>
													Open in checklist...
												</BasicButtonStyled>
											</Box>
											<Box paddingTop="10px">
												<BasicButtonStyled
													buttonProps={{
														onClick: () => {
															router.push(
																`/checklist/${claim.checklist_id}/claim/${claim.claim_id}/summary`
															);
														},
													}}
												>
													Go to checklist summary...
												</BasicButtonStyled>
											</Box>
											<Box paddingTop="10px">
												<BasicButtonStyled
													buttonProps={{
														onClick: () => {},
													}}
												>
													See activity...
												</BasicButtonStyled>
											</Box>
										</Stack>
									)}
									{!claim && (
										<Typography fontSize={14} width={250} color={BASE_COLOR_LIGHT}>
											Select a claim to see details
										</Typography>
									)}
								</Stack>
							</Fade>
						</Paper>
					</Stack>

					<ChecklistClaims checklistId={checklist?.id} user={users[0]} range={range} setClaim={setClaim} />
				</Box>
			</Stack>
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
		height: 1,
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
		padding: '20px',
		borderRadius: 6,
	},
	searchPaper: {
		border: 1,
		borderColor: 'divider',
		borderRadius: 3,
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		width: 200,
		height: 30,
	},
	table: {
		width: '49.5%',
		height: 'calc(100vh - 290px)',
		border: '1px solid #E0E0E0',
	},
	textField: {
		border: 'none',
		outline: 'none',
		padding: '2px 5px',
	},
};
