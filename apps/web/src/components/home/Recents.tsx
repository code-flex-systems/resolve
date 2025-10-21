'use client';
import { Box, Collapse, Divider, MenuItem, Paper, Skeleton, Stack, Typography } from '@mui/material';
import theme, { BASE_COLOR, BASE_COLOR_LIGHT, ORANGE } from '@/styles/theme';
import { ArrowCircleRightOutlined, ContentPasteSearch } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { TransitionGroup } from 'react-transition-group';
import { formatMD } from '@/lib/utils/utils';
import ExpandableTitle from '../common/ExpandableTitle';
import { ClaimStatus } from '@/config/enums';

const getStatusColor = (status: ClaimStatus) => {
	switch (status) {
		case ClaimStatus.SUBMITTED:
			theme.palette.success.light;
		case ClaimStatus.IN_PROGRESS:
			return theme.palette.warning.light;
		case ClaimStatus.BLOCKED:
			return ORANGE;
		case ClaimStatus.UNWORKED:
		default:
			return theme.palette.error.light;
	}
};

export default function Recents() {
	const router = useRouter();
	const { isFetching, data: recentChecklistClaims = [] } = useChecklistTrpc().listRecents();
	const distinctStatuses = [...new Set(recentChecklistClaims.map((rc) => rc.status))];

	return isFetching ? (
		<Skeleton sx={styles.container} />
	) : (
		<Paper elevation={0} sx={styles.container}>
			<Box width="100%" height={40} display="flex" justifyContent="flex-start" alignItems="center">
				<ExpandableTitle
					title="Recent Claims"
					icon={<ContentPasteSearch sx={{ color: BASE_COLOR }} />}
					color="white"
				/>
			</Box>
			<div
				style={{
					...styles.links,
					justifyContent: recentChecklistClaims.length ? 'flex-start' : 'center',
					alignItems: recentChecklistClaims.length ? 'flex-start' : 'center',
				}}
			>
				{!recentChecklistClaims.length && (
					<Typography fontSize={15} color={BASE_COLOR_LIGHT}>
						No recents
					</Typography>
				)}
				<TransitionGroup style={{ width: '100%' }}>
					{distinctStatuses.map((ds) => (
						<Collapse key={ds} sx={{ width: '100%' }}>
							<Box
								width="100%"
								display="flex"
								alignItems="center"
								padding="2px 10px"
								bgcolor={getStatusColor(ds as ClaimStatus)}
								borderRadius={4}
								margin="5px 0px"
							>
								<Typography fontSize={12} color={'white'}>
									{ds}
								</Typography>
							</Box>
							{recentChecklistClaims
								.filter((rc) => rc.status === ds)
								.map((c, i) => (
									<MenuItem
										onClick={() => router.push(`/checklist/${c.checklist_id}/claim/${c.claim_id}`)}
										sx={styles.menuItem}
									>
										<Stack
											width="100%"
											display="flex"
											justifyContent="flex-start"
											alignItems="flex-start"
										>
											<Box
												width="100%"
												padding="5px 10px"
												display="flex"
												justifyContent="space-between"
												alignItems="center"
											>
												<Stack
													width="100%"
													display="flex"
													justifyContent="flex-start"
													alignItems="flex-start"
													padding="5px"
												>
													<Typography
														fontSize={15}
														color="primary"
														lineHeight="17px"
														paddingBottom="5px"
													>
														{c.claim_number}
													</Typography>
													<Box
														width="100%"
														display="flex"
														justifyContent="flex-start"
														alignItems="center"
														overflow="hidden"
													>
														<Typography
															fontSize={13}
															lineHeight="15px"
															color={BASE_COLOR_LIGHT}
															textOverflow="ellipsis"
															noWrap
														>
															{c.checklist_name}
														</Typography>
														<div style={styles.divider} />
														<Typography
															fontSize={13}
															lineHeight="15px"
															color={BASE_COLOR_LIGHT}
															noWrap
														>
															{formatMD(c.last_opened)}
														</Typography>
													</Box>
												</Stack>
												<ArrowCircleRightOutlined sx={{ color: BASE_COLOR_LIGHT }} />
											</Box>
										</Stack>
									</MenuItem>
								))}
						</Collapse>
					))}
				</TransitionGroup>
			</div>
		</Paper>
	);
}

const styles = {
	container: {
		width: 400,
		minWidth: 400,
		height: 350,
		padding: '10px 20px',
		overflow: 'hidden',
		borderRadius: 4,
		margin: '15px',
	},
	divider: {
		width: 5,
		height: 5,
		borderRadius: 10,
		backgroundColor: '#d9d9d9',
		margin: '0px 10px',
	},
	horizontalDiv: {
		padding: 0,
		height: 1,
		width: '100%',
	},
	icon: {
		marginRight: '5px',
	},
	link: {
		padding: 10,
	},
	links: {
		marginTop: '5px',
		width: '100%',
		height: 'calc(100% - 50px)',
		display: 'flex',
		flexDirection: 'column' as const,
		overflow: 'auto',
	},
	menuItem: {
		flex: 1,
		width: '100%',
		padding: 0,
		bgcolor: 'white',
	},
};
