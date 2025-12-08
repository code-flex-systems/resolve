'use client';

import { Box } from '@mui/material';
import BasicDialog from '@/components/common/BasicDialog';
import ClaimSummary from './ClaimSummary';

interface ClaimSummaryDialogProps {
	claimId: number | null;
	open: boolean;
	onClose: () => void;
	onStartChecklist?: () => void;
}

export default function ClaimSummaryDialog({ claimId, open, onClose, onStartChecklist }: ClaimSummaryDialogProps) {
	if (!open || !claimId) return null;

	return (
		<BasicDialog title="Claim Details" onClose={onClose} width={500} showOverflow={false}>
			<Box height="100%" overflow="hidden">
				<ClaimSummary claimId={claimId} onStartChecklist={onStartChecklist} />
			</Box>
		</BasicDialog>
	);
}
