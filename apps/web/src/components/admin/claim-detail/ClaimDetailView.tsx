'use client';
import { Tabs } from '@/components/ui/Tabs';
import Card from '@/components/ui/Card';
import PageTransitionWrapper from '../../common/PageTransitionWrapper';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useTrackResource } from '@/hooks/useTrackResource';
import ClaimHeader from './ClaimHeader';
import OverviewTab from './OverviewTab';
import WorkflowTab from './WorkflowTab';
import ClaimantsCoverageTab from './ClaimantsCoverageTab';
import SettlementRecoveryTab from './SettlementRecoveryTab';
import PartyLiabilityTab from './PartyLiabilityTab';
import PaymentsTab from './PaymentsTab';

/**
 * Reusable claim detail view component
 * Can be used in both admin and standalone contexts
 */
export default function ClaimDetailView({ claimId }: { claimId: string }) {
	const searchParams = useSearchParams();
	const [currentTab, setCurrentTab] = useState(0);
	const { data: claimDetail } = trpc.claim.getClaimDetail.useQuery({ claimId }, { enabled: !!claimId });
	useTrackResource('claim', claimId, claimDetail?.claim_number ?? null, `/admin/claims/${claimId}`, !!claimId);

	// Support pre-selecting tab via URL parameter (e.g., ?tab=claimants-coverage)
	useEffect(() => {
		const tabParam = searchParams.get('tab');
		if (tabParam) {
			const tabMap: Record<string, number> = {
				overview: 0,
				workflow: 1,
				'claimants-coverage': 2,
				'adverse-parties-liability': 3,
				payments: 4,
				'settlement-recovery': 5,
			};
			const tabIndex = tabMap[tabParam.toLowerCase()];
			if (tabIndex !== undefined) {
				setCurrentTab(tabIndex);
			}
		}
	}, [searchParams]);

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading claim details...">
			<Card
				variant="beveled"
				padding="none"
				style={{
					display: 'flex',
					flexDirection: 'column',
					height: 'calc(100vh - 50px)',
					overflow: 'hidden',
				}}
			>
				{/* Sticky Header */}
				<ClaimHeader claimId={claimId} />

				{/* Tab Navigation */}
				<div style={{ paddingInline: 8 }}>
					<Tabs
						tabs={[
							{ label: 'Overview' },
							{ label: 'Workflow & Assignment' },
							{ label: 'Claimants & Coverage' },
							{ label: 'Adverse Parties & Liability' },
							{ label: 'Payments' },
							{ label: 'Settlement & Recovery' },
						]}
						value={currentTab}
						onChange={setCurrentTab}
					/>
				</div>

				{/* Tab Content */}
				<div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
					<div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
						<div style={{ width: '100%', maxWidth: 1400 }}>
								{currentTab === 0 && <OverviewTab claimId={claimId} />}
								{currentTab === 1 && <WorkflowTab claimId={claimId} />}
								{currentTab === 2 && <ClaimantsCoverageTab claimId={claimId} />}
								{currentTab === 3 && <PartyLiabilityTab claimId={claimId} />}
								{currentTab === 4 && <PaymentsTab claimId={claimId} />}
								{currentTab === 5 && <SettlementRecoveryTab claimId={claimId} />}
							</div>
						</div>
				</div>
			</Card>
		</PageTransitionWrapper>
	);
}
