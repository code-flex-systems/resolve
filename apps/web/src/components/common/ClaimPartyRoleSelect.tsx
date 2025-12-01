import { Chip, MenuItem, Paper, PopperProps, Typography } from '@mui/material';
import { useState } from 'react';
import BasicPopper from './BasicPopper';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { ClaimPartyRole } from '@/config/enums';
import { formatClaimPartyRole } from '@/lib/utils/partyUtils';
import Business from '@mui/icons-material/Business';

export default function ClaimPartyRoleSelect({
	role,
	setRole,
	clearable = true,
	height,
	text = 'Select party role',
	disabled = false,
}: {
	role: string | null;
	setRole: (newRole: string | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();

	const displayLabel = role ? formatClaimPartyRole(role) : text;

	return (
		<>
			<Chip
				label={displayLabel}
				icon={<Business sx={{ color: role ? undefined : BASE_COLOR_LIGHT }} />}
				onClick={(e) => {
					setAnchorEl(e.currentTarget);
					e.preventDefault();
					e.stopPropagation();
				}}
				onDelete={role && clearable ? () => setRole(null) : undefined}
				sx={{
					...styles.chip,
					height,
					'& .MuiChip-icon': {
						color: role ? undefined : BASE_COLOR_LIGHT,
					},
				}}
				disabled={disabled}
			/>
			{!!anchorEl && (
				<BasicPopper
					zIndex={10000}
					anchorEl={anchorEl}
					setAnchorEl={() => setAnchorEl(null)}
					placement="bottom-start"
				>
					<Paper sx={styles.paper}>
						{Object.values(ClaimPartyRole).map((partyRole) => (
							<MenuItem
								key={partyRole}
								selected={role === partyRole}
								value={partyRole}
								onClick={() => {
									setRole(partyRole);
									setAnchorEl(null);
								}}
							>
								<Typography fontSize={13}>{formatClaimPartyRole(partyRole)}</Typography>
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
