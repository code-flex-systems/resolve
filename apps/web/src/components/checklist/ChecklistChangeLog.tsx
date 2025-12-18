import { Box, Stack, Typography } from '@mui/material';
import UserActivityTable from '../metrics/UserActivity/UserActivityTable';
import SearchInput from '@/components/common/SearchInput';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useCallback, useState } from 'react';
import useDebounce from '@/lib/utils/useDebounce';

export default function ChecklistChangeLog() {
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const [searchTerm, setSearchTerm] = useState('');
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
	const debouncedSearch = useCallback(
		useDebounce((search: string) => setDebouncedSearchTerm(search), 500),
		[]
	);
	return (
		<Stack
			width="100%"
			height={400}
			display="flex"
			justifyContent="flex-start"
			alignItems="flex-start"
			bgcolor="white"
		>
			<Box
				width="100%"
				height={40}
				display="flex"
				justifyContent="space-between"
				alignItems="center"
				padding="5px 10px"
			>
				<Typography fontSize={15}>Change Log</Typography>
				<SearchInput
					value={searchTerm}
					onChange={(value) => {
						setSearchTerm(value);
						debouncedSearch(value);
					}}
					placeholder="Search by question..."
					width={200}
				/>
			</Box>
			<Box width={480} height={360} padding="0px 5px">
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
			</Box>
		</Stack>
	);
}
