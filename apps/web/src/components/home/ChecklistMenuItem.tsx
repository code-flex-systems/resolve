'use client';
import { AccessTimeFilled, CheckCircle, Checklist, Description } from '@mui/icons-material';
import { Box, Divider, MenuItem, Paper, Tooltip, Typography } from '@mui/material';
import { formatMDYAbv } from '@/lib/utils/utils';
import { Checklist as ChecklistType } from '@/types/types';
import { useChecklistsStore } from '@/stores/useChecklistsStore';
import theme from '@/styles/theme';

export default function ChecklistMenuItem(props: {
	checklist: ChecklistType | null;
	onClose?: () => void;
	selected?: boolean;
}) {
	const { checklist, onClose, selected } = props;
	return (
		<Tooltip
			title={`${checklist?.name ?? ''} - ${checklist?.page_count?.toLocaleString() ?? '0'} pages - ${formatMDYAbv(checklist?.updated_at?.toString())}`}
			enterDelay={1000}
			placement="left"
			arrow
		>
			<Paper elevation={0} sx={{ width: '100%', borderRadius: 1 }}>
				<MenuItem
					style={styles.menuItem}
					onClick={() => {
						useChecklistsStore.getState().updateSelectedChecklist(checklist);
						if (typeof onClose === 'function') onClose();
					}}
					className="flex-row-between"
				>
					<div style={styles.menuItemInner} className="flex-row-left">
						<Box display="flex" alignItems="center" width={200} overflow="hidden">
							<Checklist sx={{ ...styles.icon, color: theme.palette.primary.main }} />
							<Typography fontSize={13} fontWeight="bold" color="primary" textOverflow="ellipsis" noWrap>
								{checklist?.name}
							</Typography>
						</Box>
						<Box display="flex" alignItems="center" width={90} overflow="hidden" margin="0px 10px">
							<Description sx={styles.icon} />
							<Typography fontSize={13} textOverflow="ellipsis" noWrap>
								{checklist?.page_count?.toLocaleString() ?? '0'} pages
							</Typography>
						</Box>
						<Box display="flex" alignItems="center" overflow="hidden" marginLeft="10px">
							<AccessTimeFilled sx={styles.icon} />
							<Typography fontSize={13} textOverflow="ellipsis" noWrap>
								{formatMDYAbv(checklist?.updated_at?.toString())}
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
	dividerDot: {
		minWidth: 5,
		width: 5,
		height: 5,
		borderRadius: 10,
		backgroundColor: '#d9d9d9',
		margin: '0px 10px',
	},
	icon: {
		fontSize: 15,
		marginRight: '5px',
	},
	menuItem: {
		width: '100%',
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
