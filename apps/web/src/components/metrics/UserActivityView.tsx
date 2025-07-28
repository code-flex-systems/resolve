'use client';

import { Box, Divider, Paper, Stack } from '@mui/material';
import { GraphicEq } from '@mui/icons-material';
import PageWrapper from '../common/PageWrapper';
import { BarChart } from '@mui/x-charts-pro';
import { GetUserOutput, useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import theme from '@/styles/theme';
import { formatMD } from '@/lib/utils/utils';
import BasicDateRangePicker from '../common/BasicDateRangePicker';
import { useEffect, useState } from 'react';
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
				alignContent="flex-start"
				justifyContent="flex-start"
				padding="20px"
			>
				<Paper sx={styles.paper}>
					<Stack
						width="100%"
						flex={1}
						display="flex"
						alignContent="flex-start"
						justifyContent="flex-start"
						padding="20px"
					>
						<Box
							width="100%"
							display="flex"
							justifyContent="flex-start"
							alignItems="center"
							padding="5px 5px 10px"
						>
							<ExpandableTitle
								title="User Activity"
								icon={<GraphicEq sx={{ color: 'white' }} />}
								bgcolor="#EBEBEB"
								color={theme.palette.warning.main}
							/>
						</Box>
						<div style={styles.divider}>
							<Divider />
						</div>
						<Box>
							<BasicDateRangePicker defaultLabel="This Month" defaultValue={range} onConfirm={setRange} />
						</Box>

						<UserFilter users={users} setUsers={setUsers} width="100%" padding="0px 0px 10px" />
						<Box width="100%" display="flex" alignContent="center" justifyContent="space-between">
							<Paper elevation={0} sx={styles.table}>
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
									yAxis={[{ tickMinStep: 1 }]}
									series={[{ data: yValues, label: 'Active users' }]}
									margin={{ left: 0, right: 30, top: 30, bottom: 10 }}
									sx={{
										bgcolor: 'rgba(226, 232, 242, 0.5)',
										borderRadius: 1,
										height: 300,
									}}
									colors={[theme.palette.primary.main]}
									hideLegend
									loading={isFetching}
								/>
							</Paper>
							<Paper elevation={0} sx={styles.table}>
								<UserActivityTable users={users} range={range} />
							</Paper>
						</Box>
					</Stack>
				</Paper>
			</Stack>
		</PageWrapper>
	);
}

const styles = {
	divider: {
		width: '100%',
		height: 1,
		margin: '5px 0px',
	},
	paper: {
		width: '100%',
		flex: 1,
		zIndex: 10,
		border: '1px solid #E0E0E0',
	},
	table: {
		width: '49.5%',
		height: 'calc(100vh - 290px)',
		padding: '10px 10px 0px',
		border: '1px solid #E0E0E0',
	},
};
