'use client';
import { useChecklistsStore } from '@/stores/useChecklistsStore';
import BasicDialog from '../common/BasicDialog';
import { Chip, Fade, Skeleton, Typography } from '@mui/material';
import { JSX, useCallback, useEffect, useState } from 'react';
import ArrowCircleRightOutlined from '@mui/icons-material/ArrowCircleRightOutlined';
import Checklist from '@mui/icons-material/Checklist';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import { useRouter } from 'next/navigation';
import { ChecklistClaim, useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { ClaimStatus } from '@/config/enums';

function getStatusMsg(data: ChecklistClaim) {
	if (data) {
		switch (data.status as ClaimStatus) {
			case ClaimStatus.SUBMITTED:
				return 'A checklist has been submitted for the selected claim.';
			case ClaimStatus.IN_PROGRESS:
				return 'A checklist is in progress for the selected claim.';
			case ClaimStatus.UNWORKED:
				return 'A checklist has been started for the selected claim.';
			case ClaimStatus.BLOCKED:
				return 'A checklist is blocked on this claim.';
		}
	} else {
		return 'No checklist has been started for the selected claim.';
	}
}

export default function ChecklistClaimDialog() {
	const router = useRouter();
	const selectedChecklist = useChecklistsStore((state) => state.selectedChecklist);
	const selectedClaim = useChecklistsStore((state) => state.selectedClaim);
	const toggleChecklistClaimDialog = useChecklistsStore((state) => state.toggleChecklistClaimDialog);
	const { isFetching, data } = useChecklistTrpc().getForClaim(
		{
			checklistId: selectedChecklist?.id ?? -1,
			claimId: selectedClaim?.id ?? -1,
		},
		{
			enabled: !!selectedChecklist && !!selectedClaim,
		}
	);
	const [msg, setMsg] = useState<JSX.Element | string>('Searching...');
	const [showMsg, setShowMsg] = useState(true);
	const [searching, setSearching] = useState(false);

	const flash = useCallback(
		(data: ChecklistClaim) => {
			setTimeout(() => {
				setShowMsg(false);
				setTimeout(() => {
					setShowMsg(true);
					setMsg(getStatusMsg(data));
				}, 300);
			}, 500);
		},
		[selectedChecklist, selectedClaim]
	);

	useEffect(() => {
		if (isFetching) {
			setSearching(true);
		} else {
			setTimeout(() => setSearching(false), 500);
		}
	}, [isFetching]);

	useEffect(() => {
		if (!isFetching) flash(data);
	}, [data, isFetching, flash]);

	return (
		<BasicDialog
			title={
				<div className="flex-row-left">
					<Chip icon={<ContentPasteSearch />} label={selectedClaim?.claim_number ?? ''} />
					<Chip icon={<Checklist />} label={selectedChecklist?.name ?? ''} sx={{ marginLeft: '5px' }} />
				</div>
			}
			width={500}
			height={175}
			primaryAction={
				searching
					? undefined
					: {
							label: data
								? data.status === ClaimStatus.SUBMITTED
									? 'Review'
									: 'Keep working'
								: 'Get started',
							onClick: () =>
								router.push(`/checklist/${selectedChecklist?.id}/claim/${selectedClaim?.id}`),
							icon: <ArrowCircleRightOutlined sx={{ color: 'white' }} />,
						}
			}
			onClose={toggleChecklistClaimDialog}
		>
			<Fade in={showMsg}>
				<div className="flex-row-center">
					<Typography fontStyle="italic" marginBottom="5px">
						{msg}
					</Typography>
				</div>
			</Fade>
			<Fade in={searching}>
				<div className="flex-row-center">
					<Skeleton variant="rounded" width={200} height={8} sx={{ borderRadius: 4 }} />
				</div>
			</Fade>
		</BasicDialog>
	);
}

const styles = {
	icon: {
		marginRight: '5px',
	},
	p: {
		margin: 0,
	},
};
