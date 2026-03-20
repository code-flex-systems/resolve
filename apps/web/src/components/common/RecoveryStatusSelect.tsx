import React from 'react';
import { RecoveryStatus } from '@/config/enums';
import { formatRecoveryStatus } from '@/lib/utils/recoveryUtils';
import Dropdown from '@/components/ui/Dropdown';

export default function RecoveryStatusSelect({
	recoveryStatus,
	setRecoveryStatus,
	clearable = true,
	height,
	text = 'Filter by recovery status',
	disabled = false,
}: {
	recoveryStatus: string | null;
	setRecoveryStatus: (newStatus: string | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const dropdownOptions = [
		...(clearable ? [{ value: '', label: 'All' }] : []),
		...Object.values(RecoveryStatus).map((status) => ({
			value: status,
			label: formatRecoveryStatus(status),
		})),
	];

	return (
		<Dropdown
			options={dropdownOptions}
			value={recoveryStatus ?? ''}
			onChange={(val) => setRecoveryStatus(val === '' ? null : String(val))}
			placeholder={text}
			size="sm"
			disabled={disabled}
		/>
	);
}
