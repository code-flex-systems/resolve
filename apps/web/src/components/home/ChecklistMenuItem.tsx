'use client';
import { AccessTimeFilled, CheckCircle, Checklist } from '@mui/icons-material';
import { Divider, MenuItem, Paper, Typography } from '@mui/material';
import { formatMDYAbv } from '@/lib/utils/utils';
import { Checklist as ChecklistType } from '@/types/types';
import * as actions from '@/state/checklists/actions';

export default function ChecklistMenuItem(props: {
	checklist: ChecklistType | null;
	onClose?: () => void;
	selected?: boolean;
}) {
	const { checklist, onClose, selected } = props;
	return (
		<Paper elevation={0} sx={{ width: '100%', borderRadius: 1 }}>
			<MenuItem
				style={styles.menuItem}
				onClick={() => {
					actions.updateSelectedChecklist(checklist);
					if (typeof onClose === 'function') onClose();
				}}
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
					<div style={{ width: 80 }} className="flex-row-left">
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
					{selected ? <CheckCircle sx={{ color: 'primary.main', marginLeft: '10px' }} /> : <></>}
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
