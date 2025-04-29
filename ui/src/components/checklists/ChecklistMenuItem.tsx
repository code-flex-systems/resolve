import {
	AccessTimeFilled,
	AccountCircle,
	Cancel,
	CheckCircle,
	Checklist,
	ContentPasteSearch,
} from '@mui/icons-material';
import { Divider, MenuItem, Paper, Typography } from '@mui/material';
import { formatAmount, formatMDYAbv } from '../../utils/utils';
import { Checklist as ChecklistType, Claim } from '../../types';
import * as actions from '../../state/checklists/actions';
import BasicButton from '../common/BasicButton';

export default function ChecklistMenuItem(props: {
	checklist: ChecklistType | null;
	clearable?: boolean;
	onClose?: () => void;
	selected?: boolean;
}) {
	const { checklist, clearable, onClose, selected } = props;
	return (
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
		>
			<Paper elevation={clearable ? 1 : 0} style={{ width: '100%' }} className="flex-row-between">
				<div style={styles.menuItemInner} className="flex-row-left">
					<Checklist sx={styles.icon} />
					<Typography>{checklist?.name}</Typography>
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
		minWidth: 300,
	},
	menuItemInner: {
		padding: 5,
	},
};
