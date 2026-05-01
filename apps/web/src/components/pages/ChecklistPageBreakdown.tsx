'use client';
import BreakdownNavigation from '@/components/breakdown/BreakdownNavigation';
import Breakdown from '@/components/breakdown/Breakdown';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useEffect, useState } from 'react';
import { useBreakdownStore } from '@/stores/useBreakdownStore';
import CustomChip from '@/components/ui/Chip';
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
import { IconQuote } from '@tabler/icons-react';
import Collapse from '@/components/ui/Collapse';
import { useBreadcrumbs } from '@/components/common/BreadcrumbContext';
import styles from './ChecklistPageBreakdown.module.css';

export default function ChecklistPageBreakdown() {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const instanceId = searchParams.get('instanceId') ?? '';
	const pagePosition = Number(searchParams.get('pagePosition') ?? '0');
	const router = useRouter();
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const { checklistId = '' } = useChecklistParams();
	const breakdownClaim = useBreakdownStore((state) => state.breakdownClaim);
	const breakdownRange = useBreakdownStore((state) => state.breakdownRange);
	const breakdownUsers = useBreakdownStore((state) => state.breakdownUsers);
	const answerData = useSelectedBreakdownAnswerData();
	const [showPageSelect, setShowPageSelect] = useState(false);
	const { setSegments } = useBreadcrumbs();

	const { data: instances = [] } = usePageTrpc().listInstances({ checklistId }, { enabled: !!checklistId });
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

	useEffect(() => {
		setSegments([
			{ label: 'Checklists', href: '/admin/checklists/templates' },
			{ label: selectedChecklist?.name ?? 'Loading...' },
			{ label: 'Breakdown' },
		]);
	}, [selectedChecklist?.name, setSegments]);

	const setSearchParams = (newInstanceId: string | null) => {
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
			<div className={styles.page}>
				<div className={styles.toolbar}>
					<ChecklistSelect
						checklist={selectedChecklist ?? null}
						setChecklist={(newChecklist) => {
							if (!newChecklist) return;
							router.push(`/checklists/${newChecklist.id}/breakdown`);
						}}
						showEmpty
						clearable={false}
					/>
					{!!instanceId && (
						<PageInstanceSelect
							checklistId={checklistId}
							instanceId={instanceId}
							setInstanceId={setSearchParams}
							clearable={false}
						/>
					)}
					<BasicDateRangePicker
						defaultLabel="This Month"
						defaultValue={breakdownRange}
						onConfirm={updateBreakdownRange}
					/>
					<ClaimFilter claim={breakdownClaim} setClaim={updateBreakdownClaim} />
					<UserFilter
						users={breakdownUsers}
						setUsers={updateBreakdownUsers}
						width="fit-content"
						text="Filter by responder"
					/>
					<Collapse open={!!answerData}>
						<CustomChip color="info" size="sm">
							<IconQuote size={16} style={{ color: 'var(--text-accent)' }} />
							<span style={{ color: 'var(--text-accent)' }}>{`${answerData?.answer_text ?? ''} (p${pagePosition})`}</span>
						</CustomChip>
					</Collapse>
				</div>
				<div className={styles.content}>
					<BreakdownNavigation />
					<Breakdown />
				</div>
			</div>
			{showPageSelect && <BreakdownPageSelect onClose={() => setShowPageSelect(false)} />}
		</>
	);
}
