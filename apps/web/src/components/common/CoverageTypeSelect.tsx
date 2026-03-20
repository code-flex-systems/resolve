import { MenuItem, Select, SelectProps, Box, Typography, FormControl, InputLabel, Skeleton } from '@mui/material';
import { trpc } from '@/lib/trpc';

interface CoverageTypeSelectProps extends Omit<SelectProps, 'children' | 'onChange'> {
	value: string;
	onChange: (value: string) => void;
	label?: string;
}

export default function CoverageTypeSelect({
	value,
	onChange,
	label = 'Coverage Type',
	fullWidth,
	...selectProps
}: CoverageTypeSelectProps) {
	const { data: options = [], isLoading } = trpc.referenceData.getReferenceOptions.useQuery(
		{ entity: 'loss_type' },
		{
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}
	);

	if (isLoading) {
		return <Skeleton variant="rounded" width="100%" height={40} />;
	}

	return (
		<FormControl fullWidth={fullWidth} size="small">
			<InputLabel shrink>{label}</InputLabel>
			<Select
				notched
				value={value}
				onChange={(e) => onChange(e.target.value as string)}
				label={label}
				displayEmpty
				renderValue={(selected) => {
					if (!selected) {
						return <Typography color="text.secondary">Select coverage type</Typography>;
					}
					const option = options.find((o) => o.value === selected);
					if (!option) return selected;
					return (
						<span style={{ display: 'flex', alignItems: 'center' }}>
							{option.icon_emoji && (
								<span style={{ fontSize: 14, marginRight: 8 }}>
									{option.icon_emoji}
								</span>
							)}
							<span>{option.display_label}</span>
						</span>
					);
				}}
				{...selectProps}
			>
				{options.map((option) => (
					<MenuItem key={option.value} value={option.value}>
						<span style={{ display: 'flex', alignItems: 'center' }}>
							{option.icon_emoji && (
								<span style={{ fontSize: 14, marginRight: 8 }}>
									{option.icon_emoji}
								</span>
							)}
							<span>{option.display_label}</span>
						</span>
					</MenuItem>
				))}
			</Select>
		</FormControl>
	);
}
