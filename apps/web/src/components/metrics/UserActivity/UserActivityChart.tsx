'use client';
import { BarChart } from '@mui/x-charts-pro';
import theme from '@/styles/theme';
import { Box, Divider, Paper, Stack } from '@mui/material';
import { GraphicEq } from '@mui/icons-material';
import { formatMD } from '@/lib/utils/utils';
import BasicDateRangePicker from '@/components/common/BasicDateRangePicker';
import UserFilter from '@/components/common/UserFilter';
import dayjs, { Dayjs } from 'dayjs';
import { GetUserOutput, useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { DateRange } from '@mui/x-date-pickers-pro';
import ChecklistSelect from '@/components/common/ChecklistSelect';
import { useAdminSlice } from '@/state/store';
import { setChecklistId } from '@/state/admin/actions';
import ExpandableTitle from '@/components/common/ExpandableTitle';

export default function UserActivityChart({
	users,
	range,
	setUsers,
	setRange,
}: {
	users: GetUserOutput[];
	range: DateRange<Dayjs>;
	setUsers: (newUsers: GetUserOutput[]) => void;
	setRange: (newRange: DateRange<Dayjs>) => void;
}) {
	const selectedChecklistId = useAdminSlice((state) => state.selectedChecklistId) ?? -1;
	const { data = [], isFetching } = useUserTrpc().activity(
		{ checklistId: selectedChecklistId },
		{ enabled: selectedChecklistId !== -1 }
	);
	const xLabels = data.map((r) => r.activity_date);
	const yValues = data.map((r) => parseInt(r.active_users ?? '0'));

	return (
		<Paper sx={styles.paper}>
			<Box
				width="100%"
				display="flex"
				justifyContent="flex-start"
				alignItems="center"
				padding="10px"
				position="relative"
			>
				<Box
					sx={{
						width: 'fit-content',
						position: 'absolute',
						top: -7,
						zIndex: 10,
						borderRadius: 5,
					}}
					className="flex-row-center"
				>
					<ExpandableTitle
						title="User Activity"
						icon={<GraphicEq sx={{ color: 'white' }} />}
						color={theme.palette.warning.main}
						bgcolor="#EBEBEB"
					/>
				</Box>
			</Box>
			<Stack padding="5px 10px 0px">
				<Box padding="5px">
					<ChecklistSelect selected={selectedChecklistId} setSelected={setChecklistId} color="secondary" />
				</Box>
				<Box>
					<BasicDateRangePicker defaultLabel="This Month" defaultValue={range} onConfirm={setRange} />
				</Box>
				<UserFilter users={users} setUsers={setUsers} width="100%" padding="0px 0px 10px" />
			</Stack>
			<div style={styles.divider}>
				<Divider />
			</div>
			<Box height="100%" padding="20px">
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
						borderRadius: 1,
					}}
					onItemClick={(_, d) => {
						const value = data[d.dataIndex];
						if (value) setRange([dayjs(value.activity_date), dayjs(value.activity_date)]);
					}}
					borderRadius={10}
					width={700}
					colors={[theme.palette.primary.main]}
					hideLegend
					loading={isFetching}
				/>
			</Box>
		</Paper>
	);
}

const styles = {
	divider: {
		width: '100%',
		height: 1,
		padding: '5px 10px',
	},
	paper: {
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		minWidth: 'fit-content',
		height: '100%',
		// backgroundColor: OFFWHITE_COLOR,
	},
	row: {
		width: '100%',
		padding: 10,
	},
};
