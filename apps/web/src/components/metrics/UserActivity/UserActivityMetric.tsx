'use client';

import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { formatMDY } from '@/lib/utils/utils';
import theme from '@/styles/theme';
import { Box, Divider, Paper, Skeleton, Stack } from '@mui/material';
import { GraphicEq, InfoOutlined, Troubleshoot } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { BarChart } from '@mui/x-charts-pro';
import ExpandableTitle from '@/components/common/ExpandableTitle';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import UserActivityTable from './UserActivityTable';
import dayjs from 'dayjs';
import ChecklistSelect from '@/components/common/ChecklistSelect';
import { useAdminSlice } from '@/state/store';
import { setChecklistId } from '@/state/admin/actions';

const METRIC_WIDTH = 650;
const METRIC_HEIGHT = 500;

export default function UserActivityMetric() {
	const selectedChecklistId = useAdminSlice((state) => state.selectedChecklistId) ?? -1;
	const today = dayjs();
	const router = useRouter();
	const { data = [], isFetching } = useUserTrpc().activity(
		{ checklistId: selectedChecklistId },
		{ enabled: selectedChecklistId !== -1 }
	);
	const xLabels = data.map((r) => r.activity_date);
	const yValues = data.map((r) => parseInt(r.active_users ?? '0'));

	return (
		<Paper sx={styles.paper}>
			{isFetching ? (
				<Skeleton width={METRIC_WIDTH} height={METRIC_HEIGHT} animation="wave" sx={styles.skeleton} />
			) : (
				<Box display="flex" width={METRIC_WIDTH} height={METRIC_HEIGHT} borderRadius={3} padding="10px">
					<Stack
						flex={1}
						display="flex"
						justifyContent="flex-start"
						alignItems="flex-start"
						position="relative"
					>
						<Box
							width="100%"
							display="flex"
							justifyContent="space-between"
							alignItems="center"
							padding="0px 5px"
						>
							<ExpandableTitle
								title="User Activity"
								icon={<GraphicEq sx={{ color: 'white' }} />}
								color={theme.palette.warning.main}
								bgcolor="#EBEBEB"
								padding="5px 0px 10px"
							/>
							<Box display="flex" justifyContent="flex-end" alignItems="center">
								<Box margin="0px 10px 5px 5px">
									<ChecklistSelect selected={selectedChecklistId} setSelected={setChecklistId} />
								</Box>

								<Box marginRight="5px">
									<BasicButtonStyled
										buttonProps={{}}
										icon={<InfoOutlined />}
										tooltipProps={{
											title: 'Engagement is measured by the number of users generating activity logs for a given day.',
										}}
									/>
								</Box>
								<BasicButtonStyled
									buttonProps={{
										onClick: () => router.push('/metrics/user-activity'),
										sx: { marginLeft: '5px' },
									}}
									icon={
										<Troubleshoot
											sx={{
												transform: 'scaleX(-1)',
												color: theme.palette.primary.main,
											}}
										/>
									}
									tooltipProps={{ title: 'Open in Inspector' }}
								/>
							</Box>
						</Box>
						<div style={styles.divider}>
							<Divider />
						</div>
						<Box
							display="flex"
							justifyContent="center"
							alignItems="flex-end"
							height={120}
							bgcolor="rgba(226, 232, 242, 0.5)"
						>
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
								width={625}
								height={100}
								margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
								sx={{
									borderRadius: 1,
								}}
								colors={[theme.palette.primary.main]}
								borderRadius={10}
								hideLegend
							/>
						</Box>
						<Paper elevation={0} sx={styles.paperInner}>
							<Box width="100%" height="100%" padding="10px">
								<UserActivityTable
									checklistId={selectedChecklistId}
									users={[]}
									range={[today.startOf('week'), today.endOf('week')]}
									showPagination={false}
								/>
							</Box>
						</Paper>
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
	paperInner: {
		position: 'absolute',
		zIndex: 100,
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'column',
		width: 625,
		height: 335,
		bottom: 0,
		borderTopLeftRadius: 0,
		borderTopRightRadius: 0,
		border: 1,
		borderColor: 'divider',
		borderTop: 'none',
		borderRadius: 3,
	},
	skeleton: {
		borderRadius: 3,
	},
};
