'use client';

import { Box, Fade, Tab, Tabs } from '@mui/material';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ClaimHeader from './ClaimHeader';
import OverviewTab from './OverviewTab';
import WorkflowTab from './WorkflowTab';
import CoverageTabForClaim from './CoverageTabForClaim';
import RecoveryTab from './RecoveryTab';
import PartyLiabilityTab from './PartyLiabilityTab';

interface ClaimDetailViewProps {
	claimId: number;
	backRoute?: string; // Optional custom back route
}

/**
 * Reusable claim detail view component
 * Can be used in both admin and standalone contexts
 */
export default function ClaimDetailView({ claimId, backRoute }: ClaimDetailViewProps) {
	const searchParams = useSearchParams();
	const [currentTab, setCurrentTab] = useState(0);

	// Support pre-selecting tab via URL parameter (e.g., ?tab=coverage)
	useEffect(() => {
		const tabParam = searchParams.get('tab');
		if (tabParam) {
			const tabMap: Record<string, number> = {
				overview: 0,
				workflow: 1,
				coverage: 2,
				recovery: 3,
				'party-liability': 4,
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
				<ClaimHeader claimId={claimId} backRoute={backRoute} />

				{/* Tab Navigation */}
				<Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
					<Tabs
						value={currentTab}
						onChange={(_, newValue) => setCurrentTab(newValue)}
						aria-label="claim detail tabs"
					>
						<Tab label="Overview" />
						<Tab label="Workflow & Assignment" />
						<Tab label="Coverage" />
						<Tab label="Recovery" />
						<Tab label="Party & Liability" />
					</Tabs>
				</Box>

				{/* Tab Content */}
				<Fade key={currentTab} in={true} timeout={1000}>
					<Box flex={1} overflow="auto" bgcolor="#F7F8FA">
						<Box
							display="flex"
							justifyContent="center"
							width="100%"
						>
							<Box width="100%" maxWidth={1400}>
								{currentTab === 0 && <OverviewTab claimId={claimId} />}
								{currentTab === 1 && <WorkflowTab claimId={claimId} />}
								{currentTab === 2 && <CoverageTabForClaim claimId={claimId} />}
								{currentTab === 3 && <RecoveryTab claimId={claimId} />}
								{currentTab === 4 && <PartyLiabilityTab claimId={claimId} />}
							</Box>
						</Box>
					</Box>
				</Fade>
			</Box>
		</Fade>
	);
}
