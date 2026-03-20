'use client';
import { Box, MenuItem, Paper, Tooltip, Typography } from '@mui/material';
import { formatMDYAbv } from '@/lib/utils/utils';
import { Checklist as ChecklistType } from '@/types/types';
import { useChecklistsStore } from '@/stores/useChecklistsStore';
import { IconChecklist, IconCircleCheck, IconClockFilled, IconFileDescription } from '@tabler/icons-react';
import Divider from '@/components/ui/Divider';

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
					sx={styles.menuItem}
					onClick={() => {
						useChecklistsStore.getState().updateSelectedChecklist(checklist);
						if (typeof onClose === 'function') onClose();
					}}
					className="flex-row-between"
				>
					<Box sx={styles.menuItemInner} className="flex-row-left">
						<Box display="flex" alignItems="center" width={200} overflow="hidden">
							<IconChecklist style={{ ...styles.icon, color: 'var(--text-accent)' }} />
							<Typography fontSize={13} fontWeight="bold" color="primary" textOverflow="ellipsis" noWrap>
								{checklist?.name}
							</Typography>
						</Box>
						<Box display="flex" alignItems="center" width={90} overflow="hidden" margin="0px 10px">
							<IconFileDescription style={styles.icon} />
							<Typography fontSize={13} textOverflow="ellipsis" noWrap>
								{checklist?.page_count?.toLocaleString() ?? '0'} pages
							</Typography>
						</Box>
						<Box display="flex" alignItems="center" overflow="hidden" marginLeft="10px">
							<IconClockFilled style={styles.icon} />
							<Typography fontSize={13} textOverflow="ellipsis" noWrap>
								{formatMDYAbv(checklist?.updated_at?.toString())}
							</Typography>
						</Box>
					</Box>
					<Box className="flex-row-right">
						{selected ? <IconCircleCheck size={20} style={{ color: 'primary.main', marginLeft: '10px' }} /> : <></>}
					</Box>
				</MenuItem>
			</Paper>
		</Tooltip>
	);
}

const styles = {
	icon: {
		fontSize: 15,
		marginRight: '5px',
	},
	menuItem: {
		width: '100%',
	},
	menuItemInner: {
		p: 0.625,
	},
};
