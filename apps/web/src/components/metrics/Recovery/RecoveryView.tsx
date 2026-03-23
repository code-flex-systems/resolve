'use client';

import PageWrapper from '@/components/common/PageWrapper';
import { useMemo, useState } from 'react';
import type { DateRange } from '@/types/dateTypes';
import dayjs, { Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import utc from 'dayjs/plugin/utc';
import { useRouter } from 'next/navigation';
import ChecklistSelect from '@/components/common/ChecklistSelect';
import BasicMonthRangePicker from '@/components/common/BasicMonthRangePicker';
import { GetChecklistOutput } from '@/hooks/trpc/useChecklistTrpc';
import RecoveryStatusSelect from '@/components/common/RecoveryStatusSelect';
import RecoverySourceFilter from '@/components/common/RecoverySourceFilter';
import RecoveryMetricsChart from './RecoveryMetricsChart';
import RecoveryEventsTable from './RecoveryEventsTable';
import TopPerformersSection from './TopPerformersSection';
import Divider from '@/components/ui/Divider';
import { IconArrowLeft } from '@tabler/icons-react';
import Button from '@/components/ui/Button';

dayjs.extend(quarterOfYear);
dayjs.extend(utc);

/**
 * Get current quarter start and end dates.
 * Uses UTC mode to avoid timezone issues where endOf('month') could
 * shift to the next month when converted to ISO string.
 */
function getCurrentQuarterRange(): [Dayjs, Dayjs] {
	const now = dayjs();
	const currentQuarter = now.quarter();
	const currentYear = now.year();
	const startMonth = (currentQuarter - 1) * 3;

	const start = dayjs.utc().year(currentYear).month(startMonth).startOf('month');
	const end = dayjs
		.utc()
		.year(currentYear)
		.month(startMonth + 2)
		.endOf('month');

	return [start, end];
}

export default function RecoveryView() {
	const router = useRouter();
	const defaultRange = useMemo(() => getCurrentQuarterRange(), []);
	const [range, setRange] = useState<DateRange<Dayjs>>(defaultRange);
	const [checklist, setChecklist] = useState<GetChecklistOutput | null>(null);
	const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);
	const [recoverySource, setRecoverySource] = useState<string>('');

	return (
		<div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
			<div style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
				<div  style={{ marginRight: '5px' }}>
					<BasicMonthRangePicker defaultLabel="This Quarter" defaultValue={range} onConfirm={setRange} />
				</div>
				<div  style={{ marginRight: '5px' }}>
					<RecoveryStatusSelect recoveryStatus={recoveryStatus} setRecoveryStatus={setRecoveryStatus} />
				</div>
				<div  style={{ marginRight: '5px' }}>
					<RecoverySourceFilter recoverySource={recoverySource} setRecoverySource={setRecoverySource} />
				</div>
				<div  style={{ marginRight: '5px' }}>
					<ChecklistSelect checklist={checklist} setChecklist={setChecklist} />
				</div>
			</div>
			<div style={styles.divider}>
				<Divider />
			</div>
			<div style={{ width: '100%', height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', padding: '20px', overflow: 'auto' }}>
				<div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
					<RecoveryMetricsChart
						range={range}
						isBreakdown={true}
						recoveryStatus={recoveryStatus}
						recoverySource={recoverySource}
						checklistId={checklist?.id}
					/>
					<TopPerformersSection
						range={range}
						recoveryStatus={recoveryStatus}
						recoverySource={recoverySource}
						checklistId={checklist?.id}
					/>
					<RecoveryEventsTable
						range={range}
						recoveryStatus={recoveryStatus}
						recoverySource={recoverySource}
						checklistId={checklist?.id}
					/>
				</div>
			</div>
		</div>
	);
}

const styles = {
	divider: {
		width: '100%',
	},
};
