import { TextField, TextFieldProps, Typography } from '@mui/material';
import dayjs from 'dayjs';

export default function BasicTextField(props: {
	label?: string,
	value?: string,
	type?: TextFieldProps['type'],
	variant?: TextFieldProps['variant'],
	placeholder?: string,
	width?: number | string,
	spaceBetween?: boolean,
	readOnly?: boolean,
	updateValue: (newValue: string) => void
}) {
	const { label, value, variant, type, placeholder, width = 'fit-content', spaceBetween, readOnly, updateValue } = props;

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
		<div
			style={{
				...styles.row,
				justifyContent: spaceBetween
					? 'space-between'
					: 'flex-start'
			}}
		>
			{label && <Typography fontSize={15} fontWeight='bold' marginRight='10px' noWrap>{label}</Typography>}
			{readOnly
				? (
					<div style={{ width }}>
						<Typography fontSize={15} textAlign='right' noWrap>
							{getFormattedInput()}
						</Typography>
					</div>
				)
				: (
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
								fontSize: '15px'
							}
						}}
					/>
				)
			}
		</div>
	);
};

const styles = {
	row: {
		width: '100%',
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		margin: '5px 0px'
	}
};