import { useAdminStore } from '@/stores/useAdminStore';
import BasicDialog from '../common/BasicDialog';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { Box, Chip, Collapse, Fade, Paper, Stack, Typography } from '@mui/material';
import { ContentPasteSearch } from '@mui/icons-material';
import { formatAmount, formatMDY } from '@/lib/utils/utils';
import StackedMetric from '../checklist/StackedMetric';
import theme, { BASE_COLOR } from '@/styles/theme';
import ChecklistSelect from '../common/ChecklistSelect';
import { useEffect, useState } from 'react';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { GetChecklistOutput } from '@/hooks/trpc/useChecklistTrpc';
import { useFeedTrpc } from '@/hooks/trpc/useFeedTrpc';
import UserSearch from '../checklist/UserSearch';
import { StackedRow } from '../common/StackedRow';

export default function ClaimAssignmentDialog() {
	const [progress, setProgress] = useState(0);
	const [count, setCount] = useState<number | null>(null);
	const [user, setUser] = useState<GetUserOutput | null>(null);
	const [checklist, setChecklist] = useState<GetChecklistOutput | null>(null);
	const selectedFeedId = useAdminStore((state) => state.selectedFeedId);
	const toggleClaimAssignmentDialog = useAdminStore((state) => state.toggleClaimAssignmentDialog);
	const { data: feeds = [], isFetching } = useFeedTrpc().list();
	const {
		data: nextClaimData = { claim: null, total: 0 },
		isFetching: isFetchingNextClaim,
		refetch,
	} = useClaimTrpc().getNextToAssign(
		{ feedId: selectedFeedId ?? -1, offset: progress },
		{ enabled: !!selectedFeedId, staleTime: 0 }
	);
	const { mutateAsync: assignClaim } = useClaimTrpc().assign;
	const feedName = feeds.find((f) => f.id === selectedFeedId)?.name ?? '';
	const formattedAssignee = `${user?.last ?? ''}, ${user?.first ?? ''}`;

	useEffect(() => {
		if (typeof nextClaimData.total === 'number') setCount(nextClaimData.total);
	}, [nextClaimData.total]);

	const onNext = async (direction = 1, skip = false) => {
		setUser(null);
		if (skip) {
			setProgress((prev) => prev + direction);
		} else {
			if (!nextClaimData.claim || !checklist || !user) return;
			try {
				await assignClaim({
					checklistId: checklist.id,
					claimId: nextClaimData.claim.id,
					assignee: user.id,
				});
			} catch (e) {
				console.error(e);
			}
			refetch();
		}
	};

	return (
		<BasicDialog
			title={`Assigning claims for ${feedName}`}
			primaryAction={{
				label: 'Assign',
				onClick: () => onNext(),
				disabled: isFetchingNextClaim || !checklist || !user,
			}}
			secondaryActions={[
				{
					label: 'Back',
					onClick: () => onNext(-1, true),
					disabled: progress === 0,
					color: BASE_COLOR,
				},
				{
					label: `Skip${count == null ? '' : ` (${count ? (count - progress - 1).toLocaleString() : 0} more)`}`,
					onClick: () => onNext(1, true),
					disabled: isFetchingNextClaim || (count ?? 0) - progress <= 1,
					color: 'secondary',
				},
			]}
			onClose={() => toggleClaimAssignmentDialog()}
			width={550}
		>
			<Stack width="100%" height="100%" display="flex" justifyContent="center" alignItems="center">
				<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center" paddingBottom="10px">
					<ChecklistSelect
						checklist={checklist}
						setChecklist={setChecklist}
						text="Choose a checklist"
						clearable={false}
						disabled={!isFetchingNextClaim && !nextClaimData.claim}
					/>
				</Box>
				<Paper elevation={0} style={{ height: 325 }} sx={styles.paper}>
					<Fade key={isFetchingNextClaim ? 'loading' : 'data'} in={true} unmountOnExit timeout={800}>
						<Stack width="100%" height="100%" display="flex" justifyContent="center" alignItems="center">
							{isFetchingNextClaim && (
								<Typography fontStyle="italic" fontSize={13}>
									Loading next claim...
								</Typography>
							)}
							{!isFetchingNextClaim && !nextClaimData.claim && (
								<Typography fontSize={15}>You're all caught up!</Typography>
							)}
							{!isFetchingNextClaim && !!nextClaimData.claim && (
								<>
									<Box
										width="100%"
										display="flex"
										justifyContent="flex-start"
										alignItems="flex-start"
										padding="0px 10px 20px"
									>
										<StackedMetric
											value={nextClaimData.claim.claim_number!}
											subtext="Claim"
											icon={<ContentPasteSearch sx={{ color: 'primary.main', fontSize: 20 }} />}
										/>
									</Box>
									<Box
										width="100%"
										display="flex"
										justifyContent="flex-start"
										alignItems="flex-start"
										padding="0px 20px"
									>
										<Stack
											width="50%"
											display="flex"
											justifyContent="flex-start"
											alignItems="flex-start"
										>
											<StackedRow primary="Client" secondary={nextClaimData.claim.client} />
											<StackedRow
												primary="Client Adjuster"
												secondary={nextClaimData.claim.client_adjuster}
											/>
											<StackedRow primary="Insured" secondary={nextClaimData.claim.insured} />
											<StackedRow
												primary="Claim Amount"
												secondary={formatAmount(nextClaimData.claim.claim_amount!, true)}
											/>
											<StackedRow
												primary="Total Incurred"
												secondary={formatAmount(nextClaimData.claim.total_incurred!, true)}
											/>
										</Stack>
										<Stack
											width="50%"
											display="flex"
											justifyContent="flex-start"
											alignItems="flex-start"
										>
											<StackedRow
												primary="Date of Loss"
												secondary={formatMDY(
													nextClaimData.claim.date_of_loss?.toString() ?? ''
												)}
											/>
											<StackedRow
												primary="Loss Location"
												secondary={nextClaimData.claim.loss_location}
											/>
											<StackedRow
												primary="Last Update By"
												secondary={`${nextClaimData.claim.last_updated_by} on ${formatMDY(nextClaimData.claim.last_update?.toString() ?? '')}`}
											/>
											<StackedRow
												primary="Expected Recovery"
												secondary={formatAmount(nextClaimData.claim.expected_recovery!, true)}
											/>
										</Stack>
									</Box>
								</>
							)}
						</Stack>
					</Fade>
				</Paper>
				<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center" paddingTop="10px">
					<Stack width="100%" display="flex" justifyContent="center" alignItems="center">
						<Box bgcolor="white" margin="10px" borderRadius={4}>
							<UserSearch
								selectedUser={user}
								setSelectedUser={setUser}
								disabled={!isFetchingNextClaim && !nextClaimData.claim}
								fontSize={13}
							/>
						</Box>

						<Collapse in={!!user}>
							<Chip
								label={`${formattedAssignee} <${user?.email}>`}
								onDelete={() => setUser(null)}
								color="primary"
							/>
						</Collapse>
					</Stack>
				</Box>
			</Stack>
		</BasicDialog>
	);
}

const styles = {
	paper: {
		borderRadius: 6,
		border: `1px solid ${theme.palette.primary.main}`,
		padding: '20px',
		bgcolor: 'rgba(34, 180, 255, 0.05)',
	},
};
