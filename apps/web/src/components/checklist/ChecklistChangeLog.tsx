import UserActivityTable from '../metrics/UserActivity/UserActivityTable';
import SearchInput from '@/components/common/SearchInput';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useCallback, useState } from 'react';
import useDebounce from '@/lib/utils/useDebounce';
import Card from '../ui/Card';

export default function ChecklistChangeLog() {
	const { checklistId, claimId } = useChecklistParams();
	const [searchTerm, setSearchTerm] = useState('');
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
	const debouncedSearch = useCallback(
		useDebounce((search: string) => setDebouncedSearchTerm(search), 500),
		[]
	);
	return (
		<Card
			style={{
				width: '100%',
				height: 400,
				display: 'flex',
				justifyContent: 'flex-start',
				alignItems: 'center',
				flexDirection: 'column',
				padding: 5,
			}}
			variant="surface"
		>
			<div
				style={{
					width: '100%',
					height: 40,
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					padding: '5px 10px',
				}}
			>
				<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Change Log</span>
				<SearchInput
					value={searchTerm}
					onChange={(value) => {
						setSearchTerm(value);
						debouncedSearch(value);
					}}
					placeholder="Search by question..."
					width={200}
				/>
			</div>
			<div style={{ width: 480, height: 360, padding: '0px 5px' }}>
				<UserActivityTable
					checklistId={checklistId}
					claimId={claimId}
					users={[]}
					range={[null, null]}
					searchTerm={debouncedSearchTerm}
					showPagination={true}
					pageSize={10}
					compact
				/>
			</div>
		</Card>
	);
}
