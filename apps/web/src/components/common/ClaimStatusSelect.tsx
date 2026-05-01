import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import React, { useEffect } from 'react';
import { ClaimStatus } from '@/config/enums';
import ClaimStatusIcon from '../checklist/ClaimStatusIcon';
import Dropdown from '@/components/ui/Dropdown';

export default function ClaimStatusSelect({
	claimStatus,
	setClaimStatus,
	clearable = true,
	height,
	text = 'Filter by claim status',
	disabled = false,
}: {
	claimStatus: ClaimStatus | null;
	setClaimStatus: (newStatus: ClaimStatus | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const { data: options = [], isFetching } = useChecklistTrpc().list({});

	useEffect(() => {
		if (!clearable && options.length > 0) {
			setClaimStatus(ClaimStatus.IN_PROGRESS);
		}
	}, [options, clearable]);

	const dropdownOptions = [
		...(clearable ? [{ value: '', label: 'All' }] : []),
		...Object.values(ClaimStatus)
			.sort((a, b) => a.localeCompare(b))
			.map((status) => ({
				value: status,
				label: status,
				icon: <ClaimStatusIcon status={status} />,
			})),
	];

	return (
		<Dropdown
			inlineLabel
			label="Claim Status"
			options={dropdownOptions}
			value={claimStatus ?? ''}
			onChange={(val) => setClaimStatus(val === '' ? null : (String(val) as ClaimStatus))}
			placeholder={text}
			size="sm"
			disabled={disabled}
		/>
	);
}
