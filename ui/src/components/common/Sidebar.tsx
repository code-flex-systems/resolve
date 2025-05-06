import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Collapse, Divider, List, ListItemText, MenuItem, Paper, Tooltip, Typography } from '@mui/material';
import { Checklist } from '@mui/icons-material';
import Home from '@mui/icons-material/Home';
import Menu from '@mui/icons-material/Menu';

import { useGlobalSlice } from '../../state/store';
import * as actions from '../../state/global/actions';
import { NavListItem } from '../../types';
import Toolbar from './Toolbar';
import config from '../../config/config';

export default function Sidebar() {
	const navigate = useNavigate();
	const selectedPage = useGlobalSlice((state) => state.selectedPage);
	const navOpen = useGlobalSlice((state) => state.navOpen);

	const navGroups: Record<string, NavListItem[]> = useMemo(() => {
		return {
			group0: [
				{
					label: 'Home',
					route: 'checklists',
					color: 'secondary.main',
					icon: <Home sx={styles.icon('checklists' === selectedPage)} />,
				},
				{
					label: 'Checklists',
					route: 'checklist',
					color: 'secondary.main',
					icon: <Checklist sx={styles.icon('checklist' === selectedPage)} />,
				},
			],
		};
	}, [selectedPage]);

	return (
		<Paper sx={styles.paper}>
			<div style={styles.drawer}>
				<Toolbar
					left={
						<Collapse in={navOpen} orientation="horizontal">
							<Typography fontSize={25} color="white">
								{config.APP_NAME}
							</Typography>
						</Collapse>
					}
					right={
						<Menu
							onClick={() => actions.toggleNavOpen()}
							sx={{ ...styles.icon(false), cursor: 'pointer' }}
						/>
					}
					height={60}
					padding={'0px 15px 0px 10px'}
				/>
				<div style={styles.divider}>
					<Divider sx={{ backgroundColor: 'white' }} />
				</div>
				{Object.keys(navGroups).map((groupKey, i) => [
					<List key={groupKey} sx={{ padding: 0 }}>
						{navGroups[groupKey].map((navItem) => (
							<Tooltip
								key={`${navItem.route}-tooltip`}
								title={navItem.label}
								placement="right"
								enterDelay={800}
								arrow
							>
								<MenuItem
									key={navItem.route}
									selected={navItem.route === selectedPage}
									onClick={() => {
										navigate(`/${navItem.route}`);
										actions.updateSelectedPage(navItem.route);
									}}
									style={{
										backgroundColor: navItem.route === selectedPage ? 'white' : 'inherit',
									}}
									sx={{ ...styles.menuItem }}
								>
									{navItem.icon}
									<Collapse in={navOpen} orientation="horizontal">
										<ListItemText
											secondary={
												<Typography fontSize={14} color="white">
													{navItem.label.toUpperCase()}
												</Typography>
											}
											sx={styles.text(navItem.route === selectedPage)}
										/>
									</Collapse>
								</MenuItem>
							</Tooltip>
						))}
					</List>,
					i < Object.keys(navGroups).length - 1 ? (
						<div key={`${groupKey}-divider-${i}`} style={styles.divider}>
							<Divider sx={{ backgroundColor: 'white' }} />
						</div>
					) : (
						<span key={`${groupKey}-divider-${i}`} />
					),
				])}
			</div>
		</Paper>
	);
}

const styles = {
	collapseContainer: {
		width: '100%',
		display: 'flex',
		justifyContent: 'flex-start',
		alignItems: 'center',
	},
	divider: {
		width: '100%',
		height: 1,
	},
	drawer: {
		width: '100%',
		height: '100vh',
		overflow: 'auto',
		display: 'flex',
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		flexDirection: 'column' as const,
	},
	icon: (selected: boolean) => ({
		fontSize: 25,
		color: selected ? 'secondary.main' : 'white',
	}),
	menuItem: {
		width: '100%',
		height: 50,
		minHeight: 50,
	},
	menuItemMain: {
		width: '100%',
		height: 60,
		minHeight: 60,
		backgroundColor: 'secondary.main',
	},
	mainMenuItemContainer: {
		width: 57,
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		cursor: 'pointer',
	},
	paper: {
		width: 'fit-content',
		borderRight: '1px solid #e0e0e0',
		backgroundColor: 'secondary.main',
	},
	text: (selected: boolean) => ({
		width: 200,
		marginLeft: '15px',
		'& .MuiTypography-root': {
			fontSize: 14,
			textWrap: 'nowrap',
			color: selected ? 'secondary.main' : 'white',
		},
	}),
};
