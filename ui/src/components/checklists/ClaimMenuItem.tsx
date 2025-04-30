import { AccessTimeFilled, AccountCircle, Cancel, CheckCircle, ContentPasteSearch } from '@mui/icons-material';
import { Divider, MenuItem, Paper, Typography } from '@mui/material';
import { formatAmount, formatMDYAbv } from '../../utils/utils';
import { Claim } from '../../types';
import * as actions from '../../state/checklists/actions';
import BasicButton from '../common/BasicButton';

export default function ClaimMenuItem(props: {
	claim: Claim | null;
	clearable?: boolean;
	onClose?: () => void;
	selected?: boolean;
}) {
	const { claim, clearable, onClose, selected } = props;
	return (
		<MenuItem
			style={styles.menuItem}
			onClick={
				clearable
					? undefined
					: () => {
							actions.updateSelectedClaim(claim);
							if (typeof onClose === 'function') onClose();
					  }
			}
			disableRipple={clearable}
		>
			<Paper elevation={0} style={{ width: '100%' }} className="flex-row-between">
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
						{claim?.client ?? ''}
					</Typography>
					<div style={styles.verticalDiv}>
						<Divider orientation="vertical" />
					</div>
					<div style={{ width: 80 }} className="flex-row-center">
						<Typography fontSize={13}>{formatAmount(claim?.claim_amount ?? undefined, true)}</Typography>
					</div>
					<div style={styles.verticalDiv}>
						<Divider orientation="vertical" />
					</div>
					<div className="flex-row-center">
						<AccessTimeFilled sx={styles.icon} />
						<Typography fontSize={13}>{formatMDYAbv(claim?.last_update?.toString())}</Typography>
					</div>
				</div>
				<div className="flex-row-right">
					{clearable ? (
						<BasicButton
							buttonProps={{
								onClick: (e) => {
									e.stopPropagation();
									e.preventDefault();
									actions.updateSelectedClaim(null);
								},
								sx: {
									marginLeft: '10px',
								},
							}}
							icon={<Cancel sx={styles.clearIcon} />}
						/>
					) : selected ? (
						<CheckCircle sx={{ color: 'success.main', marginLeft: '10px' }} />
					) : (
						<></>
					)}
				</div>
			</Paper>
		</MenuItem>
	);
}

const styles = {
	clearIcon: {
		color: 'error.main',
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
