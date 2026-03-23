'use client';
import { useState } from 'react';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import ClaimSummaryDialog from '../admin/ClaimSummaryDialog';
import { IconFileText } from '@tabler/icons-react';
import Button from '@/components/ui/Button';

export default function ClaimInfo() {
	const { checklistId, claimId } = useChecklistParams();
	const [dialogOpen, setDialogOpen] = useState(false);
	const { data: claim } = useClaimTrpc().get(
		{ checklistId: checklistId!, claimId: claimId! },
		{ enabled: !!checklistId && !!claimId }
	);

	if (!claim) return <></>;
	return (
		<>
			<Button
				variant="ghost"
				color="neutral"
				size="sm"
				startIcon={<IconFileText size={14} />}
				onClick={() => setDialogOpen(true)}
			>
				{claim.claim_number}
			</Button>
			<ClaimSummaryDialog
				claimId={claimId ?? null}
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				showChecklistProgress={false}
			/>
		</>
	);
}
