import { MenuItem, Select, SelectProps, ListItemText, Box, CircularProgress, Typography } from '@mui/material';
import { trpc } from '@/lib/trpc';

interface CoverageTypeSelectProps extends Omit<SelectProps, 'children' | 'onChange'> {
	value: string;
	onChange: (value: string) => void;
}

export default function CoverageTypeSelect({ value, onChange, ...selectProps }: CoverageTypeSelectProps) {
	const { data: options = [], isLoading } = trpc.referenceData.getReferenceOptions.useQuery(
		{ entity: 'coverage_type' },
		{
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}
	);

	if (isLoading) {
		return (
			<Box display="flex" alignItems="center" padding="10px">
				<CircularProgress size={16} sx={{ mr: 1 }} />
				<Typography fontSize={13}>Loading...</Typography>
			</Box>
		);
	}

	return (
		<Select
			value={value}
			onChange={(e) => onChange(e.target.value as string)}
			variant="standard"
			{...selectProps}
			sx={styles.textFieldOverrides}
		>
			{options.map((option) => (
				<MenuItem key={option.value} value={option.value}>
					<Box display="flex" alignItems="center">
						{option.icon_emoji && (
							<Typography fontSize={14} sx={{ mr: 1 }}>
								{option.icon_emoji}
							</Typography>
						)}
						<ListItemText>{option.display_label}</ListItemText>
					</Box>
				</MenuItem>
			))}
		</Select>
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
