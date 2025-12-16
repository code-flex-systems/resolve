import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { Box, Chip, MenuItem, Paper, PopperProps, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import BasicPopper from './BasicPopper';
import CheckCircle from '@mui/icons-material/CheckCircle';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';
import { ClaimStatus } from '@/config/enums';
import ClaimStatusIcon from '../checklist/ClaimStatusIcon';

const OPTIONS = [{ status: ClaimStatus.SUBMITTED }];

export default function ClaimStatusSelect({
	claimStatus,
	setClaimStatus,
	clearable = true,
	height,
	text = 'Filter by claim status',
	disabled = false,
}: {
	claimStatus: ClaimStatus | null;
	setClaimStatus: (newStatus: ClaimStatus | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const { data: options = [], isFetching } = useChecklistTrpc().list({});
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();

	useEffect(() => {
		if (!clearable && options.length > 0) {
			setClaimStatus(ClaimStatus.IN_PROGRESS);
		}
	}, [options, clearable]);

	return (
		<>
			<Chip
				label={claimStatus ?? text}
				icon={
					claimStatus ? (
						<Box marginLeft="5px" marginTop="5px">
							<ClaimStatusIcon status={claimStatus} />
						</Box>
					) : (
						<CheckCircle sx={{ color: BASE_COLOR_LIGHT }} />
					)
				}
				onClick={(e) => {
					setAnchorEl(e.currentTarget);
					e.preventDefault();
					e.stopPropagation();
				}}
				onDelete={claimStatus && clearable ? () => setClaimStatus(null) : undefined}
				sx={{
					...styles.chip,
					height,
					'& .MuiChip-icon': {
						color: claimStatus ? undefined : BASE_COLOR_LIGHT,
					},
				}}
				disabled={disabled}
			/>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<Paper sx={styles.paper}>
						{Object.values(ClaimStatus)
							.sort((a, b) => a.localeCompare(b))
							.map((o) => (
								<MenuItem
									key={o}
									selected={claimStatus === o}
									value={o}
									onClick={() => {
										setClaimStatus(o);
										setAnchorEl(null);
									}}
								>
									<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center">
										<ClaimStatusIcon status={o} />
										<Typography fontSize={13} marginLeft="5px">
											{o}
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
		mt: 0.625,
		minWidth: 200,
	},
};
