import { MenuItem, TextField, TextFieldProps, Typography } from '@mui/material';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { IconLayoutBoard } from '@tabler/icons-react';

interface DeskLocationTypeSelectProps extends Omit<TextFieldProps, 'children' | 'select' | 'onChange' | 'value'> {
	value: number | null;
	onChange: (value: number | null) => void;
	placeholder?: string;
}

export default function DeskLocationTypeSelect({
	value,
	onChange,
	placeholder = 'Select a desk type...',
	...textFieldProps
}: DeskLocationTypeSelectProps) {
	const { data = { rows: [], count: 0 }, isFetching } = useDeskTrpc().listTypes({});

	return (
		<TextField
			label="Desk Location Type"
			select
			value={value ?? ''}
			onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
			disabled={isFetching}
			InputProps={{
				startAdornment: <IconLayoutBoard size={18} style={{ marginRight: 8, color: 'var(--text-secondary)' }} />,
			}}
			SelectProps={{
				displayEmpty: true,
				renderValue: (selected) => {
					if (!selected) {
						return <Typography color="text.secondary">{placeholder}</Typography>;
					}
					const option = data.rows.find((t) => t.id === selected);
					return option?.name || selected;
				},
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
