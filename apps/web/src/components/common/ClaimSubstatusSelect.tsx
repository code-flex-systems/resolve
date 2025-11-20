import { Chip, MenuItem, Paper, PopperProps, Typography } from '@mui/material';
import { useState } from 'react';
import BasicPopper from './BasicPopper';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { ClaimSubstatus } from '@/config/enums';
import { formatLabel } from '@/lib/utils/claimUtils';
import FactCheck from '@mui/icons-material/FactCheck';

export default function ClaimSubstatusSelect({
	substatus,
	setSubstatus,
	clearable = true,
	height,
	text = 'Filter by substatus',
	disabled = false,
}: {
	substatus: string | null;
	setSubstatus: (newSubstatus: string | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();

	const displayLabel = substatus ? formatLabel(substatus) : text;

	return (
		<>
			<Chip
				label={displayLabel}
				icon={<FactCheck sx={{ color: substatus ? undefined : BASE_COLOR_LIGHT }} />}
				onClick={(e) => {
					setAnchorEl(e.currentTarget);
					e.preventDefault();
					e.stopPropagation();
				}}
				onDelete={substatus && clearable ? () => setSubstatus(null) : undefined}
				sx={{
					...styles.chip,
					height,
					'& .MuiChip-icon': {
						color: substatus ? undefined : BASE_COLOR_LIGHT,
					},
				}}
				disabled={disabled}
			/>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<Paper sx={styles.paper}>
						{Object.values(ClaimSubstatus).map((status) => (
							<MenuItem
								key={status}
								selected={substatus === status}
								value={status}
								onClick={() => {
									setSubstatus(status);
									setAnchorEl(null);
								}}
							>
								<Typography fontSize={13}>{formatLabel(status)}</Typography>
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
		minWidth: 200,
	},
};
