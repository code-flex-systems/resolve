'use client';

import BasicDialog from '@/components/common/BasicDialog';
import ClaimSummary from './ClaimSummary';

interface ClaimSummaryDialogProps {
	claimId: string | null;
	open: boolean;
	onClose: () => void;
	onStartChecklist?: () => void;
	showChecklistProgress?: boolean;
}

export default function ClaimSummaryDialog({ claimId, open, onClose, onStartChecklist, showChecklistProgress = true }: ClaimSummaryDialogProps) {
	if (!open || !claimId) return null;

	return (
		<BasicDialog title="Claim Details" onClose={onClose} width={500}>
			<ClaimSummary claimId={claimId} onStartChecklist={onStartChecklist} showChecklistProgress={showChecklistProgress} />
		</BasicDialog>
	);
}
