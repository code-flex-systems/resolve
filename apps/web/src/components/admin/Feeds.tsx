import { FeedStatus } from '@/config/enums';
import theme, { OFFWHITE_COLOR } from '@/styles/theme';
import { Button, Collapse, Divider, IconButton, List, MenuItem, Paper, Tooltip, Typography } from '@mui/material';
import { Ping } from 'ldrs/react';
import 'ldrs/react/Ping.css';
import Toolbar from '../common/Toolbar';
import { useState } from 'react';
import { NetworkCheck, Notifications, NotificationsOff, Power, PowerOff } from '@mui/icons-material';
import { formatHour, formatMDYAbv } from '@/lib/utils/utils';
import { useAdminSlice } from '@/state/store';
import { setFeedId } from '@/state/admin/actions';
import { useFeedTrpc } from '@/hooks/trpc/useFeedTrpc';

const getStatusColor = (status: FeedStatus) => {
	switch (status) {
		case FeedStatus.OFFLINE:
			return theme.palette.error.light;
		case FeedStatus.ONLINE:
			return theme.palette.success.light;
		case FeedStatus.MUTED:
			return theme.palette.warning.light;
	}
};

export default function Feeds() {
	const [testing, setTesting] = useState(false);
	const selectedFeedId = useAdminSlice((state) => state.selectedFeedId);
	const { data: feeds = [] } = useFeedTrpc().list();
	const { mutate, isPending } = useFeedTrpc().update;

	// Fake tester
	const onTest = () => {
		setTesting(true);
		setTimeout(() => setTesting(false), 5000);
	};

	return (
		<div style={styles.container} className="flex-row-left">
			<Paper sx={styles.paper}>
				<Toolbar
					left={<Typography paddingBottom="5px">Feeds</Typography>}
					right={
						<Button onClick={onTest} disabled={testing || !feeds.length} sx={{ height: 25 }}>
							Test
						</Button>
					}
					padding={0}
				/>
				<Divider />
				<List disablePadding sx={{ paddingTop: '5px' }}>
					{!feeds.length && (
						<div style={styles.menuItem}>
							<Typography width={200} lineHeight="19px" whiteSpace="wrap" fontStyle="italic">
								No feeds found
							</Typography>
						</div>
					)}
					{feeds.map((f) => [
						<MenuItem
							key={f.id}
							selected={selectedFeedId === f.id}
							onClick={() => setFeedId(selectedFeedId === f.id ? undefined : f.id)}
							disableRipple
							sx={{
								...styles.menuItem,
								...(selectedFeedId === f.id
									? { border: `1px solid ${theme.palette.primary.main}`, borderBottom: 'none' }
									: {}),
							}}
						>
							<div style={{ width: '100%' }} className="flex-row-between">
								<div className="flex-row-left">
									<Typography width={200} lineHeight="19px" whiteSpace="wrap">
										{f.name}
									</Typography>
								</div>

								{testing ? (
									<Ping size="30" speed="2" color={getStatusColor(f.status)} />
								) : (
									<div style={{ width: 30, height: 30 }} className="flex-row-center">
										<div style={{ ...styles.dot, backgroundColor: getStatusColor(f.status) }} />
									</div>
								)}
							</div>
						</MenuItem>,
						<Collapse key={`${f.id}-content`} in={selectedFeedId === f.id} unmountOnExit>
							<div
								style={{
									...styles.feedContent,
									...(selectedFeedId === f.id
										? { border: `1px solid ${theme.palette.primary.main}`, borderTop: 'none' }
										: {}),
								}}
							>
								<div style={{ width: '100%', paddingBottom: 5 }} className="flex-row-between">
									<Typography fontStyle="italic" fontWeight="bold" fontSize={14}>
										Status
									</Typography>
									<Typography fontStyle="italic" fontSize={14}>
										{f.status}
									</Typography>
								</div>
								<div style={{ width: '100%', paddingBottom: 5 }} className="flex-row-between">
									<Typography fontStyle="italic" fontWeight="bold" fontSize={14}>
										Schedule
									</Typography>
									<Typography fontStyle="italic" fontSize={14}>
										{formatHour(f.schedule)}{' '}
										{f.schedule < 5 || f.schedule >= 19 ? '(nightly)' : '(daily)'}
									</Typography>
								</div>
								<div style={{ width: '100%', paddingBottom: 10 }} className="flex-row-between">
									<Typography fontStyle="italic" fontWeight="bold" fontSize={14}>
										Last published
									</Typography>
									<Typography fontStyle="italic" fontSize={14}>
										{formatMDYAbv(f.last_synced_at?.toString())}
									</Typography>
								</div>
								<div style={{ width: '100%' }} className="flex-row-left">
									<Tooltip
										title={f.status === FeedStatus.OFFLINE ? 'Feed is offline' : 'Test Connection'}
										enterDelay={500}
										arrow
									>
										<span>
											<IconButton
												disabled={f.status === FeedStatus.OFFLINE || isPending}
												sx={{ marginRight: '5px' }}
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
												sx={{ marginRight: '5px' }}
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
								</div>
							</div>
						</Collapse>,
					])}
				</List>
			</Paper>
		</div>
	);
}

const styles = {
	container: {
		width: 'fit-content',
		height: '100%',
		paddingTop: 20,
	},
	dot: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	feedContent: {
		width: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'center',
		height: 'fit-content',
		padding: '10px 15px',
		backgroundColor: OFFWHITE_COLOR,
	},
	menuItem: {
		width: 300,
		marginTop: '5px',
	},
	paper: {
		minWidth: 325,
		height: '100%',
		padding: '15px',
		border: 1,
		borderColor: 'divider',
	},
};
