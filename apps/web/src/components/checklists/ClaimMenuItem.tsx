'use client';
import { AccessTimeFilled, AccountCircle, Cancel, CheckCircle, ContentPasteSearch } from '@mui/icons-material';
import { Divider, MenuItem, Paper, Typography } from '@mui/material';
import { formatAmount, formatMDYAbv } from '@/lib/utils/utils';
import { Claim } from '@/types/types';
import * as actions from '@/state/checklists/actions';
import BasicButton from '../common/BasicButton';
import { OFFWHITE_COLOR } from '@/styles/theme';

export default function ClaimMenuItem(props: {
	claim: Claim | null;
	clearable?: boolean;
	onClose?: () => void;
	selected?: boolean;
	showDiv?: boolean;
}) {
	const { claim, clearable, onClose, selected, showDiv } = props;
	return [
		<Paper
			key="item"
			elevation={clearable ? 1 : 0}
			sx={{ width: '100%', backgroundColor: clearable ? OFFWHITE_COLOR : undefined, borderRadius: 1 }}
		>
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
					<div style={{ width: 80 }} className="flex-row-center">
						<Typography fontSize={13}>{formatAmount(claim?.claim_amount ?? undefined, true)}</Typography>
					</div>
					<div style={styles.verticalDiv}>
						<Divider orientation="vertical" />
					</div>
					<div className="flex-row-center">
						<AccessTimeFilled sx={styles.icon} />
						<Typography fontSize={13}>{formatMDYAbv(claim?.date_of_loss?.toString())}</Typography>
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
						<CheckCircle sx={{ color: 'primary.main', marginLeft: '10px' }} />
					) : (
						<></>
					)}
				</div>
			</MenuItem>
		</Paper>,
		// ...(showDiv ? [<Divider />] : []),
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
