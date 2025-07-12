'use client';
import { Box, Collapse, Divider, MenuItem, Paper, Stack, Typography } from '@mui/material';
import { OFFWHITE_COLOR } from '@/styles/theme';
import { ContentPasteSearch } from '@mui/icons-material';
import Toolbar from '../common/Toolbar';
import { useRouter } from 'next/navigation';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { TransitionGroup } from 'react-transition-group';
import { formatMDYAbv } from '@/lib/utils/utils';

export default function Recents() {
	const router = useRouter();
	const { isFetching, data: recentChecklistClaims = [] } = useChecklistTrpc().listRecents();
	return (
		<Collapse in={!!recentChecklistClaims.length} orientation="horizontal">
			<Paper style={styles.container}>
				<Toolbar left={<Typography fontStyle="italic">Recents</Typography>} height={40} padding={0} />
				<div style={styles.horizontalDiv}>
					<Divider orientation="horizontal" />
				</div>
				{!isFetching && !recentChecklistClaims.length && <Typography fontStyle="italic">No recents</Typography>}
				<div style={styles.links}>
					<TransitionGroup>
						{recentChecklistClaims.map((c, i) => (
							<Collapse key={i} sx={{ width: 330 }}>
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
											padding="5px 10px"
											display="flex"
											justifyContent="flex-start"
											alignItems="center"
										>
											<ContentPasteSearch sx={styles.icon} />
											<Stack
												width="100%"
												display="flex"
												justifyContent="flex-start"
												alignItems="flex-start"
												paddingLeft="5px"
											>
												<Box display="flex" justifyContent="flex-start" alignItems="flex-start">
													<Typography color="primary">{c.claim_number}</Typography>
													<Typography paddingLeft="5px">({c.checklist_name})</Typography>
												</Box>
												<Typography fontSize={13}>
													Last opened: {formatMDYAbv(c.last_opened)}
												</Typography>
											</Stack>
										</Box>
										<div style={styles.horizontalDiv}>
											<Divider />
										</div>
									</Stack>
								</MenuItem>
							</Collapse>
						))}
					</TransitionGroup>
				</div>
			</Paper>
		</Collapse>
	);
}

const styles = {
	container: {
		width: 350,
		minWidth: 350,
		height: 'calc(100vh - 60px)',
		backgroundColor: OFFWHITE_COLOR,
		padding: 10,
		overflow: 'hidden',
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
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		overflow: 'auto',
	},
	menuItem: {
		flex: 1,
		width: '100%',
		padding: 0,
		bgcolor: 'white',
	},
};
