import { MenuItem, TextField, TextFieldProps, Typography } from '@mui/material';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import LocationOn from '@mui/icons-material/LocationOn';

interface DeskLocationSelectProps extends Omit<TextFieldProps, 'children' | 'select' | 'onChange' | 'value'> {
	value: number | null;
	onChange: (value: number | null) => void;
	deskLocationTypeId?: number | null;
	showInactive?: boolean;
	excludedLocationIds?: number[];
	placeholder?: string;
}

export default function DeskLocationSelect({
	value,
	onChange,
	deskLocationTypeId,
	showInactive = false,
	excludedLocationIds = [],
	placeholder = 'Select a location...',
	...textFieldProps
}: DeskLocationSelectProps) {
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

	return (
		<TextField
			label="Desk Location"
			select
			value={value ?? ''}
			onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
			disabled={isFetching || !deskLocationTypeId}
			InputProps={{
				startAdornment: <LocationOn sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />,
			}}
			SelectProps={{
				displayEmpty: true,
				renderValue: (selected) => {
					if (!selected) {
						return <Typography color="text.secondary">{placeholder}</Typography>;
					}
					const option = filteredLocations.find((l) => l.id === selected);
					return option ? `${option.name}${!option.is_active ? ' (Inactive)' : ''}` : selected;
				},
			}}
			{...textFieldProps}
			sx={styles.textFieldOverrides}
		>
			{filteredLocations.map((location) => (
				<MenuItem key={location.id} value={location.id}>
					{location.name} {!location.is_active && '(Inactive)'}
				</MenuItem>
			))}
		</TextField>
	);
}

const styles = {
	textFieldOverrides: {
		width: 400,
		margin: '5px 0px',
		'& .MuiInputBase-root': {
			fontSize: 14,
			padding: '2px 5px',
		},
		'& .MuiOutlinedInput-input': {
			fontSize: 14,
			padding: '5px',
		},
	},
};
