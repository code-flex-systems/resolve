'use client';
import { Box, TextField, TextFieldProps, Typography } from '@mui/material';
import dayjs from 'dayjs';

export default function BasicTextField(props: {
	label?: string;
	value?: string;
	type?: TextFieldProps['type'];
	variant?: TextFieldProps['variant'];
	placeholder?: string;
	width?: number | string;
	spaceBetween?: boolean;
	readOnly?: boolean;
	updateValue: (newValue: string) => void;
}) {
	const {
		label,
		value,
		variant,
		type,
		placeholder,
		width = 'fit-content',
		spaceBetween,
		readOnly,
		updateValue,
	} = props;

	const getFormattedInput = () => {
		if (!value) return '';
		switch (type) {
			case 'date':
				return dayjs(value).format('MM/DD/YY');
			case 'number':
				return `$${value.toLocaleString()}`;
			default:
				return value;
		}
	};

	return (
		<Box
			sx={{
				width: '100%',
				display: 'flex',
				justifyContent: spaceBetween ? 'space-between' : 'flex-start',
				alignItems: 'center',
				my: 0.5,
			}}
		>
			{label && (
				<Typography fontSize={13} fontWeight={500} mr={1} noWrap>
					{label}
				</Typography>
			)}
			{readOnly ? (
				<Box sx={{ width }}>
					<Typography fontSize={13} textAlign="right" noWrap>
						{getFormattedInput()}
					</Typography>
				</Box>
			) : (
				<TextField
					value={value}
					type={type}
					variant={variant}
					placeholder={placeholder}
					onChange={(e) => updateValue(e.target.value)}
					sx={{
						'& .MuiInputBase-root': {
							width,
							height: 25,
							fontSize: 13,
						},
					}}
				/>
			)}
		</Box>
	);
}
