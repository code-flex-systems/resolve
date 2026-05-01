'use client';

import { useMemo } from 'react';
import TeamRecoveryChart from './TeamRecoveryChart';
import Card from '@/components/ui/Card';
import { getQuarterRanges } from '@/lib/utils/recoveryUtils';

export default function TeamRecoveryMetric() {
	const quarters = useMemo(() => getQuarterRanges(), []);

	return (
		<Card variant="beveled" padding="none" style={{ ...styles.container, overflow: 'hidden' }}>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '12px 16px',
					fontSize: 13,
					fontWeight: 600,
					color: 'var(--text-primary)',
					backgroundColor: 'var(--bg-secondary)',
					borderBottom: '1px solid var(--border)',
				}}
			>
				Team Recovery
				<span style={{ marginLeft: 8, color: 'primary.main', fontWeight: 600 }}>
					Q{quarters.currentQuarter}
				</span>
			</div>
			<div style={{ ...styles.contentContainer, padding: 16 }}>
				<TeamRecoveryChart />
			</div>
		</Card>
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
