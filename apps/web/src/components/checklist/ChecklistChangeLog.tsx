import { useChecklistSlice } from '@/state/store';
import { Box, Collapse, Divider, Stack, Typography } from '@mui/material';
import UserActivityTable from '../metrics/UserActivity/UserActivityTable';
import { useSession } from 'next-auth/react';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import dayjs from 'dayjs';

export default function ChecklistChangeLog() {
	const { checklistId = -1 } = useChecklistParams();
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
				justifyContent="flex-start"
				alignItems="center"
				padding="5px 10px"
			>
				<Typography fontSize={15}>Change Log</Typography>
			</Box>
			<Box width={460} height={360}>
				<UserActivityTable
					checklistId={checklistId}
					users={[]}
					range={[null, null]}
					showPagination={true}
					pageSize={10}
					compact
				/>
			</Box>
		</Stack>
	);
}
