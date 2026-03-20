'use client';

import { useMemo } from 'react';
import TeamRecoveryChart from './TeamRecoveryChart';
import { containerStyles } from '@/styles/theme';
import { getQuarterRanges } from '@/lib/utils/recoveryUtils';

export default function TeamRecoveryMetric() {
	const quarters = useMemo(() => getQuarterRanges(), []);

	return (
		<div style={{ ...containerStyles.section, ...styles.container }}>
			<span style={{ ...containerStyles.sectionTitle, justifyContent: 'space-between' }}>
				Team Recovery
				<span style={{ marginLeft: 8, color: 'primary.main', fontWeight: 600 }}>
					Q{quarters.currentQuarter}
				</span>
			</span>
			<div style={{ ...containerStyles.sectionContent, ...styles.contentContainer }}>
				<TeamRecoveryChart />
			</div>
		</div>
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
