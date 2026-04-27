'use client';

import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import SearchInput from '@/components/common/SearchInput';
import { useCallback, useState } from 'react';
import type { DateRange } from '@/types/dateTypes';
import dayjs, { Dayjs } from 'dayjs';
import UserActivityTable from './UserActivityTable';
import UserActivityChart from './UserActivityChart';
import BasicDateRangePicker from '@/components/common/BasicDateRangePicker';
import UserFilter from '@/components/common/UserFilter';
import useDebounce from '@/lib/utils/useDebounce';
import Divider from '@/components/ui/Divider';
import Card from '@/components/ui/Card';

export default function UserActivityView() {
	const today = dayjs();
	const [range, setRange] = useState<DateRange<Dayjs>>([today.startOf('month'), today.endOf('month')]);
	const [users, setUsers] = useState<GetUserOutput[]>([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
	const debouncedSearch = useCallback(
		useDebounce((search: string) => setDebouncedSearchTerm(search), 500),
		[]
	);

	return (
		<div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column' as const }}>
			<div style={{ width: '100%', display: 'flex', flexDirection: 'row' as const, alignItems: 'center' }}>
				<div style={{ marginRight: '5px' }}>
					<BasicDateRangePicker defaultLabel="This Month" defaultValue={range} onConfirm={setRange} />
				</div>
				<UserFilter users={users} setUsers={setUsers} width="100%" />
			</div>
			<div style={{ width: '100%' }}>
				<Divider />
			</div>
			<div
				style={{ width: '100%', height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' as const, padding: '20px', overflow: 'auto', gap: 16 }}
			>
				<UserActivityChart users={users} range={range} />

				<Card variant="beveled" padding="lg" style={{ width: '100%' }}>
					<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16, width: '100%' }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<span style={{ fontSize: 18, fontWeight: 600 }}>Response Change Log</span>
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
