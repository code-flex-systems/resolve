import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { Chip, MenuItem, Paper, PopperProps } from '@mui/material';
import { useEffect, useState } from 'react';
import BasicPopper from './BasicPopper';
import { IconCircleCheck } from '@tabler/icons-react';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
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
						<span style={{ marginLeft: 5, marginTop: 5, display: 'inline-flex' }}>
							<ClaimStatusIcon status={claimStatus} />
						</span>
					) : (
						<IconCircleCheck size={20} style={{ color: BASE_COLOR_LIGHT }} />
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
									<div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
										<ClaimStatusIcon status={o} />
										<span style={{ fontSize: 13, marginLeft: 5 }}>
											{o}
										</span>
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
		minWidth: 200,
	},
};
