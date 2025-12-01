import { Box, Chip, MenuItem, Paper, PopperProps, Typography } from '@mui/material';
import { useState } from 'react';
import BasicPopper from './BasicPopper';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import Desk from '@mui/icons-material/Desk';

interface DeskLocationTypeFilterProps {
	value: number | null;
	onChange: (value: number | null) => void;
	clearable?: boolean;
	height?: number;
	label?: string;
	disabled?: boolean;
}

export default function DeskLocationTypeFilter({
	value,
	onChange,
	clearable = true,
	height,
	label = 'Filter by desk type',
	disabled = false,
}: DeskLocationTypeFilterProps) {
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();
	const { data = { rows: [], count: 0 }, isFetching } = useDeskTrpc().listTypes({});

	const selectedType = data.rows.find((type) => type.id === value);
	const displayLabel = selectedType ? selectedType.name : label;

	return (
		<>
			<Chip
				label={displayLabel}
				icon={<Desk sx={{ color: value ? undefined : BASE_COLOR_LIGHT }} />}
				onClick={(e) => {
					if (!disabled && !isFetching) {
						setAnchorEl(e.currentTarget);
						e.preventDefault();
						e.stopPropagation();
					}
				}}
				onDelete={value && clearable ? () => onChange(null) : undefined}
				sx={{
					...styles.chip,
					height,
					'& .MuiChip-icon': {
						color: value ? undefined : BASE_COLOR_LIGHT,
					},
				}}
				disabled={disabled || isFetching}
			/>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<Paper sx={styles.paper}>
						{data.rows.map((type) => (
							<MenuItem
								key={type.id}
								selected={value === type.id}
								value={type.id}
								onClick={() => {
									onChange(type.id);
									setAnchorEl(null);
								}}
							>
								<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center">
									<Desk sx={{ fontSize: 16, color: BASE_COLOR_LIGHT, mr: 1 }} />
									<Typography fontSize={13}>{type.name}</Typography>
								</Box>
							</MenuItem>
						))}
					</Paper>
				</BasicPopper>
			)}
		</>
	);
}

const styles = {
	chip: {
		margin: '5px 0px',
	},
	paper: {
		outline: 1,
		outlineColor: 'divider',
		marginTop: '5px',
		minWidth: 220,
	},
};
