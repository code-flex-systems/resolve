'use client';
import { AccessTimeFilled, AccountCircle, CheckCircle, ContentPasteSearch } from '@mui/icons-material';
import { Divider, MenuItem, Paper, Typography } from '@mui/material';
import { formatMDYAbv } from '@/lib/utils/utils';
import { Claim } from '@/types/types';
import * as actions from '@/state/checklists/actions';

export default function ClaimMenuItem(props: { claim: Claim | null; onClose?: () => void; selected?: boolean }) {
	const { claim, onClose, selected } = props;
	return [
		<Paper key="item" elevation={0} sx={{ width: '100%', borderRadius: 1 }}>
			<MenuItem
				style={styles.menuItem}
				onClick={() => {
					actions.updateSelectedClaim(claim);
					if (typeof onClose === 'function') onClose();
				}}
				className="flex-row-between"
			>
				<div style={styles.menuItemInner} className="flex-row-left">
					<ContentPasteSearch sx={styles.icon} />
					<Typography fontSize={13} fontWeight="bold" color="primary" width={110}>
						{claim?.claim_number ?? ''}
					</Typography>
					<div style={styles.verticalDiv}>
						<Divider orientation="vertical" />
					</div>
					<AccountCircle sx={styles.icon} />
					<Typography fontSize={13} width={120} noWrap>
						{claim?.insured ?? ''}
					</Typography>
					<div style={styles.verticalDiv}>
						<Divider orientation="vertical" />
					</div>
					<div className="flex-row-center">
						<AccessTimeFilled sx={styles.icon} />
						<Typography fontSize={13}>{formatMDYAbv(claim?.date_of_loss?.toString())}</Typography>
					</div>
				</div>
				<div className="flex-row-right">
					{selected ? <CheckCircle sx={{ color: 'primary.main', marginLeft: '10px' }} /> : <></>}
				</div>
			</MenuItem>
		</Paper>,
	];
}

const styles = {
	clearIcon: {
		fontSize: 17,
	},
	icon: {
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
