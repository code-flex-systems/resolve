'use client';

import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import SearchInput from '@/components/common/SearchInput';
import { useCallback, useState } from 'react';
import { DateRange } from '@mui/x-date-pickers-pro';
import dayjs, { Dayjs } from 'dayjs';
import UserActivityTable from './UserActivityTable';
import { useRouter } from 'next/navigation';
import UserActivityChart from './UserActivityChart';
import ChecklistSelect from '@/components/common/ChecklistSelect';
import BasicDateRangePicker from '@/components/common/BasicDateRangePicker';
import UserFilter from '@/components/common/UserFilter';
import useDebounce from '@/lib/utils/useDebounce';
import ClaimFilter from '@/components/common/ClaimFilter';
import { Claim } from '@/hooks/trpc/useClaimTrpc';
import { GetChecklistOutput } from '@/hooks/trpc/useChecklistTrpc';
import Divider from '@/components/ui/Divider';
import Card from '@/components/ui/Card';

export default function UserActivityView() {
	const router = useRouter();
	const today = dayjs();
	const [range, setRange] = useState<DateRange<Dayjs>>([today.startOf('month'), today.endOf('month')]);
	const [users, setUsers] = useState<GetUserOutput[]>([]);
	const [checklist, setChecklist] = useState<GetChecklistOutput | null>(null);
	const [claim, setClaim] = useState<Claim | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
	const debouncedSearch = useCallback(
		useDebounce((search: string) => setDebouncedSearchTerm(search), 500),
		[]
	);

	return (
		<div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column' as const, justifyContent: 'flex-start', alignItems: 'flex-start' }}>
			<div style={{ width: '100%', display: 'flex', flexDirection: 'row' as const, justifyContent: 'flex-start', alignItems: 'center' }}>
				<div style={{ marginRight: '5px' }}>
					<BasicDateRangePicker defaultLabel="This Month" defaultValue={range} onConfirm={setRange} />
				</div>
				<div style={{ marginRight: '5px' }}>
					<ChecklistSelect checklist={checklist} setChecklist={setChecklist} />
				</div>
				<div style={{ marginRight: '5px' }}>
					<ClaimFilter claim={claim} setClaim={setClaim} />
				</div>
				<UserFilter users={users} setUsers={setUsers} width="100%" />
			</div>
			<div style={styles.divider}>
				<Divider />
			</div>
			<div
style={{ width: '100%', height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' as const, justifyContent: 'flex-start', alignItems: 'flex-start', padding: '20px', overflow: 'auto', gap: 16 }}>
				<UserActivityChart
					checklistId={checklist?.id}
					claimId={claim?.id}
					users={users}
					range={range}
					searchTerm={debouncedSearchTerm}
				/>
				<Card variant="beveled" padding="lg" style={{ width: '100%' }}>
					<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16, width: '100%' }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<span style={{ fontSize: 18, fontWeight: 600 }}>Change Log</span>
							<SearchInput
								value={searchTerm}
								onChange={(value) => {
									setSearchTerm(value);
									debouncedSearch(value);
								}}
								placeholder="Search by question..."
							/>
						</div>
						<div style={{ height: 500 }}>
							<UserActivityTable
								checklistId={checklist?.id}
								claimId={claim?.id}
								users={users}
								range={range}
								searchTerm={debouncedSearchTerm}
							/>
						</div>
					</div>
				</Card>
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
		height: 'calc(100vh - 60px)',
		padding: '20px 0px 10px',
	},
	divider: {
		width: '100%',
	},
	dividerDot: {
		minWidth: 5,
		width: 5,
		height: 5,
		borderRadius: 10,
		backgroundColor: '#d9d9d9',
		margin: '0px 5px',
	},
	paper: {
		width: '100%',
		height: '100%',
		zIndex: 10,
		padding: '24px',
		marginTop: '20px',
	},
	table: {
		width: '49.5%',
		height: 'calc(100vh - 290px)',
		border: '1px solid #E0E0E0',
	},
};
