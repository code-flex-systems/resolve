import { Chip, MenuItem, Paper, PopperProps } from '@mui/material';
import { useState } from 'react';
import BasicPopper from './BasicPopper';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { IconLayoutBoard } from '@tabler/icons-react';

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
				icon={<IconLayoutBoard size={20} style={{ color: value ? undefined : BASE_COLOR_LIGHT }} />}
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
								<div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
									<IconLayoutBoard size={16} style={{ color: BASE_COLOR_LIGHT, marginRight: 8 }} />
									<span style={{ fontSize: 13 }}>{type.name}</span>
								</div>
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
		mt: 0.625,
		minWidth: 220,
	},
};
