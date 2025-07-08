'use client';

import { Box, Paper, Stack, Typography } from '@mui/material';
import { People } from '@mui/icons-material';
import PageWrapper from '../common/PageWrapper';
import { BarChart, LineChart } from '@mui/x-charts';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import theme, { BASE_COLOR, OFFWHITE_COLOR } from '@/styles/theme';
import { formatMD } from '@/lib/utils/utils';

export default function UserActivityView() {
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
					<Box width="100%" height={40} display="flex" justifyContent="space-between" alignItems="center">
						<Box display="flex" justifyContent="flex-start" alignItems="center" padding="0px 5px">
							<People sx={{ color: BASE_COLOR, fontSize: 25 }} />
							<Typography marginLeft="5px" fontSize={20}>
								User Activity
							</Typography>
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
							borderRadius={20}
							hideLegend
							loading={isFetching}
						/>
					</Stack>
				</Paper>
				<Paper elevation={0} sx={styles.tablePaper}></Paper>
			</Stack>
		</PageWrapper>
	);
}

const styles = {
	paper: {
		padding: '20px',
		flex: 1,
		maxHeight: 340,
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: 0,
		zIndex: 10,
	},
	tablePaper: {
		flex: 1,
		bgcolor: OFFWHITE_COLOR,
		borderTopLeftRadius: 0,
		borderTopRightRadius: 0,
	},
};
