import { Chip, Paper, PopperProps } from '@mui/material';
import { useState } from 'react';
import BasicPopper from './BasicPopper';
import Search from '@mui/icons-material/Search';
import { BASE_COLOR_LIGHT } from '@/styles/theme';

export default function RecoverySourceFilter({
	recoverySource,
	setRecoverySource,
	clearable = true,
	height,
	text = 'Filter by recovery source',
	disabled = false,
}: {
	recoverySource: string;
	setRecoverySource: (source: string) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();
	const [inputValue, setInputValue] = useState(recoverySource);

	const handleApply = () => {
		setRecoverySource(inputValue);
		setAnchorEl(null);
	};

	const handleClear = () => {
		setInputValue('');
		setRecoverySource('');
	};

	return (
		<>
			<Chip
				label={recoverySource || text}
				icon={<Search sx={{ color: BASE_COLOR_LIGHT }} />}
				onClick={(e) => {
					setAnchorEl(e.currentTarget);
					setInputValue(recoverySource);
					e.preventDefault();
					e.stopPropagation();
				}}
				onDelete={recoverySource && clearable ? handleClear : undefined}
				sx={{
					...styles.chip,
					height,
					'& .MuiChip-icon': {
						color: BASE_COLOR_LIGHT,
					},
				}}
				disabled={disabled}
			/>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<Paper sx={styles.paper}>
						<input
							type="text"
							placeholder="Search recovery source..."
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									handleApply();
								}
							}}
							style={styles.input}
							autoFocus
						/>
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
		minWidth: 250,
		padding: '10px',
	},
	input: {
		width: '100%',
		border: 'none',
		outline: 'none',
		fontSize: 13,
		padding: '5px',
	},
};
