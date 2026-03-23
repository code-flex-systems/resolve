'use client';
import { useRouter } from 'next/navigation';
import Toolbar from '@/components/common/Toolbar';
import SummaryChart from '@/components//summary/SummaryChart';
import ClaimInfo from '@/components/checklist/ClaimInfo';
import SummaryDetails from '@/components/summary/SummaryDetails';
import ChecklistInfo from '../checklist/ChecklistInfo';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { IconArrowLeft, IconChecklist } from '@tabler/icons-react';
import Divider from '@/components/ui/Divider';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';

export default function Summary() {
	const router = useRouter();
	const { checklistId } = useChecklistParams();
	const { data: checklist } = useChecklistTrpc().get({ id: checklistId! }, { enabled: !!checklistId });

	return (
		<div style={{ flex: 1, width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', padding: '10px' }}>
			<Toolbar
				left={
					<>
						<div style={{ marginRight: '5px' }}>
							<Tooltip content="Back to checklist">
							<Button variant="icon" size="sm" color="neutral">
							<IconArrowLeft size={16} />
						</Button>
						</Tooltip>
						</div>
						<IconChecklist size={20} />
						<span style={{ marginLeft: 4, marginRight: 8 }}>
							{checklist?.name}
						</span>
						<ClaimInfo />
					</>
				}
				padding={0}
			/>
			<div style={{ ...styles.divider, marginTop: 8 }}>
				<Divider />
			</div>
			<div className="flex-row-left" style={styles.containerInner}>
				<SummaryChart />
				<SummaryDetails />
			</div>
		</div>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		padding: '0px 10px',
	},
	containerInner: {
		width: '100%',
		height: 'calc(100vh - 65px)',
		bgcolor: 'var(--bg-secondary)',
		padding: '20px',
	},
	divider: {
		width: '100%',
	},
};
