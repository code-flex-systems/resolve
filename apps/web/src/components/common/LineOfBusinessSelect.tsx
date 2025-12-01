import { Box, Chip, MenuItem, Paper, PopperProps, Typography } from '@mui/material';
import { useState } from 'react';
import BasicPopper from './BasicPopper';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { LineOfBusiness } from '@/config/enums';
import { LOB_ICONS, formatLineOfBusiness } from '@/lib/utils/claimUtils';
import BusinessCenter from '@mui/icons-material/BusinessCenter';

export default function LineOfBusinessSelect({
	lineOfBusiness,
	setLineOfBusiness,
	clearable = true,
	height,
	text = 'Filter by line of business',
	disabled = false,
}: {
	lineOfBusiness: string | null;
	setLineOfBusiness: (newLob: string | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();

	const displayLabel = lineOfBusiness ? formatLineOfBusiness(lineOfBusiness) : text;

	return (
		<>
			<Chip
				label={displayLabel}
				icon={
					lineOfBusiness ? (
						<Box marginLeft="5px">
							<Typography fontSize={14}>{LOB_ICONS[lineOfBusiness as LineOfBusiness]}</Typography>
						</Box>
					) : (
						<BusinessCenter sx={{ color: BASE_COLOR_LIGHT }} />
					)
				}
				onClick={(e) => {
					setAnchorEl(e.currentTarget);
					e.preventDefault();
					e.stopPropagation();
				}}
				onDelete={lineOfBusiness && clearable ? () => setLineOfBusiness(null) : undefined}
				sx={{
					...styles.chip,
					height,
					'& .MuiChip-icon': {
						color: lineOfBusiness ? undefined : BASE_COLOR_LIGHT,
					},
				}}
				disabled={disabled}
			/>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<Paper sx={styles.paper}>
						{Object.values(LineOfBusiness).map((lob) => (
							<MenuItem
								key={lob}
								selected={lineOfBusiness === lob}
								value={lob}
								onClick={() => {
									setLineOfBusiness(lob);
									setAnchorEl(null);
								}}
							>
								<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center">
									<Typography fontSize={14}>{LOB_ICONS[lob]}</Typography>
									<Typography fontSize={13} marginLeft="5px">
										{formatLineOfBusiness(lob)}
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
