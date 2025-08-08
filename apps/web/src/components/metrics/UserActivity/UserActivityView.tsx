'use client';

import { Box, Divider, Paper, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import PageWrapper from '@/components/common/PageWrapper';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { useState } from 'react';
import { DateRange } from '@mui/x-date-pickers-pro';
import dayjs, { Dayjs } from 'dayjs';
import UserActivityTable from './UserActivityTable';
import Toolbar from '@/components/common/Toolbar';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import { useRouter } from 'next/navigation';
import UserActivityChart from './UserActivityChart';
import { useAdminSlice } from '@/state/store';

export default function UserActivityView() {
	const selectedChecklistId = useAdminSlice((state) => state.selectedChecklistId) ?? -1;
	const router = useRouter();
	const today = dayjs();
	const [range, setRange] = useState<DateRange<Dayjs>>([today.startOf('month'), today.endOf('month')]);
	const [users, setUsers] = useState<GetUserOutput[]>([]);

	return (
		<PageWrapper>
			<Stack
				flex={1}
				width="100%"
				display="flex"
				justifyContent="flex-start"
				alignItems="flex-start"
				padding="10px"
			>
				<Toolbar
					left={
						<>
							<Box marginRight="5px">
								<BasicButtonStyled
									icon={<ArrowBack />}
									buttonProps={{ onClick: () => router.back() }}
									tooltipProps={{ title: 'Back to dashboard' }}
								/>
							</Box>
						</>
					}
					padding={0}
				/>
				<div style={styles.divider}>
					<Divider />
				</div>
				<Box
					width="100%"
					height="calc(100vh - 70px)"
					display="flex"
					justifyContent="flex-start"
					alignItems="flex-start"
					padding="20px 10px 20px"
					bgcolor="#F7F8FA"
				>
					<UserActivityChart users={users} setUsers={setUsers} range={range} setRange={setRange} />
					<Box width="100%" height="100%" marginLeft="10px">
						<Paper sx={styles.paper}>
							<UserActivityTable checklistId={selectedChecklistId} users={users} range={range} />
						</Paper>
					</Box>
				</Box>
			</Stack>
		</PageWrapper>
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
		height: 1,
	},
	paper: {
		width: '100%',
		height: '100%',
		zIndex: 10,
		border: '1px solid #E0E0E0',
		paddingTop: '10px',
	},
	table: {
		width: '49.5%',
		height: 'calc(100vh - 290px)',
		padding: '10px 10px 0px',
		border: '1px solid #E0E0E0',
	},
};
