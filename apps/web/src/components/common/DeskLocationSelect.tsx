import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import Dropdown from '@/components/ui/Dropdown';

interface DeskLocationSelectProps {
	value: string | null;
	onChange: (value: string | null) => void;
	deskLocationTypeId?: string | null;
	showInactive?: boolean;
	excludedLocationIds?: string[];
	placeholder?: string;
	disabled?: boolean;
	required?: boolean;
	label?: string;
	fullWidth?: boolean;
}

export default function DeskLocationSelect({
	value,
	onChange,
	deskLocationTypeId,
	showInactive = false,
	excludedLocationIds = [],
	placeholder = 'Select a location...',
	disabled,
	required,
	label = 'Desk Location',
	fullWidth,
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
		filteredLocations = filteredLocations.filter(
			(loc) => loc.id === value || !excludedLocationIds.includes(loc.id)
		);
	}

	return (
		<Dropdown
			label={label}
			options={filteredLocations.map((location) => ({
				value: location.id,
				label: `${location.name}${!location.is_active ? ' (Inactive)' : ''}`,
			}))}
			value={value}
			onChange={(v) => onChange(String(v))}
			disabled={!deskLocationTypeId || isFetching || disabled}
			placeholder={placeholder}
			required={required}
			fullWidth={fullWidth}
			renderValue={(val) => {
				const option = filteredLocations.find((l) => l.id === val);
				return (
					<span>
						{option ? `${option.name}${!option.is_active ? ' (Inactive)' : ''}` : String(val)}
					</span>
				);
			}}
		/>
	);
}
