'use client';
import { AccessTimeFilled, AccountCircle, Cancel, CheckCircle, Checklist } from '@mui/icons-material';
import { Divider, MenuItem, Paper, Typography } from '@mui/material';
import { formatMDYAbv } from '@/lib/utils/utils';
import { Checklist as ChecklistType } from '@/types/types';
import * as actions from '@/state/checklists/actions';
import BasicButton from '../common/BasicButton';
import { OFFWHITE_COLOR } from '@/styles/theme';

export default function ChecklistMenuItem(props: {
	checklist: ChecklistType | null;
	clearable?: boolean;
	onClose?: () => void;
	selected?: boolean;
}) {
	const { checklist, clearable, onClose, selected } = props;
	return (
		<Paper
			elevation={clearable ? 1 : 0}
			sx={{ width: '100%', backgroundColor: clearable ? OFFWHITE_COLOR : undefined, borderRadius: 1 }}
		>
			<MenuItem
				style={styles.menuItem}
				onClick={
					clearable
						? undefined
						: () => {
								actions.updateSelectedChecklist(checklist);
								if (typeof onClose === 'function') onClose();
						  }
				}
				disableRipple={clearable}
				className="flex-row-between"
			>
				<div style={styles.menuItemInner} className="flex-row-left">
					<Checklist sx={styles.icon} />
					<Typography fontSize={13} fontWeight="bold" color="primary" width={110}>
						{checklist?.name}
					</Typography>
					<div style={styles.verticalDiv}>
						<Divider orientation="vertical" />
					</div>
					<AccountCircle sx={styles.icon} />
					<Typography fontSize={13} width={120}>
						{checklist?.created_by}
					</Typography>
					<div style={styles.verticalDiv}>
						<Divider orientation="vertical" />
					</div>
					<div style={{ width: 80 }} className="flex-row-center">
						<Typography fontSize={13}>{checklist?.page_count?.toLocaleString() ?? '0'} pages</Typography>
					</div>
					<div style={styles.verticalDiv}>
						<Divider orientation="vertical" />
					</div>
					<div className="flex-row-center">
						<AccessTimeFilled sx={styles.icon} />
						<Typography fontSize={13}>{formatMDYAbv(checklist?.updated_at?.toString())}</Typography>
					</div>
				</div>
				<div className="flex-row-right">
					{clearable ? (
						<BasicButton
							buttonProps={{
								onClick: (e) => {
									e.stopPropagation();
									e.preventDefault();
									actions.updateSelectedChecklist(null);
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
		</Paper>
	);
}

const styles = {
	clearIcon: {
		fontSize: 17,
	},
	icon: {
		marginRight: '5px',
	},
	menuItem: {
		width: '100%',
		minWidth: 300,
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
