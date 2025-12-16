import { Chip, MenuItem, Paper, PopperProps, Typography } from '@mui/material';
import { useState } from 'react';
import BasicPopper from './BasicPopper';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { RecoveryStatus } from '@/config/enums';
import { formatRecoveryStatus } from '@/lib/utils/recoveryUtils';
import AttachMoney from '@mui/icons-material/AttachMoney';

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

	const displayLabel = recoveryStatus ? formatRecoveryStatus(recoveryStatus) : text;

	return (
		<>
			<Chip
				label={displayLabel}
				icon={<AttachMoney sx={{ color: recoveryStatus ? undefined : BASE_COLOR_LIGHT }} />}
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
								<Typography fontSize={13}>{formatRecoveryStatus(status)}</Typography>
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
