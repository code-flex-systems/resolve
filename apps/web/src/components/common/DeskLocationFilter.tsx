import { Chip, MenuItem, Paper, PopperProps } from '@mui/material';
import { useState } from 'react';
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
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();
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
			<Chip
				label={displayLabel}
				icon={<IconMapPin size={20} style={{ color: value ? undefined : BASE_COLOR_LIGHT }} />}
				onClick={(e) => {
					if (!isDisabled) {
						setAnchorEl(e.currentTarget);
						e.preventDefault();
						e.stopPropagation();
					}
				}}
				onDelete={value && clearable ? () => onChange(null) : undefined}
				sx={{
					...styles.chip,
					height,
					'& .MuiChip-icon': {
						color: value ? undefined : BASE_COLOR_LIGHT,
					},
				}}
				disabled={isDisabled}
			/>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<Paper sx={styles.paper}>
						{filteredLocations.length === 0 ? (
							<MenuItem disabled>
								<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
									No locations available
								</span>
							</MenuItem>
						) : (
							filteredLocations.map((location) => (
								<MenuItem
									key={location.id}
									selected={value === location.id}
									value={location.id}
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
								</MenuItem>
							))
						)}
					</Paper>
				</BasicPopper>
			)}
		</>
	);
}

const styles = {
	chip: {
		margin: '5px 0px',
	},
	paper: {
		mt: 0.625,
		minWidth: 220,
		maxHeight: 300,
		overflowY: 'auto',
	},
};
