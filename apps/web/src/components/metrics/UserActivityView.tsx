'use client';

import { Box, Paper, Stack } from '@mui/material';
import { GraphicEq } from '@mui/icons-material';
import PageWrapper from '../common/PageWrapper';
import { BarChart } from '@mui/x-charts-pro';
import { GetUserOutput, useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import theme, { OFFWHITE_COLOR } from '@/styles/theme';
import { formatMD } from '@/lib/utils/utils';
import BasicDateRangePicker from '../common/BasicDateRangePicker';
import { useState } from 'react';
import { DateRange } from '@mui/x-date-pickers-pro';
import dayjs, { Dayjs } from 'dayjs';
import ExpandableTitle from '../common/ExpandableTitle';
import UserFilter from '../common/UserFilter';
import UserActivityTable from './UserActivityTable';

export default function UserActivityView() {
	const today = dayjs();
	const [range, setRange] = useState<DateRange<Dayjs>>([today.startOf('month'), today.endOf('month')]);
	const [users, setUsers] = useState<GetUserOutput[]>([]);
	const { data = [], isFetching } = useUserTrpc().activity({});
	const xLabels = data.map((r) => r.activity_date);
	const yValues = data.map((r) => parseInt(r.active_users ?? '0'));

	return (
		<PageWrapper route="user-activity">
			<Stack
				width="100%"
				flex={1}
				display="flex"
				alignContent="center"
				justifyContent="flex-start"
				padding="20px"
			>
				<Paper sx={styles.paper}>
					<Box width="100%" display="flex" justifyContent="space-between" alignItems="center">
						<Box display="flex" justifyContent="flex-start" alignItems="center" padding="5px">
							<ExpandableTitle
								title="User Activity"
								icon={<GraphicEq sx={{ color: 'white' }} />}
								color={theme.palette.warning.main}
							/>
						</Box>
					</Box>
					<Box width="100%" display="flex" justifyContent="space-between" alignItems="center">
						<Box display="flex" justifyContent="flex-start" alignItems="center" padding="0px 5px 5px">
							<BasicDateRangePicker defaultLabel="This Month" defaultValue={range} onConfirm={setRange} />
							<UserFilter users={users} setUsers={setUsers} width="100%" />
						</Box>
					</Box>
					<Stack flex={1} height="100%">
						{/* <LineChart
							xAxis={[
								{
									scaleType: 'point',
									data: xLabels,
									valueFormatter: (v) => formatMD(v),
									height: 50,
									tickLabelStyle: {
										angle: 45,
									},
									tickMinStep: 1,
								},
							]}
							yAxis={[{ label: 'Users', min: 0 }]}
							series={[{ data: yValues, label: 'Active users' }]}
							margin={{ left: 20, right: 20, top: 30, bottom: 10 }}
							sx={{ maxHeight: 260, bgcolor: 'rgba(226, 232, 242, 0.5)' }}
							colors={[theme.palette.primary.main]}
							hideLegend
							loading={isFetching}
						/> */}
						<BarChart
							xAxis={[
								{
									scaleType: 'band',
									data: xLabels,
									valueFormatter: (v) => formatMD(v),
									height: 50,
									tickMinStep: 1,
									tickLabelStyle: {
										angle: 45,
									},
									categoryGapRatio: 0.5,
								},
							]}
							yAxis={[{ label: 'Users', min: 0 }]}
							series={[{ data: yValues, label: 'Active users' }]}
							margin={{ left: 20, right: 20, top: 30, bottom: 10 }}
							sx={{
								bgcolor: 'rgba(226, 232, 242, 0.5)',
								borderRadius: 1,
								maxHeight: 260,
							}}
							colors={[theme.palette.primary.main]}
							hideLegend
							loading={isFetching}
						/>
					</Stack>
				</Paper>
				<Paper elevation={0} sx={styles.tablePaper}>
					<UserActivityTable users={users} range={range} />
				</Paper>
			</Stack>
		</PageWrapper>
	);
}

const styles = {
	paper: {
		padding: '20px',
		flex: 1,
		maxHeight: 400,
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: 0,
		zIndex: 10,
	},
	tablePaper: {
		width: '50%',
		height: 'calc(100vh - 475px)',
		bgcolor: OFFWHITE_COLOR,
		borderTopLeftRadius: 0,
		borderTopRightRadius: 0,
	},
};
