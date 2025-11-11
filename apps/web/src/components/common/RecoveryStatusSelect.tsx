import { Box, Chip, MenuItem, Paper, PopperProps, Typography } from '@mui/material';
import { useState } from 'react';
import BasicPopper from './BasicPopper';
import CheckCircle from '@mui/icons-material/CheckCircle';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { RecoveryStatus } from '@/config/enums';
import AccountBalance from '@mui/icons-material/AccountBalance';

const STATUS_ICONS = {
	[RecoveryStatus.PENDING]: '⏳',
	[RecoveryStatus.IN_PROGRESS]: '🔄',
	[RecoveryStatus.RECOVERED]: '✅',
	[RecoveryStatus.CLOSED_NO_RECOVERY]: '❌',
};

const STATUS_LABELS = {
	[RecoveryStatus.PENDING]: 'Pending',
	[RecoveryStatus.IN_PROGRESS]: 'In Progress',
	[RecoveryStatus.RECOVERED]: 'Recovered',
	[RecoveryStatus.CLOSED_NO_RECOVERY]: 'Closed - No Recovery',
};

export default function RecoveryStatusSelect({
	recoveryStatus,
	setRecoveryStatus,
	clearable = true,
	height,
	text = 'Filter by recovery status',
	disabled = false,
}: {
	recoveryStatus: string | null;
	setRecoveryStatus: (newStatus: string | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();

	const displayLabel = recoveryStatus ? STATUS_LABELS[recoveryStatus as RecoveryStatus] : text;

	return (
		<>
			<Chip
				label={displayLabel}
				icon={
					recoveryStatus ? (
						<Box marginLeft="5px">
							<Typography fontSize={14}>{STATUS_ICONS[recoveryStatus as RecoveryStatus]}</Typography>
						</Box>
					) : (
						<AccountBalance sx={{ color: BASE_COLOR_LIGHT }} />
					)
				}
				onClick={(e) => {
					setAnchorEl(e.currentTarget);
					e.preventDefault();
					e.stopPropagation();
				}}
				onDelete={recoveryStatus && clearable ? () => setRecoveryStatus(null) : undefined}
				sx={{
					...styles.chip,
					height,
					'& .MuiChip-icon': {
						color: recoveryStatus ? undefined : BASE_COLOR_LIGHT,
					},
				}}
				disabled={disabled}
			/>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<Paper sx={styles.paper}>
						{Object.values(RecoveryStatus).map((status) => (
							<MenuItem
								key={status}
								selected={recoveryStatus === status}
								value={status}
								onClick={() => {
									setRecoveryStatus(status);
									setAnchorEl(null);
								}}
							>
								<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center">
									<Typography fontSize={14}>{STATUS_ICONS[status]}</Typography>
									<Typography fontSize={13} marginLeft="5px">
										{STATUS_LABELS[status]}
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
