'use client';

import { IconClock, IconNetwork, IconRefresh } from '@tabler/icons-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { FeedStatus } from '@/config/enums';
import { Ping } from 'ldrs/react';
import 'ldrs/react/Ping.css';
import Toolbar from '../common/Toolbar';
import { useState } from 'react';
import { formatHour, formatMDYAbv } from '@/lib/utils/utils';
import { useFeedTrpc } from '@/hooks/trpc/useFeedTrpc';
import IconHeaderCell from '../common/IconHeaderCell';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

const getStatusColor = (status: FeedStatus) => {
	switch (status) {
		case FeedStatus.OFFLINE:
			return 'var(--status-error)';
		case FeedStatus.ONLINE:
			return 'var(--status-success)';
		case FeedStatus.MUTED:
			return 'var(--status-warning-bg)';
	}
};

const formatStatus = (status: FeedStatus) => {
	switch (status) {
		case FeedStatus.OFFLINE:
			return 'Offline';
		case FeedStatus.ONLINE:
			return 'Online';
		case FeedStatus.MUTED:
			return 'Muted';
	}
};

interface FeedActionsCellProps {
	row: {
		id: string;
		status: FeedStatus;
	};
	mutate: (params: { id: string; params: { status: FeedStatus } }) => void;
	isPending: boolean;
}

function FeedActionsCell({ row, mutate, isPending }: FeedActionsCellProps) {
	const isOffline = row.status === FeedStatus.OFFLINE;
	const isMuted = row.status === FeedStatus.MUTED;

	return (
		<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
			<Button variant="ghost" size="sm" color="neutral" disabled={isOffline || isPending}>
				Test
			</Button>
			<Button
				variant="ghost"
				size="sm"
				color="neutral"
				disabled={isOffline || isPending}
				onClick={() =>
					mutate({
						id: row.id,
						params: { status: isMuted ? FeedStatus.ONLINE : FeedStatus.MUTED },
					})
				}
			>
				{isMuted ? 'Unmute' : 'Mute'}
			</Button>
			<Button
				variant="ghost"
				size="sm"
				color="neutral"
				disabled={isPending}
				onClick={() =>
					mutate({
						id: row.id,
						params: { status: isOffline ? FeedStatus.ONLINE : FeedStatus.OFFLINE },
					})
				}
			>
				{isOffline ? 'Reconnect' : 'Disconnect'}
			</Button>
		</div>
	);
}

export default function Feeds() {
	const [testing, setTesting] = useState(false);
	const { data: feeds = [], isFetching } = useFeedTrpc().list();
	const { mutate, isPending } = useFeedTrpc().update;

	// Fake tester
	const onTest = () => {
		setTesting(true);
		setTimeout(() => setTesting(false), 5000);
	};

	const columns: ColumnDef<any, any>[] = [
		{
			accessorKey: 'name',
			minSize: 200,
			header: (ctx) => <IconHeaderCell {...ctx} />,
		},
		{
			accessorKey: 'status',
			size: 130,
			header: (ctx) => <IconHeaderCell {...ctx} />,
			cell: ({ row: { original: row } }: any) => (
				<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
					{testing ? (
						<Ping size="20" speed="2" color={getStatusColor(row.status)} />
					) : (
						<div
							style={{
								width: 10,
								height: 10,
								borderRadius: '50%',
								backgroundColor: getStatusColor(row.status),
							}}
						/>
					)}
					<span style={{ fontSize: 13 }}>{formatStatus(row.status)}</span>
				</div>
			),
		},
		{
			accessorKey: 'schedule',
			size: 150,
			header: (params) => (
				<IconHeaderCell {...params} icon={<IconClock style={{ color: 'var(--text-muted)' }} />} />
			),
			cell: ({ row: { original: row } }: any) => (
				<span style={{ fontSize: 13 }}>
					{formatHour(row.schedule)}{' '}
					{row.schedule < 5 || row.schedule >= 19 ? '(nightly)' : '(daily)'}
				</span>
			),
		},
		{
			accessorKey: 'last_synced_at',
			size: 150,
			header: (params) => (
				<IconHeaderCell {...params} icon={<IconRefresh style={{ color: 'var(--text-muted)' }} />} />
			),
			cell: ({ row: { original: row } }: any) => (
				<span style={{ fontSize: 13 }}>{formatMDYAbv(row.last_synced_at?.toString())}</span>
			),
		},
		{
			header: '',
			accessorKey: 'actions',
			size: 290,
			enableSorting: false,
			cell: ({ row: { original: row } }: any) => (
				<FeedActionsCell row={row} mutate={mutate} isPending={isPending} />
			),
		},
	];

	return (
		<div style={{ width: '100%', height: '100%' }}>
			<Card
				variant="beveled"
				padding="md"
				style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
			>
				<p
					style={{
						color: 'var(--text-secondary)',
						fontSize: 13,
						margin: '0 0 12px',
						lineHeight: 1.5,
					}}
				>
					Feeds are data sources that import claims into the system. Configure feed connections and
					monitor their status.
				</p>
				<Toolbar
					left={undefined}
					right={
						<Button
							variant="outlined"
							size="sm"
							color="neutral"
							startIcon={<IconNetwork size={14} />}
							onClick={onTest}
							disabled={testing || !feeds.length}
						>
							Test all
						</Button>
					}
					height={50}
					padding={0}
				/>
				<div style={{ flex: 1, minHeight: 0, width: '100%' }}>
					<DataTable rows={feeds} columns={columns} loading={isFetching} hideFooter />
				</div>
			</Card>
		</div>
	);
}
