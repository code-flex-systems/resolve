import { useState, useEffect } from 'react';
import { getCurrentFiscalQuarter } from '@/lib/utils/utils';
import { useRecoveryTrpc } from '@/hooks/trpc/useRecoveryTrpc';
import { formatCurrency } from '@/lib/utils/recoveryUtils';
import { getFiscalYearStart } from '@/config/config';
import { IconCalendar, IconCheck } from '@tabler/icons-react';
import Skeleton from '@/components/ui/Skeleton';
import Tooltip from '@/components/ui/Tooltip';

const steps: { value: number; label: string }[] = [
	{ value: 1, label: 'Q1' },
	{ value: 2, label: 'Q2' },
	{ value: 3, label: 'Q3' },
	{ value: 4, label: 'Q4' },
];

function IconContainer({ active, index }: { active: number; index: number }) {
	return (
		<div
			style={{
				width: 20,
				height: 20,
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				backgroundImage: index <= active ? 'linear-gradient(rgb(50, 174, 153), rgba(50, 174, 153, 0.9))' : undefined,
				backgroundColor: index <= active ? undefined : 'var(--text-muted)',
				borderRadius: 20,
			}}
		>
			{index === active ? (
				<IconCalendar size={20} style={{ color: 'white' }} />
			) : index < active ? (
				<IconCheck size={20} style={{ color: 'white' }} />
			) : (
				<IconCalendar size={20} style={{ color: 'white' }} />
			)}
		</div>
	);
}

export default function FQStepper() {
	// Initialize with 1 to avoid hydration mismatch, set actual quarter on client
	const [active, setActive] = useState<number>(1);

	useEffect(() => {
		setActive(getCurrentFiscalQuarter());
	}, []);

	// Fetch quarterly recovery stats
	const { data: quarterlyStats, isLoading } = useRecoveryTrpc().getQuarterlyRecoveryStats({}, { enabled: true });

	// Helper to get date range for tooltip
	const getQuarterDateRange = (quarterIndex: number) => {
		const start = getFiscalYearStart().add(quarterIndex * 3, 'months');
		const end = start.add(3, 'months').subtract(1, 'day');
		return `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;
	};

	// Map quarter stats to array
	const quarterAmounts = quarterlyStats
		? [quarterlyStats.q1, quarterlyStats.q2, quarterlyStats.q3, quarterlyStats.q4]
		: ['0', '0', '0', '0'];

	return (
		<div
			style={{
				width: 150,
				minWidth: 150,
				height: 600,
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'flex-start',
				alignItems: 'center',
				backgroundColor: 'white',
				borderRadius: 16,
				margin: 15,
				padding: 15,
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 16, padding: '0px 10px' }}>
				<span style={{ fontSize: 14, fontWeight: 600 }}>
					Fiscal Year Recovery
				</span>
			</div>

			<div style={{ width: '100%', height: 'calc(100% - 50px)', marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 0 }}>
				{steps.map(({ value, label }, i) => (
					<div key={value} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
						<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
							<IconContainer active={active} index={i} />
							{i < steps.length - 1 && (
								<div
									style={{
										width: 2,
										flex: 1,
										backgroundColor: i < active ? 'rgb(50, 174, 153)' : '#eaeaf0',
									}}
								/>
							)}
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
							<span
								style={{
									fontSize: 15,
									fontWeight: i === active ? 700 : 500,
									color: i <= active ? 'var(--text-accent)' : 'var(--text-muted)',
								}}
							>
								{label}
							</span>
							{isLoading ? (
								<Skeleton variant="text" width={80} height={20} />
							) : (
								<Tooltip content={getQuarterDateRange(i)} position="right">
									<span
										style={{
											fontSize: i === active ? 15 : 13,
											fontWeight: i === active ? 600 : 400,
											color: i <= active ? 'var(--text-primary)' : 'var(--text-muted)',
											cursor: 'help',
										}}
									>
										{formatCurrency(parseFloat(quarterAmounts[i]))}
									</span>
								</Tooltip>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
