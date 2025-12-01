import { MenuItem, Select, SelectProps, ListItemIcon, ListItemText, Box } from '@mui/material';
import { CoverageType } from '@/config/enums';
import { COVERAGE_TYPE_CONFIG } from '@/lib/utils/coverageUtils';

interface CoverageTypeSelectProps extends Omit<SelectProps, 'children'> {
	value: CoverageType;
	onChange: (value: CoverageType) => void;
}

export default function CoverageTypeSelect({ value, onChange, ...selectProps }: CoverageTypeSelectProps) {
	return (
		<Select
			value={value}
			onChange={(e) => onChange(e.target.value as CoverageType)}
			variant="standard"
			{...selectProps}
			sx={styles.textFieldOverrides}
		>
			{Object.entries(COVERAGE_TYPE_CONFIG).map(([type, config]) => {
				const IconComponent = config.icon;
				return (
					<MenuItem key={type} value={type}>
						<Box display="flex" alignItems="center">
							<IconComponent fontSize="small" sx={{ mr: 1 }} />
							<ListItemText>{config.label}</ListItemText>
						</Box>
					</MenuItem>
				);
			})}
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
