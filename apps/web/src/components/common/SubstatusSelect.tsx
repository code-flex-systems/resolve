import { Box, Chip, MenuItem, Paper, PopperProps, Typography } from '@mui/material';
import { useState } from 'react';
import BasicPopper from './BasicPopper';
import CheckCircle from '@mui/icons-material/CheckCircle';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { ClaimSubstatus } from '@/config/enums';
import { formatLabel } from '@/lib/utils/claimUtils';

export default function SubstatusSelect({
	substatus,
	setSubstatus,
	clearable = true,
	height,
	text = 'Filter by status',
	disabled = false,
}: {
	substatus: ClaimSubstatus | null;
	setSubstatus: (newStatus: ClaimSubstatus | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();

	return (
		<>
			<Chip
				label={substatus ? formatLabel(substatus) : text}
				icon={<CheckCircle sx={{ color: BASE_COLOR_LIGHT }} />}
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
						{Object.values(ClaimSubstatus)
							.sort((a, b) => a.localeCompare(b))
							.map((o) => (
								<MenuItem
									key={o}
									selected={substatus === o}
									value={o}
									onClick={() => {
										setSubstatus(o);
										setAnchorEl(null);
									}}
								>
									<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center">
										<Typography fontSize={13}>{formatLabel(o)}</Typography>
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
		mt: 0.625,
		minWidth: 200,
	},
};
