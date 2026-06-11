'use client';

import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import SearchInput from '@/components/common/SearchInput';
import { useCallback, useMemo, useState } from 'react';
import type { DateRange } from '@/types/dateTypes';
import dayjs, { Dayjs } from 'dayjs';
import UserActivityTable from './UserActivityTable';
import UserActivityChart from './UserActivityChart';
import BasicDateRangePicker from '@/components/common/BasicDateRangePicker';
import UserFilter from '@/components/common/UserFilter';
import useDebounce from '@/lib/utils/useDebounce';
import Card from '@/components/ui/Card';
import ExportButton from '@/components/common/ExportButton';
import { CsvColumn } from '@/lib/utils/exportUtils';
import { trpc } from '@/lib/trpc';
import { useSession } from '@/lib/auth/use-session';
import { formatUser } from '@/lib/utils/utils';
import styles from './ChecklistActivityView.module.css';

export default function ChecklistActivityView() {
	const today = dayjs();
	const [range, setRange] = useState<DateRange<Dayjs>>([
		today.startOf('month'),
		today.endOf('month'),
	]);
	const [users, setUsers] = useState<GetUserOutput[]>([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
	const [logCount, setLogCount] = useState(0);
	const debouncedSearch = useCallback(
		useDebounce((search: string) => setDebouncedSearchTerm(search), 500),
		[]
	);

	const trpcUtils = trpc.useUtils();
	const { data: session } = useSession();

	const exportFilters = useMemo(
		() => ({
			emails: users.map((u) => u.email),
			range: [range[0]?.toString() ?? null, range[1]?.toString() ?? null] as [
				string | null,
				string | null,
			],
			searchTerm: debouncedSearchTerm,
		}),
		[users, range, debouncedSearchTerm]
	);

	const csvColumns: CsvColumn<any>[] = useMemo(
		() => [
			{
				header: 'Action',
				accessor: 'action',
				formatter: (value) => {
					switch (value) {
						case 'insert':
							return 'Insert';
						case 'update':
							return 'Update';
						case 'delete':
							return 'Delete';
						default:
							return value || '';
					}
				},
			},
			{ header: 'Question', accessor: 'question_text' },
			{ header: 'Page', accessor: 'page_label' },
			{ header: 'Old Response Text', accessor: 'old_response_text', formatter: (v) => v || '' },
			{ header: 'New Response Text', accessor: 'new_response_text', formatter: (v) => v || '' },
			{
				header: 'Old Answers',
				accessor: (row: any) => {
					try {
						const answers =
							typeof row.old_answers === 'string' ? JSON.parse(row.old_answers) : row.old_answers;
						return Array.isArray(answers) ? answers.map((a: any) => a.label).join(', ') : '';
					} catch {
						return '';
					}
				},
			},
			{
				header: 'New Answers',
				accessor: (row: any) => {
					try {
						const answers =
							typeof row.new_answers === 'string' ? JSON.parse(row.new_answers) : row.new_answers;
						return Array.isArray(answers) ? answers.map((a: any) => a.label).join(', ') : '';
					} catch {
						return '';
					}
				},
			},
			{
				header: 'User',
				accessor: (row: any) =>
					formatUser(
						{ email: row.email ?? '', first: row.first ?? '', last: row.last ?? '' },
						session?.user?.email ?? undefined
					),
			},
			{ header: 'User Email', accessor: 'email' },
			{
				header: 'Timestamp',
				accessor: 'created_at',
				formatter: (value) => dayjs(value).format('MMMM D, YYYY hh:mm A'),
			},
		],
		[session?.user?.email]
	);

	return (
		<div className={styles.page}>
			<div className={styles.toolbar}>
				<BasicDateRangePicker defaultLabel="This Month" defaultValue={range} onConfirm={setRange} />
				<UserFilter users={users} setUsers={setUsers} width={280} />
			</div>
			<UserActivityChart users={users} range={range} />

			<Card variant="beveled" padding="lg">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
					<div className={styles.cardHeader}>
						<span className={styles.cardTitle}>Response Change Log</span>
						<div className={styles.cardActions}>
							<span className={styles.cardCount}>
								{logCount.toLocaleString()} event{logCount !== 1 ? 's' : ''}
							</span>
							<SearchInput
								value={searchTerm}
								onChange={(value) => {
									setSearchTerm(value);
									debouncedSearch(value);
								}}
								placeholder="Search by question..."
							/>
							<ExportButton
								onExport={async () => {
									const result = await trpcUtils.response.exportResponseAuditLogs.fetch({
										filters: exportFilters,
									});
									return result;
								}}
								columns={csvColumns}
								filename="checklist_activity"
								size="sm"
							/>
						</div>
					</div>
					<div className={styles.tableArea}>
						<UserActivityTable
							users={users}
							range={range}
							searchTerm={debouncedSearchTerm}
							onCountChange={setLogCount}
						/>
					</div>
				</div>
			</Card>
		</div>
	);
}
