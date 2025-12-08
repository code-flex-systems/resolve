'use client';

import { FeedStatus } from '@/config/enums';
import theme from '@/styles/theme';
import { Box, Button, Collapse, Divider, IconButton, List, MenuItem, Paper, Tooltip, Typography } from '@mui/material';
import { Ping } from 'ldrs/react';
import 'ldrs/react/Ping.css';
import Toolbar from '../common/Toolbar';
import { useState } from 'react';
import NetworkCheck from '@mui/icons-material/NetworkCheck';
import Notifications from '@mui/icons-material/Notifications';
import NotificationsOff from '@mui/icons-material/NotificationsOff';
import Power from '@mui/icons-material/Power';
import PowerOff from '@mui/icons-material/PowerOff';
import { formatHour, formatMDYAbv } from '@/lib/utils/utils';
import { useAdminStore } from '@/stores/useAdminStore';
import { useFeedTrpc } from '@/hooks/trpc/useFeedTrpc';
import BasicButtonStyled from '../common/BasicButtonStyled';
import ClaimAssignmentDialog from './ClaimAssignmentDialog';

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

export default function Feeds() {
	const [testing, setTesting] = useState(false);
	const selectedFeedId = useAdminStore((state) => state.selectedFeedId);
	const showClaimAssignmentDialog = useAdminStore((state) => state.showClaimAssignmentDialog);
	const setFeedId = useAdminStore((state) => state.setFeedId);
	const toggleClaimAssignmentDialog = useAdminStore((state) => state.toggleClaimAssignmentDialog);
	const { data: feeds = [], isFetching } = useFeedTrpc().list();
	const { mutate, isPending } = useFeedTrpc().update;

	// Fake tester
	const onTest = () => {
		setTesting(true);
		setTimeout(() => setTesting(false), 5000);
	};

	return (
		<Box sx={{ width: 'fit-content', height: '100%', mr: 2, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
			<Paper sx={{ minWidth: 325, height: '100%', p: 2, border: 1, borderColor: 'divider' }}>
				<Toolbar
					left={<Typography variant="h6">Feeds</Typography>}
					right={
						<BasicButtonStyled
							buttonProps={{
								onClick: onTest,
								disabled: testing || !feeds.length,
							}}
							icon={<NetworkCheck />}
							tooltipProps={{ title: 'Test connection' }}
						/>
					}
					height={50}
					padding={0}
				/>
				<Divider />
				<List disablePadding sx={{ pt: 0.5 }}>
					{!feeds.length && !isFetching && (
						<Box sx={{ width: 300, mt: 0.5 }}>
							<Typography width={200} lineHeight="19px" whiteSpace="wrap" fontStyle="italic" fontSize={13}>
								No feeds found
							</Typography>
						</Box>
					)}
					{feeds.map((f) => [
						<MenuItem
							key={f.id}
							selected={selectedFeedId === f.id}
							onClick={() => setFeedId(selectedFeedId === f.id ? undefined : f.id)}
							disableRipple
							sx={{
								width: 300,
								mt: 0.5,
								...(selectedFeedId === f.id
									? { border: '1px solid var(--color-primary)', borderBottom: 'none' }
									: {}),
							}}
						>
							<Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
									<Typography width={200} lineHeight="19px" whiteSpace="wrap" fontSize={13}>
										{f.name}
									</Typography>
								</Box>

								{testing ? (
									<Ping size="30" speed="2" color={getStatusColor(f.status)} />
								) : (
									<Box sx={{ width: 30, height: 30, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
										<Box sx={{ width: 10, height: 10, borderRadius: 5, bgcolor: getStatusColor(f.status) }} />
									</Box>
								)}
							</Box>
						</MenuItem>,
						<Collapse key={`${f.id}-content`} in={selectedFeedId === f.id} unmountOnExit>
							<Box
								sx={{
									width: '100%',
									display: 'flex',
									flexDirection: 'column',
									justifyContent: 'flex-start',
									alignItems: 'center',
									height: 'fit-content',
									p: '10px 15px',
									bgcolor: 'var(--color-bg-secondary)',
									...(selectedFeedId === f.id
										? { border: '1px solid var(--color-primary)', borderTop: 'none' }
										: {}),
								}}
							>
								<Box sx={{ width: '100%', pb: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<Typography fontStyle="italic" fontWeight={500} fontSize={13}>
										Status
									</Typography>
									<Typography fontStyle="italic" fontSize={13}>
										{f.status}
									</Typography>
								</Box>
								<Box sx={{ width: '100%', pb: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<Typography fontStyle="italic" fontWeight={500} fontSize={13}>
										Schedule
									</Typography>
									<Typography fontStyle="italic" fontSize={13}>
										{formatHour(f.schedule)}{' '}
										{f.schedule < 5 || f.schedule >= 19 ? '(nightly)' : '(daily)'}
									</Typography>
								</Box>
								<Box sx={{ width: '100%', pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<Typography fontStyle="italic" fontWeight={500} fontSize={13}>
										Last published
									</Typography>
									<Typography fontStyle="italic" fontSize={13}>
										{formatMDYAbv(f.last_synced_at?.toString())}
									</Typography>
								</Box>
								<Box sx={{ width: '100%', pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<Button
										onClick={() => toggleClaimAssignmentDialog()}
										variant="contained"
										color="primary"
										sx={{ width: '100%' }}
									>
										Assign claims
									</Button>
								</Box>
								<Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
									<Tooltip
										title={f.status === FeedStatus.OFFLINE ? 'Feed is offline' : 'Test Connection'}
										enterDelay={500}
										arrow
									>
										<span>
											<IconButton
												disabled={f.status === FeedStatus.OFFLINE || isPending}
												sx={{ mr: 0.5 }}
											>
												<NetworkCheck />
											</IconButton>
										</span>
									</Tooltip>
									<Tooltip
										title={
											f.status === FeedStatus.OFFLINE
												? 'Feed is offline'
												: f.status === FeedStatus.MUTED
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
														id: f.id,
														params: {
															status:
																f.status === FeedStatus.MUTED
																	? FeedStatus.ONLINE
																	: FeedStatus.MUTED,
														},
													})
												}
												disabled={f.status === FeedStatus.OFFLINE || isPending}
												sx={{ mr: 0.5 }}
											>
												{f.status === FeedStatus.MUTED ? (
													<Notifications />
												) : (
													<NotificationsOff />
												)}
											</IconButton>
										</span>
									</Tooltip>
									<Tooltip
										title={f.status === FeedStatus.OFFLINE ? 'Reconnect' : 'Disconnect'}
										enterDelay={500}
										arrow
									>
										<span>
											<IconButton
												onClick={() =>
													mutate({
														id: f.id,
														params: {
															status:
																f.status === FeedStatus.OFFLINE
																	? FeedStatus.ONLINE
																	: FeedStatus.OFFLINE,
														},
													})
												}
												disabled={isPending}
											>
												{f.status === FeedStatus.OFFLINE ? <Power /> : <PowerOff />}
											</IconButton>
										</span>
									</Tooltip>
								</Box>
							</Box>
						</Collapse>,
					])}
				</List>
			</Paper>
			{showClaimAssignmentDialog && <ClaimAssignmentDialog />}
		</Box>
	);
}
