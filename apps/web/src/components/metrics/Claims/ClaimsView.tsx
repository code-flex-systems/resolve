'use client';

import { Box, Divider, Paper, Stack, Typography } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import PageWrapper from '@/components/common/PageWrapper';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { useState } from 'react';
import { DateRange } from '@mui/x-date-pickers-pro';
import dayjs, { Dayjs } from 'dayjs';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import { useRouter } from 'next/navigation';
import ChecklistSelect from '@/components/common/ChecklistSelect';
import BasicDateRangePicker from '@/components/common/BasicDateRangePicker';
import UserFilter from '@/components/common/UserFilter';
import ClaimFilter from '@/components/common/ClaimFilter';
import { Claim } from '@/hooks/trpc/useClaimTrpc';
import { GetChecklistOutput } from '@/hooks/trpc/useChecklistTrpc';

export default function ClaimsView() {
	const router = useRouter();
	const today = dayjs();
	const [range, setRange] = useState<DateRange<Dayjs>>([today.startOf('month'), today.endOf('month')]);
	const [users, setUsers] = useState<GetUserOutput[]>([]);
	const [checklist, setChecklist] = useState<GetChecklistOutput | null>(null);
	const [claim, setClaim] = useState<Claim | null>(null);

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
				<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center">
					<Box marginRight="5px">
						<BasicButtonStyled
							icon={<ArrowBack />}
							buttonProps={{ onClick: () => router.back() }}
							tooltipProps={{ title: 'Back to dashboard' }}
						/>
					</Box>
					<Box marginRight="5px">
						<BasicDateRangePicker defaultLabel="This Month" defaultValue={range} onConfirm={setRange} />
					</Box>
					<Box marginRight="5px">
						<ChecklistSelect checklist={checklist} setChecklist={setChecklist} />
					</Box>
					<Box marginRight="5px">
						<ClaimFilter claim={claim} setClaim={setClaim} />
					</Box>
					<UserFilter users={users} setUsers={setUsers} width="100%" />
				</Box>
				<div style={styles.divider}>
					<Divider />
				</div>
				<Box
					width="100%"
					height="calc(100vh - 70px)"
					display="flex"
					justifyContent="flex-start"
					alignItems="flex-start"
					bgcolor="#F7F8FA"
					padding="20px"
				>
					<Paper elevation={0} sx={styles.paper}>
						<Box
							width="100%"
							height={40}
							display="flex"
							justifyContent="space-between"
							alignItems="center"
							padding="5px 10px"
						>
							<Typography fontSize={15}>Change Log</Typography>
						</Box>
						<Box height="calc(100% - 40px)"></Box>
					</Paper>
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
		borderRadius: 0,
		padding: '20px',
		borderRadius: 6,
	},
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
	table: {
		width: '49.5%',
		height: 'calc(100vh - 290px)',
		border: '1px solid #E0E0E0',
	},
	textField: {
		border: 'none',
		outline: 'none',
		padding: '2px 5px',
	},
};
