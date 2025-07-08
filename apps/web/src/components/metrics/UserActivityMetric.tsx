import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { formatMDY } from '@/lib/utils/utils';
import theme from '@/styles/theme';
import { Box, Divider, IconButton, Paper, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { LineChart } from '@mui/x-charts/LineChart';
import { useRouter } from 'next/navigation';
import { BarChart } from '@mui/x-charts';

const METRIC_WIDTH = 500;
const METRIC_HEIGHT = 300;

export default function UserActivityMetric() {
	const router = useRouter();
	const { data = [], isFetching } = useUserTrpc().activity({});
	const xLabels = data.map((r) => r.activity_date);
	const yValues = data.map((r) => parseInt(r.active_users ?? '0'));

	return (
		<Paper sx={styles.paper}>
			{isFetching ? (
				<Skeleton width={METRIC_WIDTH} height={METRIC_HEIGHT} animation="wave" sx={styles.skeleton} />
			) : (
				<Box display="flex" width={METRIC_WIDTH} height={METRIC_HEIGHT} borderRadius={3} padding="10px">
					<Stack flex={1} display="flex" justifyContent="flex-start" alignItems="flex-start">
						<Box
							width="100%"
							display="flex"
							justifyContent="space-between"
							alignItems="center"
							padding="0px 5px"
						>
							<Typography fontSize={20} paddingTop="5px">
								User Activity
							</Typography>
							<Tooltip title="Open Inspector">
								<span>
									<IconButton onClick={() => router.push('/metrics/user-activity')}>
										<OpenInNew />
									</IconButton>
								</span>
							</Tooltip>
						</Box>
						<div style={styles.divider}>
							<Divider />
						</div>
						<BarChart
							xAxis={[
								{
									scaleType: 'band',
									data: xLabels,
									position: 'none',
									valueFormatter: (v) => formatMDY(v),
									tickMinStep: 1,
									categoryGapRatio: 0.7,
								},
							]}
							yAxis={[{ position: 'none' }]}
							series={[{ data: yValues, label: 'Active users' }]}
							width={475}
							height={200}
							margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
							sx={{
								bgcolor: 'rgba(226, 232, 242, 0.5)',
								borderRadius: 1,
							}}
							colors={[theme.palette.primary.main]}
							borderRadius={10}
							hideLegend
						/>
					</Stack>
				</Box>
			)}
		</Paper>
	);
}

const styles = {
	divider: {
		width: '100%',
		height: 1,
		marginBottom: 5,
	},
	paper: {
		borderRadius: 3,
		margin: '10px',
	},
	skeleton: {
		borderRadius: 3,
	},
};
