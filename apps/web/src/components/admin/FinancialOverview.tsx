'use client';

import { useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import utc from 'dayjs/plugin/utc';
import type { DateRange } from '@/types/dateTypes';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { IconTrendingUp } from '@tabler/icons-react';
import { useRecoveryTrpc } from '@/hooks/trpc/useRecoveryTrpc';
import { useFinancialReportingTrpc, REPORTING_CACHE } from '@/hooks/trpc/useFinancialReportingTrpc';
import { formatCurrency } from '@/lib/utils/recoveryUtils';
import BasicMonthRangePicker from '@/components/common/BasicMonthRangePicker';
import SettlementFunnelChart from '@/components/admin/Financial/SettlementFunnelChart';
import StatuteRiskTable from '@/components/admin/Financial/StatuteRiskTable';
import WaterfallChart from '@/components/admin/Financial/WaterfallChart';

dayjs.extend(quarterOfYear);
dayjs.extend(utc);

function getCurrentQuarterRange(): [Dayjs, Dayjs] {
	const now = dayjs();
	const startMonth = (now.quarter() - 1) * 3;
	return [
		dayjs.utc().year(now.year()).month(startMonth).startOf('month'),
		dayjs
			.utc()
			.year(now.year())
			.month(startMonth + 2)
			.endOf('month'),
	];
}

export default function FinancialOverview() {
	const { data: quarterData } = useRecoveryTrpc().getQuarterlyRecoveryStats({});
	const api = useFinancialReportingTrpc();
	const [range, setRange] = useState<DateRange<Dayjs>>(() => getCurrentQuarterRange());

	const rangeISO = useMemo(
		() =>
			range && range[0] && range[1]
				? { range: [range[0].toISOString(), range[1].toISOString()] as [string, string] }
				: null,
		[range]
	);

	const { data: funnelData, isLoading: loadingFunnel } = api.getSettlementFunnel(rangeISO!, {
		...REPORTING_CACHE.SHORT,
		enabled: !!rangeISO,
	});
	const { data: riskData, isLoading: loadingRisk } = api.getStatuteDeadlineRisk(rangeISO!, {
		...REPORTING_CACHE.SHORT,
		enabled: !!rangeISO,
	});
	const { data: varianceData, isLoading: loadingVariance } = api.getVarianceDecomposition(
		rangeISO!,
		{
			...REPORTING_CACHE.LONG,
			enabled: !!rangeISO,
		}
	);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<div>
					<h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
						Financial
					</h3>
					<span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
						Recovery metrics, trends, and financial performance overview.
					</span>
				</div>
				<BasicMonthRangePicker
					defaultLabel="This Quarter"
					defaultValue={range}
					onConfirm={setRange}
				/>
			</div>

			{quarterData && (
				<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
					{(['q1', 'q2', 'q3', 'q4'] as const).map((q, i) => {
						const val = parseFloat(quarterData[q] || '0');
						const prevVal =
							i > 0
								? parseFloat(quarterData[(['q1', 'q2', 'q3', 'q4'] as const)[i - 1]] || '0')
								: null;
						const pctChange =
							prevVal && prevVal > 0 ? Math.round(((val - prevVal) / prevVal) * 100) : null;
						return (
							<KpiCard
								key={q}
								icon={<IconTrendingUp size={16} />}
								iconColor={val > 0 ? 'var(--status-success)' : 'var(--text-secondary)'}
								iconBgColor={val > 0 ? 'var(--status-success-bg)' : 'var(--bg-tertiary)'}
								value={formatCurrency(val)}
								label={`Q${i + 1} Recovery`}
								size="sm"
								trend={
									pctChange !== null
										? {
												value: `${pctChange > 0 ? '+' : ''}${pctChange}%`,
												isPositive: pctChange >= 0,
											}
										: undefined
								}
							/>
						);
					})}
				</div>
			)}

			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
				<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
					<span style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'block' }}>
						Settlement Funnel
					</span>
					{loadingFunnel ? (
						<Skeleton variant="rect" width="100%" height={300} />
					) : (
						<SettlementFunnelChart data={funnelData ?? []} />
					)}
				</Card>

				<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
					<span style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'block' }}>
						Recovery Variance
					</span>
					{loadingVariance ? (
						<Skeleton variant="rect" width="100%" height={300} />
					) : (
						<WaterfallChart data={varianceData ?? []} />
					)}
				</Card>
			</div>

			<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
				<span style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'block' }}>
					Statute Deadline Risk
				</span>
				{loadingRisk ? (
					<Skeleton variant="rect" width="100%" height={300} />
				) : (
					<StatuteRiskTable data={riskData ?? []} />
				)}
			</Card>
		</div>
	);
}
