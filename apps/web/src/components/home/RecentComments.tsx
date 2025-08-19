'use client';
import { Box, Paper, Stack } from '@mui/material';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import Comments from '../common/Comments';
import { useSession } from 'next-auth/react';
import './styles.css';
import ExpandableTitle from '../common/ExpandableTitle';
import { MoreHoriz } from '@mui/icons-material';

export default function RecentComments() {
	const { data: session } = useSession();
	const userId = session?.user.id;
	return (
		<Paper sx={styles.container}>
			<Box width="100%" height={40} display="flex" justifyContent="flex-start" alignItems="center">
				<ExpandableTitle
					title="Recent Comments"
					icon={<MoreHoriz sx={{ color: 'white' }} />}
					color={BASE_COLOR_LIGHT}
				/>
			</Box>
			<Stack
				width="100%"
				height="calc(100% - 60px)"
				display="flex"
				justifyContent="flex-start"
				alignItems="flex-start"
				overflow="auto"
			>
				<Comments filters={{ userId }} width={470} />
			</Stack>
			<div
				style={{
					width: 470,
					height: 50,
					position: 'absolute',
					zIndex: 1000,
					bottom: 20,
				}}
				className="fade-edges"
			/>
		</Paper>
	);
}

const styles = {
	container: {
		width: 520,
		minWidth: 520,
		height: 350,
		minHeight: 0,
		padding: '10px 20px',
		overflow: 'hidden',
		borderRadius: 4,
		margin: '15px',
		position: 'relative',
	},
	divider: {
		width: 5,
		height: 5,
		borderRadius: 10,
		backgroundColor: BASE_COLOR_LIGHT,
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
