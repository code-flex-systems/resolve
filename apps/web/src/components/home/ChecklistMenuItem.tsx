'use client';
import Tooltip from '@/components/ui/Tooltip';
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
			content={`${checklist?.name ?? ''} - ${checklist?.page_count?.toLocaleString() ?? '0'} pages - ${formatMDYAbv(checklist?.updated_at?.toString())}`}
			position="left">
			<div style={{ width: '100%', borderRadius: 1 }}>
				<div
					style={styles.menuItem}
					onClick={() => {
						useChecklistsStore.getState().updateSelectedChecklist(checklist);
						if (typeof onClose === 'function') onClose();
					}}
					className="flex-row-between">
					<div className="flex-row-left" style={styles.menuItemInner}>
						<div style={{ display: 'flex', alignItems: 'center', width: 200, overflow: 'hidden' }}>
							<IconChecklist style={{ ...styles.icon, color: 'var(--text-accent)' }} />
							<span style={{ ...{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, fontSize: 13, fontWeight: 'bold', color: 'primary' }}>
								{checklist?.name}
							</span>
						</div>
						<div style={{ display: 'flex', alignItems: 'center', width: 90, overflow: 'hidden', margin: '0px 10px' }}>
							<IconFileDescription style={styles.icon} />
							<span style={{ ...{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, fontSize: 13 }}>
								{checklist?.page_count?.toLocaleString() ?? '0'} pages
							</span>
						</div>
						<div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', marginLeft: '10px' }}>
							<IconClockFilled style={styles.icon} />
							<span style={{ ...{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, fontSize: 13 }}>
								{formatMDYAbv(checklist?.updated_at?.toString())}
							</span>
						</div>
					</div>
					<div className="flex-row-right">
						{selected ? <IconCircleCheck size={20} style={{ color: 'primary.main', marginLeft: '10px' }} /> : <></>}
					</div>
				</div>
			</div>
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
		padding: 5,
	},
};
