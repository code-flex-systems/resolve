'use client';

import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import TeamRecoveryChart from './TeamRecoveryChart';
import { containerStyles } from '@/styles/theme';
import { getQuarterRanges } from '@/lib/utils/recoveryUtils';

export default function TeamRecoveryMetric() {
	const quarters = useMemo(() => getQuarterRanges(), []);

	return (
		<Box sx={{ ...containerStyles.section, ...styles.container }}>
			<Typography sx={{ ...containerStyles.sectionTitle, justifyContent: 'space-between' }}>
				Team Recovery
				<Typography component="span" sx={{ ml: 1, color: 'primary.main', fontWeight: 600 }}>
					Q{quarters.currentQuarter}
				</Typography>
			</Typography>
			<Box sx={{ ...containerStyles.sectionContent, ...styles.contentContainer }}>
				<TeamRecoveryChart />
			</Box>
		</Box>
	);
}

const styles = {
	container: {
		width: 400,
		minWidth: 400,
		height: 180,
		margin: '15px',
	},
	contentContainer: {
		height: 'calc(100% - 45px)',
		background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.03) 0%, rgba(255, 255, 255, 1) 100%)',
	},
};
