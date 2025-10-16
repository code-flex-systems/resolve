'use client';
import { ArrowBack } from '@mui/icons-material';
import BreakdownNavigation from '@/components/breakdown/BreakdownNavigation';
import Breakdown from '@/components/breakdown/Breakdown';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useEffect, useState } from 'react';
import { useBreakdownStore } from '@/stores/useBreakdownStore';
import { Box, Divider, Stack } from '@mui/material';
import { DateRange } from '@mui/x-date-pickers-pro';
import dayjs, { Dayjs } from 'dayjs';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { GetChecklistOutput } from '@/hooks/trpc/useChecklistTrpc';
import { Claim } from '@/hooks/trpc/useClaimTrpc';
import BasicButtonStyled from '../common/BasicButtonStyled';
import BasicDateRangePicker from '../common/BasicDateRangePicker';
import ChecklistSelect from '../common/ChecklistSelect';
import ClaimFilter from '../common/ClaimFilter';
import UserFilter from '../common/UserFilter';
import { useRouter } from 'next/navigation';

export default function ChecklistPageBreakdown() {
	const router = useRouter();
	const { checklistId = -1, pageId = -1, instanceId = -1 } = useChecklistParams();
	const today = dayjs();
	const [range, setRange] = useState<DateRange<Dayjs>>([today.startOf('month'), today.endOf('month')]);
	const [users, setUsers] = useState<GetUserOutput[]>([]);
	const [checklist, setChecklist] = useState<GetChecklistOutput | null>(null);
	const [claim, setClaim] = useState<Claim | null>(null);

	const resetBreakdownStore = useBreakdownStore((state) => state.reset);

	useEffect(() => {
		return () => resetBreakdownStore();
	}, []);

	return !checklistId || !pageId || !instanceId ? (
		<></>
	) : (
		<Stack width="100%" display="flex" justifyContent="flex-start" alignItems="flex-start" padding="10px">
			<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center">
				<Box marginRight="5px">
					<BasicButtonStyled
						icon={<ArrowBack />}
						buttonProps={{ onClick: () => router.back() }}
						tooltipProps={{ title: 'Back to dashboard' }}
					/>
				</Box>
				<Box marginRight="5px">
					<BasicDateRangePicker defaultLabel="This Month" defaultValue={range} onConfirm={setRange} />
				</Box>
				<Box marginRight="5px">
					<ChecklistSelect checklist={checklist} setChecklist={setChecklist} clearable={false} />
				</Box>
				<Box marginRight="5px">
					<ClaimFilter claim={claim} setClaim={setClaim} />
				</Box>
				<UserFilter users={users} setUsers={setUsers} width="100%" />
			</Box>
			<Divider flexItem />
			<Box
				width="100%"
				height="calc(100% - 100px)"
				display="flex"
				justifyContent="flex-start"
				alignItems="flex-start"
			>
				<BreakdownNavigation pageId={pageId} instanceId={instanceId} />
				<Breakdown instanceId={instanceId} />
			</Box>
		</Stack>
	);
}
