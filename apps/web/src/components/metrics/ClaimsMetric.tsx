'use client';

import { ClaimStatus } from '@/config/enums';
import theme from '@/styles/theme';
import { Box, Divider, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { CheckCircle, InfoOutlined, Troubleshoot } from '@mui/icons-material';
import { PieChart } from '@mui/x-charts-pro';
import { useMemo } from 'react';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import ExpandableTitle from '../common/ExpandableTitle';
import { useRouter } from 'next/navigation';
import { AnimatedCounter } from '../common/AnimatedCounter';
import BasicButtonStyled from '../common/BasicButtonStyled';
import ChecklistSelect from '../common/ChecklistSelect';
import { useAdminSlice } from '@/state/store';
import { setChecklistId } from '@/state/admin/actions';

const METRIC_WIDTH = 400;
const METRIC_HEIGHT = 350;

function getProgressPercentage(completed: number, total: number) {
	if (completed === 0 || total === 0) return 0;
	return Math.floor((completed / total) * 100);
}

function getStatusColor(status: ClaimStatus) {
	switch (status) {
		case ClaimStatus.SUBMITTED:
			return theme.palette.success.light;
		case ClaimStatus.IN_PROGRESS:
			return theme.palette.warning.light;
		case ClaimStatus.UNWORKED:
			return theme.palette.error.light;
	}
}

export default function ClaimsMetric() {
	const selectedChecklistId = useAdminSlice((state) => state.selectedChecklistId);
	const { data: checklists = [] } = useChecklistTrpc().list({});
	const { data = {}, isFetching } = useChecklistTrpc().stats();
	const router = useRouter();

	const selectedChecklistOption = useMemo(() => {
		const option = checklists.find((o) => o.id === selectedChecklistId);
		return option ? { ...option, key: `${option.id}:${option.name}` } : null;
	}, [checklists, selectedChecklistId]);

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
							<ExpandableTitle
								title="Claim Submission"
								icon={<CheckCircle sx={{ color: 'white' }} />}
								color={theme.palette.warning.main}
								bgcolor="#EBEBEB"
								padding="5px 0px 10px"
							/>
							<Box display="flex" justifyContent="flex-end" alignItems="center">
								<Box marginRight="5px">
									<BasicButtonStyled
										buttonProps={{}}
										icon={<InfoOutlined />}
										tooltipProps={{
											title: 'A claim is considered complete if all necessary questions have been answered for the related checklist.',
										}}
									/>
								</Box>
								<BasicButtonStyled
									buttonProps={{
										onClick: () => router.push('/metrics/user-activity'),
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
						<Box display="flex" justifyContent="center" alignItems="center" padding="0px 5px 5px">
							<ChecklistSelect selected={selectedChecklistId} setSelected={setChecklistId} />
						</Box>
						<div style={styles.divider}>
							<Divider />
						</div>
						{selectedChecklistOption && (
							<Stack flex={1} display="flex" justifyContent="center" alignItems="center">
								<PieChart
									series={[
										{
											data: Object.keys(data[selectedChecklistOption.key]).map((status) => {
												const parsedStatus = status as ClaimStatus;
												return {
													id: parsedStatus,
													label: parsedStatus,
													value: data[selectedChecklistOption.key][parsedStatus],
													color: getStatusColor(parsedStatus),
												};
											}),
											valueFormatter: (v) => `${v.value} claim(s)`,
											innerRadius: 75,
											outerRadius: 125,
											paddingAngle: 2,
											cornerRadius: 5,
											startAngle: -110,
											endAngle: 110,
											cy: 150,
										},
									]}
									height={225}
								/>
								<Box position="relative">
									<Stack
										display="flex"
										justifyContent="center"
										alignItems="center"
										position="absolute"
										width={80}
										left={-90}
										top={-120}
									>
										<AnimatedCounter
											value={getProgressPercentage(
												data[selectedChecklistOption.key][ClaimStatus.SUBMITTED],
												data[selectedChecklistOption.key][ClaimStatus.SUBMITTED] +
													data[selectedChecklistOption.key][ClaimStatus.IN_PROGRESS] +
													data[selectedChecklistOption.key][ClaimStatus.UNWORKED]
											)}
											formatter={(v) => `${v}%`}
											fontSize={40}
											duration={500}
										/>
										<Typography paddingTop="5px" fontSize={17} lineHeight="17px" fontWeight="bold">
											Submitted
										</Typography>
									</Stack>
								</Box>
							</Stack>
						)}
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
		marginTop: 5,
	},
	paper: {
		borderRadius: 3,
		margin: '10px',
		height: 'fit-content',
	},
	skeleton: {
		borderRadius: 3,
	},
};
