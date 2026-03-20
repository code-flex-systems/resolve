'use client';
import BreakdownNavigation from '@/components/breakdown/BreakdownNavigation';
import Breakdown from '@/components/breakdown/Breakdown';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useEffect, useState } from 'react';
import { useBreakdownStore } from '@/stores/useBreakdownStore';
import { Box, Chip, Stack } from '@mui/material';
import BasicButtonStyled from '../common/BasicButtonStyled';
import BasicDateRangePicker from '../common/BasicDateRangePicker';
import ClaimFilter from '../common/ClaimFilter';
import UserFilter from '../common/UserFilter';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';
import BreakdownPageSelect from '../breakdown/BreakdownPageSelect';
import PageInstanceSelect from '../common/PageInstanceSelect';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import ChecklistSelect from '../common/ChecklistSelect';
import useSelectedBreakdownAnswerData from '@/hooks/useSelectedBreakdownAnswerData';
import { IconArrowLeft, IconQuote } from '@tabler/icons-react';
import Collapse from '@/components/ui/Collapse';
import Divider from '@/components/ui/Divider';

export default function ChecklistPageBreakdown() {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const instanceId = +(searchParams.get('instanceId') ?? -1);
	const pageId = +(searchParams.get('pageId') ?? -1);
	const router = useRouter();
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const { checklistId = -1 } = useChecklistParams();
	const breakdownClaim = useBreakdownStore((state) => state.breakdownClaim);
	const breakdownRange = useBreakdownStore((state) => state.breakdownRange);
	const breakdownUsers = useBreakdownStore((state) => state.breakdownUsers);
	const selectedQuestionId = useBreakdownStore((state) => state.selectedQuestionId);
	const answerData = useSelectedBreakdownAnswerData();
	const [showPageSelect, setShowPageSelect] = useState(false);

	const { data: instances = [] } = usePageTrpc().listInstances({ checklistId }, { enabled: checklistId !== -1 });
	const { data: checklists = [] } = useChecklistTrpc().list({});
	const selectedChecklist = checklists.find((c) => c.id === checklistId);

	const updateBreakdownClaim = useBreakdownStore((state) => state.updateBreakdownClaim);
	const updateBreakdownRange = useBreakdownStore((state) => state.updateBreakdownRange);
	const updateBreakdownUsers = useBreakdownStore((state) => state.updateBreakdownUsers);
	const resetBreakdownStore = useBreakdownStore((state) => state.reset);

	useEffect(() => {
		return () => resetBreakdownStore();
	}, []);

	useEffect(() => {
		if (!searchParams.get('pageId') || !searchParams.get('instanceId')) {
			setShowPageSelect(true);
		}
	}, [searchParams.get('pageId'), searchParams.get('instanceId')]);

	const setSearchParams = (newInstanceId: number | null) => {
		if (!newInstanceId) return;
		const selectedPage = instances.find((i) => i.instance_id === newInstanceId);
		if (!selectedPage) return;
		const params = new URLSearchParams(searchParams.toString());
		params.set('pageId', selectedPage.id.toString());
		params.set('instanceId', selectedPage.instance_id.toString());
		router.replace(`${pathname}?${params.toString()}`);
	};

	if ((!isAdmin && !isSuperAdmin) || !checklistId) return <></>;

	return (
		<>
			<Stack
				flex={1}
				width="100%"
				display="flex"
				justifyContent="flex-start"
				alignItems="flex-start"
				padding="10px"
				bgcolor="#F9FAFC"
			>
				<Box
					width="100%"
					display="flex"
					justifyContent="flex-start"
					alignItems="center"
					overflow="auto"
					padding="0px 2px"
				>
					<Box marginRight="5px">
						<BasicButtonStyled
							icon={<IconArrowLeft size={20} />}
							buttonProps={{ onClick: () => router.push('/admin/workflow-configuration/checklists') }}
							tooltipProps={{ title: 'Back to dashboard' }}
						/>
					</Box>
					<Box marginRight="5px">
						<ChecklistSelect
							checklist={selectedChecklist ?? null}
							setChecklist={(newChecklist) => {
								if (!newChecklist) return;
								router.push(`/checklist/${newChecklist.id}/breakdown`);
							}}
							showEmpty
							clearable={false}
						/>
					</Box>
					{/* <Collapse open={instanceId !== -1}> */}
					{instanceId !== -1 && (
						<Box marginRight="5px">
							<PageInstanceSelect
								checklistId={checklistId}
								instanceId={instanceId}
								setInstanceId={setSearchParams}
								clearable={false}
							/>
						</Box>
					)}
					{/* </Collapse> */}
					<Box marginRight="5px">
						<BasicDateRangePicker
							defaultLabel="This Month"
							defaultValue={breakdownRange}
							onConfirm={updateBreakdownRange}
						/>
					</Box>
					<Box marginRight="5px">
						<ClaimFilter claim={breakdownClaim} setClaim={updateBreakdownClaim} />
					</Box>
					<UserFilter
						users={breakdownUsers}
						setUsers={updateBreakdownUsers}
						width="fit-content"
						text="Filter by responder"
					/>
					<Collapse open={!!answerData}>
						<Box marginLeft="5px">
							<Chip
								label={`${answerData?.answer_text ?? ''} (p${pageId}.q${selectedQuestionId}.a${answerData?.answer_id ?? ''})`}
								icon={<IconQuote size={20} />}
								sx={{
									height: 30,
									margin: '5px 0px',
									'& .MuiChip-icon': {
										color: 'var(--text-accent)',
									},
									'& .MuiChip-label': {
										color: 'var(--text-accent)',
									},
								}}
							/>
						</Box>
					</Collapse>
				</Box>
				<Divider />
				<Box
					width="100%"
					height="calc(100vh - 70px)"
					display="flex"
					justifyContent="flex-start"
					alignItems="flex-start"
					padding="20px 10px"
				>
					<BreakdownNavigation />
					<Breakdown />
				</Box>
			</Stack>
			{showPageSelect && <BreakdownPageSelect onClose={() => setShowPageSelect(false)} />}
		</>
	);
}
