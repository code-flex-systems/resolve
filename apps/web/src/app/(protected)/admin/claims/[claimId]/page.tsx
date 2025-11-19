'use client';

import { Box, Fade, Tab, Tabs } from '@mui/material';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import ClaimHeader from '@/components/admin/claim-detail/ClaimHeader';
import OverviewTab from '@/components/admin/claim-detail/OverviewTab';
import WorkflowTab from '@/components/admin/claim-detail/WorkflowTab';
import CoverageTabForClaim from '@/components/admin/claim-detail/CoverageTabForClaim';
import RecoveryTab from '@/components/admin/claim-detail/RecoveryTab';

export default function ClaimDetailPage() {
	const params = useParams();
	const searchParams = useSearchParams();
	const claimId = parseInt(params.claimId as string, 10);
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
						<Tab label="Coverage" />
						<Tab label="Recovery" />
					</Tabs>
				</Box>

				{/* Tab Content */}
				<Fade key={currentTab} in={true} timeout={1000}>
					<Box flex={1} overflow="auto" bgcolor="#F7F8FA">
						{currentTab === 0 && <OverviewTab claimId={claimId} />}
						{currentTab === 1 && <WorkflowTab claimId={claimId} />}
						{currentTab === 2 && <CoverageTabForClaim claimId={claimId} />}
						{currentTab === 3 && <RecoveryTab claimId={claimId} />}
					</Box>
				</Fade>
			</Box>
		</Fade>
	);
}
