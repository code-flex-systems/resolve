'use client';

import { ClaimStatus } from '@/config/enums';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';
import { Box, Divider, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { CheckCircle, InfoOutlined, Troubleshoot } from '@mui/icons-material';
import { PieChart } from '@mui/x-charts-pro';
import { useMemo } from 'react';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import ExpandableTitle from '../common/ExpandableTitle';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatedCounter } from '../common/AnimatedCounter';
import BasicButtonStyled from '../common/BasicButtonStyled';
import ChecklistSelect from '../common/ChecklistSelect';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';

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
		case ClaimStatus.BLOCKED:
			return '#FC8C60';
	}
}

const defaultData: Record<ClaimStatus, number> = {
	[ClaimStatus.SUBMITTED]: 0,
	[ClaimStatus.IN_PROGRESS]: 0,
	[ClaimStatus.BLOCKED]: 0,
	[ClaimStatus.UNWORKED]: 0,
};

export default function ClaimsMetric({
	checklistId,
	users,
	setChecklistId,
}: {
	checklistId?: number | null;
	users?: string[];
	setChecklistId?: (newId: number | null) => void;
}) {
	const pathname = usePathname();
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const { data: checklists = [] } = useChecklistTrpc().list({}, { enabled: !!checklistId });
	const { data = defaultData, isFetching } = useChecklistTrpc().stats({
		checklistId: checklistId ?? undefined,
		users,
	});
	const router = useRouter();
	const metricHeight = !!checklistId ? METRIC_HEIGHT : METRIC_HEIGHT - 40;

	const selectedChecklistOption = useMemo(() => {
		const option = checklists.find((o) => o.id === checklistId);
		return option ? { ...option, key: `${option.id}:${option.name}` } : null;
	}, [checklists, checklistId]);

	return (
		<Paper sx={styles.paper}>
			{isFetching ? (
				<Skeleton width={METRIC_WIDTH} height={metricHeight} animation="wave" sx={styles.skeleton} />
			) : (
				<Box display="flex" width={METRIC_WIDTH} height={metricHeight} borderRadius={3} padding="10px">
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
								color={BASE_COLOR_LIGHT}
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
								{(isAdmin || isSuperAdmin) && pathname.startsWith('/admin') && (
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
								)}
							</Box>
						</Box>
						{!!checklistId && setChecklistId && (
							<Box display="flex" justifyContent="center" alignItems="center" padding="0px 5px 5px">
								<ChecklistSelect selected={checklistId} setSelected={setChecklistId} />
							</Box>
						)}
						<div style={styles.divider}>
							<Divider />
						</div>
						{(!checklistId || selectedChecklistOption) && (
							<Stack flex={1} display="flex" justifyContent="center" alignItems="center">
								<PieChart
									series={[
										{
											data: Object.keys(data).map((status) => {
												const parsedStatus = status as ClaimStatus;
												return {
													id: parsedStatus,
													label: parsedStatus,
													value: data[parsedStatus],
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
												data[ClaimStatus.SUBMITTED],
												data[ClaimStatus.SUBMITTED] +
													data[ClaimStatus.IN_PROGRESS] +
													data[ClaimStatus.UNWORKED]
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
