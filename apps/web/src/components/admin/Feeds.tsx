'use client';

import { FeedStatus } from '@/config/enums';
import theme, { TEXT_MUTED, dataGridFocusStyles } from '@/styles/theme';
import { Box, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import { DataGridPro, GridColDef, GridPinnedColumnFields, GridRenderCellParams } from '@mui/x-data-grid-pro';
import { Ping } from 'ldrs/react';
import 'ldrs/react/Ping.css';
import Settings from '@mui/icons-material/Settings';
import Toolbar from '../common/Toolbar';
import { useMemo, useState } from 'react';
import NetworkCheck from '@mui/icons-material/NetworkCheck';
import Notifications from '@mui/icons-material/Notifications';
import NotificationsOff from '@mui/icons-material/NotificationsOff';
import Power from '@mui/icons-material/Power';
import PowerOff from '@mui/icons-material/PowerOff';
import RssFeed from '@mui/icons-material/RssFeed';
import Schedule from '@mui/icons-material/Schedule';
import Sync from '@mui/icons-material/Sync';
import { formatHour, formatMDYAbv } from '@/lib/utils/utils';
import { useFeedTrpc } from '@/hooks/trpc/useFeedTrpc';
import BasicButtonStyled from '../common/BasicButtonStyled';
import IconHeaderCell from '../common/IconHeaderCell';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';

const getStatusColor = (status: FeedStatus) => {
	switch (status) {
		case FeedStatus.OFFLINE:
			return theme.palette.error.main;
		case FeedStatus.ONLINE:
			return theme.palette.success.light;
		case FeedStatus.MUTED:
			return theme.palette.warning.light;
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
	return <CustomNoRowsOverlay text="No feeds found" icon={<RssFeed sx={{ fontSize: 35, color: TEXT_MUTED }} />} />;
}

interface FeedActionsCellProps {
	row: {
		id: number;
		status: FeedStatus;
	};
	mutate: (params: { id: number; params: { status: FeedStatus } }) => void;
	isPending: boolean;
	isManageMode: boolean;
}

function FeedActionsCell({ row, mutate, isPending, isManageMode }: FeedActionsCellProps) {
	if (!isManageMode) return null;
	return (
		<Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
			<Tooltip
				title={row.status === FeedStatus.OFFLINE ? 'Feed is offline' : 'Test Connection'}
				enterDelay={500}
				arrow
			>
				<span>
					<IconButton disabled={row.status === FeedStatus.OFFLINE || isPending} size="small">
						<NetworkCheck fontSize="small" />
					</IconButton>
				</span>
			</Tooltip>
			<Tooltip
				title={
					row.status === FeedStatus.OFFLINE
						? 'Feed is offline'
						: row.status === FeedStatus.MUTED
							? 'Unmute'
							: 'Mute'
				}
				enterDelay={500}
				arrow
			>
				<span>
					<IconButton
						onClick={() =>
							mutate({
								id: row.id,
								params: {
									status: row.status === FeedStatus.MUTED ? FeedStatus.ONLINE : FeedStatus.MUTED,
								},
							})
						}
						disabled={row.status === FeedStatus.OFFLINE || isPending}
						size="small"
					>
						{row.status === FeedStatus.MUTED ? (
							<Notifications fontSize="small" />
						) : (
							<NotificationsOff fontSize="small" />
						)}
					</IconButton>
				</span>
			</Tooltip>
			<Tooltip title={row.status === FeedStatus.OFFLINE ? 'Reconnect' : 'Disconnect'} enterDelay={500} arrow>
				<span>
					<IconButton
						onClick={() =>
							mutate({
								id: row.id,
								params: {
									status: row.status === FeedStatus.OFFLINE ? FeedStatus.ONLINE : FeedStatus.OFFLINE,
								},
							})
						}
						disabled={isPending}
						size="small"
					>
						{row.status === FeedStatus.OFFLINE ? <Power fontSize="small" /> : <PowerOff fontSize="small" />}
					</IconButton>
				</span>
			</Tooltip>
		</Box>
	);
}

export default function Feeds() {
	const [testing, setTesting] = useState(false);
	const [isManageMode, setIsManageMode] = useState(false);
	const { data: feeds = [], isFetching } = useFeedTrpc().list();
	const { mutate, isPending } = useFeedTrpc().update;

	const pinnedColumns = useMemo<GridPinnedColumnFields>(() => (isManageMode ? { right: ['actions'] } : {}), [isManageMode]);

	// Fake tester
	const onTest = () => {
		setTesting(true);
		setTimeout(() => setTesting(false), 5000);
	};

	const columns: GridColDef[] = [
		{
			headerName: 'Name',
			field: 'name',
			flex: 1,
			minWidth: 200,
			renderHeader: (params) => <IconHeaderCell {...params} />,
		},
		{
			headerName: 'Status',
			field: 'status',
			width: 130,
			renderHeader: (params) => <IconHeaderCell {...params} />,
			renderCell: ({ row }: GridRenderCellParams) => (
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					{testing ? (
						<Ping size="20" speed="2" color={getStatusColor(row.status)} />
					) : (
						<Box
							sx={{
								width: 10,
								height: 10,
								borderRadius: '50%',
								bgcolor: getStatusColor(row.status),
							}}
						/>
					)}
					<Typography fontSize={13}>{formatStatus(row.status)}</Typography>
				</Box>
			),
		},
		{
			headerName: 'Schedule',
			field: 'schedule',
			width: 150,
			renderHeader: (params) => <IconHeaderCell {...params} icon={<Schedule sx={{ color: TEXT_MUTED }} />} />,
			renderCell: ({ row }: GridRenderCellParams) => (
				<Typography fontSize={13}>
					{formatHour(row.schedule)} {row.schedule < 5 || row.schedule >= 19 ? '(nightly)' : '(daily)'}
				</Typography>
			),
		},
		{
			headerName: 'Last Synced',
			field: 'last_synced_at',
			width: 150,
			renderHeader: (params) => <IconHeaderCell {...params} icon={<Sync sx={{ color: TEXT_MUTED }} />} />,
			renderCell: ({ row }: GridRenderCellParams) => (
				<Typography fontSize={13}>{formatMDYAbv(row.last_synced_at?.toString())}</Typography>
			),
		},
		{
			headerName: '',
			field: 'actions',
			width: 130,
			sortable: false,
			filterable: false,
			disableColumnMenu: true,
			renderCell: ({ row }: GridRenderCellParams) => (
				<FeedActionsCell row={row} mutate={mutate} isPending={isPending} isManageMode={isManageMode} />
			),
		},
	];

	return (
		<Box sx={{ width: '100%', height: '100%' }}>
			<Paper sx={{ width: '100%', height: '100%', p: 2 }}>
				<Toolbar
					left={<Typography variant="h6">Feeds</Typography>}
					right={
						<>
							<BasicButtonStyled
								buttonProps={{
									onClick: onTest,
									disabled: testing || !feeds.length,
								}}
								icon={<NetworkCheck />}
								tooltipProps={{ title: 'Test all connections' }}
							/>
							<Tooltip title="Manage">
								<IconButton
									size="small"
									onClick={() => setIsManageMode(!isManageMode)}
									sx={{ ml: 1, bgcolor: isManageMode ? 'action.selected' : undefined }}
								>
									<Settings fontSize="small" sx={{ color: isManageMode ? 'primary.main' : undefined }} />
								</IconButton>
							</Tooltip>
						</>
					}
					height={50}
					padding={0}
				/>
				<Box sx={{ height: 'calc(100% - 60px)', width: '100%' }}>
					<DataGridPro
						rows={feeds}
						columns={columns}
						loading={isFetching}
						disableRowSelectionOnClick
						hideFooter
						pinnedColumns={pinnedColumns}
						slots={{
							noRowsOverlay: NoRows,
						}}
						sx={{
							border: 'none',
							...dataGridFocusStyles,
						}}
					/>
				</Box>
			</Paper>
		</Box>
	);
}
