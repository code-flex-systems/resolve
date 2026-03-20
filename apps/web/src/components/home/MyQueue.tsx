'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import { useClaimTrpc, type MyDeskClaimListItem } from '@/hooks/trpc/useClaimTrpc';
import ClaimDetailPanel from '../admin/ClaimDetailPanel';
import { useState } from 'react';
import ClaimListItem, { ClaimListItemData } from '@/components/common/ClaimListItem';
import Skeleton from '@/components/ui/Skeleton';
import { IconList } from '@tabler/icons-react';

export default function MyQueue() {
	const { data, isFetching } = useClaimTrpc().listMyDeskClaims(
		{ limit: 25 },
		{
			refetchOnMount: 'always',
			refetchOnWindowFocus: true,
			staleTime: 0,
		}
	);

	const claims = data?.rows ?? [];

	const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
	const [panelOpen, setPanelOpen] = useState(false);

	const handleRowClick = (claimId: number) => {
		setSelectedClaimId(claimId);
		setPanelOpen(true);
	};

	const handlePanelClose = () => {
		setPanelOpen(false);
		setTimeout(() => setSelectedClaimId(null), 300); // Clear after animation
	};

	// Map MyDeskClaimListItem to ClaimListItemData
	const mapToClaimListItemData = (claim: MyDeskClaimListItem): ClaimListItemData => ({
		id: claim.id,
		claim_number: claim.claim_number,
		client: claim.client,
		insured: claim.insured,
		claim_amount: claim.claim_amount,
		date_of_loss: claim.date_of_loss,
		recovery_status: claim.recovery_status,
		substatus: claim.substatus,
		last_update: claim.last_update,
		desk_location_name: claim.desk_location_name,
	});

	return (
		<>
			<Card variant="beveled" padding="none" style={{ ...styles.container, overflow: 'hidden' }}>
				<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
					<IconList style={{ fontSize: 16, marginRight: 8, verticalAlign: 'text-bottom' }} />
					My Queue
					{claims.length> 0 && (
						<span style={{ ...{ marginLeft: 8 }, color: 'text.secondary' }}>
							({claims.length})
						</span>
					)}
				</div>
				<div style={{ ...styles.contentContainer, padding: 16 }}>
					{isFetching ? (
						<Skeleton variant="rect" width="100%" height="100%" />
					) : (
						<div style={{ width: '100%', height: '100%', gap: 8 }}>
							{/* Claims List */}
							<div style={styles.listContainer}>
								{claims.length === 0 ? (
									<div
style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
										<span style={{ fontSize: 13, color: 'text.secondary', fontStyle: 'italic' }}>
											No claims in queue
										</span>
									</div>
								) : (
									<div style={{ width: '100%', gap: 0 }}>
										{claims.map((claim, index) => (
											<ClaimListItem
												key={claim.id}
												claim={mapToClaimListItemData(claim)}
												onClick={() => handleRowClick(claim.id)}
												showStatusChip={true}
												showAmount={false}
												showLastUpdate={true}
												showDeskLocation={true}
												variant="listRow"
												index={index}
											/>
										))}
									</div>
								)}
							</div>

							{/* Footer */}
							{claims.length> 0 && (
								<div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: 1 }}>
									<Link href="/my-claims" style={{ fontSize: 12, color: 'var(--text-accent)', textDecoration: 'none', cursor: 'pointer' }}>
										View All My Claims
									</Link>
								</div>
							)}
						</div>
					)}
				</div>
			</Card>

			{/* Claim Detail Panel */}
			<ClaimDetailPanel claimId={selectedClaimId} open={panelOpen} onClose={handlePanelClose} />
		</>
	);
}

const styles = {
	container: {
		width: 550,
		minWidth: 550,
		height: 'calc(100vh - 140px)',
		margin: '15px',
	},
	contentContainer: {
		height: 'calc(100% - 45px)',
		overflow: 'hidden' as const,
	},
	listContainer: {
		width: '100%',
		height: '100%',
		overflowY: 'auto' as const,
		overflowX: 'hidden' as const,
	},
};
