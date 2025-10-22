'use client';
import AccessTimeFilled from '@mui/icons-material/AccessTimeFilled';
import AccountCircle from '@mui/icons-material/AccountCircle';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import { Box, Divider, MenuItem, Paper, Tooltip, Typography } from '@mui/material';
import { formatMDYAbv } from '@/lib/utils/utils';
import { Claim } from '@/types/types';
import { useChecklistsStore } from '@/stores/useChecklistsStore';
import theme from '@/styles/theme';

export default function ClaimMenuItem(props: { claim: Claim | null; onClose?: () => void; selected?: boolean }) {
	const { claim, onClose, selected } = props;
	return (
		<Tooltip
			title={`${claim?.claim_number ?? ''} - ${claim?.insured ?? ''} - ${formatMDYAbv(claim?.date_of_loss?.toString())}`}
			enterDelay={1000}
			placement="left"
			arrow
		>
			<Paper key="item" elevation={0} sx={{ width: '100%', borderRadius: 1 }}>
				<MenuItem
					style={styles.menuItem}
					onClick={() => {
						useChecklistsStore.getState().updateSelectedClaim(claim);
						if (typeof onClose === 'function') onClose();
					}}
					className="flex-row-between"
				>
					<div style={styles.menuItemInner} className="flex-row-left">
						<Box display="flex" alignItems="center" width={150} overflow="hidden">
							<ContentPasteSearch sx={{ ...styles.icon, color: theme.palette.primary.main }} />
							<Typography fontSize={13} fontWeight="bold" color="primary" textOverflow="ellipsis" noWrap>
								{claim?.claim_number ?? ''}
							</Typography>
						</Box>
						<Box display="flex" alignItems="center" width={120} overflow="hidden" margin="0px 10px">
							<AccountCircle sx={styles.icon} />
							<Typography fontSize={13} textOverflow="ellipsis" noWrap>
								{claim?.insured ?? ''}
							</Typography>
						</Box>
						<Box display="flex" alignItems="center" overflow="hidden" marginLeft="10px">
							<AccessTimeFilled sx={styles.icon} />
							<Typography fontSize={13} textOverflow="ellipsis" noWrap>
								{formatMDYAbv(claim?.date_of_loss?.toString())}
							</Typography>
						</Box>
					</div>
					<div className="flex-row-right">
						{selected ? <CheckCircle sx={{ color: 'primary.main', marginLeft: '10px' }} /> : <></>}
					</div>
				</MenuItem>
			</Paper>
		</Tooltip>
	);
}

const styles = {
	clearIcon: {
		fontSize: 17,
	},
	icon: {
		fontSize: 15,
		marginRight: '5px',
	},
	menuItem: {
		width: 'fit-content',
	},
	menuItemInner: {
		padding: 5,
	},
	verticalDiv: {
		height: 20,
		width: 1,
		margin: '0px 10px',
	},
};
