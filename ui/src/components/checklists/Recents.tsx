import { Divider, Link, MenuItem, Paper, Typography } from '@mui/material';
import theme, { OFFWHITE_COLOR } from '../../styles/theme';
import { useRecentChecklistClaims } from '../../api/queries/checklist-queries';
import * as actions from '../../state/checklists/actions';
import { useChecklistsSlice } from '../../state/store';
import { formatMDYAbv } from '../../utils/utils';
import { AccessTimeFilled, AccountCircle, Checklist, ContentPasteSearch, Tag } from '@mui/icons-material';
import Separator from '../common/Separator';
import Toolbar from '../common/Toolbar';
import { useNavigate } from 'react-router';

export default function Recents() {
	const navigate = useNavigate();
	const recentChecklistClaims = useChecklistsSlice((state) => state.recentChecklistClaims);
	const { isFetching } = useRecentChecklistClaims(actions.updateRecentChecklistClalims);
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
						onClick={() => navigate(`/checklist/${c.checklist_id}/claim/${c.claim_id}`)}
						style={styles.link}
						className="flex-row-left"
					>
						<ContentPasteSearch sx={styles.icon} />
						{c.claim_number} ({c.checklist_name})
					</Link>
				))}
			</div>

			{/* {recentChecklistClaims.map((c, i) => (
				<MenuItem key={i} sx={styles.menuItem}>
					<Paper style={styles.menuItemInner} className="flex-row-between">
						<div className="flex-row-left">
							<ContentPasteSearch sx={{ ...styles.icon, marginLeft: 0 }} />
							<Typography fontStyle="italic" width={120}>
								{c.claim_number}
							</Typography>
							<Checklist sx={styles.icon} />
							<Typography fontStyle="italic">{c.checklist_name}</Typography>
						</div>
						<div className="flex-row-right">
							<AccessTimeFilled sx={styles.icon} />
							<Typography fontStyle="italic">{formatMDYAbv(c.last_opened.toString())}</Typography>
						</div>
					</Paper>
				</MenuItem>
			))} */}
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
		color: 'primary.main',
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
