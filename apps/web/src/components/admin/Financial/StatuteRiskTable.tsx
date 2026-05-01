'use client';

import { formatCurrency } from '@/lib/utils/recoveryUtils';
import Chip from '@/components/ui/Chip';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';
import IconHeaderCell from '@/components/common/IconHeaderCell';
import type { StatuteDeadlineRisk } from '@/hooks/trpc/useFinancialReportingTrpc';

interface StatuteRiskTableProps {
	data: StatuteDeadlineRisk[];
}

function toTitleCase(s: string | null): string {
	if (!s) return '';
	return s
		.split('_')
		.map((w) => w[0].toUpperCase() + w.slice(1))
		.join(' ');
}

function formatDate(date: string | Date | null): string {
	if (!date) return '--';
	const d = new Date(date);
	const months = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec',
	];
	return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
}

const columns: ColumnDef<StatuteDeadlineRisk, any>[] = [
	{
		accessorKey: 'claim_number',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 140,
	},
	{
		accessorKey: 'coverage_type',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 150,
		cell: ({ getValue }) => toTitleCase(getValue()),
	},
	{
		accessorKey: 'statute_date',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 130,
		cell: ({ getValue }) => formatDate(getValue()),
	},
	{
		accessorKey: 'days_remaining',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 130,
		cell: ({ getValue }) => {
			const days = getValue() as number;
			if (days < 0) {
				return (
					<Chip size="sm" color="error" variant="filled">
						OVERDUE
					</Chip>
				);
			}
			return days;
		},
	},
	{
		accessorKey: 'urgency',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 110,
		cell: ({ getValue }) => {
			const urgency = getValue() as string;
			const color =
				urgency === 'critical' ? 'error' : urgency === 'warning' ? 'warning' : 'success';
			return (
				<Chip size="sm" color={color} variant="outlined">
					{urgency.toUpperCase()}
				</Chip>
			);
		},
	},
	{
		accessorKey: 'expected_recovery',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 140,
		cell: ({ getValue }) => formatCurrency(getValue() as number),
	},
	{
		accessorKey: 'recovery_status',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 130,
		cell: ({ getValue }) => toTitleCase(getValue() as string),
	},
];

export default function StatuteRiskTable({ data }: StatuteRiskTableProps) {
	if (data.length === 0) {
		return (
			<div
				style={{
					padding: 20,
					textAlign: 'center',
					color: 'var(--text-muted)',
					fontSize: 13,
					fontStyle: 'italic',
				}}
			>
				No statute deadline risks found.
			</div>
		);
	}

	return (
		<DataTable
			rows={data}
			columns={columns}
			getRowId={(row) => `${row.claim_id}-${row.coverage_type}`}
			hideFooter
			rowHeight={44}
		/>
	);
}
