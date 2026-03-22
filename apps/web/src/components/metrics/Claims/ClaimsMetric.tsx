'use client';

import { ClaimStatus } from '@/config/enums';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import ExpandableTitle from '../../common/ExpandableTitle';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatedCounter } from '../../common/AnimatedCounter';
import BasicButtonStyled from '../../common/BasicButtonStyled';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';
import { IconBug, IconCircleCheck, IconInfoCircle } from '@tabler/icons-react';
import Card from '@/components/ui/Card';
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
			return 'var(--status-warning)';
	}
}

const defaultData: Record<ClaimStatus, number> = {
	[ClaimStatus.SUBMITTED]: 0,
	[ClaimStatus.IN_PROGRESS]: 0,
	[ClaimStatus.BLOCKED]: 0,
	[ClaimStatus.UNWORKED]: 0,
};

export default function ClaimsMetric({ checklistId, users }: { checklistId?: string | null; users?: string[] }) {
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

	const pieData = useMemo(() => {
		return Object.keys(data).map((status) => {
			const parsedStatus = status as ClaimStatus;
			return {
				id: parsedStatus,
				label: parsedStatus,
				value: data[parsedStatus],
				color: getStatusColor(parsedStatus),
			};
		});
	}, [data]);

	const total = data[ClaimStatus.SUBMITTED] + data[ClaimStatus.IN_PROGRESS] + data[ClaimStatus.UNWORKED];
	const pct = getProgressPercentage(data[ClaimStatus.SUBMITTED], total);

	return (
		<Card variant="beveled" padding="md" style={{ width: METRIC_WIDTH, minHeight: METRIC_HEIGHT }}>
			{isFetching ? (
				<Skeleton width={METRIC_WIDTH - 32} height={METRIC_HEIGHT - 32} />
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					{/* Header */}
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
							Claim Submission
						</span>
						<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
							<BasicButtonStyled
								buttonProps={{}}
								icon={<IconInfoCircle size={18} />}
								tooltipProps={{
									title: 'A claim is considered complete if all necessary questions have been answered for the related checklist.',
								}}
							/>
							{(isAdmin || isSuperAdmin) && pathname.startsWith('/admin') && (
								<BasicButtonStyled
									buttonProps={{ onClick: () => router.push('/metrics/claims') }}
									icon={<IconBug style={{ transform: 'scaleX(-1)', color: 'var(--text-accent)' }} size={18} />}
									tooltipProps={{ title: 'Open in Inspector' }}
								/>
							)}
						</div>
					</div>

					{/* Gauge chart */}
					{(!checklistId || selectedChecklistOption) && (
						<div style={{ position: 'relative', width: '100%', height: 200 }}>
							<ResponsiveContainer width="100%" height={200}>
								<PieChart>
									<Pie
										data={pieData}
										dataKey="value"
										nameKey="label"
										innerRadius={65}
										outerRadius={88}
										paddingAngle={2}
										cornerRadius={4}
										startAngle={220}
										endAngle={-40}
										cx="50%"
										cy="60%"
									>
										{pieData.map((entry, i) => (
											<Cell key={i} fill={entry.color} />
										))}
									</Pie>
									<Tooltip formatter={(value: any) => [`${value} claim(s)`]} />
								</PieChart>
							</ResponsiveContainer>
							{/* Center label */}
							<div style={{
								position: 'absolute',
								top: '50%',
								left: '50%',
								transform: 'translate(-50%, -30%)',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								pointerEvents: 'none',
							}}>
								<span style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
									{pct}%
								</span>
								<span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 2 }}>
									Submitted
								</span>
							</div>
						</div>
					)}

					{/* Legend */}
					<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
						{pieData.map((entry) => (
							<div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
								<div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color }} />
								<span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
									{entry.label} ({entry.value})
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</Card>
	);
}
