import { Box, Paper, Stack, Typography } from '@mui/material';
import Search from '@mui/icons-material/Search';
import UserActivityTable from '../metrics/UserActivity/UserActivityTable';
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
				<Paper elevation={0} sx={styles.searchPaper}>
					<Search
						sx={{
							fontSize: 17,
							marginRight: '5px',
						}}
					/>
					<input
						placeholder="Search by question"
						type="text"
						style={styles.textField}
						value={searchTerm}
						onChange={(e) => {
							setSearchTerm(e.target.value);
							debouncedSearch(e.target.value);
						}}
					/>
				</Paper>
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

const styles = {
	searchPaper: {
		border: 1,
		borderColor: 'divider',
		borderRadius: 3,
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		width: 200,
		height: 30,
	},
	textField: {
		border: 'none',
		outline: 'none',
		padding: '2px 5px',
	},
};
