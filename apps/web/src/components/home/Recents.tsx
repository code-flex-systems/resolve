'use client';
import { Box, Collapse, Divider, MenuItem, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { BASE_COLOR, BASE_COLOR_LIGHT } from '@/styles/theme';
import { ContentPasteSearch } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { TransitionGroup } from 'react-transition-group';
import { formatMD } from '@/lib/utils/utils';
import ExpandableTitle from '../common/ExpandableTitle';

export default function Recents() {
	const router = useRouter();
	const { isFetching, data: recentChecklistClaims = [] } = useChecklistTrpc().listRecents();

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
					{recentChecklistClaims.map((c, i) => (
						<Collapse key={i} sx={{ width: '100%' }}>
							<MenuItem
								onClick={() => router.push(`/checklist/${c.checklist_id}/claim/${c.claim_id}`)}
								sx={styles.menuItem}
							>
								<Stack width="100%" display="flex" justifyContent="flex-start" alignItems="flex-start">
									<Box
										padding="5px 10px"
										display="flex"
										justifyContent="flex-start"
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
											>
												<Typography fontSize={13} lineHeight="15px" color={BASE_COLOR_LIGHT}>
													{c.checklist_name}
												</Typography>
												<div style={styles.divider} />
												<Typography fontSize={13} lineHeight="15px" color={BASE_COLOR_LIGHT}>
													{formatMD(c.last_opened)}
												</Typography>
												<div style={styles.divider} />
												<Typography fontSize={13} lineHeight="15px" color={BASE_COLOR_LIGHT}>
													{c.status}
												</Typography>
											</Box>
										</Stack>
									</Box>
									{i !== recentChecklistClaims.length - 1 && (
										<div style={styles.horizontalDiv}>
											<Divider />
										</div>
									)}
								</Stack>
							</MenuItem>
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
		width: '100%',
		height: 'calc(100% - 40px)',
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
