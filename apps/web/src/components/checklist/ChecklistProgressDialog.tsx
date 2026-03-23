'use client';

import BasicDialog from '../common/BasicDialog';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import Card from '@/components/ui/Card';
import { useChecklistStore } from '@/stores/useChecklistStore';
import ExpandableTitle from '../common/ExpandableTitle';
import { ClaimStatus } from '@/config/enums';
import ClaimStatusIcon from './ClaimStatusIcon';
import { useMemo, useState } from 'react';
import { DialogAction } from '@/types/types';
import useIsAssigned from '@/hooks/useIsAssigned';
import ChecklistProgress from './ChecklistProgress';
import { useCrudAlerts } from '@/hooks/useCrudAlerts';
import { IconAlertTriangle, IconHandStop, IconPlayerPlay, IconPlayerStop } from '@tabler/icons-react';

export default function ChecklistProgressDialog() {
	const [confirmingStatus, setConfirmingStatus] = useState<ClaimStatus | null>(null);
	const isAssigned = useIsAssigned();
	const toggleChecklistHandoffDialog = useChecklistStore((state) => state.toggleChecklistHandoffDialog);
	const toggleChecklistProgressDialog = useChecklistStore((state) => state.toggleChecklistProgressDialog);
	const { checklistId = '', claimId = '' } = useChecklistParams();
	const { showSuccess, showError } = useCrudAlerts('checklist status');
	const { data: progress = { answerCount: 0, totalQuestionCount: 0 }, isFetching: isFetchingProgress } =
		useChecklistTrpc().progress({ checklistId, claimId }, { enabled: !!checklistId && !!claimId });
	const { data: checklistClaim, isFetching: isFetchingChecklistClaim } = useChecklistTrpc().getForClaim(
		{ checklistId, claimId },
		{ enabled: !!checklistId && !!claimId }
	);
	const { mutateAsync: updateChecklistClaim, isPending } = useChecklistTrpc().updateForClaim;

	const primaryAction: DialogAction | undefined = useMemo(() => {
		if (!isAssigned) return;
		if (confirmingStatus) {
			return {
				label: "I'm sure",
				color: confirmingStatus === ClaimStatus.BLOCKED ? 'error' : undefined,
				disabled: isPending,
				onClick: async () => {
					try {
						await updateChecklistClaim({ status: confirmingStatus, checklistId, claimId });
						if (confirmingStatus) {
							showSuccess(
								'update',
								`Checklist marked as ${confirmingStatus.replace('_', ' ').toLowerCase()}`
							);
						}
						toggleChecklistProgressDialog(false);
					} catch (e) {
						showError('update', e, 'Failed to update checklist status');
					}
				},
			};
		}
		if (
			!isFetchingChecklistClaim &&
			progress.totalQuestionCount === progress.answerCount &&
			progress.totalQuestionCount !== 0 &&
			checklistClaim?.status === ClaimStatus.IN_PROGRESS
		) {
			return {
				label: 'Submit',
				onClick: () => setConfirmingStatus(ClaimStatus.SUBMITTED),
			};
		}
		return undefined;
	}, [
		confirmingStatus,
		isPending,
		isFetchingChecklistClaim,
		progress,
		checklistClaim,
		checklistId,
		claimId,
		isAssigned,
	]);

	const secondaryActions: DialogAction[] | undefined = useMemo(() => {
		if (!isAssigned) return;
		if (confirmingStatus) {
			return [
				{
					label: 'Never mind',
					disabled: isPending,
					onClick: () => setConfirmingStatus(null),
				},
			];
		}
		if (checklistClaim?.status === ClaimStatus.IN_PROGRESS) {
			return [
				{
					label: "I'm blocked",
					onClick: () => setConfirmingStatus(ClaimStatus.BLOCKED),
					color: 'error',
					icon: <IconPlayerStop size={20} />,
				},
				{
					label: 'Hand off',
					onClick: toggleChecklistHandoffDialog,
					icon: <IconHandStop size={20} />,
				},
			];
		}
		if (checklistClaim?.status === ClaimStatus.BLOCKED) {
			return [
				{
					label: "I'm unblocked",
					onClick: () => setConfirmingStatus(ClaimStatus.IN_PROGRESS),
					icon: <IconPlayerPlay size={20} />,
				},
			];
		}
		return undefined;
	}, [confirmingStatus, isPending, checklistClaim, checklistId, claimId, isAssigned]);

	const getStatusConfirmationMsg = () => {
		if (!confirmingStatus) return '';
		switch (confirmingStatus) {
			case ClaimStatus.BLOCKED:
				return `Are you sure you want to mark this claim as blocked?|You will no longer be able to make edits to the checklist.`;
			case ClaimStatus.SUBMITTED:
				return `Are you sure you want to submit this claim?|You will no longer be able to make edits to the checklist.`;
			case ClaimStatus.IN_PROGRESS:
				return `Are you sure you want to move this claim back to in-progress?`;
			default:
				return '';
		}
	};

	return (
		<BasicDialog
			title={
				isFetchingChecklistClaim ? (
					<></>
				) : (
					<ExpandableTitle
						key={isFetchingProgress ? 'loading' : 'loaded'}
						icon={
							<ClaimStatusIcon
								status={(checklistClaim?.status ?? ClaimStatus.UNWORKED) as ClaimStatus}
								fontSize={25}
							/>
						}
						title={isFetchingProgress ? 'Evaluating...' : (checklistClaim?.status ?? '')}
						color="white"
					/>
				)
			}
			primaryAction={primaryAction}
			secondaryActions={secondaryActions}
			onClose={() => toggleChecklistProgressDialog(false)}
			width={500}
			height={250}
		>
			<div style={{ display: 'flex', justifyContent: 'center', alignContent: 'center', height: 120 }}>
				<Card
					variant="float"
					padding="md"
					style={{ padding: '20px', height: 120, minHeight: 120, maxHeight: 120 }}
				>
					<div
						style={{
							width: '100%',
							display: 'flex',
							justifyContent: 'center',
							alignContent: 'center',
							flexDirection: 'column',
							height: '100%',
						}}
					>
						{!confirmingStatus && (
							<ChecklistProgress checklistId={checklistId} claimId={claimId} width={400} />
						)}

						{!!confirmingStatus && (
							<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
								<IconAlertTriangle size={20} style={{ color: 'var(--text-secondary)' }} />
								<div
									style={{
										display: 'flex',
										justifyContent: 'flex-start',
										alignItems: 'flex-start',
										marginLeft: '10px',
									}}
								>
									{getStatusConfirmationMsg()
										.split('|')
										.map((part, i) => (
											<span key={i} style={{ fontSize: 15 }}>
												{part}
											</span>
										))}
								</div>
							</div>
						)}
					</div>
				</Card>
			</div>
		</BasicDialog>
	);
}
