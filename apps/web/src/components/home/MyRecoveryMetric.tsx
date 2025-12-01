'use client';

import { Paper } from '@mui/material';
import { useSession } from 'next-auth/react';
import UserRecoveryMetricChart from './UserRecoveryMetricChart';
import theme from '@/styles/theme';

export default function MyRecoveryMetric() {
	const { data: session } = useSession();

	return (
		<Paper elevation={0} sx={styles.container}>
			<UserRecoveryMetricChart userId={session?.user?.id} />
		</Paper>
	);
}

const styles = {
	container: {
		width: 400,
		minWidth: 400,
		height: 180,
		padding: '20px',
		borderRadius: 4,
		margin: '15px',
		background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.03) 0%, rgba(255, 255, 255, 1) 100%)',
		border: `1px solid ${theme.palette.primary.main}`,
	},
};
