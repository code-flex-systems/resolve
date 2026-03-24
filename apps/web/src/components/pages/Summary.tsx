'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SummaryChart from '@/components/summary/SummaryChart';
import ClaimInfo from '@/components/checklist/ClaimInfo';
import SummaryDetails from '@/components/summary/SummaryDetails';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useBreadcrumbs } from '@/components/common/BreadcrumbContext';
import { IconArrowLeft } from '@tabler/icons-react';
import Divider from '@/components/ui/Divider';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';

export default function Summary() {
	const router = useRouter();
	const { checklistId, claimId } = useChecklistParams();
	const { data: checklist } = useChecklistTrpc().get({ id: checklistId! }, { enabled: !!checklistId });
	const { setDynamicSegments } = useBreadcrumbs();

	useEffect(() => {
		setDynamicSegments([{ label: checklist?.name ?? 'Loading...' }]);
	}, [checklist?.name, setDynamicSegments]);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
			<div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', gap: 8, flexShrink: 0 }}>
				<Tooltip content="Back to checklist">
					<Button variant="icon" size="sm" color="neutral" onClick={() => router.back()}>
						<IconArrowLeft size={16} />
					</Button>
				</Tooltip>
				<ClaimInfo />
			</div>
			<div style={{ display: 'flex', flex: 1, minHeight: 0, padding: '0px 20px 20px', gap: 20 }}>
				<div style={{ width: 380, flexShrink: 0 }}>
					<SummaryChart />
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<SummaryDetails />
				</div>
			</div>
		</div>
	);
}
