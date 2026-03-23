import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useState } from 'react';
import BasicPopper from '../common/BasicPopper';
import { StackedRow } from '../common/StackedRow';
import { formatMDY } from '@/lib/utils/utils';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';
import { IconChecklist } from '@tabler/icons-react';
import Button from '@/components/ui/Button';

export default function ChecklistInfo() {
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const { checklistId } = useChecklistParams();
	const { data: checklist } = useChecklistTrpc().get({ id: checklistId! }, { enabled: !!checklistId });
	const [checklistAnchorEl, setChecklistAnchorEl] = useState<HTMLElement | null>(null);

	if (!checklist) return <></>;
	return (
		<div className="flex-row-left">
			<Button variant="outlined" onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => setChecklistAnchorEl(e.currentTarget)} onMouseLeave={() => setChecklistAnchorEl(null)} startIcon={<IconChecklist size={16} />}>
				{checklist.name}
			</Button>
			<BasicPopper
				anchorEl={checklistAnchorEl}
				setAnchorEl={setChecklistAnchorEl}
				placement="bottom-start"
				zIndex={100}
			>
				<div style={{ width: 'fit-content', padding: '0px 20px 10px', height: 'fit-content', marginTop: 5, backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
					<div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
						{(isAdmin || isSuperAdmin) && (
							<StackedRow
								primary="Status"
								secondary={checklist.published ? 'Published' : 'Unpublished'}
							/>
						)}
						<StackedRow
							primary="Last Update"
							secondary={formatMDY(checklist.updated_at ?? checklist.created_at)}
						/>
					</div>
				</div>
			</BasicPopper>
		</div>
	);
}
