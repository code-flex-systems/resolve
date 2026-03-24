import React from 'react';
import { ClaimSubstatus } from '@/config/enums';
import { formatLabel } from '@/lib/utils/claimUtils';
import Dropdown from '@/components/ui/Dropdown';

export default function SubstatusSelect({
	substatus,
	setSubstatus,
	clearable = true,
	height,
	text = 'Filter by status',
	disabled = false,
}: {
	substatus: ClaimSubstatus | null;
	setSubstatus: (newStatus: ClaimSubstatus | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const dropdownOptions = [
		...(clearable ? [{ value: '', label: 'All' }] : []),
		...Object.values(ClaimSubstatus)
			.sort((a, b) => a.localeCompare(b))
			.map((status) => ({
				value: status,
				label: formatLabel(status),
			})),
	];

	return (
		<Dropdown
			label="Claim Substatus"
			options={dropdownOptions}
			value={substatus ?? ''}
			onChange={(val) => setSubstatus(val === '' ? null : (String(val) as ClaimSubstatus))}
			placeholder={text}
			size="sm"
			disabled={disabled}
		/>
	);
}
