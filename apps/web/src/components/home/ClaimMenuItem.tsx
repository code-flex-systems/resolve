'use client';

import { Claim } from '@/types/types';
import { useChecklistsStore } from '@/stores/useChecklistsStore';
import ClaimListItem, { ClaimListItemData } from '@/components/common/ClaimListItem';

export default function ClaimMenuItem(props: {
	claim: Claim | null;
	onClose?: () => void;
	onSelect?: (claimId: string) => void;
	selected?: boolean;
}) {
	const { claim, onClose, onSelect, selected } = props;

	const handleClick = () => {
		if (onSelect && claim?.id) {
			// If onSelect is provided, use it (hero mode)
			onSelect(claim.id);
		} else {
			// Otherwise, use the store (standard mode)
			useChecklistsStore.getState().updateSelectedClaim(claim);
		}
		if (typeof onClose === 'function') onClose();
	};

	if (!claim) return null;

	// Map Claim to ClaimListItemData
	const claimData: ClaimListItemData = {
		id: claim.id,
		claim_number: claim.claim_number,
		client: claim.client,
		insured: claim.insured,
		claim_amount: claim.claim_amount,
		date_of_loss: claim.date_of_loss,
		recovery_status: claim.recovery_status,
		substatus: claim.substatus,
	};

	return (
		<ClaimListItem
			claim={claimData}
			onClick={handleClick}
			selected={selected}
			showStatusChip={true}
			showAmount={true}
			variant="menuItem"
		/>
	);
}
