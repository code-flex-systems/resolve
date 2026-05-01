'use client';

import { useMemo } from 'react';
import CardioLoadingIndicator from '@/components/common/CardioLoadingIndicator';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { IconFiles, IconUpload, IconFile } from '@tabler/icons-react';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';

dayjs.extend(relativeTime);

export default function DocumentsOverview() {
	const { data, isLoading } = useDocTrpc().getDocumentStats(undefined);
	const { data: recentDocs } = useDocTrpc().listDocs({ limit: 10 });

	const recentDocColumns = useMemo<ColumnDef<any>[]>(
		() => [
			{
				accessorKey: 'filename',
				header: 'Filename',
				size: 240,
				cell: ({ row }) => (
					<span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
						{row.original.title || row.original.alias || row.original.filename}
					</span>
				),
			},
			{
				accessorKey: 'doc_type',
				header: 'Type',
				size: 120,
				cell: ({ getValue }) => {
					const type = (getValue() as string).replace(/_/g, ' ');
					return (
						<Chip size="sm" color="neutral">
							{type}
						</Chip>
					);
				},
			},
			{
				accessorKey: 'created_at',
				header: 'Uploaded',
				size: 120,
				cell: ({ getValue }) => dayjs(getValue() as Date).fromNow(),
			},
		],
		[]
	);

	if (isLoading || !data) {
		return <CardioLoadingIndicator message="Loading documents..." />;
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<h6 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
					Documents
				</h6>
				<span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
					Document storage metrics and recent upload activity.
				</span>
			</div>

			<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
				<KpiCard
					icon={<IconFiles size={20} />}
					iconColor="var(--text-accent)"
					iconBgColor="var(--status-info-bg)"
					value={data.total}
					label="Total Documents"
				/>
				<KpiCard
					icon={<IconUpload size={20} />}
					iconColor="var(--status-success)"
					iconBgColor="var(--status-success-bg)"
					value={data.recentUploads}
					label="Recent Uploads"
					subtitle="Last 7 days"
				/>
			</div>

			{data.byType.length > 0 && (
				<>
					<h6 style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)' }}>
						Documents by Type
					</h6>
					<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
						{data.byType.map((t) => (
							<KpiCard
								key={t.type}
								icon={<IconFile size={16} />}
								iconColor="var(--text-secondary)"
								iconBgColor="var(--bg-tertiary)"
								value={t.count}
								label={t.type.replace(/_/g, ' ')}
								size="sm"
							/>
						))}
					</div>
				</>
			)}

			{/* Recent Uploads */}
			{recentDocs && recentDocs.rows.length > 0 && (
				<Card variant="beveled" padding="md">
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
							Recent Uploads
						</span>
						<DataTable
							rows={recentDocs.rows}
							columns={recentDocColumns}
							hideFooter
							getRowId={(row) => String(row.id)}
						/>
					</div>
				</Card>
			)}
		</div>
	);
}
