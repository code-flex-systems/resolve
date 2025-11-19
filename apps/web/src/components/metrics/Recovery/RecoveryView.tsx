'use client';

import { Box, Divider, Paper, Stack, Typography } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import PageWrapper from '@/components/common/PageWrapper';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { useMemo, useState } from 'react';
import { DateRange } from '@mui/x-date-pickers-pro';
import dayjs, { Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import { useRouter } from 'next/navigation';
import ChecklistSelect from '@/components/common/ChecklistSelect';
import BasicMonthRangePicker from '@/components/common/BasicMonthRangePicker';
import UserFilter from '@/components/common/UserFilter';
import { GetChecklistOutput } from '@/hooks/trpc/useChecklistTrpc';
import RecoveryStatusSelect from '@/components/common/RecoveryStatusSelect';
import RecoverySourceFilter from '@/components/common/RecoverySourceFilter';
import RecoveryMetricsChart from './RecoveryMetricsChart';
import RecoveryEventsTable from './RecoveryEventsTable';
import TopPerformersSection from './TopPerformersSection';

dayjs.extend(quarterOfYear);

/**
 * Get current quarter start and end dates
 */
function getCurrentQuarterRange(): [Dayjs, Dayjs] {
	const now = dayjs();
	const currentQuarter = now.quarter();
	const currentYear = now.year();
	const startMonth = (currentQuarter - 1) * 3;

	const start = dayjs().year(currentYear).month(startMonth).startOf('month');
	const end = dayjs()
		.year(currentYear)
		.month(startMonth + 2)
		.endOf('month');

	return [start, end];
}

export default function RecoveryView() {
	const router = useRouter();
	const defaultRange = useMemo(() => getCurrentQuarterRange(), []);
	const [range, setRange] = useState<DateRange<Dayjs>>(defaultRange);
	const [users, setUsers] = useState<GetUserOutput[]>([]);
	const [checklist, setChecklist] = useState<GetChecklistOutput | null>(null);
	const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);
	const [recoverySource, setRecoverySource] = useState<string>('');

	return (
		<Stack flex={1} width="100%" display="flex" justifyContent="flex-start" alignItems="flex-start">
			<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center">
				<Box marginRight="5px">
					<BasicMonthRangePicker defaultLabel="This Quarter" defaultValue={range} onConfirm={setRange} />
				</Box>
				<Box marginRight="5px">
					<RecoveryStatusSelect recoveryStatus={recoveryStatus} setRecoveryStatus={setRecoveryStatus} />
				</Box>
				<Box marginRight="5px">
					<RecoverySourceFilter recoverySource={recoverySource} setRecoverySource={setRecoverySource} />
				</Box>
				<Box marginRight="5px">
					<ChecklistSelect checklist={checklist} setChecklist={setChecklist} />
				</Box>
				<UserFilter
					users={users}
					setUsers={setUsers}
					width="100%"
					text="Filter by recovery creator"
					multi={false}
				/>
			</Box>
			<div style={styles.divider}>
				<Divider />
			</div>
			<Box
				width="100%"
				height="calc(100vh - 70px)"
				display="flex"
				justifyContent="flex-start"
				alignItems="flex-start"
				bgcolor="#F7F8FA"
				padding="20px"
				overflow="auto"
			>
				<Stack width="100%" spacing={2}>
					<RecoveryMetricsChart
						range={range}
						isBreakdown={true}
						recoveryStatus={recoveryStatus}
						recoverySource={recoverySource}
						checklistId={checklist?.id}
						userId={users[0]?.id}
					/>
					<TopPerformersSection
						range={range}
						recoveryStatus={recoveryStatus}
						recoverySource={recoverySource}
						checklistId={checklist?.id}
						userId={users[0]?.id}
					/>
					<RecoveryEventsTable
						range={range}
						recoveryStatus={recoveryStatus}
						recoverySource={recoverySource}
						checklistId={checklist?.id}
						userId={users[0]?.id}
					/>
				</Stack>
			</Box>
		</Stack>
	);
}

const styles = {
	divider: {
		width: '100%',
		height: 1,
	},
};
