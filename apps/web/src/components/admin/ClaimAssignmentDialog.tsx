import { IconFileSearch } from '@tabler/icons-react';
import Card from '@/components/ui/Card';
import Collapse from '@/components/ui/Collapse';
import Chip from '@/components/ui/Chip';
import { useAdminStore } from '@/stores/useAdminStore';
import BasicDialog from '../common/BasicDialog';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { formatAmount, formatMDY } from '@/lib/utils/utils';
import StackedMetric from '../checklist/StackedMetric';
import ChecklistSelect from '../common/ChecklistSelect';
import { useEffect, useState } from 'react';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { GetChecklistOutput } from '@/hooks/trpc/useChecklistTrpc';
import { useFeedTrpc } from '@/hooks/trpc/useFeedTrpc';
import UserSearch from '../checklist/UserSearch';
import { StackedRow } from '../common/StackedRow';
import { formatRecoveryStatus } from '@/lib/utils/recoveryUtils';
import { formatCityState } from '@/schemas/addressSchemas';

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
		{ feedId: selectedFeedId ?? '', offset: progress },
		{ enabled: !!selectedFeedId, staleTime: 0 }
	);
	const { mutateAsync: assignClaim } = useClaimTrpc().assign;
	const feedName = feeds.find((f) => f.id === selectedFeedId)?.name ?? '';
	const formattedAssignee = `${user?.first ?? ''} ${user?.last ?? ''}`.trim();

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
			<div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
				<div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', paddingBottom: 8 }}>
					<ChecklistSelect
						checklist={checklist}
						setChecklist={setChecklist}
						text="Choose a checklist"
						clearable={false}
						disabled={!isFetchingNextClaim && !nextClaimData.claim}
					/>
				</div>
				<div
					style={{
						height: 345,
						borderRadius: 6,
						borderColor: 'primary.main',
						padding: 16,
						backgroundColor: 'rgba(34, 180, 255, 0.05)',
					}}
				>
					<div>
						<div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
							{isFetchingNextClaim && (
								<span style={{ fontStyle: 'italic' }}>
									Loading next claim...
								</span>
							)}
							{!isFetchingNextClaim && !nextClaimData.claim && (
								<span style={{ fontSize: 13 }}>You're all caught up!</span>
							)}
							{!isFetchingNextClaim && !!nextClaimData.claim && (
								<>
									<div
										style={{
											width: '100%',
											display: 'flex',
											justifyContent: 'flex-start',
											alignItems: 'flex-start',
											paddingInline: 8,
											paddingBottom: 16,
										}}
									>
										<StackedMetric
											value={nextClaimData.claim.claim_number!}
											subtext="Claim"
											icon={<IconFileSearch size={20} style={{ color: 'var(--text-accent)' }} />}
										/>
									</div>
									<div
										style={{
											width: '100%',
											display: 'flex',
											justifyContent: 'flex-start',
											alignItems: 'flex-start',
											paddingInline: 16,
										}}
									>
										<div style={{ width: '50%', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
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
												primary="Recovery Status"
												secondary={formatRecoveryStatus(nextClaimData.claim.recovery_status)}
											/>
										</div>
										<div style={{ width: '50%', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
											<StackedRow
												primary="Date of Loss"
												secondary={formatMDY(
													nextClaimData.claim.date_of_loss?.toString() ?? ''
												)}
											/>
											<StackedRow
												primary="Loss Location"
												secondary={formatCityState(nextClaimData.claim.loss_city, nextClaimData.claim.loss_state) || undefined}
											/>
											<StackedRow
												primary="Last Update By"
												secondary={`${nextClaimData.claim.last_updated_by} on ${formatMDY(nextClaimData.claim.last_update?.toString() ?? '')}`}
											/>
											<StackedRow
												primary="Actual Recovery"
												secondary={
													nextClaimData.claim.actual_recovery
														? formatAmount(nextClaimData.claim.actual_recovery, true)
														: '$0.00'
												}
											/>
										</div>
									</div>
								</>
							)}
						</div>
					</div>
				</div>
				<div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 8 }}>
					<div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
						<div style={{ backgroundColor: 'white', margin: 8, borderRadius: 4 }}>
							<UserSearch
								selectedUser={user}
								setSelectedUser={setUser}
								disabled={!isFetchingNextClaim && !nextClaimData.claim}
								fontSize={13}
							/>
						</div>

						<Collapse open={!!user}>
							<Chip
								color="info"
						>{`${formattedAssignee} <${user?.email}>`}</Chip>
						</Collapse>
					</div>
				</div>
			</div>
		</BasicDialog>
	);
}
