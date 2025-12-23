'use client';

import { Box, Fade, Paper, Tab, Tabs } from '@mui/material';
import PageTransitionWrapper from '../../common/PageTransitionWrapper';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ClaimHeader from './ClaimHeader';
import OverviewTab from './OverviewTab';
import WorkflowTab from './WorkflowTab';
import ClaimantsCoverageTab from './ClaimantsCoverageTab';
import SettlementRecoveryTab from './SettlementRecoveryTab';
import PartyLiabilityTab from './PartyLiabilityTab';
import PaymentsTab from './PaymentsTab';
import { containerStyles } from '@/styles/theme';

/**
 * Reusable claim detail view component
 * Can be used in both admin and standalone contexts
 */
export default function ClaimDetailView({ claimId }: { claimId: number }) {
	const searchParams = useSearchParams();
	const [currentTab, setCurrentTab] = useState(0);

	// Support pre-selecting tab via URL parameter (e.g., ?tab=claimants-coverage)
	useEffect(() => {
		const tabParam = searchParams.get('tab');
		if (tabParam) {
			const tabMap: Record<string, number> = {
				overview: 0,
				workflow: 1,
				recovery: 2,
				'settlement-recovery': 2, // New URL
				settlement: 2, // Alias
				'claimants-coverage': 3,
				'adverse-parties-liability': 4,
				'facilitators-liability': 4, // Keep old URL for backwards compatibility
				payments: 5,
			};
			const tabIndex = tabMap[tabParam.toLowerCase()];
			if (tabIndex !== undefined) {
				setCurrentTab(tabIndex);
			}
		}
	}, [searchParams]);

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading claim details...">
			<Paper
				sx={{
					display: 'flex',
					flexDirection: 'column',
					height: 'calc(100vh - 50px)',
					overflow: 'hidden',
					...containerStyles.beveledCard,
				}}
			>
				{/* Sticky Header */}
				<ClaimHeader claimId={claimId} />

				{/* Tab Navigation */}
				<Paper sx={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', px: 1, pb: 0.2 }}>
					<Tabs
						value={currentTab}
						onChange={(_, newValue) => setCurrentTab(newValue)}
						aria-label="claim detail tabs"
					>
						<Tab label="Overview" />
						<Tab label="Workflow & Assignment" />
						<Tab label="Settlement & Recovery" />
						<Tab label="Claimants & Coverage" />
						<Tab label="Adverse Parties & Liability" />
						<Tab label="Payments" />
					</Tabs>
				</Paper>

				{/* Tab Content */}
				<Fade key={currentTab} in={true} timeout={1000}>
					<Box flex={1} overflow="auto">
						<Box display="flex" justifyContent="center" width="100%">
							<Box width="100%" maxWidth={1400}>
								{currentTab === 0 && <OverviewTab claimId={claimId} />}
								{currentTab === 1 && <WorkflowTab claimId={claimId} />}
								{currentTab === 2 && <SettlementRecoveryTab claimId={claimId} />}
								{currentTab === 3 && <ClaimantsCoverageTab claimId={claimId} />}
								{currentTab === 4 && <PartyLiabilityTab claimId={claimId} />}
								{currentTab === 5 && <PaymentsTab claimId={claimId} />}
							</Box>
						</Box>
					</Box>
				</Fade>
			</Paper>
		</PageTransitionWrapper>
	);
}
