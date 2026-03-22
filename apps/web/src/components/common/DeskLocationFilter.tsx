import React from 'react';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { IconMapPin } from '@tabler/icons-react';
import Dropdown from '@/components/ui/Dropdown';

interface DeskLocationFilterProps {
	value: string | null;
	onChange: (value: string | null) => void;
	deskLocationTypeId?: string | null;
	showInactive?: boolean;
	excludedLocationIds?: string[];
	clearable?: boolean;
	height?: number;
	label?: string;
	disabled?: boolean;
}

export default function DeskLocationFilter({
	value,
	onChange,
	deskLocationTypeId,
	showInactive = false,
	excludedLocationIds = [],
	clearable = true,
	height,
	label = 'Filter by desk location',
	disabled = false,
}: DeskLocationFilterProps) {
	const { data = { rows: [], count: 0 }, isFetching } = useDeskTrpc().listLocations(
		{
			deskLocationTypeId: deskLocationTypeId ?? undefined,
		},
		{
			enabled: !!deskLocationTypeId,
		}
	);

	// Filter by active status unless showInactive is true
	let filteredLocations = showInactive ? data.rows : data.rows.filter((loc) => loc.is_active);

	// Filter out excluded locations (but keep the currently selected one)
	if (excludedLocationIds.length > 0) {
		filteredLocations = filteredLocations.filter((loc) => loc.id === value || !excludedLocationIds.includes(loc.id));
	}

	const isDisabled = disabled || isFetching || !deskLocationTypeId;

	const dropdownOptions = [
		...(clearable ? [{ value: '', label: 'All' }] : []),
		...filteredLocations.map((location) => ({
			value: location.id,
			label: `${location.name}${!location.is_active ? ' (Inactive)' : ''}`,
			icon: <IconMapPin size={16} style={{ color: 'var(--text-muted)' }} />,
		})),
	];

	return (
		<Dropdown
			options={dropdownOptions}
			value={value ?? ''}
			onChange={(val) => onChange(val === '' ? null : String(val))}
			placeholder={label}
			size="sm"
			disabled={isDisabled}
		/>
	);
}
