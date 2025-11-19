import { Box, Chip, MenuItem, Paper, PopperProps, Typography } from '@mui/material';
import { useState } from 'react';
import BasicPopper from './BasicPopper';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { LossType } from '@/config/enums';
import { LOSS_TYPE_ICONS, formatLossType } from '@/lib/utils/claimUtils';
import ReportProblem from '@mui/icons-material/ReportProblem';

export default function LossTypeSelect({
	lossType,
	setLossType,
	clearable = true,
	height,
	text = 'Filter by loss type',
	disabled = false,
}: {
	lossType: string | null;
	setLossType: (newType: string | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();

	const displayLabel = lossType ? formatLossType(lossType) : text;

	return (
		<>
			<Chip
				label={displayLabel}
				icon={
					lossType ? (
						<Box marginLeft="5px">
							<Typography fontSize={14}>{LOSS_TYPE_ICONS[lossType as LossType]}</Typography>
						</Box>
					) : (
						<ReportProblem sx={{ color: BASE_COLOR_LIGHT }} />
					)
				}
				onClick={(e) => {
					setAnchorEl(e.currentTarget);
					e.preventDefault();
					e.stopPropagation();
				}}
				onDelete={lossType && clearable ? () => setLossType(null) : undefined}
				sx={{
					...styles.chip,
					height,
					'& .MuiChip-icon': {
						color: lossType ? undefined : BASE_COLOR_LIGHT,
					},
				}}
				disabled={disabled}
			/>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<Paper sx={styles.paper}>
						{Object.values(LossType).map((type) => (
							<MenuItem
								key={type}
								selected={lossType === type}
								value={type}
								onClick={() => {
									setLossType(type);
									setAnchorEl(null);
								}}
							>
								<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center">
									<Typography fontSize={14}>{LOSS_TYPE_ICONS[type]}</Typography>
									<Typography fontSize={13} marginLeft="5px">
										{formatLossType(type)}
									</Typography>
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
