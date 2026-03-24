'use client';

import { IconBell, IconBellOff, IconClock, IconNetwork, IconPower, IconTowerOff, IconRefresh, IconRss, IconSettings } from '@tabler/icons-react';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import { FeedStatus } from '@/config/enums';
import { Ping } from 'ldrs/react';
import 'ldrs/react/Ping.css';
import Toolbar from '../common/Toolbar';
import { useState } from 'react';
import { formatHour, formatMDYAbv } from '@/lib/utils/utils';
import { useFeedTrpc } from '@/hooks/trpc/useFeedTrpc';
import IconHeaderCell from '../common/IconHeaderCell';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
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

function NoRows() {
	return <CustomNoRowsOverlay text="No feeds found" icon={<IconRss size={35} style={{ color: 'var(--text-muted)' }} />} />;
}

interface FeedActionsCellProps {
	row: {
		id: string;
		status: FeedStatus;
	};
	mutate: (params: { id: string; params: { status: FeedStatus } }) => void;
	isPending: boolean;
	isManageMode: boolean;
}

function FeedActionsCell({ row, mutate, isPending, isManageMode }: FeedActionsCellProps) {
	if (!isManageMode) return null;
	return (
		<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
			<Tooltip
				content={row.status === FeedStatus.OFFLINE ? 'Feed is offline' : 'Test Connection'}
			>
				<span>
					<Button variant="icon" disabled={row.status === FeedStatus.OFFLINE || isPending} size="sm">
						<IconNetwork size={20} />
					</Button>
				</span>
			</Tooltip>
			<Tooltip
				content={
					row.status === FeedStatus.OFFLINE
						? 'Feed is offline'
						: row.status === FeedStatus.MUTED
							? 'Unmute'
							: 'Mute'
				}
			>
				<span>
					<Button variant="icon"
						onClick={() =>
							mutate({
								id: row.id,
								params: {
									status: row.status === FeedStatus.MUTED ? FeedStatus.ONLINE : FeedStatus.MUTED,
								},
							})
						}
						disabled={row.status === FeedStatus.OFFLINE || isPending}
						size="sm"
					>
						{row.status === FeedStatus.MUTED ? (
							<IconBell size={20} />
						) : (
							<IconBellOff size={20} />
						)}
					</Button>
				</span>
			</Tooltip>
			<Tooltip content={row.status === FeedStatus.OFFLINE ? 'Reconnect' : 'Disconnect'}>
				<span>
					<Button variant="icon"
						onClick={() =>
							mutate({
								id: row.id,
								params: {
									status: row.status === FeedStatus.OFFLINE ? FeedStatus.ONLINE : FeedStatus.OFFLINE,
								},
							})
						}
						disabled={isPending}
						size="sm"
					>
						{row.status === FeedStatus.OFFLINE ? <IconPower size={20} /> : <IconTowerOff size={20} />}
					</Button>
				</span>
			</Tooltip>
		</div>
	);
}

export default function Feeds() {
	const [testing, setTesting] = useState(false);
	const [isManageMode, setIsManageMode] = useState(false);
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
			header: (params) => <IconHeaderCell {...params} icon={<IconClock style={{ color: 'var(--text-muted)' }} />} />,
			cell: ({ row: { original: row } }: any) => (
				<span style={{ fontSize: 13 }}>
					{formatHour(row.schedule)} {row.schedule < 5 || row.schedule >= 19 ? '(nightly)' : '(daily)'}
				</span>
			),
		},
		{
			accessorKey: 'last_synced_at',
			size: 150,
			header: (params) => <IconHeaderCell {...params} icon={<IconRefresh style={{ color: 'var(--text-muted)' }} />} />,
			cell: ({ row: { original: row } }: any) => (
				<span style={{ fontSize: 13 }}>{formatMDYAbv(row.last_synced_at?.toString())}</span>
			),
		},
		{
			header: '',
			accessorKey: 'actions',
			size: 130,
			enableSorting: false,
			cell: ({ row: { original: row } }: any) => (
				<FeedActionsCell row={row} mutate={mutate} isPending={isPending} isManageMode={isManageMode} />
			),
		},
	];

	return (
		<div style={{ width: '100%', height: '100%' }}>
			<Card variant="beveled" padding="md" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
				<p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 12px', lineHeight: 1.5 }}>
					Feeds are data sources that import claims into the system. Configure feed connections and monitor their status.
				</p>
				<Toolbar
					left={undefined}
					right={
						<>
							<Tooltip content="Test all connections">
							<Button variant="icon" size="sm" color="neutral" onClick={onTest} disabled={testing || !feeds.length}>
							<IconNetwork size={16} />
						</Button>
						</Tooltip>
							<Tooltip content="Manage">
								<Button variant="icon" size="sm"
									onClick={() => setIsManageMode(!isManageMode)}
									style={{ marginLeft: 8, backgroundColor: isManageMode ? 'var(--bg-tertiary)' : undefined }}
								>
									<IconSettings size={20} style={{ color: isManageMode ? 'primary.main' : undefined }} />
								</Button>
							</Tooltip>
						</>
					}
					height={50}
					padding={0}
				/>
				<div style={{ height: 'calc(100% - 60px)', width: '100%' }}>
					<DataTable
						rows={feeds}
						columns={columns}
						loading={isFetching}
						hideFooter
						pinnedRight={isManageMode ? ['actions'] : []}
					/>
				</div>
			</Card>
		</div>
	);
}
