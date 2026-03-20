import CustomChip from '@/components/ui/Chip';
import React, { useState } from 'react';
import BasicPopper from './BasicPopper';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { IconMapPin } from '@tabler/icons-react';

interface DeskLocationFilterProps {
	value: number | null;
	onChange: (value: number | null) => void;
	deskLocationTypeId?: number | null;
	showInactive?: boolean;
	excludedLocationIds?: number[];
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
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
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

	const selectedLocation = filteredLocations.find((loc) => loc.id === value);
	const displayLabel = selectedLocation ? selectedLocation.name : label;
	const isDisabled = disabled || isFetching || !deskLocationTypeId;

	return (
		<>
			<span
				onClick={(e: React.MouseEvent) => {
				setAnchorEl(e.currentTarget as HTMLElement);
				e.preventDefault();
				e.stopPropagation();
			}}
				style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', margin: '5px 0px', opacity: isDisabled ? 0.5 : 1 }}
			>
				<CustomChip color={value ? 'info' : 'neutral'} size="sm">
				<IconMapPin size={20} style={{ color: value ? undefined : BASE_COLOR_LIGHT }} />
					<span>{displayLabel}</span>
				</CustomChip>
				{value && (
					<button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onChange(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}>x</button>
				)}
			</span>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: 8, marginTop: 5, minWidth: 220, maxHeight: 300, overflowY: 'auto' }}>
						{filteredLocations.length === 0 ? (
							<div style={{ padding: '8px 12px', borderRadius: 6, fontSize: 13 }}>
								<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
									No locations available
								</span>
							</div>
						) : (
							filteredLocations.map((location) => (
								<div
									key={location.id}
									style={{
										padding: '8px 12px',
										borderRadius: 6,
										cursor: 'pointer',
										fontSize: 13,
										backgroundColor: value === location.id ? 'var(--status-info-bg)' : undefined,
									}}
									onClick={() => {
										onChange(location.id);
										setAnchorEl(null);
									}}
								>
									<div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
										<IconMapPin size={16} style={{ color: BASE_COLOR_LIGHT, marginRight: 8 }} />
										<span style={{ fontSize: 13 }}>
											{location.name} {!location.is_active && '(Inactive)'}
										</span>
									</div>
								</div>
							))
						)}
					</div>
				</BasicPopper>
			)}
		</>
	);
}
