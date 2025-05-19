'use client';
import { useChecklistsSlice } from '@/state/store';
import BasicDialog from '../common/BasicDialog';
import * as actions from '@/state/checklists/actions';
import * as checklistActions from '@/state/checklist/actions';
import { Fade, Typography } from '@mui/material';
import { LineWobble } from 'ldrs/react';
import 'ldrs/react/LineWobble.css';
import theme from '@/styles/theme';
import { JSX, useCallback, useEffect, useState } from 'react';
import { ArrowCircleRightOutlined, Checklist, ContentPasteSearch } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';

export default function ChecklistClaimDialog() {
	const router = useRouter();
	const selectedChecklist = useChecklistsSlice((state) => state.selectedChecklist);
	const selectedClaim = useChecklistsSlice((state) => state.selectedClaim);
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
		(data?: any) => {
			setTimeout(() => {
				setShowMsg(false);
				setTimeout(() => {
					setShowMsg(true);
					setMsg(
						data
							? 'A checklist has been started for the selected claim.'
							: 'No checklist has been started for the selected claim.'
					);
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
					<ContentPasteSearch sx={styles.icon} />
					<Typography fontSize={17} fontWeight="bold" lineHeight="21px">
						{selectedClaim?.claim_number ?? ''}
					</Typography>
					<Checklist sx={{ ...styles.icon, marginLeft: '10px' }} />
					<Typography fontSize={17} fontWeight="bold" lineHeight="21px">
						{selectedChecklist?.name ?? ''}
					</Typography>
				</div>
			}
			width={500}
			height={175}
			primaryAction={
				searching
					? undefined
					: {
							label: data ? 'Keep working' : 'Get started',
							onClick: () => {
								checklistActions.setChecklistData(selectedChecklist!);
								checklistActions.setClaimData(selectedClaim!);
								router.push(`/checklist/${selectedChecklist?.id}/claim/${selectedClaim?.id}`);
							},
							icon: <ArrowCircleRightOutlined sx={{ color: 'white' }} />,
					  }
			}
			onClose={actions.toggleChecklistClaimDialog}
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
					<LineWobble size="200" stroke="5" bgOpacity="0.1" speed="2.5" color={theme.palette.primary.main} />
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
