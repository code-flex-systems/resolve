'use client';
import { Box, Paper, Stack } from '@mui/material';
import { BASE_COLOR, BASE_COLOR_LIGHT } from '@/styles/theme';
import Comments from '../common/Comments';
import { useSession } from 'next-auth/react';
import './styles.css';
import ExpandableTitle from '../common/ExpandableTitle';
import Sms from '@mui/icons-material/Sms';
import { buildChecklistUrl } from '@/lib/utils/buildChecklistUrl';
import { useRouter } from 'next/navigation';
import { useCommentTrpc } from '@/hooks/trpc/useCommentTrpc';

export default function RecentComments() {
	const router = useRouter();
	const { data: session } = useSession();
	const userId = session?.user.id;

	const { data: comments = { rows: [], count: 0 } } = useCommentTrpc().list({ filters: { userId } });

	return (
		<Paper elevation={0} sx={styles.container}>
			<Box width="100%" height={40} minHeight={40} display="flex" justifyContent="flex-start" alignItems="center">
				<ExpandableTitle title="Recent Comments" icon={<Sms sx={{ color: BASE_COLOR }} />} color="white" />
			</Box>
			<Stack
				width="100%"
				height="calc(100% - 60px)"
				display="flex"
				justifyContent={comments.count > 0 ? 'flex-start' : 'center'}
				alignItems={comments.count > 0 ? 'flex-start' : 'center'}
				overflow="auto"
				paddingTop="100px"
			>
				<Comments
					filters={{ userId }}
					width={470}
					onNavigate={({ checklistId, claimId, instanceId, questionId }) => {
						if (!checklistId || !claimId) return;
						router.push(
							buildChecklistUrl({ checklistId, claimId, instanceId, questionId, focus: 'comments' })
						);
					}}
				/>
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
	menuItem: {
		flex: 1,
		width: '100%',
		padding: 0,
		bgcolor: 'white',
	},
};
