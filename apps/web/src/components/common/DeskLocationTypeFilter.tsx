import React from 'react';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { IconLayoutBoard } from '@tabler/icons-react';
import Dropdown from '@/components/ui/Dropdown';

interface DeskLocationTypeFilterProps {
	value: number | null;
	onChange: (value: number | null) => void;
	clearable?: boolean;
	height?: number;
	label?: string;
	disabled?: boolean;
}

export default function DeskLocationTypeFilter({
	value,
	onChange,
	clearable = true,
	height,
	label = 'Filter by desk type',
	disabled = false,
}: DeskLocationTypeFilterProps) {
	const { data = { rows: [], count: 0 }, isFetching } = useDeskTrpc().listTypes({});

	const dropdownOptions = [
		...(clearable ? [{ value: '', label: 'All' }] : []),
		...data.rows.map((type) => ({
			value: type.id,
			label: type.name,
			icon: <IconLayoutBoard size={16} style={{ color: 'var(--text-muted)' }} />,
		})),
	];

	return (
		<Dropdown
			options={dropdownOptions}
			value={value ?? ''}
			onChange={(val) => onChange(val === '' ? null : Number(val))}
			placeholder={label}
			size="sm"
			disabled={disabled || isFetching}
		/>
	);
}
