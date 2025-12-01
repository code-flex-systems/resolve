import { MenuItem, TextField, TextFieldProps } from '@mui/material';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import Desk from '@mui/icons-material/Desk';

interface DeskLocationTypeSelectProps extends Omit<TextFieldProps, 'children' | 'select' | 'onChange' | 'value'> {
	value: number | null;
	onChange: (value: number | null) => void;
}

export default function DeskLocationTypeSelect({ value, onChange, ...textFieldProps }: DeskLocationTypeSelectProps) {
	const { data = { rows: [], count: 0 }, isFetching } = useDeskTrpc().listTypes({});

	return (
		<TextField
			label="Desk Location Type"
			variant="standard"
			select
			value={value ?? ''}
			onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
			disabled={isFetching}
			InputProps={{
				startAdornment: <Desk sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />,
			}}
			{...textFieldProps}
			sx={styles.textFieldOverrides}
		>
			{data.rows.map((type) => (
				<MenuItem key={type.id} value={type.id}>
					{type.name}
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
