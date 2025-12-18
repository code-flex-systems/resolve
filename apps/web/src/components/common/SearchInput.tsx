'use client';

import { InputAdornment, TextField, TextFieldProps } from '@mui/material';
import Search from '@mui/icons-material/Search';
import Close from '@mui/icons-material/Close';
import { TEXT_SECONDARY } from '@/styles/theme';

export interface SearchInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	width?: number | string;
	size?: 'small' | 'medium';
	autoFocus?: boolean;
}

export default function SearchInput({
	value,
	onChange,
	placeholder = 'Search...',
	width = 240,
	size = 'small',
	autoFocus = false,
}: SearchInputProps) {
	return (
		<TextField
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={placeholder}
			size={size}
			autoFocus={autoFocus}
			sx={{
				width,
				'& .MuiOutlinedInput-root': {
					backgroundColor: '#ffffff',
					transition: 'all 0.2s ease',
					'&:hover': {
						backgroundColor: '#fafafa',
					},
					'&.Mui-focused': {
						backgroundColor: '#ffffff',
					},
				},
				'& .MuiOutlinedInput-input': {
					padding: size === 'small' ? '8px 12px' : '12px 14px',
					fontSize: 13,
					'&::placeholder': {
						color: TEXT_SECONDARY,
						opacity: 0.8,
					},
				},
			}}
			slotProps={{
				input: {
					startAdornment: (
						<InputAdornment position="start">
							<Search sx={{ fontSize: 18, color: TEXT_SECONDARY }} />
						</InputAdornment>
					),
					endAdornment: value ? (
						<InputAdornment position="end">
							<Close
								sx={{
									fontSize: 16,
									color: TEXT_SECONDARY,
									cursor: 'pointer',
									'&:hover': { color: '#0f172a' },
								}}
								onClick={() => onChange('')}
							/>
						</InputAdornment>
					) : null,
				},
			}}
		/>
	);
}
