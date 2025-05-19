'use client';
import { Divider, Link, Paper, Typography } from '@mui/material';
import { OFFWHITE_COLOR } from '@/styles/theme';
import { ContentPasteSearch } from '@mui/icons-material';
import Toolbar from '../common/Toolbar';
import { useRouter } from 'next/navigation';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';

export default function Recents() {
	const router = useRouter();
	const { isFetching, data: recentChecklistClaims = [] } = useChecklistTrpc().listRecents();
	return (
		<Paper style={styles.container}>
			<Toolbar left={<Typography fontStyle="italic">Recents</Typography>} height={40} padding={0} />
			<div style={styles.horizontalDiv}>
				<Divider orientation="horizontal" />
			</div>
			{!isFetching && !recentChecklistClaims.length && <Typography fontStyle="italic">No recents</Typography>}
			<div style={styles.links}>
				{recentChecklistClaims.map((c, i) => (
					<Link
						key={i}
						onClick={() => router.push(`/checklist/${c.checklist_id}/claim/${c.claim_id}`)}
						style={styles.link}
						color="primary"
						className="flex-row-left"
					>
						<ContentPasteSearch sx={styles.icon} />
						{c.claim_number} ({c.checklist_name})
					</Link>
				))}
			</div>
		</Paper>
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
		height: 1,
		width: '100%',
	},
	icon: {
		// color: 'primary.main',
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
		width: '100%',
		// padding: '5px',
	},
	menuItemInner: {
		width: '100%',
		padding: 5,
		borderRadius: 5,
	},
	verticalDiv: {
		height: 25,
		width: 1,
		padding: '0px 10px',
	},
};
