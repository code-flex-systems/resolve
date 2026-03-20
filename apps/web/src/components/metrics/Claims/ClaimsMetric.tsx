'use client';

import { ClaimStatus } from '@/config/enums';
import { BASE_COLOR, ORANGE } from '@/styles/theme';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { PieChart } from '@mui/x-charts-pro';
import { useMemo } from 'react';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import ExpandableTitle from '../../common/ExpandableTitle';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatedCounter } from '../../common/AnimatedCounter';
import BasicButtonStyled from '../../common/BasicButtonStyled';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';
import { IconBug, IconCircleCheck, IconInfoCircle } from '@tabler/icons-react';
import Skeleton from '@/components/ui/Skeleton';
import Divider from '@/components/ui/Divider';

const METRIC_WIDTH = 400;
const METRIC_HEIGHT = 300;

function getProgressPercentage(completed: number, total: number) {
	if (completed === 0 || total === 0) return 0;
	return Math.floor((completed / total) * 100);
}

function getStatusColor(status: ClaimStatus) {
	switch (status) {
		case ClaimStatus.SUBMITTED:
			return 'var(--status-success)';
		case ClaimStatus.IN_PROGRESS:
			return 'var(--status-warning)';
		case ClaimStatus.UNWORKED:
			return 'var(--status-error)';
		case ClaimStatus.BLOCKED:
			return ORANGE;
	}
}

const defaultData: Record<ClaimStatus, number> = {
	[ClaimStatus.SUBMITTED]: 0,
	[ClaimStatus.IN_PROGRESS]: 0,
	[ClaimStatus.BLOCKED]: 0,
	[ClaimStatus.UNWORKED]: 0,
};

export default function ClaimsMetric({ checklistId, users }: { checklistId?: number | null; users?: string[] }) {
	const pathname = usePathname();
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const { data: checklists = [] } = useChecklistTrpc().list({}, { enabled: !!checklistId });
	const { data = defaultData, isFetching } = useChecklistTrpc().stats({
		checklistId: checklistId ?? undefined,
		users,
	});
	const router = useRouter();

	const selectedChecklistOption = useMemo(() => {
		const option = checklists.find((o) => o.id === checklistId);
		return option ? { ...option, key: `${option.id}:${option.name}` } : null;
	}, [checklists, checklistId]);

	return (
		<Paper elevation={0} sx={styles.paper}>
			{isFetching ? (
				<Skeleton width={METRIC_WIDTH} height={METRIC_HEIGHT} />
			) : (
				<Box display="flex" width={METRIC_WIDTH} height={METRIC_HEIGHT} borderRadius={3} padding="10px">
					<Stack flex={1} display="flex" justifyContent="flex-start" alignItems="flex-start">
						<Box
							width="100%"
							display="flex"
							justifyContent="space-between"
							alignItems="center"
							padding="5px"
						>
							<Typography variant="subtitle1" fontSize={14} fontWeight={600}>
								Claim Submission
							</Typography>
							<Box display="flex" justifyContent="flex-end" alignItems="center">
								<Box marginRight="5px">
									<BasicButtonStyled
										buttonProps={{}}
										icon={<IconInfoCircle size={20} />}
										tooltipProps={{
											title: 'A claim is considered complete if all necessary questions have been answered for the related checklist.',
										}}
									/>
								</Box>
								{(isAdmin || isSuperAdmin) && pathname.startsWith('/admin') && (
									<BasicButtonStyled
										buttonProps={{
											onClick: () => router.push('/metrics/claims'),
										}}
										icon={
											<IconBug
											 style={{
													transform: 'scaleX(-1)',
													color: 'var(--text-accent)',
												}}
											/>
										}
										tooltipProps={{ title: 'Open in Inspector' }}
									/>
								)}
							</Box>
						</Box>
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
											outerRadius: 100,
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
	paper: {
		borderRadius: 3,
		margin: '15px',
		width: METRIC_WIDTH,
		height: METRIC_HEIGHT,
	},
	skeleton: {
		borderRadius: 3,
	},
};
