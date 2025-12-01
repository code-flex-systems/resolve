'use client';

import { Autocomplete, Box, Paper, Stack, TextField, Typography } from '@mui/material';
import Checklist from '@mui/icons-material/Checklist';
import Description from '@mui/icons-material/Description';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';

interface ChecklistSelectModernProps {
	value: any;
	onChange: (checklist: any) => void;
	showIcon?: boolean;
	placeholder?: string;
}

/**
 * Modern, user-friendly checklist dropdown selector
 * Features:
 * - Big, easy-to-read menu items
 * - Checklist description displayed
 * - Page count badge
 * - No search (always shows all checklists)
 */
export default function ChecklistSelectModern({
	value,
	onChange,
	showIcon = true,
	placeholder = 'Select a checklist...',
}: ChecklistSelectModernProps) {
	const { data: checklists = [], isLoading } = useChecklistTrpc().list({});

	return (
		<Autocomplete
			value={value}
			onChange={(_, newValue) => onChange(newValue)}
			options={checklists}
			getOptionLabel={(option) => option?.name || ''}
			loading={isLoading}
			disableClearable={false}
			PaperComponent={(props) => (
				<Paper
					{...props}
					elevation={3}
					sx={{
						mt: 1,
						borderRadius: 2,
						maxHeight: 400,
					}}
				/>
			)}
			renderOption={(props, option) => {
				const pageCount = parseInt(option.page_count?.toString() ?? '0');

				return (
					<Box
						component="li"
						{...props}
						sx={{
							...styles.menuItem,
							'&.MuiAutocomplete-option': {
								minHeight: 80,
								padding: '16px',
							},
						}}
					>
						<Stack width="100%" spacing={0.5}>
							{/* Name and Page Count */}
							<Box display="flex" alignItems="center" justifyContent="space-between">
								<Box display="flex" alignItems="center" gap={1}>
									{showIcon && <Checklist sx={{ color: theme.palette.secondary.main, fontSize: 20 }} />}
									<Typography variant="subtitle1" fontSize={16} fontWeight={600}>
										{option.name}
									</Typography>
								</Box>
								<Box
									px={1.5}
									py={0.5}
									borderRadius={2}
									bgcolor={theme.palette.secondary.light}
									display="flex"
									alignItems="center"
									gap={0.5}
								>
									<Description sx={{ fontSize: 14, color: 'white' }} />
									<Typography fontSize={12} fontWeight={600} color="white">
										{pageCount} {pageCount === 1 ? 'page' : 'pages'}
									</Typography>
								</Box>
							</Box>

							{/* Description */}
							{option.description && (
								<Typography
									variant="body2"
									fontSize={13}
									color="text.secondary"
									sx={{
										display: '-webkit-box',
										WebkitLineClamp: 2,
										WebkitBoxOrient: 'vertical',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
									}}
								>
									{option.description}
								</Typography>
							)}

							{!option.description && (
								<Typography variant="caption" fontSize={12} color={BASE_COLOR_LIGHT} fontStyle="italic">
									No description provided
								</Typography>
							)}
						</Stack>
					</Box>
				);
			}}
			renderInput={(params) => (
				<TextField
					{...params}
					placeholder={placeholder}
					variant="outlined"
					InputProps={{
						...params.InputProps,
						startAdornment: showIcon ? (
							<Checklist sx={{ color: theme.palette.secondary.main, mr: 1, fontSize: 24 }} />
						) : null,
					}}
					sx={{
						'& .MuiOutlinedInput-root': {
							borderRadius: 2,
							fontSize: 15,
						},
					}}
				/>
			)}
			sx={{
				width: '100%',
			}}
		/>
	);
}

const styles = {
	menuItem: {
		borderBottom: '1px solid #f0f0f0',
		transition: 'background-color 0.2s ease',
		'&:hover': {
			backgroundColor: '#F0F7F5 !important',
		},
		'&:last-child': {
			borderBottom: 'none',
		},
		'&.Mui-focused': {
			backgroundColor: '#F0F7F5',
		},
	},
};
