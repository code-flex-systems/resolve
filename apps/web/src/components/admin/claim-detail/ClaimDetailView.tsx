'use client';

import { Box, Fade, Tab, Tabs } from '@mui/material';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ClaimHeader from './ClaimHeader';
import OverviewTab from './OverviewTab';
import WorkflowTab from './WorkflowTab';
import ClaimantsCoverageTab from './ClaimantsCoverageTab';
import RecoveryTab from './RecoveryTab';
import PartyLiabilityTab from './PartyLiabilityTab';

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
				'claimants-coverage': 3,
				'facilitators-liability': 4,
			};
			const tabIndex = tabMap[tabParam.toLowerCase()];
			if (tabIndex !== undefined) {
				setCurrentTab(tabIndex);
			}
		}
	}, [searchParams]);

	return (
		<Fade in={true} timeout={1000}>
			<Box display="flex" flexDirection="column" height="calc(100vh - 50px)" overflow="hidden">
				{/* Sticky Header */}
				<ClaimHeader claimId={claimId} />

				{/* Tab Navigation */}
				<Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
					<Tabs
						value={currentTab}
						onChange={(_, newValue) => setCurrentTab(newValue)}
						aria-label="claim detail tabs"
					>
						<Tab label="Overview" />
						<Tab label="Workflow & Assignment" />
						<Tab label="Recovery" />
						<Tab label="Claimants & Coverage" />
						<Tab label="Facilitators & Liability" />
					</Tabs>
				</Box>

				{/* Tab Content */}
				<Fade key={currentTab} in={true} timeout={1000}>
					<Box flex={1} overflow="auto" bgcolor="#F7F8FA">
						<Box display="flex" justifyContent="center" width="100%">
							<Box width="100%" maxWidth={1400}>
								{currentTab === 0 && <OverviewTab claimId={claimId} />}
								{currentTab === 1 && <WorkflowTab claimId={claimId} />}
								{currentTab === 2 && <RecoveryTab claimId={claimId} />}
								{currentTab === 3 && <ClaimantsCoverageTab claimId={claimId} />}
								{currentTab === 4 && <PartyLiabilityTab claimId={claimId} />}
							</Box>
						</Box>
					</Box>
				</Fade>
			</Box>
		</Fade>
	);
}
