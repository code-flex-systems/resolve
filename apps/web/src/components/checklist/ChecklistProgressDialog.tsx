'use client';

import { Box, Fade, Paper, Stack, Typography } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import Handshake from '@mui/icons-material/Handshake';
import PlayCircle from '@mui/icons-material/PlayCircle';
import StopCircle from '@mui/icons-material/StopCircle';
import Warning from '@mui/icons-material/Warning';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { BASE_COLOR } from '@/styles/theme';
import { useChecklistStore } from '@/stores/useChecklistStore';
import ExpandableTitle from '../common/ExpandableTitle';
import { ClaimStatus } from '@/config/enums';
import ClaimStatusIcon from './ClaimStatusIcon';
import { useMemo, useState } from 'react';
import { DialogAction } from '@/types/types';
import useIsAssigned from '@/hooks/useIsAssigned';
import ChecklistProgress from './ChecklistProgress';

export default function ChecklistProgressDialog() {
	const [confirmingStatus, setConfirmingStatus] = useState<ClaimStatus | null>(null);
	const isAssigned = useIsAssigned();
	const toggleChecklistHandoffDialog = useChecklistStore((state) => state.toggleChecklistHandoffDialog);
	const toggleChecklistProgressDialog = useChecklistStore((state) => state.toggleChecklistProgressDialog);
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const { data: progress = { answerCount: 0, totalQuestionCount: 0 }, isFetching: isFetchingProgress } =
		useChecklistTrpc().progress({ checklistId, claimId }, { enabled: checklistId !== -1 && claimId !== -1 });
	const { data: checklistClaim, isFetching: isFetchingChecklistClaim } = useChecklistTrpc().getForClaim(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
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
						toggleChecklistProgressDialog(false);
					} catch (e) {
						console.error(e);
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
					icon: <StopCircle />,
				},
				{
					label: 'Hand off',
					onClick: toggleChecklistHandoffDialog,
					icon: <Handshake />,
				},
			];
		}
		if (checklistClaim?.status === ClaimStatus.BLOCKED) {
			return [
				{
					label: "I'm unblocked",
					onClick: () => setConfirmingStatus(ClaimStatus.IN_PROGRESS),
					icon: <PlayCircle />,
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
			<Stack display="flex" justifyContent="center" alignContent="center" height={120}>
				<Paper elevation={0} sx={styles.paper}>
					<Fade
						key={confirmingStatus ?? 'none'}
						in={true}
						unmountOnExit
					>
						<Stack width="100%" display="flex" justifyContent="center" alignContent="center" height="100%">
							{!confirmingStatus && (
								<ChecklistProgress checklistId={checklistId} claimId={claimId} width={400} />
							)}

							{!!confirmingStatus && (
								<Box display="flex" justifyContent="flex-start" alignItems="center">
									<Warning sx={{ color: BASE_COLOR }} />
									<Stack
										display="flex"
										justifyContent="flex-start"
										alignItems="flex-start"
										marginLeft="10px"
									>
										{getStatusConfirmationMsg()
											.split('|')
											.map((part, i) => (
												<Typography key={i} fontSize={15}>
													{part}
												</Typography>
											))}
									</Stack>
								</Box>
							)}
						</Stack>
					</Fade>
				</Paper>
			</Stack>
		</BasicDialog>
	);
}

const styles = {
	paper: {
		borderRadius: 4,
		bgcolor: '#F7F8FA',
		padding: '20px 10px',
		height: 120,
		minHeight: 120,
		maxHeight: 120,
	},
};
