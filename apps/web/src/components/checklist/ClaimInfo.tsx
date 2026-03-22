'use client';
import { useState } from 'react';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import BasicButtonStyled from '../common/BasicButtonStyled';
import ClaimSummaryDialog from '../admin/ClaimSummaryDialog';
import { IconClipboardSearch } from '@tabler/icons-react';

export default function ClaimInfo() {
	const { checklistId, claimId } = useChecklistParams();
	const [dialogOpen, setDialogOpen] = useState(false);
	const { data: claim } = useClaimTrpc().get(
		{ checklistId: checklistId!, claimId: claimId! },
		{ enabled: !!checklistId && !!claimId }
	);

	if (!claim) return <></>;
	return (
		<div  style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
			<BasicButtonStyled
				buttonProps={{
					onClick: () => setDialogOpen(true),
					startIcon: <IconClipboardSearch size={20} style={{ color: 'primary.main' }} />,
					sx: { mr: 0.5 },
				}}
			>
				{claim.claim_number}
			</BasicButtonStyled>
			<ClaimSummaryDialog
				claimId={claimId ?? null}
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				showChecklistProgress={false}
			/>
		</div>
	);
}
